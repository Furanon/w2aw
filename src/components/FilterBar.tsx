'use client';

import { useState, useRef, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { MdApartment, MdHouse, MdVilla, MdCabin, MdHotel } from 'react-icons/md';
import { LuBedDouble } from 'react-icons/lu';
import { TbBath } from 'react-icons/tb';
import { IoFilterSharp } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type FilterOption = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

// Property type options
const propertyTypes: FilterOption[] = [
  { id: 'house', label: 'Houses', icon: <MdHouse size={20} /> },
  { id: 'apartment', label: 'Apartments', icon: <MdApartment size={20} /> },
  { id: 'villa', label: 'Villas', icon: <MdVilla size={20} /> },
  { id: 'cabin', label: 'Cabins', icon: <MdCabin size={20} /> },
  { id: 'hotel', label: 'Hotels', icon: <MdHotel size={20} /> },
];

// Price range options
const priceRanges: FilterOption[] = [
  { id: 'price_0_500', label: 'Under $500' },
  { id: 'price_500_1500', label: '$500 - $1,500' },
  { id: 'price_1500_3000', label: '$1,500 - $3,000' },
  { id: 'price_3000_5000', label: '$3,000 - $5,000' },
  { id: 'price_5000_plus', label: '$5,000+' },
];

// Bedroom options
const bedrooms: FilterOption[] = [
  { id: 'beds_any', label: 'Any' },
  { id: 'beds_1', label: '1+' },
  { id: 'beds_2', label: '2+' },
  { id: 'beds_3', label: '3+' },
  { id: 'beds_4', label: '4+' },
  { id: 'beds_5', label: '5+' },
];

// Bathroom options
const bathrooms: FilterOption[] = [
  { id: 'baths_any', label: 'Any' },
  { id: 'baths_1', label: '1+' },
  { id: 'baths_2', label: '2+' },
  { id: 'baths_3', label: '3+' },
  { id: 'baths_4', label: '4+' },
];

type FilterSectionProps = {
  title: string;
  options: FilterOption[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  icon?: React.ReactNode;
};

const FilterSection = ({ title, options, selectedIds, onSelect, icon }: FilterSectionProps) => {
  return (
    <div className="flex flex-col pr-4 min-w-fit">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-gray-700">{icon}</span>}
        <h3 className="text-sm font-medium text-gray-800">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
              selectedIds.includes(option.id)
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            )}
          >
            {option.icon && <span>{option.icon}</span>}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Define filter state interface
export interface FilterState {
  propertyTypes: string[];
  priceRanges: string[];
  bedrooms: string[];
  bathrooms: string[];
}

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string[]>([]);
  const [selectedBathrooms, setSelectedBathrooms] = useState<string[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // Default to false

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // Initialize mobile state
      setIsMobile(window.innerWidth <= 768);
    
      // Add resize listener
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
      };
    
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkScroll = () => {
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
          setCanScrollLeft(scrollContainer.scrollLeft > 0);
          setCanScrollRight(
            scrollContainer.scrollLeft < 
            scrollContainer.scrollWidth - scrollContainer.clientWidth - 10
          );
        }
      };
      
      checkScroll();

      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', checkScroll);
        
        return () => {
          scrollContainer.removeEventListener('scroll', checkScroll);
        };
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  const scrollLeft = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const notifyFilterChange = (
    propertyTypes: string[] = selectedPropertyTypes,
    priceRanges: string[] = selectedPriceRanges,
    bedrooms: string[] = selectedBedrooms,
    bathrooms: string[] = selectedBathrooms
  ) => {
    if (onFilterChange) {
      onFilterChange({
        propertyTypes,
        priceRanges,
        bedrooms,
        bathrooms
      });
    }
  };

  const togglePropertyType = (id: string) => {
    const newPropertyTypes = selectedPropertyTypes.includes(id) 
      ? selectedPropertyTypes.filter(item => item !== id)
      : [...selectedPropertyTypes, id];
    
    setSelectedPropertyTypes(newPropertyTypes);
    notifyFilterChange(newPropertyTypes);
  };

  const togglePriceRange = (id: string) => {
    const newPriceRanges = selectedPriceRanges.includes(id) 
      ? selectedPriceRanges.filter(item => item !== id)
      : [...selectedPriceRanges, id];
    
    setSelectedPriceRanges(newPriceRanges);
    notifyFilterChange(undefined, newPriceRanges);
  };

  const toggleBedrooms = (id: string) => {
    const newBedrooms = selectedBedrooms.includes(id) 
      ? selectedBedrooms.filter(item => item !== id)
      : [id];
    
    setSelectedBedrooms(newBedrooms);
    notifyFilterChange(undefined, undefined, newBedrooms);
  };

  const toggleBathrooms = (id: string) => {
    const newBathrooms = selectedBathrooms.includes(id) 
      ? selectedBathrooms.filter(item => item !== id)
      : [id];
    
    setSelectedBathrooms(newBathrooms);
    notifyFilterChange(undefined, undefined, undefined, newBathrooms);
  };

  return (
    <div className="relative w-full bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        {/* Filter Button - Always Visible */}
        <button 
          onClick={() => setShowFilter(prev => !prev)}
          className={cn(
            "flex items-center gap-2 min-w-[100px] px-4 py-2 border rounded-full text-sm font-medium transition-all shadow-sm",
            showFilter ? "bg-primary text-white hover:bg-primary-dark" : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
          )}
        >
          <IoFilterSharp size={16} />
          <span>{showFilter ? "Hide Filters" : "Show Filters"}</span>
        </button>

        {/* Main Scroll Container */}
        <div className="relative flex-1 overflow-hidden">
          {/* Left Scroll Button */}
          {canScrollLeft && isMobile && ( // Only show on mobile when scrolling is possible
            <button 
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md border border-gray-200 hover:bg-gray-100 focus:outline-none"
            >
              <FiChevronLeft size={20} />
            </button>
          )}
          
          {/* Scrollable Container */}
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto flex gap-6 pb-2 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Property Type Section */}
            <FilterSection 
              title="Property Type" 
              options={propertyTypes}
              selectedIds={selectedPropertyTypes}
              onSelect={togglePropertyType}
              icon={<MdHouse />}
            />
            
            {/* Price Range Section */}
            <FilterSection 
              title="Price Range" 
              options={priceRanges}
              selectedIds={selectedPriceRanges}
              onSelect={togglePriceRange}
            />
            
            {/* Bedrooms Section */}
            <FilterSection 
              title="Bedrooms" 
              options={bedrooms}
              selectedIds={selectedBedrooms}
              onSelect={toggleBedrooms}
              icon={<LuBedDouble />}
            />
            
            {/* Bathrooms Section */}
            <FilterSection 
              title="Bathrooms" 
              options={bathrooms}
              selectedIds={selectedBathrooms}
              onSelect={toggleBathrooms}
              icon={<TbBath />}
            />
          </div>
          
          {/* Right Scroll Button */}
          {canScrollRight && isMobile && ( // Only show on mobile when scrolling is possible
            <button 
              onClick={scrollRight}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-md border border-gray-200 hover:bg-gray-100 focus:outline-none"
            >
              <FiChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilter && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-full left-0 w-full bg-white shadow-lg rounded-b-lg z-20"
        >
          <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Filters</h2>
              <button 
                onClick={() => {
                  setSelectedPropertyTypes([]);
                  setSelectedPriceRanges([]);
                  setSelectedBedrooms([]);
                  setSelectedBathrooms([]);
                  notifyFilterChange([], [], [], []);
                  setShowFilter(false);
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Property Types */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Property Type</h3>
                <div className="space-y-2">
                  {propertyTypes.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => togglePropertyType(option.id)}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                        selectedPropertyTypes.includes(option.id)
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      )}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Ranges */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Price Range</h3>
                <div className="space-y-2">
                  {priceRanges.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => togglePriceRange(option.id)}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg text-sm font-medium transition-all",
                        selectedPriceRanges.includes(option.id)
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Bedrooms</h3>
                <div className="space-y-2">
                  {bedrooms.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => toggleBedrooms(option.id)}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                        selectedBedrooms.includes(option.id)
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      )}
                    >
                      <LuBedDouble />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Bathrooms</h3>
                <div className="space-y-2">
                  {bathrooms.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => toggleBathrooms(option.id)}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                        selectedBathrooms.includes(option.id)
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      )}
                    >
                      <TbBath />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
