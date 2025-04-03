import React, { useState, useEffect, useMemo } from 'react';
import { Calendar } from './Calendar';
import { MapView } from './MapView';
import FilterBar from './FilterBar';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Event, Location } from '@/types/calendar';
import { FilterState, DEFAULT_FILTER_STATE, EVENT_TYPES } from '@/types/filters';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
    if (filterState.typeIds.length > 0) {
      result = result.filter(event => 
        filterState.typeIds.includes(event.type)
      );
    }
    
    // Filter by location
    if (filterState.locations.length > 0) {
      result = result.filter(event => 
        event.location && filterState.locations.includes(event.location.name)
      );
    }
    
    // Filter by paid/free status
    if (filterState.showPaidOnly) {
      result = result.filter(event => event.isPaid);
    }
    
    if (filterState.showFreeOnly) {
      result = result.filter(event => !event.isPaid);
    }
    
    // Filter by joined status
    if (filterState.showJoinedOnly) {
      result = result.filter(event => event.userJoined);
    }
    
    // Vector search (keyword search) - simulated for now
    if (filterState.vectorSearch) {
      const searchLower = filterState.vectorSearch.toLowerCase();
      const searchResults = result.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower)
      );
      
      setSearchResults(searchResults);
      
      // Could integrate with actual vector search here
      // For demo, just use simple text matching
    } else {
      setSearchResults([]);
    }
    
    setFilteredEvents(result);
  }, [events, filterState]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilterState(prevState => ({
      ...prevState,
      ...newFilters
    }));
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

  // Get available locations for filter options
  const availableLocations = useMemo(() => {
    return [...new Set(events.map(event => event.location?.name).filter(Boolean))];
  }, [events]);

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

