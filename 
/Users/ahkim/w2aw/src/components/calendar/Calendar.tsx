// TimeSlot interface is now imported from useCalendarEvents
}) => {
  // State for modal management
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Use our custom hooks
  const { 
    timeSlots, 
    handleSaveTimeSlot, 
    handleDeleteTimeSlot,
    handleJoinTimeSlot,
    getEventColor
  } = useCalendarEvents(initialTimeSlots, {
    onTimeSlotCreated,
    onTimeSlotUpdated,
    onTimeSlotDeleted,
    onUserJoinTimeSlot
  });
  
  // Use filters hook
  const { 
    filters, 
    filteredTimeSlots,
    handleFilterChange,
    toggleTypeFilter,
    toggleLocationFilter
  } = useEventFilters(timeSlots);
  // Event color functionality now comes from useCalendarEvents hook
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const newTimeSlot = {
      id: '',
      title: '',
      start,
      end,
      typeId: 1,
      location: 'Location 1',
      isPaid: false,
      isTeacher: false,
    };
    
    setSelectedTimeSlot(newTimeSlot);
    setIsCreating(true);
const Calendar: React.FC<CalendarProps> = ({
  onTimeSlotCreated,
  onTimeSlotUpdated,
  onTimeSlotDeleted,
  onUserJoinTimeSlot,
  initialTimeSlots = [],
}) => {
  // Modal state
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // State for responsive layout
  const [isMobile, setIsMobile] = useState(false);
  
  // Use custom hooks for events and filters
  const { 
    timeSlots, 
    createTimeSlot, 
    updateTimeSlot, 
    deleteTimeSlot, 
    joinTimeSlot,
    getEventColor,
    eventStyleGetter,
    fetchTimeSlots,
    createDraftTimeSlot,
    isLoading
  } = useCalendarEvents({
    initialTimeSlots,
    onTimeSlotCreated,
    onTimeSlotUpdated,
    onTimeSlotDeleted,
    onUserJoinTimeSlot
  });
  
  // Use filters hook
  const {
    filters,
    applyFilters,
    handleFilterChange,
    toggleTypeFilter,
    toggleLocationFilter,
    availableLocations
  } = useEventFilters();
  
  // Apply filters to get filtered time slots
  const filteredTimeSlots = applyFilters(timeSlots);

  // Check screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Initial check
    checkScreenSize();
    
    // Listen for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Load initial events
  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);
  // Handle time slot selection
  const handleSelectTimeSlot = useCallback((timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setIsModalOpen(true);
    setIsCreating(false);
  }, []);

  // Handle creating a new time slot
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const newDraftTimeSlot = createDraftTimeSlot({ start, end });
    setSelectedTimeSlot(newDraftTimeSlot);
    setIsModalOpen(true);
    setIsCreating(true);
  }, [createDraftTimeSlot]);

  // Handle saving a time slot (create or update)
  const handleSaveTimeSlot = useCallback((timeSlot: TimeSlot) => {
    if (isCreating) {
      createTimeSlot(timeSlot);
    } else {
      updateTimeSlot(timeSlot);
    }
    setIsModalOpen(false);
  }, [isCreating, createTimeSlot, updateTimeSlot]);

  // Handle deleting a time slot
  const handleDeleteTimeSlot = useCallback((timeSlotId: string) => {
    deleteTimeSlot(timeSlotId);
    setIsModalOpen(false);
  }, [deleteTimeSlot]);

  // Handle joining a time slot
  const handleJoinTimeSlot = useCallback((timeSlotId: string) => {
    joinTimeSlot(timeSlotId);
  }, [joinTimeSlot]);

  return (
    <Container>
      <div className="h-full flex flex-col">
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          availableLocations={availableLocations}
        />
        
        {/* Main Content Area - Calendar and Map */}
        <div className={`mt-6 grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-2 gap-8'}`}>
          {/* Calendar */}
          <div className={`bg-white p-4 rounded-lg shadow ${isMobile ? 'order-1' : 'order-1'}`}>
            <h2 className="text-xl font-semibold mb-4">Calendar</h2>
            <div className="h-[700px]">
              <BigCalendar
                localizer={localizer}
                events={filteredTimeSlots}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                selectable
                onSelectEvent={handleSelectTimeSlot}
                onSelectSlot={handleSelectSlot}
                eventPropGetter={eventStyleGetter}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                defaultView={Views.WEEK}
                defaultDate={new Date()}
                popup
                components={{
                  event: (props) => (
                    <div>
                      <div className="font-semibold"
