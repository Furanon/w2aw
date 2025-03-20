"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import dynamic from "next/dynamic";

// Need to ensure Leaflet icons are correctly loaded
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
}

interface ActivitiesMapProps {
  location: string;
  radius: number;
  query?: string;
  type?: string;
  className?: string;
}

// Client-side only Map component
const MapClient = dynamic(() => import('./MapClient').then((mod) => mod.MapClient), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 h-full w-full">
      <Spinner size="lg" />
    </div>
  ),
});

export function ActivitiesMap({
  location,
  radius,
  query,
  type,
  className,
}: ActivitiesMapProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>([0, 0]); // Default center
  
  // Parse location string to get coordinates
  useEffect(() => {
    if (location) {
      const [lat, lng] = location.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        setCenter([lat, lng]);
      }
    }
  }, [location]);
  
  // Fetch places when props change
  useEffect(() => {
    const fetchPlaces = async () => {
      if (!location) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          location,
          radius: radius.toString(),
        });
        
        if (query) params.append("query", query);
        if (type) params.append("type", type);
        
        const response = await fetch(`/api/places?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setPlaces(data.results || []);
      } catch (err) {
        console.error("Error fetching places:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch places");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlaces();
  }, [location, radius, query, type]);

  if (center[0] === 0 && center[1] === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100 dark:bg-gray-800", className)}>
        <Spinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className={cn("relative", className)}>
      {loading && (
        <div className="absolute top-2 right-2 z-[999] bg-white dark:bg-gray-800 p-2 rounded-md shadow-md">
          <Spinner size="sm" />
        </div>
      )}
      
      <MapClient 
        center={center} 
        places={places} 
        radius={radius} 
      />
    </div>
  );
}
