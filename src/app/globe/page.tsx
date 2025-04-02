'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MarketplaceActivity } from '@/types/marketplace';
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

  const handleViewDetails = useCallback((activity: MarketplaceActivity) => {
    router.push(`/marketplace/activity/${activity.id}`);
  }, [router]);

  if (state.isLoadingLocation || state.isLoadingActivities) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] w-full">
        <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
        <p className="mt-4 text-lg font-medium text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Global Network Visualization</h1>
        
        <div className="w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-semibold mb-4">Feature Removed</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            The Global Network Visualization feature has been temporarily removed for maintenance and improvements.
          </p>
          <p className="text-md text-gray-500 dark:text-gray-400">
            Please check back later for an enhanced version of this feature.
          </p>
          
          {state.selectedActivity && (
            <div className="mt-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg max-w-lg mx-auto">
              <h3 className="text-lg font-medium">Last Selected: {state.selectedActivity.name}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {state.selectedActivity.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

