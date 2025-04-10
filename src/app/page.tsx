"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import FilterBar from "@/components/calendar/FilterBar";
import LandingPageCalendar from "@/components/landing/LandingPageCalendar";
import { FilterState, DEFAULT_FILTER_STATE } from "@/types/filters";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { KAFKA_TOPICS } from "@/lib/config/kafka";
import { EventType } from "@/lib/events/schemas/baseEvent";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

// Import MapView component with dynamic loading to avoid SSR issues
const MapView = dynamic(
  () => import("@/components/maps/MapView"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-white rounded-lg shadow">
        <Spinner size="lg" />
        <span className="ml-2 text-gray-600">Loading map...</span>
      </div>
    )
  }
);

// Define interfaces for API responses
interface EventLocation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface EventData {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventTypeId: number;
  location: EventLocation;
  price: number;
  capacity: number;
  currentParticipants: number;
  participants: string[];
  isCreator: boolean;
  isHighlyAcknowledged: boolean;
  isJoined: boolean;
  createdBy: string;
}

interface ApiResponse {
  events: EventData[];
}

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <Alert variant="destructive" className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      <p>Failed to load data: {error.message}</p>
      <button 
        onClick={resetErrorBoundary} 
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </AlertDescription>
  </Alert>
);

export default function Home() {
  // Define states for the component
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Refs for cleanup
  const consumerIdRef = useRef<string | null>(null);
  
  // User session for auth
  const { data: session } = useSession();
  
  // Check for responsive layout
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const isMediumScreen = useMediaQuery('(max-width: 1024px)');
  
  // Available locations for FilterBar
  const availableLocations = ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'];
  
  // Build query string from filters for API requests
  const buildQueryString = useCallback((filters: FilterState) => {
    const params = new URLSearchParams();
    
    // Basic filters
    if (filters.typeIds.length > 0) {
      params.append('typeIds', filters.typeIds.join(','));
    }
    
    if (filters.locations.length > 0) {
      params.append('locations', filters.locations.join(','));
    }
    
    if (filters.instructorIds.length > 0) {
      params.append('instructorIds', filters.instructorIds.join(','));
    }
    
    if (filters.showPaidOnly) {
      params.append('showPaidOnly', 'true');
    }
    
    if (filters.showFreeOnly) {
      params.append('showFreeOnly', 'true');
    }
    
    if (filters.showJoinedOnly) {
      params.append('showJoinedOnly', 'true');
    }
    
    if (filters.showAvailableOnly) {
      params.append('showAvailableOnly', 'true');
    }
    
    if (filters.vectorSearch) {
      params.append('vectorSearch', filters.vectorSearch);
    }
    
    // Event criteria
    if (filters.eventCriteria) {
      // Price range
      if (filters.eventCriteria.priceRange) {
        if (filters.eventCriteria.priceRange.min > 0) {
          params.append('minPrice', filters.eventCriteria.priceRange.min.toString());
        }
        
        if (filters.eventCriteria.priceRange.max !== Infinity) {
          params.append('maxPrice', filters.eventCriteria.priceRange.max.toString());
        }
      }
      
      // Time range
      if (filters.eventCriteria.timeRange) {
        if (filters.eventCriteria.timeRange.startTime) {
          params.append('startTime', filters.eventCriteria.timeRange.startTime);
        }
        
        if (filters.eventCriteria.timeRange.endTime) {
          params.append('endTime', filters.eventCriteria.timeRange.endTime);
        }
      }
      
      // Preferred days
      if (filters.eventCriteria.preferredDays && filters.eventCriteria.preferredDays.length > 0) {
        params.append('preferredDays', filters.eventCriteria.preferredDays.join(','));
      }
      
      // Payment status
      if (filters.eventCriteria.paymentStatus && filters.eventCriteria.paymentStatus.length > 0) {
        params.append('paymentStatus', filters.eventCriteria.paymentStatus.join(','));
      }
      
      // Capacity range
      if (filters.eventCriteria.capacity) {
        if (filters.eventCriteria.capacity.min > 1) {
          params.append('minCapacity', filters.eventCriteria.capacity.min.toString());
        }
        
        if (filters.eventCriteria.capacity.max !== null) {
          params.append('maxCapacity', filters.eventCriteria.capacity.max.toString());
        }
      }
    }
    
    return params.toString();
  }, []);
  
  /**
   * Handles filter changes and publishes updates to Kafka
   * 
   * @param newFilters - Partial filter state to merge with current filters
   */
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
    
    // Publish filter update to Kafka if user is authenticated
    if (session?.user?.id) {
      try {
        // Create and publish event using the API
        fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType: EventType.CALENDAR_UPDATED,
            timestamp: new Date().toISOString(),
            data: {
              filters: { ...filters, ...newFilters },
              userId: session.user.id
            }
          }),
        }).catch(error => {
          console.error('Failed to publish filter update:', error);
          // Non-critical, don't block UI
        });
      } catch (error) {
        console.error('Error creating filter update:', error);
      }
    }
  }, [filters, session?.user?.id]);
  
  /**
   * Handles event selection from Calendar or Map
   * Shows toast notification and publishes to Kafka for analytics
   * 
   * @param event - The selected event object
   */
  const handleEventSelect = useCallback((event) => {
    console.log('Selected event:', event);
    
    // Show a toast notification for the selected event
    toast(event.title, {
      description: `${event.description || 'No description'} at ${event.location?.name || 'unknown location'}`,
      duration: 5000,
    });
    
    // Publish visualization update to Kafka if user is authenticated
    if (session?.user?.id) {
      try {
        // Create and publish visualization event using the API
        fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType: EventType.VISUALIZATION_UPDATED,
            timestamp: new Date().toISOString(),
            data: {
              visualizationType: 'map',
              action: 'viewed',
              payload: {
                eventId: event.id,
                userId: session.user.id,
                timestamp: new Date().toISOString()
              }
            }
          }),
        }).catch(error => {
          console.error('Failed to publish visualization update:', error);
          // Non-critical, don't block UI
        });
      } catch (error) {
        console.error('Error creating visualization update:', error);
      }
    }
  }, [session?.user?.id, toast]);
  
  /**
   * Handles joining an event by the current user
   * Calls the API and updates local state on success
   * 
   * @param eventId - ID of the event to join
  const handleJoinEvent = useCallback(async (eventId: string) => {
    if (!session?.user) {
      toast.error("Authentication required", {
        description: "Please sign in to join events",
      });
      });
      return;
    }
    
    try {
      // Call API to join event
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          action: 'join',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join event');
      }
      
      const data = await response.json();
      
      // Update local event state
      setEvents(currentEvents => 
        currentEvents.map(event => 
          event.id === eventId 
            ? { ...event, isJoined: true } 
            : event
        )
      );
      
      // Show success notification
      toast.success("Success!", {
        description: "You have successfully joined the event",
      });
    } catch (error) {
      console.error('Error joining event:', error);
      console.error('Error joining event:', error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : 'Failed to join event',
      });
  }, [session?.user, toast]);
  
  /**
   * Fetches calendar events from the API based on current filters
   * Updates events state and handles loading/error states
   */
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Build query string from filters
      const queryString = buildQueryString(filters);
      
      // Fetch events from API
      const response = await fetch(`/api/events?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch events');
      }
      
      const data: ApiResponse = await response.json();
      setEvents(data.events);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch events'));
    } finally {
      setIsLoading(false);
    }
  }, [filters, buildQueryString]);
  
  /**
   * Processes incoming Kafka messages for real-time updates
   * Handles different event types and updates local state accordingly
   * 
   * @param message - The Kafka message object
   */
  const handleKafkaMessage = useCallback((message) => {
    console.log('Received Kafka message:', message);
    
    // Handle different message types
    if (message.type === EventType.CALENDAR_EVENTS) {
      const { action, eventId, payload } = message.data;
      
      // Handle event created/updated/deleted/joined
      if (action === 'created' || action === 'updated') {
        // Refresh events to get the latest data
        fetchEvents().catch(console.error);
      } else if (action === 'joined' && payload.userId === session?.user?.id) {
        // Update event join status if current user joined
        setEvents(currentEvents => 
          currentEvents.map(event => 
            event.id === eventId 
              ? { ...event, isJoined: true, currentParticipants: event.currentParticipants + 1 } 
              : event
          )
        );
      }
    } else if (message.type === EventType.CALENDAR_UPDATED) {
      // Handle filter updates from other clients if relevant
      if (message.data.userId !== session?.user?.id) {
        // Don't update filters for changes made by current user
        // This is to prevent loops when current user changes filters
        return;
      }
      
      // Apply filter updates from other sources if needed
      // This could be used for collaborative filtering
      // setFilters(message.data.filters);
    }
  }, [fetchEvents, session?.user?.id]);
  
  // Set up Kafka subscription when component mounts
  useEffect(() => {
    // Only set up subscription once
    if (isSubscribed) return;
    
    // Set up event source for Kafka message updates
    const setupSubscription = async () => {
      try {
        // Create a consumer using the API
        const response = await fetch('/api/kafka/consumers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: [KAFKA_TOPICS.CALENDAR_EVENTS, KAFKA_TOPICS.CALENDAR_UPDATES].join(','),
            filter: {}
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create Kafka consumer');
        }
        
        const { consumerId } = await response.json();
        consumerIdRef.current = consumerId;
        
        // Set up polling for messages
        const messagePolling = setInterval(async () => {
          if (!consumerIdRef.current) return;
          
          try {
            const messagesResponse = await fetch(`/api/kafka/consumers/${consumerIdRef.current}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (messagesResponse.ok) {
              const data = await messagesResponse.json();
              if (data && data.messages && Array.isArray(data.messages)) {
                // Process each message
                data.messages.forEach((message: any) => {
                  handleKafkaMessage(message);
                });
              }
            }
          } catch (error) {
            console.error('Error polling Kafka messages:', error);
          }
        }, 5000); // Poll every 5 seconds
        
        setIsSubscribed(true);
        console.log('Subscribed to Kafka topics successfully with consumer ID:', consumerId);
        
        // Return cleanup function for the interval
        return () => {
          clearInterval(messagePolling);
        };
      } catch (error) {
        console.error('Failed to subscribe to Kafka topics:', error);
        // Non-critical, continue with basic functionality
      }
    };
    
    const cleanup = setupSubscription();
    
    // Cleanup function to unsubscribe from Kafka
    return () => {
      // Clean up the polling interval if it was set
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
      
      // Delete the consumer if it was created
      if (consumerIdRef.current) {
        fetch(`/api/kafka/consumers/${consumerIdRef.current}/control`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'RESET'
          }),
        }).catch(error => {
          console.error('Error removing Kafka consumer:', error);
        });
      }
    };
  }, [handleKafkaMessage, isSubscribed]);
  
  // Fetch events when filters change
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  // Convert events to timeSlot format for MapView
  const timeSlots = events.map(event => ({
    id: event.id,
    title: event.title,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    typeId: event.eventTypeId,
    location: event.location.name,
    isPaid: event.price > 0,
    isTeacher: event.isCreator,
    isHighlyAcknowledged: event.isHighlyAcknowledged,
    userJoined: event.isJoined
  }));
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      
      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to Where to App
          </h1>
          <p className="text-gray-300 text-xl">
            Discover, explore, and connect with local activities near you.
          </p>
        </div>
      </div>
      
      {/* Calendar and Map Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setIsLoading(true)}>
          {/* Filter Bar */}
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <FilterBar 
                  filters={filters} 
                  onFilterChange={handleFilterChange}
                  availableLocations={availableLocations}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center items-center h-64 mb-6">
              <Spinner size="lg" />
              <span className="ml-3 text-white">Loading events...</span>
            </div>
          )}
          
          {/* Error state */}
          {error && !isLoading && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          
          {/* Calendar and Map Layout */}
          {!isLoading && !error && (
            <div className={`grid ${isSmallScreen ? 'grid-cols-1 gap-6' : 'grid-cols-5 gap-6'}`}>
              {/* Calendar section - 3/5 width on desktop, full width on mobile */}
              <Card className={`${isSmallScreen ? '' : 'col-span-3'}`}>
                <CardContent className="p-4">
                  <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
                  <ErrorBoundary 
                    FallbackComponent={ErrorFallback} 
                    onReset={() => setIsLoading(true)}
                  >
                    {/* Use built-in LandingPageCalendar for consistent UX */}
                    <LandingPageCalendar 
                      initialEvents={events}
                      onEventSelect={handleEventSelect}
                      userPreferences={{
                        defaultView: isSmallScreen ? 'day' : (isMediumScreen ? 'week' : 'month'),
                        defaultDate: new Date(),
                        initialFilters: filters,
                        compactView: isSmallScreen,
                        showControls: !isSmallScreen
                      }}
                      isLoading={isLoading}
                    />
                  </ErrorBoundary>
                </CardContent>
              </Card>
              
              {/* Map section - 2/5 width on desktop, full width on mobile */}
              <Card className={`${isSmallScreen ? '' : 'col-span-2'}`}>
                <CardContent className="p-4">
                  <h2 className="text-xl font-bold mb-4">Event Locations</h2>
                  <div className={`${isSmallScreen ? 'h-[400px]' : 'h-[600px]'}`}>
                    <ErrorBoundary 
                      FallbackComponent={ErrorFallback} 
                      onReset={() => setIsLoading(true)}
                    >
                      <MapView
                        timeSlots={timeSlots}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onTimeSlotSelected={handleEventSelect}
                        height={isSmallScreen ? 'h-[350px]' : 'h-[550px]'}
                        showLegend={!isSmallScreen}
                        zoom={isSmallScreen ? 3 : 4}
                        onUserJoinTimeSlot={(timeSlotId) => {
                          console.log('User joined time slot:', timeSlotId);
                          // Call the real implementation
                          handleJoinEvent(timeSlotId);
                        }}
                      />
                    </ErrorBoundary>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Call to Action Section */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to explore more?</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/calendar"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                View Full Calendar
              </Link>
              <Link
                href="/maps"
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors"
              >
                Explore Maps
              </Link>
            </div>
          </div>
        </ErrorBoundary>
      </div>
      
      {/* Temporary Toast Test Component - Remove after testing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-6 mb-12">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl">
            <div className="p-1">
              {/* Dynamically import the test component to avoid affecting production */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="p-4">
                  {/* @ts-expect-error - Dynamic import */}
                  {dynamic(() => import('@/components/ToastTestComponent'), {
                    loading: () => <div className="p-4">Loading Toast Tester...</div>,
                    ssr: false
                  })}
                </div>
              )}
            </div>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
