import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar } from './Calendar';
import { MapView } from './MapView';
import FilterBar from './FilterBar';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCcw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; 
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarEvent, Location as DbLocation } from '@/db/schema';
import { FilterState, DEFAULT_FILTER_STATE, EVENT_TYPES } from '@/types/filters';
import { ErrorBoundary } from 'react-error-boundary';
import { useEventListener } from '@/hooks/useEventListener';
import { useAuth } from '@/hooks/useAuth';

// Kafka message types
interface CalendarMessage {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'REGISTER' | 'UNREGISTER' | 'PAYMENT' | 'REMINDER';
  eventId: string;
  userId?: string;
  timestamp: string;
  data: any;
}

// Mapped event type for component usage
interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: {
    id: string;
    name: string;
    address: string;
    coordinates: [number, number];
  };
  type: number; // Event type id
  isPaid: boolean;
  price?: number;
  isTeacher?: boolean;
  userJoined?: boolean;
  instructorId?: string;
  isHighlyAcknowledged?: boolean;
}

// Component props
interface CalendarAndMapViewProps {
  initialEvents?: Event[];
  onEventSelect?: (event: Event) => void;
  userPreferences?: Record<string, any>;
}

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      <p>Failed to load calendar data: {error.message}</p>
      <Button onClick={resetErrorBoundary} className="mt-2">Try again</Button>
    </AlertDescription>
  </Alert>
);

