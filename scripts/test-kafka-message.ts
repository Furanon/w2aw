import { Kafka, logLevel, Admin } from 'kafkajs';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { promisify } from 'util';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Function to check if Docker is running
const isDockerRunning = async (): Promise<boolean> => {
  try {
    const exec = promisify(child_process.exec);
    await exec('docker info');
    return true;
  } catch (error) {
    return false;
  }
};

// Function to check if any Kafka container is running
const isKafkaRunning = async (): Promise<boolean> => {
  try {
    const exec = promisify(child_process.exec);
    const { stdout } = await exec('docker ps');
    return stdout.toLowerCase().includes('kafka');
  } catch (error) {
    return false;
  }
};

// Function to check if Kafka port is accessible
const isKafkaPortAccessible = async (host: string, port: number): Promise<boolean> => {
  const net = await import('net');
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000; // 1 second timeout
    
    socket.setTimeout(timeout);
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.connect(port, host);
  });
};

// Validate required environment variables
const requiredEnvVars = ['KAFKA_BROKERS', 'KAFKA_CLIENT_ID', 'KAFKA_TOPIC'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please check your .env.local file');
  process.exit(1);
}

// Parse Kafka configuration from environment variables
const brokers = (process.env.KAFKA_BROKERS || '').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'default-client';
const topic = process.env.KAFKA_TOPIC || 'test-topic';
const ssl = process.env.KAFKA_SSL === 'true';

// SASL configuration if enabled
const sasl = process.env.KAFKA_SASL_ENABLED === 'true'
  ? {
      mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
      username: process.env.KAFKA_SASL_USERNAME || '',
      password: process.env.KAFKA_SASL_PASSWORD || '',
    }
  : undefined;

// Parse broker host and port for connection testing
let brokerHost = 'localhost';
let brokerPort = 9092;

if (brokers.length > 0 && brokers[0].includes(':')) {
  const parts = brokers[0].split(':');
  brokerHost = parts[0];
  brokerPort = parseInt(parts[1], 10);
}

// Create Kafka client with connection timeout
const kafka = new Kafka({
  clientId,
  brokers,
  ssl,
  sasl,
  connectionTimeout: 10000, // 10 seconds
  logLevel: logLevel.INFO,
});

// Create producer
const producer = kafka.producer();
const admin = kafka.admin();

// Test Kafka connection with timeout
const testKafkaConnection = async (timeoutMs = 10000): Promise<boolean> => {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      console.error(`Connection attempt timed out after ${timeoutMs}ms`);
      resolve(false);
    }, timeoutMs);
    
    try {
      await admin.connect();
      const clusterInfo = await admin.describeCluster();
      clearTimeout(timeout);
      await admin.disconnect();
      resolve(true);
    } catch (error) {
      clearTimeout(timeout);
      resolve(false);
    }
  });
};

// Function to simulate sending a message (for fallback when Kafka is unavailable)
const simulateSendMessage = async () => {
  console.log('SIMULATION MODE: Kafka broker is not available');
  console.log('Simulating a successful message send to topic:', topic);
  
  const mockMessage = {
    key: 'test-key',
    value: JSON.stringify({
      message: 'Hello from KafkaJS producer! (SIMULATED)',
      timestamp: new Date().toISOString(),
    }),
  };
  
  console.log('Message that would be sent:', mockMessage);
  console.log('SIMULATION COMPLETE');
  return { simulate: true, message: mockMessage };
};

// Function to send an actual test message
const sendRealMessage = async () => {
  try {
    // Connect to the Kafka broker
    await producer.connect();
    console.log('Connected to Kafka broker');

    // Send a test message
    const messageResult = await producer.send({
      topic,
      messages: [
        {
          key: 'test-key',
          value: JSON.stringify({
            message: 'Hello from KafkaJS producer!',
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    console.log('Message sent successfully', messageResult);
    return { success: true, result: messageResult };
  } finally {
    // Disconnect the producer
    await producer.disconnect();
    console.log('Disconnected from Kafka broker');
  }
};

// Main function to run the test
const sendTestMessage = async () => {
  console.log('Starting Kafka connection test...');
  console.log(`Using brokers: ${brokers.join(', ')}`);
  
  try {
    // Step 1: Check if Docker is running
    const dockerRunning = await isDockerRunning();
    if (!dockerRunning) {
      console.error('ERROR: Docker is not running!');
      console.error('Please start Docker and try again');
      console.log('Attempting to simulate message sending instead...');
      return await simulateSendMessage();
    }
    
    // Step 2: Check if Kafka container is running
    const kafkaRunning = await isKafkaRunning();
    if (!kafkaRunning) {
      console.error('ERROR: No Kafka container appears to be running');
      console.error('Please start your Kafka container and try again');
      console.log('Attempting to simulate message sending instead...');
      return await simulateSendMessage();
    }
    
    // Step 3: Check if Kafka port is accessible
    const portAccessible = await isKafkaPortAccessible(brokerHost, brokerPort);
    if (!portAccessible) {
      console.error(`ERROR: Kafka broker port ${brokerPort} on ${brokerHost} is not accessible`);
      console.error('Make sure Kafka is properly configured and listening on the specified port');
      console.log('Attempting to simulate message sending instead...');
      return await simulateSendMessage();
    }
    
    // Step 4: Test Kafka connection
    console.log('Testing Kafka connection...');
    const connectionSuccessful = await testKafkaConnection();
    
    if (!connectionSuccessful) {
      console.error('ERROR: Failed to connect to Kafka cluster');
      console.error('Kafka might be running but not accepting connections.');
      console.error('Check broker configuration, network settings, and authentication details.');
      console.log('Attempting to simulate message sending instead...');
      return await simulateSendMessage();
    }
    
    // Step 5: Send real message
    console.log('Kafka connection successful. Sending actual message...');
    return await sendRealMessage();
  } catch (error) {
    console.error('Unexpected error during Kafka messaging test:', error);
    return { error };
  }
};

// Execute the function
sendTestMessage().catch((error) => {
  console.error('Failed to send test message:', error);
  process.exit(1);
});
