'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import CalendarContainer from '@/components/calendar/CalendarContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { FilterState, DEFAULT_FILTER_STATE } from '@/types/filters';
import { useToast } from '@/components/ui/use-toast';
import { Views } from 'react-big-calendar';
import styles from './LandingPageCalendar.module.css';

// ==========================================
// Type Definitions
// ==========================================

interface CalendarEventType {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  eventTypeId: number;
  location: {
    id: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  capacity: number;
  currentParticipants: number;
  participants: string[];
  description?: string;
  isCreator: boolean;
  isHighlyAcknowledged: boolean;
  isJoined: boolean;
  createdBy: string;
}

interface UserPreferences {
  defaultView: string;
  defaultDate: Date;
  initialFilters: Partial<FilterState>;
  compactView: boolean;
  showControls: boolean;
}

// ==========================================
// Constants
// ==========================================

// Mock data for initial events - in a real app this would come from an API
const SAMPLE_EVENTS: CalendarEventType[] = [
  {
    id: '1',
    title: 'City Walking Tour',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 86400000 + 7200000).toISOString(), // +2 hours
    eventTypeId: 2, // Outdoor and Active
    location: {
      id: 'loc1',
      name: 'Location 1',
      address: 'Central Park',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    price: 25,
    capacity: 15,
    currentParticipants: 8,
    participants: [],
    description: 'Explore the city with our experienced guides.',
    isCreator: false,
    isHighlyAcknowledged: true,
    isJoined: false,
    createdBy: 'user1'
  },
  {
    id: '2',
    title: 'Yoga in the Park',
    startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    endTime: new Date(Date.now() + 172800000 + 5400000).toISOString(), // +1.5 hours
    eventTypeId: 1, // Relax and Wellness
    location: {
      id: 'loc2',
      name: 'Location 2',
      address: 'Riverside Park',
      coordinates: { lat: 34.0522, lng: -118.2437 }
    },
    price: 0,
    capacity: 20,
    currentParticipants: 12,
    participants: [],
    description: 'Join us for a relaxing yoga session in the park.',
    isCreator: false,
    isHighlyAcknowledged: false,
    isJoined: false,
    createdBy: 'user2'
  },
  {
    id: '3',
    title: 'Food Festival',
    startTime: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    endTime: new Date(Date.now() + 259200000 + 14400000).toISOString(), // +4 hours
    eventTypeId: 5, // Food and Family
    location: {
      id: 'loc3',
      name: 'Location 3',
      address: 'Downtown Plaza',
      coordinates: { lat: 41.8781, lng: -87.6298 }
    },
    price: 15,
    capacity: 100,
    currentParticipants: 45,
    participants: [],
    description: 'Taste delicious food from various cultures at our annual festival.',
    isCreator: false,
    isHighlyAcknowledged: true,
    isJoined: false,
    createdBy: 'user3'
  }
];

// Custom initial filter state with preset locations and types
const LANDING_PAGE_FILTERS: Partial<FilterState> = {
  ...DEFAULT_FILTER_STATE,
  locations: ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'],
  typeIds: [1, 2, 5], // Relax and Wellness, Outdoor and Active, Food and Family
};

// ==========================================
// Helper Components
// ==========================================

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
  <Alert variant="destructive" className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error loading calendar</AlertTitle>
    <AlertDescription>
      <p>Failed to load calendar data: {error.message}</p>
      <button 
        onClick={resetErrorBoundary} 
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </AlertDescription>
  </Alert>
);

// Loading skeleton for the calendar - optimized with React.memo
const CalendarSkeleton = React.memo(() => (
  <div className="space-y-4">
    {/* Filter bar skeleton */}
    <div className={`rounded-lg bg-gray-100 p-4 ${styles['loading-skeleton']}`}>
      <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-3"></div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 bg-gray-200 rounded-full w-24"></div>
        ))}
      </div>
    </div>
    
    {/* Calendar skeleton */}
    <div className={`bg-white rounded-lg p-4 h-[500px] ${styles['loading-skeleton']}`}>
      <div className="h-12 bg-gray-200 rounded-md w-full mb-4"></div>
      <div className="grid grid-cols-7 gap-2 h-[400px]">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-md h-full"></div>
        ))}
      </div>
    </div>
  </div>
));

