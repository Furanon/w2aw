import { Kafka, Producer, Message, ProducerRecord, TopicMessages } from 'kafkajs';
import { z } from 'zod';
import { KafkaClient } from '../../../lib/kafka';
import { KAFKA_CONFIG } from '../../../lib/config/kafka';
import { logger } from '../../../lib/logger';

/**
 * Configuration options for the BaseProducer
 */
export interface BaseProducerConfig {
  /** The Kafka topic to produce messages to */
  topic: string;
  /** The Dead Letter Queue topic where failed messages are sent */
  dlqTopic: string;
  /** Maximum number of retry attempts for failed message production */
  maxRetries?: number;
  /** Initial backoff delay in milliseconds for retry attempts */
  initialRetryDelay?: number;
  /** Factor to multiply delay by on each subsequent retry attempt */
  retryBackoffFactor?: number;
}

/**
 * Abstract base class for Kafka producers with built-in validation,
 * retry logic, and error handling.
 */
export abstract class BaseProducer<T extends object> {
  protected producer: Producer;
  protected topic: string;
  protected dlqTopic: string;
  protected maxRetries: number;
  protected initialRetryDelay: number;
  protected retryBackoffFactor: number;

  /**
   * Creates a new BaseProducer instance.
   * 
   * @param config - Configuration options for the producer
   */
  constructor(config: BaseProducerConfig) {
    const kafka = KafkaClient.getInstance().getClient();
    this.producer = kafka.producer();
    this.topic = config.topic;
    this.dlqTopic = config.dlqTopic;
    this.maxRetries = config.maxRetries ?? 3;
    this.initialRetryDelay = config.initialRetryDelay ?? 100;
    this.retryBackoffFactor = config.retryBackoffFactor ?? 2;
  }

  /**
   * Connects to the Kafka broker.
   */
  public async connect(): Promise<void> {
    try {
      await this.producer.connect();
      logger.info(`Producer connected to topic: ${this.topic}`);
    } catch (error) {
      logger.error('Failed to connect producer', { error, topic: this.topic });
      throw error;
    }
  }

