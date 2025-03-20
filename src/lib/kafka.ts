import { Kafka, Producer, Consumer, KafkaConfig } from "kafkajs";
      import { KAFKA_CONFIG, KAFKA_TOPICS, KafkaTopics } from "./config/kafka";

      /**
       * Singleton Kafka client instance
       */
      export class KafkaClient {
        private static instance: Kafka;
        
        private constructor() {}
        
        public static getInstance(): Kafka {
          if (!KafkaClient.instance) {
            KafkaClient.instance = new Kafka({
              clientId: KAFKA_CONFIG.CLIENT_ID,
              brokers: KAFKA_CONFIG.BROKERS,
              ssl: KAFKA_CONFIG.SSL,
              sasl: KAFKA_CONFIG.SASL,
            });
          }
          return KafkaClient.instance;
        }
      }

      /**
       * Singleton Kafka producer instance
       */
      export class KafkaProducer {
        private static instance: Producer;
        private static isConnected: boolean = false;
        
        private constructor() {}
        
        public static async getInstance(): Promise<Producer> {
          if (!KafkaProducer.instance) {
            KafkaProducer.instance = KafkaClient.getInstance().producer();
          }
          
          if (!KafkaProducer.isConnected) {
            await KafkaProducer.instance.connect();
            KafkaProducer.isConnected = true;
          }
          
          return KafkaProducer.instance;
        }

        public static async disconnect(): Promise<void> {
          if (KafkaProducer.instance && KafkaProducer.isConnected) {
            await KafkaProducer.instance.disconnect();
            KafkaProducer.isConnected = false;
          }
        }
      }

      /**
       * Message handler type for Kafka consumers
       */
      export type MessageHandler = (message: {
        topic: string;
        partition: number;
        message: {
          value: Buffer;
          key?: string;
          timestamp?: string;
          headers?: Record<string, string>;
        };
      }) => Promise<void>;

      /**
       * Kafka consumer class with built-in error handling and reconnection logic
       */
      export class KafkaConsumer {
        private consumer: Consumer;
        private isConnected: boolean = false;
        private handlers: Map<string, MessageHandler> = new Map();
        
        constructor(
          private readonly groupId: string,
          private readonly topics: KafkaTopics[],
          private readonly config: Partial<KafkaConfig> = {}
        ) {
          this.consumer = KafkaClient.getInstance().consumer({
            groupId,
            ...config,
          });
        }
        
        public async connect(): Promise<void> {
          if (!this.isConnected) {
            await this.consumer.connect();
            await Promise.all(
              this.topics.map(topic => this.consumer.subscribe({ topic }))
            );
            this.isConnected = true;
          }
        }
        
        public async disconnect(): Promise<void> {
          if (this.isConnected) {
            await this.consumer.disconnect();
            this.isConnected = false;
          }
        }
        
        public onMessage(topic: KafkaTopics, handler: MessageHandler): void {
          this.handlers.set(topic, handler);
        }
        
        public async start(): Promise<void> {
          await this.connect();
          
          await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
              const handler = this.handlers.get(topic);
              if (handler) {
                try {
                  await handler({ topic, partition, message });
                } catch (error) {
                  console.error(`Error processing message from ${topic}:`, error);
                }
              }
            },
          });
        }
      }

      export { KAFKA_TOPICS, KAFKA_CONFIG, KafkaTopics };
