import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVisualization } from '../context/VisualizationContext';
import { Place } from '../types/visualization';

interface MapViewProps {
  height?: string;
}

const MapView: React.FC<MapViewProps> = ({ height = '500px' }) => {
  const { state, selectPlace } = useVisualization();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{[key: string]: L.Marker}>({});

  const isValidCoordinate = (lat: number, lng: number) => {
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  };

  const initializeMap = () => {
    try {
      if (!mapRef.current && mapContainerRef.current) {
        const defaultPos = [37.7749, -122.4194];
        mapRef.current = L.map(mapContainerRef.current).setView(defaultPos as L.LatLngExpression, 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(mapRef.current);
      }
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  };

  const updateMarkers = () => {
    if (!mapRef.current || !state.places.length) return;

    try {
      // Clear existing markers
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      // Add new markers
      state.places.forEach((place) => {
        const { lat, lng } = place.location;
        if (!isValidCoordinate(lat, lng)) {
          console.warn(`Invalid coordinates for place: ${place.name}`);
          return;
        }

        const markerColor = getRatingColor(place.rating);
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; transition: all 0.3s ease;"></div>`,
          iconSize: [15, 15],
          iconAnchor: [7, 7]
        });
        
        const marker = L.marker([lat, lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="marker-popup">
              <strong>${place.name}</strong><br>
              Rating: ${place.rating}/5<br>
              Type: ${place.types.join(', ')}
            </div>
          `);
        
        marker.on('click', () => selectPlace(place));
        markersRef.current[place.id] = marker;
      });

      // Fit bounds with padding
      if (state.places.length > 0) {
        const latlngs = state.places
          .filter(place => isValidCoordinate(place.location.lat, place.location.lng))
          .map(place => [place.location.lat, place.location.lng]);
        
        if (latlngs.length > 0) {
          mapRef.current.fitBounds(latlngs as L.LatLngBoundsExpression, {
            padding: [50, 50],
            maxZoom: 15  // Prevent over-zooming
          });
        }
      }
    } catch (error) {
      console.error('Failed to update markers:', error);
    }
  };

  const updateSelectedMarker = () => {
    if (!mapRef.current) return;
    
    try {
      // Reset all markers to normal size
      Object.values(markersRef.current).forEach(marker => {
        const iconEl = marker.getElement()?.querySelector('div');
        if (iconEl) {
          iconEl.style.transform = 'scale(1)';
          iconEl.style.zIndex = '1';
          marker.closePopup();
        }
      });
      
      // Highlight selected marker
      if (state.selectedPlace) {
        const selectedMarker = markersRef.current[state.selectedPlace.id];
        if (selectedMarker) {
          const iconEl = selectedMarker.getElement()?.querySelector('div');
          if (iconEl) {
            iconEl.style.transform = 'scale(1.5)';
            iconEl.style.zIndex = '1000';
          }
          selectedMarker.openPopup();
          
          // Pan to selected marker
          const { lat, lng } = state.selectedPlace.location;
          if (isValidCoordinate(lat, lng)) {
            mapRef.current.panTo([lat, lng], {
              animate: true,
              duration: 0.5
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to update selected marker:', error);
    }
  };

  // Helper function to get color based on rating
  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return '#00CC00';
    if (rating >= 4.0) return '#88CC00';
    if (rating >= 3.5) return '#CCCC00';
    if (rating >= 3.0) return '#CC8800';
    return '#CC0000';
  };

  useEffect(() => {
    initializeMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    updateMarkers();
  }, [state.places, selectPlace]);

  useEffect(() => {
    updateSelectedMarker();
  }, [state.selectedPlace]);

  return (
    <div 
      data-testid="map-container"
      ref={mapContainerRef} 
      style={{ width: '100%', height }} 
      className="map-container rounded-lg overflow-hidden shadow-inner relative"
    >
      {state.loading && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default MapView;
