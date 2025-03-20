'use client';

import { useEffect } from 'react';

export default function MapPage(): JSX.Element {
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    // Dynamically import Leaflet and its CSS
    const initializeMap = async () => {
      // Check if map container exists
      const container = document.getElementById('map');
      if (!container) return;

      // Import Leaflet dynamically
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      
      const map = L.map('map').setView([51.505, -0.09], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Return map instance for cleanup
      return map;
    };

    // Initialize the map and store the instance
    let mapInstance: any;
    initializeMap().then(map => {
      if (map) mapInstance = map;
    });

    // Cleanup function to prevent memory leaks
    return () => {
      if (mapInstance) mapInstance.remove();
    };
  }, []);

  return (
    <div id="map" style={{ height: '100vh', width: '100%' }}></div>
  );
}

