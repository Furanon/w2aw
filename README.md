# Real-Time Notifications System with Kafka

This document outlines the implementation of a real-time notifications system using Kafka for event streaming in our Next.js application.

## Overview

Our application uses Kafka as a message broker to implement real-time notifications across the platform. When certain events occur (such as new listing creation), a message is published to a Kafka topic. Consumers listen to these topics and process the messages to create notifications for users.

### Architecture

```
┌─────────────┐     ┌─────────┐     ┌───────────┐     ┌──────────────┐
│ Application │────►│  Kafka  │────►│ Consumer  │────►│ Notifications │
│  (Producer) │     │ Broker  │     │ Service   │     │  Database    │
└─────────────┘     └─────────┘     └───────────┘     └──────────────┘
                                          │
                                          ▼
                                    ┌──────────────┐
                                    │  API Routes  │
                                    │ (Fetch/Mark) │
                                    └──────────────┘
                                          │
                                          ▼
                                    ┌──────────────┐
                                    │     UI       │
                                    │ Components   │
                                    └──────────────┘
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- Access to a Kafka broker (self-hosted or cloud service)
- PostgreSQL database (Neon)

### Installation

1. Install required packages:

```bash
npm install kafkajs pg
```

2. Set up environment variables in your `.env.local` file:

```
# Kafka Configuration
KAFKA_BROKERS=your-kafka-broker:9092
KAFKA_CLIENT_ID=your-app-client-id
KAFKA_USERNAME=your-kafka-username (if applicable)
KAFKA_PASSWORD=your-kafka-password (if applicable)

# Database Configuration
DATABASE_URL=your-neon-postgres-connection-string
```

3. Run database migrations to create the notifications table:

```bash
node scripts/run-migrations.js
```

## Configuration Details

### Kafka Client

We use `kafkajs` to interact with Kafka. The client configuration is in `lib/kafka.js`:

```javascript
// Sample Kafka client setup
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: process.env.KAFKA_BROKERS.split(','),
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

export default kafka;
```

### Producer Setup

Messages are produced when certain events occur, like creating a new listing:

```javascript
// Sample producer usage
import { producer } from '../lib/kafka';

// In your API route handler
await producer.connect();
await producer.send({
  topic: 'new-listing',
  messages: [
    { 
      value: JSON.stringify({
        listingId: newListing.id,
        title: newListing.title,
        userId: newListing.userId
      }) 
    },
  ],
});
await producer.disconnect();
```

### Consumer Setup

A Kafka consumer service runs in the background to process messages:

```javascript
// Sample consumer setup
import { consumer } from '../lib/kafka';
import { pool } from '../lib/db';

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'new-listing', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const notification = JSON.parse(message.value.toString());
      
      // Store notification in database
      await pool.query(
        'INSERT INTO notifications(user_id, message, listing_id, read_status) VALUES($1, $2, $3, $4)',
        [notification.userId, `New listing created: ${notification.title}`, notification.listingId, false]
      );
    },
  });
};

runConsumer().catch(console.error);
```

### Database Schema

The notifications table schema:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  listing_id INTEGER,
  read_status BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_status ON notifications(read_status);
```

## Testing the System

### Manual Testing

1. Run the Kafka consumer service:

```bash
node app/api/kafka-consumer.js
```

2. Send a test message:

```bash
node scripts/test-kafka-message.js
```

3. Check the notifications in the UI or via API endpoint:

```
GET /api/notifications
```

### Automated Testing

We've included unit tests for the notification system:

```bash
npm test -- --testPathPattern=notifications
```

## Troubleshooting

### Common Issues

1. **Connection refused to Kafka broker**
   - Check broker address and port
   - Verify network connectivity and firewall settings

2. **Authentication failure**
   - Verify SASL credentials
   - Check SSL configuration

3. **Messages not appearing**
   - Confirm consumer is running
   - Check topic name consistency
   - Verify database connection

### Logs

Kafka-related logs are available in:
- Application logs
- Kafka broker logs
- Consumer service logs

## Performance Considerations

- The consumer service is designed to handle high message throughput
- Database operations are optimized with proper indexing
- Consider implementing batching for high-volume scenarios

## Security

- All Kafka connections use SSL encryption
- Authentication is enforced with SASL
- API endpoints for notifications are protected with NextAuth
- Database queries are parameterized to prevent SQL injection

## Roadmap

- Implement WebSocket for real-time UI updates without polling
- Add support for notification categories and preferences
- Implement message delivery guarantees with Kafka transactions

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
