import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';

// Initialize Kafka client with broker configuration
export const initKafkaClient = (): Kafka => {
  // Retrieve Kafka broker information from environment variables
  const brokers = process.env.KAFKA_BROKERS 
    ? process.env.KAFKA_BROKERS.split(',') 
    : ['localhost:9092'];
  
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'next-app-client',
    brokers,
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
      mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
      username: process.env.KAFKA_SASL_USERNAME || '',
      password: process.env.KAFKA_SASL_PASSWORD || '',
    } : undefined,
  });

  return kafka;
};

// Create a producer for sending messages to Kafka topics
export const createProducer = async (): Promise<Producer> => {
  try {
    const kafka = initKafkaClient();
    const producer = kafka.producer();
    await producer.connect();
    console.log('Kafka producer connected successfully');
    return producer;
  } catch (error) {
    console.error('Error connecting to Kafka producer:', error);
    throw error;
  }
};

// Send a message to a specific Kafka topic
export const produceMessage = async (topic: string, message: any): Promise<boolean> => {
  try {
    const producer = await createProducer();
    await producer.send({
      topic,
      messages: [
        { value: typeof message === 'string' ? message : JSON.stringify(message) },
      ],
    });
    await producer.disconnect();
    console.log(`Message sent to topic ${topic} successfully`);
    return true;
  } catch (error) {
    console.error(`Error sending message to topic ${topic}:`, error);
    throw error;
  }
};

// Create a consumer for receiving messages from Kafka topics
export const createConsumer = async (groupId?: string): Promise<Consumer> => {
  try {
    const kafka = initKafkaClient();
    const consumer = kafka.consumer({
      groupId: groupId || `next-app-consumer-${Date.now()}`,
    });
    await consumer.connect();
    console.log('Kafka consumer connected successfully');
    return consumer;
  } catch (error) {
    console.error('Error connecting to Kafka consumer:', error);
    throw error;
  }
};

// Subscribe to a topic and process incoming messages
export const consumeMessages = async (
  topic: string, 
  messageHandler: (message: KafkaMessage, topic: string, partition: number) => Promise<void>, 
  groupId = `next-app-consumer-${Date.now()}`
) => {
  try {
    const consumer = await createConsumer(groupId);
    
    await consumer.subscribe({ topic, fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          await messageHandler(message, topic, partition);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });

    // Return functions to control the consumer
    return {
      disconnect: async () => {
        await consumer.disconnect();
        console.log('Kafka consumer disconnected');
      },
      pause: () => {
        consumer.pause([{ topic }]);
        console.log(`Consumer paused for topic ${topic}`);
      },
      resume: () => {
        consumer.resume([{ topic }]);
        console.log(`Consumer resumed for topic ${topic}`);
      }
    };
  } catch (error) {
    console.error(`Error setting up consumer for topic ${topic}:`, error);
    throw error;
  }
};

// Export a Kafka instance directly for convenience
export const kafka = initKafkaClient();
