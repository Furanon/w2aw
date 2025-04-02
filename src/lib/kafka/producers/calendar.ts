import { KafkaProducer } from '../../kafka';
import { KAFKA_TOPICS } from '../../config/kafka';
import { logger } from '../../logger';

// Event types for calendar messages
export enum CalendarEventType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  REGISTER = 'REGISTER',
  UNREGISTER = 'UNREGISTER',
  PAYMENT = 'PAYMENT',
  REMINDER = 'REMINDER',
}

// Interface for calendar event messages
export interface CalendarMessage {
  type: CalendarEventType;
  eventId: string;
  userId?: string;
  timestamp: string;
  data: any;
}

/**
 * CalendarProducer - Handles publishing calendar events to Kafka topics
 * 
 * This class is responsible for sending calendar-related messages to the appropriate
 * Kafka topics, including event creation, updates, deletions, and participant management.
 */
export class CalendarProducer {
  private producer: KafkaProducer;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // ms

  constructor() {
    this.producer = KafkaProducer.getInstance();
  }

  /**
   * Publishes a calendar event message with retry logic
   * 
   * @param topic - Kafka topic to publish to
   * @param message - The calendar message to publish
   * @param key - Optional message key for partitioning
   * @returns Promise that resolves when the message is sent
   */
  private async publishWithRetry(
    topic: string,
    message: CalendarMessage,
    key?: string
  ): Promise<void> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.maxRetries) {
      try {
        await this.producer.send({
          topic,
          messages: [
            {
              key: key || message.eventId,
              value: JSON.stringify(message),
              headers: {
                'message-type': message.type,
                timestamp: new Date().toISOString(),
              },
            },
          ],
        });
        logger.info(`Successfully published ${message.type} event to ${topic}`, {
          eventId: message.eventId,
          type: message.type,
        });
        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Failed to publish message to ${topic}, attempt ${attempts + 1}`, {
          error: (error as Error).message,
          eventId: message.eventId,
          type: message.type,
        });
        attempts++;
        if (attempts < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempts));
        }
      }
    }

    // After all retries failed, send to DLQ
    try {
      await this.sendToDLQ(message, lastError);
    } catch (dlqError) {
      logger.error('Failed to send message to DLQ', {
        error: (dlqError as Error).message,
        originalError: lastError?.message,
        eventId: message.eventId,
      });
    }

    throw new Error(`Failed to publish message after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Sends a failed message to the Dead Letter Queue
   */
  private async sendToDLQ(message: CalendarMessage, error: Error | null): Promise<void> {
    const dlqMessage = {
      originalMessage: message,
      error: error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.CALENDAR_DLQ,
      messages: [
        {
          key: message.eventId,
          value: JSON.stringify(dlqMessage),
          headers: {
            'original-type': message.type,
            'error-timestamp': new Date().toISOString(),
          },
        },
      ],
    });
    logger.info(`Sent failed message to DLQ`, {
      eventId: message.eventId,
      type: message.type,
      error: error?.message,
    });
  }

  /**
   * Publishes a message about a new calendar event creation
   * 
   * @param eventId - The ID of the created event
   * @param userId - The ID of the user who created the event
   * @param eventData - The event data
   * @returns Promise that resolves when the message is sent
   */
  public async publishEventCreation(
    eventId: string,
    userId: string,
    eventData: any
  ): Promise<void> {
    const message: CalendarMessage = {
      type: CalendarEventType.CREATE,
      eventId,
      userId,
      timestamp: new Date().toISOString(),
      data: eventData,
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_EVENTS, message);
  }

  /**
   * Publishes a message about a calendar event update
   * 
   * @param eventId - The ID of the updated event
   * @param userId - The ID of the user who updated the event
   * @param eventData - The updated event data
   * @param changes - Optional details about what changed
   * @returns Promise that resolves when the message is sent
   */
  public async publishEventUpdate(
    eventId: string,
    userId: string,
    eventData: any,
    changes?: Record<string, any>
  ): Promise<void> {
    const message: CalendarMessage = {
      type: CalendarEventType.UPDATE,
      eventId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        event: eventData,
        changes: changes || {},
      },
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_UPDATES, message);
  }

  /**
   * Publishes a message about a calendar event deletion
   * 
   * @param eventId - The ID of the deleted event
   * @param userId - The ID of the user who deleted the event
   * @param reason - Optional reason for deletion
   * @returns Promise that resolves when the message is sent
   */
  public async publishEventDeletion(
    eventId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const message: CalendarMessage = {
      type: CalendarEventType.DELETE,
      eventId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        reason: reason || 'User initiated deletion',
      },
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_EVENTS, message);
  }

  /**
   * Publishes a message about a user registering for an event
   * 
   * @param eventId - The ID of the event
   * @param userId - The ID of the user who registered
   * @param registrationData - Additional registration data
   * @returns Promise that resolves when the message is sent
   */
  public async publishUserRegistration(
    eventId: string,
    userId: string,
    registrationData: any
  ): Promise<void> {
    const message: CalendarMessage = {
      type: CalendarEventType.REGISTER,
      eventId,
      userId,
      timestamp: new Date().toISOString(),
      data: registrationData,
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_NOTIFICATIONS, message);
  }

  /**
   * Publishes a message about a user unregistering from an event
   * 
   * @param eventId - The ID of the event
   * @param userId - The ID of the user who unregistered
   * @param reason - Optional reason for unregistering
   * @returns Promise that resolves when the message is sent
   */
  public async publishUserUnregistration(
    eventId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const message: CalendarMessage = {
      type: CalendarEventType.UNREGISTER,
      eventId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        reason: reason || 'User initiated cancellation',
      },
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_NOTIFICATIONS, message);
  }

  /**
   * Publishes a message about a successful payment for an event
   * 
   * @param eventId - The ID of the event
   * @param userId - The ID of the user who made the payment
   * @param paymentData - The payment details
   * @returns Promise that resolves when the message is sent
   */
  public async publishPaymentConfirmation(
    eventId: string,
    userId: string,
    paymentData: any
  ): Promise<void> {
    const message: CalendarMessage = {
      type: CalendarEventType.PAYMENT,
      eventId,
      userId,
      timestamp: new Date().toISOString(),
      data: paymentData,
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_NOTIFICATIONS, message);
  }

  /**
   * Publishes an event reminder notification
   * 
   * @param eventId - The ID of the event
   * @param userIds - Array of user IDs to notify
   * @param reminderData - Any additional reminder data
   * @returns Promise that resolves when the message is sent
   */
  public async publishEventReminder(
    eventId: string,
    userIds: string[],
    reminderData: any
  ): Promise<void> {
    const message: CalendarMessage = {
      type: CalendarEventType.REMINDER,
      eventId,
      timestamp: new Date().toISOString(),
      data: {
        userIds,
        ...reminderData,
      },
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_NOTIFICATIONS, message);
  }

  /**
   * Creates a singleton instance of the CalendarProducer
   * 
   * @returns The singleton CalendarProducer instance
   */
  public static getInstance(): CalendarProducer {
    if (!CalendarProducer.instance) {
      CalendarProducer.instance = new CalendarProducer();
    }
    return CalendarProducer.instance;
  }

  private static instance: CalendarProducer | null = null;
}

export default CalendarProducer;

