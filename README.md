# Calendar Maps Application

## Project Overview

This project is a comprehensive calendar application with integrated map functionality, allowing users to discover, join, and manage events based on location and preferences. The system features a sophisticated preference engine that enables personalized recommendations based on user likes, social data, and interaction patterns.

Key capabilities include:
- Interactive calendar with map-based event discovery
- User preference system for courses, businesses, people, and locations
- ML-powered recommendation engine with ONNX Runtime and FAISS integration
- Real-time notifications via Kafka messaging
- Proximity-based event discovery
- Social login integration with preference extraction

## Architecture

The application follows a modern web architecture:

- **Frontend**: Next.js application with React components
- **Backend**: Next.js API routes for server-side operations
- **Database**: PostgreSQL with vector extensions (pgvector)
- **Message Broker**: Kafka for event streaming and notifications
- **ML Components**: ONNX Runtime for on-device learning, FAISS for similarity search
- **Authentication**: NextAuth with social provider integration
- **Maps**: Leaflet integration with OpenStreetMap tiles

### Component Diagram

```
┌─────────────┐       ┌──────────────┐       ┌────────────────┐
│  Next.js UI │──────▶│  API Routes  │──────▶│  Service Layer │
└─────────────┘       └──────────────┘       └────────────────┘
      │                      │                       │
      │                      │                       │
      ▼                      ▼                       ▼
┌─────────────┐       ┌──────────────┐       ┌────────────────┐
│   Leaflet   │       │  NextAuth    │       │ Kafka Producers│
└─────────────┘       └──────────────┘       └────────────────┘
                             │                       │
                             │                       │
                             ▼                       ▼
                      ┌──────────────┐       ┌────────────────┐
                      │ PostgreSQL DB│◀──────│ Kafka Consumers│
                      └──────────────┘       └────────────────┘
                             │                       │
                             │                       │
                             ▼                       ▼
                      ┌──────────────┐       ┌────────────────┐
                      │ONNX/FAISS ML │       │Notification Svc│
                      └──────────────┘       └────────────────┘
```

## Features & Capabilities

### Calendar Management
- Event creation, editing, and management
- Recurring event support with flexible patterns
- Capacity management and booking system
- Participant tracking and registration

### Map Integration
- Location-based event discovery
- Interactive map with event markers
- Custom color coding by event type
- Marker clustering for dense areas
- Event filtering by type, location, and status

### Preference System
- Course/event preferences
- Business venue preferences
- Instructor/person preferences
- Location preferences
- Social data integration (Facebook/Google)
- Privacy controls for preference data

### Recommendation Engine
- ML-powered personalized recommendations
- Similarity-based suggestions using FAISS
- Time pattern recognition
- Location clustering
- Instructor preference matching
- On-device learning with ONNX Runtime

### Notification System
- Real-time updates via Kafka
- In-app notifications
- Email notifications
- Preference-based alert configuration
- Weekly digest of recommendations

## Database Schema

The database is structured around several key entities:

### Authentication & Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  image VARCHAR(255),
  emailVerified TIMESTAMP WITH TIME ZONE
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255),
  provider VARCHAR(255),
  providerAccountId VARCHAR(255),
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  sessionToken VARCHAR(255) UNIQUE,
  userId UUID REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE
);
```

### Events & Locations
```sql
CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  location_id INTEGER REFERENCES locations(id),
  listing_id INTEGER NOT NULL,
  instructor_id UUID REFERENCES users(id),
  instructor_notes TEXT,
  recurring_pattern JSONB,
  recurring_series_id UUID,
  is_recurring BOOLEAN DEFAULT false,
  is_cancelled BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  min_participants INTEGER DEFAULT 1,
  max_participants INTEGER,
  payment_required BOOLEAN DEFAULT false,
  payment_amount DECIMAL(10, 2),
  payment_currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  capacity INTEGER NOT NULL,
  amenities TEXT[],
  photos TEXT[],
  opening_hours JSONB,
  facility_type VARCHAR(100),
  available_equipment TEXT[],
  accessibility_features TEXT[],
  contact_info JSONB,
  booking_requirements TEXT,
  cancellation_policy TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Preferences & Recommendations
