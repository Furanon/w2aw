'use client';

import { useState, useCallback } from 'react';
import { 
  EVENT_TYPES, 
  FilterState, 
  EventSpecificCriteria, 
  DEFAULT_FILTER_STATE, 
  PAYMENT_STATUS_TYPES 
} from '@/types/filters';

/**
 * Interface representing an event that can be filtered
 */
export interface TimeSlot {
  id: string;
  title: string;
  start: Date;
  end: Date;
  typeId: number;
  location: string;
  isPaid: boolean;
  isTeacher: boolean;
  isHighlyAcknowledged?: boolean;
  userJoined?: boolean;
  description?: string;
  recurringId?: string;
  price?: number;
  instructorId?: string;
  capacity?: number;
  currentParticipants?: number;
  paymentStatus?: string;
}

/**
 * Options for initializing the useEventFilters hook
 */
export interface EventFilterOptions {
  /**
   * Initial state for the filters
   */
  initialFilters?: Partial<FilterState>;
  
  /**
   * Available locations for location filtering
   */
  availableLocations?: string[];
  
  /**
   * Available instructors for instructor filtering
   */
  availableInstructors?: Array<{ id: string, name: string }>;
}

/**
 * Hook for managing event filtering logic
 * 
 * @param options - Configuration options for the filter hook
 * @returns An object containing filter state and operations
 */
