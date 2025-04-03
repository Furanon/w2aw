import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FilterState, 
  EventType, 
  DEFAULT_FILTER_STATE,
  SPECIAL_STATUS_COLORS,
  EVENT_TYPES
} from '@/src/types/filters';
import { 
  useEventOperations, 
  CalendarEvent, 
  CALENDAR_KAFKA_TOPICS, 
  OperationResult 
} from './useEventOperations';
import { KafkaConsumer } from '@/src/lib/kafka';
import { KAFKA_CONSUMER_GROUPS } from '@/src/lib/config/kafka';

/**
 * Interface for the event styling options
 */
export interface EventStyling {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  statusIndicator?: 'joined' | 'created' | 'full' | 'paid' | 'free';
}

/**
 * Extended calendar event with additional UI properties
 */
export interface CalendarEventWithStyling extends CalendarEvent {
  styling: EventStyling;
  isJoined?: boolean;
  isCreator?: boolean;
  isFull?: boolean;
  availableSpots?: number;
}

/**
 * Return type for the useCalendarEvents hook
 */
export interface UseCalendarEventsReturn {
  events: CalendarEventWithStyling[];
  filteredEvents: CalendarEventWithStyling[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createEvent: (eventData: any) => Promise<OperationResult<CalendarEvent>>;
  updateEvent: (eventData: any) => Promise<OperationResult<CalendarEvent>>;
  deleteEvent: (eventId: string) => Promise<OperationResult>;
  getEventById: (eventId: string) => CalendarEventWithStyling | undefined;
  getEventStyling: (event: CalendarEvent) => EventStyling;
}

/**
 * Hook for managing calendar events with filtering and real-time updates
 */
export function useCalendarEvents(
  filterState: FilterState = DEFAULT_FILTER_STATE,
  userId?: string
): UseCalendarEventsReturn {
  // State for calendar events
  const [events, setEvents] = useState<CalendarEventWithStyling[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the event operations hook
  const { 
    createEvent: createEventOperation, 
    updateEvent: updateEventOperation, 
    deleteEvent: deleteEventOperation,
    addParticipant,
    removeParticipant,
    updateParticipant,
    loading: operationsLoading,
    error: operationsError 
  } = useEventOperations();

  /**
   * Fetch calendar events from the API
   */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch events from the API with filter parameters
      const response = await fetch('/api/calendar/events?' + new URLSearchParams({
        // Convert filter state to query parameters
        typeIds: filterState.typeIds.join(','),
        locations: filterState.locations.join(','),
        instructorIds: filterState.instructorIds.join(','),
        showPaidOnly: filterState.showPaidOnly.toString(),
        showFreeOnly: filterState.showFreeOnly.toString(),
        showJoinedOnly: filterState.showJoinedOnly.toString(),
        showAvailableOnly: filterState.showAvailableOnly.toString(),
        vectorSearch: filterState.vectorSearch,
        minPrice: filterState.eventCriteria.priceRange.min.toString(),
        maxPrice: filterState.eventCriteria.priceRange.max === Infinity 
          ? '' 
          : filterState.eventCriteria.priceRange.max.toString(),
        startTime: filterState.eventCriteria.timeRange.startTime || '',
        endTime: filterState.eventCriteria.timeRange.endTime || '',
        preferredDays: filterState.eventCriteria.preferredDays.join(','),
        minCapacity: filterState.eventCriteria.capacity.min.toString(),
        maxCapacity: filterState.eventCriteria.capacity.max?.toString() || '',
      }));
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      
      const eventsData: CalendarEvent[] = await response.json();
      
      // Map the events to include styling information
      const eventsWithStyling = eventsData.map((event) => ({
        ...event,
        styling: getEventStyling(event),
        isJoined: userId ? event.participants?.some(p => p.userId === userId) : false,
        isCreator: userId ? event.createdBy === userId : false,
        isFull: event.capacity <= (event.participants?.length || 0),
        availableSpots: Math.max(0, event.capacity - (event.participants?.length || 0))
      }));
      
      setEvents(eventsWithStyling);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching calendar events');
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  }, [filterState, userId]);

