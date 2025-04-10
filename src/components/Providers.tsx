'use client';

import { ReactNode, createContext, useState, useContext } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster, toast } from 'sonner';

/**
 * Calendar Context Types
 */
type EventType = 'relax' | 'outdoor' | 'beach' | 'nightlife' | 'food' | 'accommodation';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  eventType: EventType;
  location: string;
  price?: number;
  isPaid: boolean;
  isTeacher: boolean;
  isHighlyAcknowledged?: boolean;
  hasJoined?: boolean;
  isRecurring?: boolean;
  recurringId?: string;
}

interface CalendarContextType {
  events: CalendarEvent[];
  filteredTypes: EventType[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (eventId: string) => void;
  joinEvent: (eventId: string) => void;
  setFilteredTypes: (types: EventType[]) => void;
}

/**
 * Calendar Context
 * 
 * Provides state management for calendar events, filtering, and user interactions
 */
const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

/**
 * Calendar Provider Component
 * 
 * Manages the state for calendar events and provides methods for manipulating events
 */
const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<EventType[]>([]);

  const addEvent = (event: CalendarEvent) => {
    try {
      // Here you would typically make an API call to persist the event
      // For now, we're just updating the local state
      setEvents([...events, event]);
      toast.success('Event added successfully', {
        description: `${event.title} has been added to your calendar.`
      });
    } catch (error) {
      toast.error('Failed to add event', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  const updateEvent = (updatedEvent: CalendarEvent) => {
    try {
      // Here you would typically make an API call to update the event
      setEvents(events.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      ));
      toast.success('Event updated successfully', {
        description: `Changes to "${updatedEvent.title}" have been saved.`
      });
    } catch (error) {
      toast.error('Failed to update event', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  const deleteEvent = (eventId: string) => {
    try {
      // Find the event title before removing it to use in the success message
      const eventToDelete = events.find(event => event.id === eventId);
      
      // Here you would typically make an API call to delete the event
      setEvents(events.filter(event => event.id !== eventId));
      
      if (eventToDelete) {
        toast.success('Event deleted', {
          description: `"${eventToDelete.title}" has been removed from your calendar.`
        });
      }
    } catch (error) {
      toast.error('Failed to delete event', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  const joinEvent = (eventId: string) => {
    try {
      const eventToJoin = events.find(event => event.id === eventId);
      
      // Here you would typically make an API call to register for the event
      setEvents(events.map(event => 
        event.id === eventId ? { ...event, hasJoined: true } : event
      ));
      
      if (eventToJoin) {
        toast.success('Successfully joined event', {
          description: `You've registered for "${eventToJoin.title}".`
        });
      }
    } catch (error) {
      toast.error('Failed to join event', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  return (
    <CalendarContext.Provider value={{ 
      events, 
      filteredTypes, 
      addEvent, 
      updateEvent, 
      deleteEvent, 
      joinEvent, 
      setFilteredTypes 
    }}>
      {children}
    </CalendarContext.Provider>
  );
};

/**
 * Props for the Providers component
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers Component
 * 
 * A central component that wraps the application with all necessary context providers:
 * 
 * - SessionProvider: Manages authentication state from NextAuth
 * - CalendarProvider: Manages calendar events, filtering, and interactions
 * 
 * This component should wrap the entire application or specific routes
 * that require access to these contexts.
 * 
 * @param {ReactNode} children - The child components to be wrapped
 * @returns JSX component with all required providers
 */
export default function Providers({ children }: ProvidersProps) {
  return (
    <>
      <SessionProvider>
        <CalendarProvider>
          {children}
        </CalendarProvider>
      </SessionProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg',
        }}
      />
    </>
  );
}