// Set display name for better debugging
CalendarSkeleton.displayName = 'CalendarSkeleton';

// ==========================================
// Utility Functions
// ==========================================

// Custom styling through CSS selector targeting
const injectGlobalStyles = () => {
  // These styles target specific classes that are not easily targetable through the module CSS
  const customStyles = `
    /* Customize calendar toolbar */
    .rbc-toolbar {
      margin-bottom: 12px !important;
    }
    
    /* More specific selectors for toolbar buttons */
    .rbc-toolbar button {
      background-color: #f5f5f5 !important;
      border-radius: 4px !important;
      transition: all 0.2s ease !important;
    }
    
    .rbc-toolbar button.rbc-active {
      background-color: #3b82f6 !important;
      color: white !important;
    }
    
    /* Responsive filter bar classes */
    @media (max-width: 768px) {
      .calendar-filter-bar .filter-section {
        padding: 0.5rem !important;
      }
      
      .rbc-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      
      .rbc-toolbar button {
        padding: 0.3rem 0.5rem !important;
        margin-bottom: 4px !important;
      }
    }
  `;
  
  return customStyles;
};

// ==========================================
// Main Component
// ==========================================

const LandingPageCalendar: React.FC = () => {
  // ==========================================
  // Hooks & State
  // ==========================================
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const isMediumScreen = useMediaQuery('(max-width: 1024px)');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<CalendarEventType[]>([]);

  // ==========================================
  // Event Handlers & Callbacks
  // ==========================================
  
  // Determine the default view based on screen size
  const getDefaultView = useCallback(() => {
    if (isSmallScreen) return Views.DAY;
    if (isMediumScreen) return Views.WEEK;
    return Views.MONTH;
  }, [isSmallScreen, isMediumScreen]);

  // Handle event selection
  const handleEventSelect = useCallback((event: CalendarEventType) => {
    toast({
      title: event.title,
      description: `${event.description || 'No description'} at ${event.location.name}`,
      duration: 4000, // Show toast for 4 seconds
    });
  }, [toast]);
  
  // Prepare user preferences object with proper typing
  const userPreferences = useMemo<UserPreferences>(() => ({
    defaultView: getDefaultView(),
    defaultDate: new Date(),
    initialFilters: LANDING_PAGE_FILTERS,
    compactView: isSmallScreen,
    showControls: !isSmallScreen
  }), [getDefaultView, isSmallScreen]);

  // ==========================================
  // Side Effects
  // ==========================================
  
  // Simulate data fetching with loading state and proper cleanup
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call with signal
        // const response = await fetch('/api/featured-events', { 
        //   signal: controller.signal 
        // });
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Only update state if the component is still mounted
        if (isMounted) {
          setInitialData(SAMPLE_EVENTS);
        }
      } catch (error) {
        // Only handle errors if not aborted and component is mounted
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error fetching events:', error);
          toast({
            title: 'Error',
            description: 'Failed to load event data',
            variant: 'destructive',
          });
        }
      } finally {
        // Only update loading state if still mounted
        if (isMounted) {
          // Add a small delay for smoother transition
          setTimeout(() => {
            setIsLoading(false);
          }, 100);
        }
      }
    };

    fetchData();
    
    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [toast]);
  
  // Include the responsive styles
  useEffect(() => {
    // Add the custom styles to the document
    const style = document.createElement('style');
    style.innerHTML = injectGlobalStyles();
    style.setAttribute('id', 'landing-page-calendar-styles');
    document.head.appendChild(style);
    
    // Cleanup function to remove styles when component unmounts
    return () => {
      const styleElement = document.getElementById('landing-page-calendar-styles');
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // ==========================================
  // Render Logic
  // ==========================================
  
  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <div className="transition-opacity duration-300 ease-in-out">
        <CalendarSkeleton />
      </div>
    );
  }

  // Render the calendar container with events
  return (
    <div 
      className={`transition-all duration-300 opacity-100 ${styles['animate-fadeIn']} ${
        isSmallScreen 
          ? 'max-h-[500px] overflow-y-auto' 
          : isMediumScreen 
            ? 'max-h-[650px] overflow-y-auto' 
            : ''
      }`}
    >
      <CalendarContainer 
        initialEvents={initialData}
        userPreferences={userPreferences}
        onEventSelect={handleEventSelect}
      />
    </div>
  );
};

