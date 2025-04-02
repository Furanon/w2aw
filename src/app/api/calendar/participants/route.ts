import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { calendarEvents, eventParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { CalendarProducer } from "@/lib/kafka/producers/calendar";
import { KAFKA_TOPICS } from "@/lib/config/kafka";

// GET participants for an event
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Validate the event exists
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId),
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if user is authorized to view participants (creator or admin)
    if (event.createdBy !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Not authorized to view participants" },
        { status: 403 }
      );
    }

    const participants = await db.query.eventParticipants.findMany({
      where: eq(eventParticipants.eventId, eventId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}

// POST to register for an event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { eventId } = data;

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Validate the event exists
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId),
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if already registered
    const existingRegistration = await db.query.eventParticipants.findFirst({
      where: and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, session.user.id)
      ),
    });

    if (existingRegistration) {
      return NextResponse.json(
        { error: "Already registered for this event" },
        { status: 409 }
      );
    }

    // Check if the event has reached capacity
    const currentParticipants = await db.query.eventParticipants.findMany({
      where: eq(eventParticipants.eventId, eventId),
    });

    if (event.capacity && currentParticipants.length >= event.capacity) {
      return NextResponse.json(
        { error: "Event has reached capacity" },
        { status: 400 }
      );
    }

    // If paid event, check for payment confirmation
    if (event.isPaid) {
      if (!data.paymentConfirmed) {
        return NextResponse.json(
          { 
            error: "Payment required", 
            isPaid: true,
            price: event.price,
            eventId: event.id,
            eventTitle: event.title
          },
          { status: 402 }
        );
      } else {
        // Payment was confirmed, publish payment confirmation to Kafka
        await CalendarProducer.getInstance().publishMessage({
          topic: KAFKA_TOPICS.CALENDAR_EVENTS,
          messages: [{
            key: eventId,
            value: JSON.stringify({
              type: 'PAYMENT_CONFIRMED',
              eventId,
              userId: session.user.id,
              timestamp: new Date().toISOString(),
              data: {
                paymentIntentId: data.paymentIntentId,
                amount: event.price,
                eventTitle: event.title
              }
            })
          }]
        });
      }
    }

    // Register for the event within a transaction
    const registrationId = uuidv4();
    const registrationTime = new Date();
    
    // Use a transaction to ensure database consistency
    const result = await db.transaction(async (tx) => {
      try {
        const registration = await tx.insert(eventParticipants).values({
          id: registrationId,
          eventId,
          userId: session.user.id,
          registeredAt: registrationTime,
          paymentStatus: event.isPaid ? "completed" : "not_applicable",
          paymentIntentId: data.paymentIntentId || null,
          attendanceStatus: "registered",
        }).returning();

        // Publish to Kafka after successful database insert
        await CalendarProducer.getInstance().publishMessage({
          topic: KAFKA_TOPICS.CALENDAR_EVENTS,
          messages: [{
            key: eventId,
            value: JSON.stringify({
              type: 'REGISTER',
              eventId,
              userId: session.user.id,
              timestamp: registrationTime.toISOString(),
              data: {
                registrationId: registrationId,
                paymentStatus: event.isPaid ? "completed" : "not_applicable",
                eventTitle: event.title,
                isPaid: event.isPaid,
              }
            })
          }]
        });

        // Also send notification
        await CalendarProducer.getInstance().publishMessage({
          topic: KAFKA_TOPICS.CALENDAR_NOTIFICATIONS,
          messages: [{
            key: session.user.id,
            value: JSON.stringify({
              type: 'REGISTRATION_CONFIRMATION',
              userId: session.user.id,
              timestamp: registrationTime.toISOString(),
              data: {
                eventId,
                eventTitle: event.title,
                startTime: event.startTime,
                location: event.location,
              }
            })
          }]
        });

        return registration[0];
      } catch (error) {
        // Transaction will automatically roll back on error
        console.error("Transaction failed:", error);
        throw error;
      }
    });

    return NextResponse.json(result || { success: true });
  } catch (error) {
    console.error("Error registering for event:", error);
    return NextResponse.json(
      { error: "Failed to register for event" },
      { status: 500 }
    );
  }
}

// DELETE to unregister from an event
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Validate the registration exists
    const registration = await db.query.eventParticipants.findFirst({
      where: and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, session.user.id)
      ),
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Get event details to check refund policy
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, eventId),
    });

    // Check cancellation timeframe for paid events
    if (event?.isPaid) {
      const currentTime = new Date();
      const eventStartTime = new Date(event.startTime);
      const hoursTillEvent = (eventStartTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      
      // If less than 24 hours before event, check refund policy
      if (hoursTillEvent < 24) {
        // For simplicity, we'll just add a warning - in a real app this might trigger a refund process
        console.log(`Late cancellation for paid event: ${eventId} by user: ${session.user.id}`);
      }
    }

    // Remove the registration within a transaction
    const unregistrationTime = new Date();
    
    // Use a transaction to ensure database consistency
    await db.transaction(async (tx) => {
      try {
        // Delete the registration
        await tx.delete(eventParticipants)
          .where(and(
            eq(eventParticipants.eventId, eventId),
            eq(eventParticipants.userId, session.user.id)
          ))
          .execute();

        // Publish to Kafka after successful database delete
        await CalendarProducer.getInstance().publishMessage({
          topic: KAFKA_TOPICS.CALENDAR_EVENTS,
          messages: [{
            key: eventId,
            value: JSON.stringify({
              type: 'UNREGISTER',
              eventId,
              userId: session.user.id,
              timestamp: unregistrationTime.toISOString(),
              data: {
                eventTitle: event?.title,
                isPaid: event?.isPaid,
                refundEligible: event?.isPaid && hoursTillEvent >= 24
              }
            })
          }]
        });
        
        // Also send notification
        await CalendarProducer.getInstance().publishMessage({
          topic: KAFKA_TOPICS.CALENDAR_NOTIFICATIONS,
          messages: [{
            key: session.user.id,
            value: JSON.stringify({
              type: 'UNREGISTRATION_CONFIRMATION',
              userId: session.user.id,
              timestamp: unregistrationTime.toISOString(),
              data: {
                eventId,
                eventTitle: event?.title,
                startTime: event?.startTime
              }
            })
          }]
        });

      } catch (error) {
        // Transaction will automatically roll back on error
        console.error("Transaction failed:", error);
        throw error;
      }
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unregistered from event"
    });
