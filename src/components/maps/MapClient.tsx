"use client";

import { useState, useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

// Place interface definition
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

interface MapClientProps {
  center: [number, number];
  places: Place[];
  radius: number;
}

// Type definitions for dynamically loaded components
type MapContainerType = React.ComponentType<{
  center: [number, number];
  zoom: number;
  className: string;
  whenCreated?: (map: LeafletMap) => void;
  children: React.ReactNode;
}>;

type TileLayerType = React.ComponentType<{
  attribution: string;
  url: string;
}>;

type MarkerType = React.ComponentType<{
  position: [number, number];
  children?: React.ReactNode;
}>;

type PopupType = React.ComponentType<{
  children: React.ReactNode;
}>;

type CircleType = React.ComponentType<{
  center: [number, number];
  radius: number;
  pathOptions: {
    fillColor: string;
    fillOpacity: number;
    color: string;
    weight: number;
    opacity: number;
  };
}>;

type UseMapType = () => LeafletMap;

interface ReactLeafletComponents {
  MapContainer: MapContainerType;
  TileLayer: TileLayerType;
  Marker: MarkerType;
  Popup: PopupType;
  Circle: CircleType;
  useMap: UseMapType;
}

// Map recenter component will be defined inside the main component after dynamic imports
export function MapClient({ center, places, radius }: MapClientProps) {
  // Create states for the map reference and loaded components
  const mapRef = useRef<LeafletMap | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [components, setComponents] = useState<ReactLeafletComponents | null>(null);

  // Check if we're on the client side on component mount
  useEffect(() => {
    setIsClient(typeof window !== 'undefined');
  }, []);

  // Dynamically import Leaflet and related CSS
  useEffect(() => {
    if (!isClient) return;

    async function loadLeaflet() {
      try {
        // Import Leaflet CSS
        await import('leaflet/dist/leaflet.css');
        
        // Import Leaflet and fix icons
        const L = (await import('leaflet')).default;
        
        // Fix for the missing icon issue
        delete L.Icon.Default.prototype._getIconUrl;
        
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "/images/leaflet/marker-icon-2x.png",
          iconUrl: "/images/leaflet/marker-icon.png",
          shadowUrl: "/images/leaflet/marker-shadow.png",
        });
        
        // Import react-leaflet components
        const reactLeaflet = await import('react-leaflet');
        
        // Set the components
        setComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          Circle: reactLeaflet.Circle,
          useMap: reactLeaflet.useMap,
        });
        
        setLeafletLoaded(true);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    }

    loadLeaflet();
  }, [isClient]);

  // Return loading state or placeholder if not on client or components not loaded yet
  if (!isClient || !leafletLoaded || !components) {
    return (
      <div className="h-full w-full rounded-lg bg-gray-200 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  // Define MapRecenter component now that useMap is available
  const MapRecenter = ({ coords }: { coords: [number, number] }) => {
    const map = components.useMap();
    
    useEffect(() => {
      map.setView(coords, map.getZoom());
    }, [coords, map]);
    
    return null;
  };

  // Destructure components for easier usage
  const { MapContainer, TileLayer, Marker, Popup, Circle } = components;

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full rounded-lg"
      whenCreated={(map) => {
        mapRef.current = map;
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapRecenter coords={center} />
      
      {/* Draw radius circle */}
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          fillColor: "#2563eb",
          fillOpacity: 0.1,
          color: "#2563eb",
          weight: 1,
          opacity: 0.5
        }}
      />
      
      {/* Map all places to markers */}
      {places.map((place) => (
        <Marker 
          key={place.place_id}
          position={[place.geometry.location.lat, place.geometry.location.lng]}
        >
          <Popup>
            <div>
              <h3 className="font-semibold">{place.name}</h3>
              <p className="text-sm">{place.vicinity}</p>
              {place.rating && (
                <p className="text-sm mt-1">Rating: {place.rating} ⭐</p>
              )}
              <p className="text-xs mt-1">{place.types.join(', ')}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