export const CalendarAndMapView: React.FC<CalendarAndMapViewProps> = ({
  initialEvents = [],
  onEventSelect,
  userPreferences,
}) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const eventSource = useRef<EventSource | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isKafkaConnected, setIsKafkaConnected] = useState<boolean>(false);
  
  // Shared state for events and locations
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(initialEvents);
  const [locations, setLocations] = useState<DbLocation[]>([]);
  
  // Shared filter state
  const [filterState, setFilterState] = useState<FilterState>({
    typeIds: EVENT_TYPES.map(type => type.id),
    locations: [],
    showPaidOnly: false,
    showFreeOnly: false,
    showJoinedOnly: false,
    vectorSearch: '',
  });

  // Selected event/marker state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Search results state
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  
  // Track update timestamps for optimistic UI
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());

  // Connect to Kafka stream for real-time updates
  useEffect(() => {
    if (!session) return;
    
    const connectKafkaStream = () => {
      try {
        // Close any existing connection
        if (eventSource.current) {
          eventSource.current.close();
        }
  
        // Connect to SSE endpoint that proxies Kafka events
        const sse = new EventSource('/api/kafka/consumers/calendar/stream');
        
        sse.onopen = () => {
          setIsKafkaConnected(true);
          console.log('Connected to calendar events stream');
        };
        
        sse.onerror = (err) => {
          console.error('Calendar event stream error:', err);
          setIsKafkaConnected(false);
          // Attempt to reconnect after a short delay
          setTimeout(() => {
            sse.close();
            connectKafkaStream();
          }, 5000);
        };
        
        sse.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as CalendarMessage;
            handleKafkaMessage(message);
          } catch (err) {
            console.error('Error parsing Kafka message:', err);
          }
        };
        
        eventSource.current = sse;
        
        // Cleanup function
        return () => {
          sse.close();
          setIsKafkaConnected(false);
        };
      } catch (err) {
        console.error('Failed to connect to Kafka stream:', err);
        setIsKafkaConnected(false);
      }
    };
    
    connectKafkaStream();
    
    // Cleanup on component unmount
    return () => {
      if (eventSource.current) {
        eventSource.current.close();
      }
    };
  }, [session]);
  
  // Fetch calendar events from API
  const fetchEvents = useCallback(async (filters?: Partial<FilterState>) => {
    if (!session) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters from filters
      const params = new URLSearchParams();
      
      if (filters?.typeIds?.length) {
        params.append('type', filters.typeIds.join(','));
      }
      
      if (filters?.vectorSearch) {
        params.append('query', filters.vectorSearch);
      }
      
      // Add date range parameters if needed
      const now = new Date();
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(now.getDate() + 30);
      
      params.append('start_date', now.toISOString());
      params.append('end_date', thirtyDaysLater.toISOString());
      
      // Make API request
      const response = await fetch(`/api/calendar?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Map API response to component event format
      const mappedEvents: Event[] = data.events.map((event: CalendarEvent) => ({
        id: event.id.toString(),
        title: event.title,
        description: event.description || undefined,
        startDate: event.start.toString(),
        endDate: event.end.toString(),
        location: event.location ? {
          id: event.location.id.toString(),
          name: event.location.name,
          address: event.location.address,
          coordinates: event.location.coordinates,
        } : undefined,
        type: EVENT_TYPES.findIndex(t => t.name === event.type) + 1,
        isPaid: event.isPaid,
        price: event.price ? parseFloat(event.price.toString()) : undefined,
        isTeacher: event.instructorId?.toString() === session?.user?.id,
        userJoined: event.participants?.some(p => p.userId.toString() === session?.user?.id) || false,
        instructorId: event.instructorId?.toString(),
        isHighlyAcknowledged: event.isHighlyAcknowledged,
      }));
      
      setEvents(mappedEvents);
      setLastUpdate(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching events'));
      toast({
        title: "Error",
        description: "Failed to load calendar events. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, toast]);

  // Fetch locations data from API
  const fetchLocations = useCallback(async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/locations');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.statusText}`);
      }
      
      const data = await response.json();
      setLocations(data.locations);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      toast({
        title: "Warning",
        description: "Failed to load location data. Map view may be limited.",
        variant: "destructive",
      });
    }
  }, [session, toast]);

  // Handle Kafka real-time messages
  const handleKafkaMessage = useCallback((message: CalendarMessage) => {
    try {
      console.log('Received Kafka message:', message);
      
      switch (message.type) {
        case 'CREATE':
          // Add the new event to state
          const newEvent = mapKafkaDataToEvent(message.data);
          setEvents(prev => [...prev, newEvent]);
          
          // Update search results if applicable
          if (filterState.vectorSearch && newEvent.title.toLowerCase().includes(filterState.vectorSearch.toLowerCase())) {
            setSearchResults(prev => [...prev, newEvent]);
          }
          
          toast({
            title: "New Event",
            description: `${newEvent.title} has been added to the calendar`,
          });
          break;
          
        case 'UPDATE':
          // Update the event in state
          const updatedEvent = mapKafkaDataToEvent(message.data);
          setEvents(prev => prev.map(event => 
            event.id === message.eventId ? updatedEvent : event
          ));
          
          // Update search results if applicable
          if (filterState.vectorSearch) {
            setSearchResults(prev => prev.map(event => 
              event.id === message.eventId ? updatedEvent : event
            ));
          }
          
          toast({
            title: "Event Updated",
            description: `${updatedEvent.title} has been updated`,
          });
          break;
          
        case 'DELETE':
          // Remove the event from state
          setEvents(prev => prev.filter(event => event.id !== message.eventId));
          
          // Remove from search results if applicable
          if (filterState.vectorSearch) {
            setSearchResults(prev => prev.filter(event => event.id !== message.eventId));
          }
          
          toast({
            title: "Event Removed",
            description: "The event has been removed from the calendar",
          });
          break;
          
        case 'REGISTER':
          // Update user joined status for this event
          if (message.userId === session?.user?.id) {
            setEvents(prev => prev.map(event => {
              if (event.id === message.eventId) {
                return { ...event, userJoined: true };
              }
              return event;
            }));
            
            toast({
              title: "Successfully Registered",
              description: "You have been registered for this event",
            });
          }
          break;
          
        case 'UNREGISTER':
          // Update user joined status for this event
          if (message.userId === session?.user?.id) {
            setEvents(prev => prev.map(event => {
              if (event.id === message.eventId) {
                return { ...event, userJoined: false };
              }
              return event;
            }));
            
            toast({
              title: "Registration Cancelled",
              description: "Your registration for this event has been cancelled",
            });
          }
          break;
          
        case 'PAYMENT':
          // Payment status update notification
          if (message.userId === session?.user?.id) {
            toast({
              title: "Payment Processed",
              description: "Your payment has been processed successfully",
            });
          }
          break;
          
        case 'REMINDER':
          // Event reminder notification
          if (message.userId === session?.user?.id) {
            toast({
              title: "Event Reminder",
              description: `Reminder: You have "${message.data.eventTitle}" coming up soon`,
              duration: 10000,
            });
          }
          break;
      }
      
      // Update last update timestamp
      setLastUpdate(message.timestamp);
    } catch (err) {
      console.error('Error handling Kafka message:', err);
    }
  }, [filterState.vectorSearch, session?.user?.id, toast]);
  
  // Helper to map Kafka event data to our Event interface
  const mapKafkaDataToEvent = useCallback((data: any): Event => {
    return {
      id: data.id.toString(),
      title: data.title,
      description: data.description || undefined,
      startDate: data.start_time,
      endDate: data.end_time,
      location: data.location ? {
        id: data.location.id.toString(),
        name: data.location.name,
        address: data.location.address,
        coordinates: data.location.coordinates,
      } : undefined,
      type: data.event_type_id || EVENT_TYPES.findIndex(t => t.name === data.type) + 1,
      isPaid: data.is_paid,
      price: data.price ? parseFloat(data.price.toString()) : undefined,
      isTeacher: data.instructor_id?.toString() === session?.user?.id,
      userJoined: data.participants?.some(p => p.user_id.toString() === session?.user?.id) || false,
      instructorId: data.instructor_id?.toString(),
      isHighlyAcknowledged: data.is_highly_acknowledged,
    };
  }, [session?.user?.id]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilterState(prevState => {
      const updatedFilters = {
        ...prevState,
        ...newFilters
      };
      
      // Apply filters to events
      const filtered = applyFilters(events, updatedFilters);
      setFilteredEvents(filtered);
      
      // If vector search is provided, update search results
      if (newFilters.vectorSearch) {
        performVectorSearch(events, updatedFilters.vectorSearch);
      } else if (newFilters.vectorSearch === '') {
        // Clear search results if search is cleared
        setSearchResults([]);
      }
      
      return updatedFilters;
    });
  }, [events]);
  
  // Apply filters to events
  const applyFilters = useCallback((eventList: Event[], filters: FilterState) => {
    return eventList.filter(event => {
      // Filter by type
      if (!filters.typeIds.includes(event.type)) return false;
      
      // Filter by location
      if (filters.locations.length > 0 && event.location && 
          !filters.locations.includes(event.location.name)) return false;
      
      // Filter by paid status
      if (filters.showPaidOnly && !event.isPaid) return false;
      if (filters.showFreeOnly && event.isPaid) return false;
      
      // Filter by joined status
      if (filters.showJoinedOnly && !event.userJoined) return false;
      
      return true;
    });
  }, []);
  
  // Perform vector search on events
  const performVectorSearch = useCallback(async (eventList: Event[], searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      // For simple text search
      const results = eventList.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.location && event.location.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      setSearchResults(results);
      
      // For actual vector search using API
      const params = new URLSearchParams();
      params.append('query', searchQuery);
      
      const response = await fetch(`/api/calendar/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const apiResults = data.events.map((event: any) => mapApiEventToEvent(event));
      
      // Combine local results with API results, removing duplicates
      const combinedResults = [...results];
      apiResults.forEach(apiEvent => {
        if (!combinedResults.find(e => e.id === apiEvent.id)) {
          combinedResults.push(apiEvent);
        }
      });
      
      setSearchResults(combinedResults);
    } catch (err) {
      console.error('Error performing vector search:', err);
      // Fallback to simple search results if API fails
    }
  }, []);

  // Handle event selection from calendar
  const handleCalendarEventSelect = (event: Event) => {
    setSelectedEventId(event.id);
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  // Handle marker selection from map
  const handleMapMarkerSelect = (locationId: string) => {
    const eventAtLocation = events.find(event => event.location?.id === locationId);
    if (eventAtLocation) {
      setSelectedEventId(eventAtLocation.id);
      if (onEventSelect) {
        onEventSelect(eventAtLocation);
      }
    }
  };

  // Handle map bounds or region change
  const handleMapRegionChange = (bounds: { north: number; south: number; east: number; west: number }) => {
    // Optionally filter events based on map bounds
    // This implementation would depend on how you want to handle map-based filtering
  };

  // CRUD Operations
  
  // Create new event
  const createEvent = useCallback(async (eventData: Omit<Event, 'id'>) => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          start_time: eventData.startDate,
          end_time: eventData.endDate,
          location_id: eventData.location?.id,
          event_type_id: eventData.type,
          is_paid: eventData.isPaid,
          price: eventData.price,
          instructor_id: session.user.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Optimistically update UI before Kafka message arrives
      const newEvent: Event = {
        id: data.event.id,
        ...eventData,
        isTeacher: true, // User creating the event is the teacher
        userJoined: false, // Creator is not automatically joined
      };
      
      setEvents(prev => [...prev, newEvent]);
      setFilteredEvents(prev => [...prev, newEvent]);
      
      toast({
        title: "Event Created",
        description: "Your event has been successfully created",
      });
      
      return data.event.id;
    } catch (err) {
      console.error('Error creating event:', err);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [session, toast]);
  
  // Update existing event
  const updateEvent = useCallback(async (eventId: string, eventData: Partial<Event>) => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventData.title,
          description: eventData.description,
          start_time: eventData.startDate,
          end_time: eventData.endDate,
          location_id: eventData.location?.id,
          event_type_id: eventData.type,
          is_paid: eventData.isPaid,
          price: eventData.price,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`);
      }
      
      // Optimistically update UI before Kafka message arrives
      setEvents(prev => prev.map(event => {
        if (event.id === eventId) {
          return { ...event, ...eventData };
        }
        return event;
      }));
      
      setFilteredEvents(prev => prev.map(event => {
        if (event.id === eventId) {
          return { ...event, ...eventData };
        }
        return event;
      }));
      
      toast({
        title: "Event Updated",
        description: "Your event has been successfully updated",
      });
      
      return true;
    } catch (err) {
      console.error('Error updating event:', err);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [session, toast]);
  
  // Delete an event
  const deleteEvent = useCallback(async (eventId: string) => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.statusText}`);
      }
      
      // Optimistically update UI before Kafka message arrives
      setEvents(prev => prev.filter(event => event.id !== eventId));
      setFilteredEvents(prev => prev.filter(event => event.id !== eventId));
      
      if (filterState.vectorSearch) {
        setSearchResults(prev => prev.filter(event => event.id !== eventId));
      }
      
      toast({
        title: "Event Deleted",
        description: "Your event has been successfully deleted",
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting event:', err);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [session, filterState.vectorSearch, toast]);
  
  // Register for an event
  const registerForEvent = useCallback(async (eventId: string) => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/calendar/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          user_id: session.user.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to register for event: ${response.statusText}`);
      }
      
      // Optimistically update UI before Kafka message arrives
      setEvents(prev => prev.map(event => {
        if (event.id === eventId) {
          return { ...event, userJo

  return (
    <Container className="py-6">
      <div className="space-y-6">
        <FilterBar 
          filters={filterState} 
          onFilterChange={handleFilterChange}
          availableLocations={availableLocations as string[]}
        />
        
        {/* Search Results Section - Show when vector search is active */}
        {searchResults.length > 0 && (
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Search Results</h2>
            <div className="space-y-3">
              {searchResults.map(event => (
                <div 
                  key={event.id} 
                  className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                  onClick={() => handleCalendarEventSelect(event)}
                >
                  <h3 className="font-medium">{event.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(event.startDate).toLocaleDateString()} at {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {event.location && (
                    <p className="text-sm text-gray-600">{event.location.name}</p>
                  )}
                  {event.description && (
                    <p className="text-sm mt-1 line-clamp-2">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {/* Calendar and Map View Grid - Better balanced layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="p-4 xl:col-span-2">
            <h2 className="text-xl font-bold mb-4">Calendar</h2>
            <Calendar 
              initialTimeSlots={filteredEvents.map(event => ({
                id: event.id,
                title: event.title,
                start: new Date(event.startDate),
                end: new Date(event.endDate || new Date(event.startDate).setHours(new Date(event.startDate).getHours() + 1)),
                typeId: event.type,
                location: event.location?.name || 'Unknown',
                isPaid: event.isPaid || false,
                isTeacher: event.isTeacher || false,
                userJoined: event.userJoined || false,
                description: event.description
              }))}
            />
          </Card>
          
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Map</h2>
            <MapView 
              timeSlots={filteredEvents.map(event => ({
                id: event.id,
                title: event.title,
                start: new Date(event.startDate),
                end: new Date(event.endDate || new Date(event.startDate).setHours(new Date(event.startDate).getHours() + 1)),
                typeId: event.type,
                location: event.location?.name || 'Unknown',
                isPaid: event.isPaid || false,
                isTeacher: event.isTeacher || false,
                userJoined: event.userJoined || false,
                description: event.description
              }))}
              filters={filterState}
              onFilterChange={handleFilterChange}
            />
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default CalendarAndMapView;

