import { useQuery } from '@tanstack/react-query';

interface Location {
  lat: number;
  lng: number;
}

interface PlacesParams {
  location?: Location;
  radius?: number;
  query?: string;
  type?: string;
}

interface Place {
  id: string;
  name: string;
  vicinity: string;
  location: Location;
  rating?: number;
  types: string[];
  photos?: string[];
  // Add other fields as needed based on your API
}

/**
 * Custom hook to fetch places data using React Query
 * @param params - Parameters for filtering places data
 * @returns Query result containing places data, loading state, and error
 */
export const usePlacesData = (params: PlacesParams = {}) => {
  const { location, radius = 5000, query = '', type = '' } = params;

  return useQuery<Place[]>({
    queryKey: ['places', location?.lat, location?.lng, radius, query, type],
    queryFn: async () => {
      // Build URL with query parameters
      const searchParams = new URLSearchParams();
      
      if (location) {
        searchParams.append('lat', location.lat.toString());
        searchParams.append('lng', location.lng.toString());
      }
      
      if (radius) {
        searchParams.append('radius', radius.toString());
      }
      
      if (query) {
        searchParams.append('query', query);
      }
      
      if (type) {
        searchParams.append('type', type);
      }

      const queryString = searchParams.toString();
      const url = `/api/places/route${queryString ? `?${queryString}` : ''}`;
      
      // Fetch data from API
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error fetching places: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    },
    enabled: !!location, // Only fetch when location is provided
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
  });
};

export default usePlacesData;