export default LandingPageCalendar;

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import CalendarContainer from '@/components/calendar/CalendarContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { FilterState, DEFAULT_FILTER_STATE } from '@/types/filters';
import { useToast } from '@/components/ui/use-toast';
import { Views } from 'react-big-calendar';
import styles from './LandingPageCalendar.module.css';

// ==========================================
// Type Definitions
// ==========================================

interface CalendarEventType {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  eventTypeId: number;
  location: {
    id: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  capacity: number;
  currentParticipants: number;
  participants: string[];
  description?: string;
  isCreator: boolean;
  isHighlyAcknowledged: boolean;
  isJoined: boolean;
  createdBy: string;
}

interface UserPreferences {
  defaultView: string;
  defaultDate: Date;
  initialFilters: Partial<FilterState>;
  compactView: boolean;
  showControls: boolean;
}

// ==========================================
// Constants
// ==========================================

// Mock data for initial events - in a real app this would come from an API
const SAMPLE_EVENTS: CalendarEventType[] = [
  {
    id: '1',
    title: 'City Walking Tour',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 86400000 + 7200000).toISOString(), // +2 hours
    eventTypeId: 2, // Outdoor and Active
    location: {
      id: 'loc1',
      name: 'Location 1',
      address: 'Central Park',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    price: 25,
    capacity: 15,
    currentParticipants: 8,
    participants: [],
    description: 'Explore the city with our experienced guides.',
    isCreator: false,
    isHighlyAcknowledged: true,
    isJoined: false,
    createdBy: 'user1'
  },
  {
    id: '2',
    title: 'Yoga in the Park',
    startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    endTime: new Date(Date.now() + 172800000 + 5400000).toISOString(), // +1.5 hours
    eventTypeId: 1, // Relax and Wellness
    location: {
      id: 'loc2',
      name: 'Location 2',
      address: 'Riverside Park',
      coordinates: { lat: 34.0522, lng: -118.2437 }
    },
    price: 0,
    capacity: 20,
    currentParticipants: 12,
    participants: [],
    description: 'Join us for a relaxing yoga session in the park.',
    isCreator: false,
    isHighlyAcknowledged: false,
    isJoined: false,
    createdBy: 'user2'
  },
  {
    id: '3',
    title: 'Food Festival',
    startTime: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    endTime: new Date(Date.now() + 259200000 + 14400000).toISOString(), // +4 hours
    eventTypeId: 5, // Food and Family
    location: {
      id: 'loc3',
      name: 'Location 3',
      address: 'Downtown Plaza',
      coordinates: { lat: 41.8781, lng: -87.6298 }
    },
    price: 15,
    capacity: 100,
    currentParticipants: 45,
    participants: [],
    description: 'Taste delicious food from various cultures at our annual festival.',
    isCreator: false,
    isHighlyAcknowledged: true,
    isJoined: false,
    createdBy: 'user3'
  }
];

// Custom initial filter state with preset locations and types
const LANDING_PAGE_FILTERS: Partial<FilterState> = {
  ...DEFAULT_FILTER_STATE,
  locations: ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'],
  typeIds: [1, 2, 5], // Relax and Wellness, Outdoor and Active, Food and Family
};

// ==========================================
// Helper Components
// ==========================================

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
  <Alert variant="destructive" className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error loading calendar</AlertTitle>
    <AlertDescription>
      <p>Failed to load calendar data: {error.message}</p>
      <button 
        onClick={resetErrorBoundary} 
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </AlertDescription>
  </Alert>
);

// Loading skeleton for the calendar - optimized with React.memo
const CalendarSkeleton = React.memo(() => (
  <div className="space-y-4">
    {/* Filter bar skeleton */}
    <div className={`rounded-lg bg-gray-100 p-4 ${styles['loading-skeleton']}`}>
      <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-3"></div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 bg-gray-200 rounded-full w-24"></div>
        ))}
      </div>
    </div>
    
    {/* Calendar skeleton */}
    <div className={`bg-white rounded-lg p-4 h-[500px] ${styles['loading-skeleton']}`}>
      <div className="h-12 bg-gray-200 rounded-md w-full mb-4"></div>
      <div className="grid grid-cols-7 gap-2 h-[400px]">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-md h-full"></div>
        ))}
      </div>
    </div>
  </div>
));