  /**
   * Disconnects from the Kafka broker.
   */
  public async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      logger.info(`Producer disconnected from topic: ${this.topic}`);
    } catch (error) {
      logger.error('Failed to disconnect producer', { error, topic: this.topic });
    }
  }

  /**
   * Returns the validation schema for this producer.
   * Must be implemented by derived classes.
   */
  protected abstract getValidationSchema(): z.ZodType<T>;

  /**
   * Validates the payload using the schema from getValidationSchema().
   * 
   * @param payload - The payload to validate
   * @returns The validated payload
   * @throws If validation fails
   */
  protected validatePayload(payload: unknown): T {
    const schema = this.getValidationSchema();
    try {
      return schema.parse(payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedError = error.format();
        logger.error('Payload validation failed', { 
          error: formattedError, 
          topic: this.topic 
        });
        throw new Error(`Validation error: ${JSON.stringify(formattedError)}`);
      }
      throw error;
    }
  }

  /**
   * Creates a Kafka message from the provided payload.
   * 
   * @param payload - The payload to convert to a message
   * @param key - Optional message key for partitioning
   * @returns A Kafka message object
   */
  protected createMessage(payload: T, key?: string): Message {
    return {
      key: key ? Buffer.from(key) : null,
      value: Buffer.from(JSON.stringify(payload)),
      headers: {
        'content-type': Buffer.from('application/json'),
        'produced-at': Buffer.from(new Date().toISOString())
      }
    };
  }

  /**
   * Produces a message to the Kafka topic with retry logic.
   * 
   * @param payload - The payload to send
   * @param key - Optional message key for partitioning
   */
  public async produce(payload: unknown, key?: string): Promise<void> {
    try {
      // Validate the payload
      const validatedPayload = this.validatePayload(payload);
      
      // Create the message
      const message = this.createMessage(validatedPayload, key);
      
      // Send with retry logic
      await this.sendWithRetry(message);
      
      logger.info('Message produced successfully', { 
        topic: this.topic,
        key 
      });
    } catch (error) {
      logger.error('Failed to produce message', { 
        error, 
        topic: this.topic, 
        key 
      });
      
      // Send to DLQ if it's not a validation error
      if (!(error instanceof Error && error.message.startsWith('Validation error:'))) {
        await this.sendToDLQ(payload, key, error);
      }
      
      throw error;
    }
  }

  /**
   * Sends a message to the Kafka topic with retry logic.
   * 
   * @param message - The Kafka message to send
   * @param retryCount - Current retry attempt (used internally)
   */
  private async sendWithRetry(message: Message, retryCount = 0): Promise<void> {
    try {
      const record: ProducerRecord = {
        topic: this.topic,
        messages: [message]
      };
      
      await this.producer.send(record);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        // Calculate backoff delay with exponential backoff
        const delay = this.initialRetryDelay * Math.pow(this.retryBackoffFactor, retryCount);
        
        logger.warn(`Retrying message production (attempt ${retryCount + 1} of ${this.maxRetries})`, {
          topic: this.topic,
          delay
        });
        
        // Wait for the backoff period
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry with incremented count
        return this.sendWithRetry(message, retryCount + 1);
      }
      
      // Max retries exceeded
      logger.error(`Max retries (${this.maxRetries}) exceeded for message production`, {
        topic: this.topic,
        error
      });
      
      throw error;
    }
  }

  /**
   * Sends a failed message to the Dead Letter Queue.
   * 
   * @param originalPayload - The original payload that failed
   * @param key - The original message key
   * @param error - The error that caused the failure
   */
  private async sendToDLQ(originalPayload: unknown, key?: string, error?: unknown): Promise<void> {
    try {
      const dlqMessage: Message = {
        key: key ? Buffer.from(key) : null,
        value: Buffer.from(JSON.stringify({
          originalPayload,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          topic: this.topic
        })),
        headers: {
          'content-type': Buffer.from('application/json'),
          'produced-at': Buffer.from(new Date().toISOString()),
          'source-topic': Buffer.from(this.topic),
          'error-type': Buffer.from(error instanceof Error ? error.name : 'Unknown')
        }
      };
      
      const record: ProducerRecord = {
        topic: this.dlqTopic,
        messages: [dlqMessage]
      };
      
      await this.producer.send(record);
      
      logger.info('Message sent to DLQ', { 
        sourceTopic: this.topic, 
        dlqTopic: this.dlqTopic 
      });
    } catch (dlqError) {
      logger.error('Failed to send message to DLQ', { 
        error: dlqError, 
        originalError: error,
        sourceTopic: this.topic, 
        dlqTopic: this.dlqTopic 
      });
    }
  }

  /**
   * Batch produces multiple messages to the Kafka topic.
   * 
   * @param payloads - Array of payloads to send
   * @param keys - Optional array of message keys for partitioning (must match payloads length)
   */
  public async produceBatch(payloads: unknown[], keys?: string[]): Promise<void> {
    if (keys && keys.length !== payloads.length) {
      throw new Error('Number of keys must match number of payloads');
    }
    
    try {
      const messages: Message[] = payloads.map((payload, index) => {
        const validatedPayload = this.validatePayload(payload);
        return this.createMessage(validatedPayload, keys?.[index]);
      });
      
      const record: TopicMessages = {
        topic: this.topic,
        messages
      };
      
      await this.producer.send({ topics: [record] });
      
      logger.info('Batch messages produced successfully', { 
        topic: this.topic,
        count: messages.length 
      });
    } catch (error) {
      logger.error('Failed to produce batch messages', { 
        error, 
        topic: this.topic 
      });
      throw error;
    }
  }

  /**
   * Flushes any pending messages.
   */
  public async flush(): Promise<void> {
    try {
      await this.producer.flush();
      logger.info(`Producer flushed for topic: ${this.topic}`);
    } catch (error) {
      logger.error('Failed to flush producer', { error, topic: this.topic });
      throw error;
    }
  }
}

