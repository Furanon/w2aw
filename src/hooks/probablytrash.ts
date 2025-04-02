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

