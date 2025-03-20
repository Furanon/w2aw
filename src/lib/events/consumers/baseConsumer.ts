import { Kafka, Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import { ZodSchema } from 'zod';
import { EventType } from '../schemas/baseEvent';
import { logger } from '../../logger';
import { consumerHealthMonitor } from '@/app/api/kafka/consumers/health';

export interface ConsumerConfig {
  topic: string;
  groupId: string;
  clientId: string;
  brokers: string[];
  maxRetries: number;
  retryInterval: number;
  dlqTopic?: string;
  autoCommit?: boolean;
}

export abstract class BaseConsumer<T> {
  protected consumer: Consumer;
  protected config: ConsumerConfig;
  protected validationSchema: ZodSchema<T>;
  private running: boolean = false;
  private retryCount: Map<string, number> = new Map();
  private consumerId: string;
  private processingStartTime: number = 0;

  constructor(
    kafka: Kafka,
    config: ConsumerConfig,
    validationSchema: ZodSchema<T>
  ) {
    this.config = {
      ...config,
      autoCommit: config.autoCommit !== undefined ? config.autoCommit : true,
    };
    this.consumer = kafka.consumer({ groupId: this.config.groupId });
    this.validationSchema = validationSchema;
    this.consumerId = `${this.config.groupId}-${this.config.topic}`;
    // Register with health monitor
    consumerHealthMonitor.registerConsumer(this.consumer, this.config);
  }

  public async start(): Promise<void> {
    if (this.running) {
      logger.warn(`Consumer for ${this.config.topic} is already running`);
      return;
    }

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: this.config.topic, fromBeginning: false });
      
      await this.consumer.run({
        autoCommit: this.config.autoCommit,
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;
          const messageKey = message.key?.toString() || '';
          const messageId = `${topic}-${partition}-${message.offset}`;
          
          try {
            await this.processMessage(payload);
            // Clear retry count on successful processing
            this.retryCount.delete(messageId);
          } catch (error) {
            await this.handleError(error, payload, messageId);
          }
        },
      });

      this.running = true;
      logger.info(`Consumer started for topic: ${this.config.topic}`);
      consumerHealthMonitor.startMonitoring();
    } catch (error) {
      logger.error(`Failed to start consumer for topic ${this.config.topic}:`, error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.running) {
      logger.warn(`Consumer for ${this.config.topic} is not running`);
      return;
    }

    try {
      consumerHealthMonitor.stopMonitoring();
      await this.consumer.disconnect();
      this.running = false;
      logger.info(`Consumer stopped for topic: ${this.config.topic}`);
    } catch (error) {
      logger.error(`Failed to stop consumer for topic ${this.config.topic}:`, error);
      throw error;
    }
  }

  protected async validateMessage(message: KafkaMessage): Promise<T> {
    if (!message.value) {
      throw new Error('Message has no value');
    }

    try {
      const messageValue = JSON.parse(message.value.toString());
      return this.validationSchema.parse(messageValue);
    } catch (error) {
      logger.error(`Message validation failed:`, error);
      throw new Error(`Invalid message format: ${error.message}`);
    }
  }

  private async handleError(error: any, payload: EachMessagePayload, messageId: string): Promise<void> {
    const { topic, partition, message } = payload;
    logger.error(`Error processing message from ${topic}:`, error);

    // Get or initialize retry count
    const currentRetryCount = this.retryCount.get(messageId) || 0;
    
    // Check if we should retry
    if (currentRetryCount < this.config.maxRetries) {
      this.retryCount.set(messageId, currentRetryCount + 1);
      const retryDelay = this.config.retryInterval * Math.pow(2, currentRetryCount);
      
      logger.info(`Retrying message (${currentRetryCount + 1}/${this.config.maxRetries}) after ${retryDelay}ms`);
      
      setTimeout(() => {
        this.processMessage(payload).catch(retryError => {
          logger.error(`Retry failed for message:`, retryError);
        });
      }, retryDelay);
    } else {
      // Max retries reached, send to DLQ if configured
      await this.sendToDLQ(message);
      logger.warn(`Max retries reached for message, sent to DLQ`);
      // Clear retry count
      this.retryCount.delete(messageId);
    }
  }

  private async sendToDLQ(message: KafkaMessage): Promise<void> {
    if (!this.config.dlqTopic) {
      logger.warn(`No DLQ topic configured for ${this.config.topic}`);
      return;
    }

    try {
      // Implementation will depend on how your producers are set up
      // This is a placeholder for the actual DLQ sending logic
      logger.info(`Sending message to DLQ topic: ${this.config.dlqTopic}`);
      
      // Additional logic to send to DLQ would go here
      // For example, using a KafkaProducer instance to send the message
    } catch (error) {
      logger.error(`Failed to send message to DLQ:`, error);
    }
  }

  /**
   * Process the incoming message
   * This method should be implemented by subclasses to provide domain-specific processing
   */
  protected async processMessage(payload: EachMessagePayload): Promise<void> {
    this.processingStartTime = Date.now();
    
    try {
      // Validate and process the message
      const { message } = payload;
      const parsedMessage = await this.validateMessage(message);
      await this.handleMessage(parsedMessage);
      
      // Record successful processing
      const processingTime = Date.now() - this.processingStartTime;
      consumerHealthMonitor.recordMessageProcessed(this.consumerId, processingTime);
    } catch (error) {
      // Record error in health monitor
      consumerHealthMonitor.recordError(this.consumerId, error as Error);
      
      // Re-throw the error to be handled by the error handler
      throw error;
    }
  }

  /**
   * Handle the validated message
   * This method should be implemented by subclasses to provide domain-specific processing
   */
  protected abstract handleMessage(message: T): Promise<void>;

  /**
   * Get event type this consumer handles
   * This method should be implemented by subclasses to identify which event types they handle
   */
  protected abstract getEventType(): EventType;
}

