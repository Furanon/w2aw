'use client';

import { useEffect, useState, useCallback } from 'react';
import { getRecommendationService } from '@/lib/recommendations';
import { NetworkData as RecommendationNetworkData } from '@/lib/recommendations/visualizationTransform';
import { filterNetworkData, scaleNodesByConnections, assignNodeCoordinates, createCondensedView } from '@/lib/recommendations/visualizationTransform';
import NetworkVisualization, { NetworkData, Node } from '@/components/NetworkVisualization';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Mock user data - to be replaced with real authentication
const mockUser = {
  id: 'user-123',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  avatar: '/images/avatar-placeholder.png',
  joinedDate: 'January 2023',
  interests: ['Hiking', 'Photography', 'Local cuisine', 'Historical sites'],
  bio: 'Travel enthusiast with a passion for exploring new cultures and hidden gems around the world.',
};

// Mock activity history - to be replaced with real data from backend
const mockActivityHistory = [
  {
    id: 'act-1',
    type: 'view',
    activityName: 'Mountain Hiking Tour',
    date: '2023-10-15T14:30:00Z',
    location: 'Swiss Alps',
  },
  {
    id: 'act-2',
    type: 'booking',
    activityName: 'Cultural Food Tour',
    date: '2023-10-10T09:00:00Z',
    location: 'Barcelona, Spain',
  },
  {
    id: 'act-3',
    type: 'review',
    activityName: 'Historical Walking Tour',
    date: '2023-09-28T13:15:00Z',
    location: 'Rome, Italy',
  },
  {
    id: 'act-4',
    type: 'view',
    activityName: 'Beach Resort Stay',
    date: '2023-09-20T10:45:00Z',
    location: 'Bali, Indonesia',
  },
];

