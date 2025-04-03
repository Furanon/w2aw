'use client';

import React, { useEffect, useMemo } from 'react';
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

  // Handle event selection from calendar
  const handleCalendarEventSelect = (timeSlot) => {
    const selectedEvent = getEventById(timeSlot.id);
    if (selectedEvent && onEventSelect) {
      onEventSelect(selectedEvent);
    }
  };

  // Handle event selection from map
  const handleMapMarkerSelect = (timeSlot) => {
    const selectedEvent = getEventById(timeSlot.id);
    if (selectedEvent && onEventSelect) {
      onEventSelect(selectedEvent);
    }
  };

  // Handle user joining an event
  const handleJoinEvent = async (timeSlotId) => {
    try {
      // We need to implement this functionality
      toast({
        title: "Joining Event",
        description: "This functionality is not yet implemented.",
      });
    } catch (error) {
      console.error('Error joining event:', error);
      toast({
        title: "Error",
        description: "Failed to join event. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Refresh events on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

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
          )}
          
          {/* Calendar and Map View Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="p-4 xl:col-span-2">
                <h2 className="text-xl font-bold mb-4">Calendar</h2>
                <Calendar 
                  initialTimeSlots={calendarTimeSlots}
                  onTimeSlotCreated={createEvent}
                  onTimeSlotUpdated={updateEvent}
                  onTimeSlotDeleted={deleteEvent}
                  onUserJoinTimeSlot={handleJoinEvent}
                  onSelectEvent={handleCalendarEventSelect}
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
                />
              </Card>
            </div>
          )}
        </div>
      </Container>
    </ErrorBoundary>
  );
};

export default CalendarContainer;

