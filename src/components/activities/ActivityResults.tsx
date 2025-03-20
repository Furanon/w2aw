"use client";

import { useState, useEffect } from "react";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { ActivitiesMap } from "@/components/activities/ActivitiesMap";
import { Spinner } from "@/components/ui/spinner";

interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  types: string[];
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

interface ActivityResultsProps {
  location: string;
  radius: number;
  query?: string;
  type?: string;
}

export function ActivityResults({
  location,
  radius,
  query,
  type,
}: ActivityResultsProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapView, setMapView] = useState(false);

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build the URL with query parameters
        const params = new URLSearchParams();
        params.set("location", location);
        params.set("radius", radius.toString());
        if (query) params.set("query", query);
        if (type) params.set("type", type);

        const response = await fetch(`/api/places?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch places");
        }

        const data = await response.json();
        setPlaces(data.results || []);
      } catch (err) {
        console.error("Error fetching places:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while fetching places"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, [location, radius, query, type]);

  // Extract coordinates from the location string
  const [lat, lng] = location.split(",").map(parseFloat);
  const coordinates = { lat, lng };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">Searching for activities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg text-center">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Error
        </h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-8 text-center rounded-lg">
        <h3 className="text-lg font-medium mb-2">No activities found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Try adjusting your search criteria or location.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {places.length} {places.length === 1 ? "Result" : "Results"}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMapView(false)}
            className={`px-3 py-2 rounded-md ${
              !mapView
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-foreground"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setMapView(true)}
            className={`px-3 py-2 rounded-md ${
              mapView
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-foreground"
            }`}
          >
            Map
          </button>
        </div>
      </div>

      {mapView ? (
        <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
          <ActivitiesMap
            userLocation={coordinates}
            places={places}
            zoom={12}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {places.map((place) => (
            <ActivityCard key={place.place_id} place={place} />
          ))}
        </div>
      )}
    </div>
  );
}
