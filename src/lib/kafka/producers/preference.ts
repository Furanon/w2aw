import { KafkaProducer } from '../../kafka';
import { KAFKA_TOPICS } from '../../config/kafka';
import { logger } from '../../logger';

// Event types for preference messages
export enum PreferenceEventType {
  LIKE = 'LIKE',
  UNLIKE = 'UNLIKE',
  UPDATE = 'UPDATE',
}

// Interface for preference event messages
export interface PreferenceMessage {
  type: PreferenceEventType;
  preferenceId?: string;
  userId: string;
  eventId?: string;
  timestamp: string;
  data: any;
}

/**
 * PreferenceProducer - Handles publishing user preference events to Kafka topics
 * 
 * This class is responsible for sending preference-related messages to the appropriate
 * Kafka topics, including likes, unlikes, and preference updates.
 */
export class PreferenceProducer {
  private producer: KafkaProducer;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // ms

  constructor() {
    this.producer = KafkaProducer.getInstance();
  }

  /**
   * Publishes a preference event message with retry logic
   * 
   * @param topic - Kafka topic to publish to
   * @param message - The preference message to publish
   * @param key - Optional message key for partitioning
   * @returns Promise that resolves when the message is sent
   */
  private async publishWithRetry(
    topic: string,
    message: PreferenceMessage,
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
              key: key || message.userId,
              value: JSON.stringify(message),
              headers: {
                'message-type': message.type,
                timestamp: new Date().toISOString(),
              },
            },
          ],
        });
        logger.info(`Successfully published ${message.type} preference event to ${topic}`, {
          userId: message.userId,
          eventId: message.eventId,
          type: message.type,
        });
        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Failed to publish preference message to ${topic}, attempt ${attempts + 1}`, {
          error: (error as Error).message,
          userId: message.userId,
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
      logger.error('Failed to send preference message to DLQ', {
        error: (dlqError as Error).message,
        originalError: lastError?.message,
        userId: message.userId,
      });
    }

    throw new Error(`Failed to publish preference message after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Sends a failed message to the Dead Letter Queue
   */
  private async sendToDLQ(message: PreferenceMessage, error: Error | null): Promise<void> {
    const dlqMessage = {
      originalMessage: message,
      error: error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.CALENDAR_DLQ,
      messages: [
        {
          key: message.userId,
          value: JSON.stringify(dlqMessage),
          headers: {
            'original-type': message.type,
            'error-timestamp': new Date().toISOString(),
          },
        },
      ],
    });
    logger.info(`Sent failed preference message to DLQ`, {
      userId: message.userId,
      type: message.type,
      error: error?.message,
    });
  }

  /**
   * Publishes a message about a user liking a course/event
   * 
   * @param userId - The ID of the user who liked the event
   * @param eventId - The ID of the liked event
   * @param preferenceData - Additional preference data (time preferences, etc.)
   * @returns Promise that resolves when the message is sent
   */
  public async publishLikeEvent(
    userId: string,
    eventId: string,
    preferenceData: any
  ): Promise<void> {
    const message: PreferenceMessage = {
      type: PreferenceEventType.LIKE,
      userId,
      eventId,
      timestamp: new Date().toISOString(),
      data: preferenceData,
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_NOTIFICATIONS, message);
  }

  /**
   * Publishes a message about a user unliking a course/event
   * 
   * @param userId - The ID of the user who unliked the event
   * @param eventId - The ID of the unliked event
   * @param reason - Optional reason for unliking
   * @returns Promise that resolves when the message is sent
   */
  public async publishUnlikeEvent(
    userId: string,
    eventId: string,
    reason?: string
  ): Promise<void> {
    const message: PreferenceMessage = {
      type: PreferenceEventType.UNLIKE,
      userId,
      eventId,
      timestamp: new Date().toISOString(),
      data: {
        reason: reason || 'User removed preference',
      },
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_NOTIFICATIONS, message);
  }

  /**
   * Publishes a message about a user updating their preferences
   * 
   * @param userId - The ID of the user who updated preferences
   * @param preferenceId - The ID of the preference record
   * @param preferenceData - The updated preference data
   * @param changes - Optional details about what changed
   * @returns Promise that resolves when the message is sent
   */
  public async publishPreferenceUpdate(
    userId: string,
    preferenceId: string,
    preferenceData: any,
    changes?: Record<string, any>
  ): Promise<void> {
    const message: PreferenceMessage = {
      type: PreferenceEventType.UPDATE,
      preferenceId,
      userId,
      eventId: preferenceData.eventId,
      timestamp: new Date().toISOString(),
      data: {
        preference: preferenceData,
        changes: changes || {},
      },
    };

    return this.publishWithRetry(KAFKA_TOPICS.CALENDAR_UPDATES, message);
  }

  /**
   * Creates a singleton instance of the PreferenceProducer
   * 
   * @returns The singleton PreferenceProducer instance
   */
  public static getInstance(): PreferenceProducer {
    if (!PreferenceProducer.instance) {
      PreferenceProducer.instance = new PreferenceProducer();
    }
    return PreferenceProducer.instance;
  }

  private static instance: PreferenceProducer | null = null;
}

export default PreferenceProducer;

