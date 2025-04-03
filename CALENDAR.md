# Circus School Calendar Application

## 1. Project Overview

The Circus School Calendar Application is a comprehensive web application built with Next.js and TypeScript that allows users to browse, create, and manage class schedules and events. The system features a visually appealing interface with a video background, integrated payment processing via Stripe, and real-time updates powered by Kafka message streaming.

### Core Features
- Interactive calendar display using React Big Calendar
- Event creation and management with support for recurring events
- User registration for classes with payment processing
- Real-time notifications and updates via Kafka
- Location-based filtering and mapping via Leaflet
- ONNX integration for event recommendations
- Comprehensive filtering system for various event types
- Support for seven event categories in filters.ts including the newly added Transport & Tours category
 (Arts & Crafts, Fitness, Education, Entertainment, Food & Drink, Business, Transport & Tours)

## 2. Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── calendar/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts           # Single event operations
│   │   │   ├── participants/
│   │   │   │   └── route.ts           # Participant registration
│   │   │   ├── payments/
│   │   │   │   └── route.ts           # Stripe payment integration
│   │   │   └── route.ts               # Calendar CRUD operations
│   │   └── kafka/
│   │       ├── consumers/
│   │       │   ├── calendar/
│   │       │   │   └── route.ts       # Calendar event consumer
│   │       │   └── health.ts          # Consumer health monitoring
│   ├── calendar/
│   │   └── page.tsx                   # Main calendar page
│   └── globals.css                    # Global styles
├── components/
│   ├── calendar/
│   │   ├── Calendar.tsx               # Main calendar component
│   │   ├── TimeSlotModal.tsx          # Event creation/editing modal
│   │   └── VideoBackground.tsx        # Video background component
│   ├── Header.tsx                     # Application header
│   └── Providers.tsx                  # Context providers wrapper
├── db/
│   └── schema.ts                      # Database schema (incl. calendar tables)
├── lib/
│   ├── config/
│   │   └── kafka.ts                   # Kafka configuration
│   ├── kafka/
│   │   ├── producers/
│   │   │   └── calendar.ts            # Calendar event producer
│   │   └── kafka.ts                   # Kafka client implementation
│   └── utils/
│       └── onnxIntegration.ts         # ONNX utility functions
└── types/
    └── calendar.ts                    # Calendar type definitions
```

## 3. Implementation Details

### Database Schema
The calendar system uses the following tables in the PostgreSQL database:

1. **calendar_events**
   - Primary event data including title, description, start/end times
   - Location reference, instructor information, and capacity limits
   - Payment information and recurring event patterns

2. **event_participants**
   - User registrations for events
   - Payment status and registration timestamps
   - Attendance tracking

3. **locations**
   - Venue information for events
   - Address and geographical coordinates
   - Capacity and facility details

### API Routes
The calendar API provides the following endpoints:

1. **GET /api/calendar**
   - Retrieve all events with optional filtering
   - Pagination support
   - Event type and date range filtering

2. **POST /api/calendar**
   - Create new events
   - Support for single or recurring events
   - Publishes to Kafka for real-time updates

3. **GET /api/calendar/[id]**
   - Retrieve a specific event by ID
   - Includes participant information

4. **PATCH /api/calendar/[id]**
   - Update event details
   - Option to update single or all recurring instances
   - Publishes updates to Kafka

5. **DELETE /api/calendar/[id]**
   - Remove events
   - Option to delete single or all recurring instances
   - Notifies registered participants via Kafka

6. **POST /api/calendar/participants**
   - Register users for events
   - Initiates payment process if required
   - Publishes registration to Kafka

7. **DELETE /api/calendar/participants**
   - Remove user registration
   - Handles refund process if applicable
   - Publishes cancellation to Kafka

8. **POST /api/calendar/payments**
   - Process payments with Stripe
   - Confirm registrations upon payment
   - Updates event capacity and user status

### Components

The calendar system has been restructured to improve separation of concerns with the following component organization:

```
components/calendar/
├── CalendarContainer.tsx    (main container)
├── Calendar.tsx            (calendar-specific logic)
├── MapView.tsx            (map-specific logic)
├── FilterBar.tsx          (filtering UI)
└── hooks/
    ├── useCalendarEvents.ts (event management)
    └── useEventFilters.ts   (filtering logic)
