import { NextRequest, NextResponse } from "next/server";
import { KafkaConsumer } from "@/lib/kafka";
import { db } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { KAFKA_TOPICS, CONSUMER_GROUPS, MESSAGE_TYPES } from "@/lib/config/kafka";
import { calendarEvents, eventParticipants } from "@/db/schema";
import { ConsumerHealthMonitor } from "@/lib/health";
import { logger } from "@/lib/logger";

// Define the expected message structure for calendar events
interface CalendarMessage {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'REGISTER' | 'UNREGISTER';
  eventId: string;
  userId?: string;
  timestamp: string;
  data: any;
}

class CalendarConsumer extends KafkaConsumer {
  private healthMonitor: ConsumerHealthMonitor;

  constructor() {
    super(
      CONSUMER_GROUPS.CALENDAR,
      [
        KAFKA_TOPICS.CALENDAR_EVENTS,
        KAFKA_TOPICS.CALENDAR_NOTIFICATIONS,
        KAFKA_TOPICS.CALENDAR_UPDATES,
      ],
      {
        autoCommit: true,
        autoCommitInterval: 5000,
        maxInFlightRequests: 10,
        retry: {
          maxRetryTime: 30000,
          initialRetryTime: 1000,
          retries: 5,
        },
      }
    );

    this.healthMonitor = new ConsumerHealthMonitor(CONSUMER_GROUPS.CALENDAR);
    
    // Register message handlers
    this.registerHandler(KAFKA_TOPICS.CALENDAR_EVENTS, this.handleCalendarEvent.bind(this));
    this.registerHandler(KAFKA_TOPICS.CALENDAR_NOTIFICATIONS, this.handleCalendarNotification.bind(this));
    this.registerHandler(KAFKA_TOPICS.CALENDAR_UPDATES, this.handleCalendarUpdate.bind(this));
  }

  private async handleCalendarEvent(message: any): Promise<void> {
    try {
      this.healthMonitor.recordMessageReceived();
      const payload = message.value as CalendarMessage;
      logger.info(`Processing calendar event: ${payload.type} for event ${payload.eventId}`);

      switch (payload.type) {
        case 'CREATE':
          await this.handleCreateEvent(payload);
          break;
        case 'UPDATE':
          await this.handleUpdateEvent(payload);
          break;
        case 'DELETE':
          await this.handleDeleteEvent(payload);
          break;
        case 'REGISTER':
          await this.handleRegisterParticipant(payload);
          break;
        case 'UNREGISTER':
          await this.handleUnregisterParticipant(payload);
          break;
        default:
          throw new Error(`Unknown calendar event type: ${payload.type}`);
      }

      this.healthMonitor.recordMessageProcessed();
    } catch (error) {
      this.healthMonitor.recordError();
      logger.error(`Error processing calendar event: ${error.message}`, error);
      await this.sendToDLQ(message, KAFKA_TOPICS.CALENDAR_DLQ, error);
      throw error;
    }
  }

  private async handleCalendarNotification(message: any): Promise<void> {
    try {
      this.healthMonitor.recordMessageReceived();
      // Implementation for notification processing (email, push, etc.)
      logger.info(`Processing calendar notification: ${JSON.stringify(message.value)}`);
      this.healthMonitor.recordMessageProcessed();
    } catch (error) {
      this.healthMonitor.recordError();
      logger.error(`Error processing calendar notification: ${error.message}`, error);
      await this.sendToDLQ(message, KAFKA_TOPICS.CALENDAR_DLQ, error);
      throw error;
    }
  }

  private async handleCalendarUpdate(message: any): Promise<void> {
    try {
      this.healthMonitor.recordMessageReceived();
      // Implementation for other calendar updates
      logger.info(`Processing calendar update: ${JSON.stringify(message.value)}`);
      this.healthMonitor.recordMessageProcessed();
    } catch (error) {
      this.healthMonitor.recordError();
      logger.error(`Error processing calendar update: ${error.message}`, error);
      await this.sendToDLQ(message, KAFKA_TOPICS.CALENDAR_DLQ, error);
      throw error;
    }
  }

