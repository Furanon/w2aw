'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { EVENT_TYPES, FilterState, SPECIAL_STATUS_COLORS } from '@/types/filters';
import { TimeSlot } from './Calendar';
import { Location } from '@/types/calendar';
import dynamic from 'next/dynamic';

// Import Leaflet dynamically to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Fix Leaflet default icon issue in Next.js
const fixLeafletIcon = () => {
  // Only run on client
  if (typeof window !== 'undefined') {
    // @ts-ignore - Leaflet is defined in component scope
    delete L.Icon.Default.prototype._getIconUrl;
    
    // @ts-ignore - Leaflet is defined in component scope
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });
  }
};

// Define coordinates interface for temporary data structure
interface Coordinates {
  lat: number;
  lng: number;
}

// Mock function to get coordinates from location string
// In a real app, this would be replaced with a geocoding service or database lookup
const getCoordinatesForLocation = (location: string): Coordinates => {
  // Mock coordinates for demo locations
  const locationCoordinates: Record<string, Coordinates> = {
    'Location 1': { lat: 40.7128, lng: -74.0060 }, // New York
    'Location 2': { lat: 34.0522, lng: -118.2437 }, // Los Angeles
    'Location 3': { lat: 41.8781, lng: -87.6298 }, // Chicago
    'Location 4': { lat: 29.7604, lng: -95.3698 }, // Houston
    'Location 5': { lat: 37.7749, lng: -122.4194 }, // San Francisco
    // Default to central US if location not found
    'default': { lat: 39.8283, lng: -98.5795 }
  };
  
  return locationCoordinates[location] || locationCoordinates['default'];
};

// Custom icon creator function
const createCustomIcon = (color: string) => {
  if (typeof window === 'undefined' || typeof L === 'undefined') return null;
  
  // @ts-ignore - Leaflet is defined in component scope
  return new L.Icon({
    iconUrl: '/leaflet/marker-icon.png',
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    shadowUrl: '/leaflet/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: `custom-icon-${color.replace('#', '')}`,
    // @ts-ignore - using HTML style
    html: `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%;"></div>`
  });
};

interface MapViewProps {
  timeSlots: TimeSlot[];
  filters: FilterState;
}

