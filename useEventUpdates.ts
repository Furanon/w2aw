import { useEffect, useState, useCallback } from 'react';
import { KafkaClient, KafkaConsumer } from '@/lib/kafka';
import { KAFKA_TOPICS, KAFKA_CONSUMER_GROUPS } from '@/lib/config/kafka';
import { CalendarEventType } from '@/lib/kafka/producers/calendar';

// Define types for event data
export interface EventData {
  eventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: {
    id: string;
    name: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  creatorId: string;
  isRecurring: boolean;
  recurringPattern?: string;
  eventType: string;
  isPaid: boolean;
  price?: number;
  maxParticipants?: number;
  participants?: Array<{
    userId: string;
    name: string;
    hasPaid: boolean;
  }>;
  tags?: string[];
}

// Define types for calendar-specific event structure
export interface CalendarEvent extends EventData {
  color?: string; // Optional color for calendar visualization
  allDay?: boolean; // Whether the event takes up the full day
}

// Define types for map-specific event structure
export interface MapEvent extends EventData {
  marker?: {
    color?: string;
    icon?: string;
  };
  isVisible?: boolean; // Whether the marker should be displayed
}

// Define filter types
export interface EventFilter {
  eventTypes?: string[];
  startDate?: Date;
  endDate?: Date;
  creatorId?: string;
  isPaid?: boolean;
  tags?: string[];
  searchText?: string;
  locationIds?: string[];
}

// Define the Kafka message structure
export interface EventMessage {
  type: CalendarEventType;
  eventId: string;
  userId?: string;
  timestamp: string;
  data: any;
}

/**
 * Custom hook for subscribing to and handling calendar event updates
 * via Kafka
 */
export const useEventUpdates = (
  initialFilters: EventFilter = {}
) => {
  // Separate states for calendar and map data
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [mapEvents, setMapEvents] = useState<MapEvent[]>([]);
  const [filters, setFilters] = useState<EventFilter>(initialFilters);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [consumer, setConsumer] = useState<KafkaConsumer | null>(null);

  // Convert raw event data to calendar and map formats
  const processEventData = useCallback((eventData: any): { 
    calendarEvent: CalendarEvent, 
    mapEvent: MapEvent 
  } => {
    // Base event data shared between formats
    const baseEvent: EventData = {
      eventId: eventData.eventId || eventData.id,
      title: eventData.title,
      description: eventData.description,
      startTime: new Date(eventData.startTime),
      endTime: new Date(eventData.endTime),
      location: eventData.location,
      creatorId: eventData.creatorId,
      isRecurring: eventData.isRecurring || false,
      recurringPattern: eventData.recurringPattern,
      eventType: eventData.eventType,
      isPaid: eventData.isPaid || false,
      price: eventData.price,
      maxParticipants: eventData.maxParticipants,
      participants: eventData.participants,
      tags: eventData.tags,
    };

    // Format for calendar display
    const calendarEvent: CalendarEvent = {
      ...baseEvent,
      color: getEventColor(eventData.eventType),
      allDay: 
        new Date(eventData.endTime).getTime() - 
        new Date(eventData.startTime).getTime() >= 86400000, // 24 hours
    };

    // Format for map display
    const mapEvent: MapEvent = {
      ...baseEvent,
      isVisible: true,
      marker: {
        color: getEventColor(eventData.eventType),
        icon: getEventIcon(eventData.eventType),
      },
    };

    return { calendarEvent, mapEvent };
  }, []);

  // Helper function to get color based on event type
  const getEventColor = (eventType: string): string => {
    const colorMap: Record<string, string> = {
      'meeting': '#4285F4', // blue
      'workshop': '#EA4335', // red
      'conference': '#FBBC04', // yellow
      'social': '#34A853', // green
      'activity': '#8C48BB', // purple
      'other': '#A5ACBA', // gray
    };
    
    return colorMap[eventType?.toLowerCase()] || colorMap.other;
  };

  // Helper function to get icon based on event type
  const getEventIcon = (eventType: string): string => {
    const iconMap: Record<string, string> = {
      'meeting': 'meeting',
      'workshop': 'workshop',
      'conference': 'conference',
      'social': 'social',
      'activity': 'activity',
      'other': 'event',
    };
    
    return iconMap[eventType?.toLowerCase()] || iconMap.other;
  };

  // Apply filters to events
  const applyFilters = useCallback((events: EventData[], filters: EventFilter): EventData[] => {
    return events.filter(event => {
      // Filter by event type
      if (filters.eventTypes && filters.eventTypes.length > 0 && 
          !filters.eventTypes.includes(event.eventType)) {
        return false;
      }
      
      // Filter by date range
      if (filters.startDate && new Date(event.endTime) < filters.startDate) {
        return false;
      }
      if (filters.endDate && new Date(event.startTime) > filters.endDate) {
        return false;
      }
      
      // Filter by creator
      if (filters.creatorId && event.creatorId !== filters.creatorId) {
        return false;
      }
      
      // Filter by paid status
      if (filters.isPaid !== undefined && event.isPaid !== filters.isPaid) {
        return false;
      }
      
      // Filter by tags
      if (filters.tags && filters.tags.length > 0 && 
          (!event.tags || !filters.tags.some(tag => event.tags?.includes(tag)))) {
        return false;
      }
      
      // Filter by search text
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase();
        const titleMatch = event.title.toLowerCase().includes(searchText);
        const descMatch = event.description?.toLowerCase().includes(searchText) || false;
        
        if (!titleMatch && !descMatch) {
          return false;
        }
      }
      
      // Filter by location
      if (filters.locationIds && filters.locationIds.length > 0 && 
          (!event.location?.id || !filters.locationIds.includes(event.location.id))) {
        return false;
      }
      
      return true;
    });
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<EventFilter>) => {
    setFilters(prevFilters => {
      const updatedFilters = { ...prevFilters, ...newFilters };
      return updatedFilters;
    });
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Handler for new Kafka messages
  const handleCalendarUpdate = useCallback(async (message: any) => {
    try {
      if (!message.value) return;
      
      const eventMessage = JSON.parse(message.value.toString()) as EventMessage;
      console.log('Received event update:', eventMessage.type, eventMessage.eventId);
      
      switch (eventMessage.type) {
        case CalendarEventType.CREATE:
          // Handle new event creation
          const { calendarEvent, mapEvent } = processEventData(eventMessage.data);
          
          setCalendarEvents(prev => [...prev, calendarEvent]);
          setMapEvents(prev => [...prev, mapEvent]);
          break;
          
        case CalendarEventType.UPDATE:
          // Handle event update
          if (eventMessage.data && eventMessage.data.event) {
            const { calendarEvent, mapEvent } = processEventData(eventMessage.data.event);
            
            setCalendarEvents(prev => 
              prev.map(event => event.eventId === eventMessage.eventId ? calendarEvent : event)
            );
            setMapEvents(prev => 
              prev.map(event => event.eventId === eventMessage.eventId ? mapEvent : event)
            );
          }
          break;
          
        case CalendarEventType.DELETE:
          // Handle event deletion
          setCalendarEvents(prev => 
            prev.filter(event => event.eventId !== eventMessage.eventId)
          );
          setMapEvents(prev => 
            prev.filter(event => event.eventId !== eventMessage.eventId)
          );
          break;
          
        case CalendarEventType.REGISTER:
        case CalendarEventType.UNREGISTER:
        case CalendarEventType.PAYMENT:
          // Update participant information
          // We'll need to fetch the updated event data to refresh participants
          try {
            const response = await fetch(`/api/events/${eventMessage.eventId}`);
            if (response.ok) {
              const updatedEvent = await response.json();
              const { calendarEvent, mapEvent } = processEventData(updatedEvent);
              
              setCalendarEvents(prev => 
                prev.map(event => event.eventId === eventMessage.eventId ? calendarEvent : event)
              );
              setMapEvents(prev => 
                prev.map(event => event.eventId === eventMessage.eventId ? mapEvent : event)
              );
            }
          } catch (error) {
            console.error("Failed to fetch updated event data:", error);
          }
          break;
          
        default:
          console.log(`Unhandled event type: ${eventMessage.type}`);
      }
    } catch (error) {
      console.error("Error processing Kafka message:", error);
      setError(error instanceof Error ? error : new Error('Unknown error processing message'));
    }
  }, [processEventData]);

  // Initialize event data
  const fetchInitialEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/events');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process and filter the initial data
      const processedCalendarEvents: CalendarEvent[] = [];
      const processedMapEvents: MapEvent[] = [];
      
      for (const event of data) {
        const { calendarEvent, mapEvent } = processEventData(event);
        processedCalendarEvents.push(calendarEvent);
        processedMapEvents.push(mapEvent);
      }
      
      // Apply filters
      const filteredCalendarEvents = applyFilters(processedCalendarEvents, filters);
      const filteredMapEvents = applyFilters(processedMapEvents, filters);
      
      setCalendarEvents(filteredCalendarEvents as CalendarEvent[]);
      setMapEvents(filteredMapEvents as MapEvent[]);
    } catch (error) {
      console.error("Error fetching initial events:", error);
      setError(error instanceof Error ? error : new Error('Failed to fetch initial events'));
    } finally {
      setIsLoading(false);
    }
  }, [processEventData, applyFilters, filters]);

  // Apply filters when they change
  useEffect(() => {
    // Apply filters to existing event data
    const applyCurrentFilters = async () => {
      try {
        // Re-fetch from the API if we need server-side filtering
        if (filters.searchText || filters.tags || filters.locationIds) {
          await fetchInitialEvents();
          return;
        }
        
        // Otherwise, apply filters client-side
        setCalendarEvents(prev => 
          applyFilters(prev, filters) as CalendarEvent[]
        );
        setMapEvents(prev => 
          applyFilters(prev, filters) as MapEvent[]
        );
      } catch (error) {
        console.error("Error applying filters:", error);
        setError(error instanceof Error ? error : new Error('Error applying filters'));
      }
    };
    
    applyCurrentFilters();
  }, [filters, applyFilters, fetchInitialEvents]);

  // Setup Kafka consumer on mount
  useEffect(() => {
    const setupConsumer = async () => {
      try {
        const calendarConsumer = new KafkaConsumer(
          KAFKA_CONSUMER_GROUPS.CALENDAR,
          [KAFKA_TOPICS.CALENDAR_UPDATES],
          {
            autoCommit: true,
            autoCommitInterval: 5000,
            maxInFlightRequests: 5,
          }
        );
        
        calendarConsumer.onMessage(KAFKA_TOPICS.CALENDAR_UPDATES, handleCalendarUpdate);
        await calendarConsumer.connect();
        await calendarConsumer.start();
        
        setConsumer(calendarConsumer);
        setError(null);
        
        // Fetch initial data
        await fetchInitialEvents();
      } catch (error) {
        console.error("Error setting up Kafka consumer:", error);
        setError(error instanceof Error ? error : new Error('Failed to connect to event updates'));
        setIsLoading(false);
      }
    };
    
    setupConsumer();
    
    // Cleanup function
    return () => {
      if (consumer) {
        consumer.disconnect().catch(err => {
          console.error("Error disconnecting Kafka consumer:", err);
        });
      }
    };
  }, [handleCalendarUpdate, fetchInitialEvents]);

  // Return the hook API
  return {
    calendarEvents,
    mapEvents,
    isLoading,
    error,
    filters,
    updateFilters,
    resetFilters,
  };
};

