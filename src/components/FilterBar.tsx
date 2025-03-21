'use client';

import { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { FaHome, FaHiking, FaSpa, FaUtensils, FaGlassCheers } from 'react-icons/fa';
import { IoMdBed } from 'react-icons/io';
import { MdNaturePeople, MdHotel, MdCabin } from 'react-icons/md';
import { GiBowlOfRice, GiMountainCave } from 'react-icons/gi';
import { RiRestaurantLine } from 'react-icons/ri';
import { BiDrink } from 'react-icons/bi';
import FilterSection from './FilterSection';

type FilterOption = {
  id: string;
  label: string;
  icon?: ReactNode;
  isParent?: boolean;
  subcategories?: FilterOption[];
};

// Accommodation options with subcategories
const accommodationOptions: FilterOption[] = [
  { 
    id: 'hotel', 
    label: 'Hotels', 
    icon: <MdHotel size={20} />,
    isParent: true,
    subcategories: [
      { id: 'luxury_hotel', label: 'Luxury Hotels' },
      { id: 'boutique_hotel', label: 'Boutique Hotels' },
      { id: 'resort', label: 'Resorts' },
      { id: 'business_hotel', label: 'Business Hotels' }
    ]
  },
  { 
    id: 'hostel', 
    label: 'Hostels', 
    icon: <IoMdBed size={20} />,
    isParent: true,
    subcategories: [
      { id: 'backpacker_hostel', label: 'Backpacker Hostels' },
      { id: 'boutique_hostel', label: 'Boutique Hostels' },
      { id: 'party_hostel', label: 'Party Hostels' },
      { id: 'family_hostel', label: 'Family Hostels' }
    ]
  },
  { 
    id: 'cabin', 
    label: 'Cabins', 
    icon: <MdCabin size={20} />,
    isParent: true,
    subcategories: [
      { id: 'mountain_cabin', label: 'Mountain Cabins' },
      { id: 'lake_cabin', label: 'Lake Cabins' },
      { id: 'forest_cabin', label: 'Forest Cabins' },
      { id: 'luxury_cabin', label: 'Luxury Cabins' }
    ]
  },
  { 
    id: 'camping', 
    label: 'Camping', 
    icon: <FaHome size={20} />,
    isParent: true,
    subcategories: [
      { id: 'tent_camping', label: 'Tent Camping' },
      { id: 'rv_camping', label: 'RV Camping' },
      { id: 'glamping', label: 'Glamping' },
      { id: 'beach_camping', label: 'Beach Camping' }
    ]
  }
];

// Nature & Adventure options with subcategories
const natureAdventureOptions: FilterOption[] = [
  { 
    id: 'hiking', 
    label: 'Hiking', 
    icon: <FaHiking size={20} />,
    isParent: true,
    subcategories: [
      { id: 'day_hike', label: 'Day Hikes' },
      { id: 'mountain_trek', label: 'Mountain Treks' },
      { id: 'nature_trail', label: 'Nature Trails' },
      { id: 'jungle_trek', label: 'Jungle Treks' }
    ]
  },
  { 
    id: 'wildlife', 
    label: 'Wildlife', 
    icon: <MdNaturePeople size={20} />,
    isParent: true,
    subcategories: [
      { id: 'safari', label: 'Safari' },
      { id: 'bird_watching', label: 'Bird Watching' },
      { id: 'whale_watching', label: 'Whale Watching' },
      { id: 'wildlife_sanctuary', label: 'Wildlife Sanctuary' }
    ]
  },
  { 
    id: 'caves', 
    label: 'Caves', 
    icon: <GiMountainCave size={20} />,
    isParent: true,
    subcategories: [
      { id: 'cave_tours', label: 'Cave Tours' },
      { id: 'cave_diving', label: 'Cave Diving' },
      { id: 'spelunking', label: 'Spelunking' },
      { id: 'cave_climbing', label: 'Cave Climbing' }
    ]
  },
  { 
    id: 'beaches', 
    label: 'Beaches', 
    icon: <FaHiking size={20} />,
    isParent: true,
    subcategories: [
      { id: 'sandy_beach', label: 'Sandy Beaches' },
      { id: 'rocky_beach', label: 'Rocky Beaches' },
      { id: 'private_beach', label: 'Private Beaches' },
      { id: 'surf_beach', label: 'Surf Beaches' }
    ]
  }
];

// Relax & Wellness options with subcategories
const relaxWellnessOptions: FilterOption[] = [
  { 
    id: 'spa', 
    label: 'Spa', 
    icon: <FaSpa size={20} />,
    isParent: true,
    subcategories: [
      { id: 'day_spa', label: 'Day Spa' },
      { id: 'thermal_spa', label: 'Thermal Spa' },
      { id: 'medical_spa', label: 'Medical Spa' },
      { id: 'resort_spa', label: 'Resort Spa' }
    ]
  },
  { 
    id: 'massage', 
    label: 'Massage', 
    icon: <FaSpa size={20} />,
    isParent: true,
    subcategories: [
      { id: 'thai_massage', label: 'Thai Massage' },
      { id: 'swedish_massage', label: 'Swedish Massage' },
      { id: 'hot_stone', label: 'Hot Stone' },
      { id: 'aromatherapy', label: 'Aromatherapy' }
    ]
  },
  { 
    id: 'yoga', 
    label: 'Yoga', 
    icon: <FaSpa size={20} />,
    isParent: true,
    subcategories: [
      { id: 'hatha_yoga', label: 'Hatha Yoga' },
      { id: 'vinyasa_yoga', label: 'Vinyasa Yoga' },
      { id: 'aerial_yoga', label: 'Aerial Yoga' },
      { id: 'meditation_yoga', label: 'Meditation Yoga' }
    ]
  },
  { 
    id: 'meditation', 
    label: 'Meditation', 
    icon: <FaSpa size={20} />,
    isParent: true,
    subcategories: [
      { id: 'guided_meditation', label: 'Guided Meditation' },
      { id: 'zen_meditation', label: 'Zen Meditation' },
      { id: 'mindfulness', label: 'Mindfulness' },
      { id: 'transcendental', label: 'Transcendental' }
    ]
  }
];

// Food options with subcategories
const foodOptions: FilterOption[] = [
  { 
    id: 'restaurants', 
    label: 'Restaurants', 
    icon: <RiRestaurantLine size={20} />,
    isParent: true,
    subcategories: [
      { id: 'fine_dining', label: 'Fine Dining' },
      { id: 'casual_dining', label: 'Casual Dining' },
      { id: 'family_style', label: 'Family Style' },
      { id: 'buffet', label: 'Buffet' }
    ]
  },
  { 
    id: 'street_food', 
    label: 'Street Food', 
    icon: <FaUtensils size={20} />,
    isParent: true,
    subcategories: [
      { id: 'food_stalls', label: 'Food Stalls' },
      { id: 'food_trucks', label: 'Food Trucks' },
      { id: 'night_market', label: 'Night Market' },
      { id: 'hawker_center', label: 'Hawker Center' }
    ]
  },
  { 
    id: 'organic', 
    label: 'Organic', 
    icon: <GiBowlOfRice size={20} />,
    isParent: true,
    subcategories: [
      { id: 'farm_to_table', label: 'Farm to Table' },
      { id: 'organic_cafe', label: 'Organic Cafe' },
      { id: 'vegan', label: 'Vegan' },
      { id: 'vegetarian', label: 'Vegetarian' }
    ]
  },
  { 
    id: 'cooking_class', 
    label: 'Cooking Class', 
    icon: <FaUtensils size={20} />,
    isParent: true,
    subcategories: [
      { id: 'local_cuisine', label: 'Local Cuisine' },
      { id: 'pastry_baking', label: 'Pastry & Baking' },
      { id: 'wine_pairing', label: 'Wine Pairing' },
      { id: 'professional', label: 'Professional' }
    ]
  }
];

// Drinks & Nightlife options with subcategories
const drinksNightlifeOptions: FilterOption[] = [
  { 
    id: 'bars', 
    label: 'Bars', 
    icon: <BiDrink size={20} />,
    isParent: true,
    subcategories: [
      { id: 'cocktail_bar', label: 'Cocktail Bars' },
      { id: 'sports_bar', label: 'Sports Bars' },
      { id: 'rooftop_bar', label: 'Rooftop Bars' },
      { id: 'lounge', label: 'Lounges' }
    ]
  },
  { 
    id: 'clubs', 
    label: 'Clubs', 
    icon: <FaGlassCheers size={20} />,
    isParent: true,
    subcategories: [
      { id: 'dance_club', label: 'Dance Clubs' },
      { id: 'live_music', label: 'Live Music' },
      { id: 'jazz_club', label: 'Jazz Clubs' },
      { id: 'nightclub', label: 'Nightclubs' }
    ]
  },
  { 
    id: 'pubs', 
    label: 'Pubs', 
    icon: <BiDrink size={20} />,
    isParent: true,
    subcategories: [
      { id: 'irish_pub', label: 'Irish Pubs' },
      { id: 'craft_beer', label: 'Craft Beer' },
      { id: 'gastropub', label: 'Gastropubs' },
      { id: 'brewery', label: 'Breweries' }
    ]
  },
  { 
    id: 'wine_tasting', 
    label: 'Wine Tasting', 
    icon: <FaGlassCheers size={20} />,
    isParent: true,
    subcategories: [
      { id: 'winery', label: 'Wineries' },
      { id: 'wine_bar', label: 'Wine Bars' },
      { id: 'vineyard', label: 'Vineyards' },
      { id: 'wine_tours', label: 'Wine Tours' }
    ]
  }
];

export interface CategoryFilter {
  parentIds: string[];
  childIds: string[];
}

export interface FilterState {
  accommodation: string[];
  natureAdventure: string[];
  relaxWellness: string[];
  food: string[];
  drinksNightlife: string[];
  // Alternative hierarchical structure for future use if needed
  hierarchical?: {
    accommodation: CategoryFilter;
    natureAdventure: CategoryFilter;
    relaxWellness: CategoryFilter;
    food: CategoryFilter;
    drinksNightlife: CategoryFilter;
  };
}

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [selectedAccommodation, setSelectedAccommodation] = useState<string[]>([]);
  const [selectedNatureAdventure, setSelectedNatureAdventure] = useState<string[]>([]);
  const [selectedRelaxWellness, setSelectedRelaxWellness] = useState<string[]>([]);
  const [selectedFood, setSelectedFood] = useState<string[]>([]);
  const [selectedDrinksNightlife, setSelectedDrinksNightlife] = useState<string[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
      
      // Initial check
      checkScroll();
      
      // Also check after a short delay to ensure all content is rendered
      const timer = setTimeout(checkScroll, 500);
      
      // Setup ResizeObserver for better responsiveness
      let resizeObserver: ResizeObserver | null = null;
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => {
          checkScroll();
        });
        
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
          resizeObserver.observe(scrollContainer);
        }
      }

      // Add scroll listener
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', checkScroll);
      }
      
      return () => {
        // Clean up all event listeners and observers
        clearTimeout(timer);
        resizeObserver?.disconnect();
        
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', checkScroll);
        }
      };
    }
  }, []);

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

  const notifyFilterChange = (): void => {
    if (onFilterChange) {
      onFilterChange({
        accommodation: selectedAccommodation,
        natureAdventure: selectedNatureAdventure,
        relaxWellness: selectedRelaxWellness,
        food: selectedFood,
        drinksNightlife: selectedDrinksNightlife
      });
    }
  };

  const handleToggleFilter = (categoryState: string[], setCategoryState: Dispatch<SetStateAction<string[]>>) => 
    (id: string, parentId?: string): void => {
      let newState = [...categoryState];
      
      if (categoryState.includes(id)) {
        // Remove the selected item
        newState = newState.filter(item => item !== id);
        
        // If a parent is deselected, also deselect all its children
        const allOptions = [
          ...accommodationOptions,
          ...natureAdventureOptions,
          ...relaxWellnessOptions,
          ...foodOptions,
          ...drinksNightlifeOptions
        ];
        const parent = allOptions.find(opt => opt.id === id);
        
        if (parent?.subcategories) {
          const childIds = parent.subcategories.map(sub => sub.id);
          newState = newState.filter(item => !childIds.includes(item));
        }
      } else {
        // Add the selected item
        newState.push(id);
      }
      
      setCategoryState(newState);
      setTimeout(() => notifyFilterChange(), 0); // Ensure state is updated before notification
    };

  return (
    <div className="relative w-full bg-white border-b border-gray-200">
      <div className="relative w-full px-4 py-4">
        {canScrollLeft && (
          <button 
            onClick={() => scrollLeft()}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-md border border-gray-300 hover:bg-gray-50 focus:outline-none text-gray-700"
          >
            <FiChevronLeft size={20} />
          </button>
        )}
        
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto flex gap-6 pb-2 scrollbar-hide"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            width: '100%',
            display: 'flex',
            flexWrap: 'nowrap',
            overflowY: 'visible'
          } as CSSProperties}
        >
            <FilterSection 
              title="Accommodation" 
              options={accommodationOptions}
              selectedFilters={selectedAccommodation}
              onToggleFilter={handleToggleFilter(selectedAccommodation, setSelectedAccommodation)}
            />
            
            <FilterSection 
              title="Nature & Adventure" 
              options={natureAdventureOptions}
              selectedFilters={selectedNatureAdventure}
              onToggleFilter={handleToggleFilter(selectedNatureAdventure, setSelectedNatureAdventure)}
            />
            
            <FilterSection 
              title="Relax & Wellness" 
              options={relaxWellnessOptions}
              selectedFilters={selectedRelaxWellness}
              onToggleFilter={handleToggleFilter(selectedRelaxWellness, setSelectedRelaxWellness)}
            />
            
            <FilterSection 
              title="Food" 
              options={foodOptions}
              selectedFilters={selectedFood}
              onToggleFilter={handleToggleFilter(selectedFood, setSelectedFood)}
            />
            
            <FilterSection 
              title="Drinks & Nightlife" 
              options={drinksNightlifeOptions}
              selectedFilters={selectedDrinksNightlife}
              onToggleFilter={handleToggleFilter(selectedDrinksNightlife, setSelectedDrinksNightlife)}
            />
          </div>
          
          {canScrollRight && (
            <button 
              onClick={() => scrollRight()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-1.5 shadow-md border border-gray-300 hover:bg-gray-50 focus:outline-none text-gray-700"
            >
              <FiChevronRight size={20} />
            </button>
          )}
      </div>
    </div>
  );
}
