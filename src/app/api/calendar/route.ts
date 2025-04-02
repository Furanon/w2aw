import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendar_events } from '@/db/schema';
import { auth } from '@/auth';
import { and, desc, eq, gte, like, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import CalendarProducer from '@/lib/kafka/producers/calendar';
import { logger } from '@/lib/logger';

// Define schema for event validation
const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location_id: z.number().int().positive(),
  instructor_id: z.string().uuid().optional(),
  type: z.enum(['RELAX_WELLNESS', 'OUTDOOR_ACTIVE', 'BEACH_SUN', 'DRINKS_NIGHTLIFE', 'FOOD_FAMILY', 'ACCOMMODATION']),
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.string().optional(),
  is_paid: z.boolean().default(false),
  price: z.number().nonnegative().optional(),
  max_participants: z.number().int().positive().optional(),
  image_url: z.string().url().optional(),
});

// GET handler for fetching all events with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Process query parameters
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const type = searchParams.get('type');
    const locationId = searchParams.get('location_id');
    const query = searchParams.get('query');
    
    // Build filter conditions
    let conditions = [];
    
    if (startDate) {
      conditions.push(gte(calendar_events.start_time, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(calendar_events.end_time, new Date(endDate)));
    }
    
    if (type) {
      conditions.push(eq(calendar_events.type, type));
    }
    
    if (locationId) {
      conditions.push(eq(calendar_events.location_id, parseInt(locationId)));
    }
    
    if (query) {
      conditions.push(
        sql`(${calendar_events.title} ILIKE ${`%${query}%`} OR ${calendar_events.description} ILIKE ${`%${query}%`})`
      );
    }
    
    // Execute query with filters
    const events = await db.query.calendar_events.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(calendar_events.start_time)],
      with: {
        location: true,
        instructor: true,
      },
    });
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error retrieving events:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve events' },
      { status: 500 }
    );
  }
}

// POST handler for creating new event
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate request body
    const validationResult = eventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid event data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const eventData = validationResult.data;
    
    // Convert string dates to Date objects
    const startTime = new Date(eventData.start_time);
    const endTime = new Date(eventData.end_time);
    
    // Validate that end time is after start time
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }
    
    // Get Kafka producer instance
    const calendarProducer = CalendarProducer.getInstance();
    
    // Start transaction to ensure consistency between DB and Kafka
    const newEvent = await db.transaction(async (tx) => {
      // Create new event in transaction
      const [event] = await tx.insert(calendar_events).values({
        title: eventData.title,
        description: eventData.description,
        start_time: startTime,
        end_time: endTime,
        location_id: eventData.location_id,
        instructor_id: eventData.instructor_id,
        type: eventData.type,
        is_recurring: eventData.is_recurring,
        recurrence_pattern: eventData.recurrence_pattern,
        is_paid: eventData.is_paid,
        price: eventData.price,
        max_participants: eventData.max_participants,
        image_url: eventData.image_url,
        created_by: session.user.id,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning();
      
      return event;
    });
    
    // Publish event creation to Kafka
    try {
      await calendarProducer.publishEventCreation(
        newEvent.id.toString(),
        session.user.id,
        newEvent
      );
      logger.info('Event creation published to Kafka', { eventId: newEvent.id });
    } catch (kafkaError) {
      // We don't want to fail the request if Kafka publishing fails
      // The event is already created in the database
      logger.error('Failed to publish event creation to Kafka', { 
        error: (kafkaError as Error).message,
        eventId: newEvent.id,
        userId: session.user.id
      });
    }
    
    // If successful, return the created event
    return NextResponse.json({ 
      message: 'Event created successfully', 
      event: newEvent 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

// PUT handler for updating multiple events (batch update)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }
    
    // Get Kafka producer instance
    const calendarProducer = CalendarProducer.getInstance();
    
    // Process batch updates
    const updateResults = await Promise.all(
      body.events.map(async (eventUpdate) => {
        const { id, ...updateData } = eventUpdate;
        
        if (!id) {
          return { success: false, error: 'Event ID is required', id };
        }
        
        try {
          // Update the event in a transaction
          const updatedEvent = await db.transaction(async (tx) => {
            const [event] = await tx
              .update(calendar_events)
              .set({
                ...updateData,
                updated_at: new Date(),
              })
              .where(eq(calendar_events.id, id))
              .returning();
              
            return event;
          });
          
          // Publish event update to Kafka
          try {
            await calendarProducer.publishEventUpdate(
              updatedEvent.id.toString(),
              session.user.id,
              updatedEvent,
              updateData
            );
            logger.info('Event update published to Kafka', { eventId: updatedEvent.id });
          } catch (kafkaError) {
            logger.error('Failed to publish event update to Kafka', {
              error: (kafkaError as Error).message,
              eventId: updatedEvent.id,
              userId: session.user.id
            });
            // The DB update succeeded, so we still return success
          }
            
          return { success: true, event: updatedEvent };
        } catch (error) {
          logger.error(`Error updating event ${id}:`, error);
          return { success: false, error: 'Failed to update event', id };
        }
      })
    );
    
    return NextResponse.json({ results: updateResults });
  } catch (error) {
    console.error('Error processing batch update:', error);
    return NextResponse.json(
      { error: 'Failed to process batch update' },
      { status: 500 }
    );
  }
}

// DELETE handler for deleting events (with support for batch delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');
    
    if (!ids) {
      return NextResponse.json(
        { error: 'Event IDs are required' },
        { status: 400 }
      );
    }
    
    const eventIds = ids.split(',');
    
    // Get Kafka producer instance
    const calendarProducer = CalendarProducer.getInstance();
    
    // Delete all specified events in a transaction
    const deleted = await db.transaction(async (tx) => {
      const deletedEvents = await tx
        .delete(calendar_events)
        .where(sql`${calendar_events.id} IN (${eventIds.join(',')})`)
        .returning({ id: calendar_events.id });
      
      return deletedEvents;
    });
    
    if (deleted.length === 0) {
      return NextResponse.json(
        { message: 'No events found to delete' },
        { status: 404 }
      );
    }
    
    // Publish event deletions to Kafka
    const kafkaPromises = deleted.map(async (event) => {
      try {
        await calendarProducer.publishEventDeletion(
          event.id.toString(),
          session.user.id,
          'User initiated deletion'
        );
        logger.info('Event deletion published to Kafka', { eventId: event.id });
        return { success: true, eventId: event.id };
      } catch (kafkaError) {
        logger.error('Failed to publish event deletion to Kafka', {
          error: (kafkaError as Error).message,
          eventId: event.id,
          userId: session.user.id
        });
        return { success: false, eventId: event.id, error: (kafkaError as Error).message };
      }
    });
    
    // Wait for all Kafka messages to be sent (or fail)
    const kafkaResults = await Promise.allSettled(kafkaPromises);
    
    return NextResponse.json({ 
      message: 'Events deleted successfully',
      deleted: deleted.map(d => d.id),
      kafka: kafkaResults.map((result, index) => ({
        eventId: deleted[index].id,
        published: result.status === 'fulfilled'
      }))
    });
  } catch (error) {
    console.error('Error deleting events:', error);
    return NextResponse.json(
      { error: 'Failed to delete events' },
      { status: 500 }
    );
  }
}