export function useEventFilters(options?: EventFilterOptions) {
  const { 
    initialFilters,
    availableLocations = ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'],
    availableInstructors = []
  } = options || {};

  // Initialize the filters state with default values
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTER_STATE,
    locations: availableLocations,
    ...(initialFilters || {})
  });

  /**
   * Apply all active filters to a collection of time slots
   * 
   * @param timeSlots - Array of time slots to filter
   * @returns Filtered array of time slots
   */
  const applyFilters = useCallback((timeSlots: TimeSlot[]) => {
    return timeSlots.filter(timeSlot => {
      // Filter by type
      if (!filters.typeIds.includes(timeSlot.typeId)) return false;
      
      // Filter by location
      if (filters.locations.length > 0 && !filters.locations.includes(timeSlot.location)) return false;
      
      // Filter by instructor
      if (filters.instructorIds.length > 0 && 
          timeSlot.instructorId && 
          !filters.instructorIds.includes(timeSlot.instructorId)) return false;
      
      // Filter by paid status
      if (filters.showPaidOnly && !timeSlot.isPaid) return false;
      if (filters.showFreeOnly && timeSlot.isPaid) return false;
      
      // Filter by joined status
      if (filters.showJoinedOnly && !timeSlot.userJoined) return false;
      
      // Filter by availability
      if (filters.showAvailableOnly && 
          timeSlot.capacity !== undefined && 
          timeSlot.currentParticipants !== undefined && 
          timeSlot.currentParticipants >= timeSlot.capacity) return false;
      
      // Filter by price range
      if (timeSlot.price !== undefined) {
        const { min, max } = filters.eventCriteria.priceRange;
        if (timeSlot.price < min || timeSlot.price > max) return false;
      }
      
      // Filter by capacity range
      if (timeSlot.capacity !== undefined) {
        const { min, max } = filters.eventCriteria.capacity;
        if (timeSlot.capacity < min) return false;
        if (max !== null && timeSlot.capacity > max) return false;
      }
      
      // Filter by day of week
      if (filters.eventCriteria.preferredDays.length > 0) {
        const dayOfWeek = timeSlot.start.getDay(); // 0 = Sunday, 6 = Saturday
        if (!filters.eventCriteria.preferredDays.includes(dayOfWeek)) return false;
      }
      
      // Filter by time range
      if (filters.eventCriteria.timeRange.startTime || filters.eventCriteria.timeRange.endTime) {
        const eventTimeHour = timeSlot.start.getHours();
        const eventTimeMinutes = timeSlot.start.getMinutes();
        const eventTimeValue = eventTimeHour * 60 + eventTimeMinutes;
        
        if (filters.eventCriteria.timeRange.startTime) {
          const [startHour, startMinute] = filters.eventCriteria.timeRange.startTime.split(':').map(Number);
          const startTimeValue = startHour * 60 + startMinute;
          if (eventTimeValue < startTimeValue) return false;
        }
        
        if (filters.eventCriteria.timeRange.endTime) {
          const [endHour, endMinute] = filters.eventCriteria.timeRange.endTime.split(':').map(Number);
          const endTimeValue = endHour * 60 + endMinute;
          if (eventTimeValue > endTimeValue) return false;
        }
      }
      
      // Filter by payment status
      if (filters.eventCriteria.paymentStatus.length > 0 && 
          timeSlot.paymentStatus && 
          !filters.eventCriteria.paymentStatus.includes(timeSlot.paymentStatus)) return false;
      
      // Vector search (basic implementation - would be more sophisticated in production)
      if (filters.vectorSearch && filters.vectorSearch.trim() !== '') {
        const searchTerm = filters.vectorSearch.toLowerCase();
        const eventTitle = timeSlot.title.toLowerCase();
        const eventDescription = timeSlot.description?.toLowerCase() || '';
        const eventLocation = timeSlot.location.toLowerCase();
        
        if (!eventTitle.includes(searchTerm) && 
            !eventDescription.includes(searchTerm) && 
            !eventLocation.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  }, [filters]);

  /**
   * Generic filter change handler for updating any part of the filter state
   * 
   * @param newFilters - Partial filter state to merge with current state
   */
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => {
      // Handle nested eventCriteria updates
      if (newFilters.eventCriteria) {
        return {
          ...prev,
          ...newFilters,
          eventCriteria: {
            ...prev.eventCriteria,
            ...newFilters.eventCriteria
          }
        };
      }
      
      return { ...prev, ...newFilters };
    });
  }, []);
  
  /**
   * Update specific event criteria properties
   * 
   * @param criteriaChanges - Partial EventSpecificCriteria to merge with current criteria
   */
  const handleEventCriteriaChange = useCallback((criteriaChanges: Partial<EventSpecificCriteria>) => {
    handleFilterChange({
      eventCriteria: {
        ...filters.eventCriteria,
        ...criteriaChanges
      }
    });
  }, [filters.eventCriteria, handleFilterChange]);

  /**
   * Toggle an event type filter on/off
   * 
   * @param typeId - ID of the event type to toggle
   */
  const toggleTypeFilter = useCallback((typeId: number) => {
    setFilters(prev => {
      if (prev.typeIds.includes(typeId)) {
        return {
          ...prev,
          typeIds: prev.typeIds.filter(id => id !== typeId),
        };
      } else {
        return {
          ...prev,
          typeIds: [...prev.typeIds, typeId],
        };
      }
    });
  }, []);

  /**
   * Toggle a location filter on/off
   * 
   * @param location - Location string to toggle
   */
  const toggleLocationFilter = useCallback((location: string) => {
    setFilters(prev => {
      if (prev.locations.includes(location)) {
        return {
          ...prev,
          locations: prev.locations.filter(loc => loc !== location),
        };
      } else {
        return {
          ...prev,
          locations: [...prev.locations, location],
        };
      }
    });
  }, []);
  
  /**
   * Toggle an instructor filter on/off
   * 
   * @param instructorId - ID of the instructor to toggle
   */
  const toggleInstructorFilter = useCallback((instructorId: string) => {
    setFilters(prev => {
      if (prev.instructorIds.includes(instructorId)) {
        return {
          ...prev,
          instructorIds: prev.instructorIds.filter(id => id !== instructorId),
        };
      } else {
        return {
          ...prev,
          instructorIds: [...prev.instructorIds, instructorId],
        };
      }
    });
  }, []);
  /**
   * Toggle paid only filter on/off
   */
  const togglePaidOnlyFilter = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      showPaidOnly: !prev.showPaidOnly,
      showFreeOnly: false,
    }));
  }, []);

  /**
   * Toggle free only filter on/off
   */
  const toggleFreeOnlyFilter = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      showFreeOnly: !prev.showFreeOnly,
      showPaidOnly: false,
    }));
  }, []);

  // Toggle joined only filter
  const toggleJoinedOnlyFilter = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      showJoinedOnly: !prev.showJoinedOnly,
    }));
  }, []);

  /**
   * Toggle available only filter on/off
   */
  const toggleAvailableOnlyFilter = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      showAvailableOnly: !prev.showAvailableOnly,
    }));
  }, []);

  /**
   * Update the price range filter
   * 
   * @param min - Minimum price value
   * @param max - Maximum price value
   */
  const updatePriceRange = useCallback((min: number, max: number) => {
    handleEventCriteriaChange({
      priceRange: { min, max }
    });
  }, [handleEventCriteriaChange]);

  /**
   * Update the capacity range filter
   * 
   * @param min - Minimum capacity value
   * @param max - Maximum capacity value or null for unlimited
   */
  const updateCapacityRange = useCallback((min: number, max: number | null) => {
    handleEventCriteriaChange({
      capacity: { min, max }
    });
  }, [handleEventCriteriaChange]);

  /**
   * Update the time range filter
   * 
   * @param startTime - Start time in HH:MM format or null to clear
   * @param endTime - End time in HH:MM format or null to clear
   */
  const updateTimeRange = useCallback((startTime: string | null, endTime: string | null) => {
    handleEventCriteriaChange({
      timeRange: { startTime, endTime }
    });
  }, [handleEventCriteriaChange]);

  /**
   * Toggle a preferred day of week
   * 
   * @param day - Day of week to toggle (0 = Sunday, 6 = Saturday)
   */
  const togglePreferredDay = useCallback((day: number) => {
    setFilters(prev => {
      const preferredDays = [...prev.eventCriteria.preferredDays];
      const dayIndex = preferredDays.indexOf(day);
      
      if (dayIndex !== -1) {
        preferredDays.splice(dayIndex, 1);
      } else {
        preferredDays.push(day);
      }
      
      return {
        ...prev,
        eventCriteria: {
          ...prev.eventCriteria,
          preferredDays
        }
      };
    });
  }, []);

  /**
   * Toggle a payment status filter
   * 
   * @param status - Payment status to toggle
   */
  const togglePaymentStatus = useCallback((status: string) => {
    setFilters(prev => {
      const paymentStatus = [...prev.eventCriteria.paymentStatus];
      const statusIndex = paymentStatus.indexOf(status);
      
      if (statusIndex !== -1) {
        paymentStatus.splice(statusIndex, 1);
      } else {
        paymentStatus.push(status);
      }
      
      return {
        ...prev,
        eventCriteria: {
          ...prev.eventCriteria,
          paymentStatus
        }
      };
    });
  }, []);

  /**
   * Set vector search term for fuzzy text matching
   * 
   * @param searchTerm - Search term to filter events by text content
   */
  const setVectorSearch = useCallback((searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      vectorSearch: searchTerm
    }));
  }, []);

  /**
   * Reset all filters to their default state
   * Preserves available locations from current state
   */
  const resetFilters = useCallback(() => {
    setFilters(prev => ({
      ...DEFAULT_FILTER_STATE,
      locations: availableLocations
    }));
  }, [availableLocations]);

  return {
    // Filter state
    filters,
    
    // Core filter operations
    applyFilters,
    handleFilterChange,
    handleEventCriteriaChange,
    
    // Toggle filter methods
    toggleTypeFilter,
    toggleLocationFilter,
    toggleInstructorFilter,
    togglePaidOnlyFilter,
    toggleFreeOnlyFilter,
    toggleJoinedOnlyFilter,
    toggleAvailableOnlyFilter,
    togglePreferredDay,
    togglePaymentStatus,
    
    // Range filter methods
    updatePriceRange,
    updateCapacityRange,
    updateTimeRange,
    
    // Search methods
    setVectorSearch,
    
    // Reset functionality
    resetFilters,
    
    // Helper functions for UI
    isTypeSelected: (typeId: number) => filters.typeIds.includes(typeId),
    isLocationSelected: (location: string) => filters.locations.includes(location),
    isInstructorSelected: (instructorId: string) => filters.instructorIds.includes(instructorId),
    isPreferredDay: (day: number) => filters.eventCriteria.preferredDays.includes(day),
    isPaymentStatusSelected: (status: string) => filters.eventCriteria.paymentStatus.includes(status),
    
    // Available filter options
    availableLocations,
    availableInstructors,
    availablePaymentStatuses: PAYMENT_STATUS_TYPES,
    
    // State checking utilities
    isPaidSelected: () => filters.showPaidOnly,
    isFreeSelected: () => filters.showFreeOnly,
    isJoinedSelected: () => filters.showJoinedOnly,
    isAvailableSelected: () => filters.showAvailableOnly,
    hasActiveFilters: () => {
      // Check if any filter is active beyond the default state
      return (
        filters.showPaidOnly || 
        filters.showFreeOnly || 
        filters.showJoinedOnly ||
        filters.showAvailableOnly ||
        filters.vectorSearch !== '' ||
        filters.instructorIds.length > 0 ||
        filters.eventCriteria.preferredDays.length > 0 ||
        filters.eventCriteria.paymentStatus.length > 0 ||
        filters.eventCriteria.priceRange.min > 0 ||
        filters.eventCriteria.priceRange.max < 1000 ||
        filters.eventCriteria.capacity.min > 1 ||
        (filters.eventCriteria.capacity.max !== null && filters.eventCriteria.capacity.max < 100) ||
        filters.eventCriteria.timeRange.startTime !== null ||
        filters.eventCriteria.timeRange.endTime !== null
      );
    }
  };
}

