import { Kafka, Producer, Consumer, KafkaMessage, logLevel } from 'kafkajs';
import { KAFKA_CONFIG, KAFKA_TOPICS, KAFKA_CONSUMER_GROUPS } from '@/lib/config/kafka';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { EventType } from '@/lib/events/schemas/baseEvent';

// Define message schemas
const BaseMessageSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  type: z.string(),
  version: z.string(),
  correlationId: z.string().optional(),
  source: z.string().optional(),
});

const CalendarEventSchema = BaseMessageSchema.extend({
  data: z.object({
    eventId: z.string(),
    action: z.enum(['created', 'updated', 'deleted', 'joined']),
    userId: z.string().optional(),
    payload: z.any(),
  }),
});

const CalendarUpdateSchema = BaseMessageSchema.extend({
  data: z.object({
    filters: z.any(),
    userId: z.string().optional(),
  }),
});

const VisualizationUpdateSchema = BaseMessageSchema.extend({
  data: z.object({
    visualizationType: z.string(),
    action: z.enum(['created', 'updated', 'deleted', 'viewed', 'interacted']),
    payload: z.any(),
  }),
});

// Define event types with schemas for validation
type MessageValidators = {
  [key in EventType]?: z.ZodSchema<any>;
};

const messageValidators: MessageValidators = {
  [EventType.CALENDAR_EVENTS]: CalendarEventSchema,
  [EventType.CALENDAR_UPDATED]: CalendarUpdateSchema,
  [EventType.VISUALIZATION_UPDATED]: VisualizationUpdateSchema,
};