// Set display name for better debugging
CalendarSkeleton.displayName = 'CalendarSkeleton';

// ==========================================
// Utility Functions
// ==========================================

// Custom styling through CSS selector targeting
const injectGlobalStyles = () => {
  // These styles target specific classes that are not easily targetable through the module CSS
  const customStyles = `
    /* Customize calendar toolbar */
    .rbc-toolbar {
      margin-bottom: 12px !important;
    }
    
    /* More specific selectors for toolbar buttons */
    .rbc-toolbar button {
      background-color: #f5f5f5 !important;
      border-radius: 4px !important;
      transition: all 0.2s ease !important;
    }
    
    .rbc-toolbar button.rbc-active {
      background-color: #3b82f6 !important;
      color: white !important;
    }
    
    /* Responsive filter bar classes */
    @media (max-width: 768px) {
      .calendar-filter-bar .filter-section {
        padding: 0.5rem !important;
      }
      
      .rbc-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      
      .rbc-toolbar button {
        padding: 0.3rem 0.5rem !important;
        margin-bottom: 4px !important;
      }
    }
  `;
  
  return customStyles;
};

// ==========================================
// Main Component
// ==========================================

const LandingPageCalendar: React.FC = () => {
  // ==========================================
  // Hooks & State
  // ==========================================
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const isMediumScreen = useMediaQuery('(max-width: 1024px)');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<CalendarEventType[]>([]);

  // ==========================================
  // Event Handlers & Callbacks
  // ==========================================
  
  // Determine the default view based on screen size
  const getDefaultView = useCallback(() => {
    if (isSmallScreen) return Views.DAY;
    if (isMediumScreen) return Views.WEEK;
    return Views.MONTH;
  }, [isSmallScreen, isMediumScreen]);

  // Handle event selection
  const handleEventSelect = useCallback((event: CalendarEventType) => {
    toast({
      title: event.title,
      description: `${event.description || 'No description'} at ${event.location.name}`,
      duration: 4000, // Show toast for 4 seconds
    });
  }, [toast]);
  
  // Prepare user preferences object with proper typing
  const userPreferences = useMemo<UserPreferences>(() => ({
    defaultView: getDefaultView(),
    defaultDate: new Date(),
    initialFilters: LANDING_PAGE_FILTERS,
    compactView: isSmallScreen,
    showControls: !isSmallScreen
  }), [getDefaultView, isSmallScreen]);

  // ==========================================
  // Side Effects
  // ==========================================
  
  // Simulate data fetching with loading state and proper cleanup
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call with signal
        // const response = await fetch('/api/featured-events', { 
        //   signal: controller.signal 
        // });
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Only update state if the component is still mounted
        if (isMounted) {
          setInitialData(SAMPLE_EVENTS);
        }
      } catch (error) {
        // Only handle errors if not aborted and component is mounted
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error fetching events:', error);
          toast({
            title: 'Error',
            description: 'Failed to load event data',
            variant: 'destructive',
          });
        }
      } finally {
        // Only update loading state if still mounted
        if (isMounted) {
          // Add a small delay for smoother transition
          setTimeout(() => {
            setIsLoading(false);
          }, 100);
        }
      }
    };

    fetchData();
    
    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [toast]);
  
  // Include the responsive styles
  useEffect(() => {
    // Add the custom styles to the document
    const style = document.createElement('style');
    style.innerHTML = injectGlobalStyles();
    style.setAttribute('id', 'landing-page-calendar-styles');
    document.head.appendChild(style);
    
    // Cleanup function to remove styles when component unmounts
    return () => {
      const styleElement = document.getElementById('landing-page-calendar-styles');
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  // ==========================================
  // Render Logic
  // ==========================================
  
  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <div className="transition-opacity duration-300 ease-in-out">
        <CalendarSkeleton />
      </div>
    );
  }

  // Render the calendar container with events
  return (
    <div 
      className={`transition-all duration-300 opacity-100 ${styles['animate-fadeIn']} ${
        isSmallScreen 
          ? 'max-h-[500px] overflow-y-auto' 
          : isMediumScreen 
            ? 'max-h-[650px] overflow-y-auto' 
            : ''
      }`}
    >
      <CalendarContainer 
        initialEvents={initialData}
        userPreferences={userPreferences}
        onEventSelect={handleEventSelect}
      />
    </div>
  );
};

