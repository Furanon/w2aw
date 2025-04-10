'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Calendar } from './Calendar';
import { MapView } from './MapView';
import FilterBar from './FilterBar';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useEventFilters } from './hooks/useEventFilters';
import { FilterState, DEFAULT_FILTER_STATE } from '@/types/filters';
import { KafkaService } from '@/lib/services/kafkaService';
import { KAFKA_TOPICS } from '@/lib/config/kafka';

// Component props
interface CalendarContainerProps {
  initialEvents?: any[];
  onEventSelect?: (event: any) => void;
  userPreferences?: Record<string, any>;
}

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      <p>Failed to load calendar data: {error.message}</p>
      <button onClick={resetErrorBoundary} className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
        Try again
      </button>
    </AlertDescription>
  </Alert>
);
const CalendarContainer: React.FC<CalendarContainerProps> = ({
  initialEvents = [],
  onEventSelect,
  userPreferences,
}) => {
  const { toast } = useToast();
  const { session } = useAuth();
  
  // Reference to track if component is mounted to prevent state updates after unmount
  const isMountedRef = React.useRef(true);
  
  // Initialize the event filters with default filter state
  const {
    filters,
    applyFilters,
    handleFilterChange,
    toggleTypeFilter,
    toggleLocationFilter,
    toggleInstructorFilter,
    togglePaidOnlyFilter,
    toggleFreeOnlyFilter,
    toggleJoinedOnlyFilter,
    toggleAvailableOnlyFilter,
    updatePriceRange,
    updateCapacityRange,
    updateTimeRange,
    togglePreferredDay,
    togglePaymentStatus,
    setVectorSearch,
    resetFilters,
    availableLocations,
  } = useEventFilters({
    initialFilters: DEFAULT_FILTER_STATE,
  });

  // Fetch and manage calendar events
  const {
    events,
    filteredEvents,
    loading,
    error,
    refresh,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    getEventStyling,
  } = useCalendarEvents(filters, session?.user?.id);

  // Map the calendar events to the format expected by Calendar component
  const calendarTimeSlots = useMemo(() => {
    return filteredEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      typeId: event.eventTypeId,
      location: event.location.name || 'Unknown',
      isPaid: event.price > 0,
      isTeacher: event.isCreator || false,
      isHighlyAcknowledged: event.isHighlyAcknowledged || false,
      userJoined: event.isJoined || false,
      description: event.description,
      price: event.price,
      capacity: event.capacity,
      currentParticipants: event.participants?.length || 0,
      instructorId: event.createdBy,
    }));
  }, [filteredEvents]);
  // Track events that are in the process of being joined
  const [joiningEvents, setJoiningEvents] = useState<Set<string>>(new Set());
  
  // Get Kafka service instance
  const kafkaService = useMemo(() => KafkaService.getInstance(), []);
  
  // Handle user joining an event
  // Define types for Kafka message handling
  interface CalendarEventMessage {
    type: string;
    data: {
      action: 'created' | 'updated' | 'deleted' | 'joined';
      eventId: string;
      userId?: string;
      payload: any;
    };
  }
  
  interface EventRegistrationResponse {
    success: boolean;
    message: string;
    registrationId?: string;
    requiresPayment?: boolean;
  }
  
  // Handle user joining an event with proper error handling and UI feedback
  const handleJoinEvent = useCallback(async (timeSlotId: string) => {
    // Check if already joining this event
    if (joiningEvents.has(timeSlotId)) {
      toast({
        title: "Already Processing",
        description: "Your request to join this event is already being processed.",
        variant: "default",
      });
      return;
    }
    
    // Check authentication
    if (!session?.user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to join events.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Mark this event as currently being joined
      setJoiningEvents(prev => new Set([...prev, timeSlotId]));
      
      // Get event details
      const event = getEventById(timeSlotId);
      if (!event) {
        throw new Error("Event not found");
      }
      
      // Check if event is at capacity
      if (event.capacity && event.participants?.length >= event.capacity) {
        throw new Error("This event is already at full capacity");
      }
      
      // Check if user has already joined
      if (event.isJoined) {
        toast({
          title: "Already Joined",
          description: "You have already joined this event.",
          variant: "default",
        });
        setJoiningEvents(prev => {
          const updated = new Set(prev);
          updated.delete(timeSlotId);
          return updated;
        });
        return;
      }
      
      // Display joining toast
      toast({
        title: "Joining Event",
        description: "Processing your request to join this event...",
      });
      
      // Make API call to join the event
      const response = await fetch('/api/calendar/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: timeSlotId,
          userId: session.user.id,
        }),
      });
      
      // Check response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join event');
      }
      
      const responseData: EventRegistrationResponse = await response.json();
      
      // Handle payment requirement if event is paid
      if (event.price > 0 && responseData.requiresPayment) {
        // Redirect to payment page if this event requires payment
        window.location.href = `/calendar/payment?eventId=${timeSlotId}&registrationId=${responseData.registrationId}`;
        return;
      }
      
      // Optimistically update the local event state
      const updatedEvent = {
        ...event,
        isJoined: true,
        participants: [...(event.participants || []), session.user.id],
      };
      
      // Update the event in cache or state
      updateEvent(updatedEvent);
      
      // Publish the join event to Kafka for real-time updates
      try {
        const joinMessage = kafkaService.createCalendarEventMessage(
          timeSlotId,
          'joined',
          {
            userId: session.user.id,
            joinedAt: new Date().toISOString(),
            eventDetails: {
              title: event.title,
              startTime: event.startTime,
              isPaid: event.price > 0,
            },
          },
          session.user.id
        );
        
        // Publish message asynchronously - don't await this to avoid blocking the UI
        kafkaService.publishMessage(KAFKA_TOPICS.CALENDAR_EVENTS, joinMessage)
          .catch(error => {
            console.error('Failed to publish join event to Kafka:', error);
            // Non-critical error, don't show to user
          });
      } catch (kafkaError) {
        console.error('Error creating Kafka message for join event:', kafkaError);
        // Non-critical, don't block UI or show error to user
      }
      
      // Show success toast
      toast({
        title: "Success!",
        description: `You have successfully joined "${event.title}"`,
        variant: "default",
      });
      
      // Refresh events to get the latest data
      refresh();
      
    } catch (error: any) { // Explicitly type error as 'any'
      console.error('Error joining event:', error);
      
      // Handle different types of errors
      let errorMessage = "Failed to join event. Please try again.";
      
      if (error.message === "Event not found") {
        errorMessage = "This event no longer exists or has been removed.";
      } else if (error.message === "This event is already at full capacity") {
        errorMessage = "Sorry, this event is now full. Please try another event.";
      } else if (error.message?.includes("network")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message?.includes("unauthorized") || error.message?.includes("authentication")) {
        errorMessage = "Your session has expired. Please sign in again to join events.";
      }
      
      // Show error toast
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Remove this event from the joining set
      setJoiningEvents(prev => {
        const updated = new Set(prev);
        updated.delete(timeSlotId);
        return updated;
      });
    }
  }, [joiningEvents, session, getEventById, toast, kafkaService, updateEvent, refresh]);
  // Refresh events on mount and handle cleanup
  useEffect(() => {
    refresh();
    
    // Set mounted ref for cleanup
    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);
  
  // Set up Kafka subscription for real-time updates
  useEffect(() => {
    // Don't set up subscription if no user is logged in
    if (!session?.user?.id) return;
    
    // Subscribe to relevant Kafka topics for real-time updates
    let unsubscribe: (() => Promise<void>) | null = null;
    
    const setupSubscription = async () => {
      try {
        // Subscribe to relevant topics
        unsubscribe = await kafkaService.subscribeToTopics(
          [KAFKA_TOPICS.CALENDAR_EVENTS, KAFKA_TOPICS.CALENDAR_UPDATES],
          handleKafkaMessage
        );
        console.log('Subscribed to Kafka calendar topics');
      } catch (error) {
        console.error('Failed to subscribe to Kafka topics:', error);
      }
    };
    
    setupSubscription();
    
    // Cleanup function to unsubscribe
    return () => {
      if (unsubscribe) {
        unsubscribe().catch(error => {
          console.error('Error unsubscribing from Kafka:', error);
        });
      }
    };
  }, [session?.user?.id]);
  
  // Handle Kafka messages for real-time updates
  const handleKafkaMessage = useCallback((message: CalendarEventMessage) => {
    // Skip if component unmounted
    if (!isMountedRef.current) return;
    
    console.log('Received Kafka message:', message);
    
    // Handle different types of messages
    if (message.type === 'CALENDAR_EVENTS') {
      const { action, eventId, userId, payload } = message.data;
      
      // Only process messages relevant to this user
      if (userId === session?.user?.id || action === 'created' || action === 'updated' || action === 'deleted') {
        refresh();
      }
      
      // Handle join confirmations specifically
      if (action === 'joined' && userId === session?.user?.id) {
        // Show confirmation toast if it's a join confirmation for this user
        toast({
          title: "Join Confirmed",
          description: `Your registration for ${payload?.eventDetails?.title || 'the event'} has been confirmed.`,
          variant: "default",
        });
      }
    }
  }, [session?.user?.id, refresh, toast]);
  // Main render
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={refresh}>
      <Container className="py-6">
        <div className="space-y-6">
          {/* Filter Bar */}
          <FilterBar 
            filters={filters}
            onFilterChange={handleFilterChange}
            onToggleType={toggleTypeFilter}
            onToggleLocation={toggleLocationFilter}
            onToggleInstructor={toggleInstructorFilter}
            onTogglePaid={togglePaidOnlyFilter}
            onToggleFree={toggleFreeOnlyFilter}
            onToggleJoined={toggleJoinedOnlyFilter}
            onToggleAvailable={toggleAvailableOnlyFilter}
            onUpdatePriceRange={updatePriceRange}
            onUpdateCapacityRange={updateCapacityRange}
            onUpdateTimeRange={updateTimeRange}
            onTogglePreferredDay={togglePreferredDay}
            onTogglePaymentStatus={togglePaymentStatus}
            onVectorSearch={setVectorSearch}
            onResetFilters={resetFilters}
            availableLocations={availableLocations}
          />
          
          {/* Loading State */}
          {loading && (
            <div className="flex justify-center p-6">
              <Spinner size="lg" />
            </div>
          )}
          
          {/* Error State */}
          {error && !loading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                <p>{error}</p>
                <button onClick={refresh} className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  Retry
                </button>
              </AlertDescription>
            </Alert>
                <h2 className="text-xl font-bold mb-4">Calendar</h2>
                <Calendar 
                  initialTimeSlots={calendarTimeSlots}
                  onTimeSlotCreated={createEvent}
                  onTimeSlotUpdated={updateEvent}
                  onTimeSlotDeleted={deleteEvent}
                  onUserJoinTimeSlot={handleJoinEvent}
                  onSelectEvent={handleCalendarEventSelect}
                  disabledJoinIds={Array.from(joiningEvents)} // Pass joining events for UI feedback
                />
              </Card>
              
              <Card className="p-4">
                <h2 className="text-xl font-bold mb-4">Map</h2>
                <MapView 
                  timeSlots={calendarTimeSlots}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onTimeSlotSelected={handleMapMarkerSelect}
                  onUserJoinTimeSlot={handleJoinEvent}
                  availableLocations={availableLocations}
                  disabledJoinIds={Array.from(joiningEvents)} // Pass joining events for UI feedback
                />
              </Card>
          )}
        </div>
      </Container>
    </ErrorBoundary>
  );
};

export default CalendarContainer;