// KafkaService singleton class
export class KafkaService {
  private static instance: KafkaService;
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private isProducerConnected = false;
  private isProducerConnecting = false;
  private consumerSubscriptions: Map<string, Set<(message: any) => void>> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  // Private constructor to enforce singleton pattern
  private constructor() {
    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: KAFKA_CONFIG.CLIENT_ID,
      brokers: KAFKA_CONFIG.BROKERS,
      ssl: KAFKA_CONFIG.SSL,
      sasl: KAFKA_CONFIG.SASL,
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: KAFKA_CONFIG.RETRY.INITIAL_RETRY_TIME,
        retries: KAFKA_CONFIG.RETRY.MAX_RETRIES,
      },
    });

    // Initialize the producer
    this.initializeProducer();
  }

  // Get singleton instance
  public static getInstance(): KafkaService {
    if (!KafkaService.instance) {
      KafkaService.instance = new KafkaService();
    }
    return KafkaService.instance;
  }

  // Initialize the Kafka producer
  private async initializeProducer() {
    if (this.isProducerConnecting) return;
    this.isProducerConnecting = true;

    try {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: KAFKA_CONFIG.CONSUMER_GROUP_CONFIG.DEFAULT.ALLOW_AUTO_TOPIC_CREATION,
        retry: {
          initialRetryTime: KAFKA_CONFIG.RETRY.INITIAL_RETRY_TIME,
          retries: KAFKA_CONFIG.RETRY.MAX_RETRIES,
        },
      });

      await this.producer.connect();
      this.isProducerConnected = true;
      console.log('Kafka producer connected successfully');
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
      this.isProducerConnected = false;
      
      // Schedule reconnection attempt
      setTimeout(() => {
        this.isProducerConnecting = false;
        this.initializeProducer();
      }, KAFKA_CONFIG.RETRY.INITIAL_RETRY_TIME);
    } finally {
      this.isProducerConnecting = false;
    }
  }

  // Get or create a consumer for a specific group
  private async getConsumer(groupId: string): Promise<Consumer> {
    // Return existing consumer if it exists
    if (this.consumers.has(groupId)) {
      return this.consumers.get(groupId)!;
    }

    // Create new consumer
    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: KAFKA_CONFIG.CONSUMER_GROUP_CONFIG.DEFAULT.SESSION_TIMEOUT,
      heartbeatInterval: KAFKA_CONFIG.CONSUMER_GROUP_CONFIG.DEFAULT.HEARTBEAT_INTERVAL,
      rebalanceTimeout: KAFKA_CONFIG.CONSUMER_GROUP_CONFIG.DEFAULT.REBALANCE_TIMEOUT,
      maxBytes: KAFKA_CONFIG.CONSUMER_GROUP_CONFIG.DEFAULT.MAX_BYTES,
      retry: {
        initialRetryTime: KAFKA_CONFIG.RETRY.INITIAL_RETRY_TIME,
        retries: KAFKA_CONFIG.RETRY.MAX_RETRIES,
      },
    });

    try {
      await consumer.connect();
      this.consumers.set(groupId, consumer);
      
      // Set up disconnect handler with reconnection logic
      consumer.on('consumer.disconnect', async () => {
        console.warn(`Kafka consumer ${groupId} disconnected. Attempting to reconnect...`);
        
        // Clear any existing reconnection timer for this consumer
        if (this.reconnectTimers.has(groupId)) {
          clearTimeout(this.reconnectTimers.get(groupId)!);
        }
        
        // Set up reconnection timer
        const reconnectTimer = setTimeout(async () => {
          try {
            await consumer.connect();
            console.log(`Kafka consumer ${groupId} reconnected successfully`);
          } catch (error) {
            console.error(`Failed to reconnect Kafka consumer ${groupId}:`, error);
          }
        }, KAFKA_CONFIG.RETRY.INITIAL_RETRY_TIME);
        
        this.reconnectTimers.set(groupId, reconnectTimer);
      });
      
      console.log(`Kafka consumer ${groupId} connected successfully`);
      return consumer;
    } catch (error) {
      console.error(`Failed to connect Kafka consumer ${groupId}:`, error);
      throw error;
    }
  }

  // Publish a message to a Kafka topic
  public async publishMessage(
    topic: string,
    message: any,
    key?: string,
    partition?: number,
    headers?: Record<string, string>
  ): Promise<void> {
    if (!this.isProducerConnected) {
      await this.initializeProducer();
      if (!this.isProducerConnected) {
        throw new Error('Kafka producer is not connected');
      }
    }

    try {
      // Validate message if validator exists
      const eventType = message.type as EventType;
      const validator = messageValidators[eventType];
      
      if (validator) {
        try {
          validator.parse(message);
        } catch (validationError) {
          console.error(`Message validation failed for ${topic}:`, validationError);
          
          // Send to DLQ for invalid messages if validation is strict
          if (KAFKA_CONFIG.VALIDATION.STRICT_MODE) {
            await this.publishToDLQ(topic, message, validationError as Error);
            return;
          }
        }
      }

      // Send message to topic
      await this.producer!.send({
        topic,
        messages: [
          {
            key: key ?? message.id,
            value: JSON.stringify(message),
            headers: headers ? 
              Object.entries(headers).reduce((acc, [key, value]) => {
                acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
                return acc;
              }, {} as Record<string, string>) 
              : undefined,
            partition: partition !== undefined ? partition : undefined,
          },
        ],
      });
      
      console.log(`Message published to ${topic} successfully`);
    } catch (error) {
      console.error(`Failed to publish message to ${topic}:`, error);
      
      // Send to DLQ on publish error
      await this.publishToDLQ(topic, message, error as Error);
      throw error;
    }
  }

  // Send failed messages to the Dead Letter Queue
  private async publishToDLQ(
    originalTopic: string,
    message: any,
    error: Error
  ): Promise<void> {
    try {
      // Determine the appropriate DLQ topic
      let dlqTopic: string;
      
      if (originalTopic.includes('calendar')) {
        dlqTopic = KAFKA_TOPICS.CALENDAR_DLQ;
      } else if (originalTopic.includes('visualization')) {
        dlqTopic = KAFKA_TOPICS.VISUALIZATION_DLQ;
      } else {
        dlqTopic = KAFKA_TOPICS.AI_DLQ; // Default DLQ
      }
      
      // Create DLQ message with error details
      const dlqMessage = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'dlq.message',
        version: '1.0',
        originalTopic,
        originalMessage: message,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      };
      
      // Send to DLQ topic
      await this.producer!.send({
        topic: dlqTopic,
        messages: [
          {
            key: message.id || uuidv4(),
            value: JSON.stringify(dlqMessage),
          },
        ],
      });
      
      console.log(`Message sent to DLQ ${dlqTopic}`);
    } catch (dlqError) {
      console.error('Failed to send message to DLQ:', dlqError);
      // At this point, we can only log the error since both the original send and DLQ send failed
    }
  }

  // Subscribe to Kafka topics
  public async subscribeToTopics(
    topics: string[],
    callback: (message: any) => void,
    groupId: string = KAFKA_CONSUMER_GROUPS.CALENDAR
  ): Promise<() => Promise<void>> {
    try {
      const consumer = await this.getConsumer(groupId);
      
      // Store the callback
      for (const topic of topics) {
        if (!this.consumerSubscriptions.has(topic)) {
          this.consumerSubscriptions.set(topic, new Set());
        }
        this.consumerSubscriptions.get(topic)!.add(callback);
      }
      
      // Subscribe to topics
      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning: false });
      }
      
      // Set up message handler if not already running
      await this.setupMessageHandler(consumer, groupId);
      
      // Return unsubscribe function
      return async () => {
        for (const topic of topics) {
          const callbacks = this.consumerSubscriptions.get(topic);
          if (callbacks) {
            callbacks.delete(callback);
          }
        }
      };
    } catch (error) {
      console.error(`Error subscribing to topics ${topics.join(', ')}:`, error);
      throw error;
    }
  }

  // Set up the message handler for a consumer
  private async setupMessageHandler(consumer: Consumer, groupId: string): Promise<void> {
    try {
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (!message.value) return;
            
            // Parse the message
            const parsedMessage = JSON.parse(message.value.toString());
            console.log(`Received message from ${topic}:`, parsedMessage.id);
            
            // Validate message if validator exists
            const eventType = parsedMessage.type as EventType;
            const validator = messageValidators[eventType];
            
            if (validator) {
              try {
                validator.parse(parsedMessage);
              } catch (validationError) {
                console.error(`Received invalid message on ${topic}:`, validationError);
                
                // If validation is strict, skip processing
                if (KAFKA_CONFIG.VALIDATION.STRICT_MODE) {
                  await this.publishToDLQ(topic, parsedMessage, validationError as Error);
                  return;
                }
              }
            }
            
            // Invoke all registered callbacks for this topic
            const callbacks = this.consumerSubscriptions.get(topic);
            if (callbacks) {
              for (const callback of callbacks) {
                try {
                  await callback(parsedMessage);
                } catch (callbackError) {
                  console.error(`Error in callback for ${topic}:`, callbackError);
                }
              }
            }
          } catch (processingError) {
            console.error(`Error processing message from ${topic}:`, processingError);
            
            // Send parsing or processing errors to DLQ
            if (message.value) {
              try {
                const originalMessage = JSON.parse(message.value.toString());
                await this.publishToDLQ(topic, originalMessage, processingError as Error);
              } catch (parseError) {
                // If can't parse, send the raw message to DLQ
                await this.publishToDLQ(topic, message.value.toString(), processingError as Error);
              }
            }
          }
        },
      });
    } catch (error) {
      console.error(`Error setting up message handler for consumer ${groupId}:`, error);
      throw error;
    }
  }
  
  // Helper to create standardized calendar event messages
  public createCalendarEventMessage(
    eventId: string,
    action: 'created' | 'updated' | 'deleted' | 'joined',
    payload: any,
    userId?: string
  ) {
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: EventType.CALENDAR_EVENTS,
      version: '1.0',
      source: 'calendar-service',
      data: {
        eventId,
        action,
        userId,
        payload,
      }
    };
  }
  
  // Helper to create standardized calendar filter update messages
  public createCalendarUpdateMessage(
    filters: any,
    userId?: string
  ) {
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: EventType.CALENDAR_UPDATED,
      version: '1.0',
      source: 'calendar-service',
      data: {
        filters,
        userId,
      }
    };
  }
  
  // Helper to create standardized visualization update messages
  public createVisualizationUpdateMessage(
    visualizationType: string,
    action: 'created' | 'updated' | 'deleted' | 'viewed' | 'interacted',
    payload: any
  ) {
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: EventType.VISUALIZATION_UPDATED,
      version: '1.0',
      source: 'visualization-service',
      data: {
        visualizationType,
        action,
        payload
      }
    };
  }

  // Clean up resources when service is no longer needed
  public async disconnect(): Promise<void> {
    try {
      // Disconnect all consumers
      for (const [groupId, consumer] of this.consumers.entries()) {
        try {
          await consumer.disconnect();
          console.log(`Disconnected consumer for group ${groupId}`);
        } catch (error) {
          console.error(`Error disconnecting consumer for group ${groupId}:`, error);
        }
      }
      
      // Clear all consumer subscriptions
      this.consumerSubscriptions.clear();
      
      // Disconnect producer
      if (this.producer) {
        await this.producer.disconnect();
        console.log('Disconnected Kafka producer');
      }
      
      // Clear reconnect timers
      for (const [groupId, timer] of this.reconnectTimers.entries()) {
        clearTimeout(timer);
      }
      this.reconnectTimers.clear();
      
      console.log('Kafka service disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Kafka service:', error);
      throw error;
    }
  }
}

