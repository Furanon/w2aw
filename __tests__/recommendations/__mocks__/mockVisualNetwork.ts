import { EventEmitter } from 'events';

// Types for the mock network
export interface MockNode {
  id: string;
  type: 'user' | 'activity' | 'category' | 'interest';
  position: { x: number; y: number; z: number };
  data: Record<string, any>;
  size?: number;
  color?: string;
}

export interface MockEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  color?: string;
}

export interface MockNetworkData {
  nodes: MockNode[];
  edges: MockEdge[];
}

export interface ClickEvent {
  node: MockNode;
  position: { x: number; y: number; z: number };
  timestamp: number;
}

export interface HoverEvent {
  node: MockNode | null;
  position: { x: number; y: number; z: number };
  timestamp: number;
}

/**
 * MockVisualNetwork - A mock implementation of the 3D network visualization
 * for testing purposes. Simulates interactions with network nodes and edges
 * without actually rendering anything.
 */
export class MockVisualNetwork extends EventEmitter {
  private nodes: Map<string, MockNode> = new Map();
  private edges: Map<string, MockEdge> = new Map();
  private selectedNode: MockNode | null = null;
  private hoveredNode: MockNode | null = null;
  private clickEvents: ClickEvent[] = [];
  private hoverEvents: HoverEvent[] = [];
  private initialized: boolean = false;
  private visibility: boolean = true;

  /**
   * Create a new mock visual network
   */
  constructor(initialData?: MockNetworkData) {
    super();
    if (initialData) {
      this.setData(initialData);
    }
  }

  /**
   * Initialize the network with data
   */
  initialize(): void {
    this.initialized = true;
    this.emit('initialized', { timestamp: Date.now() });
  }

  /**
   * Set the network data
   */
  setData(data: MockNetworkData): void {
    this.clear();
    
    // Add nodes
    data.nodes.forEach(node => {
      this.nodes.set(node.id, { ...node });
    });
    
    // Add edges
    data.edges.forEach(edge => {
      this.edges.set(edge.id, { ...edge });
    });
    
    this.emit('dataUpdated', {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      timestamp: Date.now()
    });
  }

  /**
   * Get the current network data
   */
  getData(): MockNetworkData {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.selectedNode = null;
    this.hoveredNode = null;
    this.clickEvents = [];
    this.hoverEvents = [];
    this.emit('cleared', { timestamp: Date.now() });
  }

  /**
   * Simulate clicking on a node
   */
  simulateNodeClick(nodeId: string): ClickEvent | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    this.selectedNode = node;
    const clickEvent: ClickEvent = {
      node,
      position: { ...node.position },
      timestamp: Date.now()
    };
    
