import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useVisualization } from '@/context/VisualizationContext';
import { useGlobeVisualization } from '@/hooks/useGlobeVisualization';
import * as THREE from 'three';
import { VisualizationNode, Connection } from '@/types/visualization';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { presetAnimations } from '@/hooks/useAnimationSystem';

interface GeoNetworkGlobeProps {
  height?: string;
  standalone?: boolean;
  nodes?: VisualizationNode[];
  connections?: Connection[];
  onNodeSelect?: (node: VisualizationNode) => void;
}

const GeoNetworkGlobe: React.FC<GeoNetworkGlobeProps> = ({ 
  height = '500px',
  standalone = false,
  nodes: propNodes = [],
  connections: propConnections = [],
  onNodeSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextValue = !standalone ? useVisualization() : null;
  const { state, fetchData, selectPlace } = contextValue || { 
    state: { 
      visualizationData: { nodes: propNodes, connections: propConnections },
      loading: false,
      error: null,
      places: [],
      selectedPlace: null
    },
    fetchData: () => {},
    selectPlace: () => {}
  };
  const [hoveredNode, setHoveredNode] = useState<VisualizationNode | null>(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  const { 
    zoomToNode, 
    isInitialized,
    getScene,
    getCamera,
    getRenderer,
    rotateToLatLong
  } = useGlobeVisualization(containerRef, {
    nodes: standalone ? propNodes : (state.visualizationData?.nodes || []),
    connections: standalone ? propConnections : (state.visualizationData?.connections || []),
    radius: 100,
    nodeSize: 2,
    detail: 64,
    enableRotation: !hoveredNode,
    standalone
  });

  // Fetch data on component mount if not in standalone mode
  useEffect(() => {
    if (standalone) return;
    
    // San Francisco coordinates as default
    const defaultLocation = { lat: 37.7749, lng: -122.4194 };
    fetchData(defaultLocation);
  }, [fetchData, standalone]);

  // Handle mouse move for hover effects
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!containerRef.current || !isInitialized) return;
      
      // Calculate normalized device coordinates
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Perform raycasting
      const scene = getScene();
      const camera = getCamera();
      
      if (!scene || !camera) return;
      
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      // Find intersections with nodes
      const nodesGroup = scene.children.find(child => child.name === 'nodes-group');
      if (!nodesGroup) return;
      
      const intersects = raycasterRef.current.intersectObjects(nodesGroup.children);
      
      if (intersects.length > 0) {
        // Found intersection, get node data
        const nodeData = intersects[0].object.userData.nodeData;
        if (nodeData) {
          setHoveredNode(nodeData);
          setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            content: `${nodeData.name} (Rating: ${nodeData.rating})`
          });
        }
      } else {
        setHoveredNode(null);
        setTooltip({...tooltip, visible: false});
      }
    },
    [isInitialized, getScene, getCamera, tooltip]
  );

  // Handle node click
  const handleClick = useCallback(() => {
    if (hoveredNode) {
      if (!standalone) {
        // Find the corresponding place
        const place = state.places.find(p => p.id === hoveredNode.id);
        if (place) {
          selectPlace(place);
        }
      }
      // Call onNodeSelect if provided
      onNodeSelect?.(hoveredNode);
      // Always zoom to node in both modes
      zoomToNode(hoveredNode);
    }
  }, [hoveredNode, state.places, selectPlace, zoomToNode, standalone, onNodeSelect]);

  // Add connections between nodes when data changes
  useEffect(() => {
    if (!isInitialized) return;
    
    // For standalone mode, use prop values directly
    if (standalone && (!propNodes || propNodes.length === 0)) return;
    
    // For context mode, require visualization data
    if (!standalone && !state.visualizationData) return;
    
    const scene = getScene();
    if (!scene) return;
    
    // Remove existing connection lines
    const existingLines = scene.children.filter(child => child.name === 'connection-line');
    existingLines.forEach(line => scene.remove(line));
    
    // Create new connection lines
    const nodes = standalone ? propNodes : state.visualizationData.nodes;
    const connections = standalone ? propConnections : state.visualizationData.connections;
    
    connections.forEach(connection => {
      const sourceNode = nodes.find(node => node.id === connection.source);
      const targetNode = nodes.find(node => node.id === connection.target);
      
      if (sourceNode && targetNode) {
        const material = new THREE.LineBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0.3
        });
        
        const points = [
          new THREE.Vector3(...sourceNode.position),
          new THREE.Vector3(...targetNode.position)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.name = 'connection-line';
        
        scene.add(line);
      }
    });
  }, [state.visualizationData, isInitialized, getScene, standalone, propNodes, propConnections]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div 
        className="geo-network-globe relative"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={presetAnimations.fadeIn.variants}
        transition={presetAnimations.fadeIn.transition}
      >
        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height, 
            position: 'relative',
            backgroundColor: '#000820',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: hoveredNode ? 'pointer' : 'grab'
          }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />
        
        <AnimatePresence mode="wait">
          {!standalone && state.loading && (
            <motion.div 
              key="loading"
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 p-2 rounded"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={presetAnimations.fadeIn.variants}
              transition={presetAnimations.fadeIn.transition}
            >
              Loading...
            </motion.div>
          )}
          
          {!standalone && state.error && (
            <motion.div 
              key="error"
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 bg-black bg-opacity-50 p-2 rounded"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={presetAnimations.notification.variants}
              transition={presetAnimations.notification.transition}
            >
              Error: {state.error}
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {tooltip.visible && (
            <motion.div 
              className="absolute bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm pointer-events-none z-50"
              style={{ 
                left: tooltip.x + 10,
                top: tooltip.y + 10,
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={presetAnimations.scaleIn.variants}
              transition={presetAnimations.scaleIn.transition}
              layoutId="tooltip"
            >
              {tooltip.content}
            </motion.div>
          )}
        </AnimatePresence>
        
        {!standalone && (
          <motion.div 
            className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded text-sm"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={presetAnimations.fadeIn.variants}
            transition={presetAnimations.fadeIn.transition}
          >
            {state.places.length} locations loaded
          </motion.div>
        )}
        
        <AnimatePresence>
          {!standalone && state.selectedPlace && (
            <motion.div 
              className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded max-w-xs"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={presetAnimations.modalEnter.variants}
              transition={presetAnimations.modalEnter.transition}
              layoutId="infoPanel"
            >
              <motion.h3 
                className="text-lg font-semibold"
                variants={presetAnimations.listItem.variants}
                transition={presetAnimations.listItem.transition}
              >
                {state.selectedPlace.name}
              </motion.h3>
              <motion.p 
                className="text-sm"
                variants={presetAnimations.listItem.variants}
                transition={presetAnimations.listItem.transition}
              >
                Rating: {state.selectedPlace.rating}/5
              </motion.p>
              <motion.p 
                className="text-sm"
                variants={presetAnimations.listItem.variants}
                transition={presetAnimations.listItem.transition}
              >
                Types: {state.selectedPlace.types.join(', ')}
              </motion.p>
              <motion.button 
                className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                onClick={() => selectPlace(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                variants={presetAnimations.listItem.variants}
                transition={presetAnimations.listItem.transition}
              >
                Clear Selection
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
};

export default GeoNetworkGlobe;
