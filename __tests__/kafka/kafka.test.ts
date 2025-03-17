import { Kafka } from 'kafkajs';
import { createKafkaProducer, createKafkaConsumer } from '../../lib/kafka';

// Mock the KafkaJS library
jest.mock('kafkajs', () => {
  // Create mock implementations
  const connectMock = jest.fn().mockResolvedValue(undefined);
  const disconnectMock = jest.fn().mockResolvedValue(undefined);
  const subscribeMock = jest.fn().mockResolvedValue(undefined);
  const runMock = jest.fn().mockImplementation((options) => {
    if (options && options.eachMessage) {
      // Simulate message consumption
      const message = {
        topic: 'test-topic',
        partition: 0,
        message: {
          key: Buffer.from('test-key'),
          value: Buffer.from(JSON.stringify({ testData: 'test-value' })),
          headers: {},
          timestamp: String(Date.now()),
          offset: '0',
        },
      };
      options.eachMessage(message);
    }
    return Promise.resolve();
  });
  const sendMock = jest.fn().mockResolvedValue({
    topicName: 'test-topic',
    partition: 0,
    errorCode: 0,
  });

  return {
    Kafka: jest.fn().mockImplementation(() => ({
      producer: jest.fn().mockReturnValue({
        connect: connectMock,
        disconnect: disconnectMock,
        send: sendMock,
      }),
      consumer: jest.fn().mockReturnValue({
        connect: connectMock,
        disconnect: disconnectMock,
        subscribe: subscribeMock,
        run: runMock,
      }),
    })),
    logLevel: {
      INFO: 4,
      ERROR: 1,
      WARN: 2,
      DEBUG: 5,
    },
  };
});

describe('Kafka Integration', () => {
  beforeEach(() => {
    // Clear all mock implementations before each test
    jest.clearAllMocks();
  });

  describe('Kafka Producer', () => {
    test('should connect successfully', async () => {
      const producer = await createKafkaProducer();
      
      // Check if Kafka constructor was called with correct config
      expect(Kafka).toHaveBeenCalledWith(expect.objectContaining({
        clientId: expect.any(String),
        brokers: expect.any(Array),
      }));
      
      // Check if connect was called
      expect(producer.connect).toHaveBeenCalled();
    });

    test('should send messages successfully', async () => {
      const producer = await createKafkaProducer();
      
      // Send a test message
      const result = await producer.send({
        topic: 'test-topic',
        messages: [
          { 
            key: 'test-key', 
            value: JSON.stringify({ testData: 'test-value' }) 
          },
        ],
      });
      
      // Verify send was called with correct parameters
      expect(producer.send).toHaveBeenCalledWith({
        topic: 'test-topic',
        messages: [
          { 
            key: 'test-key', 
            value: JSON.stringify({ testData: 'test-value' }) 
          },
        ],
      });
      
      // Verify result
      expect(result).toEqual({
        topicName: 'test-topic',
        partition: 0,
        errorCode: 0,
      });
    });

    test('should disconnect successfully', async () => {
      const producer = await createKafkaProducer();
      await producer.disconnect();
      
      // Check if disconnect was called
      expect(producer.disconnect).toHaveBeenCalled();
    });
  });

  describe('Kafka Consumer', () => {
    test('should connect successfully', async () => {
      const consumer = await createKafkaConsumer('test-group');
      
      // Check if Kafka constructor was called with correct config
      expect(Kafka).toHaveBeenCalledWith(expect.objectContaining({
        clientId: expect.any(String),
        brokers: expect.any(Array),
      }));
      
      // Check if connect was called
      expect(consumer.connect).toHaveBeenCalled();
    });

    test('should subscribe to topic', async () => {
      const consumer = await createKafkaConsumer('test-group');
      await consumer.subscribe({ topic: 'test-topic' });
      
      // Check if subscribe was called with correct parameters
      expect(consumer.subscribe).toHaveBeenCalledWith({ topic: 'test-topic' });
    });

    test('should consume messages', async () => {
      const consumer = await createKafkaConsumer('test-group');
      
      // Create a mock message handler
      const mockMessageHandler = jest.fn();
      
      // Start consuming messages
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          // Parse the message value
          const messageValue = JSON.parse(message.value.toString());
          mockMessageHandler(topic, partition, messageValue);
        },
      });
      
      // Check if run was called
      expect(consumer.run).toHaveBeenCalled();
      
      // Check if message handler was called with correct parameters
      expect(mockMessageHandler).toHaveBeenCalledWith(
        'test-topic',
        0,
        { testData: 'test-value' }
      );
    });

    test('should disconnect successfully', async () => {
      const consumer = await createKafkaConsumer('test-group');
      await consumer.disconnect();
      
      // Check if disconnect was called
      expect(consumer.disconnect).toHaveBeenCalled();
    });
  });

  describe('End-to-End Kafka Flow', () => {
    test('should produce and consume a message', async () => {
      // Create producer and consumer
      const producer = await createKafkaProducer();
      const consumer = await createKafkaConsumer('test-group');
      
      // Subscribe to topic
      await consumer.subscribe({ topic: 'test-topic' });
      
      // Create a message handler that resolves a promise when message is received
      let messageReceived;
      const messagePromise = new Promise(resolve => {
        messageReceived = resolve;
      });
      
      // Start consuming
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const messageValue = JSON.parse(message.value.toString());
          messageReceived({ topic, partition, messageValue });
        },
      });
      
      // Send a message
      await producer.send({
        topic: 'test-topic',
        messages: [
          { 
            key: 'test-key', 
            value: JSON.stringify({ testData: 'test-value' }) 
          },
        ],
      });
      
      // Wait for message to be consumed
      const result = await messagePromise;
      
      // Verify the message was received correctly
      expect(result).toEqual({
        topic: 'test-topic',
        partition: 0,
        messageValue: { testData: 'test-value' },
      });
      
      // Disconnect producer and consumer
      await producer.disconnect();
      await consumer.disconnect();
    });
  });
});