    this.clickEvents.push(clickEvent);
    this.emit('nodeClick', clickEvent);
    return clickEvent;
  }

  /**
   * Simulate hovering on a node
   */
  simulateNodeHover(nodeId: string | null): HoverEvent {
    const node = nodeId ? this.nodes.get(nodeId) || null : null;
    this.hoveredNode = node;

    const position = node 
      ? { ...node.position }
      : { x: 0, y: 0, z: 0 };
    
    const hoverEvent: HoverEvent = {
      node,
      position,
      timestamp: Date.now()
    };
    
    this.hoverEvents.push(hoverEvent);
    this.emit('nodeHover', hoverEvent);
    return hoverEvent;
  }

  /**
   * Simulate zooming in on the network
   */
  simulateZoom(zoomLevel: number): void {
    this.emit('zoom', {
      level: zoomLevel,
      timestamp: Date.now()
    });
  }

  /**
   * Simulate rotating the network
   */
  simulateRotation(x: number, y: number, z: number): void {
    this.emit('rotation', {
      rotation: { x, y, z },
      timestamp: Date.now()
    });
  }

  /**
   * Add a new node to the network
   */
  addNode(node: MockNode): void {
    this.nodes.set(node.id, { ...node });
    this.emit('nodeAdded', {
      node,
      timestamp: Date.now()
    });
  }

  /**
   * Remove a node from the network
   */
  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    // Also remove connected edges
    for (const [edgeId, edge] of this.edges.entries()) {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edges.delete(edgeId);
      }
    }
    
    const result = this.nodes.delete(nodeId);
    this.emit('nodeRemoved', {
      nodeId,
      timestamp: Date.now()
    });
    
    return result;
  }

  /**
   * Add a new edge to the network
   */
  addEdge(edge: MockEdge): void {
    this.edges.set(edge.id, { ...edge });
    this.emit('edgeAdded', {
      edge,
      timestamp: Date.now()
    });
  }

  /**
   * Remove an edge from the network
   */
  removeEdge(edgeId: string): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;
    
    const result = this.edges.delete(edgeId);
    this.emit('edgeRemoved', {
      edgeId,
      timestamp: Date.now()
    });
    
    return result;
  }

  /**
   * Filter nodes by type
   */
  filterNodesByType(types: ('user' | 'activity' | 'category' | 'interest')[]): MockNode[] {
    return Array.from(this.nodes.values()).filter(node => types.includes(node.type));
  }

  /**
   * Update node properties
   */
  updateNode(nodeId: string, properties: Partial<MockNode>): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    this.nodes.set(nodeId, { ...node, ...properties });
    this.emit('nodeUpdated', {
      nodeId,
      properties,
      timestamp: Date.now()
    });
    
    return true;
  }

  /**
   * Update edge properties
   */
  updateEdge(edgeId: string, properties: Partial<MockEdge>): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;
    
    this.edges.set(edgeId, { ...edge, ...properties });
    this.emit('edgeUpdated', {
      edgeId,
      properties,
      timestamp: Date.now()
    });
    
    return true;
  }

  /**
   * Get the currently selected node
   */
  getSelectedNode(): MockNode | null {
    return this.selectedNode;
  }

  /**
   * Get the currently hovered node
   */
  getHoveredNode(): MockNode | null {
    return this.hoveredNode;
  }

  /**
   * Get all click events
   */
  getClickEvents(): ClickEvent[] {
    return [...this.clickEvents];
  }

  /**
   * Get all hover events
   */
  getHoverEvents(): HoverEvent[] {
    return [...this.hoverEvents];
  }

  /**
   * Set network visibility
   */
  setVisibility(visible: boolean): void {
    this.visibility = visible;
    this.emit('visibilityChanged', {
      visible,
      timestamp: Date.now()
    });
  }

  /**
   * Is the network visible
   */
  isVisible(): boolean {
    return this.visibility;
  }

  /**
   * Is the network initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Find nodes connected to a specific node
   */
  findConnectedNodes(nodeId: string): MockNode[] {
    const connectedIds = new Set<string>();
    
    // Find edges connected to this node
    for (const edge of this.edges.values()) {
      if (edge.source === nodeId) {
        connectedIds.add(edge.target);
      } else if (edge.target === nodeId) {
        connectedIds.add(edge.source);
      }
    }
    
    // Return corresponding nodes
    return Array.from(connectedIds)
      .map(id => this.nodes.get(id))
      .filter((node): node is MockNode => node !== undefined);
  }

  /**
   * Find edges connecting two nodes
   */
  findConnectingEdges(nodeId1: string, nodeId2: string): MockEdge[] {
    return Array.from(this.edges.values()).filter(edge => 
      (edge.source === nodeId1 && edge.target === nodeId2) || 
      (edge.source === nodeId2 && edge.target === nodeId1)
    );
  }

  /**
   * Calculate network metrics (for testing visualization algorithms)
   */
  calculateNetworkMetrics() {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;
    
    // Calculate degree distribution
    const degreeDistribution = new Map<string, number>();
    for (const node of this.nodes.values()) {
      let degree = 0;
      for (const edge of this.edges.values()) {
        if (edge.source === node.id || edge.target === node.id) {
          degree++;
        }
      }
      degreeDistribution.set(node.id, degree);
    }
    
    // Calculate average degree
    const averageDegree = Array.from(degreeDistribution.values())
      .reduce((sum, degree) => sum + degree, 0) / nodeCount;
    
    return {
      nodeCount,
      edgeCount,
      degreeDistribution,
      averageDegree
    };
  }
}

/**
 * Create a new mock visual network with sample data for testing
 */
export function createMockNetwork(): MockVisualNetwork {
  const mockNetwork = new MockVisualNetwork();
  
  // Sample data
  const sampleData: MockNetworkData = {
    nodes: [
      {
        id: 'user1',
        type: 'user',
        position: { x: 0, y: 0, z: 0 },
        data: { name: 'Test User' },
        color: '#4CAF50'
      },
      {
        id: 'activity1',
        type: 'activity',
        position: { x: 10, y: 0, z: 0 },
        data: { name: 'Test Activity 1' },
        color: '#2196F3'
      },
      {
        id: 'activity2',
        type: 'activity',
        position: { x: -10, y: 0, z: 0 },
        data: { name: 'Test Activity 2' },
        color: '#2196F3'
      },
      {
        id: 'category1',
        type: 'category',
        position: { x: 0, y: 10, z: 0 },
        data: { name: 'Test Category' },
        color: '#FF9800'
      },
      {
        id: 'interest1',
        type: 'interest',
        position: { x: 0, y: -10, z: 0 },
        data: { name: 'Test Interest' },
        color: '#E91E63'
      }
    ],
    edges: [
      {
        id: 'edge1',
        source: 'user1',
        target: 'activity1',
        weight: 0.8,
        color: '#CCCCCC'
      },
      {
        id: 'edge2',
        source: 'user1',
        target: 'activity2',
        weight: 0.4,
        color: '#DDDDDD'
      },
      {
        id: 'edge3',
        source: 'activity1',
        target: 'category1',
        weight: 0.6,
        color: '#EEEEEE'
      },
      {
        id: 'edge4',
        source: 'user1',
        target: 'interest1',
        weight: 0.9,
        color: '#FFFFFF'
      }
    ]
  };
  
  mockNetwork.setData(sampleData);
  mockNetwork.initialize();
  
  return mockNetwork;
}

export default MockVisualNetwork;

