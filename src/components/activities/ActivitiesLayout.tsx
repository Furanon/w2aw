"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityFilters } from "@/components/activities/ActivityFilters";
import { ActivityResults } from "@/components/activities/ActivityResults";

// Create a directory for the Leaflet marker icons
import Script from "next/script";
import { Button } from "@/components/ui/button";

interface SearchParams {
  location: string;
  radius: number;
  query?: string;
  type?: string;
}

export function ActivitiesLayout() {
  const defaultParams: SearchParams = {
    location: "37.7749,-122.4194", // Default to San Francisco
    radius: 5000, // Default 5km radius
    query: "",
    type: "",
  };

  const [searchParams, setSearchParams] = useState<SearchParams>(defaultParams);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFilterChange = (filters: any) => {
    setSearchParams(filters);
    setHasSearched(true);
  };

  return (
    <Container className="py-8">
      {/* Set up image directory for Leaflet markers */}
      <Script
        id="setup-leaflet-images"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Create directory structure for Leaflet marker icons
            if (typeof window !== 'undefined') {
              // Ensure the images directory exists
              const checkImagesDir = () => {
                const imagesDir = document.querySelector('body');
                if (!imagesDir) {
                  setTimeout(checkImagesDir, 100);
                  return;
                }
                
                // Create placeholder for marker images
                const iconPath = document.createElement('div');
                iconPath.style.display = 'none';
                iconPath.id = 'leaflet-icon-path';
                iconPath.setAttribute('data-path', '/images/leaflet/');
                document.body.appendChild(iconPath);
              };
              
              checkImagesDir();
            }
          `,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">Find Activities</h2>
              <ActivityFilters
                onFilterChange={handleFilterChange}
                initialLocation={defaultParams.location}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-9">
          {hasSearched ? (
            <ActivityResults
              location={searchParams.location}
              radius={searchParams.radius}
              query={searchParams.query}
              type={searchParams.type}
            />
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-3">
                Discover Activities for Your Trip
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
                Find interesting places to visit, attractions to see, and things to do
                for your weekend adventure.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  setHasSearched(true);
                }}
              >
                Start Exploring
              </Button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
