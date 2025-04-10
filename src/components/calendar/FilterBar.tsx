'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterState, EVENT_TYPES, SPECIAL_STATUS_COLORS, PAYMENT_STATUS_TYPES } from '@/types/filters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedContainer } from "@/components/ui/animated-container"; 
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  Search, 
  Filter, 
  MapPin, 
  User, 
  DollarSign, 
  Clock, 
  Tag, 
  XCircle,
  ToggleLeft,
  Info,
  Keyboard,
  Sliders,
  CalendarDays,
  ArrowLeft,
  Users,
  SquareAsterisk,
  RefreshCw
} from "lucide-react";

/**
 * FilterBar Props Interface
 */
interface FilterBarProps {
  filters: FilterState;
  onFilterChange?: (filters: Partial<FilterState>) => void;
  onToggleType?: (typeId: number) => void;
  onToggleLocation?: (location: string) => void;
  onToggleInstructor?: (instructorId: string) => void;
  onTogglePaid?: (value: boolean) => void;
  onToggleFree?: (value: boolean) => void;
  onToggleJoined?: (value: boolean) => void;
  onToggleAvailable?: (value: boolean) => void;
  onUpdatePriceRange?: (min: number, max: number) => void;
  onUpdateCapacityRange?: (min: number, max: number | null) => void;
  onUpdateTimeRange?: (startTime: string | null, endTime: string | null) => void;
  onTogglePreferredDay?: (day: number) => void;
  onTogglePaymentStatus?: (status: string) => void;
  onVectorSearch?: (search: string) => void;
  onResetFilters?: () => void;
  availableLocations?: string[];
  isLoading?: boolean;
}

/**
 * Enhanced FilterBar Component with animations, tooltips, and keyboard shortcuts
 */