  /**
   * Initialize Kafka consumer for real-time event updates
   */
  useEffect(() => {
    let consumer: KafkaConsumer | null = null;
    
    const initKafkaConsumer = async () => {
      try {
        consumer = new KafkaConsumer(
          KAFKA_CONSUMER_GROUPS.CALENDAR,
          [
            CALENDAR_KAFKA_TOPICS.EVENTS,
            CALENDAR_KAFKA_TOPICS.UPDATES,
            CALENDAR_KAFKA_TOPICS.NOTIFICATIONS
          ]
        );
        
        // Set up event handlers for different message types
        consumer.onMessage(CALENDAR_KAFKA_TOPICS.EVENTS, async ({ message }) => {
          if (!message.value) return;
          
          try {
            const kafkaMessage = JSON.parse(message.value.toString());
            const { type, payload } = kafkaMessage;
            
            // Update local state based on the message type
            switch (type) {
              case 'EVENT_CREATED':
                setEvents(currentEvents => [
                  ...currentEvents,
                  {
                    ...payload,
                    styling: getEventStyling(payload),
                    isJoined: userId ? payload.participants?.some(p => p.userId === userId) : false,
                    isCreator: userId ? payload.createdBy === userId : false,
                    isFull: payload.capacity <= (payload.participants?.length || 0),
                    availableSpots: Math.max(0, payload.capacity - (payload.participants?.length || 0))
                  }
                ]);
                break;
                
              case 'EVENT_UPDATED':
                setEvents(currentEvents => 
                  currentEvents.map(event => 
                    event.id === payload.id 
                      ? {
                          ...payload,
                          styling: getEventStyling(payload),
                          isJoined: userId ? payload.participants?.some(p => p.userId === userId) : false,
                          isCreator: userId ? payload.createdBy === userId : false,
                          isFull: payload.capacity <= (payload.participants?.length || 0),
                          availableSpots: Math.max(0, payload.capacity - (payload.participants?.length || 0))
                        }
                      : event
                  )
                );
                break;
                
              case 'EVENT_DELETED':
                setEvents(currentEvents => 
                  currentEvents.filter(event => event.id !== payload.eventId)
                );
                break;
                
              case 'PARTICIPANT_ADDED':
              case 'PARTICIPANT_REMOVED':
              case 'PAYMENT_CONFIRMED':
                // When participants change, refresh the events to get updated participant lists
                fetchEvents();
                break;
                
              default:
                console.log('Unhandled Kafka message type:', type);
            }
          } catch (err) {
            console.error('Error processing Kafka message:', err);
          }
        });
        
        // Start the consumer
        await consumer.start();
      } catch (err) {
        console.error('Error initializing Kafka consumer:', err);
      }
    };
    
    initKafkaConsumer();
    
    // Clean up the consumer on unmount
    return () => {
      if (consumer) {
        consumer.disconnect().catch(err => {
          console.error('Error disconnecting Kafka consumer:', err);
        });
      }
    };
  }, [fetchEvents, userId]);

  /**
   * Fetch events on mount and when the filter state changes
   */
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /**
   * Get styling information for a calendar event
   */
  const getEventStyling = useCallback((event: CalendarEvent): EventStyling => {
    // Find the event type's color
    const eventType = EVENT_TYPES.find(type => type.id === event.eventTypeId);
    const backgroundColor = eventType?.color || '#cccccc';
    
    let statusIndicator: EventStyling['statusIndicator'] = undefined;
    
    // Determine event status for styling
    if (userId) {
      if (event.createdBy === userId) {
        statusIndicator = 'created';
      } else if (event.participants?.some(p => p.userId === userId)) {
        statusIndicator = 'joined';
      }
    }
    
    // Price-based styling
    if (event.price === 0) {
      statusIndicator = 'free';
    } else if (event.participants?.some(p => p.userId === userId && p.paymentStatus === 'paid')) {
      statusIndicator = 'paid';
    }
    
    // Capacity-based styling
    if (event.capacity <= (event.participants?.length || 0)) {
      statusIndicator = 'full';
    }
    
    // Create the styling object
    return {
      backgroundColor: backgroundColor,
      borderColor: statusIndicator === 'created' 
        ? SPECIAL_STATUS_COLORS.TEACHER 
        : statusIndicator === 'joined'
          ? SPECIAL_STATUS_COLORS.USER_JOINED
          : backgroundColor,
      textColor: isDarkColor(backgroundColor) ? '#ffffff' : '#333333',
      statusIndicator
    };
  }, [userId]);
  
