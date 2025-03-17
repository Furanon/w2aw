import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { transformVisualizationData, filterNetworkData } from '@/lib/recommendations/visualizationTransform';
import NetworkVisualization from '@/components/NetworkVisualization';
import { RecommendationService } from '@/lib/recommendations/recommendationService';
import { User, Activity, UserInteraction } from '@/lib/recommendations/mockData';
import { MockVisualNetwork } from './__mocks__/mockVisualNetwork';

// Mock the Three.js and react-three components
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="three-canvas">{children}</div>,
  useFrame: jest.fn((callback) => callback()),
  useThree: jest.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 10 } },
    scene: {},
    gl: { domElement: document.createElement('canvas') }
  }))
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Text: ({ children }: { children: React.ReactNode }) => <div data-testid="drei-text">{children}</div>
}));

// Mock tsParticles
jest.mock('tsparticles', () => ({
  Container: class {
    start = jest.fn();
    stop = jest.fn();
    destroy = jest.fn();
  }
}));

// Sample test data
const mockUsers: User[] = [
  { id: 'user1', preferences: ['hiking', 'food', 'culture'], location: { latitude: 40.7128, longitude: -74.0060 } },
  { id: 'user2', preferences: ['beach', 'adventure', 'nature'], location: { latitude: 34.0522, longitude: -118.2437 } }
];

const mockActivities: Activity[] = [
  { 
    id: 'activity1', 
    category: ['outdoor', 'adventure'], 
    location: { latitude: 40.7, longitude: -74.1 }, 
    popularity: 0.85, 
    seasonality: ['summer', 'spring'], 
    priceRange: 2 
  },
  { 
    id: 'activity2', 
    category: ['culture', 'food'], 
    location: { latitude: 40.72, longitude: -74.05 }, 
    popularity: 0.75, 
    seasonality: ['all'], 
    priceRange: 3 
  }
];

const mockInteractions: UserInteraction[] = [
  { 
    userId: 'user1', 
    activityId: 'activity1', 
    interactionType: 'like', 
    timestamp: new Date('2023-01-01'), 
    locationData: { latitude: 40.7, longitude: -74.1 } 
  },
  { 
    userId: 'user1', 
    activityId: 'activity2', 
    interactionType: 'view', 
    timestamp: new Date('2023-01-02'), 
    locationData: { latitude: 40.72, longitude: -74.05 } 
  }
];

// Mock the recommendation service
jest.mock('@/lib/recommendations/recommendationService', () => {
  return {
    RecommendationService: jest.fn().mockImplementation(() => {
      return {
        getVisualizationData: jest.fn().mockResolvedValue({
          nodes: [
            { id: 'user1', type: 'user', label: 'User 1' },
            { id: 'activity1', type: 'activity', label: 'Activity 1' },
            { id: 'category1', type: 'category', label: 'Category 1' }
          ],
          links: [
            { source: 'user1', target: 'activity1', strength: 0.8 },
            { source: 'activity1', target: 'category1', strength: 0.9 }
          ]
        }),
        getRecommendationsForUser: jest.fn().mockResolvedValue([
          { id: 'activity1', score: 0.95 },
          { id: 'activity2', score: 0.82 }
        ])
      };
    })
  };
});

describe('Visualization Data Transformation', () => {
  test('transforms recommendation data into visualization format', () => {
    const rawData = {
      users: mockUsers,
      activities: mockActivities,
      interactions: mockInteractions
    };
    
    const result = transformVisualizationData(rawData, 'user1');
    
    expect(result).toHaveProperty('nodes');
    expect(result).toHaveProperty('links');
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.links.length).toBeGreaterThan(0);
    
    // Verify the user node exists
    const userNode = result.nodes.find(node => node.id === 'user1');
    expect(userNode).toBeDefined();
    expect(userNode?.type).toBe('user');
  });
  
  test('handles empty data correctly', () => {
    const emptyData = { users: [], activities: [], interactions: [] };
    
    const result = transformVisualizationData(emptyData, 'user1');
    
    expect(result.nodes.length).toBe(1); // Only the user node
    expect(result.links.length).toBe(0);
  });
  
  test('assigns correct node types and colors', () => {
    const rawData = {
      users: mockUsers,
      activities: mockActivities,
      interactions: mockInteractions
    };
    
    const result = transformVisualizationData(rawData, 'user1');
    
    // Check user nodes
    const userNodes = result.nodes.filter(node => node.type === 'user');
    userNodes.forEach(node => {
      expect(node).toHaveProperty('color');
      expect(node).toHaveProperty('size');
    });
    
    // Check activity nodes
    const activityNodes = result.nodes.filter(node => node.type === 'activity');
    activityNodes.forEach(node => {
      expect(node).toHaveProperty('color');
      expect(node).toHaveProperty('size');
    });
    
    // Check category nodes
    const categoryNodes = result.nodes.filter(node => node.type === 'category');
    categoryNodes.forEach(node => {
      expect(node).toHaveProperty('color');
      expect(node).toHaveProperty('size');
    });
  });
});