export default function ProfilePage() {
  const [recommendations, setRecommendations] = useState([]);
  const [visualizationData, setVisualizationData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | undefined>(undefined);
  const [filterOptions, setFilterOptions] = useState({
    showCategories: true,
    showActivities: true,
    minStrength: 0
  });

  // Transform recommendation data to visualization data format
  const transformVisualizationData = useCallback((data: RecommendationNetworkData): NetworkData => {
    // Convert nodes from recommendation format to visualization format
    const nodes: Node[] = data.nodes.map(node => ({
      id: node.id,
      name: node.label,
      type: node.type === 'location' ? 'interest' : node.type,
      size: node.value / 2,
      color: node.color,
      position: node.x !== undefined && node.y !== undefined && node.z !== undefined 
        ? [node.x, node.y, node.z] 
        : undefined
    }));

    // Convert links to connections
    const connections = data.links.map(link => ({
      source: link.source,
      target: link.target,
      strength: link.value / 3,
      color: link.color
    }));

    return { nodes, connections };
  }, []);

  // Handle node click in visualization
  const handleNodeClick = useCallback((node: Node) => {
    setHighlightedNodeId(node.id === highlightedNodeId ? undefined : node.id);
    
    // Find connected recommendations if an activity node is clicked
    if (node.type === 'activity') {
      const relatedRecs = recommendations.filter((rec: any) => rec.id === node.id);
      if (relatedRecs.length > 0) {
        toast.success(`${node.name}: Recommended based on your interests!`);
      }
    }
  }, [highlightedNodeId, recommendations]);

  // Apply filters to visualization data
  const applyFilters = useCallback(() => {
    if (!visualizationData) return;
    
    // Create filter options for the visualization
    const nodeTypes = [
      ...(filterOptions.showActivities ? ['activity' as const] : []),
      'user' as const,
      ...(filterOptions.showCategories ? ['category' as const, 'interest' as const] : [])
    ];
    
    try {
      // Get the base data from the service
      const rawData = getRecommendationService().getRawVisualizationData();
      if (!rawData) return;
      
      // Apply filters and transformations
      let filteredData = filterNetworkData(rawData, {
        nodeTypes,
        userId: mockUser.id,
        minInteractionStrength: filterOptions.minStrength
      });
      
      // Scale nodes by their connections
      filteredData = scaleNodesByConnections(filteredData);
      
      // Create a condensed view if there are too many nodes
      filteredData = createCondensedView(filteredData, 50);
      
      // Assign 3D coordinates
      filteredData = assignNodeCoordinates(filteredData);
      
      // Transform to the format expected by the visualization component
      const transformedData = transformVisualizationData(filteredData);
      setVisualizationData(transformedData);
    } catch (err) {
      console.error('Error applying filters:', err);
      setError('Failed to filter visualization data');
    }
  }, [filterOptions, transformVisualizationData]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real implementation, this would get the currently logged-in user's ID
        const userId = mockUser.id;
        
        // Get recommendations from the recommendation service
        const recs = await getRecommendationService().getRecommendationsForUser(userId);
        setRecommendations(recs);
        
        // Initialize the recommendation service if needed
        if (!getRecommendationService().isInitialized()) {
          await getRecommendationService().initialize();
        }
        
        // Get visualization data for neural network
        const rawVisData = await getRecommendationService().getVisualizationData(userId);
        
        if (rawVisData) {
          // Apply coordinates and transform to the visualization format
          const processedData = assignNodeCoordinates(rawVisData);
          const transformedData = transformVisualizationData(processedData);
          setVisualizationData(transformedData);
        } else {
          setError('No visualization data available');
        }
      } catch (error) {
        console.error('Error loading recommendation data:', error);
        setError('Failed to load recommendation data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [transformVisualizationData]);

  // Update visualization when filters change
  useEffect(() => {
    if (!isLoading) {
      applyFilters();
    }
  }, [filterOptions, isLoading, applyFilters]);

  // Helper function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: User profile */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 mb-4">
                <Image 
                  src={mockUser.avatar} 
                  alt={`${mockUser.name}'s profile`}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <h1 className="text-2xl font-bold">{mockUser.name}</h1>
              <p className="text-gray-600 mb-2">{mockUser.email}</p>
              <p className="text-sm text-gray-500">Member since {mockUser.joinedDate}</p>
              
              <div className="w-full mt-6">
                <h2 className="text-lg font-semibold mb-2">About</h2>
                <p className="text-gray-700">{mockUser.bio}</p>
              </div>
              
              <div className="w-full mt-6">
                <h2 className="text-lg font-semibold mb-2">Interests</h2>
                <div className="flex flex-wrap gap-2">
                  {mockUser.interests.map(interest => (
                    <span 
                      key={interest} 
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="w-full mt-6">
                <Link 
                  href="/settings" 
                  className="w-full block text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition duration-300"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column: Activity, Recommendations, Visualization */}
        <div className="md:col-span-2">
          {/* Neural Network Visualization */}
          {/* Neural Network Visualization */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Your Personalized Interest Network</h2>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setFilterOptions(prev => ({
                    ...prev, 
                    showCategories: !prev.showCategories
                  }))}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterOptions.showCategories 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Categories
                </button>
                <button 
                  onClick={() => setFilterOptions(prev => ({
                    ...prev, 
                    showActivities: !prev.showActivities
                  }))}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filterOptions.showActivities 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Activities
                </button>
              </div>
            </div>
            
            <div className="w-full h-96 rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-2"></div>
                    <p className="text-gray-500">Loading your interest network...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="w-full h-full bg-red-50 flex items-center justify-center">
                  <div className="text-center p-6">
                    <p className="text-red-500 mb-2">Error loading visualization</p>
                    <p className="text-gray-600 text-sm">{error}</p>
                    <button 
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : visualizationData ? (
                <NetworkVisualization 
                  data={visualizationData} 
                  height="100%" 
                  width="100%" 
                  backgroundColor="#111827"
                  onNodeClick={handleNodeClick}
                  highlightedNodeId={highlightedNodeId}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <p className="text-gray-500">
                    No visualization data available. Try refreshing the page.
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-700">Connection Strength</label>
                <span className="text-xs text-gray-500">{filterOptions.minStrength}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="3" 
                step="0.5"
                value={filterOptions.minStrength}
                onChange={(e) => setFilterOptions(prev => ({
                  ...prev,
                  minStrength: parseFloat(e.target.value)
                }))}
                className="w-full"
              />
            </div>
            
            <div className="mt-4 flex gap-3 flex-wrap">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-[#4CAF50] mr-1"></span>
                <span className="text-xs text-gray-600">You</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-[#2196F3] mr-1"></span>
                <span className="text-xs text-gray-600">Activities</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-[#FF9800] mr-1"></span>
                <span className="text-xs text-gray-600">Categories</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-[#E91E63] mr-1"></span>
                <span className="text-xs text-gray-600">Interests</span>
              </div>
            </div>
            
            <p className="text-gray-600 mt-3 text-sm">
              This visualization shows how your interests and past activities are connected to new recommendations.
              <strong> Click on a node</strong> to highlight its connections or <strong>drag to rotate</strong> the network.
            </p>
          </div>
          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Recommended For You</h2>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <p className="text-gray-500">Loading recommendations...</p>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden hover:shadow-md transition duration-300">
                    <div className="relative h-32 bg-gray-200">
                      {rec.imageUrl && (
                        <Image
                          src={rec.imageUrl}
                          alt={rec.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold">{rec.title}</h3>
                      <p className="text-sm text-gray-600">{rec.location}</p>
                      <div className="flex items-center mt-2">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm ml-1">{rec.rating} · {rec.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-6">
                We're personalizing recommendations based on your activity. Check back soon!
              </p>
            )}
          </div>
          
          {/* User Activity History */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Activity History</h2>
            
            <div className="divide-y">
              {mockActivityHistory.map(activity => (
                <div key={activity.id} className="py-4">
                  <div className="flex items-start">
                    <div className={`
                      rounded-full w-10 h-10 flex items-center justify-center mr-3
                      ${activity.type === 'view' ? 'bg-blue-100 text-blue-600' : 
                        activity.type === 'booking' ? 'bg-green-100 text-green-600' : 
                        'bg-purple-100 text-purple-600'}
                    `}>
                      {activity.type === 'view' ? '👁' : 
                       activity.type === 'booking' ? '✓' : 
                       '★'}
                    </div>
                    <div>
                      <p className="font-medium">
                        {activity.type === 'view' ? 'Viewed ' : 
                         activity.type === 'booking' ? 'Booked ' : 
                         'Reviewed '} 
                        <span className="font-semibold">{activity.activityName}</span>
                      </p>
                      <div className="flex text-sm text-gray-500 mt-1">
                        <span>{formatDate(activity.date)}</span>
                        <span className="mx-2">•</span>
                        <span>{activity.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

