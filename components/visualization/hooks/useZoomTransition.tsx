import { useState, useEffect, useCallback } from 'react';

interface UseZoomTransitionReturn {
  isGlobeView: boolean;      // Whether to show the globe view
  isMapView: boolean;        // Whether to show the map view
  globeOpacity: number;      // Opacity value for the globe view (0-1)
  mapOpacity: number;        // Opacity value for the map view (0-1)
  setZoomLevel: (zoom: number) => void; // Function to update zoom level
}

/**
 * Hook to manage transitions between globe and map views based on zoom level.
 * 
 * @param thresholdZoom - The zoom level threshold (default: 5)
 * @param transitionDuration - Duration of the transition in ms (default: 1000)
 * @returns - Object containing view states and opacity values
 */
export const useZoomTransition = (
  thresholdZoom = 5,
  transitionDuration = 1000
): UseZoomTransitionReturn => {
  const [zoomLevel, setZoomLevel] = useState(0); // Default to lowest zoom level (globe view)
  const [isGlobeView, setIsGlobeView] = useState(true);
  const [isMapView, setIsMapView] = useState(false);
  const [globeOpacity, setGlobeOpacity] = useState(1);
  const [mapOpacity, setMapOpacity] = useState(0);

  // Calculate the view mode based on current zoom level
  useEffect(() => {
    const isGlobe = zoomLevel < thresholdZoom;
    
    // Calculate opacity values for smooth transition
    const targetGlobeOpacity = isGlobe ? 1 : 0;
    const targetMapOpacity = isGlobe ? 0 : 1;
    
    // If we're exactly at the threshold, keep both views visible for smooth transition
    if (zoomLevel === thresholdZoom) {
      setIsGlobeView(true);
      setIsMapView(true);
      setGlobeOpacity(0.5);
      setMapOpacity(0.5);
      return;
    }
    
    // Start transition animation
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / transitionDuration, 1);
      
      // Calculate current opacity based on transition progress
      const currentGlobeOpacity = globeOpacity + (targetGlobeOpacity - globeOpacity) * progress;
      const currentMapOpacity = mapOpacity + (targetMapOpacity - mapOpacity) * progress;
      
      setGlobeOpacity(currentGlobeOpacity);
      setMapOpacity(currentMapOpacity);
      
      // Continue animation until complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // When transition is complete, only render the active view
        setIsGlobeView(isGlobe);
        setIsMapView(!isGlobe);
      }
    };
    
    // Start animation and keep both views visible during transition
    setIsGlobeView(true);
    setIsMapView(true);
    requestAnimationFrame(animate);
  }, [zoomLevel, thresholdZoom, transitionDuration, globeOpacity, mapOpacity]);

  // Memoize the setZoomLevel function to prevent unnecessary re-renders
  const handleZoomChange = useCallback((zoom: number) => {
    setZoomLevel(zoom);
  }, []);

  return {
    isGlobeView,
    isMapView,
    globeOpacity,
    mapOpacity,
    setZoomLevel: handleZoomChange
  };
};

export default useZoomTransition;

