'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePerformanceLevel } from './hooks/usePerformanceLevel';
import type { GeoNetworkData, GeoNode } from '../GeoNetworkGlobe';

// Dynamically import GeoNetworkGlobe to reduce initial bundle size
const GeoNetworkGlobe = dynamic(() => import('../GeoNetworkGlobe'), {
  ssr: false,
  loading: () => (
    <div className="globe-loading">
      <div className="globe-loading-spinner"></div>
      <p>Loading 3D Globe...</p>
    </div>
  ),
});

interface GlobeViewProps {
  placesData: any[]; // Data from usePlacesData hook
  opacity?: number; // For transition effects
  isVisible?: boolean; // Whether the globe should be visible
  onNodeClick?: (node: GeoNode) => void;
  highlightedNodeId?: string;
  className?: string;
  autoRotate?: boolean;
  userId?: string;
}

const GlobeView: React.FC<GlobeViewProps> = ({
  placesData,
  opacity = 1,
  isVisible = true,
  onNodeClick,
  highlightedNodeId,
  className = '',
  autoRotate = true,
  userId,
}) => {
  // Use performance level to optimize particle counts and quality
  const { performanceLevel, particleCountScale, renderQuality } = usePerformanceLevel();
  
  // Use IntersectionObserver to detect if the globe is in the viewport
  const [isInViewport, setIsInViewport] = useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            setIsInViewport(entry.isIntersecting);
          });
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(containerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Transform places data into the format expected by GeoNetworkGlobe
  const geoNetworkData: GeoNetworkData = useMemo(() => {
    if (!placesData || placesData.length === 0) {
      return { nodes: [], connections: [] };
    }

    // Transform place data into nodes
    const nodes = placesData.map((place, index) => ({
      id: place.id || `place-${index}`,
      name: place.name || 'Unknown Place',
      type: 'activity' as const,
      latitude: place.latitude || 0,
      longitude: place.longitude || 0,
      size: 0.05,
      strength: place.rating ? place.rating / 5 : 0.5,
      isHotspot: Boolean(place.rating && place.rating > 4),
      activities: place.activities || [],
      userData: place
    }));

    // Limit nodes based on performance level
    const maxNodeCount = Math.floor(100 * particleCountScale);
    const optimizedNodes = nodes.slice(0, maxNodeCount);

    // Create connections between nearby nodes
    const connections = [];
    for (let i = 0; i < optimizedNodes.length; i++) {
      for (let j = i + 1; j < optimizedNodes.length; j++) {
        // Calculate distance between nodes (simplified)
        const dist = Math.sqrt(
          Math.pow(optimizedNodes[i].latitude - optimizedNodes[j].latitude, 2) +
          Math.pow(optimizedNodes[i].longitude - optimizedNodes[j].longitude, 2)
        );

        // Create connection if close enough
        if (dist < 5) {
          connections.push({
            source: optimizedNodes[i].id,
            target: optimizedNodes[j].id,
            strength: 1 - dist / 5,
          });
        }
      }
    }

    return {
      nodes: optimizedNodes,
      connections: connections,
    };
  }, [placesData, particleCountScale]);

  // Only render the globe if it's visible and in the viewport
  if (!isVisible) {
    return null;
  }

  // Adjust quality settings based on performance level
  const globeSize = renderQuality < 0.5 ? 1.5 : 2;

  return (
    <div
      ref={containerRef}
      className={`globe-view ${className}`}
      style={{
        opacity,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: opacity > 0.5 ? 'auto' : 'none',
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      {(isInViewport || opacity > 0) && (
        <GeoNetworkGlobe
          data={geoNetworkData}
          height="100%"
          width="100%"
          backgroundColor="transparent"
          onNodeClick={onNodeClick}
          highlightedNodeId={highlightedNodeId}
          userId={userId}
          autoRotate={autoRotate && isInViewport}
          globeSize={globeSize}
          showParticles={performanceLevel !== 'low'}
        />
      )}
    </div>
  );
};

export default GlobeView;