```

1. **VideoBackground.tsx**
   - Full-screen video background with blur overlay
   - Responsive design with mobile fallbacks
   - Configurable opacity and blur intensity

2. **Calendar.tsx**
   - React Big Calendar integration
   - Event color coding by type
   - Interactive event creation and editing
   - Focused on calendar-specific rendering and interactions

3. **CalendarContainer.tsx**
   - Main container component that coordinates Calendar and MapView
   - Manages shared filter state between views
   - Handles filter updates and event filtering
   - Provides filtered events to child components

4. **MapView.tsx**
   - Leaflet map integration with event locations
   - Location-based visualization of events
   - Interactive markers for event selection
   - Map-specific filtering and view controls

5. **FilterBar.tsx** 
   - Comprehensive filtering UI for all event types
   - Integrates with useEventFilters hook
   - Support for all filter categories including the new Transport & Tours
   - Advanced filtering options (price, capacity, time, etc.)

6. **page.tsx**
   - Main calendar page layout
   - Component composition
   - SEO optimization
   - Authentication integration

## 4. Kafka Integration

The calendar system is fully integrated with Kafka for real-time event processing and notifications. The implementation includes:

### Kafka Topics
- **CALENDAR_EVENTS**: Main topic for event CRUD operations
  - Partitioned by event type for optimized throughput
  - Used for creating, updating, and deleting calendar events
  - Contains full event payloads with metadata
  - Consumed by calendar API and notification services

- **CALENDAR_NOTIFICATIONS**: User notifications about events
  - Contains user-targeted messages for upcoming events, changes, and cancellations
  - Includes notification priority and delivery channel preferences
  - Consumed by email service, push notification service, and in-app notification display

- **CALENDAR_PARTICIPANT_EVENTS**: Registration and attendance tracking
  - Records user registrations, cancellations, and attendance
  - Used for capacity management and waitlist processing
  - Contains payment status updates and confirmation data

- **CALENDAR_UPDATES**: Real-time updates for UI clients
  - Lightweight messages optimized for WebSocket delivery
  - Contains only changed fields for efficient bandwidth usage
  - Consumed by client-side WebSocket connections for live updates

- **CALENDAR_DLQ**: Dead letter queue for failed messages
  - Stores messages that failed processing after retry attempts
  - Includes original message, error details, and timestamp
  - Used by monitoring systems and recovery processes

### Message Types and Schemas

#### Event Messages
```typescript
interface CalendarEventMessage {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  eventId: string;
  userId: string; // Creator or modifier
  timestamp: string;
  data: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: {
      id: string;
      name: string;
      coordinates?: [number, number]; // Lat/Long
    };
    eventType: EventType;
    capacity: number;
    price?: number;
    instructorId?: string;
    isRecurring: boolean;
    recurringPattern?: {
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      interval: number;
      endDate?: string;
      daysOfWeek?: number[];
    };
    specificCriteria?: EventSpecificCriteria;
  };
  metadata: {
    clientId: string;
    correlationId: string;
    version: string;
  };
}
```

#### Participant Messages
```typescript
interface ParticipantEventMessage {
  type: 'REGISTER' | 'UNREGISTER' | 'WAITLIST' | 'CONFIRM' | 'ATTEND';
  eventId: string;
  userId: string;
  timestamp: string;
  data: {
    registrationId?: string;
    paymentStatus?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    paymentId?: string;
    notes?: string;
    waitlistPosition?: number;
  };
  metadata: {
    clientId: string;
    correlationId: string;
    version: string;
  };
}
```

#### Notification Messages
```typescript
interface NotificationMessage {
  type: 'EVENT_REMINDER' | 'EVENT_CHANGED' | 'EVENT_CANCELLED' | 'REGISTRATION_CONFIRMED' | 'PAYMENT_RECEIVED' | 'WAITLIST_POSITION_CHANGED';
  eventId: string;
  userId: string;
  timestamp: string;
  data: {
    title: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    deliveryChannels: ('EMAIL' | 'PUSH' | 'IN_APP')[];
    actionUrl?: string;
    imageUrl?: string;
  };
  metadata: {
    clientId: string;
    correlationId: string;
    version: string;
  };
}
```

### Producer Implementation
The `CalendarProducer` in `src/lib/kafka/producers/calendar.ts` handles publishing messages to Kafka with the following features:

- **Singleton pattern** for efficient resource usage
- **Message validation** against schemas with TypeScript and runtime validation
- **Transaction support** for atomic operations across multiple topics
- **Retry logic** with exponential backoff for temporary failures
- **Message enrichment** with standard metadata (clientId, correlationId, timestamp)
- **Batching optimization** for high-throughput operations (mass updates)
- **Compression** for efficient network usage with large event payloads
- **Headers** for message filtering and routing without deserializing the payload

Implementation examples:

```typescript
// Publishing an event creation message
await calendarProducer.publishEventMessage({
  type: 'CREATE',
  eventId: newEvent.id,
  userId: currentUser.id,
  timestamp: new Date().toISOString(),
  data: eventData,
  metadata: {
    clientId: 'calendar-web-app',
    correlationId: requestId,
    version: '1.0'
  }
});

