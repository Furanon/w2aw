'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { usePlacesData } from './hooks/usePlacesData';
import { useZoomTransition } from './hooks/useZoomTransition';
import { usePerformanceLevel } from './hooks/usePerformanceLevel';

// Use React.lazy for code splitting with our new components
const GlobeView = React.lazy(() => import('./GlobeView'));
const MapView = React.lazy(() => import('./MapView'));

// Loading placeholders
const GlobeLoadingPlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-900">
    <div className="text-white">Loading 3D Globe...</div>
  </div>
);

const MapLoadingPlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100">
    <div className="text-gray-800">Loading Map...</div>
  </div>
);

// Transition component for smooth fading between views
const TransitionLayer = ({ isGlobeActive, opacity }: { isGlobeActive: boolean; opacity: number }) => {
  return (
    <div 
      className="absolute inset-0 bg-black transition-opacity duration-500"
      style={{ 
        opacity: opacity,
        pointerEvents: 'none',
        zIndex: 50 
      }}
    />
  );
};

interface EnhancedVizProps {
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
}

export default function EnhancedViz({ 
  initialLat = 40.7128, 
  initialLng = -74.0060, 
  initialZoom = 3 
}: EnhancedVizProps) {
  const [center, setCenter] = useState<[number, number]>([initialLat, initialLng]);
  const [zoom, setZoom] = useState<number>(initialZoom);
  
  // Use custom hooks
  const { isGlobeView, globeOpacity, mapOpacity, transitionOpacity } = useZoomTransition(zoom);
  const { performanceLevel, particleCount, renderQuality } = usePerformanceLevel();
  const { data: placesData, isLoading, error } = usePlacesData({
    lat: center[0],
    lng: center[1],
    radius: isGlobeView ? 5000 : 1000, // Larger radius for globe view
    limit: performanceLevel === 'high' ? 100 : performanceLevel === 'medium' ? 50 : 25,
  });

  // Handle zoom changes
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  // Handle center changes
  const handleCenterChange = (newCenter: [number, number]) => {
    setCenter(newCenter);
  };

  return (
    <div className="relative w-full h-full">
      {/* Globe View */}
      <div 
        className="absolute inset-0"
        style={{ 
          opacity: globeOpacity,
          visibility: globeOpacity > 0 ? 'visible' : 'hidden'
        }}
      >
        <Suspense fallback={<GlobeLoadingPlaceholder />}>
          {globeOpacity > 0 && (
            <GlobeView
              places={placesData}
              onZoomChange={handleZoomChange}
              onCenterChange={handleCenterChange}
              zoom={zoom}
              center={center}
              particleCount={particleCount}
              quality={renderQuality}
            />
          )}
        </Suspense>
      </div>

      {/* Map View */}
      <div 
        className="absolute inset-0"
        style={{ 
          opacity: mapOpacity,
          visibility: mapOpacity > 0 ? 'visible' : 'hidden'
        }}
      >
        <Suspense fallback={<MapLoadingPlaceholder />}>
          {mapOpacity > 0 && (
            <MapView
              places={placesData}
              onZoomChange={handleZoomChange}
              onCenterChange={handleCenterChange}
              initialZoom={zoom}
              initialCenter={center}
            />
          )}
        </Suspense>
      </div>

      {/* Transition overlay for smooth transitions */}
      <TransitionLayer 
        isGlobeActive={isGlobeView}
        opacity={transitionOpacity}
      />

      {/* Error handling */}
      {error && (
        <div className="absolute bottom-4 left-4 bg-red-500 text-white p-2 rounded-md">
          Error loading data: {(error as Error).message}
        </div>
      )}

      {/* Performance indicator (can be hidden in production) */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-md">
        Mode: {isGlobeView ? 'Globe' : 'Map'} | 
        Performance: {performanceLevel} | 
        Zoom: {zoom.toFixed(1)}
      </div>
    </div>
  );
}