const MapView: React.FC<MapViewProps> = ({ timeSlots, filters }) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Apply filters to time slots
  const filteredTimeSlots = timeSlots.filter(timeSlot => {
    // Filter by type
    if (!filters.typeIds.includes(timeSlot.typeId)) return false;
    
    // Filter by location
    if (!filters.locations.includes(timeSlot.location)) return false;
    
    // Filter by paid status
    if (filters.showPaidOnly && !timeSlot.isPaid) return false;
    if (filters.showFreeOnly && timeSlot.isPaid) return false;
    
    // Filter by joined status
    if (filters.showJoinedOnly && !timeSlot.userJoined) return false;
    
    return true;
  });
  
  // Get event color based on properties (same logic as in Calendar component)
  const getEventColor = useCallback((timeSlot: TimeSlot) => {
    if (timeSlot.userJoined) return SPECIAL_STATUS_COLORS.USER_JOINED;
    if (timeSlot.isTeacher) {
      return timeSlot.isHighlyAcknowledged 
        ? SPECIAL_STATUS_COLORS.HIGHLY_ACKNOWLEDGED_TEACHER 
        : SPECIAL_STATUS_COLORS.TEACHER;
    }
    const eventType = EVENT_TYPES.find(type => type.id === timeSlot.typeId);
    return eventType ? eventType.color : '#CCCCCC';
  }, []);

  // Fix Leaflet icon on component mount
  useEffect(() => {
    fixLeafletIcon();
    
    // Add CSS for custom markers
    const style = document.createElement('style');
    
    // Create CSS for all event colors
    let css = '';
    EVENT_TYPES.forEach(type => {
      css += `
        .custom-icon-${type.color.replace('#', '')} {
          filter: hue-rotate(${Math.random() * 360}deg);
        }
      `;
    });
    
    // Add CSS for special colors
    Object.values(SPECIAL_STATUS_COLORS).forEach(color => {
      css += `
        .custom-icon-${color.replace('#', '')} {
          filter: hue-rotate(${Math.random() * 360}deg);
        }
      `;
    });
    
    style.innerHTML = css;
    document.head.appendChild(style);
    
    // Mark map as ready once component is mounted
    setMapReady(true);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!mapReady) {
    return <div className="h-full flex items-center justify-center bg-gray-100">Loading map...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow relative" style={{ height: '700px' }}>
        {mapReady && typeof window !== 'undefined' && (
          <MapContainer
            center={[39.8283, -98.5795]} // Center of US
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            whenCreated={(map) => {
              // @ts-ignore - setting ref
              mapRef.current = map;
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {filteredTimeSlots.map((timeSlot) => {
              const coords = getCoordinatesForLocation(timeSlot.location);
              const eventColor = getEventColor(timeSlot);
              
              return (
                <Marker
                  key={timeSlot.id}
                  position={[coords.lat, coords.lng]}
                  icon={createCustomIcon(eventColor)}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg">{timeSlot.title}</h3>
                      <p className="text-sm">{timeSlot.location}</p>
                      <p className="text-sm">
                        {new Date(timeSlot.start).toLocaleString()} - 
                        {new Date(timeSlot.end).toLocaleTimeString()}
                      </p>
                      {timeSlot.isPaid && (
                        <p className="text-sm font-medium">Paid Event</p>
                      )}
                      {timeSlot.description && (
                        <p className="text-sm mt-2">{timeSlot.description}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <h3 className="font-medium mb-2">Legend</h3>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_TYPES.map(type => (
            <div key={type.id} className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: type.color }}
              ></div>
              <span className="text-sm">{type.name}</span>
            </div>
          ))}
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: SPECIAL_STATUS_COLORS.TEACHER }}
            ></div>
            <span className="text-sm">Teacher</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: SPECIAL_STATUS_COLORS.HIGHLY_ACKNOWLEDGED_TEACHER }}
            ></div>
            <span className="text-sm">Highly Acknowledged Teacher</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: SPECIAL_STATUS_COLORS.USER_JOINED }}
            ></div>
            <span className="text-sm">Joined Event</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EVENT_TYPES, FilterState, SPECIAL_STATUS_COLORS } from '@/types/filters';
import { TimeSlot } from './Calendar';

// Fix for Leaflet marker icons in Next.js
useEffect(() => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}, []);

// Use the same color constants as Calendar component
const TEACHER_COLOR = SPECIAL_STATUS_COLORS.TEACHER;
const HIGHLY_ACKNOWLEDGED_TEACHER_COLOR = SPECIAL_STATUS_COLORS.HIGHLY_ACKNOWLEDGED_TEACHER;
const USER_JOINED_COLOR = SPECIAL_STATUS_COLORS.USER_JOINED;

// Simple component to fit map bounds to markers
const FitBoundsToMarkers = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(pos => L.latLng(pos[0], pos[1])));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  
  return null;
};

// Map locations to fake coordinates for demo
const locationCoordinates: Record<string, [number, number]> = {
  'Location 1': [40.7128, -74.0060], // New York
  'Location 2': [34.0522, -118.2437], // Los Angeles
  'Location 3': [41.8781, -87.6298], // Chicago
  'Location 4': [29.7604, -95.3698], // Houston
  'Location 5': [39.9526, -75.1652], // Philadelphia
};

interface MapViewProps {
  onTimeSlotSelected?: (timeSlot: TimeSlot) => void;
  onUserJoinTimeSlot?: (timeSlotId: string) => void;
  timeSlots?: TimeSlot[];
  filters?: FilterState;
  onFilterChange?: (newFilters: Partial<FilterState>) => void;
  availableLocations?: string[];
}