  /**
   * Helper function to determine if a color is dark
   */
  const isDarkColor = (hexColor: string): boolean => {
    // Remove the hash if it exists
    const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
    
    // Convert hex to RGB
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    
    // Calculate luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If luminance is less than 0.5, it's a dark color
    return luminance < 0.5;
  };

  /**
   * Apply filters to the events
   */
  /**
   * Get an event by its ID
   */
  const getEventById = useCallback((eventId: string): CalendarEventWithStyling | undefined => {
    return events.find(event => event.id === eventId);
  }, [events]);

  /**
   * Create a new calendar event
   */
  const createEvent = useCallback(async (eventData: any): Promise<OperationResult<CalendarEvent>> => {
    try {
      const result = await createEventOperation(eventData);
      
      if (result.success && result.data) {
        // Add styling info to the new event
        const newEventWithStyling: CalendarEventWithStyling = {
          ...result.data,
          styling: getEventStyling(result.data),
          isJoined: userId ? result.data.participants?.some(p => p.userId === userId) : false,
          isCreator: userId ? result.data.createdBy === userId : false,
          isFull: result.data.capacity <= (result.data.participants?.length || 0),
          availableSpots: Math.max(0, result.data.capacity - (result.data.participants?.length || 0))
        };
        
        // Update the local state
        setEvents(currentEvents => [...currentEvents, newEventWithStyling]);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred while creating event' 
      };
    }
  }, [createEventOperation, getEventStyling, userId]);

