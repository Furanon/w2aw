import L from 'leaflet';
import { TimeSlot } from '@/components/calendar/Calendar';
import { EVENT_TYPES, SPECIAL_STATUS_COLORS } from '@/types/filters';

// Standard coordinates interface for use across the application
export interface Coordinates {
  lat: number;
  lng: number;
}

// Initialize Leaflet map with common settings
export function initializeMap(
  mapElement: HTMLElement,
  center: [number, number] = [39.8283, -98.5795], // Default center (US)
  zoom: number = 4,
  options: L.MapOptions = {}
): L.Map {
  const map = L.map(mapElement, {
    center,
    zoom,
    ...options,
  });

  // Add default OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  return map;
}

// Fix Leaflet default icon issue in Next.js
export function fixLeafletIcon(): void {
  // Only run on client
  if (typeof window === 'undefined') return;
  
  // @ts-ignore - Leaflet is defined in component scope
  delete L.Icon.Default.prototype._getIconUrl;
  
  // @ts-ignore - Leaflet is defined in component scope
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
  });
}

// Create a marker icon with a specific color
export function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

// Create a user location icon
export function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div class="relative w-6 h-6">
            <div class="absolute top-0 left-0 right-0 bottom-0 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            <div class="absolute top-1 left-1 right-1 bottom-1 bg-blue-500 rounded-full"></div>
           </div>`,
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Create a place/location icon
export function createPlaceIcon(color: string = '#F44336'): L.DivIcon {
  return L.divIcon({
    html: `<div class="bg-${color} text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
          </div>`,
    className: "place-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
}

// Get event color based on properties
export function getEventColor(timeSlot: TimeSlot): string {
  if (timeSlot.userJoined) return SPECIAL_STATUS_COLORS.USER_JOINED;
  if (timeSlot.isTeacher) {
    return timeSlot.isHighlyAcknowledged 
      ? SPECIAL_STATUS_COLORS.HIGHLY_ACKNOWLEDGED_TEACHER 
      : SPECIAL_STATUS_COLORS.TEACHER;
  }
  const eventType = EVENT_TYPES.find(type => type.id === timeSlot.typeId);
  return eventType ? eventType.color : '#CCCCCC';
}

// Mock function to get coordinates from location string
// In a real app, this would be replaced with a geocoding service or database lookup
export function getCoordinatesForLocation(location: string): Coordinates {
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
}

// Fit map bounds to include all markers
export function fitMapToMarkers(map: L.Map, coordinates: Coordinates[], padding: number = 50): void {
  if (!coordinates.length) return;
  
  const bounds = L.latLngBounds(
    coordinates.map(coord => [coord.lat, coord.lng])
  );
  
  map.fitBounds(bounds, { padding: [padding, padding] });
}