export default useEventUpdates;

import { useState, useEffect, useCallback, useRef } from 'react';
import { Event, Location, EventType } from '@/types/calendar';
import { TimeSlot } from '@/components/calendar/Calendar';

// Define types for Kafka event messages
export interface KafkaEventMessage {
  id: string;
  type: 'event_created' | 'event_updated' | 'event_deleted' | 'location_updated';
  payload: Event | Location | { eventId: string };
  timestamp: string;
}

export interface EventUpdate {
  type: 'event_created' | 'event_updated' | 'event_deleted';
  event?: Event;
  eventId?: string;
}

export interface LocationUpdate {
  type: 'location_updated';
  location: Location;
}

export type EventStreamUpdate = EventUpdate | LocationUpdate;

export interface EventStreamOptions {
  // Base URL for Kafka event stream (websocket)
  baseUrl?: string;
  // Topic to subscribe to
  topic?: string;
  // Reconnection delay in ms
  reconnectDelay?: number;
  // Max reconnection attempts (0 = infinite)
  maxReconnectAttempts?: number;
  // Optional auth token
  authToken?: string;
  // Auto-connect on hook initialization
  autoConnect?: boolean;
}

export interface EventStreamState {
  connected: boolean;
  error: Error | null;
  lastUpdate: EventStreamUpdate | null;
  isReconnecting: boolean;
  reconnectAttempts: number;
}