  /**
   * Update an existing calendar event
   */
  const updateEvent = useCallback(async (eventData: any): Promise<OperationResult<CalendarEvent>> => {
    try {
      const result = await updateEventOperation(eventData);
      
      if (result.success && result.data) {
        // Update the local state
        setEvents(currentEvents => 
          currentEvents.map(event => 
            event.id === result.data?.id 
              ? {
                  ...result.data,
                  styling: getEventStyling(result.data),
                  isJoined: userId ? result.data.participants?.some(p => p.userId === userId) : false,
                  isCreator: userId ? result.data.createdBy === userId : false,
                  isFull: result.data.capacity <= (result.data.participants?.length || 0),
                  availableSpots: Math.max(0, result.data.capacity - (result.data.participants?.length || 0))
                }
              : event
          )
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error updating event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred while updating event' 
      };
    }
  }, [updateEventOperation, getEventStyling, userId]);

  /**
   * Delete a calendar event
   */
  const deleteEvent = useCallback(async (eventId: string): Promise<OperationResult> => {
    try {
      const result = await deleteEventOperation(eventId);
      
      if (result.success) {
        // Remove the event from local state
        setEvents(currentEvents => 
          currentEvents.filter(event => event.id !== eventId)
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred while deleting event' 
      };
    }
  }, [deleteEventOperation]);

  const filteredEvents = useMemo(() => {
    if (!events.length) return [];
    
    return events.filter(event => {
      // Filter by event type
      if (filterState.typeIds.length > 0 && !filterState.typeIds.includes(event.eventTypeId)) {
        return false;
      }
      
      // Filter by location
      if (filterState.locations.length > 0 && !filterState.locations.includes(event.location.id)) {
        return false;
      }
      
      // Filter by instructor/creator
      if (filterState.instructorIds.length > 0 && !filterState.instructorIds.includes(event.createdBy)) {
        return false;
      }
      
      // Filter by price
      if (filterState.showPaidOnly && event.price === 0) {
        return false;
      }
      
      if (filterState.showFreeOnly && event.price > 0) {
        return false;
      }
      
      // Filter by user participation
      if (filterState.showJoinedOnly && userId && !event.participants?.some(p => p.userId === userId)) {
        return false;
      }
      
      // Filter by availability
      if (filterState.showAvailableOnly && event.capacity <= (event.participants?.length || 0)) {
        return false;
      }
      
      // Filter by price range
      if (event.price < filterState.eventCriteria.priceRange.min) {
        return false;
      }
      
      if (filterState.eventCriteria.priceRange.max !== Infinity && 
          event.price > filterState.eventCriteria.priceRange.max) {
        return false;
      }
      
      // Filter by capacity
      if (event.capacity < filterState.eventCriteria.capacity.min) {
        return false;
      }
      
      if (filterState.eventCriteria.capacity.max !== null && 
          event.capacity > filterState.eventCriteria.capacity.max) {
        return false;
      }
      
      // Filter by time range (if specified)
      if (filterState.eventCriteria.timeRange.startTime || filterState.eventCriteria.timeRange.endTime) {
        const eventStartTime = new Date(event.startTime);
        const eventHour = eventStartTime.getHours();
        const eventMinute = eventStartTime.getMinutes();
        const eventTimeMinutes = eventHour * 60 + eventMinute;
        
        if (filterState.eventCriteria.timeRange.startTime) {
          const [startHour, startMinute] = filterState.eventCriteria.timeRange.startTime.split(':').map(Number);
          const startTimeMinutes = startHour * 60 + startMinute;
          
          if (eventTimeMinutes < startTimeMinutes) {
            return false;
          }
        }
        
        if (filterState.eventCriteria.timeRange.endTime) {
          const [endHour, endMinute] = filterState.eventCriteria.timeRange.endTime.split(':').map(Number);
          const endTimeMinutes = endHour * 60 + endMinute;
          
          if (eventTimeMinutes > endTimeMinutes) {
            return false;
          }
        }
      }
      
      return true;
    }
    return false;
  }), [filterState, userId]);
          return false;
        }

import { useState, useEffect, useCallback, useMemo } from 'react';
import useEventOperations from './useEventOperations';
import { 
  FilterState, 
  EventType, 
  EVENT_TYPES, 
  SPECIAL_STATUS_COLORS,
  PAYMENT_STATUS_TYPES 
} from '@/types/filters';
import { useKafka } from '@/hooks/useKafka'; // Assuming a Kafka hook exists

// Event interfaces
export interface EventParticipant {
  userId: string;
  userName: string;
  paymentStatus: string;
  joinedAt: Date;
}

export interface EventLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  typeId: number;
  location: EventLocation;
  price: number;
  capacity: number;
  participants: EventParticipant[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isCancelled: boolean;
}

export interface TimeSlot {
  event: CalendarEvent;
  isUserJoined: boolean;
  isUserTeacher: boolean;
  availableSpots: number;
  style: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
}

// Kafka topic constants
const KAFKA_TOPICS = {
  EVENTS: 'CALENDAR_EVENTS',
  NOTIFICATIONS: 'CALENDAR_NOTIFICATIONS',
  UPDATES: 'CALENDAR_UPDATES',
};

/**
 * Custom hook for managing calendar events, including fetching, CRUD operations,
 * real-time updates via Kafka, and event styling/formatting.
 */
export default function useCalendarEvents(filterState: FilterState) {
  // State for events and loading status
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Import CRUD operations from the useEventOperations hook
  const { 
    getEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent, 
    joinEvent, 
    leaveEvent,
    confirmPayment
  } = useEventOperations();

  // Setup Kafka subscription for real-time updates
  const { subscribe, publish } = useKafka();

  // Fetch initial events
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedEvents = await getEvents(filterState);
      setEvents(fetchedEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to fetch events. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [filterState, getEvents]);

  // Subscribe to Kafka topics for real-time updates
  useEffect(() => {
    const subscriptions = [
      subscribe(KAFKA_TOPICS.EVENTS, (message) => {
        // Handle new/updated events
        const eventData = JSON.parse(message.value);
        setEvents(prevEvents => {
          // If the event already exists, update it, otherwise add it
          const eventExists = prevEvents.some(e => e.id === eventData.id);
          if (eventExists) {
            return prevEvents.map(e => e.id === eventData.id ? eventData : e);
          } else {
            return [...prevEvents, eventData];
          }
        });
      }),

      subscribe(KAFKA_TOPICS.UPDATES, (message) => {
        // Handle event updates (cancellations, changes, etc.)
        const updateData = JSON.parse(message.value);
        if (updateData.action === 'DELETE') {
          setEvents(prevEvents => prevEvents.filter(e => e.id !== updateData.eventId));
        } else if (updateData.action === 'UPDATE') {
          fetchEvents(); // Refetch all events to ensure consistency
        }
      }),

      subscribe(KAFKA_TOPICS.NOTIFICATIONS, (message) => {
        // Handle notifications (new participants, payment confirmations, etc.)
        const notificationData = JSON.parse(message.value);
        if (notificationData.type === 'PARTICIPANT_UPDATE') {
          // Update the specific event's participant list
          setEvents(prevEvents => prevEvents.map(event => {
            if (event.id === notificationData.eventId) {
              return {
                ...event,
                participants: notificationData.participants,
              };
            }
            return event;
          }));
        }
      })
    ];

    // Cleanup function to unsubscribe
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe, fetchEvents]);

  // Initial data fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Apply filters to events and format for display
  const filteredTimeSlots = useMemo<TimeSlot[]>(() => {
    if (!events.length) return [];

    return events
      .filter(event => {
        // Apply type filters
        if (filterState.typeIds.length && !filterState.typeIds.includes(event.typeId)) {
          return false;
        }

        // Apply location filters
        if (filterState.locations.length && !filterState.locations.includes(event.location.name)) {
          return false;
        }

        // Apply payment filters
        if (filterState.showPaidOnly && event.price === 0) {
          return false;
        }
        if (filterState.showFreeOnly && event.price > 0) {
          return false;
        }

        // Apply participation filters
        const userJoined = event.participants.some(p => p.userId === 'current-user-id'); // Replace with actual user ID lookup
        if (filterState.showJoinedOnly && !userJoined) {
          return false;
        }
        
        const availableSpots = event.capacity - event.participants.length;
        if (filterState.showAvailableOnly && availableSpots <= 0) {
          return false;
        }

        // Apply event-specific criteria
        const { eventCriteria } = filterState;
        
        // Price range
        if (event.price < eventCriteria.priceRange.min || 
            (eventCriteria.priceRange.max !== Infinity && event.price > eventCriteria.priceRange.max)) {
          return false;
        }
        
        // Time range
        if (eventCriteria.timeRange.startTime || eventCriteria.timeRange.endTime) {
          const eventStartHour = event.startTime.getHours();
          const eventStartMinutes = event.startTime.getMinutes();
          const eventStartTimeString = `${eventStartHour.toString().padStart(2, '0')}:${eventStartMinutes.toString().padStart(2, '0')}`;
          
          if (eventCriteria.timeRange.startTime && eventStartTimeString < eventCriteria.timeRange.startTime) {
            return false;
          }
          
          if (eventCriteria.timeRange.endTime) {
            const eventEndHour = event.endTime.getHours();
            const eventEndMinutes = event.endTime.getMinutes();
            const eventEndTimeString = `${eventEndHour.toString().padStart(2, '0')}:${eventEndMinutes.toString().padStart(2, '0')}`;
            
            if (eventEndTimeString > eventCriteria.timeRange.endTime) {
              return false;
            }
          }
        }
        
        // Preferred days
        if (eventCriteria.preferredDays.length > 0) {
          const eventDay = event.startTime.getDay();
          if (!eventCriteria.preferredDays.includes(eventDay)) {
            return false;
          }
        }
        
        // Payment status
        if (eventCriteria.paymentStatus.length > 0) {
          // For this filter, we need to check the user's payment status for this event
          const userParticipant = event.participants.find(p => p.userId === 'current-user-id');
          if (!userParticipant || !eventCriteria.paymentStatus.includes(userParticipant.paymentStatus)) {
            return false;
          }
        }
        
        // Capacity
        if (event.capacity < eventCriteria.capacity.min) {
          return false;
        }
        if (eventCriteria.capacity.max !== null && event.capacity > eventCriteria.capacity.max) {
          return false;
        }
        
        // Vector search (assumed to be a text search across title and description)
        if (filterState.vectorSearch) {
          const searchLower = filterState.vectorSearch.toLowerCase();
          const titleMatch = event.title.toLowerCase().includes(searchLower);
          const descMatch = event.description.toLowerCase().includes(searchLower);
          if (!titleMatch && !descMatch) {
            return false;
          }
        }
        
        return true;
      })
      .map(event => {
        // Calculate event-specific properties
        const isUserJoined = event.participants.some(p => p.userId === 'current-user-id');
        const isUserTeacher = event.createdBy === 'current-user-id';
        const availableSpots = event.capacity - event.participants.length;
        
        // Set event style based on type and special statuses
        let backgroundColor = '#757575'; // Default gray
        let borderColor = '#616161';
        let textColor = '#FFFFFF';
        
        // Find the event type to get its color
        const eventType = EVENT_TYPES.find(type => type.id === event.typeId);
        if (eventType) {
          backgroundColor = eventType.color;
          borderColor = eventType.color;
        }
        
        // Apply special status colors
        if (isUserTeacher) {
          backgroundColor = SPECIAL_STATUS_COLORS.TEACHER;
          borderColor = SPECIAL_STATUS_COLORS.TEACHER;
        }
        
        if (isUserJoined) {
          backgroundColor = SPECIAL_STATUS_COLORS.USER_JOINED;
          borderColor = SPECIAL_STATUS_COLORS.USER_JOINED;
        }
        
        // If event is cancelled, add visual indication
        if (event.isCancelled) {
          backgroundColor = '#9E9E9E'; // Gray out cancelled events
          borderColor = '#757575';
          textColor = '#E0E0E0';
        }
        
        return {
          event,
          isUserJoined,
          isUserTeacher,
          availableSpots,
          style: {
            backgroundColor,
            borderColor,
            textColor,
          }
        };
      });
  }, [events, filterState]);

  // Handlers for event operations
  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newEvent = await createEvent(eventData);
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  };

  const handleUpdateEvent = async (eventId: string, eventData: Partial<CalendarEvent>) => {
    try {
      const updatedEvent = await updateEvent(eventId, eventData);
      setEvents(prev => prev.map(event => event.id === eventId ? updatedEvent : event));
      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      const updatedEvent = await joinEvent(eventId);
      setEvents(prev => prev.map(event => event.id === eventId ? updatedEvent : event));
      return updatedEvent;
    } catch (error) {
      console.error('Error joining event:', error);
      throw error;
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    try {
      const updatedEvent = await leaveEvent(eventId);
      setEvents(prev => prev.map(event => event.id === eventId ? updatedEvent : event));
      return updatedEvent;
    } catch (error) {
      console.error('Error leaving event:', error);
      throw error;
    }
  };

  const handleConfirmPayment = async (eventId: string, userId: string) => {
    try {
      const updatedEvent = await confirmPayment(eventId, userId);
      setEvents(prev => prev.map(event => event.id === eventId ? updatedEvent : event));
      return updatedEvent;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  };

  // Event formatting utilities
  const formatEventTime = (event: CalendarEvent) => {
    const startTime = event.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = event.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${startTime} - ${endTime}`;
  };

  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getEventStatusLabel = (event: CalendarEvent, isUserJoined: boolean) => {
    if (event.isCancelled) return 'Cancelled';
    if (isUserJoined) return 'Joined';
    if (event.participants.length >= event.capacity) return 'Full';
    return 'Available';
  };

  const getEventTypeLabel = (typeId: number) => {
    const eventType = EVENT_TYPES.find(type => type.id === typeId);
    return eventType ? eventType.name : 'Unknown';
  };

  // Return all the event-related functionality
  return {
    events,
    filteredEvents,
    loading,
    error,
    refresh: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    getEventStyling
  };
    createEvent: handleCreateEvent,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,
    joinEvent: handleJoinEvent,
    leaveEvent: handleLeaveEvent,
    confirmPayment: handleConfirmPayment,
    
    // Utilities
    refreshEvents: fetchEvents,
    formatEventTime,
    formatEventDate,
    getEventStatusLabel,
    getEventTypeLabel,
  };

'use client';

import { useState, useCallback, useEffect } from 'react';
import { EVENT_TYPES, SPECIAL_STATUS_COLORS } from '@/types/filters';

// Using constants from imported SPECIAL_STATUS_COLORS
const TEACHER_COLOR = SPECIAL_STATUS_COLORS.TEACHER;
const HIGHLY_ACKNOWLEDGED_TEACHER_COLOR = SPECIAL_STATUS_COLORS.HIGHLY_ACKNOWLEDGED_TEACHER;
const USER_JOINED_COLOR = SPECIAL_STATUS_COLORS.USER_JOINED;

// TimeSlot interface
export interface TimeSlot {
  id: string;
  title: string;
  start: Date;
  end: Date;
  typeId: number;
  location: string;
  isPaid: boolean;
  isTeacher: boolean;
  isHighlyAcknowledged?: boolean;
  userJoined?: boolean;
  description?: string;
  recurringId?: string;
  price?: number;
}

interface UseCalendarEventsProps {
  initialTimeSlots?: TimeSlot[];
  onTimeSlotCreated?: (timeSlot: TimeSlot) => void;
  onTimeSlotUpdated?: (timeSlot: TimeSlot) => void;
  onTimeSlotDeleted?: (timeSlotId: string) => void;
  onUserJoinTimeSlot?: (timeSlotId: string) => void;
}

/**
 * Custom hook to manage calendar events including CRUD operations and Kafka topic handling
 */
const useCalendarEvents = ({
  initialTimeSlots = [],
  onTimeSlotCreated,
  onTimeSlotUpdated,
  onTimeSlotDeleted,
  onUserJoinTimeSlot,
}: UseCalendarEventsProps = {}) => {
  // State for time slots
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get event color based on properties
  const getEventColor = useCallback((timeSlot: TimeSlot) => {
    if (timeSlot.userJoined) return USER_JOINED_COLOR;
    if (timeSlot.isTeacher) {
      return timeSlot.isHighlyAcknowledged ? HIGHLY_ACKNOWLEDGED_TEACHER_COLOR : TEACHER_COLOR;
    }
    const eventType = EVENT_TYPES.find(type => type.id === timeSlot.typeId);
    return eventType ? eventType.color : '#CCCCCC';
  }, []);

  // Event styling getter
  const eventStyleGetter = useCallback((event: TimeSlot) => {
    const backgroundColor = getEventColor(event);
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        color: 'white',
        border: 'none',
        display: 'block',
        opacity: 0.8,
      },
    };
  }, [getEventColor]);

  // CRUD Operations
  const createTimeSlot = useCallback((timeSlot: TimeSlot) => {
    // Generate a new ID
    const newTimeSlot = {
      ...timeSlot,
      id: Date.now().toString(),
    };
    
    setTimeSlots(prev => [...prev, newTimeSlot]);
    onTimeSlotCreated?.(newTimeSlot);

    // Placeholder: Publish to Kafka CALENDAR_EVENTS topic
    console.log('Publishing new event to Kafka CALENDAR_EVENTS topic', newTimeSlot);

    return newTimeSlot;
  }, [onTimeSlotCreated]);

  const updateTimeSlot = useCallback((timeSlot: TimeSlot) => {
    setTimeSlots(prev => 
      prev.map(slot => (slot.id === timeSlot.id ? timeSlot : slot))
    );
    onTimeSlotUpdated?.(timeSlot);

    // Placeholder: Publish to Kafka CALENDAR_UPDATES topic
    console.log('Publishing event update to Kafka CALENDAR_UPDATES topic', timeSlot);

    return timeSlot;
  }, [onTimeSlotUpdated]);

  const deleteTimeSlot = useCallback((timeSlotId: string) => {
    setTimeSlots(prev => prev.filter(slot => slot.id !== timeSlotId));
    onTimeSlotDeleted?.(timeSlotId);

    // Placeholder: Publish to Kafka CALENDAR_UPDATES topic (deletion)
    console.log('Publishing event deletion to Kafka CALENDAR_UPDATES topic', { id: timeSlotId });

    return timeSlotId;
  }, [onTimeSlotDeleted]);

  const joinTimeSlot = useCallback((timeSlotId: string) => {
    let updatedSlot: TimeSlot | undefined;

    setTimeSlots(prev => 
      prev.map(slot => {
        if (slot.id === timeSlotId) {
          updatedSlot = { ...slot, userJoined: true };
          return updatedSlot;
        }
        return slot;
      })
    );
    onUserJoinTimeSlot?.(timeSlotId);

    // Placeholder: Publish to Kafka CALENDAR_NOTIFICATIONS topic
    console.log('Publishing join event to Kafka CALENDAR_NOTIFICATIONS topic', { 
      eventId: timeSlotId, 
      action: 'join' 
    });

    return updatedSlot;
  }, [onUserJoinTimeSlot]);

  // Create a new draft time slot for the selected slot
  const createDraftTimeSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    return {
      id: '',
      title: '',
      start,
      end,
      typeId: 1,
      location: 'Location 1',
      isPaid: false,
      isTeacher: false,
    } as TimeSlot;
  }, []);

  // Fetch time slots from an API
  const fetchTimeSlots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Placeholder: This would be replaced with an actual API call
      console.log('Fetching time slots from API...');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For now, just use the initial time slots
      // In a real implementation, this would fetch from an API
      
      // Placeholder: Subscribe to Kafka topics for real-time updates
      console.log('Subscribing to Kafka topics: CALENDAR_EVENTS, CALENDAR_NOTIFICATIONS, CALENDAR_UPDATES');
      
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred while fetching time slots'));
      setIsLoading(false);
    }
  }, []);

  // Fetch recommendations using ONNX model
  const fetchRecommendedEvents = useCallback(async () => {
    try {
      // This would be replaced with actual ONNX integration
      console.log('Fetching event recommendations with ONNX...');
      // const recommended = await callOnnxModel(timeSlots, userPreferences);
      // Process recommended events...
      
      return [];
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }, [timeSlots]);

  // Initialize time slots and set up Kafka subscriptions
  useEffect(() => {
    fetchTimeSlots();
    
    // Cleanup function to unsubscribe from Kafka topics
    return () => {
      console.log('Unsubscribing from Kafka topics');
      // Placeholder: Actual Kafka unsubscribe logic would go here
    };
  }, [fetchTimeSlots]);

  // Fetch recommendations when time slots change
  useEffect(() => {
    fetchRecommendedEvents();
  }, [fetchRecommendedEvents]);

  return {
    // State
    timeSlots,
    isLoading,
    error,
    
    // Event styling
    getEventColor,
    eventStyleGetter,
    
    // CRUD operations
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    joinTimeSlot,
    createDraftTimeSlot,
    
    // Data fetching
    fetchTimeSlots,
    fetchRecommendedEvents,
  };
};

export default useCalendarEvents;