```sql
CREATE TABLE user_course_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  source_event_id INTEGER REFERENCES calendar_events(id),
  instructor_id UUID REFERENCES users(id),
  preferred_time_start TIME,
  preferred_time_end TIME,
  preferred_days INTEGER[],
  location_id INTEGER REFERENCES locations(id),
  activity_type VARCHAR(255),
  max_price NUMERIC,
  social_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_event_unique UNIQUE (user_id, source_event_id)
);

CREATE TABLE user_business_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  business_id INTEGER NOT NULL,
  business_type VARCHAR(255),
  rating INTEGER,
  pricing_preference JSONB,
  preferred_services TEXT[],
  notes TEXT,
  social_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_business_unique UNIQUE (user_id, business_id)
);

CREATE TABLE user_person_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  person_id UUID REFERENCES users(id),
  expertise_preferences TEXT[],
  teaching_style_preferences TEXT[],
  rating INTEGER,
  notes TEXT,
  social_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_person_unique UNIQUE (user_id, person_id)
);

CREATE TABLE user_location_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  max_distance NUMERIC,
  preferred_transport_methods TEXT[],
  accessibility_requirements TEXT[],
  amenity_preferences TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_location_unique UNIQUE (user_id, location_id)
);

CREATE TABLE preference_features (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  feature_vector vector(1024),
  feature_metadata JSONB,
  training_data JSONB,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_features_unique UNIQUE (user_id)
);

CREATE TABLE course_recommendations (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_id INTEGER REFERENCES calendar_events(id),
  score FLOAT,
  similarity_score FLOAT,
  recommendation_reason JSONB,
  recommendation_type VARCHAR(50),
  notified BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_event_rec_unique UNIQUE (user_id, event_id)
);
```

### Participation & Payments
```sql
CREATE TABLE event_participants (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id INTEGER NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  registration_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_id INTEGER REFERENCES calendar_events(id),
  status booking_status NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  status payment_status NOT NULL DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method payment_method,
  payment_intent_id VARCHAR(255),
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);
```

### Notifications
```sql
CREATE TABLE calendar_notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id INTEGER,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT false,
  metadata JSONB,
  recommendation_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT calendar_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT calendar_notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE SET NULL
);

CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  in_app_notifications BOOLEAN DEFAULT true,
  notification_types TEXT[] DEFAULT ARRAY['event_reminder', 'booking_confirmation', 'payment_confirmation', 'event_update', 'event_cancellation'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Core Components

### Service Layer

The service layer manages business logic and data operations:

- `PreferenceService`: Base service for preference management
- `CoursePreferenceService`: Handles course/event preferences
- `BusinessPreferenceService`: Manages business venue preferences
- `PersonPreferenceService`: Handles instructor/user preferences
- `LocationPreferenceService`: Manages location and proximity preferences

### Kafka Integration

Kafka is used for real-time event processing:

- `PreferenceProducer`: Publishes preference events
- `NotificationConsumer`: Processes preference events and creates notifications
- `RecommendationConsumer`: Generates recommendations based on preferences

### API Routes

The application exposes several API endpoints:

- `/api/preferences`: Manage user preferences
- `/api/calendar`: Calendar event operations
- `/api/maps`: Map-related functionality
- `/api/recommendations`: Access personalized recommendations
- `/api/notifications`: Manage user notifications

### ML Components

Machine learning is used for personalized recommendations:

- Feature extraction for preferences
- ONNX Runtime for on-device learning
- FAISS for similarity-based recommendations
- Vector embeddings for semantic search

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Kafka cluster
- ONNX Runtime

### Environment Variables
```
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_USERNAME=your-kafka-username
KAFKA_PASSWORD=your-kafka-password

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

### Installation Steps
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations: `npx tsx src/lib/migrations/apply-migrations.ts`
5. Start the development server: `npm run dev`

## Integration Points

### Social Login Integration
The application integrates with Google and Facebook for authentication and preference extraction. User interests from social profiles are used to enhance recommendation quality.

### Kafka Integration
Kafka is used for:
- Preference event streaming
- Real-time notifications
- System event logging
- Recommendation processing

### PostgreSQL with pgvector
Vector storage enables:
- Similarity-based recommendations
- Semantic search
- Feature storage for ML models

## Development Guidelines

### Adding New Preference Types
1. Add table to database schema
2. Create service extending BasePreferenceService
3. Add Kafka producer events
4. Create API endpoints
5. Add UI components

### Enhancing Recommendations
1. Update feature extraction in PreferenceService
2. Modify recommendation generation in RecommendationService
3. Update ONNX model inputs/outputs
4. Add new recommendation types to the UI

### Testing
- Unit tests for services and API routes
- Integration tests for Kafka producers/consumers
- End-to-end tests for preference flow

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
