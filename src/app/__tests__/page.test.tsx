import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../page';
import { KafkaService } from '@/lib/services/kafkaService';
import { KAFKA_TOPICS } from '@/lib/config/kafka';
import { FilterState, DEFAULT_FILTER_STATE } from '@/types/filters';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock dynamic import for MapView
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => <div data-testid="map-view">Map View</div>;
  DynamicComponent.displayName = 'MapView';
  return DynamicComponent;
});

// Mock FilterBar component
jest.mock('@/components/calendar/FilterBar', () => {
  return function MockFilterBar({ filters, onFilterChange }) {
    return (
      <div data-testid="filter-bar">
        <button 
          data-testid="filter-button" 
          onClick={() => onFilterChange({ showPaidOnly: !filters.showPaidOnly })}
        >
          Toggle Paid Only
        </button>
        <span>Filter Bar Component</span>
      </div>
    );
  };
});

// Mock LandingPageCalendar component
jest.mock('@/components/landing/LandingPageCalendar', () => {
  return function MockCalendar({ initialEvents, onEventSelect }) {
    return (
      <div data-testid="calendar">
        <span>Calendar Component</span>
        <div>Events: {initialEvents?.length || 0}</div>
        <button 
          data-testid="select-event-button" 
          onClick={() => initialEvents?.[0] && onEventSelect(initialEvents[0])}
        >
          Select First Event
        </button>
      </div>
    );
  };
});

// Mock Kafka service
jest.mock('@/lib/services/kafkaService', () => {
  return {
    KafkaService: {
      getInstance: jest.fn(() => ({
        publishMessage: jest.fn().mockResolvedValue(undefined),
        subscribeToTopics: jest.fn().mockResolvedValue(jest.fn()),
        createCalendarUpdateMessage: jest.fn().mockReturnValue({ id: 'mock-id', data: {} }),
        createCalendarEventMessage: jest.fn().mockReturnValue({ id: 'mock-id', data: {} }),
        createVisualizationUpdateMessage: jest.fn().mockReturnValue({ id: 'mock-id', data: {} }),
      })),
    },
  };
});

