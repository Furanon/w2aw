import { describe, test, expect, vi, beforeEach } from "vitest";
import { 
  KafkaClient,
  KafkaProducer,
  KafkaConsumer,
  KafkaTopics
} from "../../src/lib/kafka";
import { KafkaMessage } from "kafkajs";

vi.mock("../../src/lib/config/kafka", () => ({
  KAFKA_CONFIG: {
    CLIENT_ID: "test-client",
    BROKERS: ["localhost:9092"],
    SSL: false,
    SASL: undefined,
  },
  KAFKA_TOPICS: {
    TEST: "test-topic",
    CALENDAR_EVENTS: "calendar-events",
    CALENDAR_UPDATES: "calendar-updates",
    CALENDAR_NOTIFICATIONS: "calendar-notifications",
    CALENDAR_DLQ: "calendar-dlq",
  },
  KafkaTopics: {
    TEST: "test-topic",
    CALENDAR_EVENTS: "calendar-events",
    CALENDAR_UPDATES: "calendar-updates",
    CALENDAR_NOTIFICATIONS: "calendar-notifications",
    CALENDAR_DLQ: "calendar-dlq",
  }
}));

vi.mock("kafkajs", () => {
  return {
    Kafka: vi.fn().mockImplementation((config) => {
      const mockConsumer = {
        connect: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockResolvedValue(undefined),
        run: vi.fn().mockImplementation(async ({ eachMessage }) => {
          mockConsumer.eachMessageHandler = eachMessage;
          return Promise.resolve();
        }),
        disconnect: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        events: {},
        eachMessageHandler: null as any,
        simulateMessage: (topic: string, message: any, partition = 0) => {
          if (mockConsumer.eachMessageHandler) {
            return mockConsumer.eachMessageHandler({
              topic,
              partition,
              message: {
                value: typeof message === "string" ? Buffer.from(message) : Buffer.from(JSON.stringify(message)),
                key: Buffer.from("test-key"),
                timestamp: Date.now().toString(),
                size: 0,
                attributes: 0,
                offset: "0",
              },
            });
          }
        }
      };

      const mockProducer = {
        connect: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue({
          topicName: "test-topic",
          partition: 0,
          errorCode: 0,
        }),
        disconnect: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        events: {},
      };

      return {
        producer: vi.fn().mockReturnValue(mockProducer),
        consumer: vi.fn().mockImplementation(() => mockConsumer),
        admin: vi.fn(),
      };
    })
  };
});

vi.mock("../../src/lib/kafka", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/kafka")>("../../src/lib/kafka");
  return {
    ...actual,
    KafkaClient: {
      getInstance: vi.fn().mockReturnValue(new (await import("kafkajs")).Kafka({
        clientId: "test-client",
        brokers: ["localhost:9092"],
        ssl: false,
      })),
    },
  };
});

describe("Kafka Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    
    // Reset singleton instances
    // @ts-ignore - accessing private property for testing
    KafkaClient.instance = undefined;
    // @ts-ignore - accessing private property for testing
    KafkaProducer.instance = undefined;
    // @ts-ignore - accessing private property for testing
    KafkaProducer.isConnected = false;
  });

  test("initializes Kafka client with correct configuration", () => {
    const kafka = KafkaClient.getInstance();
    expect(kafka).toBeDefined();
    const { Kafka } = require("kafkajs");
    expect(Kafka).toHaveBeenCalledWith({
      clientId: "test-client",
      brokers: ["localhost:9092"],
      ssl: false,
      sasl: undefined,
    });

    const kafkaAgain = KafkaClient.getInstance();
    expect(kafkaAgain).toBe(kafka);
    expect(Kafka).toHaveBeenCalledTimes(1);
  });

  test("creates producer successfully", async () => {
    const producer = await KafkaProducer.getInstance();
    expect(producer).toBeDefined();
    const { Kafka } = require("kafkajs");
    const mockKafka = Kafka.mock.results[0].value;
    expect(mockKafka.producer().connect).toHaveBeenCalled();

    const producerAgain = await KafkaProducer.getInstance();
    expect(producerAgain).toBe(producer);
    expect(mockKafka.producer().connect).toHaveBeenCalledTimes(1);
  });

  test("produces message successfully", async () => {
    const message = { type: "test", data: { foo: "bar" } };
    const producer = await KafkaProducer.getInstance();

    await producer.send({
      topic: "test-topic",
      messages: [{ value: JSON.stringify(message) }],
    });

    const { Kafka } = require("kafkajs");
    const mockKafka = Kafka.mock.results[0].value;
    expect(mockKafka.producer().send).toHaveBeenCalledWith({
      topic: "test-topic",
      messages: [{ value: JSON.stringify(message) }],
    });
    expect(mockKafka.producer().send).toHaveBeenCalledTimes(1);
  });

  test("creates consumer with correct group ID", async () => {
    const groupId = "test-group";
    const topics = ["test-topic"];
    const consumer = new KafkaConsumer(groupId, topics);

    expect(consumer).toBeDefined();
    const { Kafka } = require("kafkajs");
    const mockKafka = Kafka.mock.results[0].value;
    expect(mockKafka.consumer).toHaveBeenCalledWith({ groupId });

    expect(consumer).toHaveProperty("connect");
    expect(consumer).toHaveProperty("disconnect");
    expect(consumer).toHaveProperty("onMessage");
    expect(consumer).toHaveProperty("start");
  });

  test("subscribes and processes messages correctly", async () => {
    const mockHandler = vi.fn().mockResolvedValue(undefined);
    const topic = "test-topic";
    const groupId = "test-group";

    const consumer = new KafkaConsumer(groupId, [topic]);
    consumer.onMessage(topic, mockHandler);
    await consumer.start();

    const { Kafka } = require("kafkajs");
    const mockKafka = Kafka.mock.results[0].value;
    const mockKafkaConsumer = mockKafka.consumer();

    expect(mockKafkaConsumer.connect).toHaveBeenCalled();
    expect(mockKafkaConsumer.subscribe).toHaveBeenCalledWith({ topic });
    expect(mockKafkaConsumer.run).toHaveBeenCalled();

    const messageValue = { event: "test-event", data: { id: "123" } };
    await mockKafkaConsumer.simulateMessage(topic, messageValue);

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
      topic,
      message: expect.objectContaining({
        value: expect.any(Buffer)
      })
    }));

    const calledWithMessage = mockHandler.mock.calls[0][0].message.value;
    expect(JSON.parse(calledWithMessage.toString())).toEqual(messageValue);
  });

  test("handles message production failure", async () => {
    const { Kafka } = require("kafkajs");
    const mockKafka = Kafka.mock.results[0].value;
    mockKafka.producer().send.mockRejectedValueOnce(new Error("Send failed"));

    const producer = await KafkaProducer.getInstance();
    await expect(
      producer.send({
        topic: "test-topic",
        messages: [{ value: JSON.stringify({ type: "test" }) }],
      })
    ).rejects.toThrow("Send failed");
  });

  test("disconnects producer successfully", async () => {
    await KafkaProducer.disconnect();
    const { Kafka } = require("kafkajs");
    const mockKafka = Kafka.mock.results[0].value;
    expect(mockKafka.producer().disconnect).toHaveBeenCalled();
  });

  test("consumer can be disconnected", async () => {
    const consumer = new KafkaConsumer("test-group", ["test-topic"]);
    await consumer.connect();
    await consumer.disconnect();
    
    const { Kafka } = require("kafkajs");
    const mockKafka = Kafka.mock.results[0].value;
    expect(mockKafka.consumer().disconnect).toHaveBeenCalled();
  });
});
