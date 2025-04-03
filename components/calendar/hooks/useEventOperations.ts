import { useState } from 'react';
import { useKafka } from '@/hooks/useKafka';
import { 
  EventType, 
  FilterState, 
  PAYMENT_STATUS_TYPES 
} from '@/types/filters';

/**
 * Calendar event structure that aligns with the database schema
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  eventTypeId: number;
  capacity: number;
  price: number;
  createdBy: string;
  updatedAt: Date;
  isPublic: boolean;
}

/**
 * Participant data structure that aligns with event_participants table
 */
export interface EventParticipant {
  userId: string;
  eventId: string;
  joinedAt: Date;
  paymentStatus: string;
  paymentAmount: number;
  paymentDate?: Date;
  notes?: string;
}

/**
 * Parameters for creating a new calendar event
 */
export interface CreateEventParams {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  locationId: string;
  eventTypeId: number;
  capacity: number;
  price: number;
  isPublic: boolean;
}

/**
 * Parameters for updating an existing calendar event
 */
export interface UpdateEventParams extends Partial<Omit<CreateEventParams, 'locationId'>> {
  id: string;
  locationId?: string;
}

/**
 * Result type for operations
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Kafka topic names for calendar events
 */
export const CALENDAR_KAFKA_TOPICS = {
  EVENTS: 'CALENDAR_EVENTS',
  NOTIFICATIONS: 'CALENDAR_NOTIFICATIONS',
  UPDATES: 'CALENDAR_UPDATES',
};

/**
 * Hook for calendar event CRUD operations
 */
