"use client";

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { useGlobeData } from '@/hooks/useGlobeData';
import { 
  Place, 
  Location, 
  VisualizationState, 
  VisualizationData,
  latLngToCartesian
} from '@/types/visualization';

// Define action types
type Action =
  | { type: 'FETCH_DATA_START' }
  | { type: 'FETCH_DATA_SUCCESS'; payload: Place[] }
  | { type: 'FETCH_DATA_ERROR'; payload: string }
  | { type: 'SET_VISUALIZATION_DATA'; payload: VisualizationData }
  | { type: 'SET_SELECTED_PLACE'; payload: Place | null }
  | { type: 'SET_VIEW'; payload: 'globe' | 'map' };

// Define context types
type VisualizationContextType = {
  state: VisualizationState;
  fetchData: (location: Location, radius?: number) => Promise<void>;
  selectPlace: (place: Place | null) => void;
  setView: (mode: 'globe' | 'map') => void;
} | null;

// Create context
const VisualizationContext = createContext<VisualizationContextType | undefined>(undefined);

// Initial state
const initialState: VisualizationState = {
  places: [],
  visualizationData: null,
  loading: false,
  error: null,
  selectedPlace: null,
  view: 'globe',
};

// Reducer function
function reducer(state: VisualizationState, action: Action): VisualizationState {
  switch (action.type) {
    case 'FETCH_DATA_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_DATA_SUCCESS':
      return {
        ...state,
        loading: false,
        places: action.payload,
      };
    case 'FETCH_DATA_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'SET_VISUALIZATION_DATA':
      return {
        ...state,
        visualizationData: action.payload,
      };
    case 'SET_SELECTED_PLACE':
      return {
        ...state,
        selectedPlace: action.payload,
      };
    case 'SET_VIEW':
      return {
        ...state,
        view: action.payload,
      };
    default:
      return state;
  }
}

// Provider component
export const VisualizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  // Get globe data for visualization
  const globeData = useGlobeData();

  const fetchData = useCallback(async (location: Location, radius: number = 5000) => {
    dispatch({ type: 'FETCH_DATA_START' });
    
    try {
      // Mock implementation since service was removed
      // In a real implementation, this would call an API
      const mockData: Place[] = [
        {
          id: '1',
          name: 'Sample Place',
          location: { lat: location.lat, lng: location.lng },
          rating: 4.5,
          types: ['sample'],
          photos: []
        }
      ];
      
      dispatch({ type: 'FETCH_DATA_SUCCESS', payload: mockData });
      
      // Process data for visualization
      const nodes = mockData.map(place => ({
        id: place.id,
        name: place.name,
        position: latLngToCartesian(place.location.lat, place.location.lng, 1),
        rating: place.rating,
        type: place.types[0] || 'unknown'
      }));
      
      const visualizationData: VisualizationData = {
        nodes,
        connections: []
      };
      
      dispatch({ type: 'SET_VISUALIZATION_DATA', payload: visualizationData });
    } catch (error) {
      dispatch({ 
        type: 'FETCH_DATA_ERROR', 
        payload: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  }, []);

  const selectPlace = useCallback((place: Place | null) => {
    dispatch({ type: 'SET_SELECTED_PLACE', payload: place });
  }, []);

  const setView = useCallback((mode: 'globe' | 'map') => {
    dispatch({ type: 'SET_VIEW', payload: mode });
  }, []);

  const contextValue = useMemo(() => ({
    state: {
      ...state,
      visualizationData: state.visualizationData || globeData, // Use processed data or globe data
    },
    fetchData,
    selectPlace,
    setView,
  }), [state, globeData, fetchData, selectPlace, setView]);

  return (
    <VisualizationContext.Provider value={contextValue}>
      {children}
    </VisualizationContext.Provider>
  );
};

// Custom hook to use the context
export const useVisualization = (standalone = false) => {
  const context = useContext(VisualizationContext);
  
  if (!standalone && context === undefined) {
    throw new Error('useVisualization must be used within a VisualizationProvider');
  }
  
  return standalone ? null : context;
};
