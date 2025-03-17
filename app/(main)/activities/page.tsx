"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ActivitiesLayout } from "@/components/activities/layout/ActivitiesLayout";
import { ActivityFilters, ActivityFilters as ActivityFiltersType } from "@/components/activities/ActivityFilters";
import { ActivityResults } from "@/components/activities/ActivityResults";

export default function ActivitiesPage() {
  const [filters, setFilters] = useState<ActivityFiltersType | null>(null);
  const [defaultLocation, setDefaultLocation] = useState<string>("37.7749,-122.4194"); // Default to SF

  // Try to get user's location on initial load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDefaultLocation(`${latitude},${longitude}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Keep default location if error
        }
      );
    }
  }, []);

  const handleFilterChange = (newFilters: ActivityFiltersType) => {
    setFilters(newFilters);
  };

  // Header component for the activities page
  const Header = () => (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discover Activities</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Find interesting places and activities around you
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Saved Activities</Button>
          <Button variant="outline">Recent Searches</Button>
        </div>
      </div>
    </div>
  );

  // Sidebar content with filters
  const Sidebar = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Search Filters</h2>
        <ActivityFilters onFilterChange={handleFilterChange} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ActivitiesLayout header={<Header />} sidebar={<Sidebar />}>
        {filters ? (
          <ActivityResults
            location={filters.location}
            radius={filters.radius}
            query={filters.query}
            type={filters.type}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Start Exploring
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6">
                Use the filters on the left to discover activities and interesting places around you.
              </p>
              <Button
                onClick={() => {
                  // Set initial filters with default values
                  handleFilterChange({
                    location: defaultLocation,
                    radius: 5000,
                    query: "",
                    type: ""
                  });
                }}
              >
                Show activities near me
              </Button>
            </div>
          </div>
        )}
      </ActivitiesLayout>
    </div>
  );
}
