'use client';

import { ReactNode, createContext, useState, useContext } from 'react';
import { SessionProvider } from 'next-auth/react';

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
    setEvents([...events, event]);
  };

  const updateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(events.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ));
  };

  const deleteEvent = (eventId: string) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  const joinEvent = (eventId: string) => {
    setEvents(events.map(event => 
      event.id === eventId ? { ...event, hasJoined: true } : event
    ));
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
    <SessionProvider>
      <CalendarProvider>
        {children}
      </CalendarProvider>
    </SessionProvider>
  );
}
