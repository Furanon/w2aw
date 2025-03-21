import React, { useRef, useState, useEffect } from 'react';

type FilterOption = {
  id: string;
  label: string;
  isParent?: boolean;
  subcategories?: Array<{
    id: string;
    label: string;
  }>;
};

type FilterSectionProps = {
  title: string;
  options: FilterOption[];
  selectedFilters: string[];
  onToggleFilter: (id: string, parentId?: string) => void;
};

const FilterSection: React.FC<FilterSectionProps> = ({ 
  title,
  options,
  selectedFilters,
  onToggleFilter 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Count selected options for this section
  const selectedCount = options.reduce((count, option) => {
    let optionCount = 0;
    
    // Count parent if selected
    if (selectedFilters.includes(option.id)) {
      optionCount += 1;
    }
    
    // Count children if selected
    if (option.subcategories) {
      optionCount += option.subcategories.filter(sub => 
        selectedFilters.includes(sub.id)
      ).length;
    }
    
    return count + optionCount;
  }, 0);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`px-3 py-2 text-sm font-medium rounded-md ${
          selectedCount > 0 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        } border border-gray-300 focus:outline-none`}
        aria-expanded={isOpen}
      >
        {title}
        {selectedCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded-full text-xs">
            {selectedCount}
          </span>
        )}
        <span className="ml-1">
          {isOpen ? (
            <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </span>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {options.map((option) => (
              <div key={option.id} className="px-2 py-1">
                {/* Parent option */}
                <div className="flex items-center">
                  <input
                    id={option.id}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedFilters.includes(option.id)}
                    onChange={() => onToggleFilter(option.id)}
                  />
                  <label
                    htmlFor={option.id}
                    className="ml-2 block text-sm font-medium text-gray-900"
                  >
                    {option.label}
                  </label>
                </div>

                {/* Subcategories */}
                {option.subcategories && option.subcategories.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {option.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center">
                        <input
                          id={sub.id}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedFilters.includes(sub.id)}
                          onChange={() => onToggleFilter(sub.id, option.id)}
                        />
                        <label
                          htmlFor={sub.id}
                          className="ml-2 block text-sm font-medium text-gray-700"
                        >
                          {sub.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSection;

