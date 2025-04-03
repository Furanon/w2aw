'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FilterState } from '@/types/filters';

// Re-use TimeSlot interface from Calendar component
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
  // Optional geolocation for the marker
  coordinates?: [number, number]; // [latitude, longitude]
}

interface MapViewProps {
  timeSlots: TimeSlot[];
  filters?: FilterState;
  onFilterChange?: (newFilters: Partial<FilterState>) => void;
  onMarkerClick?: (timeSlot: TimeSlot) => void;
  selectedTimeSlotId?: string;
}

// Helper component to recenter map when locations change
const MapUpdater = ({ 
  coordinates, 
  zoom = 13 
}: { 
  coordinates: [number, number]; 
  zoom?: number;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (coordinates) {
      map.setView(coordinates, zoom);
    }
  }, [coordinates, map, zoom]);
  
  return null;
};

// Custom marker icon
const createCustomIcon = (color: string = '#007bff') => {
  return new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Map marker for each location
interface LocationMarker {
  id: string;
  name: string;
  coordinates: [number, number];
  events: TimeSlot[];
}

export const MapView: React.FC<MapViewProps> = ({
  timeSlots,
  filters,
  onFilterChange,
  onMarkerClick,
  selectedTimeSlotId
}) => {
  const [activeLocation, setActiveLocation] = useState<[number, number] | null>(null);
  
  // Default center if no events with coordinates are available
  const defaultCenter: [number, number] = [51.505, -0.09]; // London as default
  
  // Group timeSlots by location and extract coordinates
  const locationMarkers = useMemo(() => {
    const locationMap = new Map<string, LocationMarker>();
    
    // Sample coordinates for demo locations if not provided
    const sampleCoordinates: Record<string, [number, number]> = {
      'Location 1': [51.505, -0.09],
      'Location 2': [51.51, -0.1],
      'Location 3': [51.515, -0.09],
      'Location 4': [51.52, -0.08],
      'Location 5': [51.525, -0.085],
    };
    
    timeSlots.forEach(slot => {
      // Skip events without location
      if (!slot.location) return;
      
      const locationName = slot.location;
      const locationId = locationName.replace(/\s+/g, '-').toLowerCase();
      
      // Get coordinates from the slot if available, or use sample coordinates
      const coordinates = slot.coordinates || sampleCoordinates[locationName] || defaultCenter;
      
      if (locationMap.has(locationId)) {
        // Add event to existing location
        locationMap.get(locationId)?.events.push(slot);
      } else {
        // Create new location entry
        locationMap.set(locationId, {
          id: locationId,
          name: locationName,
          coordinates,
          events: [slot]
        });
      }
    });
    
    return Array.from(locationMap.values());
  }, [timeSlots, defaultCenter]);
  
  // Set initial active location from the first location with events
  useEffect(() => {
    if (locationMarkers.length > 0 && !activeLocation) {
      setActiveLocation(locationMarkers[0].coordinates);
    }
    
    // If there's a selected time slot, find and set its location as active
    if (selectedTimeSlotId) {
      for (const marker of locationMarkers) {
        const selectedEvent = marker.events.find(e => e.id === selectedTimeSlotId);
        if (selectedEvent) {
          setActiveLocation(marker.coordinates);
          break;
        }
      }
    }
  }, [locationMarkers, selectedTimeSlotId, activeLocation]);
  
  // Format date for display
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle marker click
  const handleMarkerClick = (marker: LocationMarker) => {
    setActiveLocation(marker.coordinates);
    
    // If there's only one event at this location and onMarkerClick is provided,
    // automatically select that event
    if (marker.events.length === 1 && onMarkerClick) {
      onMarkerClick(marker.events[0]);
    }
  };
  
  // Handle event click within popup
  const handleEventClick = (event: TimeSlot) => {
    if (onMarkerClick) {
      onMarkerClick(event);
    }
  };
  
  // If we don't have any markers with coordinates, show a message
  if (locationMarkers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-100 rounded-lg">
        <p className="text-gray-500">No events with location data to display</p>
      </div>
    );
  }
  
  return (
    <div className="h-[400px] w-full relative rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={activeLocation || defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Update center when activeLocation changes */}
        {activeLocation && <MapUpdater coordinates={activeLocation} />}
        
        {/* Render markers for each location */}
        {locationMarkers.map(marker => (
          <Marker
            key={marker.id}
            position={marker.coordinates}
            icon={createCustomIcon()}
            eventHandlers={{
              click: () => handleMarkerClick(marker)
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-lg">{marker.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{marker.events.length} event(s)</p>
                
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {marker.events.map(event => (
                    <div 
                      key={event.id}
                      className="p-2 border rounded cursor-pointer hover:bg-blue-50"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs text-gray-600">
                        {formatDateTime(event.start)}
                      </div>
                      {event.isPaid && (
                        <div className="text-xs font-medium mt-1">
                          Paid: ${event.price || 'N/A'}
                        </div>
                      )}
                      {event.userJoined && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          You're attending
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Optional legend or filter controls specific to the map */}
      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-80 p-2 text-xs flex justify-between">
        <div>
          <span className="font-medium">Total Locations:</span> {locationMarkers.length}
        </div>
        <div>
          <span className="font-medium">Total Events:</span> {timeSlots.length}
        </div>
      </div>
    </div>
  );
};

export default MapView;

