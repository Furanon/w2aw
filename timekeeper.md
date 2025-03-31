# TimeKeeper - Interactive Calendar System

## Project Overview and Goals

TimeKeeper is an interactive, visually stunning calendar web application designed for a circus school. The system enables students and instructors to manage course schedules, book time slots, process payments, and view event locations.

### Primary Goals
- Create an engaging, interactive calendar interface with React Big Calendar
- Implement full-screen video background with overlay for visual appeal
- Enable time slot creation, booking, and management for courses
- Support payment processing via Stripe for paid courses
- Integrate location-based features with Leaflet maps
- Provide powerful filtering capabilities for different event types
- Ensure responsive design with Tailwind CSS
- Leverage ONNX for intelligent event classification and recommendations
- Align with existing Kafka-based data streaming architecture

## Technical Stack and Dependencies

### Core Framework and Language
- Next.js with TypeScript
- Tailwind CSS for styling

### Key Dependencies
- React Big Calendar: Calendar display and interaction
- Leaflet: Maps integration for location-based features
- NextAuth: User authentication and session management
- Stripe: Payment processing integration
- onnxruntime-web: Machine learning model integration
- tsparticles: Enhanced UI animations

### Configuration Files
- vercel.json: Deployment configuration for Vercel
- vite.config.ts: Vite configuration for development
- wrangler.toml: Cloudflare Workers configuration
- tsconfig.json: TypeScript compiler options
- tailwind.config.js: Tailwind CSS customization

## Integration Points with Existing Infrastructure

### Directory Structure Integration
- Components will be organized within the existing `/src/components` directory
- Page routes will follow the established patterns in `/src/app`
- Styles will maintain consistency with the current Tailwind implementation

### Authentication Integration
- Leverage existing NextAuth implementation for user authentication
- Maintain consistent session management across the application

### Data Flow
- Integrate with existing React Context providers for state management
- Ensure calendar events align with current data models and database schema
- Follow established patterns for API routes and server-side operations

### UI/UX Consistency
- Match existing UI components (Cards, Containers, etc.) from `/src/components/ui`
- Maintain responsive design principles already established
- Follow existing error handling and loading state patterns

### Kafka Integration
- Ensure event creation/modification publishes to appropriate Kafka topics
- Subscribe to relevant Kafka topics for real-time updates to calendar events
- Follow existing patterns for message serialization and handling

## Planned File Structure

```
/src
  /app
    /calendar          // Calendar page routes
      /page.tsx        // Main calendar view page
      /create/page.tsx // Time slot creation page
      /[id]/page.tsx   // Individual event view
      
  /components
    /calendar
      /CalendarView.tsx      // Main calendar component using React Big Calendar
      /TimeSlotModal.tsx     // Modal for creating/editing time slots
      /VideoBackground.tsx   // Full-screen video background with overlay
      /CalendarFilters.tsx   // Filter component for event categories
      /EventCard.tsx         // Component for displaying event details
      /MapIntegration.tsx    // Leaflet maps integration
      
    /providers
      /CalendarProvider.tsx  // Context provider for calendar state
      
  /lib
    /calendar
      /types.ts             // TypeScript interfaces for calendar events
      /utils.ts             // Utility functions for calendar operations
      /api.ts               // API client functions for calendar CRUD operations
      /onnx-integration.ts  // ONNX integration for event classification
```

## Implementation Considerations

### CalendarView Component
- Implements React Big Calendar with custom event rendering
- Handles different view types (month, week, day, agenda)
- Supports drag-and-drop for event scheduling
- Includes visual indicators for event types and statuses
- Integrates with filter system for displaying filtered events

### TimeSlotModal Component
- Provides form for creating and editing time slots
- Handles validation of date/time ranges and required fields
- Supports recurrence patterns for repeating events
- Includes location selection integrated with map
- Manages event categorization with type selection

### VideoBackground Component
- Implements full-screen video playback with optimized performance
- Provides configurable overlay with blur effects
- Ensures accessibility and fallbacks for different devices
- Handles responsive behavior across screen sizes

### CalendarFilters Component
- Extends existing FilterBar.tsx pattern for consistency
- Provides category filtering (6 event types as specified)
- Includes search functionality for events
- Supports date range filtering
- Maintains filter state in URL parameters for sharing

### Payment Integration
- Redirects to Stripe checkout for paid events
- Handles successful payment callbacks
- Updates event registration status after payment
- Provides confirmation and receipt information

### Maps Integration
- Displays event locations on Leaflet map
- Shows user's current location (with permission)
- Allows filtering of map markers based on calendar filters
- Provides location selection for event creation

## ONNX Integration and Kafka Framework Alignment

### ONNX Integration
- Implement utility functions in `/src/lib/calendar/onnx-integration.ts`
- Use ONNX for:
  - Event categorization based on title and description
  - Time slot recommendation based on user preferences
  - Intelligent grouping suggestions for related events
  - Attendance prediction for capacity planning
- Ensure models are lightweight for client-side execution
- Provide fallbacks when ONNX execution fails

### Kafka Framework Alignment
- Follow existing Kafka producer/consumer patterns
- Create calendar-specific topics for:
  - Event creation/modification events
  - Registration/booking events
  - Payment status updates
  - Capacity/availability changes
- Ensure proper error handling and retries for Kafka operations
- Maintain consistency with existing serialization formats
- Implement idempotent event processing to prevent duplicates

### Performance Considerations
- Implement pagination and virtualization for calendar with many events
- Optimize ONNX model execution with caching
- Use Kafka batching for high-frequency updates
- Ensure responsive UI even during data processing operations
- Implement proper loading states and optimistic UI updates

