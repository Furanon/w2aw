import React, { useState, useEffect } from 'react';
import { Calendar } from './Calendar';
import { MapView } from './MapView';
import { FilterBar } from './FilterBar';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Event, Location } from '@/types/calendar';
import { FilterState } from '@/types/filters';

interface CalendarAndMapViewProps {
  initialEvents?: Event[];
  onEventSelect?: (event: Event) => void;
}

export const CalendarAndMapView: React.FC<CalendarAndMapViewProps> = ({
  initialEvents = [],
  onEventSelect,
}) => {
  // Shared state for events and locations
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(initialEvents);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Shared filter state
  const [filterState, setFilterState] = useState<FilterState>({
    eventTypes: [],
    searchTerm: '',
    startDate: null,
    endDate: null,
    location: null,
  });

  // Selected event/marker state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Fetch locations data (assuming this would connect to Kafka in production)
  useEffect(() => {
    // This would be replaced with actual API call or subscription
    const fetchLocations = async () => {
      try {
        // Mock implementation - in real app, would fetch from API
        // and potentially subscribe to Kafka events
        const eventLocations = events
          .map(event => event.location)
          .filter((location): location is Location => !!location);
        
        setLocations(eventLocations);
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };

    if (events.length > 0) {
      fetchLocations();
    }
  }, [events]);

  // Apply filters to events
  useEffect(() => {
    let result = [...events];
    
    // Filter by event type
    if (filterState.eventTypes.length > 0) {
      result = result.filter(event => 
        filterState.eventTypes.includes(event.type)
      );
    }
    
    // Filter by search term
    if (filterState.searchTerm) {
      const searchLower = filterState.searchTerm.toLowerCase();
      result = result.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by date range
    if (filterState.startDate) {
      result = result.filter(event => 
        new Date(event.startDate) >= filterState.startDate!
      );
    }
    
    if (filterState.endDate) {
      result = result.filter(event => 
        new Date(event.startDate) <= filterState.endDate!
      );
    }
    
    // Filter by location
    if (filterState.location) {
      result = result.filter(event => 
        event.location?.id === filterState.location?.id
      );
    }
    
    setFilteredEvents(result);
  }, [events, filterState]);

  // Handle filter changes
  const handleFilterChange = (newFilterState: FilterState) => {
    setFilterState(newFilterState);
  };

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

  return (
    <Container className="py-6">
      <div className="space-y-4">
        <Card className="p-4">
          <FilterBar 
            filterState={filterState} 
            onFilterChange={handleFilterChange} 
          />
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Calendar</h2>
            <Calendar 
              events={filteredEvents}
              selectedEventId={selectedEventId}
              onEventSelect={handleCalendarEventSelect}
            />
          </Card>
          
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Map</h2>
            <MapView 
              events={filteredEvents}
              locations={locations}
              selectedEventId={selectedEventId}
              onMarkerSelect={handleMapMarkerSelect}
              onRegionChange={handleMapRegionChange}
            />
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default CalendarAndMapView;