// Mock useSession
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock useToast
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock useMediaQuery
jest.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Home Component', () => {
  // Set up mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock session
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: { id: 'user-123', name: 'Test User' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      status: 'authenticated',
    });
    
    // Mock toast
    (useToast as jest.Mock).mockReturnValue({
      toast: jest.fn(),
    });
    
    // Mock media query - default to desktop
    (useMediaQuery as jest.Mock).mockImplementation((query) => {
      if (query === '(max-width: 768px)') return false;
      if (query === '(max-width: 1024px)') return false;
      return false;
    });
    
    // Mock fetch for API calls
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        events: [
          {
            id: '1',
            title: 'Test Event',
            description: 'Event description',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            eventTypeId: 1,
            location: {
              id: 'loc1',
              name: 'Test Location',
              address: 'Test Address',
              coordinates: { lat: 10, lng: 10 },
            },
            price: 20,
            capacity: 50,
            currentParticipants: 10,
            participants: [],
            isCreator: false,
            isHighlyAcknowledged: false,
            isJoined: false,
            createdBy: 'user-456',
          },
        ],
      }),
    });
  });

  // Tests for initial rendering and loading states
  test('renders welcome section and loading state initially', async () => {
    render(<Home />);
    
    // Welcome section should be visible
    expect(screen.getByText('Welcome to Where to App')).toBeInTheDocument();
    
    // Loading spinner should be visible initially
    expect(screen.getByText('Loading events...')).toBeInTheDocument();
    
    // Filter bar should be rendered
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading events...')).not.toBeInTheDocument();
    });
  });

  // Tests for API integration
  test('fetches events from API and renders them', async () => {
    render(<Home />);
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
      expect(screen.getByText('Events: 1')).toBeInTheDocument();
    });
    
    // Map view should also be rendered
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  // Tests for filter state management
  test('updates filters when filter bar changes', async () => {
    render(<Home />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    });
    
    // Find and click filter button
    const filterButton = screen.getByTestId('filter-button');
    fireEvent.click(filterButton);
    
    // API should be called again with new filters
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    
    // Kafka message should be published
    const kafkaService = KafkaService.getInstance();
    expect(kafkaService.createCalendarUpdateMessage).toHaveBeenCalled();
    expect(kafkaService.publishMessage).toHaveBeenCalledWith(
      KAFKA_TOPICS.CALENDAR_UPDATES,
      expect.anything()
    );
  });

  // Tests for event selection
  test('handles event selection', async () => {
    const { toast } = useToast();
    
    render(<Home />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });
    
    // Find and click select event button
    const selectButton = screen.getByTestId('select-event-button');
    fireEvent.click(selectButton);
    
    // Toast should be called
    expect(toast).toHaveBeenCalled();
    
    // Kafka message should be published
    const kafkaService = KafkaService.getInstance();
    expect(kafkaService.createVisualizationUpdateMessage).toHaveBeenCalled();
    expect(kafkaService.publishMessage).toHaveBeenCalledWith(
      KAFKA_TOPICS.VISUALIZATION_UPDATES,
      expect.anything()
    );
  });

  // Tests for event joining
  test('handles joining an event', async () => {
    const { toast } = useToast();
    
    // Mock the POST response for joining
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Successfully joined event',
            event: {
              id: '1',
              isJoined: true,
            },
          }),
        });
      }
      
      // Default GET response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          events: [
            {
              id: '1',
              title: 'Test Event',
              description: 'Event description',
              startTime: new Date().toISOString(),
              endTime: new Date(Date.now() + 3600000).toISOString(),
              eventTypeId: 1,
              location: {
                id: 'loc1',
                name: 'Test Location',
                address: 'Test Address',
                coordinates: { lat: 10, lng: 10 },
              },
              price: 20,
              capacity: 50,
              currentParticipants: 10,
              participants: [],
              isCreator: false,
              isHighlyAcknowledged: false,
              isJoined: false,
              createdBy: 'user-456',
            },
          ],
        }),
      });
    });
    
    render(<Home />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });
    
    // Call the joinEvent function directly through props
    // Simulating joining from Map component
    const mapView = screen.getByTestId('map-view');
    
    // Mock joinTimeSlot call
    await act(async () => {
      // This would normally be triggered by a prop
      // We're testing it directly by accessing component internals
      const homeInstance = screen.getByTestId('map-view').parentElement;
      await fireEvent(homeInstance, new CustomEvent('userJoinTimeSlot', { detail: '1' }));
    });
    
    // Verify API was called with correct parameters
    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const joinCall = fetchCalls.find(call => 
        call[0] === '/api/events' && 
        call[1].method === 'POST' &&
        JSON.parse(call[1].body).action === 'join'
      );
      
      expect(joinCall).toBeTruthy();
    });
    
    // Toast should be called
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Success!'
    }));
    
    // Kafka message should be published
    const kafkaService = KafkaService.getInstance();
    expect(kafkaService.createCalendarEventMessage).toHaveBeenCalled();
    expect(kafkaService.publishMessage).toHaveBeenCalledWith(
      KAFKA_TOPICS.CALENDAR_EVENTS,
      expect.anything()
    );
  });

  // Tests for Kafka subscriptions
  test('sets up Kafka subscriptions on mount', async () => {
    render(<Home />);
    
    // Wait for component to mount completely
    await waitFor(() => {
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });
    
    // Kafka subscription should be set up
    const kafkaService = KafkaService.getInstance();
    expect(kafkaService.subscribeToTopics).toHaveBeenCalledWith(
      [KAFKA_TOPICS.CALENDAR_EVENTS, KAFKA_TOPICS.CALENDAR_UPDATES],
      expect.any(Function)
    );
  });

  // Tests for error handling
  test('handles API errors', async () => {
    // Mock an error response
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    
    render(<Home />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  // Tests for responsive layout
  test('applies different layouts based on screen size', async () => {
    // Mock small screen
    (useMediaQuery as jest.Mock).mockImplementation((query) => {
      if (query === '(max-width: 768px)') return true;
      if (query === '(max-width: 1024px)') return true;
      return false;
    });
    
    render(<Home />);
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });
    
    // Grid should have single column layout
    const gridElement = screen.getByTestId('calendar').closest('.grid');
    expect(gridElement).toHaveClass('grid-cols-1');
    
    // Cleanup
    (useMediaQuery as jest.Mock).mockReset();
  });
});

