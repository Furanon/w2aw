import * as THREE from 'three';

// Basic visualization node representing a point on the globe
export interface VisualizationNode {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  position?: [number, number, number]; // Alternative to lat/lng, as [x, y, z]
  color?: string | number;
  size?: number;
  type?: string;
  rating?: number;
  details?: Record<string, any>;
  photos?: string[];
}

// Connection between two nodes
export interface VisualizationConnection {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  weight?: number;
  color?: string | number;
  type?: string;
  bidirectional?: boolean;
}

// Continent visualization types
export interface ContinentPoint {
  lat: number;
  lng: number;
}

export interface ContinentTriangle {
  points: [ContinentPoint, ContinentPoint, ContinentPoint];
}

export interface ContinentData {
  id: string;
  name: string;
  triangles: ContinentTriangle[];
  properties?: {
    color?: string;
    opacity?: number;
    weight?: number;
  };
}

export type ContinentMap = Map<string, ContinentData>;

// Utility functions
export const latLngToCartesian = (lat: number, lng: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
};

export const cartesianToLatLng = (x: number, y: number, z: number): [number, number] => {
  const radius = Math.sqrt(x * x + y * y + z * z);
  const lat = 90 - (Math.acos(y / radius) * 180 / Math.PI);
  const lng = (Math.atan2(z, -x) * 180 / Math.PI) - 180;
  return [lat, lng];
};

export const calculateGreatCircleDistance = (
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number, 
  radius: number
): number => {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
};

// Minimal continent boundary data - using triangulation for efficiency
export const CONTINENT_BOUNDARIES: ContinentData[] = [
  {
    id: 'na',
    name: 'North America',
    triangles: [
      {
        points: [
          { lat: 71.7069, lng: -156.1628 }, // Alaska
          { lat: 15.7835, lng: -90.2308 },  // Central America
          { lat: 50.4547, lng: -73.5170 }   // Eastern point
        ]
      }
    ]
  },
  {
    id: 'sa',
    name: 'South America',
    triangles: [
      {
        points: [
          { lat: 12.4690, lng: -71.7030 },  // Northern point
          { lat: -55.9798, lng: -67.2734 }, // Southern tip
          { lat: -9.1900, lng: -35.2513 }   // Eastern point
        ]
      }
    ]
  },
  {
    id: 'eu',
    name: 'Europe',
    triangles: [
      {
        points: [
          { lat: 71.1854, lng: 27.6987 },   // Northern point
          { lat: 36.8928, lng: -9.5019 },   // Western point
          { lat: 46.0733, lng: 38.3242 }    // Eastern point
        ]
      }
    ]
  },
  {
    id: 'af',
    name: 'Africa',
    triangles: [
      {
        points: [
          { lat: 35.7596, lng: 9.8241 },    // Northern point
          { lat: -34.8333, lng: 19.9739 },  // Southern point
          { lat: 4.8857, lng: 31.6363 }     // Eastern point
        ]
      }
    ]
  },
  {
    id: 'as',
    name: 'Asia',
    triangles: [
      {
        points: [
          { lat: 77.7167, lng: 104.3333 },  // Northern point
          { lat: 1.3333, lng: 103.8333 },   // Southern point
          { lat: 39.9289, lng: 116.3883 }   // Eastern point
        ]
      }
    ]
  },
  {
    id: 'oc',
    name: 'Oceania',
    triangles: [
      {
        points: [
          { lat: -10.6628, lng: 142.5269 }, // Northern point
          { lat: -43.6345, lng: 172.6362 }, // Southern point
          { lat: -25.2744, lng: 133.7751 }  // Center point
        ]
      }
    ]
  }
];

// Types for the visualization components

export interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  location: Location;
  rating: number;
  types: string[];
  photos: string[];
}\n16|\n17|export interface VisualizationNode {\n18|  id: string;\n19|  name: string;\n20|  position?: [number, number, number]; // 3D coordinates\n21|  lat?: number; // Latitude (alternative to position)\n22|  lng?: number; // Longitude (alternative to position)\n23|  rating: number;\n24|  type: string;\n25|  color?: number;  // hex color\n26|}\n27|

export interface VisualizationNode {
  id: string;
  name: string;
  position: [number, number, number]; // 3D coordinates
  rating: number;
  type: string;
  color?: number;  // hex color
}

export interface VisualizationConnection {\n29|  source: string;  // node id\n30|  target: string;  // node id\n31|  weight?: number;\n32|  type?: string; // 'primary', 'secondary', etc.\n33|  strength?: number; // 0-1 value affecting opacity\n34|  color?: number; // hex color\n35|}\n36|
  source: string;  // node id
  target: string;  // node id
  weight?: number;
  type?: string;
  strength?: number;
}

export interface VisualizationData {
  nodes: VisualizationNode[];
  connections: VisualizationConnection[];
}

export interface VisualizationState {
  places: Place[];
  visualizationData: VisualizationData | null;
  loading: boolean;
  error: string | null;
  selectedPlace: Place | null;
  view: 'globe' | 'map'; // Changed from viewMode to match usage in components
}

export function latLngToCartesian(lat: number, lng: number, radius: number = 100): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return [x, y, z];
}

// Continent visualization types
export interface ContinentPoint {
    lat: number;
    lng: number;
}

export interface ContinentTriangle {
    points: [ContinentPoint, ContinentPoint, ContinentPoint];
}

export interface ContinentData {
    id: string;
    name: string;
    triangles: ContinentTriangle[];
    properties?: {
        color?: string;
        opacity?: number;
        weight?: number;
    };
}

export type ContinentMap = Map<string, ContinentData>;

// Add continent boundary data
export const CONTINENT_BOUNDARIES: ContinentData[] = [
    {
        id: 'na',
        name: 'North America',
        triangles: [
            {
                points: [
                    { lat: 71.7069, lng: -156.1628 }, // Alaska
                    { lat: 15.7835, lng: -90.2308 },  // Central America
                    { lat: 50.4547, lng: -73.5170 }   // Eastern point
                ]
            }
        ]
    },
    {
        id: 'sa',
        name: 'South America',
        triangles: [
            {
                points: [
                    { lat: 12.4690, lng: -71.7030 },  // Northern point
                    { lat: -55.9798, lng: -67.2734 }, // Southern tip
                    { lat: -9.1900, lng: -35.2513 }   // Eastern point
                ]
            }
        ]
    },
    {
        id: 'eu',
        name: 'Europe',
        triangles: [
            {
                points: [
                    { lat: 71.1854, lng: 27.6987 },   // Northern point
                    { lat: 36.8928, lng: -9.5019 },   // Western point
                    { lat: 46.0733, lng: 38.3242 }    // Eastern point
                ]
            }
        ]
    },
    {
        id: 'af',
        name: 'Africa',
        triangles: [
            {
                points: [
                    { lat: 35.7596, lng: 9.8241 },    // Northern point
                    { lat: -34.8333, lng: 19.9739 },  // Southern point
                    { lat: 4.8857, lng: 31.6363 }     // Eastern point
                ]
            }
        ]
    },
    {
        id: 'as',
        name: 'Asia',
        triangles: [
            {
                points: [
                    { lat: 77.7167, lng: 104.3333 },  // Northern point
                    { lat: 1.3333, lng: 103.8333 },   // Southern point
                    { lat: 39.9289, lng: 116.3883 }   // Eastern point
                ]
            }
        ]
    },
    {
        id: 'oc',
        name: 'Oceania',
        triangles: [
            {
                points: [
                    { lat: -10.6628, lng: 142.5269 }, // Northern point
                    { lat: -43.6345, lng: 172.6362 }, // Southern point
                    { lat: -25.2744, lng: 133.7751 }  // Center point
                ]
            }
        ]
    }
];
