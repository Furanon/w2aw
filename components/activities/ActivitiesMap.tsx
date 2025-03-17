"use client";

import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Spinner } from "@/components/ui/spinner";

// Workaround for Leaflet marker icon issue in Next.js
const createDefaultIcon = () => {
  return L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

// Create a custom marker icon for user location
const createUserLocationIcon = () => {
  return L.divIcon({
    html: `<div class="relative w-6 h-6">
            <div class="absolute top-0 left-0 right-0 bottom-0 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            <div class="absolute top-1 left-1 right-1 bottom-1 bg-blue-500 rounded-full"></div>
           </div>`,
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Create a custom marker icon for places
const createPlaceIcon = () => {
  return L.divIcon({
    html: `<div class="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
          </div>`,
    className: "place-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

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

interface ActivitiesMapProps {
  userLocation: {
    lat: number;
    lng: number;
  };
  places: Place[];
  zoom?: number;
}

export function ActivitiesMap({
  userLocation,
  places,
  zoom = 13,
}: ActivitiesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Make sure we're in browser context and the DOM element exists
    if (typeof window === "undefined" || !mapRef.current) return;

    // Initialize map if it doesn't exist
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView(
        [userLocation.lat, userLocation.lng],
        zoom
      );

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(leafletMap.current);

      setMapReady(true);
    } else {
      // Update view if map already exists
      leafletMap.current.setView([userLocation.lat, userLocation.lng], zoom);
    }

    // Add user location marker
    const userIcon = createUserLocationIcon();
    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      zIndexOffset: 1000, // Make sure user marker is on top
    }).addTo(leafletMap.current);

    // Add circle to represent search radius
    // This is just a visual representation, not necessarily accurate
    // const searchRadius = L.circle([userLocation.lat, userLocation.lng], {
    //   radius: 1000, // In meters, you might want to make this dynamic
    //   color: "#3b82f6",
    //   fillColor: "#3b82f6",
    //   fillOpacity: 0.1,
    //   weight: 1,
    // }).addTo(leafletMap.current);

    // Add markers for places
    const markers = places.map((place) => {
      const { lat, lng } = place.geometry.location;
      const placeIcon = createPlaceIcon();

      const marker = L.marker([lat, lng], { icon: placeIcon }).addTo(
        leafletMap.current!
      );

      // Add popup
      const popupContent = `
        <div class="p-2 max-w-[200px]">
          <h3 class="font-bold text-sm">${place.name}</h3>
          <p class="text-xs text-gray-600">${place.vicinity}</p>
          ${
            place.rating
              ? `<div class="flex items-center mt-1">
                 <span class="text-yellow-500 mr-1">★</span>
                 <span class="text-xs">${place.rating}</span>
               </div>`
              : ""
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      return marker;
    });

    // Create a bounds object that includes all markers and user location
    const bounds = L.latLngBounds([
      [userLocation.lat, userLocation.lng],
      ...places.map((place) => [
        place.geometry.location.lat,
        place.geometry.location.lng,
      ]),
    ]);

    // Fit the map to these bounds with some padding
    if (places.length > 0) {
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup
    return () => {
      if (leafletMap.current) {
        userMarker.remove();
        markers.forEach((marker) => marker.remove());
        // searchRadius.remove();
      }
    };
  }, [userLocation, places, zoom]);

  if (!mapReady) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <Spinner size="lg" />
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full" />;
}
