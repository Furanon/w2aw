"use client";

import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiMapPin } from 'react-icons/fi';
import { IoClose } from 'react-icons/io5';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  description: string;
}

interface SearchBarProps {
  placeholder?: string;
  onLocationChange?: (locationName: string) => void;
  className?: string;
  initialValue?: string;
}

const SearchBar = ({
  placeholder = "Where to?",
  onLocationChange,
  className,
  initialValue = "",
}: SearchBarProps) => {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock locations data - replace with actual API call to Google Places
  const mockLocations = [
    { id: '1', name: 'New York, USA', description: 'City in New York State' },
    { id: '2', name: 'San Francisco, USA', description: 'City in California' },
    { id: '3', name: 'London, UK', description: 'Capital of England' },
    { id: '4', name: 'Paris, France', description: 'Capital of France' },
    { id: '5', name: 'Tokyo, Japan', description: 'Capital of Japan' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Function to fetch locations based on search query
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setLocations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      // Filter mock locations based on query
      const filteredLocations = mockLocations.filter(location => 
        location.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setLocations(filteredLocations);
      setIsLoading(false);
    }, 300);

    // In a real implementation, you would use the Google Places API:
    // try {
    //   const response = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(searchQuery)}`);
    //   const data = await response.json();
    //   setLocations(data);
    // } catch (error) {
    //   console.error('Error fetching location suggestions:', error);
    // } finally {
    //   setIsLoading(false);
    // }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    searchLocations(value);
  };

  const handleLocationSelect = (location: Location) => {
    setQuery(location.name);
    setIsOpen(false);
    if (onLocationChange) {
      onLocationChange(location.name);
    }
  };

  const handleClearInput = () => {
    setQuery('');
    setLocations([]);
    inputRef.current?.focus();
  };

  // Use Geolocation API to get user's current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          // In a real implementation, you would use a reverse geocoding API to get the location name
          // For now, we'll just use a placeholder
          const currentLocation = { 
            id: 'current', 
            name: 'Current Location', 
            description: `Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}` 
          };
          setQuery(currentLocation.name);
          if (onLocationChange) {
            onLocationChange(currentLocation.name);
          }
          setIsLoading(false);
          setIsOpen(false);
        },
        error => {
          console.error('Error getting location:', error);
          setIsLoading(false);
        }
      );
    }
  };

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <FiSearch className="w-5 h-5 text-gray-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="w-full py-3 pl-10 pr-10 text-sm bg-white border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button
            onClick={handleClearInput}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <IoClose className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
        >
          <div className="p-2">
            <button
              onClick={handleUseCurrentLocation}
              className="flex items-center w-full p-2 text-left text-sm hover:bg-gray-100 rounded"
            >
              <FiMapPin className="w-5 h-5 mr-2 text-primary-600" />
              Use my current location
            </button>
            
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-primary-600 border-r-transparent mr-2 align-[-0.125em]"></div>
                Loading suggestions...
              </div>
            ) : locations.length > 0 ? (
              <ul>
                {locations.map((location) => (
                  <li key={location.id}>
                    <button
                      onClick={() => handleLocationSelect(location)}
                      className="flex flex-col w-full p-2 text-left hover:bg-gray-100 rounded"
                    >
                      <span className="font-medium">{location.name}</span>
                      <span className="text-xs text-gray-500">{location.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query ? (
              <div className="p-3 text-center text-gray-500">
                No locations found
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;

