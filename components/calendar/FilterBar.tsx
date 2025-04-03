'use client';

import { useCallback, useState } from 'react';
import { 
  EVENT_TYPES, 
  FilterState, 
  EventSpecificCriteria, 
  PAYMENT_STATUS_TYPES, 
  DEFAULT_FILTER_STATE 
} from '@/types/filters';
import { Container } from '@/components/layout/Container';
import { useEventFilters } from '@/components/calendar/hooks/useEventFilters';
import { TimePicker } from '@/components/ui/TimePicker';
import { Slider } from '@/components/ui/Slider';
import { Checkbox } from '@/components/ui/Checkbox';

interface FilterBarProps {
  /**
   * Initial filter state. Will use defaults if not provided.
   */
  initialFilters?: Partial<FilterState>;
  
  /**
   * Callback triggered when filters change with the new FilterState
   */
  onFiltersChange?: (filters: FilterState) => void;
  
  /**
   * List of available locations for filtering
   */
  availableLocations?: string[];
  
  /**
   * List of available instructor IDs with names for display
   */
  availableInstructors?: Array<{ id: string, name: string }>;
}

/**
 * FilterBar component provides UI for filtering calendar and map view events
 * Implements the updated FilterState interface and integrates with useEventFilters hook
 */
const FilterBar: React.FC<FilterBarProps> = ({
  initialFilters,
  onFiltersChange,
  availableLocations = ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'],
  availableInstructors = []
}) => {
  // Initialize filters using the useEventFilters hook
  const {
    filters,
    handleFilterChange,
    toggleTypeFilter,
    toggleLocationFilter,
    togglePaidOnlyFilter,
    toggleFreeOnlyFilter,
    toggleJoinedOnlyFilter,
    resetFilters,
    isTypeSelected,
    isLocationSelected
  } = useEventFilters(initialFilters);
  
  // Handle changes to event criteria nested properties
  const handleEventCriteriaChange = useCallback((criteriaChanges: Partial<EventSpecificCriteria>) => {
    handleFilterChange({
      eventCriteria: {
        ...filters.eventCriteria,
        ...criteriaChanges
      }
    });
  }, [filters.eventCriteria, handleFilterChange]);
  
  // Handle price range changes
  const handlePriceRangeChange = useCallback((min: number, max: number) => {
    handleEventCriteriaChange({
      priceRange: { min, max }
    });
  }, [handleEventCriteriaChange]);
  
  // Handle capacity range changes
  const handleCapacityRangeChange = useCallback((min: number, max: number | null) => {
    handleEventCriteriaChange({
      capacity: { min, max }
    });
  }, [handleEventCriteriaChange]);
  
  // Handle time range changes
  const handleTimeChange = useCallback((startTime: string | null, endTime: string | null) => {
    handleEventCriteriaChange({
      timeRange: { startTime, endTime }
    });
  }, [handleEventCriteriaChange]);
  
  // Handle preferred days changes
  const togglePreferredDay = useCallback((dayNum: number) => {
    const currentDays = [...filters.eventCriteria.preferredDays];
    const dayIndex = currentDays.indexOf(dayNum);
    
    if (dayIndex >= 0) {
      currentDays.splice(dayIndex, 1);
    } else {
      currentDays.push(dayNum);
    }
    
    handleEventCriteriaChange({
      preferredDays: currentDays
    });
  }, [filters.eventCriteria.preferredDays, handleEventCriteriaChange]);
  
  // Handle payment status changes
  const togglePaymentStatus = useCallback((status: string) => {
    const currentStatuses = [...filters.eventCriteria.paymentStatus];
    const statusIndex = currentStatuses.indexOf(status);
    
    if (statusIndex >= 0) {
      currentStatuses.splice(statusIndex, 1);
    } else {
      currentStatuses.push(status);
    }
    
    handleEventCriteriaChange({
      paymentStatus: currentStatuses
    });
  }, [filters.eventCriteria.paymentStatus, handleEventCriteriaChange]);
  
  // Toggle instructor filter
  const toggleInstructorFilter = useCallback((instructorId: string) => {
    const currentInstructors = [...filters.instructorIds];
    const instructorIndex = currentInstructors.indexOf(instructorId);
    
    if (instructorIndex >= 0) {
      handleFilterChange({
        instructorIds: currentInstructors.filter(id => id !== instructorId)
      });
    } else {
      handleFilterChange({
        instructorIds: [...currentInstructors, instructorId]
      });
    }
  }, [filters.instructorIds, handleFilterChange]);
  
  // Toggle available only filter
  const toggleAvailableOnlyFilter = useCallback(() => {
    handleFilterChange({
      showAvailableOnly: !filters.showAvailableOnly
    });
  }, [filters.showAvailableOnly, handleFilterChange]);
  
  // Notify parent component when filters change
  useCallback(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);
  
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  return (
    <Container>
      <div className="mb-4 p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Event Filters</h3>
          <button 
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Reset All
          </button>
        </div>
        
        {/* Primary Section: Event Types */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium mb-2 text-gray-700">Event Types</h4>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(type => (
              <button
                key={type.id}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  isTypeSelected(type.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => toggleTypeFilter(type.id)}
                style={{ borderLeft: `4px solid ${type.color}` }}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Search and Basic Filters */}
        <div className="p-4 bg-gray-50 rounded-md mb-6">
          {/* Vector Search Input */}
          <div className="mb-