const defaultOptions: EventStreamOptions = {
  baseUrl: process.env.NEXT_PUBLIC_KAFKA_STREAM_URL || 'wss://events.example.com/stream',
  topic: 'calendar-events',
  reconnectDelay: 2000,
  maxReconnectAttempts: 5,
  autoConnect: true,
};

/**
 * Custom hook for subscribing to Kafka event streams for real-time event updates
 */
export const useEventUpdates = (
  options: EventStreamOptions = {},
  onUpdate?: (update: EventStreamUpdate) => void
) => {
  const mergedOptions = { ...defaultOptions, ...options };
  const [state, setState] = useState<EventStreamState>({
    connected: false,
    error: null,
    lastUpdate: null,
    isReconnecting: false,
    reconnectAttempts: 0,
  });

  // Use refs for websocket and options to avoid dependency issues in useEffect
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(mergedOptions);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Update refs when props change
  useEffect(() => {
    optionsRef.current = { ...defaultOptions, ...options };
  }, [options]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Convert Event to TimeSlot (for calendar compatibility)
  const eventToTimeSlot = useCallback((event: Event): TimeSlot => {
    let typeId = 1; // Default
    
    // Map event type to type ID (matching EVENT_TYPES from filters.ts)
    switch (event.type) {
      case 'Relax and Wellness':
        typeId = 1;
        break;
      case 'Outdoor and Active':
        typeId = 2;
        break;
      case 'Beach and Sun': 
        typeId = 3;
        break;
      case 'Drinks and Nightlife':
        typeId = 4;
        break;
      case 'Food and Family':
        typeId = 5;
        break;
      case 'Accommodation':
        typeId = 6;
        break;
    }

    return {
      id: event.id.toString(),
      title: event.title,
      start: event.start,
      end: event.end,
      typeId,
      location: event.location,
      isPaid: event.isPaid,
      isTeacher: event.instructorId !== '',
      isHighlyAcknowledged: event.isHighlyAcknowledged,
      userJoined: event.participants.length > 0,
      description: event.description,
      price: event.price,
    };
  }, []);

  // Handle Kafka message
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: KafkaEventMessage = JSON.parse(event.data);
      let update: EventStreamUpdate;

      switch (message.type) {
        case 'event_created':
        case 'event_updated':
          update = {
            type: message.type,
            event: message.payload as Event,
          };
          break;
        case 'event_deleted':
          update = {
            type: 'event_deleted',
            eventId: (message.payload as { eventId: string }).eventId,
          };
          break;
        case 'location_updated':
          update = {
            type: 'location_updated',
            location: message.payload as Location,
          };
          break;
        default:
          console.warn('Unknown event type:', message.type);
          return;
      }

      setState(prev => ({
        ...prev,
        lastUpdate: update,
      }));

      // Call the callback if provided
      if (onUpdateRef.current) {
        onUpdateRef.current(update);
      }
    } catch (error) {
      console.error('Error processing Kafka message:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    }
  }, []);

  // Connect to Kafka stream
  const connect = useCallback(() => {
    // Clean up any existing connection first
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const { baseUrl, topic, authToken } = optionsRef.current;
    
    try {
      const url = new URL(`${baseUrl}`);
      if (topic) {
        url.searchParams.append('topic', topic);
      }
      
      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      // Add authentication if provided
      if (authToken) {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'auth', token: authToken }));
        };
      }

      // Set up event handlers
      ws.onmessage = handleMessage;
      
      ws.onopen = () => {
        setState(prev => ({
          ...prev,
          connected: true,
          error: null,
          isReconnecting: false,
          reconnectAttempts: 0,
        }));
        console.log(`Connected to Kafka stream: ${topic}`);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: new Error('WebSocket connection error'),
          connected: false,
        }));
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed with code ${event.code}`);
        setState(prev => ({
          ...prev,
          connected: false,
        }));

        // Attempt to reconnect
        const { maxReconnectAttempts, reconnectDelay } = optionsRef.current;
        const shouldReconnect = 
          maxReconnectAttempts === 0 || 
          state.reconnectAttempts < maxReconnectAttempts;

        if (shouldReconnect) {
          setState(prev => ({
            ...prev,
            isReconnecting: true,
            reconnectAttempts: prev.reconnectAttempts + 1,
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${state.reconnectAttempts + 1}/${maxReconnectAttempts || 'infinite'})`);
            connect();
          }, reconnectDelay);
        } else {
          setState(prev => ({
            ...prev,
            isReconnecting: false,
            error: new Error(`Failed to reconnect after ${maxReconnectAttempts} attempts`),
          }));
        }
      };
    } catch (error) {
      console.error('Error connecting to Kafka stream:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
        connected: false,
      }));
    }
  }, [handleMessage, state.reconnectAttempts]);

  // Disconnect from Kafka stream
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      connected: false,
      isReconnecting: false,
    }));
  }, []);

  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (optionsRef.current.autoConnect) {
      connect();
    }

    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Return the current state and control functions
  return {
    ...state,
    connect,
    disconnect,
    eventToTimeSlot,
  };
};

