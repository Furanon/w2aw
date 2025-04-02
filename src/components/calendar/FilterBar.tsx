'use client';

import { useCallback } from 'react';
import { EVENT_TYPES, FilterState, SPECIAL_STATUS_COLORS } from '@/types/filters';

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
    <div className="mb-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Filters</h3>
      
      <div className="mb-3">
        <h4 className="font-medium mb-1">Event Types</h4>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map(type => (
            <button
              key={type.id}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.typeIds.includes(type.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => toggleTypeFilter(type.id)}
              style={{ borderLeft: `4px solid ${type.color}` }}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-3">
        <h4 className="font-medium mb-1">Locations</h4>
        <div className="flex flex-wrap gap-2">
          {availableLocations.map(location => (
            <button
              key={location}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.locations.includes(location)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => toggleLocationFilter(location)}
            >
              {location}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.showPaidOnly}
            onChange={() => 
              onFilterChange({ 
                showPaidOnly: !filters.showPaidOnly,
                showFreeOnly: false 
              })
            }
            className="mr-2"
          />
          Paid Only
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.showFreeOnly}
            onChange={() => 
              onFilterChange({ 
                showFreeOnly: !filters.showFreeOnly,
                showPaidOnly: false 
              })
            }
            className="mr-2"
          />
          Free Only
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.showJoinedOnly}
            onChange={() => 
              onFilterChange({ 
                showJoinedOnly: !filters.showJoinedOnly 
              })
            }
            className="mr-2"
          />
          Joined Events
        </label>
      </div>
    </div>
  );
};

export default FilterBar;