const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange = () => {},
  onToggleType,
  onToggleLocation,
  onToggleInstructor,
  onTogglePaid,
  onToggleFree,
  onToggleJoined,
  onToggleAvailable,
  onUpdatePriceRange,
  onUpdateCapacityRange,
  onUpdateTimeRange,
  onTogglePreferredDay,
  onTogglePaymentStatus,
  onVectorSearch,
  onResetFilters,
  availableLocations = [],
  isLoading = false,
}) => {
  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [searchInput, setSearchInput] = useState(filters.vectorSearch || "");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, height: 0, overflow: 'hidden' },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: { 
        duration: 0.3,
        staggerChildren: 0.05,
        when: 'beforeChildren'
      }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: { 
        duration: 0.2,
        when: 'afterChildren',
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  // Badge animation variants
  const badgeVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    selected: { scale: [1, 1.15, 1], transition: { duration: 0.3 } }
  };
  
  // Tab animation variants
  const tabVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: 0.1,
        ease: "easeIn"
      }
    }
  };

  // Update search input when filters change
  useEffect(() => {
    setSearchInput(filters.vectorSearch || "");
    setSearchError(null);
  }, [filters.vectorSearch]);
    // Helper function for handling filter operations with error handling
  const handleFilterOperation = useCallback(async (operation: () => void) => {
    try {
      await operation();
    } catch (error) {
      console.error('Filter operation failed:', error);
      // Could add error toast or message here
    }
  }, []);

  // Handle search input with debounce
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setSearchError(null);
    
    // Set loading state
    setSearchLoading(true);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search to avoid too many updates
    searchTimeoutRef.current = setTimeout(() => {
      try {
        if (onVectorSearch) {
          onVectorSearch(value);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchError('Failed to process search');
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [onVectorSearch]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+F to toggle filters
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        setShowFilters(prev => !prev);
      }
      
      // Alt+1-7 to toggle event types
      if (e.altKey && /^[1-7]$/.test(e.key)) {
        e.preventDefault();
        const typeId = parseInt(e.key);
        if (onToggleType && typeId >= 1 && typeId <= 7) {
          onToggleType(typeId);
        }
      }
      
      // Alt+S to focus search
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Alt+B for Basic tab
      if (e.altKey && e.key === 'b') {
        e.preventDefault();
        setActiveTab('basic');
      }
      
      // Alt+A for Advanced tab
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        setActiveTab('advanced');
      }
      
      // Alt+R to reset filters
      if (e.altKey && e.key === 'r') {
        e.preventDefault();
        if (onResetFilters) {
          onResetFilters();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleType, onResetFilters]);
  
  // Helper to get active filter count
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    
    if (filters.typeIds.length > 0 && filters.typeIds.length < EVENT_TYPES.length) count++;
    if (filters.locations.length > 0) count++;
    if (filters.instructorIds.length > 0) count++;
    if (filters.showPaidOnly) count++;
    if (filters.showFreeOnly) count++;
    if (filters.showJoinedOnly) count++;
    if (filters.showAvailableOnly) count++;
    if (filters.vectorSearch) count++;
    
    // Check event criteria
    if (filters.eventCriteria) {
      if (filters.eventCriteria.priceRange?.min > 0 || 
          filters.eventCriteria.priceRange?.max !== Infinity) count++;
          
      if (filters.eventCriteria.timeRange?.startTime || 
          filters.eventCriteria.timeRange?.endTime) count++;
          
      if (filters.eventCriteria.preferredDays?.length > 0) count++;
      
      if (filters.eventCriteria.paymentStatus?.length > 0) count++;
      
      if (filters.eventCriteria.capacity?.min > 1 || 
          filters.eventCriteria.capacity?.max !== null) count++;
    }
    
    return count;
  }, [filters]);
  
  // Active filter count badge
  const activeFilterCount = getActiveFilterCount();
  // Days of the week for preferred days filter
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Render method
  return (
    <AnimatedContainer className="mb-6">
      <Card>
        <CardContent className="p-4">
          {/* Header with title and filter count */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Filter className="mr-2 h-5 w-5" /> 
              Filters 
              {activeFilterCount > 0 && (
                <motion.span
                  className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-2 text-xs font-medium text-white"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeFilterCount}
                </motion.span>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Info className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filter events by type, location, and more</p>
                    <div className="mt-2 text-xs">
                      <p className="flex items-center">
                        <Keyboard className="mr-1 h-3 w-3" /> <strong>Alt+F</strong>: Toggle filters
                      </p>
                      <p className="flex items-center mt-1">
                        <Keyboard className="mr-1 h-3 w-3" /> <strong>Alt+1-7</strong>: Toggle event types
                      </p>
                      <p className="flex items-center mt-1">
                        <Keyboard className="mr-1 h-3 w-3" /> <strong>Alt+S</strong>: Focus search
                      </p>
                      <p className="flex items-center mt-1">
                        <Keyboard className="mr-1 h-3 w-3" /> <strong>Alt+R</strong>: Reset filters
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h2>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
              aria-expanded={showFilters}
              aria-controls="filter-panel"
            >
              <ToggleLeft className="mr-1 h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="flex items-center border rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <Search className="ml-2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchInput}
                onChange={handleSearchChange}
                className="border-0 focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                aria-label="Search events"
                ref={searchInputRef}
              />
              {searchLoading && (
                <Spinner className="mr-2 h-4 w-4 text-muted-foreground" />
              )}
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search events by title, description, or location</p>
                  <div className="mt-1 text-xs flex items-center">
                    Press <kbd className="mx-1 px-1.5 py-0.5 bg-muted-foreground/20 rounded text-xs">Alt+S</kbd> to focus
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {searchError && (
              <div className="mt-1 text-sm text-red-500 flex items-center">
                <XCircle className="h-3 w-3 mr-1" /> {searchError}
              </div>
            )}
          </div>
          
          <AnimatePresence mode="wait">
            {showFilters && (
              <motion.div
                id="filter-panel"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Tabs Component */}
                <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="basic" className="flex-1">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Basic Filters
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex-1">
                      <Sliders className="mr-2 h-4 w-4" />
                      Advanced Filters
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Basic Filters Tab */}
                  <TabsContent value="basic" className="pt-4">
                    <motion.div
                      variants={itemVariants}
                      className="space-y-6"
                    >
                      {/* Event Types */}
                      <div>
                        <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                          <Tag className="mr-2 h-4 w-4" />
                          Event Types
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {EVENT_TYPES.map(type => (
                            <motion.button
                              key={type.id}
                              className={`px-3 py-1 rounded-full text-sm flex items-center ${
                                filters.typeIds.includes(type.id)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              onClick={() => onToggleType && onToggleType(type.id)}
                              variants={badgeVariants}
                              initial="initial"
                              animate={filters.typeIds.includes(type.id) ? "selected" : "animate"}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              aria-pressed={filters.typeIds.includes(type.id)}
                            >
                              <span
                                className="w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: type.color }}
                              ></span>
                              {type.name}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Locations */}
                      <div>
                        <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                          <MapPin className="mr-2 h-4 w-4" />
                          Locations
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {availableLocations.length > 0 ? (
                            availableLocations.map(location => (
                              <motion.button
                                key={location}
                                className={`px-3 py-1 rounded-full text-sm ${
                                  filters.locations.includes(location)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                onClick={() => {
                                  if (onToggleLocation) {
                                    handleFilterOperation(() => onToggleLocation(location));
                                  }
                                }}
                                variants={badgeVariants}
                                initial="initial"
                                animate={filters.locations.includes(location) ? "selected" : "animate"}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                aria-pressed={filters.locations.includes(location)}
                              >
                                {location}
                              </motion.button>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm italic">No locations available</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Basic Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Payment Type Filters */}
                        <div>
                          <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                            <DollarSign className="mr-2 h-4 w-4" />
                            Payment
                          </h4>
                          <div className="space-y-2">
                            <label className="flex items-center cursor-pointer">
                              <Checkbox
                                checked={filters.showPaidOnly}
                                onCheckedChange={(checked) => {
                                  if (onTogglePaid) {
                                    onTogglePaid(checked === true);
                                  }
                                }}
                                aria-label="Show paid events only"
                              />
                              <span className="ml-2 text-sm">Paid Only</span>
                            </label>
                            
                            <label className="flex items-center cursor-pointer">
                              <Checkbox
                                checked={filters.showFreeOnly}
                                onCheckedChange={(checked) => {
                                  if (onToggleFree) {
                                    onToggleFree(checked === true);
                                  }
                                }}
                                aria-label="Show free events only"
                              />
                              <span className="ml-2 text-sm">Free Only</span>
                            </label>
                          </div>
                        </div>
                        
                        {/* Participation Filters */}
                        <div>
                          <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            Participation
                          </h4>
                          <div className="space-y-2">
                            <label className="flex items-center cursor-pointer">
                              <Checkbox
                                checked={filters.showJoinedOnly}
                                onCheckedChange={(checked) => {
                                  if (onToggleJoined) {
                                    onToggleJoined(checked === true);
                                  }
                                }}
                                aria-label="Show joined events only"
                              />
                              <span className="ml-2 text-sm">Joined Events</span>
                            </label>
                            
                            <label className="flex items-center cursor-pointer">
                              <Checkbox
                                checked={filters.showAvailableOnly}
                                onCheckedChange={(checked) => {
                                  if (onToggleAvailable) {
                                    onToggleAvailable(checked === true);
                                  }
                                }}
                                aria-label="Show available events only"
                              />
                              <span className="ml-2 text-sm">Available Only</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </TabsContent>
                  
                  {/* Advanced Filters Tab */}
                  <TabsContent value="advanced" className="pt-4">
                    <motion.div
                      variants={itemVariants}
                      className="space-y-6"
                    >
                      {/* Preferred Days */}
                      <div>
                        <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Preferred Days
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {daysOfWeek.map((day, index) => (
                            <motion.button
                              key={day}
                              className={`px-3 py-1 rounded-full text-sm ${
                                filters.eventCriteria.preferredDays.includes(index)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              onClick={() => {
                                if (onTogglePreferredDay) {
                                  onTogglePreferredDay(index);
                                }
                              }}
                              variants={badgeVariants}
                              initial="initial"
                              animate={filters.eventCriteria.preferredDays.includes(index) ? "selected" : "animate"}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              aria-pressed={filters.eventCriteria.preferredDays.includes(index)}
                            >
                              {day}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Time Range */}
                      <div>
                        <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          Time Range
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={filters.eventCriteria.timeRange.startTime || ''}
                              onChange={(e) => {
                                if (onUpdateTimeRange) {
                                  onUpdateTimeRange(
                                    e.target.value || null,
                                    filters.eventCriteria.timeRange.endTime
                                  );
                                }
                                }
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              aria-label="Start time filter"
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">End Time</label>
                            <input
                              type="time"
                              value={filters.eventCriteria.timeRange.endTime || ''}
                              onChange={(e) => {
                                if (onUpdateTimeRange) {
                                  onUpdateTimeRange(
                                    filters.eventCriteria.timeRange.startTime,
                                    e.target.value || null
                                  );
                                }
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              aria-label="End time filter"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Capacity Range */}
                      <div>
                        <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          Capacity Range
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Min Capacity</label>
                            <input
                              type="number"
                              min="1"
                              value={filters.eventCriteria.capacity.min || 1}
                              onChange={(e) => {
                                if (onUpdateCapacityRange) {
                                  const min = e.target.value ? parseInt(e.target.value) : 1;
                                  onUpdateCapacityRange(
                                    min,
                                    filters.eventCriteria.capacity.max
                                  );
                                }
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              aria-label="Minimum capacity filter"
                              placeholder="Min"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Max Capacity</label>
                            <input
                              type="number"
                              min={filters.eventCriteria.capacity.min || 1}
                              value={filters.eventCriteria.capacity.max || ''}
                              onChange={(e) => {
                                if (onUpdateCapacityRange) {
                                  const max = e.target.value ? parseInt(e.target.value) : null;
                                  onUpdateCapacityRange(
                                    filters.eventCriteria.capacity.min,
                                    max
                                  );
                                }
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              aria-label="Maximum capacity filter"
                              placeholder="Max"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Price Range */}
                      <div>
                        <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                          <DollarSign className="mr-2 h-4 w-4" />
                          Price Range
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Min Price ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={filters.eventCriteria.priceRange.min || 0}
                              onChange={(e) => {
                                if (onUpdatePriceRange) {
                                  const min = e.target.value ? parseFloat(e.target.value) : 0;
                                  onUpdatePriceRange(
                                    min, 
                                    filters.eventCriteria.priceRange.max
                                  );
                                }
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              aria-label="Minimum price filter"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Max Price ($)</label>
                            <input
                              type="number"
                              min={filters.eventCriteria.priceRange.min || 0}
                              step="0.01"
                              value={filters.eventCriteria.priceRange.max === Infinity ? '' : filters.eventCriteria.priceRange.max || ''}
                              onChange={(e) => {
                                if (onUpdatePriceRange) {
                                  const max = e.target.value ? parseFloat(e.target.value) : Infinity;
                                  onUpdatePriceRange(
                                    filters.eventCriteria.priceRange.min,
                                    max
                                  );
                                }
                              }}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              aria-label="Maximum price filter"
                              placeholder="No limit"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div>
                        <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                          <Tag className="mr-2 h-4 w-4" />
                          Payment Status
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(PAYMENT_STATUS_TYPES).map(([key, value]) => (
                            <motion.button
                              key={value}
                              className={`px-3 py-1 rounded-full text-sm ${
                                filters.eventCriteria.paymentStatus.includes(value)
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              onClick={() => {
                                if (onTogglePaymentStatus) {
                                  onTogglePaymentStatus(value);
                                }
                              }}
                              variants={badgeVariants}
                              initial="initial"
                              animate={filters.eventCriteria.paymentStatus.includes(value) ? "selected" : "animate"}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              aria-pressed={filters.eventCriteria.paymentStatus.includes(value)}
                              aria-label={`Filter by ${key.toLowerCase()} payment status`}
                            >
                              {key.charAt(0) + key.slice(1).toLowerCase()}
                            </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </TabsContent>
                </Tabs>
                {/* Reset Filters Button */}
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        if (onResetFilters) {
                          onResetFilters();
                        }
                      } catch (error) {
                        console.error('Failed to reset filters:', error);
                        // Could add error handling UI here if needed
                      }
                    }}
                    className="flex items-center"
                    disabled={isLoading || activeFilterCount === 0}
                    aria-label="Reset all filters"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset All Filters
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Overlay */}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/70 flex items-center justify-center z-10"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex flex-col items-center">
                <Spinner size="lg" className="mb-2" />
                <p className="text-sm text-gray-600">Updating filters...</p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
};

export default FilterBar;