  private async handleCreateEvent(payload: CalendarMessage): Promise<void> {
    const { data } = payload;
    if (!data) throw new Error('Missing event data for CREATE operation');

    await db.insert(calendarEvents).values({
      id: payload.eventId,
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      locationId: data.locationId,
      creatorId: data.creatorId,
      isRecurring: data.isRecurring || false,
      recurringPattern: data.recurringPattern,
      eventType: data.eventType,
      isPaid: data.isPaid || false,
      price: data.price || 0,
      maxParticipants: data.maxParticipants,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`Created calendar event: ${payload.eventId}`);
  }

  private async handleUpdateEvent(payload: CalendarMessage): Promise<void> {
    const { eventId, data } = payload;
    if (!eventId || !data) throw new Error('Missing event ID or data for UPDATE operation');

    await db.update(calendarEvents)
      .set({
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        locationId: data.locationId,
        isRecurring: data.isRecurring,
        recurringPattern: data.recurringPattern,
        eventType: data.eventType,
        isPaid: data.isPaid,
        price: data.price,
        maxParticipants: data.maxParticipants,
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, eventId));

    logger.info(`Updated calendar event: ${eventId}`);
  }

  private async handleDeleteEvent(payload: CalendarMessage): Promise<void> {
    const { eventId } = payload;
    if (!eventId) throw new Error('Missing event ID for DELETE operation');

    // Delete all participants first (foreign key constraint)
    await db.delete(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId));

    // Then delete the event
    await db.delete(calendarEvents)
      .where(eq(calendarEvents.id, eventId));

    logger.info(`Deleted calendar event: ${eventId}`);
  }

  private async handleRegisterParticipant(payload: CalendarMessage): Promise<void> {
    const { eventId, userId, data } = payload;
    if (!eventId || !userId) throw new Error('Missing event ID or user ID for REGISTER operation');

    // Check if the user is already registered
    const existingRegistration = await db.select()
      .from(eventParticipants)
      .where(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      );

    if (existingRegistration.length > 0) {
      logger.warn(`User ${userId} is already registered for event ${eventId}`);
      return;
    }

    // Check if the event exists and has space
    const event = await db.select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (event.length === 0) {
      throw new Error(`Event ${eventId} does not exist`);
    }

    // Check if the event is full
    const currentParticipants = await db.select({ count: eventParticipants.userId })
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId));

    if (event[0].maxParticipants && currentParticipants.length >= event[0].maxParticipants) {
      throw new Error(`Event ${eventId} is full`);
    }

    // Add the participant
    await db.insert(eventParticipants).values({
      eventId,
      userId,
      registeredAt: new Date(),
      hasPaid: data?.hasPaid || false,
      paymentIntentId: data?.paymentIntentId,
      notes: data?.notes,
    });

    logger.info(`Registered user ${userId} for event ${eventId}`);
  }

  private async handleUnregisterParticipant(payload: CalendarMessage): Promise<void> {
    const { eventId, userId } = payload;
    if (!eventId || !userId) throw new Error('Missing event ID or user ID for UNREGISTER operation');

    await db.delete(eventParticipants)
      .where(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      );

    logger.info(`Unregistered user ${userId} from event ${eventId}`);
  }

  // Process messages from DLQ
  async processDLQ(): Promise<void> {
    logger.info('Processing calendar DLQ messages...');
    await this.consumeDLQ(KAFKA_TOPICS.CALENDAR_DLQ, async (message) => {
      try {
        logger.info(`Reprocessing failed calendar message: ${JSON.stringify(message.value)}`);
        // Custom logic for reprocessing or resolving failures
        // For simplicity, we're just logging the failure
        this.healthMonitor.recordMessageProcessed();
        return true; // Successfully processed
      } catch (error) {
        logger.error(`Failed to reprocess calendar DLQ message: ${error.message}`);
        this.healthMonitor.recordError();
        return false; // Failed to process
      }
    });
  }

  // Get health status for this consumer
  getHealth() {
    return this.healthMonitor.getStatus();
  }
}

// Singleton instance of the calendar consumer
let calendarConsumer: CalendarConsumer | null = null;

export async function GET(request: NextRequest) {
  try {
    if (!calendarConsumer) {
      calendarConsumer = new CalendarConsumer();
      await calendarConsumer.connect();
      logger.info('Calendar consumer connected and ready');
    }

    // Return health status if requested
    if (request.nextUrl.searchParams.get('health') === 'true') {
      return NextResponse.json(calendarConsumer.getHealth());
    }

    return NextResponse.json({ status: 'Calendar consumer running' });
  } catch (error) {
    logger.error(`Error in calendar consumer: ${error.message}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!calendarConsumer) {
      calendarConsumer = new CalendarConsumer();
      await calendarConsumer.connect();
    }

    const action = request.nextUrl.searchParams.get('action');
    switch (action) {
      case 'process-dlq':
        await calendarConsumer.processDLQ();
        return NextResponse.json({ status: 'DLQ processing started' });
      case 'pause':
        await calendarConsumer.pause();
        return NextResponse.json({ status: 'Consumer paused' });
      case 'resume':
        await calendarConsumer.resume();
        return NextResponse.json({ status: 'Consumer resumed' });
      default:
        return NextResponse.json(
          { error: 'Invalid action, supported actions: process-dlq, pause, resume' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error(`Error in calendar consumer action: ${error.message}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

