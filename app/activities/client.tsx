"use client";

import { useState, useEffect } from "react";
import { ActivityFilters } from "@/components/activities/ActivityFilters";
import { ActivityResults } from "@/components/activities/ActivityResults";
import { Card, CardContent } from "@/components/ui/card";

export function ActivitiesClient() {
  const [filters, setFilters] = useState<{
    location: string;
    radius: number;
    query?: string;
    type?: string;
  } | null>(null);

  const [initialLocation, setInitialLocation] = useState("");

  // Try to get user's location when page loads
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setInitialLocation(`${latitude},${longitude}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to a reasonable location like London
          setInitialLocation("51.5074,-0.1278");
        }
      );
    } else {
      // Default location if geolocation not supported
      setInitialLocation("51.5074,-0.1278");
    }
  }, []);

  const handleFilterChange = (newFilters: {
    location: string;
    radius: number;
    query?: string;
    type?: string;
  }) => {
    setFilters(newFilters);
  };

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <Card className="sticky top-24">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Search Filters</h2>
            <ActivityFilters
              onFilterChange={handleFilterChange}
              initialLocation={initialLocation}
            />
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        {filters ? (
          <ActivityResults
            location={filters.location}
            radius={filters.radius}
            query={filters.query}
            type={filters.type}
          />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 p-8 text-center rounded-lg">
            <h3 className="text-lg font-medium mb-2">
              Set your location and preferences
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Use the filters to find activities near you or your travel destination.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