export default useEventUpdates;

import { useState, useEffect, useCallback } from 'react';
import { KafkaClient, Consumer } from 'kafka-node';
import { TimeSlot } from '@/types/calendar';

// Define types for Kafka event payloads
export interface LocationUpdateEvent {
  type: 'location_update';
  locationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface EventUpdateEvent {
  type: 'event_update';
  eventId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  locationId: string;
  eventType: string;
  updatedAt: string;
}

export interface EventDeleteEvent {
  type: 'event_delete';
  eventId: string;
}

export type KafkaEvent = LocationUpdateEvent | EventUpdateEvent | EventDeleteEvent;

export interface EventUpdate {
  type: 'add' | 'update' | 'delete';
  event?: TimeSlot;
}

interface UseEventUpdatesOptions {
  onUpdate?: (update: EventUpdate) => void;
  enabled?: boolean;
}

export function useEventUpdates({ onUpdate, enabled = true }: UseEventUpdatesOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [consumer, setConsumer] = useState<Consumer | null>(null);

  // Process incoming Kafka messages
  const processMessage = useCallback((message: { value: string }) => {
    try {
      const event: KafkaEvent = JSON.parse(message.value);
      
      switch (event.type) {
        case 'location_update':
          // Handle location updates
          console.log('Location update received:', event);
          // Typically you'd process this and update any components that need location data
          break;
          
        case 'event_update':
          // Handle event updates by converting to TimeSlot format
          console.log('Event update received:', event);
          
          if (onUpdate) {
            const timeSlot: TimeSlot = {
              id: event.eventId,
              title: event.title,
              description: event.description,
              start: new Date(event.startTime),
              end: new Date(event.endTime),
              locationId: event.locationId,
              type: event.eventType,
            };
            
            onUpdate({
              type: 'update',
              event: timeSlot
            });
          }
          break;
          
        case 'event_delete':
          // Handle event deletions
          console.log('Event deletion received:', event);
          
          if (onUpdate) {
            onUpdate({
              type: 'delete',
              event: { id: event.eventId } as TimeSlot
            });
          }
          break;
          
        default:
          console.warn('Unknown event type received');
      }
    } catch (e) {
      console.error('Error processing Kafka message:', e);
      setError(e instanceof Error ? e : new Error('Unknown error processing message'));
    }
  }, [onUpdate]);

  // Connect to Kafka
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Create Kafka client
    const client = new KafkaClient({ 
      kafkaHost: process.env.NEXT_PUBLIC_KAFKA_BROKERS || 'localhost:9092' 
    });

    // Create consumer
    const kafkaConsumer = new Consumer(
      client,
      [
        { topic: 'event-updates', partition: 0 },
        { topic: 'location-updates', partition: 0 }
      ],
      {
        autoCommit: true,
        groupId: `event-consumer-${Math.random().toString(36).substring(2, 10)}`
      }
    );

    // Handle connection
    kafkaConsumer.on('ready', () => {
      console.log('Kafka consumer connected and ready');
      setIsConnected(true);
      setError(null);
    });

    // Handle errors
    kafkaConsumer.on('error', (err) => {
      console.error('Kafka consumer error:', err);
      setError(err);
      setIsConnected(false);
    });

    // Handle messages
    kafkaConsumer.on('message', processMessage);

    // Store consumer reference
    setConsumer(kafkaConsumer);

    // Cleanup on unmount
    return () => {
      if (kafkaConsumer) {
        console.log('Closing Kafka consumer');
        kafkaConsumer.close(true, () => {
          console.log('Kafka consumer closed');
        });
      }
    };
  }, [enabled, processMessage]);

  // Method to manually reconnect
  const reconnect = useCallback(() => {
    if (consumer) {
      consumer.close(true, () => {
        setConsumer(null);
        setIsConnected(false);
        // The useEffect above will trigger again and reconnect
      });
    }
  }, [consumer]);

  return { isConnected, error, reconnect };
}

export default useEventUpdates;

