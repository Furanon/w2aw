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

1. **VideoBackground.tsx**
   - Full-screen video background with blur overlay
   - Responsive design with mobile fallbacks
   - Configurable opacity and blur intensity

2. **Calendar.tsx**
   - React Big Calendar integration
   - Event color coding by type
   - Interactive event creation and editing
   - Filter bar implementation

3. **TimeSlotModal.tsx**
   - Form for creating and editing events
   - Recurring event pattern selection
   - Location selection
   - Price setting for paid events

4. **page.tsx**
   - Main calendar page layout
   - Component composition
   - SEO optimization
   - Authentication integration

## 4. Kafka Integration

The calendar system is fully integrated with Kafka for real-time event processing and notifications. The implementation includes:

### Kafka Topics
- **CALENDAR_EVENTS**: Main topic for event CRUD operations
- **CALENDAR_NOTIFICATIONS**: User notifications about events
- **CALENDAR_UPDATES**: Real-time updates for UI clients
- **CALENDAR_DLQ**: Dead letter queue for failed messages

### Producer Implementation
The `CalendarProducer` in `src/lib/kafka/producers/calendar.ts` handles publishing messages to Kafka with the following features:
- Singleton pattern for efficient resource usage
- Comprehensive error handling with retries
- Transaction support for atomic operations
- Message schema validation
- Support for different event types (CREATE, UPDATE, DELETE, etc.)

### Consumer Implementation
The `CalendarConsumer` in `src/app/api/kafka/consumers/calendar/route.ts` processes incoming messages with:
- Message type-based handling
- Database integration for persistent storage
- Error handling with DLQ support
- Health monitoring integration
- Transaction management

### Message Schema
```typescript
interface CalendarMessage {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'REGISTER' | 'UNREGISTER';
  eventId: string;
  userId: string;
  timestamp: string;
  data: any; // Event-specific data payload
}
```

### Integration Points
1. **API Routes**: All calendar API endpoints publish events to Kafka
2. **Real-time Updates**: Client-side updates via WebSockets using Kafka messages
3. **Notifications**: Email and in-app notifications triggered by Kafka events
4. **Health Monitoring**: Calendar consumer health is tracked in the monitoring system

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
   - ❌ Leaflet map integration below calendar
   - ❌ Complete Stripe payment flow and webhook handling
   - ❌ FilterBar implementation for event types

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

3. **Setup Notification Consumers**
   - Implement notification consumer for CALENDAR_NOTIFICATIONS topic
   - Create email and in-app notification delivery system
   - Add user notification preferences
   - Test notification delivery and tracking

4. **Complete ONNX Integration**
   - Finalize the onnxIntegration.ts utility functions
   - Add model files to the public directory
   - Test inference with sample event data
   - Connect to relevant UI components

5. **Implement Leaflet Map Integration**
   - Create MapView component under src/components/calendar
   - Add geolocation support
   - Connect event locations to map markers
   - Implement filtering by location and distance

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