const MapView: React.FC<MapViewProps> = ({
  onTimeSlotSelected,
  onUserJoinTimeSlot,
  timeSlots = [],
  filters,
  onFilterChange,
  availableLocations = Object.keys(locationCoordinates),
}) => {
  // Use the provided filters or create default ones
  const [internalFilters, setInternalFilters] = useState<FilterState>(
    filters || {
      typeIds: EVENT_TYPES.map(type => type.id),
      locations: availableLocations,
      showPaidOnly: false,
      showFreeOnly: false,
      showJoinedOnly: false,
    }
  );
  
  // Use external filters if provided, otherwise use internal
  const activeFilters = filters || internalFilters;
  
  // Handler for internal filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    if (onFilterChange) {
      onFilterChange(newFilters);
    } else {
      setInternalFilters(prev => ({ ...prev, ...newFilters }));
    }
  }, [onFilterChange]);
  
  // Apply filters to time slots
  const filteredTimeSlots = timeSlots.filter(timeSlot => {
    // Filter by type
    if (!activeFilters.typeIds.includes(timeSlot.typeId)) return false;
    
    // Filter by location
    if (!activeFilters.locations.includes(timeSlot.location)) return false;
    
    // Filter by paid status
    if (activeFilters.showPaidOnly && !timeSlot.isPaid) return false;
    if (activeFilters.showFreeOnly && timeSlot.isPaid) return false;
    
    // Filter by joined status
    if (activeFilters.showJoinedOnly && !timeSlot.userJoined) return false;
    
    return true;
  });
  
  // Get event color based on properties (same logic as Calendar component)
  const getEventColor = useCallback((timeSlot: TimeSlot) => {
    if (timeSlot.userJoined) return USER_JOINED_COLOR;
    if (timeSlot.isTeacher) {
      return timeSlot.isHighlyAcknowledged ? HIGHLY_ACKNOWLEDGED_TEACHER_COLOR : TEACHER_COLOR;
    }
    const eventType = EVENT_TYPES.find(type => type.id === timeSlot.typeId);
    return eventType ? eventType.color : '#CCCCCC';
  }, []);
  
  // Create marker icons with event colors
  const getMarkerIcon = useCallback((timeSlot: TimeSlot) => {
    const color = getEventColor(timeSlot);
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }, [getEventColor]);
  
  // Handle selecting a time slot from the map
  const handleMarkerClick = useCallback((timeSlot: TimeSlot) => {
    if (onTimeSlotSelected) {
      onTimeSlotSelected(timeSlot);
    }
  }, [onTimeSlotSelected]);
  
  // Handle joining a time slot
  const handleJoinTimeSlot = useCallback((timeSlotId: string) => {
    if (onUserJoinTimeSlot) {
      onUserJoinTimeSlot(timeSlotId);
    }
  }, [onUserJoinTimeSlot]);
  
  // Group time slots by location for the map
  const timeSlotsGroupedByLocation = filteredTimeSlots.reduce((acc, timeSlot) => {
    const location = timeSlot.location;
    if (!acc[location]) {
      acc[location] = [];
    }
    acc[location].push(timeSlot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);
  
  // Create array of marker positions for fitting bounds
  const markerPositions: [number, number][] = Object.keys(timeSlotsGroupedByLocation).map(
    location => locationCoordinates[location] || [0, 0]
  );

  return (
    <div className="h-full flex flex-col">
      {!filters && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Filters</h3>
          
          <div className="mb-3">
            <h4 className="font-medium mb-1">Event Types</h4>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(type => (
                <button
                  key={type.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.typeIds.includes(type.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => {
                    if (activeFilters.typeIds.includes(type.id)) {
                      handleFilterChange({
                        typeIds: activeFilters.typeIds.filter(id => id !== type.id),
                      });
                    } else {
                      handleFilterChange({
                        typeIds: [...activeFilters.typeIds, type.id],
                      });
                    }
                  }}
                  style={{ borderLeft: `4px solid ${type.color}` }}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-3">
            <h4 className="font-medium mb-1">Locations</h4>
            <div className="flex flex-wrap gap-2">
              {availableLocations.map(location => (
                <button
                  key={location}
                  className={`px-3 py-1 rounded-full text-sm ${
                    activeFilters.locations.includes(location)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => {
                    if (activeFilters.locations.includes(location)) {
                      handleFilterChange({
                        locations: activeFilters.locations.filter(loc => loc !== location),
                      });
                    } else {
                      handleFilterChange({
                        locations: [...activeFilters.locations, location],
                      });
                    }
                  }}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.showPaidOnly}
                onChange={() => 
                  handleFilterChange({ 
                    showPaidOnly: !activeFilters.showPaidOnly,
                    showFreeOnly: false 
                  })
                }
                className="mr-2"
              />
              Paid Only
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.showFreeOnly}
                onChange={() => 
                  handleFilterChange({ 
                    showFreeOnly: !activeFilters.showFreeOnly,
                    showPaidOnly: false 
                  })
                }
                className="mr-2"
              />
              Free Only
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.showJoinedOnly}
                onChange={() => 
                  handleFilterChange({ 
                    showJoinedOnly: !activeFilters.showJoinedOnly 
                  })
                }
                className="mr-2"
              />
              Joined Events
            </label>
          </div>
        </div>
      )}
      
      <div className="flex-grow bg-white rounded-lg shadow overflow-hidden">
        <MapContainer
          center={[39.8283, -98.5795]} // Center of US
          zoom={4}
          style={{ height: '700px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Add markers for each location */}
          {Object.entries(timeSlotsGroupedByLocation).map(([location, timeSlots]) => {
            const coordinates = locationCoordinates[location] || [0, 0];
            return (
              <Marker 
                key={location}
                position={coordinates}
                icon={getMarkerIcon(timeSlots[0])}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-lg mb-2">{location}</h3>
                    <div className="space-y-3">
                      {timeSlots.map(timeSlot => (
                        <div 
                          key={timeSlot.id} 
                          className="border-l-4 pl-2 py-1 cursor-pointer hover:bg-gray-100"
                          style={{ borderLeftColor: getEventColor(timeSlot) }}
                          onClick={() => handleMarkerClick(timeSlot)}
                        >
                          <div className="font-medium">{timeSlot.title}</div>
                          <div className="text-sm">
                            {`${new Date(timeSlot.start).toLocaleDateString()} at ${new Date(timeSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                          {timeSlot.isPaid && <div className="text-xs font-medium">Paid Event</div>}
                          {!timeSlot.userJoined && (
                            <button 
                              className="mt-1 text-xs bg-blue-500 text-white px-2 py-1 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinTimeSlot(timeSlot.id);
                              }}
                            >
                              Join Event
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          {/* Fit map bounds to markers */}
          {markerPositions.length > 0 && <FitBoundsToMarkers positions={markerPositions} />}
        </MapContainer>
      </div>
      
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <h3 className="font-medium mb-2">Legend</h3>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_TYPES.map(type => (
            <div key={type.id} className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: type.color }}
              ></div>
              <span className="text-sm">{type.name}</span>
            </div>
          ))}
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: TEACHER_COLOR }}
            ></div>
            <span className="text-sm">Teacher</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: HIGHLY_ACKNOWLEDGED_TEACHER_COLOR }}
            ></div>
            <span className="text-sm">Highly Acknowledged Teacher</span>
          </div>
          <div className="flex items-center">
            <div
              className="w

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Location } from "@/types/calendar";

interface MapViewProps {
  locations: Location[];
  onMarkerClick?: (location: Location) => void;
  className?: string;
  title?: string;
  height?: string;
  zoom?: number;
  center?: [number, number]; // [latitude, longitude]
}

const MapView = ({
  locations = [],
  onMarkerClick,
  className = "",
  title = "Map View",
  height = "h-[500px]",
  zoom = 13,
  center = [51.505, -0.09], // Default to London
}: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Initialize the map if it doesn't exist
    if (mapRef.current && !mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView(center, zoom);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup map instance on component unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map when center or zoom changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    locations.forEach(location => {
      if (mapInstanceRef.current) {
        const marker = L.marker(location.coordinates)
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>${location.name}</b><br>${location.address}`);
        
        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(location));
        }
        
        markersRef.current.push(marker);
      }
    });

    // Fit bounds if we have markers
    if (locations.length > 0 && mapInstanceRef.current) {
      const bounds = L.latLngBounds(locations.map(loc => loc.coordinates));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, onMarkerClick]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className={`w-full ${height} rounded-md overflow-hidden`}
          data-testid="map-container"
        />
      </CardContent>
    </Card>
  );
};

export default MapView;

