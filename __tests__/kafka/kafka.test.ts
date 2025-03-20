import { describe, test, expect, vi, beforeEach } from 'vitest';
import { 
  initKafkaClient, 
  createProducer, 
  produceMessage, 
  createConsumer,
  consumeMessages 
} from '../../lib/kafka';
import { KafkaMessage } from 'kafkajs';

// Mock KafkaJS
vi.mock('kafkajs', () => {
  const mockDisconnect = vi.fn();
  const mockSend = vi.fn().mockResolvedValue({});
  const mockConnect = vi.fn();
  const mockSubscribe = vi.fn();
  const mockRun = vi.fn();
  
  return {
    Kafka: vi.fn().mockImplementation((config) => ({
      producer: vi.fn().mockReturnValue({
        connect: mockConnect,
        send: mockSend,
        disconnect: mockDisconnect,
      }),
      consumer: vi.fn().mockReturnValue({
        connect: mockConnect,
        subscribe: mockSubscribe,
        run: mockRun,
        disconnect: mockDisconnect,
      }),
    })),
  };
});

describe('Kafka Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KAFKA_BROKERS = 'localhost:9092';
    process.env.KAFKA_CLIENT_ID = 'test-client';
  });

  test('initializes Kafka client with correct configuration', () => {
    const kafka = initKafkaClient();
    expect(kafka).toBeDefined();
    const { Kafka } = require('kafkajs');
    expect(Kafka).toHaveBeenCalledWith({
      clientId: 'test-client',
      brokers: ['localhost:9092'],
      ssl: false,
      sasl: undefined,
    });
  });

  test('creates producer successfully', async () => {
    const producer = await createProducer();
    expect(producer).toBeDefined();
    const { Kafka } = require('kafkajs');
    const mockProducer = Kafka().producer();
    expect(mockProducer.connect).toHaveBeenCalled();
  });

  test('produces message successfully', async () => {
    const message = { type: 'test', data: { foo: 'bar' } };
    const result = await produceMessage('test-topic', message);
    
    expect(result).toBe(true);
    const { Kafka } = require('kafkajs');
    const mockProducer = Kafka().producer();
    expect(mockProducer.send).toHaveBeenCalledWith({
      topic: 'test-topic',
      messages: [{ value: JSON.stringify(message) }],
    });
  });

  test('creates consumer with correct group ID', async () => {
    const groupId = 'test-group';
    const consumer = await createConsumer(groupId);
    
    expect(consumer).toBeDefined();
    const { Kafka } = require('kafkajs');
    expect(Kafka().consumer).toHaveBeenCalledWith({ groupId });
  });

  test('subscribes and processes messages correctly', async () => {
    const mockHandler = vi.fn();
    const topic = 'test-topic';
    const groupId = 'test-group';
    
    const consumer = await consumeMessages(topic, mockHandler, groupId);
    
    const { Kafka } = require('kafkajs');
    const mockConsumer = Kafka().consumer();
    expect(mockConsumer.subscribe).toHaveBeenCalledWith({
      topic,
      fromBeginning: false,
    });
    expect(mockConsumer.run).toHaveBeenCalled();
    expect(consumer).toHaveProperty('disconnect');
    expect(consumer).toHaveProperty('pause');
    expect(consumer).toHaveProperty('resume');
  });

  test('handles message production failure', async () => {
    const { Kafka } = require('kafkajs');
    const mockProducer = Kafka().producer();
    mockProducer.send.mockRejectedValueOnce(new Error('Send failed'));

    await expect(
      produceMessage('test-topic', { type: 'test' })
    ).rejects.toThrow('Send failed');
  });
});
