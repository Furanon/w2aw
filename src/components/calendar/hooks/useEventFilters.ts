import { debounce } from '@/lib/utils';
import { EventType } from '@/lib/events/schemas/baseEvent';
// Local storage key for filter state
const FILTER_STORAGE_KEY = 'calendar_filter_state';
// Debounce time for filter changes (in ms)
const FILTER_DEBOUNCE_TIME = 300;

interface UseEventFiltersProps {
  initialFilters?: FilterState;
  persistFilters?: boolean;
  syncWithKafka?: boolean;
}

/**
 * Custom hook for managing event filters with improved synchronization between components
 */
export function useEventFilters({
  initialFilters = DEFAULT_FILTER_STATE,
  persistFilters = true,
  syncWithKafka = true,
}: UseEventFiltersProps = {}) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  
  // Initialize filter state from localStorage if available
  const loadInitialFilters = useCallback(() => {
    if (persistFilters) {
      try {
        const savedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
        if (savedFilters) {
          const parsedFilters = JSON.parse(savedFilters);
          // Validate parsed filters for safety
          if (parsedFilters && typeof parsedFilters === 'object') {
            // Merge with default filters to ensure all properties exist
            return {
              ...DEFAULT_FILTER_STATE,
              ...parsedFilters,
              // Ensure eventCriteria is properly structured
              eventCriteria: {
                ...DEFAULT_FILTER_STATE.eventCriteria,
                ...(parsedFilters.eventCriteria || {}),
              },
            };
          }
        }
      } catch (error) {
        console.error('Error loading filters from localStorage:', error);
        // If there's an error, remove the corrupt data
        localStorage.removeItem(FILTER_STORAGE_KEY);
      }
    }
    return initialFilters;
  }, [initialFilters, persistFilters]);

  // State for filter management
  const [filters, setFilters] = useState<FilterState>(loadInitialFilters);
  
  // Track if filter changes are from local user or external update
  const [isLocalUpdate, setIsLocalUpdate] = useState<boolean>(false);
  
  // Get Kafka service instance
  const kafkaService = useMemo(() => 
    syncWithKafka ? KafkaService.getInstance() : null
  , [syncWithKafka]);
  
  // Set up Kafka subscription for filter updates
  useEffect(() => {
    if (!syncWithKafka || !kafkaService || !userId) {
      return;
    }
    
    // Keep track of whether component is mounted
    let isMounted = true;
    let unsubscribe: (() => Promise<void>) | null = null;
    
    // Set up subscription to CALENDAR_UPDATES topic
    const setupSubscription = async () => {
      try {
        unsubscribe = await kafkaService.subscribeToTopics(
          [KAFKA_TOPICS.CALENDAR_UPDATES],
          (message: FilterUpdateMessage) => {
            // Skip if component is unmounted
            if (!isMounted) return;
            
            // Process the message if it's a calendar update
            if (message.type === EventType.CALENDAR_UPDATED) {
              handleExternalFilterUpdate(message);
            }
          }
        );
        
        console.log('Subscribed to filter updates via Kafka');
      } catch (error) {
        console.error('Failed to subscribe to filter updates:', error);
      }
    };
    
    setupSubscription();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Unsubscribe from Kafka topics
      if (unsubscribe) {
        unsubscribe().catch(error => {
          console.error('Error unsubscribing from Kafka filter updates:', error);
        });
      }
    };
  }, [syncWithKafka, kafkaService, userId, handleExternalFilterUpdate]);
  // Function to persist filters to localStorage
  const persistFilterState = useCallback((filterState: FilterState) => {
    if (persistFilters) {
      try {
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterState));
      } catch (error) {
        console.error('Error saving filters to localStorage:', error);
      }
    }
  }, [persistFilters]);
  
  // Function to publish filter changes to Kafka for other components to sync
  const publishFilterChanges = useCallback(
    debounce((filterState: FilterState, localUserId?: string) => {
      if (syncWithKafka && kafkaService && localUserId) {
        try {
          const updateMessage = kafkaService.createCalendarUpdateMessage(
            filterState,
            localUserId
          );
          
          kafkaService.publishMessage(KAFKA_TOPICS.CALENDAR_UPDATES, updateMessage)
            .catch(error => {
              console.error('Failed to publish filter update to Kafka:', error);
            });
        } catch (error) {
          console.error('Error creating filter update message:', error);
        }
      }
    }, FILTER_DEBOUNCE_TIME),
    [syncWithKafka, kafkaService]
  );
  
  // Memoized function to apply filters efficiently
  const applyFilters = useCallback(
    (data: any[]): any[] => {
      if (!data || data.length === 0) return [];

      return data.filter(item => {
        // Type filtering
        if (filters.typeIds.length > 0 && !filters.typeIds.includes(item.typeId)) {
          return false;
        }
        
        // Location filtering
        if (filters.locations.length > 0 && 
           !filters.locations.some(loc => 
              item.location && item.location.toLowerCase().includes(loc.toLowerCase())
           )) {
          return false;
        }
        
        // Instructor filtering
        if (filters.instructorIds.length > 0 && 
           !filters.instructorIds.includes(item.instructorId)) {
          return false;
        }
        
        // Payment type filtering
        if (filters.showPaidOnly && !item.isPaid) {
          return false;
        }
        
        if (filters.showFreeOnly && item.isPaid) {
          return false;
        }
        
        // User joined filtering
        if (filters.showJoinedOnly && !item.userJoined) {
          return false;
        }
        
        // Available slots filtering
        if (filters.showAvailableOnly && 
           item.capacity > 0 && 
           item.currentParticipants >= item.capacity) {
          return false;
        }
        
        // Price range filtering
        if (filters.eventCriteria && filters.eventCriteria.priceRange) {
          const { min, max } = filters.eventCriteria.priceRange;
          if (min > 0 && item.price < min) {
            return false;
          }
          if (max !== Infinity && item.price > max) {
            return false;
          }
        }
        
        // Time range filtering
        if (filters.eventCriteria && filters.eventCriteria.timeRange) {
          const { startTime, endTime } = filters.eventCriteria.timeRange;
          
          if (startTime) {
            const eventStart = new Date(item.start);
            const filterStart = new Date(`1970-01-01T${startTime}`);
            
            if (eventStart.getHours() < filterStart.getHours() || 
               (eventStart.getHours() === filterStart.getHours() && 
                eventStart.getMinutes() < filterStart.getMinutes())) {
              return false;
            }
          }
          
          if (endTime) {
            const eventEnd = new Date(item.end);
            const filterEnd = new Date(`1970-01-01T${endTime}`);
            
            if (eventEnd.getHours() > filterEnd.getHours() || 
               (eventEnd.getHours() === filterEnd.getHours() && 
                eventEnd.getMinutes() > filterEnd.getMinutes())) {
              return false;
            }
          }
        }
        
        // Preferred days filtering
        if (filters.eventCriteria && 
           filters.eventCriteria.preferredDays && 
           filters.eventCriteria.preferredDays.length > 0) {
          const eventDay = new Date(item.start).getDay();
          if (!filters.eventCriteria.preferredDays.includes(eventDay)) {
            return false;
          }
        }
        
        // Simple vector search (keyword search)
        if (filters.vectorSearch && filters.vectorSearch.trim() !== '') {
          const searchTerms = filters.vectorSearch.toLowerCase().trim().split(/\s+/);
          const itemText = `${item.title} ${item.description || ''}`.toLowerCase();
          
          if (!searchTerms.some(term => itemText.includes(term))) {
            return false;
          }
        }
        
        return true;
      });
    },
    [filters]
  );
  
  // Handler for external filter updates via Kafka
  const handleExternalFilterUpdate = useCallback((filterUpdateMessage: FilterUpdateMessage) => {
    // Skip processing if this is a local update or from the same user
    if (isLocalUpdate || filterUpdateMessage.data.userId === userId) {
      setIsLocalUpdate(false);
      return;
    }
    
    // Update filters with external data
    const newFilters = filterUpdateMessage.data.filters;
    
    // Validate the received filters
    if (!newFilters || typeof newFilters !== 'object') {
      console.error('Received invalid filter data:', newFilters);
      return;
    }
    
    // Apply the new filters
    setFilters({
      ...DEFAULT_FILTER_STATE, // Always include defaults as fallback
      ...newFilters,
      // Ensure eventCriteria is properly structured
      eventCriteria: {
        ...DEFAULT_FILTER_STATE.eventCriteria,
        ...(newFilters.eventCriteria || {}),
      },
    });
    
    // Update localStorage if enabled
    if (persistFilters) {
      persistFilterState(newFilters);
    }
  }, [isLocalUpdate, userId, persistFilters, persistFilterState]);

  // Base handler for filter changes with optimized updates
  const handleFilterChange = useCallback((newPartialFilters: Partial<FilterState>) => {
    try {
      setFilters(prevFilters => {
        // Create new filter state by merging previous state with new partial state
        const newFilters = {
          ...prevFilters,
          ...newPartialFilters,
          // Special handling for nested eventCriteria to avoid losing nested properties
          eventCriteria: {
            ...prevFilters.eventCriteria,
            ...(newPartialFilters.eventCriteria || {}),
          },
        };
        
        // Mark as local update to avoid duplicate processing
        setIsLocalUpdate(true);
        
        // Persist to localStorage
        persistFilterState(newFilters);
        
        return newFilters;
      });
      
      // Publish to Kafka for component synchronization
      // Using setTimeout to ensure we have the updated state
      setTimeout(() => {
        setFilters(currentFilters => {
          publishFilterChanges(currentFilters, userId);
          return currentFilters;
        });
      }, 0);
    } catch (error) {
      console.error('Error applying filter changes:', error);
      // In case of error, reset isLocalUpdate flag to prevent stuck state
      setIsLocalUpdate(false);
    }
  }, [persistFilterState, publishFilterChanges, userId]);
  // Toggle type filter efficiently
  const toggleTypeFilter = useCallback((typeId: number) => {
    try {
      setFilters(prevFilters => {
        const isSelected = prevFilters.typeIds.includes(typeId);
        const newTypeIds = isSelected
          ? prevFilters.typeIds.filter(id => id !== typeId)
          : [...prevFilters.typeIds, typeId];
        
        const newFilters = {
          ...prevFilters,
          typeIds: newTypeIds,
        };
        
        // Mark as local update
        setIsLocalUpdate(true);
        
        // Persist changes
        persistFilterState(newFilters);
        
        return newFilters;
      });
      
      // Publish to Kafka
      setTimeout(() => {
        setFilters(currentFilters => {
          publishFilterChanges(currentFilters, userId);
          return currentFilters;
        });
      }, 0);
    } catch (error) {
      console.error('Error toggling type filter:', error);
      setIsLocalUpdate(false);
    }
  }, [persistFilterState, publishFilterChanges, userId]);
  // Toggle location filter efficiently
  const toggleLocationFilter = useCallback((location: string) => {
    try {
      setFilters(prevFilters => {
        const isSelected = prevFilters.locations.includes(location);
        const newLocations = isSelected
          ? prevFilters.locations.filter(loc => loc !== location)
          : [...prevFilters.locations, location];
        
        const newFilters = {
          ...prevFilters,
          locations: newLocations,
        };
        
        // Mark as local update
        setIsLocalUpdate(true);
        
        // Persist changes
        persistFilterState(newFilters);
        
        return newFilters;
      });
      
      // Publish to Kafka
      setTimeout(() => {
        setFilters(currentFilters => {
          publishFilterChanges(currentFilters, userId);
          return currentFilters;
        });
      }, 0);
    } catch (error) {
      console.error('Error toggling location filter:', error);
      setIsLocalUpdate(false);
    }
  }, [persistFilterState, publishFilterChanges, userId]);
  // Toggle instructor filter efficiently
  const toggleInstructorFilter = useCallback((instructorId: string) => {
    try {
      setFilters(prevFilters => {
        const isSelected = prevFilters.instructorIds.includes(instructorId);
        const newInstructorIds = isSelected
          ? prevFilters.instructorIds.filter(id => id !== instructorId)
          : [...prevFilters.instructorIds, instructorId];
        
        const newFilters = {
          ...prevFilters,
          instructorIds: newInstructorIds,
        };
        
        // Mark as local update
        setIsLocalUpdate(true);
        
        // Persist changes
        persistFilterState(newFilters);
        
        return newFilters;
      });
      
      // Publish to Kafka
      setTimeout(() => {
        setFilters(currentFilters => {
          publishFilterChanges(currentFilters, userId);
          return currentFilters;
        });
      }, 0);
    } catch (error) {
      console.error('Error toggling instructor filter:', error);
      setIsLocalUpdate(false);
    }
  }, [persistFilterState, publishFilterChanges, userId]);
  // Toggle boolean filter helpers
  const togglePaidOnlyFilter = useCallback((value: boolean) => {
    handleFilterChange({ 
      showPaidOnly: value,
      // Automatically turn off free only if paid only is enabled
      showFreeOnly: value ? false : filters.showFreeOnly,
    });
  }, [handleFilterChange, filters.showFreeOnly]);
  
  const toggleFreeOnlyFilter = useCallback((value: boolean) => {
    handleFilterChange({ 
      showFreeOnly: value,
      // Automatically turn off paid only if free only is enabled
      showPaidOnly: value ? false : filters.showPaidOnly,
    });
  }, [handleFilterChange, filters.showPaidOnly]);
  
  const toggleJoinedOnlyFilter = useCallback((value: boolean) => {
    handleFilterChange({ showJoinedOnly: value });
  }, [handleFilterChange]);
  
  const toggleAvailableOnlyFilter = useCallback((value: boolean) => {
    handleFilterChange({ showAvailableOnly: value });
  }, [handleFilterChange]);
  
  // Update price range
  const updatePriceRange = useCallback((min: number, max: number) => {
    handleFilterChange({
      eventCriteria: {
        ...filters.eventCriteria,
        priceRange: { min, max },
      },
    });
  }, [handleFilterChange, filters.eventCriteria]);
  
  // Update capacity range
  const updateCapacityRange = useCallback((min: number, max: number | null) => {
    handleFilterChange({
      eventCriteria: {
        ...filters.eventCriteria,
        capacity: { min, max },
      },
    });
  }, [handleFilterChange, filters.eventCriteria]);
  
  // Update time range
  const updateTimeRange = useCallback((startTime: string | null, endTime: string | null) => {
    handleFilterChange({
      eventCriteria: {
        ...filters.eventCriteria,
        timeRange: { startTime, endTime },
      },
    });
  }, [handleFilterChange, filters.eventCriteria]);
  
  // Toggle preferred day filter
  const togglePreferredDay = useCallback((day: number) => {
    handleFilterChange({
      eventCriteria: {
        ...filters.eventCriteria,
        preferredDays: filters.eventCriteria.preferredDays.includes(day)
          ? filters.eventCriteria.preferredDays.filter(d => d !== day)
          : [...filters.eventCriteria.preferredDays, day],
      },
    });
  }, [handleFilterChange, filters.eventCriteria]);
  
  // Toggle payment status filter
  const togglePaymentStatus = useCallback((status: string) => {
    handleFilterChange({
      eventCriteria: {
        ...filters.eventCriteria,
        paymentStatus: filters.eventCriteria.paymentStatus.includes(status)
          ? filters.eventCriteria.paymentStatus.filter(s => s !== status)
          : [...filters.eventCriteria.paymentStatus, status],
      },
    });
  }, [handleFilterChange, filters.eventCriteria]);
  
  // Update vector search
  const setVectorSearch = useCallback(debounce((search: string) => {
    handleFilterChange({ vectorSearch: search });
  }, FILTER_DEBOUNCE_TIME), [handleFilterChange]);
  
// Interface for Kafka filter update message
interface FilterUpdateMessage {
  type: string;
  data: {
    filters: FilterState;
    userId?: string;
  };
}

// Reset all filters to default state
const resetFilters = useCallback(() => {
  // First remove persistent filters if enabled
  if (persistFilters) {
    localStorage.removeItem(FILTER_STORAGE_KEY);
  }
    
  // Reset to default state
  setFilters(DEFAULT_FILTER_STATE);
  setIsLocalUpdate(true);
    
  // Publish reset to Kafka
  if (syncWithKafka && kafkaService && userId) {
    try {
      const resetMessage = kafkaService.createCalendarUpdateMessage(
        DEFAULT_FILTER_STATE,
        userId
      );
        
      kafkaService.publishMessage(KAFKA_TOPICS.CALENDAR_UPDATES, resetMessage)
        .catch(error => {
          console.error('Failed to publish filter reset to Kafka:', error);
        });
    } catch (error) {
      console.error('Error creating filter reset message:', error);
    }
  }
}, [persistFilters, syncWithKafka, kafkaService, userId]);

