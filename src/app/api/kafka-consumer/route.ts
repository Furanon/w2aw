import { KafkaConsumer, KAFKA_TOPICS, KAFKA_CONSUMER_GROUPS } from '../../../lib/kafka';
import { query } from '../../../lib/db';
import { NextResponse } from 'next/server';

// Interface for listing data
interface ListingData {
  listingId: string;
  title: string;
  userId: string;
  description: string;
}

// Function to store notification in database
async function storeNotification(listingData: ListingData) {
  try {
    const { listingId, title, userId } = listingData;
    const message = `New listing created: ${title}`;
    
    const queryText = `
      INSERT INTO notifications (user_id, message, listing_id, read_status, created_at, updated_at)
      VALUES ($1, $2, $3, false, NOW(), NOW())
      RETURNING id;
    `;
    
    const values = [userId, message, listingId];
    const result = await query(queryText, values);
    
    console.log(`Notification stored with ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error storing notification:', error);
    throw error;
  }
}

// Kafka message handler
async function handleNewListingMessage(message: {
  value: Buffer;
  key?: string;
  timestamp?: string;
  headers?: Record<string, string>;
}) {
  try {
    // Parse the message value
    const listingData = JSON.parse(message.value.toString());
    console.log('Received new listing notification:', listingData);
    
    // Store notification in database
    await storeNotification(listingData);
  } catch (error) {
    console.error('Error handling Kafka message:', error);
  }
}

// Start the Kafka consumer when the server starts
let consumerRunning = false;
let kafkaConsumer: KafkaConsumer | null = null;

export async function startKafkaConsumer() {
  if (consumerRunning) {
    console.log('Kafka consumer is already running');
    return;
  }
  
  try {
    console.log(`Starting Kafka consumer for ${KAFKA_TOPICS.MARKETPLACE_JOBS} topic`);
    consumerRunning = true;
    
    // Create a new KafkaConsumer instance
    kafkaConsumer = new KafkaConsumer(
      KAFKA_CONSUMER_GROUPS.MARKETPLACE,
      [KAFKA_TOPICS.MARKETPLACE_JOBS]
    );
    
    // Register message handler for the topic
    kafkaConsumer.onMessage(
      KAFKA_TOPICS.MARKETPLACE_JOBS, 
      async ({ message }) => {
        await handleNewListingMessage(message);
      }
    );
    
    // Start the consumer
    await kafkaConsumer.start();
  } catch (error) {
    consumerRunning = false;
    console.error('Error starting Kafka consumer:', error);
  }
}

// API route for manually starting the consumer (for testing/admin purposes)
export async function GET(request: Request) {
  try {
    await startKafkaConsumer();
    return NextResponse.json({ success: true, message: 'Kafka consumer started' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to start Kafka consumer', error: error.message },
      { status: 500 }
    );
  }
}

// Initialize consumer when the module is loaded
if (process.env.NODE_ENV === 'production') {
  startKafkaConsumer().catch(error => {
    console.error('Failed to start Kafka consumer on initialization:', error);
  });
}