describe('Network Visualization Component', () => {
  beforeEach(() => {
    // Mock getBoundingClientRect to ensure the canvas renders
    Element.prototype.getBoundingClientRect = jest.fn(() => {
      return {
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => {}
      };
    });
  });
  
  test('renders the network visualization', async () => {
    const mockData = {
      nodes: [
        { id: 'user1', type: 'user', label: 'User 1', color: '#00ff00', size: 5 },
        { id: 'activity1', type: 'activity', label: 'Activity 1', color: '#0000ff', size: 3 }
      ],
      links: [
        { source: 'user1', target: 'activity1', strength: 0.8 }
      ]
    };
    
    await act(async () => {
      render(<NetworkVisualization data={mockData} onNodeClick={jest.fn()} />);
    });
    
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
  });
  
  test('handles empty data gracefully', async () => {
    const emptyData = {
      nodes: [],
      links: []
    };
    
    await act(async () => {
      render(<NetworkVisualization data={emptyData} onNodeClick={jest.fn()} />);
    });
    
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
  });
  
  test('renders loading state when data is not available', async () => {
    await act(async () => {
      render(<NetworkVisualization data={null} onNodeClick={jest.fn()} isLoading={true} />);
    });
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});

describe('Interaction Handlers', () => {
  test('node click handler is called correctly', async () => {
    const mockData = {
      nodes: [
        { id: 'user1', type: 'user', label: 'User 1', color: '#00ff00', size: 5 },
        { id: 'activity1', type: 'activity', label: 'Activity 1', color: '#0000ff', size: 3 }
      ],
      links: [
        { source: 'user1', target: 'activity1', strength: 0.8 }
      ]
    };
    
    const handleNodeClick = jest.fn();
    
    // Create a mock visual network for testing click handlers
    const mockNetwork = new MockVisualNetwork();
    
    await act(async () => {
      render(
        <div data-testid="network-container">
          <NetworkVisualization 
            data={mockData} 
            onNodeClick={handleNodeClick} 
            _testNetwork={mockNetwork}
          />
        </div>
      );
    });
    
    // Simulate a node click through the mock
    mockNetwork.simulateNodeClick({ id: 'activity1', type: 'activity' });
    
    expect(handleNodeClick).toHaveBeenCalledWith(expect.objectContaining({
      id: 'activity1',
      type: 'activity'
    }));
  });
  
  test('handles zoom interactions correctly', async () => {
    const mockData = {
      nodes: [
        { id: 'user1', type: 'user', label: 'User 1', color: '#00ff00', size: 5 }
      ],
      links: []
    };
    
    // Mock zoom functions
    const mockZoomIn = jest.fn();
    const mockZoomOut = jest.fn();
    
    await act(async () => {
      render(
        <div data-testid="network-container">
          <NetworkVisualization 
            data={mockData} 
            onNodeClick={jest.fn()} 
            _testZoomIn={mockZoomIn}
            _testZoomOut={mockZoomOut}
          />
        </div>
      );
    });
    
    // Find zoom controls and trigger click events
    const zoomInButton = screen.getByLabelText('Zoom in');
    const zoomOutButton = screen.getByLabelText('Zoom out');
    
    fireEvent.click(zoomInButton);
    expect(mockZoomIn).toHaveBeenCalled();
    
    fireEvent.click(zoomOutButton);
    expect(mockZoomOut).toHaveBeenCalled();
  });
});

describe('Filter Operations', () => {
  test('filters visualization data by category', () => {
    const visualData = {
      nodes: [
        { id: 'user1', type: 'user', label: 'User 1' },
        { id: 'activity1', type: 'activity', label: 'Activity 1', category: 'outdoor' },
        { id: 'activity2', type: 'activity', label: 'Activity 2', category: 'culture' },
        { id: 'category1', type: 'category', label: 'Outdoor' },
        { id: 'category2', type: 'category', label: 'Culture' }
      ],
      links: [
        { source: 'user1', target: 'activity1', strength: 0.8 },
        { source: 'user1', target: 'activity2', strength: 0.6 },
        { source: 'activity1', target: 'category1', strength: 0.9 },
        { source: 'activity2', target: 'category2', strength: 0.7 }
      ]
    };
    
    const filters = {
      categories: ['outdoor'],
      minStrength: 0.5
    };
    
    const filteredData = filterNetworkData(visualData, filters);
    
    // Should keep user1, activity1 and category1, but filter out activity2 and category2
    expect(filteredData.nodes.length).toBe(3);
    expect(filteredData.links.length).toBe(2);
    
    // Verify the right nodes are kept
    expect(filteredData.nodes.find(node => node.id === 'activity1')).toBeDefined();
    expect(filteredData.nodes.find(node => node.id === 'activity2')).toBeUndefined();
  });
  
  test('filters visualization data by connection strength', () => {
    const visualData = {
      nodes: [
        { id: 'user1', type: 'user', label: 'User 1' },
        { id: 'activity1', type: 'activity', label: 'Activity 1' },
        { id: 'activity2', type: 'activity', label: 'Activity 2' },
      ],
      links: [
        { source: 'user1', target: 'activity1', strength: 0.8 },
        { source: 'user1', target: 'activity2', strength: 0.3 }
      ]
    };
    
    const filters = {
      categories: [],
      minStrength: 0.7
    };
    
    const filteredData = filterNetworkData(visualData, filters);
    
    // Should keep user1 and activity1, but filter out activity2 due to weak connection
    expect(filteredData.nodes.length).toBe(2);
    expect(filteredData.links.length).toBe(1);
    expect(filteredData.nodes.find(node => node.id === 'activity1')).toBeDefined();
    expect(filteredData.nodes.find(node => node.id === 'activity2')).toBeUndefined();
  });
  
  test('handles empty filters correctly', () => {
    const visualData = {
      nodes: [
        { id: 'user1', type: 'user', label: 'User 1' },
        { id: 'activity1', type: 'activity', label: 'Activity 1', category: 'outdoor' }
      ],
      links: [
        { source: 'user1', target: 'activity1', strength: 0.8 }
      ]
    };
    
    const filters = {
      categories: [],
      minStrength: 0
    };
    
    const filteredData = filterNetworkData(visualData, filters);
    
    // Should keep all nodes and links with empty filters
    expect(filteredData.nodes.length).toBe(visualData.nodes.length);
    expect(filteredData.links.length).toBe(visualData.links.length);