// Publishing a batch of participant registrations
await calendarProducer.publishParticipantBatch(
  registrations.map(reg => ({
    type: 'REGISTER',
    eventId: reg.eventId,
    userId: reg.userId,
    timestamp: new Date().toISOString(),
    data: {
      registrationId: reg.id,
      paymentStatus: reg.paymentStatus
    },
    metadata: {/* metadata */}
  }))
);
```

### Consumer Implementation
The `CalendarConsumer` in `src/app/api/kafka/consumers/calendar/route.ts` processes incoming messages with:

- **Type-based handlers** for different message categories
- **Database transaction management** for consistent state updates
- **Concurrent processing** of non-conflicting events
- **Ordered processing** guarantees for messages with the same eventId
- **Idempotent operations** to handle potential duplicate messages
- **Dead letter queue** forwarding for failed messages
- **Consumer lag monitoring** for system health checks

Implementation details:

```typescript
// Message handler registry
const messageHandlers = {
  'CREATE': handleEventCreation,
  'UPDATE': handleEventUpdate,
  'DELETE': handleEventDeletion,
  'REGISTER': handleParticipantRegistration,
  'UNREGISTER': handleParticipantCancellation,
  // Additional handlers...
};

// Sample handler implementation
async function handleEventUpdate(message: CalendarEventMessage): Promise<void> {
  // Extract message data
  const { eventId, data, metadata } = message;
  
  // Start database transaction
  const transaction = await db.transaction();
  
  try {
    // Get existing event
    const existingEvent = await db.calendar_events.findUnique({
      where: { id: eventId },
      transaction
    });
    
    if (!existingEvent) {
      throw new Error(`Event ${eventId} not found for update`);
    }
    
    // Update event
    const updatedEvent = await db.calendar_events.update({
      where: { id: eventId },
      data: transformKafkaMessageToDbFormat(data),
      transaction
    });
    
    // Update related records if needed
    if (data.capacity !== existingEvent.capacity) {
      await updateWaitlistPositions(eventId, data.capacity, transaction);
    }
    
    // Commit transaction
    await transaction.commit();
    
    // Publish notifications if needed
    if (shouldNotifyParticipants(existingEvent, data)) {
      await notifyParticipantsAboutUpdate(eventId, data);
    }
    
    // Log successful processing
    logger.info(`Event ${eventId} updated successfully`, { correlationId: metadata.correlationId });
  } catch (error) {
    // Rollback transaction
    await transaction.rollback();
    
    // Handle error (throw for DLQ or retry)
    logger.error(`Failed to update event ${eventId}`, { error, correlationId: metadata.correlationId });
    throw error;
  }
}
```

### Health Monitoring
The calendar consumer health is monitored through the `/api/kafka/consumers/health` endpoint, which provides:

- **Consumer lag metrics** by topic and partition
- **Message processing rates** and throughput statistics
- **Error rates** and types for diagnostic purposes
- **Rebalance events** tracking for partition assignment changes
- **DLQ volume** monitoring with error categorization
- **Consumer instance status** (active, rebalancing, stopped)

Health check implementation:

```typescript
// Health check endpoint
export async function GET(): Promise<Response> {
  try {
    const health = await calendarConsumerManager.getHealth();
    
    // Determine overall health status
    const status = determineHealthStatus(health);
    
    // Return health data
    return new Response(JSON.stringify({
      status,
      timestamp: new Date().toISOString(),
      consumers: {
        calendar: {
          lag: health.lag,
          throughput: health.throughput,
          errorRate: health.errorRate,
          dlqVolume: health.dlqVolume,
          partitions: health.partitions.map(p => ({
            partition: p.id,
            lag: p.lag,
            lastProcessed: p.lastProcessed
          }))
        }
      }
    }), {
      status: status === 'HEALTHY' ? 200 : 503,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### Error Handling and DLQ Process
The calendar system implements a robust error handling strategy for Kafka messages:

1. **Retry Mechanism**:
   - Transient errors (network, database timeouts) are retried automatically
   - Configurable retry count and backoff periods in kafka.ts config
   - Separate handling for different error categories

2. **Error Classification**:
   - **Transient errors**: Temporary issues that can be resolved with retries
   - **Data validation errors**: Issues with message format or content
   - **Business logic errors**: Valid messages that violate business rules
   - **Fatal errors**: Unrecoverable system issues

3. **Dead Letter Queue (DLQ) Processing**:
   - Failed messages are published to CALENDAR_DLQ after retry exhaustion
   - Original message is preserved with error details and timestamps
   - Administrative UI for viewing and managing DLQ messages
   - Manual reprocessing capability for fixed issues

4. **Recovery Workflows**:
   - Automated periodic retry of certain DLQ message categories
   - Notification to administrators for critical failures
   - Reconciliation process for resolving data inconsistencies
   - Transaction isolation to prevent partial updates

5. **Error Reporting**:
   - Structured error logs with correlation IDs
   - Error aggregation in monitoring dashboard
   - Alerting based on error volume and patterns
   - Performance impact analysis of error handling

Implementation example for DLQ handling:

```typescript
// Send message to DLQ
async function sendToDLQ(
  originalMessage: KafkaMessage, 
  error: Error, 
  retryCount: number
): Promise<void> {
  await dlqProducer.send({
    topic: KAFKA_TOPICS.CALENDAR_DLQ,
    messages: [{
      key: originalMessage.key,
      value: JSON.stringify({
        originalMessage: JSON.parse(originalMessage.value.toString()),
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code || 'UNKNOWN'
        },
        metadata: {
          retryCount,
          timestamp: new Date().toISOString(),
          originalTopic: originalMessage.topic,
          originalPartition: originalMessage.partition,
          originalOffset: originalMessage.offset
        }
      }),
      headers: {
        'error-type': error.name || 'Unknown',
        'retry-count': retryCount.toString(),
        'original-topic': originalMessage.topic
      }
    }]
  });
  
  // Log DLQ event
  logger.warn(`Message sent to DLQ: ${error.message}`, {
    topic: originalMessage.topic,
    partition: originalMessage.partition,
    offset: originalMessage.offset,
    key: originalMessage.key?.toString()
  });
}
```

### Integration Points
1. **API Routes**: All calendar API endpoints publish events to Kafka
2. **Real-time Updates**: Client-side updates via WebSockets using Kafka messages
3. **Notifications**: Email and in-app notifications triggered by Kafka events
4. **Health Monitoring**: Calendar consumer health is tracked in the monitoring system
5. **Analytics Pipeline**: Event data is fed to analytics systems for reporting
6. **External Systems**: Integration with third-party calendars through Kafka connectors

## 5. Configuration

### Kafka Configuration
The Kafka configuration in `src/lib/config/kafka.ts` includes:

```typescript
// Calendar-specific Kafka configuration
CALENDAR_EVENTS: "calendar-events",
CALENDAR_NOTIFICATIONS: "calendar-notifications",
CALENDAR_UPDATES: "calendar-updates",
CALENDAR_DLQ: "calendar-dlq",

// Consumer group for calendar processing
CONSUMER_GROUPS: {
  // Existing consumer groups
  CALENDAR: "calendar-processor"
},

// Consumer configuration
CONSUMER_CONFIG: {
  // Existing configurations
  CALENDAR: {
    groupId: CONSUMER_GROUPS.CALENDAR,
    maxWaitTimeInMs: 300,
    maxBatchSize: 100,
    retry: {
      maxRetries: 3,
      initialRetryTimeInMs: 1000,
    }
  }
}
```

### Environment Variables
The application requires the following environment variables:

```
# Kafka Configuration
KAFKA_BROKERS=broker1:9092,broker2:9092
KAFKA_CLIENT_ID=circus-calendar
KAFKA_USERNAME=kafka-user
KAFKA_PASSWORD=kafka-password

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/circus_calendar
```

## 6. Critical Verification Points

To ensure the calendar system functions correctly, verify these critical points:

1. **Event Creation Flow**
   - Create an event via the UI
   - Verify database record creation
   - Confirm Kafka message is published to CALENDAR_EVENTS topic
   - Check for consumer processing and confirmation

2. **Registration Process**
   - Register for an event as a user
   - Verify participant record in database
   - Check payment flow for paid events
   - Confirm notification delivery

3. **Kafka Integration**
   - Monitor consumer health endpoint at `/api/kafka/consumers/health`
   - Check DLQ for any failed messages
   - Verify message processing metrics
   - Test consumer restart and recovery

4. **Payment Processing**
   - Complete a test payment with Stripe test cards
   - Verify webhook processing
   - Check registration status updates
   - Test refund processing

5. **Recurring Events**
   - Create recurring event series
   - Modify one instance and verify single update
   - Modify series and verify all instances update
   - Delete instance and series to test both flows

## 7. Next Steps

1. **Additional Features**
   - Implement waiting list functionality
   - Add instructor availability checking
   - Integrate calendar export (iCal/Google Calendar)
   - Implement event sharing via social media

2. **Performance Improvements**
   - Add caching layer for frequently accessed events
   - Implement infinite scrolling for large calendars
   - Optimize Kafka message batching
   - Add database query optimizations

3. **User Experience Enhancements**
   - Implement drag-and-drop rescheduling
   - Add custom event visualization options
   - Improve mobile responsiveness
   - Integrate with notification preferences

4. **Integration Expansions**
   - Add Google Calendar/Outlook synchronization
   - Implement SMS notifications
   - Integrate with additional payment providers
   - Connect with external booking systems

## 8. Testing Guidelines

### Unit Tests
Create unit tests for:
- Calendar component rendering
- TimeSlotModal form validation
- Kafka message formatting
- API route handlers

Example test pattern:
```typescript
describe('Calendar Component', () => {
  it('should render events correctly', async () => {
    // Test implementation
  });
  
  it('should filter events by type', async () => {
    // Test implementation
  });
});
```

### Integration Tests
Verify the following integration points:
- Database operations with the calendar schema
- Kafka producer and consumer interaction
- Stripe payment flow
- Authentication integration

### End-to-End Tests
Test complete user flows:
- Event creation to notification
- Registration and payment
- Event modification and updates
- Cancellation and refunds

### Performance Testing
Measure and optimize:
- Calendar rendering with large event sets
- Kafka throughput for high-volume updates
|- API response times under load
|- Database query performance

## 9. Implementation Status and Remaining Tasks

### Completed Features

1. **Core Infrastructure**
   - ✅ Database schema for events (`src/db/schema.ts`)
   - ✅ API routes for CRUD operations (`src/app/api/calendar/`)
   - ✅ Kafka integration for event streaming (`src/lib/kafka/producers/calendar.ts`)
   - ✅ Authentication framework integration (`src/components/Providers.tsx`)
   - ✅ Kafka topics creation (CALENDAR_EVENTS, CALENDAR_NOTIFICATIONS, CALENDAR_UPDATES, CALENDAR_DLQ)

2. **Calendar Components**
   - ✅ Calendar visualization (`src/components/calendar/Calendar.tsx`)
   - ✅ Time slot management (`src/components/calendar/TimeSlotModal.tsx`)
   - ✅ Video background (`src/components/calendar/VideoBackground.tsx`)
   - ✅ Main calendar page (`src/app/calendar/page.tsx`)

3. **Backend Services**
   - ✅ Kafka producers and consumers for calendar events
   - ✅ Payment processing skeleton with Stripe
   - ✅ Event participant management

### Remaining Tasks

1. **High Priority**
   - ❌ ONNX model integration for event recommendations
   - ✅ Leaflet map integration with MapView component
   - ❌ Complete Stripe payment flow and webhook handling
   - ✅ FilterBar implementation for event types with comprehensive category support
   - ✅ Support for Transport & Tours category in filters.ts

2. **Medium Priority**
   - ❌ Recurring event modification (update series vs. single instance)
   - ❌ Comprehensive error handling throughout the application
   - ❌ User notifications system (email, in-app)
   - ❌ Client-side state management for registration status

3. **Low Priority**
   - ❌ UI animations and interactive feedback
   - ❌ Export functionality (iCal, Google Calendar)
   - ❌ Social sharing features
   - ❌ Additional event visualization options

### ONNX Integration TODOs

1. **Event Classification**
   - Add ONNX model for classifying events based on description and attributes
   - Implement in `src/lib/utils/onnxIntegration.ts`
   - Connect to event creation flow in TimeSlotModal

2. **Personalized Recommendations**
   - Implement user preference tracking
   - Create recommendation model endpoint
   - Add UI for displaying recommendations on calendar page

3. **Optimal Scheduling**
   - Develop model for suggesting optimal class times
   - Integrate with instructor availability
   - Add scheduling assistant to TimeSlotModal

4. **Implementation Steps**
   ```typescript
   // In src/lib/utils/onnxIntegration.ts
   
   import * as ort from 'onnxruntime-web';
   
   export async function classifyEvent(eventData: EventData): Promise<EventType> {
     // Load the ONNX model
     const session = await ort.InferenceSession.create('/models/event-classifier.onnx');
     
     // Preprocess the event data
     const inputTensor = preprocessEventData(eventData);
     
     // Run inference
     const outputMap = await session.run({ input: inputTensor });
     const output = outputMap.output.data;
     
     // Process the result
     return processOutput(output);
   }
   
   export async function getPersonalizedRecommendations(userId: string): Promise<Event[]> {
     // TODO: Implement recommendation logic
     return [];
   }
   ```

### Updated Next Steps

Based on the implementation status, the revised next steps are:

1. **Test Calendar Maps Implementation**
   - Test the Leaflet integration with event locations
   - Verify map marker interaction with calendar events
   - Implement location-based filtering
   - Optimize map performance with large event sets

2. **Implement Calendar Event Handlers**
   - Develop event handlers for Kafka topics
   - Implement real-time updates for calendar UI
   - Create transaction management for event operations
   - Add error handling with retry mechanisms

## 10. Filter System Implementation

The calendar application implements
   - Implement notification consumer for CALENDAR_NOTIFICATIONS topic
   - Create email and in-app notification delivery system
   - Add user notification preferences
   - Test notification delivery and tracking

4. **Complete ONNX Integration**
   - Finalize the onnxIntegration.ts utility functions
   - Add model files to the public directory
   - Test inference with sample event data
   - Connect to relevant UI components

5. **Completed: Leaflet Map Integration**
   - ✅ Created MapView component under components/calendar
   - ✅ Added geolocation support
   - ✅ Connected event locations to map markers
   - ✅ Implemented filtering by location and distance
   - ❌ Optimize map performance with large datasets

6. **Finalize Stripe Payment System**
   - Complete the checkout session creation
   - Implement webhook handlers for payment events
   - Add payment status tracking in the UI
   - Test the complete payment flow with test cards

7. **Enhance Testing Coverage**
   - Add unit tests for all components
   - Create integration tests for Kafka messaging
   - Add end-to-end tests for critical user flows
   - Implement performance benchmarks

