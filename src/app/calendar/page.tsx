'use client';

import { useState, useEffect } from 'react';
import VideoBackground from '@/components/calendar/VideoBackground';
import Calendar from '@/components/calendar/Calendar';
import { Providers } from '@/components/Providers';
import { Event } from '@/types/calendar';

// Sample calendar events data structure
const sampleEvents: Event[] = [
  {
    id: 1,
    title: 'Aerial Silks Beginner',
    start: new Date(2023, 9, 10, 10, 0),
    end: new Date(2023, 9, 10, 12, 0),
    type: 'Outdoor and Active',
    isPaid: true,
    price: 25,
    location: 'Studio A',
    instructorId: 'inst-001',
    isHighlyAcknowledged: true,
    participants: [],
  },
  {
    id: 2,
    title: 'Trapeze Workshop',
    start: new Date(2023, 9, 12, 14, 0),
    end: new Date(2023, 9, 12, 16, 30),
    type: 'Relax and Wellness',
    isPaid: true,
    price: 35,
    location: 'Main Hall',
    instructorId: 'inst-002',
    isHighlyAcknowledged: false,
    participants: [],
  },
  {
    id: 3,
    title: 'Juggling Social',
    start: new Date(2023, 9, 15, 18, 0),
    end: new Date(2023, 9, 15, 20, 0),
    type: 'Food and Family',
    isPaid: false,
    price: 0,
    location: 'Outdoor Tent',
    instructorId: 'inst-003',
    isHighlyAcknowledged: false,
    participants: ['user-001'],
  },
];

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // In a real app, this would fetch events from an API
    setEvents(sampleEvents);
  }, []);

  const handleAddEvent = (newEvent: Event) => {
    setEvents([...events, newEvent]);
  };

  const handleUpdateEvent = (updatedEvent: Event) => {
    setEvents(events.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ));
  };

  const handleJoinEvent = (eventId: number, userId: string) => {
    setEvents(events.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          participants: [...event.participants, userId]
        };
      }
      return event;
    }));
  };

  return (
    <Providers>
      <div className="relative min-h-screen w-full">
        <VideoBackground videoSrc="/videos/circus-background.mp4">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-white text-center mb-8">
              Circus School Calendar
            </h1>
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6">
              <Calendar 
                events={events} 
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onJoinEvent={handleJoinEvent}
              />
            </div>
            
            <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Location Map</h2>
              <div className="h-96 bg-gray-200 rounded-lg">
                {/* Map component will be added here */}
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Map loading...</p>
                </div>
              </div>
            </div>
          </div>
        </VideoBackground>
      </div>
    </Providers>
  );
}

