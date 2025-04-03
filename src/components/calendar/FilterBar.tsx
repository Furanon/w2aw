'use client';

import { useCallback } from 'react';
import { EVENT_TYPES, FilterState, SPECIAL_STATUS_COLORS } from '@/types/filters';
import { Container } from '@/components/layout/Container';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  availableLocations?: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableLocations = ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5']
}) => {
  // Toggle type filter
  const toggleTypeFilter = useCallback((typeId: number) => {
    if (filters.typeIds.includes(typeId)) {
      onFilterChange({
        typeIds: filters.typeIds.filter(id => id !== typeId),
      });
    } else {
      onFilterChange({
        typeIds: [...filters.typeIds, typeId],
      });
    }
  }, [filters.typeIds, onFilterChange]);

  // Toggle location filter
  const toggleLocationFilter = useCallback((location: string) => {
    if (filters.locations.includes(location)) {
      onFilterChange({
        locations: filters.locations.filter(loc => loc !== location),
      });
    } else {
      onFilterChange({
        locations: [...filters.locations, location],
      });
    }
  }, [filters.locations, onFilterChange]);

  return (
    <Container>
      <div className="mb-4 p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        
        {/* Primary Section: Event Types */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium mb-2 text-gray-700">Event Types</h4>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(type => (
              <button
                key={type.id}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  filters.typeIds.includes(type.id)
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
        
        {/* Secondary Section */}
        <div className="p-4 bg-gray-50 rounded-md">
          {/* Vector Search Input */}
          <div className="mb-4">
            <h4 className="font-medium mb-2 text-gray-700">Search</h4>
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Search by keywords..."
                value={filters.vectorSearch}
                onChange={(e) => onFilterChange({ vectorSearch: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Location Filters */}
          <div className="mb-4">
            <h4 className="font-medium mb-2 text-gray-700">Locations</h4>
            <div className="flex flex-wrap gap-2">
              {availableLocations.map(location => (
                <button
                  key={location}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    filters.locations.includes(location)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => toggleLocationFilter(location)}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
          
          {/* Price and Status Filters */}
          <div className="flex flex-wrap gap-6">
            <div>
              <h4 className="font-medium mb-2 text-gray-700">Price</h4>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showPaidOnly}
                    onChange={() => 
                      onFilterChange({ 
                        showPaidOnly: !filters.showPaidOnly,
                        showFreeOnly: false 
                      })
                    }
                    className="mr-2 h-4 w-4"
                  />
                  <span>Paid Only</span>
                </label>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showFreeOnly}
                    onChange={() => 
                      onFilterChange({ 
                        showFreeOnly: !filters.showFreeOnly,
                        showPaidOnly: false 
                      })
                    }
                    className="mr-2 h-4 w-4"
                  />
                  <span>Free Only</span>
                </label>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 text-gray-700">Status</h4>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showJoinedOnly}
                  onChange={() => 
                    onFilterChange({ 
                      showJoinedOnly: !filters.showJoinedOnly 
                    })
                  }
                  className="mr-2 h-4 w-4"
                />
                <span>Joined Events</span>
              </label>
            </div>
          </div>
          
          {/* Time and Day Preferences */}
          <div className="mt-6">
            <h4 className="font-medium mb-2 text-gray-700">Time and Day Preferences</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Days of Week */}
              <div>
                <h5 className="text-sm font-medium mb-2 text-gray-600">Days of Week</h5>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <button
                      key={day}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        filters.eventSpecificCriteria?.daysOfWeek?.includes(index + 1)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => {
                        const currentDays = filters.eventSpecificCriteria?.daysOfWeek || [];
                        const dayValue = index + 1;
                        const newDays = currentDays.includes(dayValue)
                          ? currentDays.filter(d => d !== dayValue)
                          : [...currentDays, dayValue];
                        
                        onFilterChange({
                          eventSpecificCriteria: {
                            ...filters.eventSpecificCriteria,
                            daysOfWeek: newDays
                          }
                        });
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div>
                <h5 className="text-sm font-medium mb-2 text-gray-600">Time Range</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={filters.eventSpecificCriteria?.timeStart || ''}
                      onChange={(e) => onFilterChange({
                        eventSpecificCriteria: {
                          ...filters.eventSpecificCriteria,
                          timeStart: e.target.value
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Time</label>
                    <input
                      type="time"
                      value={filters.eventSpecificCriteria?.timeEnd || ''}
                      onChange={(e) => onFilterChange({
                        eventSpecificCriteria: {
                          ...filters.eventSpecificCriteria,
                          timeEnd: e.target.value
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Availability and Capacity */}
          <div className="mt-6">
            <h4 className="font-medium mb-2 text-gray-700">Availability and Capacity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Availability */}
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showAvailableOnly}
                    onChange={() => 
                      onFilterChange({ 
                        showAvailableOnly: !filters.showAvailableOnly 
                      })
                    }
                    className="mr-2 h-4 w-4"
                  />
                  <span>Available Only</span>
                </label>
              </div>
              
              {/* Capacity Range */}
              <div>
                <h5 className="text-sm font-medium mb-2 text-gray-600">Capacity Range</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Capacity</label>
                    <input
                      type="number"
                      min="0"
                      value={filters.eventSpecificCriteria?.minCapacity || ''}
                      onChange={(e) => onFilterChange({
                        eventSpecificCriteria: {
                          ...filters.eventSpecificCriteria,
                          minCapacity: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Min"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Capacity</label>
                    <input
                      type="number"
                      min="0"
                      value={filters.eventSpecificCriteria?.maxCapacity || ''}
                      onChange={(e) => onFilterChange({
                        eventSpecificCriteria: {
                          ...filters.eventSpecificCriteria,
                          maxCapacity: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>
              
              {/* Price Range */}
              <div className="md:col-span-2">
                <h5 className="text-sm font-medium mb-2 text-gray-600">Price Range</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.eventSpecificCriteria?.minPrice || ''}
                      onChange={(e) => onFilterChange({
                        eventSpecificCriteria: {
                          ...filters.eventSpecificCriteria,
                          minPrice: e.target.value ? parseFloat(e.target.value) : undefined
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.eventSpecificCriteria?.maxPrice || ''}
                      onChange={(e) => onFilterChange({
                        eventSpecificCriteria: {
                          ...filters.eventSpecificCriteria,
                          maxPrice: e.target.value ? parseFloat(e.target.value) : undefined
                        }
                      })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reset Filters Button */}
          <div className="mt-6 text-right">
            <button
              onClick={() => onFilterChange({
                typeIds: [],
                locations: [],
                vectorSearch: '',
                showPaidOnly: false,
                showFreeOnly: false,
                showJoinedOnly: false,
                showAvailableOnly: false,
                eventSpecificCriteria: {}
              })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default FilterBar;

