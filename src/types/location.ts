/**
 * Standardized location types for consistent usage across the application
 */

/**
 * Standard coordinates interface
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Base location interface
 */
export interface BaseLocation {
  id: string;
  name: string;
  coordinates: Coordinates;
}

/**
 * Full location with additional details
 */
export interface Location extends BaseLocation {
  address: string;
  type?: string;
  capacity?: number;
  amenities?: string[];
  openingHours?: Record<string, string>; // Day of week -> open hours (e.g., "Monday" -> "9:00-17:00")
  accessibility?: string[];
  rating?: number;
  isActive?: boolean;
}

/**
 * Simplified location for use in events and filtering
 */
export interface EventLocation {
  id: string;
  name: string;
  coordinates: Coordinates;
  address: string;
}

/**
 * Place result from external APIs (like Google Places)
 */
export interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: Coordinates;
  };
  rating?: number;
  types?: string[];
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

/**
 * Helper functions for working with locations
 */

/**
 * Convert an array [lat, lng] to Coordinates object
 */
export function arrayToCoordinates(array: [number, number]): Coordinates {
  return { lat: array[0], lng: array[1] };
}

/**
 * Convert Coordinates to an array [lat, lng]
 */
export function coordinatesToArray(coords: Coordinates): [number, number] {
  return [coords.lat, coords.lng];
}

/**
 * Calculate distance between two coordinates (using Haversine formula)
 * @returns distance in kilometers
 */
export function calculateDistance(
  coords1: Coordinates,
  coords2: Coordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
  const dLng = (coords2.lng - coords1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * (Math.PI / 180)) *
      Math.cos(coords2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Mock locations for development/testing
 */
export const MOCK_LOCATIONS: Location[] = [
  {
    id: 'loc1',
    name: 'Location 1',
    address: 'New York City, NY',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    type: 'urban',
    capacity: 100,
    rating: 4.7
  },
  {
    id: 'loc2',
    name: 'Location 2',
    address: 'Los Angeles, CA',
    coordinates: { lat: 34.0522, lng: -118.2437 },
    type: 'urban',
    capacity: 80,
    rating: 4.5
  },
  {
    id: 'loc3',
    name: 'Location 3',
    address: 'Chicago, IL',
    coordinates: { lat: 41.8781, lng: -87.6298 },
    type: 'urban',
    capacity: 90,
    rating: 4.2
  },
  {
    id: 'loc4',
    name: 'Location 4',
    address: 'Houston, TX',
    coordinates: { lat: 29.7604, lng: -95.3698 },
    type: 'urban',
    capacity: 75,
    rating: 4.0
  },
  {
    id: 'loc5',
    name: 'Location 5',
    address: 'San Francisco, CA',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    type: 'urban',
    capacity: 85,
    rating: 4.8
  }
];

/**
 * Get a mock location by name
 */
export function getMockLocationByName(name: string): Location | undefined {
  return MOCK_LOCATIONS.find(loc => loc.name === name);
}

/**
 * Get a location's coordinates by name
 * This is used for backward compatibility with code that uses location names
 */
export function getCoordinatesForLocationName(name: string): Coordinates {
  const location = MOCK_LOCATIONS.find(loc => loc.name === name);
  return location?.coordinates || { lat: 39.8283, lng: -98.5795 }; // Default to center of US
}

