import React, { memo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePlacesData } from './hooks/usePlacesData';
import { PerformanceSettings } from './hooks/usePerformanceLevel';

// Dynamically import MapClient to reduce initial bundle size
const MapClient = dynamic(
  () => import('../maps/MapClient').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="loading-placeholder">Loading Map...</div> }
);

interface MapViewProps {
  isVisible: boolean;
  opacity: number;
  center?: [number, number];
  zoom?: number;
  performanceSettings: PerformanceSettings;
  onZoomChange: (zoom: number) => void;
  onCenterChange?: (center: [number, number]) => void;
  className?: string;
}

const MapView: React.FC<MapViewProps> = ({
  isVisible,
  opacity,
  center = [0, 0],
  zoom = 5,
  performanceSettings,
  onZoomChange,
  onCenterChange,
  className = '',
}) => {
  const mapRef = useRef<any>(null);
  
  // Fetch places data with React Query
  const { data: places, isLoading, error } = usePlacesData({
    center,
    radius: performanceSettings.fetchRadius,
    limit: performanceSettings.maxMarkers,
  });

  // Update parent component when zoom changes
  const handleZoomChange = (newZoom: number) => {
    if (onZoomChange) {
      onZoomChange(newZoom);
    }
  };

  // Update parent component when center changes
  const handleCenterChange = (newCenter: [number, number]) => {
    if (onCenterChange) {
      onCenterChange(newCenter);
    }
  };

  // When the component unmounts or becomes invisible, clean up resources
  useEffect(() => {
    if (!isVisible && mapRef.current?.leafletElement) {
      // Optionally disable event listeners or pause animations
      // when the map is not visible to save resources
    }
    
    return () => {
      // Clean up any map-related resources if needed
    };
  }, [isVisible]);

  // Only render the map if it's visible or becoming visible (opacity > 0)
  if (!isVisible && opacity === 0) {
    return null;
  }

  return (
    <div 
      className={`map-view-container ${className}`} 
      style={{ 
        opacity,
        transition: 'opacity 0.5s ease-in-out',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <MapClient
        ref={mapRef}
        center={center}
        zoom={zoom}
        markers={places?.map(place => ({
          id: place.id,
          position: [place.lat, place.lng],
          title: place.name,
          // Add other marker properties as needed
        })) || []}
        onZoomChange={handleZoomChange}
        onCenterChange={handleCenterChange}
        // Pass other props that MapClient accepts
        maxMarkers={performanceSettings.maxMarkers}
        updateInterval={performanceSettings.updateInterval}
      />
      
      {isLoading && (
        <div className="loading-overlay">
          <span>Loading places data...</span>
        </div>
      )}
      
      {error && (
        <div className="error-overlay">
          <span>Error loading data: {(error as Error).message}</span>
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(MapView);

