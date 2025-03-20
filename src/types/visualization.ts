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
}

export interface VisualizationNode {
  id: string;
  name: string;
  position: [number, number, number]; // 3D coordinates
  rating: number;
  type: string;
  color?: number;  // hex color
}

export interface VisualizationConnection {
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