export const useEventOperations = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { publishMessage } = useKafka();

  /**
   * Create a new calendar event in the database
   */
  const createEvent = async (
    eventData: CreateEventParams
  ): Promise<OperationResult<CalendarEvent>> => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the database API to create the event
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create event');
      }
      
      const createdEvent = await response.json();
      
      // Publish event creation to Kafka
      await publishMessage(CALENDAR_KAFKA_TOPICS.EVENTS, {
        type: 'EVENT_CREATED',
        payload: createdEvent,
        timestamp: new Date().toISOString(),
      });
      
      // Publish notification for event creation
      await publishMessage(CALENDAR_KAFKA_TOPICS.NOTIFICATIONS, {
        type: 'NEW_EVENT_CREATED',
        payload: {
          eventId: createdEvent.id,
          createdBy: createdEvent.createdBy,
          eventTitle: createdEvent.title,
        },
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
        data: createdEvent,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while creating the event';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing calendar event
   */
  const updateEvent = async (
    eventData: UpdateEventParams
  ): Promise<OperationResult<CalendarEvent>> => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the database API to update the event
      const response = await fetch(`/api/calendar/events/${eventData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update event');
      }
      
      const updatedEvent = await response.json();
      
      // Publish event update to Kafka
      await publishMessage(CALENDAR_KAFKA_TOPICS.EVENTS, {
        type: 'EVENT_UPDATED',
        payload: updatedEvent,
        timestamp: new Date().toISOString(),
      });
      
      // Publish notification for event update
      await publishMessage(CALENDAR_KAFKA_TOPICS.NOTIFICATIONS, {
        type: 'EVENT_DETAILS_CHANGED',
        payload: {
          eventId: updatedEvent.id,
          updatedBy: updatedEvent.createdBy, // Assuming the owner is updating it
          eventTitle: updatedEvent.title,
          changedFields: Object.keys(eventData).filter(key => key !== 'id'),
        },
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
        data: updatedEvent,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while updating the event';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a calendar event by ID
   */
  const deleteEvent = async (
    eventId: string
  ): Promise<OperationResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get event details before deletion for notification
      const eventResponse = await fetch(`/api/calendar/events/${eventId}`);
      if (!eventResponse.ok) {
        throw new Error('Failed to fetch event details for deletion');
      }
      const eventDetails = await eventResponse.json();
      
      // Call the database API to delete the event
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete event');
      }
      
      // Publish event deletion to Kafka
      await publishMessage(CALENDAR_KAFKA_TOPICS.EVENTS, {
        type: 'EVENT_DELETED',
        payload: {
          eventId,
          deletedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
      
      // Publish notification for event deletion
      await publishMessage(CALENDAR_KAFKA_TOPICS.NOTIFICATIONS, {
        type: 'EVENT_CANCELLED',
        payload: {
          eventId,
          eventTitle: eventDetails.title,
          deletedBy: eventDetails.createdBy,
          participantIds: eventDetails.participants?.map((p: any) => p.userId) || [],
        },
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while deleting the event';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a participant to an event
   */
  const addParticipant = async (
    eventId: string, 
    userId: string,
    paymentStatus: string = PAYMENT_STATUS_TYPES.PENDING,
    paymentAmount: number = 0
  ): Promise<OperationResult<EventParticipant>> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get event details for validation and notification
      const eventResponse = await fetch(`/api/calendar/events/${eventId}`);
      if (!eventResponse.ok) {
        throw new Error('Failed to fetch event details');
      }
      const eventDetails = await eventResponse.json();
      
      // Check if event has capacity
      if (eventDetails.capacity <= eventDetails.participants?.length) {
        throw new Error('Event has reached maximum capacity');
      }
      
      // Call the database API to add participant
      const response = await fetch(`/api/calendar/events/${eventId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          paymentStatus,
          paymentAmount: paymentAmount || eventDetails.price,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add participant');
      }
      
      const participantData = await response.json();
      
      // Publish participant addition to Kafka
      await publishMessage(CALENDAR_KAFKA_TOPICS.EVENTS, {
        type: 'PARTICIPANT_ADDED',
        payload: {
          eventId,
          userId,
          paymentStatus,
          joinedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
      
      // Publish notification for joining
      await publishMessage(CALENDAR_KAFKA_TOPICS.NOTIFICATIONS, {
        type: 'USER_JOINED_EVENT',
        payload: {
          eventId,
          eventTitle: eventDetails.title,
          userId,
          hostId: eventDetails.createdBy,
        },
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
        data: participantData,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while adding participant';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove a participant from an event
   */
  const removeParticipant = async (
    eventId: string, 
    userId: string
  ): Promise<OperationResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get event details for notifications
      const eventResponse = await fetch(`/api/calendar/events/${eventId}`);
      if (!eventResponse.ok) {
        throw new Error('Failed to fetch event details');
      }
      const eventDetails = await eventResponse.json();
      
      // Call the database API to remove participant
      const response = await fetch(`/api/calendar/events/${eventId}/participants/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove participant');
      }
      
      // Publish participant removal to Kafka
      await publishMessage(CALENDAR_KAFKA_TOPICS.EVENTS, {
        type: 'PARTICIPANT_REMOVED',
        payload: {
          eventId,
          userId,
          removedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
      
      // Publish notification for leaving
      await publishMessage(CALENDAR_KAFKA_TOPICS.NOTIFICATIONS, {
        type: 'USER_LEFT_EVENT',
        payload: {
          eventId,
          eventTitle: eventDetails.title,
          userId,
          hostId: eventDetails.createdBy,
        },
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: true,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while removing participant';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update participant details (e.g., payment status)
   */
  const updateParticipant = async (
    eventId: string,
    userId: string,
    updates: {
      paymentStatus?: string;
      paymentAmount?: number;
      paymentDate?: Date;
      notes?: string;
    }
  ): Promise<OperationResult<EventParticipant>> => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the database API to update participant details
      const response = await fetch(`/api/calendar/events/${eventId}/participants/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update participant');
      }
      
      const updatedParticipant = await response.json();
      
      // If payment status is updated to paid, publish a payment confirmation
      if (updates.paymentStatus === PAYMENT_STATUS_TYPES.PAID) {
        await publishMessage(CALENDAR_KAFKA_TOPICS.EVENTS, {
          type: 'PAYMENT_CONFIRMED',
          payload: {
            eventId,
            userId,
            paymentAmount: updates.paymentAmount,
            paymentDate: updates.paymentDate || new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
        
        // Get event details for notification
        const eventResponse = await fetch(`/api/calendar/events/${eventId}`);
        if (eventResponse.ok) {
          const eventDetails = await eventResponse.json();
          
          // Publish payment confirmation notification
          await publishMessage(CALENDAR_KAFKA_TOPICS.NOTIFICATIONS, {
            type: 'PAYMENT_RECEIVED',
            payload: {
              eventId,
              eventTitle: eventDetails.title,
              userId,
              hostId: eventDetails.createdBy,
              amount: updates.paymentAmount,
              date: updates.paymentDate || new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
      
      return {
        success: true,
        data: updatedParticipant,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while updating participant';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };

