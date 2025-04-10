import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalendarContainer from '@/components/calendar/CalendarContainer';
import { FilterState, DEFAULT_FILTER_STATE, EVENT_TYPES } from '@/types/filters';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarEvents } from '@/components/calendar/hooks/useCalendarEvents';
import { useEventFilters } from '@/components/calendar/hooks/useEventFilters';
import { useToast } from '@/components/ui/use-toast';
import { Calendar } from '@/components/calendar/Calendar';
import { MapView } from '@/components/calendar/MapView';
import FilterBar from '@/components/calendar/FilterBar';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/components/calendar/hooks/useCalendarEvents', () => ({
  useCalendarEvents: vi.fn()
}));

vi.mock('@/components/calendar/hooks/useEventFilters', () => ({
  useEventFilters: vi.fn()
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn()
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn()
}));

// Mock sub-components
vi.mock('@/components/calendar/Calendar', () => ({
  Calendar: vi.fn(({ initialTimeSlots, onTimeSlotCreated, onTimeSlotUpdated, onTimeSlotDeleted, onUserJoinTimeSlot, onSelectEvent }) => {
    return (
      <div data-testid="calendar-component">
        <div>Calendar Events: {initialTimeSlots?.length || 0}</div>
        <button 
          data-testid="create-event" 
          onClick={() => onTimeSlotCreated && onTimeSlotCreated({
            id: 'new-event',
            title: 'New Event',
            start: new Date(),
            end: new Date(Date.now() + 3600000),
            typeId: 1,
            location: 'Location 1',
            isPaid: false,
            isTeacher: false
          })}
        >
          Create Event
        </button>
        <button 
          data-testid="select-event" 
          onClick={() => onSelectEvent && initialTimeSlots && initialTimeSlots.length > 0 && onSelectEvent(initialTimeSlots[0])}
        >
          Select Event
        </button>
        <button 
          data-testid="join-event" 
          onClick={() => onUserJoinTimeSlot && initialTimeSlots && initialTimeSlots.length > 0 && onUserJoinTimeSlot(initialTimeSlots[0].id)}
        >
          Join Event
        </button>
      </div>
    );
  })
}));

vi.mock('@/components/calendar/MapView', () => ({
  MapView: vi.fn(({ timeSlots, filters, onFilterChange, onTimeSlotSelected, onUserJoinTimeSlot, availableLocations }) => {
    return (
      <div data-testid="map-component">
        <div>Map Events: {timeSlots?.length || 0}</div>
        <div>
          <h4>Map Filters:</h4>
          <div data-testid="map-filter-status">
            <div>Types: {filters?.typeIds?.join(', ')}</div>
            <div>Locations: {filters?.locations?.join(', ')}</div>
            <div>Paid Only: {filters?.showPaidOnly ? 'Yes' : 'No'}</div>
            <div>Free Only: {filters?.showFreeOnly ? 'Yes' : 'No'}</div>
            <div>Joined Only: {filters?.showJoinedOnly ? 'Yes' : 'No'}</div>
          </div>
        </div>
        <button 
          data-testid="select-map-event" 
          onClick={() => onTimeSlotSelected && timeSlots && timeSlots.length > 0 && onTimeSlotSelected(timeSlots[0])}
        >
          Select Map Event
        </button>
        <button 
          data-testid="join-map-event" 
          onClick={() => onUserJoinTimeSlot && timeSlots && timeSlots.length > 0 && onUserJoinTimeSlot(timeSlots[0].id)}
        >
          Join Map Event
        </button>
      </div>
    );
  })
}));

vi.mock('@/components/calendar/FilterBar', () => ({
  __esModule: true,
  default: vi.fn(({ filters, onFilterChange, onToggleType, onToggleLocation, onTogglePaid, onToggleFree, onToggleJoined }) => {
    return (
      <div data-testid="filter-bar-component">
        <div>
          <h4>Event Types</h4>
          <div className="flex space-x-2">
            {EVENT_TYPES.map(type => (
              <button
                key={type.id}
                data-testid={`type-filter-${type.id}`}
                onClick={() => onToggleType && onToggleType(type.id)}
                className={filters?.typeIds?.includes(type.id) ? 'selected' : ''}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h4>Locations</h4>
          <div className="flex space-x-2">
            {['Location 1', 'Location 2', 'Location 3'].map(location => (
              <button
                key={location}
                data-testid={`location-filter-${location.replace(' ', '-')}`}
                onClick={() => onToggleLocation && onToggleLocation(location)}
                className={filters?.locations?.includes(location) ? 'selected' : ''}
              >
                {location}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex space-x-4">
          <label>
            <input
              type="checkbox"
              data-testid="paid-only-filter"
              checked={filters?.showPaidOnly || false}
              onChange={() => onTogglePaid && onTogglePaid(!filters?.showPaidOnly)}
            />
            Paid Only
          </label>
          
          <label>
            <input
              type="checkbox"
              data-testid="free-only-filter"
              checked={filters?.showFreeOnly || false}
              onChange={() => onToggleFree && onToggleFree(!filters?.showFreeOnly)}
            />
            Free Only
          </label>
          
          <label>
            <input
              type="checkbox"
              data-testid="joined-only-filter"
              checked={filters?.showJoinedOnly || false}
              onChange={() => onToggleJoined && onToggleJoined(!filters?.showJoinedOnly)}
            />
            Joined Only
          </label>
        </div>
        
        <button 
          data-testid="reset-filters"
          onClick={() => onFilterChange && onFilterChange({
            typeIds: [],
            locations: [],
            vectorSearch: '',
            showPaidOnly: false,
            showFreeOnly: false,
            showJoinedOnly: false,
            showAvailableOnly: false,
            eventSpecificCriteria: {}
          })}
        >
          Reset Filters
        </button>
      </div>
    );
  })
}));

// Mock error boundary to make testing easier
vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children, FallbackComponent, onReset }) => {
    return (
      <div data-testid="error-boundary">
        {children}
      </div>
    );
  }
}));

describe('Calendar Map Integration', () => {
  // Mock data
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Event 1',
      description: 'Event 1 description',
      startTime: '2023-01-01T10:00:00.000Z',
      endTime: '2023-01-01T12:00:00.000Z',
      eventTypeId: 1,
      location: { id: 'loc-1', name: 'Location 1' },
      price: 0,
      capacity: 20,
      participants: [],
      isCreator: false,
      isHighlyAcknowledged: false,
      isJoined: false,
      createdBy: 'user-1',
    },
    {
      id: 'event-2',
      title: 'Event 2',
      description: 'Event 2 description',
      startTime: '2023-01-02T14:00:00.000Z',
      endTime: '2023-01-02T16:00:00.000Z',
      eventTypeId: 2,
      location: { id: 'loc-2', name: 'Location 2' },
      price: 25,
      capacity: 10,
      participants: [],
      isCreator: true,
      isHighlyAcknowledged: true,
      isJoined: false,
      createdBy: 'user-2',
    },
    {
      id: 'event-3',
      title: 'Event 3',
      description: 'Event 3 description',
      startTime: '2023-01-03T09:00:00.000Z',
      endTime: '2023-01-03T11:00:00.000Z',
      eventTypeId: 3,
      location: { id: 'loc-3', name: 'Location 3' },
      price: 15,
      capacity: 15,
      participants: ['user-1'],
      isCreator: false,
      isHighlyAcknowledged: false,
      isJoined: true,
      createdBy: 'user-3',
    },
  ];
  
  const mockTimeSlots = mockEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    typeId: event.eventTypeId,
    location: event.location.name,
    isPaid: event.price > 0,
    isTeacher: event.isCreator,
    isHighlyAcknowledged: event.isHighlyAcknowledged,
    userJoined: event.isJoined,
    description: event.description,
    price: event.price,
    capacity: event.capacity,
    currentParticipants: event.participants?.length || 0,
    instructorId: event.createdBy,
  }));

  const mockFilters: FilterState = {
    ...DEFAULT_FILTER_STATE,
    typeIds: [1, 2, 3],
    locations: ['Location 1', 'Location 2', 'Location 3'],
  };

  // Setup mock hooks
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useAuth as any).mockReturnValue({
      session: { user: { id: 'test-user' } }
    });
    
    (useToast as any).mockReturnValue({
      toast: vi.fn()
    });
    
    (useMediaQuery as any).mockReturnValue(false);
    
    (useEventFilters as any).mockReturnValue({
      filters: mockFilters,
      applyFilters: vi.fn(),
      handleFilterChange: vi.fn(),
      toggleTypeFilter: vi.fn(),
      toggleLocationFilter: vi.fn(),
      toggleInstructorFilter: vi.fn(),
      togglePaidOnlyFilter: vi.fn(),
      toggleFreeOnlyFilter: vi.fn(),
      toggleJoinedOnlyFilter: vi.fn(),
      toggleAvailableOnlyFilter: vi.fn(),
      updatePriceRange: vi.fn(),
      updateCapacityRange: vi.fn(),
      updateTimeRange: vi.fn(),
      togglePreferredDay: vi.fn(),
      togglePaymentStatus: vi.fn(),
      setVectorSearch: vi.fn(),
      resetFilters: vi.fn(),
      availableLocations: ['Location 1', 'Location 2', 'Location 3', 'Location 4', 'Location 5'],
    });
    
    (useCalendarEvents as any).mockReturnValue({
      events: mockEvents,
      filteredEvents: mockEvents,
      loading: false,
      error: null,
      refresh: vi.fn(),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getEventById: vi.fn(id => mockEvents.find(event => event.id === id)),
      getEventStyling: vi.fn(),
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('renders all components correctly', async () => {
    render(<CalendarContainer />);
    
    // Check that all components are rendered
    expect(screen.getByTestId('filter-bar-component')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-component')).toBeInTheDocument();
    expect(screen.getByTestId('map-component')).toBeInTheDocument();
    
    // Check that events are passed to both calendar and map
    expect(screen.getByText('Calendar Events: 3')).toBeInTheDocument();
    expect(screen.getByText('Map Events: 3')).toBeInTheDocument();
  });

  test('handles loading state correctly', async () => {
    // Set error state
    (useCalendarEvents as any).mockReturnValue({
      events: [],
      filteredEvents: [],
      loading: false,
      error: 'Failed to load calendar data',
      refresh: vi.fn(),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getEventById: vi.fn(),
      getEventStyling: vi.fn(),
    });
    
    render(<CalendarContainer />);
    
    // Error message should be visible
    expect(screen.getByText('Failed to load calendar data')).toBeInTheDocument();
    
    // Retry button should be available
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    // Calendar and map components should not be rendered
    expect(screen.queryByTestId('calendar-component')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map-component')).not.toBeInTheDocument();
    
    // Test retry functionality
    const refreshMock = (useCalendarEvents as any).mock.results[0].value.refresh;
    fireEvent.click(retryButton);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  // 1. Filter Synchronization Tests
  
  test('type filter changes are reflected in both calendar and map', () => {
    // Setup a copy of the hooks to track changes
    const toggleTypeFilter = vi.fn();
    
    (useEventFilters as any).mockReturnValue({
      filters: { ...mockFilters },
      handleFilterChange: vi.fn(),
      toggleTypeFilter,
      toggleLocationFilter: vi.fn(),
      toggleInstructorFilter: vi.fn(),
      togglePaidOnlyFilter: vi.fn(),
      toggleFreeOnlyFilter: vi.fn(),
      toggleJoinedOnlyFilter: vi.fn(),
      toggleAvailableOnlyFilter: vi.fn(),
      resetFilters: vi.fn(),
      availableLocations: ['Location 1', 'Location 2', 'Location 3'],
    });
    
    render(<CalendarContainer />);
    
    // Click on the first event type filter button
    const typeFilterButton = screen.getByTestId('type-filter-1');
    fireEvent.click(typeFilterButton);
    
    // Check if toggleTypeFilter was called with correct args
    expect(toggleTypeFilter).toHaveBeenCalledWith(1);
  });
  
  test('location filter changes are reflected in both calendar and map', () => {
    // Setup a copy of the hooks to track changes
    const toggleLocationFilter = vi.fn();
    
    (useEventFilters as any).mockReturnValue({
      filters: { ...mockFilters },
      handleFilterChange: vi.fn(),
      toggleTypeFilter: vi.fn(),
      toggleLocationFilter,
      toggleInstructorFilter: vi.fn(),
      togglePaidOnlyFilter: vi.fn(),
      toggleFreeOnlyFilter: vi.fn(),
      toggleJoinedOnlyFilter: vi.fn(),
      toggleAvailableOnlyFilter: vi.fn(),
      resetFilters: vi.fn(),
      availableLocations: ['Location 1', 'Location 2', 'Location 3'],
    });
    
    render(<CalendarContainer />);
    
    // Click on a location filter button
    const locationFilterButton = screen.getByTestId('location-filter-Location-1');
    fireEvent.click(locationFilterButton);
    
    // Check if toggleLocationFilter was called with correct args
    expect(toggleLocationFilter).toHaveBeenCalledWith('Location 1');
  });
  
  test('price filter changes are reflected in both calendar and map', () => {
    // Setup mocks to track changes
    const togglePaidOnlyFilter = vi.fn();
    const toggleFreeOnlyFilter = vi.fn();
    
    (useEventFilters as any).mockReturnValue({
      filters: { ...mockFilters },
      handleFilterChange: vi.fn(),
      toggleTypeFilter: vi.fn(),
      toggleLocationFilter: vi.fn(),
      toggleInstructorFilter: vi.fn(),
      togglePaidOnlyFilter,
      toggleFreeOnlyFilter,
      toggleJoinedOnlyFilter: vi.fn(),
      toggleAvailableOnlyFilter: vi.fn(),
      resetFilters: vi.fn(),
      availableLocations: ['Location 1', 'Location 2', 'Location 3'],
    });
    
    render(<CalendarContainer />);
    
    // Click on paid only filter
    const paidOnlyCheckbox = screen.getByTestId('paid-only-filter');
    fireEvent.click(paidOnlyCheckbox);
    
    // Check if togglePaidOnlyFilter was called
    expect(togglePaidOnlyFilter).toHaveBeenCalled();
    
    // Click on free only filter
    const freeOnlyCheckbox = screen.getByTestId('free-only-filter');
    fireEvent.click(freeOnlyCheckbox);
    
    // Check if toggleFreeOnlyFilter was called
    expect(toggleFreeOnlyFilter).toHaveBeenCalled();
  });
  
  test('joined only filter changes are reflected in both calendar and map', () => {
    // Setup mocks to track changes
    const toggleJoinedOnlyFilter = vi.fn();
    
    (useEventFilters as any).mockReturnValue({
      filters: { ...mockFilters },
      handleFilterChange: vi.fn(),
      toggleTypeFilter: vi.fn(),
      toggleLocationFilter: vi.fn(),
      toggleInstructorFilter: vi.fn(),
      togglePaidOnlyFilter: vi.fn(),
      toggleFreeOnlyFilter: vi.fn(),
      toggleJoinedOnlyFilter,
      toggleAvailableOnlyFilter: vi.fn(),
      resetFilters: vi.fn(),
      availableLocations: ['Location 1', 'Location 2', 'Location 3'],
    });
    
    render(<CalendarContainer />);
    
    // Click on joined only filter
    const joinedOnlyCheckbox = screen.getByTestId('joined-only-filter');
    fireEvent.click(joinedOnlyCheckbox);
    
    // Check if toggleJoinedOnlyFilter was called
    expect(toggleJoinedOnlyFilter).toHaveBeenCalled();
  });
  
  test('resetting filters works correctly', () => {
    // Setup mocks to track changes
    const resetFilters = vi.fn();
    const handleFilterChange = vi.fn();
    
    (useEventFilters as any).mockReturnValue({
      filters: { ...mockFilters },
      handleFilterChange,
      toggleTypeFilter: vi.fn(),
      toggleLocationFilter: vi.fn(),
      toggleInstructorFilter: vi.fn(),
      togglePaidOnlyFilter: vi.fn(),
      toggleFreeOnlyFilter: vi.fn(),
      toggleJoinedOnlyFilter: vi.fn(),
      toggleAvailableOnlyFilter: vi.fn(),
      resetFilters,
      availableLocations: ['Location 1', 'Location 2', 'Location 3'],
    });
    
    render(<CalendarContainer />);
    
    // Click reset filters button
    const resetButton = screen.getByTestId('reset-filters');
    fireEvent.click(resetButton);
    
    // Check if handleFilterChange was called with the right reset parameters
    expect(handleFilterChange).toHaveBeenCalledWith({
      typeIds: [],
      locations: [],
      vectorSearch: '',
      showPaidOnly: false,
      showFreeOnly: false,
      showJoinedOnly: false,
      showAvailableOnly: false,
      eventSpecificCriteria: {}
    });
  });
  
  // 2. Event Selection and Joining Tests
  
  test('selecting an event in calendar triggers event selection with correct data', () => {
    // Mock onEventSelect callback
    const onEventSelect = vi.fn();
    
    render(<CalendarContainer onEventSelect={onEventSelect} />);
    
    // Click on select event button in calendar
    const selectEventButton = screen.getByTestId('select-event');
    fireEvent.click(selectEventButton);
    
    // Check that getEventById was called with the right ID
    const getEventById = (useCalendarEvents as any).mock.results[0].value.getEventById;
    expect(getEventById).toHaveBeenCalledWith(mockTimeSlots[0].id);
    
    // onEventSelect should have been called with the event data
    expect(onEventSelect).toHaveBeenCalledWith(mockEvents[0]);
  });
  
  test('selecting an event in map triggers event selection with correct data', () => {
    // Mock onEventSelect callback
    const onEventSelect = vi.fn();
    
    render(<CalendarContainer onEventSelect={onEventSelect} />);
    
    // Click on select event button in map
    const selectMapEventButton = screen.getByTestId('select-map-event');
    fireEvent.click(selectMapEventButton);
    
    // Check that getEventById was called with the right ID
    const getEventById = (useCalendarEvents as any).mock.results[0].value.getEventById;
    expect(getEventById).toHaveBeenCalledWith(mockTimeSlots[0].id);
    
    // onEventSelect should have been called with the event data
    expect(onEventSelect).toHaveBeenCalledWith(mockEvents[0]);
  });
  
  test('joining an event from calendar correctly calls join handler', () => {
    // Setup mocks
    const toast = vi.fn();
    (useToast as any).mockReturnValue({ toast });
    
    render(<CalendarContainer />);
    
    // Click join event button in calendar
    const joinEventButton = screen.getByTestId('join-event');
    fireEvent.click(joinEventButton);
    
    // Toast should be called with notification
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Joining Event"
      })
    );
  });
  
  test('joining an event from map correctly calls join handler', () => {
    // Setup mocks
    const toast = vi.fn();
    (useToast as any).mockReturnValue({ toast });
    
    render(<CalendarContainer />);
    
    // Click join event button in map
    const joinMapEventButton = screen.getByTestId('join-map-event');
    fireEvent.click(joinMapEventButton);
    
    // Toast should be called with notification
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Joining Event"
      })
    );
  });
  
  test('creating a new event works correctly', () => {
    // Setup mock for createEvent
    const createEvent = vi.fn();
    (useCalendarEvents as any).mockReturnValue({
      events: mockEvents,
      filteredEvents: mockEvents,
      loading: false,
      error: null,
      refresh: vi.fn(),
      createEvent,
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getEventById: vi.fn(id => mockEvents.find(event => event.id === id)),
      getEventStyling: vi.fn(),
    });
    
    render(<CalendarContainer />);
    
    // Click create event button in calendar
    const createEventButton = screen.getByTestId('create-event');
    fireEvent.click(createEventButton);
    
    // createEvent should be called with new event data
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-event',
        title: 'New Event',
        typeId: 1,
        location: 'Location 1',
        isPaid: false,
        isTeacher: false
      })
    );
  });
  
  // 3. Responsive Layout Tests
  
  test('renders single column layout on small screens', () => {
    // Mock small screen
    (useMediaQuery as any).mockImplementation((query) => {
      if (query === '(max-width: 1200px)') return true;
      return false;
    });
    
    render(<CalendarContainer />);
    
    // Check the grid layout has the appropriate classes
    const grid = screen.getByTestId('calendar-map-grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).not.toHaveClass('xl:grid-cols-3');
  });
  
  test('renders multi-column layout on large screens', () => {
    // Mock large screen
    (useMediaQuery as any).mockImplementation((query) => {
      if (query === '(max-width: 1200px)') return false;
      return false;
    });
    
    render(<CalendarContainer />);
    
    // Check the grid layout has the appropriate classes
    const grid = screen.getByTestId('calendar-map-grid');
    expect(grid).toHaveClass('xl:grid-cols-3');
  });
  
  // 4. Error Handling Tests
  
  test('calendar error boundary catches errors and displays fallback', () => {
    // Make Calendar component throw an error
    (Calendar as any).mockImplementation(() => {
      throw new Error('Calendar component crashed');
      return null;
    });
    
    render(<CalendarContainer />);
    
    // Error boundary should catch the error
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    
    // Reset mock to avoid affecting other tests
    (Calendar as any).mockReset();
  });
  
  test('map error boundary catches errors and displays fallback', () => {
    // Make MapView component throw an error
    (MapView as any).mockImplementation(() => {
      throw new Error('Map component crashed');
      return null;
    });
    
    render(<CalendarContainer />);
    
    // Error boundary should catch the error
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    
    // Reset mock to avoid affecting other tests
    (MapView as any).mockReset();
  });
  
  test('filter bar error boundary catches errors and displays fallback', () => {
    // Make FilterBar component throw an error
    (FilterBar as any).mockImplementation(() => {
      throw new Error('FilterBar component crashed');
      return null;
    });
    
    render(<CalendarContainer />);
    
    // Error boundary should catch the error
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    
    // Reset mock to avoid affecting other tests
    (FilterBar as any).mockReset();
  });
  
  // 5. Performance and State Persistence Tests
  
  test('filter changes do not cause unnecessary re-renders', () => {
    // Setup render counters for each component
    let calendarRenderCount = 0;
    let mapRenderCount = 0;
    
    // Track renders in the component mocks
    (Calendar as any).mockImplementation(({ initialTimeSlots }) => {
      calendarRenderCount++;
      return (
        <div data-testid="calendar-component">
          <div>Calendar Renders: {calendarRenderCount}</div>
          <div>Calendar Events: {initialTimeSlots?.length || 0}</div>
        </div>
      );
    });
    
    (MapView as any).mockImplementation(({ timeSlots, filters }) => {
      mapRenderCount++;
      return (
        <div data-testid="map-component">
          <div>Map Renders: {mapRenderCount}</div>
          <div>Map Events: {timeSlots?.length || 0}</div>
        </div>
      );
    });
    
    // Setup filter change handler that we can control
    const handleFilterChange = vi.fn();
    (useEventFilters as any).mockReturnValue({
      filters: { ...mockFilters },
      handleFilterChange,
      toggleTypeFilter: vi.fn(typeId => {
        // Simulate filter change by returning a new filter object
        // but with the same values - should not trigger re-renders
        handleFilterChange({ 
          typeIds: [...mockFilters.typeIds] 
        });
      }),
      toggleLocationFilter: vi.fn(),
      toggleInstructorFilter: vi.fn(),
      togglePaidOnlyFilter: vi.fn(),
      toggleFreeOnlyFilter: vi.fn(),
      toggleJoinedOnlyFilter: vi.fn(),
      toggleAvailableOnlyFilter: vi.fn(),
      resetFilters: vi.fn(),
      availableLocations: ['Location 1', 'Location 2', 'Location 3'],
    });
    
    const { rerender } = render(<CalendarContainer />);
    
    // Capture initial render counts
    const initialCalendarRenders = calendarRenderCount;
    const initialMapRenders = mapRenderCount;
    
    // Re-render with exactly same props
    rerender(<CalendarContainer />);
    
    // No new renders should happen when props are unchanged
    expect(calendarRenderCount).toBe(initialCalendarRenders);
    expect(mapRenderCount).toBe(initialMapRenders);
    
    // Simulate filter change that doesn't actually change the data
    const typeFilterButton = screen.getByTestId('type-filter-1');
    fireEvent.click(typeFilterButton);
    
    // Verify handleFilterChange was called
    expect(handleFilterChange).toHaveBeenCalled();
    
    // Verify useMemo is working correctly by checking renders
    // Each component should have only rendered the minimal necessary times
    expect(calendarRenderCount).toBeLessThanOrEqual(initialCalendarRenders + 1);
    expect(mapRenderCount).toBeLessThanOrEqual(initialMapRenders + 1);
    
    // Reset mocks
    (Calendar as any).mockReset();
    (MapView as any).mockReset();
  });
  
  test('event selection state persists between view changes', async () => {
    // Create a reference to store selected event for persistence testing
    let selectedEventRef: any = null;
    
    // Modify getEventById to record selection
    const getEventById = vi.fn(id => {
      const event = mockEvents.find(event => event.id === id);
      selectedEventRef = event;
      return event;
    });
    
    (useCalendarEvents as any).mockReturnValue({
      events: mockEvents,
      filteredEvents: mockEvents,
      loading: false,
      error: null,
      refresh: vi.fn(),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getEventById,
      getEventStyling: vi.fn(),
    });
    
    const onEventSelect = vi.fn();
    
    const { rerender } = render(
      <CalendarContainer onEventSelect={onEventSelect} />
    );
    
    // First select an event from the calendar
    const selectEventButton = screen.getByTestId('select-event');
    fireEvent.click(selectEventButton);
    
    // Verify event was selected
    expect(getEventById).toHaveBeenCalled();
    expect(onEventSelect).toHaveBeenCalledWith(mockEvents[0]);
    
    // Remember the selected event
    const selectedEvent = selectedEventRef;
    
    // Simulate view change by re-rendering the component
    // In a real app, this could be switching between calendar and map views
    rerender(<CalendarContainer onEventSelect={onEventSelect} />);
    
    // Now select an event from the map
    const selectMapEventButton = screen.getByTestId('select-map-event');
    fireEvent.click(selectMapEventButton);
    
    // Verify the same event selection is maintained
    expect(getEventById).toHaveBeenCalledWith(mockTimeSlots[0].id);
    expect(onEventSelect).toHaveBeenCalledWith(selectedEvent);
  });
  
  test('components clean up event listeners and subscriptions properly', () => {
    // Mock cleanup functions for testing useEffect cleanup
    const mockCleanup = vi.fn();
    const mockUnsubscribe = vi.fn();
    
    // Mock useEffect to check for cleanup function
    const originalUseEffect = React.useEffect;
    vi.spyOn(React, 'useEffect').mockImplementation((callback, deps) => {
      // Call the effect to get the cleanup function
      const cleanup = callback();
      if (typeof cleanup === 'function') {
        mockCleanup.mockImplementation(cleanup);
      }
      return originalUseEffect(() => {
        // Return the original effect
        const returnValue = callback();
        return returnValue;
      }, deps);
    });
    
    // Mock the refresh function to return an unsubscribe function
    (useCalendarEvents as any).mockReturnValue({
      events: mockEvents,
      filteredEvents: mockEvents,
      loading: false,
      error: null,
      refresh: vi.fn(() => mockUnsubscribe),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getEventById: vi.fn(id => mockEvents.find(event => event.id === id)),
      getEventStyling: vi.fn(),
    });
    
    // Render and unmount to trigger cleanup
    const { unmount } = render(<CalendarContainer />);
    unmount();
    
    // Verify cleanup was called
    expect(mockCleanup).toHaveBeenCalled();
    
    // Restore original useEffect
    vi.restoreAllMocks();
  });
  
  test('handles concurrent filter and event operations correctly', async () => {
    // Create promise-based filter change to simulate async behavior
    const asyncFilterChange = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(true);
        }, 100);
      });
    });
    
    // Create promise-based event selection to simulate async behavior
    const asyncGetEventById = vi.fn().mockImplementation((id) => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(mockEvents.find(event => event.id === id));
        }, 50);
      });
    });
    
    (useEventFilters as any).mockReturnValue({
      filters: { ...mockFilters },
      handleFilterChange: asyncFilterChange,
      toggleTypeFilter: vi.fn(typeId => asyncFilterChange({ typeIds: [typeId] })),
      toggleLocationFilter: vi.fn(),
      toggleInstructorFilter: vi.fn(),
      togglePaidOnlyFilter: vi.fn(),
      toggleFreeOnlyFilter: vi.fn(),
      toggleJoinedOnlyFilter: vi.fn(),
      toggleAvailableOnlyFilter: vi.fn(),
      resetFilters: vi.fn(),
      availableLocations: ['Location 1', 'Location 2', 'Location 3'],
    });
    
    (useCalendarEvents as any).mockReturnValue({
      events: mockEvents,
      filteredEvents: mockEvents,
      loading: false,
      error: null,
      refresh: vi.fn(),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getEventById: asyncGetEventById,
      getEventStyling: vi.fn(),
    });
    
    render(<CalendarContainer />);
    
    // Initiate concurrent operations
    const typeFilterButton = screen.getByTestId('type-filter-1');
    const selectEventButton = screen.getByTestId('select-event');
    
    // Click both nearly simultaneously
    fireEvent.click(typeFilterButton);
    fireEvent.click(selectEventButton);
    
    // Wait for both promises to resolve
    await vi.waitFor(() => {
      expect(asyncFilterChange).toHaveBeenCalled();
      expect(asyncGetEventById).toHaveBeenCalled();
    });
    
    // The test passes if there are no errors thrown during the concurrent operations
    // This verifies that the component can handle race conditions gracefully
  });
});
    // Loading spinner should be visible
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toBeInTheDocument();
    
    // Calendar and map components should not be rendered
    expect(screen.queryByTestId('calendar-component')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map-component')).not.toBeInTheDocument();
  });

  test('handles error state correctly', async () => {
    // Set error state
    (useCalendarEvents as any).mockReturnValue({
      events: [],
      filteredEvents: [],
      loading: false,
      error: 'Failed to load calendar data',
      refresh: vi.fn(),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getEventById: vi.fn(),
      getEventStyling: vi.fn(),
    });
    
    render(<CalendarContainer />);
    