export default LandingPageCalendar;

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import CalendarContainer from '@/components/calendar/CalendarContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { FilterState, DEFAULT_FILTER_STATE } from '@/types/filters';
import { useToast } from '@/components/ui/use-toast';
import { Views } from 'react-big-calendar';
import styles from './LandingPageCalendar.module.css';

// Define interfaces for proper typing
interface CalendarEventType {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  eventTypeId: number;
  location: {
    id: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  capacity: number;
  currentParticipants: number;
  participants: string[];
  description?: string;
  isCreator: boolean;
  isHighlyAcknowledged: boolean;
  isJoined: boolean;
  createdBy: string;
}

interface UserPreferences {
  defaultView: string;
  defaultDate: Date;
  initialFilters: Partial<FilterState>;
  compactView: boolean;
  showControls: boolean;
}

// Mock data for initial events - in a real app this would come from an API
const SAMPLE_EVENTS: CalendarEventType[] = [
  {
    id: '1',
    title: 'City Walking Tour',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 86400000 + 7200000).toISOString(), // +2 hours
    eventTypeId: 2, // Outdoor and Active
    location: {
      id: 'loc1',
      name: 'Location 1',
      address: 'Central Park',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    price: 25,
    capacity: 15,
    currentParticipants: 8,
    participants: [],
    description: 'Explore the city with our experienced guides.',
    isCreator: false,
    isHighlyAcknowledged: true,
    isJoined: false,
    createdBy: 'user1'
  },
  {
    id: '2',
    title: 'Yoga in the Park',
    startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    endTime: new Date(Date.now() + 172800000 + 5400000).toISOString(), // +1.5 hours
    eventTypeId: 1, // Relax and Wellness
    location: {
      id: 'loc2',
      name: 'Location 2',
      address: 'Riverside Park',
      coordinates: { lat: 34.0522, lng: -118.2437 }
    },
    price: 0,
    capacity: 20,
    currentParticipants: 12,
    participants: [],
    description: 'Join us for a relaxing yoga session in the park.',
    isCreator: false,
    isHighlyAcknowledged: false,
    isJoined: false,
    createdBy: 'user2'
  },
  {
    id: '3',
    title: 'Food Festival',
    startTime: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    endTime: new Date(Date.now() + 259200000 + 14400000).toISOString(), // +4 hours
    eventTypeId: 5, // Food and Family
    location: {
      id: 'loc3',// Add custom styling through CSS selector targeting
const injectGlobalStyles = () => {
  // These styles target specific classes that are not easily targetable through the module CSS
  const customStyles = `
    /* Customize calendar toolbar */
    .rbc-toolbar {
      margin-bottom: 12px !important;
    }
    
    /* More specific selectors for toolbar buttons */
    .rbc-toolbar button {
      background-color: #f5f5f5 !important;
      border-radius: 4px !important;
      transition: all 0.2s ease !important;
    }
    
    .rbc-toolbar button.rbc-active {
      background-color: #3b82f6 !important;
      color: white !important;
    }
    
    /* Responsive filter bar classes */
    @media (max-width: 768px) {
      .calendar-filter-bar .filter-section {
        padding: 0.5rem !important;
      }
      
      .rbc-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      
      .rbc-toolbar button {
        padding: 0.3rem 0.5rem !important;
        margin-bottom: 4px !important;
      }
    }
  `;
  
  return customStyles;
};
// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
  <Alert variant="destructive" className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error loading calendar</AlertTitle>
    <AlertDescription>
      <p>Failed to load calendar data: {error.message}</p>
      <button 
        onClick={resetErrorBoundary} 
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </AlertDescription>
  </Alert>
);

// Loading skeleton for the calendar - optimized with React.memo
const CalendarSkeleton = React.memo(() => (
  <div className="space-y-4">
    {/* Filter bar skeleton */}
    <div className={`rounded-lg bg-gray-100 p-4 ${styles['loading-skeleton']}`}>
      <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-3"></div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 bg-gray-200 rounded-full w-24"></div>
        ))}
      </div>
    </div>
    
    {/* Calendar skeleton */}
    <div className={`bg-white rounde
// Add custom styling through CSS selector targeting
const injectGlobalStyles = () => {
  // These styles target specific classes that are not easily targetable through the module CSS
  const customStyles = `
    /* Customize calendar toolbar */
    .rbc-toolbar {
      margin-bottom: 12px !important;
    }
    
    /* More specific selectors for toolbar buttons */
    .rbc-toolbar button {
      background-color: #f5f5f5 !important;
      border-radius: 4px !important;
      transition: all 0.2s ease !important;
    }
    
    .rbc-toolbar button.rbc-active {
      background-color: #3b82f6 !important;
      color: white !important;
    }
    
    /* Responsive filter bar classes */
    @media (max-width: 768px) {
      .calendar-filter-bar .filter-section {
        padding: 0.5rem !important;
      }
      
      .rbc-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      
      .rbc-toolbar button {
        padding: 0.3rem 0.5rem !important;
        margin-bottom: 4px !important;
      }
    }
  `;
  
  return customStyles;
};
// Modified calendar container for the landing page
const LandingPageCalendar: React.FC = () => {
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const isMediumScreen = useMediaQuery('(max-width: 1024px)');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<CalendarEventType[]>([]);
// Simulate data fetching with loading state and proper cleanup
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call with signal
        // const response = await fetch('/api/featured-events', { 
        //   signal: controller.signal 
        // });
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Only update state if the component is still mounted
        if (isMounted) {
          setInitialData(SAMPLE_EVENTS);
        }
      } catch (error) {
        // Only handle errors if not aborted and component is mounted
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error fetching events:', error);
          toast({
            title: 'Error',
            description: 'Failed to load event data',
            variant: 'destructive',
          });
        }
      } finally {
        // Only update loading state if still mounted
        if (isMounted) {
          // Add a small delay for smoother transition
          setTimeout(() => {
            setIsLoading(false);
          }, 100);
        }
      }
    };

    fetchData();
    
    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [toast]);
  // Determine the default view based on screen size
  const getDefaultView = useCallback(() => {
    if (isSmallScreen) return Views.DAY;
    if (isMediumScreen) return Views.WEEK;
    return Views.MONTH;
  }, [isSmallScreen, isMediumScreen]);
// Include the responsive styles
  useEffect(() => {
    // Add the custom styles to the document
    const style = document.createElement('style');
    style.innerHTML = injectGlobalStyles();
    style.setAttribute('id', 'landing-page-calendar-styles');
    document.head.appendChild(style);
    
    // Cleanup function to prevent memo  // Define event handlers with useCallback for better performance
  const handleEventSelect = useCallback((event: CalendarEventType) => {
    toast({
      title: event.title,
      description: `${event.description || 'No description'} at ${event.location.name}`,
      duration: 4000, // Show toast for 4 seconds
    });
  }, [toast]);
  // Prepare user preferences object with proper typing
  const userPreferences = useMemo<UserPreferences>(() => ({
    defaultView: getDefaultView(),
    defaultDate: new Date(),
    initialFilters: LANDING_PAGE_FILTERS,
    compactView: isSmallScreen,
    showControls: !isSmallScreen
  }), [getDefaultView, isSmallScreen]);
  
  // Transition between loading and loaded states
  if (isLoading) {
    return (
      <div className="transition-opacity duration-300 ease-in-out">
        <CalendarSkeleton />
      </div>
    );
  }
    <div 
      className={`transition-all duration-300 opacity-100 animate-fadeIn ${
        isSmallScreen 
          ? 'max-h-[500px] overflow-y-auto' 
          : isMediumScreen 
            ? 'max-h-[650px] overflow-y-auto' 
            : ''
      }`}
    >
      <CalendarContainer 
        initialEvents={initialData}
        userPreferences={{
          defaultView: getDefaultView(),
          defaultDate: new Date(),
          initialFilters: LANDING_PAGE_FILTERS,
          compactView: isSmallScreen,
          showControls: !isSmallScreen
        }}
        onEventSelect={handleEventSelect}
      />
    </div>
  );

export default LandingPageCalendar;

