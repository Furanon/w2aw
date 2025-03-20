import { type User, type Activity, type UserInteraction } from './mockData';
import { getRecommendationService } from './index';

// Define types for visualization data
export interface NetworkNode {
  id: string;
  type: 'user' | 'activity' | 'category' | 'location';
  label: string;
  value: number; // Size of the node
  group?: string; // For category grouping
  color?: string;
  x?: number;
  y?: number;
  z?: number;
  userData?: Record<string, any>; // Additional data for rendering
}

export interface NetworkLink {
  source: string;
  target: string;
  value: number; // Strength of connection / width of line
  color?: string;
  type?: 'view' | 'like' | 'book' | 'recommendation' | 'category' | 'location';
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

/**
 * Color palette for different node types and groups
 */
export const COLORS = {
  user: '#1f77b4',
  activity: '#ff7f0e', 
  category: {
    outdoor: '#2ca02c',
    indoor: '#d62728',
    food: '#9467bd',
    cultural: '#8c564b',
    sports: '#e377c2',
    entertainment: '#7f7f7f',
    default: '#bcbd22'
  },
  location: '#17becf',
  interaction: {
    view: 'rgba(70, 130, 180, 0.5)',
    like: 'rgba(255, 69, 0, 0.7)',
    book: 'rgba(50, 205, 50, 0.9)'
  },
  recommendation: 'rgba(186, 85, 211, 0.8)'
};

/**
 * Transforms user, activities, and interactions into visualization network data
 */
export function transformToNetworkData(
  users: User[],
  activities: Activity[],
  interactions: UserInteraction[]
): NetworkData {
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const categories = new Set<string>();
  const locations = new Set<string>();
  
  // Add unique categories and locations as nodes
  activities.forEach(activity => {
    activity.category.forEach(cat => categories.add(cat));
    locations.add(`${activity.location.latitude.toFixed(2)},${activity.location.longitude.toFixed(2)}`);
  });

  // Add user nodes
  users.forEach(user => {
    nodes.push({
      id: user.id,
      type: 'user',
      label: user.name,
      value: 5, // Base size for users
      color: COLORS.user
    });
  });

  // Add activity nodes
  activities.forEach(activity => {
    nodes.push({
      id: activity.id,
      type: 'activity',
      label: activity.name || `Activity ${activity.id}`,
      value: 3 + activity.popularity, // Size based on popularity
      color: COLORS.activity,
      group: activity.category[0], // Primary category
      userData: { 
        price: activity.priceRange,
        categories: activity.category,
        seasonality: activity.seasonality,
        location: activity.location
      }
    });
    
    // Connect activities to their categories
    activity.category.forEach(category => {
      links.push({
        source: activity.id,
        target: category,
        value: 1,
        type: 'category',
        color: COLORS.category[category as keyof typeof COLORS.category] || COLORS.category.default
      });
    });
    
    // Connect activities to their location
    const locationId = `${activity.location.latitude.toFixed(2)},${activity.location.longitude.toFixed(2)}`;
    links.push({
      source: activity.id,
      target: locationId,
      value: 1,
      type: 'location',
      color: COLORS.location
    });
  });
  
  // Add category nodes
  Array.from(categories).forEach(category => {
    nodes.push({
      id: category,
      type: 'category',
      label: category,
      value: 4, // Base size for categories
      color: COLORS.category[category as keyof typeof COLORS.category] || COLORS.category.default,
      group: 'category'
    });
  });
  
  // Add location nodes
  Array.from(locations).forEach(location => {
    const [lat, lng] = location.split(',').map(parseFloat);
    nodes.push({
      id: location,
      type: 'location',
      label: `Location (${lat}, ${lng})`,
      value: 2, // Base size for locations
      color: COLORS.location,
      group: 'location',
      userData: { latitude: lat, longitude: lng }
    });
  });

  // Add interaction links
  interactions.forEach(interaction => {
    links.push({
      source: interaction.userId,
      target: interaction.activityId,
      value: getInteractionStrength(interaction.interactionType),
      type: interaction.interactionType,
      color: COLORS.interaction[interaction.interactionType]
    });
  });

  return { nodes, links };
}

/**
 * Generate 3D coordinates for nodes using a force-directed algorithm simulation result
 */
export function assignNodeCoordinates(data: NetworkData): NetworkData {
  // This is a simplified version - in a real implementation, you might use a physics simulation
  // or more complex algorithm to position nodes in 3D space

  const updatedNodes = data.nodes.map((node, index) => {
    // Basic positioning logic - in a real application, you would use a physics-based layout
    const angle = (index / data.nodes.length) * Math.PI * 2;
    const radius = 20 + Math.random() * 10;
    
    return {
      ...node,
      x: Math.cos(angle) * radius,
      y: node.type === 'user' ? 10 : node.type === 'activity' ? 0 : -10, // Layer by type
      z: Math.sin(angle) * radius
    };
  });

  return {
    nodes: updatedNodes,
    links: data.links
  };
}

/**
 * Calculate interaction strength based on type
 */
function getInteractionStrength(type: 'view' | 'like' | 'book'): number {
  switch (type) {
    case 'view':
      return 1;
    case 'like':
      return 2;
    case 'book':
      return 3;
    default:
      return 1;
  }
}

/**
 * Generate recommendation links for a user
 */
export async function addRecommendationLinks(data: NetworkData, userId: string): NetworkData {
  const recommendationService = getRecommendationService();
  const recommendations = await recommendationService.getRecommendationsForUser(userId, 10);
  
  const newLinks: NetworkLink[] = recommendations.map(rec => ({
    source: userId,
    target: rec.activityId,
    value: rec.score, // Recommendation strength
    type: 'recommendation',
    color: COLORS.recommendation
  }));
  
  return {
    nodes: data.nodes,
    links: [...data.links, ...newLinks]
  };
}

/**
 * Filter network data based on different criteria
 */
export function filterNetworkData(
  data: NetworkData, 
  options: {
    nodeTypes?: ('user' | 'activity' | 'category' | 'location')[];
    categories?: string[];
    minInteractionStrength?: number;
    userId?: string;
    locationRadius?: {center: {lat: number, lng: number}, radiusKm: number};
  }
): NetworkData {
  let filteredNodes = [...data.nodes];
  let filteredLinks = [...data.links];
  
  // Filter by node type
  if (options.nodeTypes && options.nodeTypes.length > 0) {
    filteredNodes = filteredNodes.filter(node => options.nodeTypes?.includes(node.type as any));
  }
  
  // Filter by category
  if (options.categories && options.categories.length > 0) {
    const categoryNodes = filteredNodes.filter(node => 
      node.type === 'category' && options.categories?.includes(node.id)
    );
    
    const categoryNodeIds = new Set(categoryNodes.map(node => node.id));
    
    // Keep activities connected to these categories
    const relatedActivityIds = new Set<string>();
    filteredLinks.forEach(link => {
      if (link.type === 'category' && categoryNodeIds.has(link.target)) {
        relatedActivityIds.add(link.source);
      }
    });
    
    // Keep these activities and their connections
    filteredNodes = filteredNodes.filter(node => 
      (node.type === 'category' && categoryNodeIds.has(node.id)) ||
      (node.type === 'activity' && relatedActivityIds.has(node.id)) ||
      node.type === 'user' || 
      node.type === 'location'
    );
  }
  
  // Filter by interaction strength
  if (options.minInteractionStrength) {
    filteredLinks = filteredLinks.filter(link => 
      link.value >= (options.minInteractionStrength || 0)
    );
  }
  
  // Filter by user
  if (options.userId) {
    const userLinks = filteredLinks.filter(link => 
      link.source === options.userId || link.target === options.userId
    );
    
    const connectedNodes = new Set<string>();
    userLinks.forEach(link => {
      connectedNodes.add(link.source);
      connectedNodes.add(link.target);
    });
    
    filteredNodes = filteredNodes.filter(node => 
      connectedNodes.has(node.id) || node.id === options.userId
    );
    
    filteredLinks = userLinks;
  }
  
  // Filter by location radius
  if (options.locationRadius) {
    const { center, radiusKm } = options.locationRadius;
    
    // Get location nodes within radius
    const locationNodesInRadius = filteredNodes.filter(node => {
      if (node.type !== 'location' || !node.userData) return false;
      
      const distance = calculateDistance(
        center.lat, 
        center.lng, 
        node.userData.latitude, 
        node.userData.longitude
      );
      
      return distance <= radiusKm;
    });
    
    const locationIdsInRadius = new Set(locationNodesInRadius.map(node => node.id));
    
    // Find activities connected to these locations
    const activityIdsInRadius = new Set<string>();
    filteredLinks.forEach(link => {
      if (link.type === 'location' && locationIdsInRadius.has(link.target)) {
        activityIdsInRadius.add(link.source);
      }
    });
    
    // Keep these activities and their connections
    filteredNodes = filteredNodes.filter(node => 
      (node.type === 'location' && locationIdsInRadius.has(node.id)) ||
      (node.type === 'activity' && activityIdsInRadius.has(node.id)) ||
      node.type === 'user' || 
      node.type === 'category'
    );
  }
  
  // Only keep links between nodes that still exist
  const remainingNodeIds = new Set(filteredNodes.map(node => node.id));
  filteredLinks = filteredLinks.filter(link => 
    remainingNodeIds.has(link.source) && remainingNodeIds.has(link.target)
  );
  
  return { nodes: filteredNodes, links: filteredLinks };
}

/**
 * Calculate distance between two geographic coordinates in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

/**
 * Scale nodes based on their connections - more connected nodes become larger
 */
export function scaleNodesByConnections(data: NetworkData): NetworkData {
  // Count connections per node
  const connectionCounts: Record<string, number> = {};
  
  data.links.forEach(link => {
    connectionCounts[link.source] = (connectionCounts[link.source] || 0) + 1;
    connectionCounts[link.target] = (connectionCounts[link.target] || 0) + 1;
  });
  
  // Scale node sizes based on connections
  const scaledNodes = data.nodes.map(node => {
    const connectionCount = connectionCounts[node.id] || 0;
    const scaleFactor = 1 + Math.log(1 + connectionCount) * 0.5;
    return {
      ...node,
      value: node.value * scaleFactor
    };
  });
  
  return {
    nodes: scaledNodes,
    links: data.links
  };
}

/**
 * Create a condensed view of the network focusing on the most important connections
 */
export function createCondensedView(data: NetworkData, maxNodes: number = 50): NetworkData {
  if (data.nodes.length <= maxNodes) {
    return data;
  }
  
  // Sort nodes by importance (using value and connection count)
  const connectionCounts: Record<string, number> = {};
  data.links.forEach(link => {
    connectionCounts[link.source] = (connectionCounts[link.source] || 0) + 1;
    connectionCounts[link.target] = (connectionCounts[link.target] || 0) + 1;
  });
  
  const scoredNodes = data.nodes.map(node => ({
    ...node,
    importance: (node.value || 1) * (1 + Math.log(1 + (connectionCounts[node.id] || 0)))
  }));
  
  // Sort by importance
  scoredNodes.sort((a, b) => (b.importance || 0) - (a.importance || 0));
  
  // Take top N nodes
  const topNodes = scoredNodes.slice(0, maxNodes);
  const topNodeIds = new Set(topNodes.map(node => node.id));
  
  // Only keep links between these nodes
  const topLinks = data.links.filter(link => 
    topNodeIds.has(link.source) && topNodeIds.has(link.target)
  );
  
  return {
    nodes: topNodes,
    links: topLinks
  };
}

/**
 * Update node positions based on user interactions (e.g., dragging nodes)
 */
export function updateNodePositions(data: NetworkData, updates: Array

