
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FilterState } from '@/types/filters';
import { TimeSlot } from '@/components/calendar/Calendar';
import { Location } from '@/types/calendar';
import dynamic from 'next/dynamic';
import { 
  fixLeafletIcon, 
  getEventColor, 
  createColoredIcon, 
  createUserLocationIcon, 
  getCoordinatesForLocation,
  Coordinates
} from './utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

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
const useMap = dynamic(
  () => import('react-leaflet').then((mod) => mod.useMap),
  { ssr: false }
);

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

// Define the properties that our unified MapView can accept
interface MapViewProps {
  // For calendar event integration
  timeSlots?: TimeSlot[];
  onTimeSlotSelected?: (timeSlot: TimeSlot) => void;
  onUserJoinTimeSlot?: (timeSlotId: string) => void;
  
  // For location-based display
  locations?: Location[];
  onMarkerClick?: (location: Location) => void;
  
  // For activities map with user location
  userLocation?: Coordinates;
  places?: Array<{
    place_id: string;
    name: string;
    vicinity?: string;
    geometry: {
      location: Coordinates;
    };
    rating?: number;
    types?: string[];
  }>;
  
  // Common display options
  filters?: FilterState;
  onFilterChange?: (newFilters: Partial<FilterState>) => void;
  className?: string;
  title?: string;
  height?: string;
  zoom?: number;
  center?: [number, number]; // [latitude, longitude]
  showLegend?: boolean;
  showFilters?: boolean;
}

const MapView: React.FC<MapViewProps> = ({
  // Calendar props
  timeSlots = [],
  onTimeSlotSelected,
  onUserJoinTimeSlot,
  
  // Location props
  locations = [],
  onMarkerClick,
  
  // Activities props
  userLocation,
  places = [],
  
  // Common props
  filters,
  onFilterChange,
  className = "",
  title,
  height = "h-[700px]",
  zoom = 4,
  center = [39.8283, -98.5795], // Default to center of US
  showLegend = true,
  showFilters = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Use internal filters if none provided
  const [internalFilters, setInternalFilters] = useState<FilterState | undefined>(filters);
  
  // Determine which filters to use
  const activeFilters = filters || internalFilters;
  
  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    if (onFilterChange) {
      onFilterChange(newFilters);
    } else if (internalFilters) {
      setInternalFilters(prev => ({
        ...prev!,
        ...newFilters
      }));
    }
  }, [onFilterChange, internalFilters]);

  // Filter time slots if we have them
  const filteredTimeSlots = useMemo(() => {
    if (!timeSlots.length || !activeFilters) return timeSlots;
    
    return timeSlots.filter(timeSlot => {
      // Filter by type
      if (activeFilters.typeIds.length > 0 && !activeFilters.typeIds.includes(timeSlot.typeId)) {
        return false;
      }
      
      // Filter by location
      if (activeFilters.locations.length > 0 && !activeFilters.locations.includes(timeSlot.location)) {
        return false;
      }
      
      // Filter by payment type
      if (activeFilters.showPaidOnly && !timeSlot.isPaid) return false;
      if (activeFilters.showFreeOnly && timeSlot.isPaid) return false;
      
      // Filter by joined status
      if (activeFilters.showJoinedOnly && !timeSlot.userJoined) return false;
      
      return true;
    });
  }, [timeSlots, activeFilters]);
  
  // Group time slots by location for clustered markers
  const timeSlotsGroupedByLocation = useMemo(() => {
    return filteredTimeSlots.reduce((acc, timeSlot) => {
      const location = timeSlot.location;
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(timeSlot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);
  }, [filteredTimeSlots]);
  
  // Create marker positions for time slots
  const timeSlotMarkerPositions = useMemo(() => {
    return Object.keys(timeSlotsGroupedByLocation).map(location => {
      const coords = getCoordinatesForLocation(location);
      return [coords.lat, coords.lng] as [number, number];
    });
  }, [timeSlotsGroupedByLocation]);
  
  // Create marker positions for locations
  const locationMarkerPositions = useMemo(() => {
    return locations.map(location => location.coordinates);
  }, [locations]);
  
  // Create marker positions for places
  const placeMarkerPositions = useMemo(() => {
    return places.map(place => [
      place.geometry.location.lat, 
      place.geometry.location.lng
    ] as [number, number]);
  }, [places]);
  
  // Combine all marker positions
  const allMarkerPositions = useMemo(() => {
    const positions: [number, number][] = [
      ...timeSlotMarkerPositions,
      ...locationMarkerPositions,
      ...placeMarkerPositions
    ];
    
    if (userLocation) {
      positions.push([userLocation.lat, userLocation.lng]);
    }
    
    return positions;
  }, [timeSlotMarkerPositions, locationMarkerPositions, placeMarkerPositions, userLocation]);
  
  // Handle time slot selection
  const handleTimeSlotClick = useCallback((timeSlot: TimeSlot) => {
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
  
  // Handle location marker click
  const handleLocationClick = useCallback((location: Location) => {
    if (onMarkerClick) {
      onMarkerClick(location);
    }
  }, [onMarkerClick]);
  
  // Fix Leaflet icon and initialize map
  useEffect(() => {
    fixLeafletIcon();
    setMapReady(true);
  }, []);
  
  // Determine if we need to show a legend based on timeSlots presence
  const shouldShowLegend = showLegend && timeSlots.length > 0;
  
  // Determine if we need to show filters

