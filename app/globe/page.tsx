'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MarketplaceActivity } from '@/types/marketplace';

// Loading indicator component
const GlobeLoadingIndicator = () => (
  <div className="flex flex-col items-center justify-center h-[70vh] w-full">
    <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
    <p className="mt-4 text-lg font-medium text-gray-700">Loading Globe...</p>
  </div>
);

// Dynamically import GeoNetworkGlobe
const GeoNetworkGlobe = dynamic(
  () => import('@/components/GeoNetworkGlobe'),
  { ssr: false, loading: () => <GlobeLoadingIndicator /> }
);

interface PageState {
  userLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  isLoadingLocation: boolean;
  activities: MarketplaceActivity[];
  isLoadingActivities: boolean;
  error: string | null;
  selectedActivity: MarketplaceActivity | null;
}

const generateMockActivities = (lat: number, lng: number, count: number): MarketplaceActivity[] => {
  const activities: MarketplaceActivity[] = [];
  const types = ['Tour', 'Accommodation', 'Experience', 'Restaurant', 'Transportation'];
  const popularityLevels = ['Low', 'Medium', 'High', 'Very High'];

  for (let i = 0; i < count; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.5;
    const offsetLng = (Math.random() - 0.5) * 0.5;
    
    activities.push({
      id: `activity-${i}`,
      name: `${types[i % types.length]} Activity ${i + 1}`,
      description: `A sample ${types[i % types.length].toLowerCase()} activity near location`,
      type: types[i % types.length],
      location: {
        latitude: lat + offsetLat,
        longitude: lng + offsetLng,
        address: `${Math.floor(Math.random() * 1000)} Sample St`
      },
      popularity: popularityLevels[Math.floor(Math.random() * popularityLevels.length)],
      price: Math.floor(Math.random() * 200) + 50,
      rating: Math.random() * 3 + 2,
      reviewCount: Math.floor(Math.random() * 500),
      correlationStrength: Math.random(),
      imageUrl: `https://source.unsplash.com/featured/?${types[i % types.length].toLowerCase()}`
    });
  }

  return activities;
};

