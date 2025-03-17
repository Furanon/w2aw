"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";

// Activity types from Google Places API
const ACTIVITY_TYPES = [
  { label: "All Types", value: "" },
  { label: "Restaurants", value: "restaurant" },
  { label: "Cafes", value: "cafe" },
  { label: "Bars", value: "bar" },
  { label: "Tourist Attractions", value: "tourist_attraction" },
  { label: "Parks", value: "park" },
  { label: "Museums", value: "museum" },
  { label: "Shopping", value: "shopping_mall" },
  { label: "Movie Theaters", value: "movie_theater" },
  { label: "Gyms", value: "gym" },
  { label: "Spas", value: "spa" },
];

interface ActivityFiltersProps {
  onFilterChange: (filters: {
    location: string;
    radius: number;
    query?: string;
    type?: string;
  }) => void;
  initialLocation: string;
}

export function ActivityFilters({
  onFilterChange,
  initialLocation,
}: ActivityFiltersProps) {
  const [location, setLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activityType, setActivityType] = useState("");
  const [radius, setRadius] = useState(5); // in kilometers

  // Update location when initialLocation changes (from geolocation)
  useEffect(() => {
    if (initialLocation && !location) {
      setLocation(initialLocation);
    }
  }, [initialLocation, location]);

  // Helper function to convert readable location to coordinates
  const getCoordinatesFromLocation = async (locationText: string) => {
    // Check if it's already coordinates
    if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(locationText)) {
      return locationText;
    }

    try {
      // For a more complete app, you would implement geocoding here
      // This is a placeholder that would be replaced with actual geocoding
      return initialLocation; // Fallback to initial coordinates
    } catch (error) {
      console.error("Error geocoding location:", error);
      return initialLocation;
    }
  };

  const handleSearch = async () => {
    const locationCoords = await getCoordinatesFromLocation(location);
    const radiusInMeters = radius * 1000; // Convert km to meters

    onFilterChange({
      location: locationCoords,
      radius: radiusInMeters,
      query: searchQuery || undefined,
      type: activityType || undefined,
    });
  };

  if (!initialLocation) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter city or address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="query">What are you looking for?</Label>
        <Input
          id="query"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="e.g. coffee, hiking, art"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type of place</Label>
        <Select value={activityType} onValueChange={setActivityType}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="radius">Search radius</Label>
          <span className="text-sm text-gray-500">{radius} km</span>
        </div>
        <Slider
          id="radius"
          min={1}
          max={50}
          step={1}
          value={[radius]}
          onValueChange={(values) => setRadius(values[0])}
        />
      </div>

      <Button onClick={handleSearch} className="w-full">
        Search
      </Button>
    </div>
  );
}