export default function GlobePage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({
    userLocation: null,
    isLoadingLocation: true,
    activities: [],
    isLoadingActivities: true,
    error: null,
    selectedActivity: null,
  });

  const fetchActivities = useCallback(async (lat?: number, lng?: number) => {
    try {
      setState(prev => ({ ...prev, isLoadingActivities: true }));
      
      const response = await fetch(
        `/api/marketplace/activities${lat && lng ? `?lat=${lat}&lng=${lng}&radius=50` : ''}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      setState(prev => ({
        ...prev,
        activities: data.activities,
        isLoadingActivities: false,
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Load mock data on error
      const mockActivities = generateMockActivities(
        lat || 37.7749,
        lng || -122.4194,
        20
      );
      setState(prev => ({
        ...prev,
        activities: mockActivities,
        isLoadingActivities: false,
      }));
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        isLoadingLocation: false,
        error: "Your browser doesn't support geolocation."
      }));
      fetchActivities();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          userLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          isLoadingLocation: false,
        }));
        fetchActivities(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setState(prev => ({
          ...prev,
          isLoadingLocation: false,
          error: 'Unable to get your location. Showing global view.',
        }));
        fetchActivities();
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, [fetchActivities]);

  const handleActivitySelect = useCallback((activity: MarketplaceActivity) => {
    setState(prev => ({ ...prev, selectedActivity: activity }));
  }, []);

  const handleViewDetails = useCallback((activity: MarketplaceActivity) => {
    router.push(`/marketplace/activity/${activity.id}`);
  }, [router]);

  if (state.isLoadingLocation || state.isLoadingActivities) {
    return <GlobeLoadingIndicator />;
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="p-4 bg-gray-800 text-white">
        <h1 className="text-2xl font-bold">Global Activity Network</h1>
        <p className="text-sm opacity-75">
          Explore activities and connections around the world
        </p>
      </div>

      <div className="flex-1 relative">
        {state.error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md">
            {state.error}
          </div>
        )}

        <Suspense fallback={<GlobeLoadingIndicator />}>
          <GeoNetworkGlobe
            data={{
              nodes: state.activities.map(activity => ({
                id: activity.id,
                type: 'activity',
                name: activity.name,
                latitude: activity.location.latitude,
                longitude: activity.location.longitude,
                strength: activity.correlationStrength,
                isHotspot: activity.popularity === 'Very High',
                activities: [activity],
              })),
              connections: []
            }}
            userLocation={state.userLocation}
            onNodeClick={handleActivitySelect}
            highlightedNodeId={state.selectedActivity?.id}
            showParticles={true}
            showDetailPanel={true}
          />
        </Suspense>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { MarketplaceActivity } from '@/types/marketplace';

// Loading indicator component
const GlobeLoadingIndicator = () => (
  <div className="flex flex-col items-center justify-center h-[70vh] w-full">
    <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
    <p className="mt-4 text-lg font-medium text-gray-700">Loading Globe...</p>
  </div>
);

// Dynamically import GeoNetworkGlobe
const GeoNetworkGlobe = dynamic(
  () => import('@/components/GeoNetworkGlobe'),
  { ssr: false, loading: () => <GlobeLoadingIndicator /> }
);

interface PageState {
  userLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  isLoadingLocation: boolean;
  activities: MarketplaceActivity[];
  isLoadingActivities: boolean;
  error: string | null;
  selectedActivity: MarketplaceActivity | null;
}

export default function GlobePage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({
    userLocation: null,
    isLoadingLocation: true,
    activities: [],
    isLoadingActivities: true,
    error: null,
    selectedActivity: null,
  });

  // Get user's location and load activities
  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        isLoadingLocation: false,
        error: "Your browser doesn't support geolocation."
      }));
      fetchMarketplaceActivities();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          userLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          isLoadingLocation: false,
        }));
        fetchMarketplaceActivities(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setState(prev => ({
          ...prev,
          isLoadingLocation: false,
          error: 'Unable to get your location. Showing global view.',
        }));
        fetchMarketplaceActivities();
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, []);

  // Fetch marketplace activities
  const fetchMarketplaceActivities = async (lat?: number, lng?: number) => {
    try {
      setState(prev => ({ ...prev, isLoadingActivities: true }));
      
      const response = await fetch(
        `/api/marketplace/activities${lat && lng ? `?lat=${lat}&lng=${lng}&radius=50` : ''}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace activities');
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        activities: data.activities,
        isLoadingActivities: false,
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      setState(prev => ({
        ...prev,
        isLoadingActivities: false,
        error: 'Failed to load activities. Please try again later.',
      }));
    }
  };

  const handleActivitySelect = useCallback((activity: MarketplaceActivity) => {
    setState(prev => ({ ...prev, selectedActivity: activity }));
  }, []);

  const handleViewDetails = useCallback((activity: MarketplaceActivity) => {
    router.push(`/marketplace/activity/${activity.id}`);
  }, [router]);

  if (state.isLoadingLocation || state.isLoadingActivities) {
    return <GlobeLoadingIndicator />;
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="p-4 bg-gray-800 text-white">
        <h1 className="text-2xl font-bold">Global Activity Network</h1>
        <p className="text-sm opacity-75">
          Explore activities and connections around the world
        </p>
      </div>

      <div className="flex-1 relative">
        {state.error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md">
            {state.error}
          </div>
        )}

        <Suspense fallback={<GlobeLoadingIndicator />}>
          <GeoNetworkGlobe
            data={{
              nodes: state.activities.map(activity => ({
                id: activity.id,
                type: 'activity',
                name: activity.name,
                latitude: activity.location.latitude,
                longitude: activity.location.longitude,
                strength: activity.correlationStrength,
                isHotspot: activity.popularity === 'Very High',
                activities: [activity],
              })),
              connections: []
            }}
            userLocation={state.userLocation}
            onNodeClick={handleActivitySelect}
            highlightedNodeId={state.selectedActivity?.id}
            showParticles={true}
            showDetailPanel={true}
          />
        </Suspense>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { MarketplaceActivity } from '@/types/marketplace';

// Loading components
const GlobeLoadingIndicator = () => (
  <div className="flex flex-col items-center justify-center h-[70vh] w-full">
    <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
    <p className="mt-4 text-lg font-medium text-gray-700">Loading Globe...</p>
  </div>
);

// Dynamically import GeoNetworkGlobe
const GeoNetworkGlobe = dynamic(
  () => import('@/components/GeoNetworkGlobe'),
  { ssr: false, loading: () => <GlobeLoadingIndicator /> }
);

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface PageState {
  userLocation: UserLocation | null;
  isLoadingLocation: boolean;
  activities: MarketplaceActivity[];
  isLoadingActivities: boolean;
  error: string | null;
  selectedActivity: MarketplaceActivity | null;
}

export default function GlobePage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({
    userLocation: null,
    isLoadingLocation: true,
    activities: [],
    isLoadingActivities: true,
    error: null,
    selectedActivity: null,
  });

  // Get user's location
  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        isLoadingLocation: false,
        error: "Your browser doesn't support geolocation."
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          userLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          isLoadingLocation: false,
        }));
        // Load activities after getting location
        fetchMarketplaceActivities(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setState(prev => ({
          ...prev,
          isLoadingLocation: false,
          error: 'Unable to get your location. Showing global view.',
        }));
        // Load global activities
        fetchMarketplaceActivities();
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, []);

  const fetchMarketplaceActivities = async (lat?: number, lng?: number) => {
    try {
      setState(prev => ({ ...prev, isLoadingActivities: true }));
      
      const response = await fetch(
        `/api/marketplace/activities${lat && lng ? `?lat=${lat}&lng=${lng}&radius=50` : ''}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace activities');
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        activities: data.activities,
        isLoadingActivities: false,
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      setState(prev => ({
        ...prev,
        isLoadingActivities: false,
        error: 'Failed to load activities. Please try again later.',
      }));
    }
  };

  const handleActivitySelect = useCallback((activity: MarketplaceActivity) => {
    setState(prev => ({ ...prev, selectedActivity: activity }));
  }, []);

  const handleViewDetails = useCallback((activity: MarketplaceActivity) => {
    router.push(`/marketplace/activity/${activity.id}`);
  }, [router]);

  // Show loading state when both location and activities are loading
  if (state.isLoadingLocation || state.isLoadingActivities) {
    return <GlobeLoadingIndicator />;
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="p-4 bg-gray-800 text-white">
        <h1 className="text-2xl font-bold">Global Activity Network</h1>
        <p className="text-sm opacity-75">
          Explore activities and connections around the world
        </p>
      </div>

      <div className="flex-1 relative">
        {state.error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md">
            {state.error}
          </div>
        )}

        <Suspense fallback={<GlobeLoadingIndicator />}>
          <GeoNetworkGlobe
            data={{
              nodes: state.activities.map(activity => ({
                id: activity.id,
                type: 'activity',
                name: activity.name,
                latitude: activity.location.latitude,
                longitude: activity.location.longitude,
                strength: activity.correlationStrength,
                isHotspot: activity.popularity === 'Very High',
                activities: [activity],
              })),
              connections: []
            }}
            userLocation={state.userLocation}
            onNodeClick={handleActivitySelect}
            highlightedNodeId={state.selectedActivity?.id}
            showParticles={true}
            showDetailPanel={true}
          />
        </Suspense>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';

// Import GeoNetworkGlobe dynamically to avoid SSR issues
const GeoNetworkGlobe = dynamic(
  () => import('@/components/GeoNetworkGlobe'),
  { ssr: false }
);

interface GeoNode {
  id: string;
  name: string;
  type: 'user' | 'activity' | 'category' | 'interest';
  latitude: number;
  longitude: number;
  strength?: number;
  isHotspot?: boolean;
  activities?: Array<{
    id: string;
    name: string;
    description?: string;
    image?: string;
    rating?: number;
    price?: string;
  }>;
}

interface PageState {
  userLocation: { latitude: number; longitude: number } | null;
  nodes: GeoNode[];
  connections: Array<{
    source: string;
    target: string;
    strength: number;
  }>;
  selectedNode: string | null;
  error: string | null;
  isLoading: boolean;
}

export default function GlobePage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({
    userLocation: null,
    nodes: [],
    connections: [],
    selectedNode: null,
    error: null,
    isLoading: true
  });

  // Get user's location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState(prev => ({
            ...prev,
            userLocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }));
          // Load activities after getting location
          loadActivities(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setState(prev => ({
            ...prev,
            error: 'Unable to get your location. Showing global view.',
            isLoading: false
          }));
          // Load global activities
          loadActivities();
        }
      );
    } else {
      setState(prev => ({
        ...prev,
        error: 'Geolocation not supported. Showing global view.',
        isLoading: false
      }));
      // Load global activities
      loadActivities();
    }
  }, []);

  const loadActivities = async (lat?: number, lng?: number) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // In real implementation, fetch from your API
      const response = await fetch(
        `/api/activities${lat && lng ? `?lat=${lat}&lng=${lng}` : ''}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load activities');
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        nodes: data.nodes,
        connections: data.connections,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading activities:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load activities. Please try again.',
        isLoading: false
      }));
    }
  };

  const handleNodeClick = useCallback((node: GeoNode) => {
    setState(prev => ({
      ...prev,
      selectedNode: prev.selectedNode === node.id ? null : node.id
    }));

    if (node.type === 'activity') {
      router.push(`/marketplace/activity/${node.id}`);
    }
  }, [router]);

  if (state.isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <Spinner className="w-16 h-16 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="p-4 bg-gray-800 text-white">
        <h1 className="text-2xl font-bold">Global Activity Network</h1>
        <p className="text-sm opacity-75">
          Explore activities and connections around the world
        </p>
      </div>

      <div className="flex-1 relative">
        {state.error ? (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md">
            {state.error}
          </div>
        ) : null}

        <GeoNetworkGlobe
          data={{
            nodes: state.nodes,
            connections: state.connections
          }}
          onNodeClick={handleNodeClick}
          highlightedNodeId={state.selectedNode}
          userLocation={state.userLocation}
          height="100%"
          width="100%"
          showParticles={true}
          showDetailPanel={true}
        />
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Activity, GeoPoint, MarketplaceActivity } from '@/types/marketplace';

// Dynamically import the GeoNetworkGlobe component to avoid SSR issues with Three.js
const GeoNetworkGlobe = dynamic(
  () => import('@/components/GeoNetworkGlobe'),
  { ssr: false, loading: () => <GlobeLoadingIndicator /> }
);

// Types
interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface GlobePageState {
  userLocation: UserLocation | null;
  isLoadingLocation: boolean;
  activities: MarketplaceActivity[];
  isLoadingActivities: boolean;
  error: string | null;
  selectedActivity: MarketplaceActivity | null;
}

// Loading components
const GlobeLoadingIndicator = () => (
  <div className="flex flex-col items-center justify-center h-[70vh] w-full">
    <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
    <p className="mt-4 text-lg font-medium text-gray-700">Loading Globe...</p>
  </div>
);

const LoadingActivities = () => (
  <div className="absolute top-4 right-4 bg-white/80 dark:bg-gray-800/80 p-3 rounded-md shadow-lg backdrop-blur-sm z-10">
    <div className="flex items-center space-x-2">
      <div className="w-4 h-4 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin"></div>
      <p className="text-sm font-medium">Loading activity data...</p>
    </div>
  </div>
);

export default function GlobePage() {
  // State
  const [state, setState] = useState<GlobePageState>({
    userLocation: null,
    isLoadingLocation: true,
    activities: [],
    isLoadingActivities: true,
    error: null,
    selectedActivity: null,
  });
  
  const router = useRouter();

  // Get user's geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        isLoadingLocation: false,
        error: "Your browser doesn't support geolocation."
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          userLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          isLoadingLocation: false,
        }));
      },
      (error) => {
        console.error("Geolocation error:", error);
        setState(prev => ({
          ...prev,
          isLoadingLocation: false,
          error: "Unable to retrieve your location. Using default view."
        }));
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, []);

  // Fetch marketplace activities
  useEffect(() => {
    const fetchMarketplaceActivities = async () => {
      if (!state.userLocation) return;
      
      try {
        setState(prev => ({ ...prev, isLoadingActivities: true }));
        
        // Fetch activities from API based on user location
        // In a real application, this would be an API call to your backend
        const response = await fetch(
          `/api/marketplace/activities?lat=${state.userLocation.latitude}&lng=${state.userLocation.longitude}&radius=50`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch marketplace activities');
        }
        
        const data = await response.json();
        
        setState(prev => ({
          ...prev,
          activities: data.activities,
          isLoadingActivities: false,
        }));
      } catch (error) {
        console.error('Error fetching activities:', error);
        setState(prev => ({
          ...prev,
          isLoadingActivities: false,
          error: 'Failed to load marketplace activities. Please try again later.',
        }));
        
        // For demo purposes, load mock data if API fails
        loadMockData();
      }
    };

    const loadMockData = () => {
      // Mock data for demonstration purposes
      const mockActivities: MarketplaceActivity[] = generateMockActivities(
        state.userLocation?.latitude || 37.7749,
        state.userLocation?.longitude || -122.4194,
        50
      );
      
      setState(prev => ({
        ...prev,
        activities: mockActivities,
        isLoadingActivities: false,
      }));
    };

    if (state.userLocation) {
      fetchMarketplaceActivities();
    } else if (!state.isLoadingLocation && !state.userLocation) {
      // If geolocation failed, load mock data with default location
      loadMockData();
    }
  }, [state.userLocation, state.isLoadingLocation]);

  // Generate mock data (for demonstration purposes)
  const generateMockActivities = (centerLat: number, centerLng: number, count: number): MarketplaceActivity[] => {
    const activities: MarketplaceActivity[] = [];
    const activityTypes = ['Tour', 'Accommodation', 'Experience', 'Restaurant', 'Transportation'];
    const popularityLevels = ['Low', 'Medium', 'High', 'Very High'];

    for (let i = 0; i < count; i++) {
      // Generate random coordinates within ~50km of the center
      const lat = centerLat + (Math.random() - 0.5) * 0.9;
      const lng = centerLng + (Math.random() - 0.5) * 0.9;
      
      activities.push({
        id: `activity-${i}`,
        name: `Activity ${i+1}`,
        description: `This is a sample ${activityTypes[i % activityTypes.length]} activity near your location.`,
        type: activityTypes[i % activityTypes.length],
        location: {
          latitude: lat,
          longitude: lng,
          address: `${Math.floor(Math.random() * 1000)} Sample St, City`
        },
        popularity: popularityLevels[Math.floor(Math.random() * popularityLevels.length)],
        price: Math.floor(Math.random() * 200) + 10,
        rating: Math.min(5, Math.max(1, Math.random() * 5)),
        reviewCount: Math.floor(Math.random() * 200),
        imageUrl: `https://source.unsplash.com/random/300x200?${activityTypes[i % activityTypes.length].toLowerCase()}`,
        correlationStrength: Math.random() * 0.9 + 0.1, // Random value between 0.1 and 1.0
      });
    }
    
    return activities;
  };

  // Handle activity selection
  const handleActivitySelect = useCallback((activity: MarketplaceActivity) => {
    setState(prev => ({ ...prev, selectedActivity: activity }));
  }, []);

  // Handle view details click
  const handleViewDetails = useCallback((activity: MarketplaceActivity) => {
    router.push(`/marketplace/activity/${activity.id}`);
  }, [router]);

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Compute data for the globe visualization
  const globeData = useMemo(() => {
    if (state.activities.length === 0) return null;
    
    return {
      userLocation: state.userLocation,
      activities: state.activities,
      selectedActivity: state.selectedActivity,
    };
  }, [state.userLocation, state.activities, state.selectedActivity]);

  return (
    <div className="relative w-full h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Main Globe */}
      <div className="absolute inset-0">
        {globeData ? (
          <Suspense fallback={<GlobeLoadingIndicator />}>
            <GeoNetworkGlobe
              userLocation={globeData.userLocation}
              activities={globeData.activities}
              selectedActivity={globeData.selectedActivity}
              onActivitySelect={handleActivitySelect}
            />
          </Suspense>
        ) : (
          <GlobeLoadingIndicator />
        )}
      </div>
      
      {/* Loading indicator for activities */}
      {state.isLoadingActivities && <LoadingActivities />}
      
      {/* Error message */}
      {state.error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 text-red-800 p-4 rounded-md shadow-md z-50 max-w-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{state.error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={handleDismissError}
                className="inline-flex bg-red-50 rounded-md p-1 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Selected activity info panel */}
      {state.selectedActivity && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-lg w-full mx-4 z-20">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {state.selectedActivity.name}
              </h3>
              <button 
                onClick={() => setState(prev => ({ ...prev, selectedActivity: null }))}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium mr-2">{state.selectedActivity.type}</span>
              <span className="mx-1">•</span>
              <div className="flex items-center">
                <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="ml-1">{state.selectedActivity.rating.toFixed(1)}</span>
                <span className="ml-1">({state.selectedActivity.reviewCount})</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {state.selectedActivity.description}
            </p>
            
            <div className="flex justify-between items-center mt-2">
              <span className="font-medium text-lg text-gray-900 dark:text-white">
                ${state.selectedActivity.price}
              </span>
              <button
                onClick={() => handleViewDetails(state.selectedActivity!)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                View Details
              </button>
            </div>
          

"use client";

import { useState, useEffect } from 'react';
import GeoNetworkGlobe from '@/components/GeoNetworkGlobe';
import { getRecommendationService } from '@/lib/recommendations';

// Sample data structure with real geographic coordinates
const sampleNetworkData = {
  nodes: [
    { id: 'user1', type: 'user', lat: 37.7749, lng: -122.4194, name: 'Current User', strength: 1 }, // San Francisco
    { id: 'activity1', type: 'activity', lat: 40.7128, lng: -74.0060, name: 'New York Activity', strength: 0.8 }, // New York
    { id: 'activity2', type: 'activity', lat: 34.0522, lng: -118.2437, name: 'Los Angeles Activity', strength: 0.7 }, // Los Angeles
    { id: 'activity3', type: 'activity', lat: 51.5074, lng: -0.1278, name: 'London Activity', strength: 0.9 }, // London
    { id: 'activity4', type: 'activity', lat: 35.6762, lng: 139.6503, name: 'Tokyo Activity', strength: 0.6 }, // Tokyo
    { id: 'activity5', type: 'activity', lat: -33.8688, lng: 151.2093, name: 'Sydney Activity', strength: 0.5 }, // Sydney
    { id: 'activity6', type: 'activity', lat: 19.4326, lng: -99.1332, name: 'Mexico City Activity', strength: 0.4 }, // Mexico City
    { id: 'activity7', type: 'activity', lat: -22.9068, lng: -43.1729, name: 'Rio de Janeiro Activity', strength: 0.65 }, // Rio
    { id: 'activity8', type: 'activity', lat: 55.7558, lng: 37.6173, name: 'Moscow Activity', strength: 0.55 }, // Moscow
  ],
  connections: [
    { source: 'user1', target: 'activity1', strength: 0.8 },
    { source: 'user1', target: 'activity2', strength: 0.7 },
    { source: 'user1', target: 'activity3', strength: 0.9 },
    { source: 'user1', target: 'activity4', strength: 0.6 },
    { source: 'user1', target: 'activity5', strength: 0.5 },
    { source: 'user1', target: 'activity6', strength: 0.4 },
    { source: 'user1', target: 'activity7', strength: 0.65 },
    { source: 'user1', target: 'activity8', strength: 0.55 },
  ]
};

export default function GlobePage() {
  const [networkData, setNetworkData] = useState(sampleNetworkData);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate loading real data from recommendation service
  useEffect(() => {
    const loadRecommendationData = async () => {
      try {
        setIsLoading(true);
        // In a real implementation, we would fetch actual data:
        // const service = getRecommendationService();
        // const visualizationData = await service.getGeoVisualizationData(userId);
        // setNetworkData(visualizationData);
        
        // For now, use sample data with a delay to simulate loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        setNetworkData(sampleNetworkData);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load network data');
        setIsLoading(false);
        console.error('Error loading recommendation data:', err);
      }
    };

    loadRecommendationData();
  }, []);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
    // In a real implementation, we might load additional data about the selected node
    console.log(`Node clicked: ${nodeId}`);
  };

  const handleGlobeRotate = (lat: number, lng: number) => {
    console.log(`Globe rotated to: ${lat}, ${lng}`);
    // Handle globe rotation - could update camera focus or load region-specific data
  };

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="p-4 bg-gray-800 text-white">
        <h1 className="text-2xl font-bold">Global Activity Network</h1>
        <p className="text-sm opacity-75">
          Explore activities and connections around the world
        </p>
      </div>

      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : (
          <GeoNetworkGlobe 
            data={networkData}
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
            onGlobeRotate={handleGlobeRotate}
            highlightUser={true}
          />
        )}
      </div>

      <div className="p-4 bg-gray-800 text-white">
        {selectedNode ? (
          <div>
            <h2 className="font-bold">Selected: {
              networkData.nodes.find(node => node.id === selectedNode)?.name || selectedNode
            }</h2>
            <p>
              {networkData.connections.filter(conn => 
                conn.source === selectedNode || conn.target === selectedNode
              ).length} connections
            </p>
          </div>
        ) : (
          <p>Click on a node to see more details</p>
        )}
      </div>
    </div>
  );
}

