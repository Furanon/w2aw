import { useEffect, useRef, useState, useCallback } from 'react';
import { useVisualization } from '@/context/VisualizationContext';
import { useGlobeVisualization } from '@/hooks/useGlobeVisualization';
import * as THREE from 'three';
import { VisualizationNode, Connection, ContinentData, CONTINENT_BOUNDARIES } from '@/types/visualization';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { presetAnimations } from '@/hooks/useAnimationSystem';

interface GeoNetworkGlobeProps {
  height?: string;
  standalone?: boolean;
  nodes?: VisualizationNode[];
  connections?: Connection[];
  onNodeSelect?: (node: VisualizationNode) => void;
  searchQuery?: string;
  filters?: {
    accommodation: string[];
    natureAdventure: string[];
    relaxWellness: string[];
    food: string[];
    drinksNightlife: string[];
  };
}

const GeoNetworkGlobe: React.FC<GeoNetworkGlobeProps> = ({ 
  height = '500px',
  standalone = false,
  nodes: propNodes = [],
  connections: propConnections = [],
  onNodeSelect,
  searchQuery = '',
  filters = {
    accommodation: [],
    natureAdventure: [],
    relaxWellness: [],
    food: [],
    drinksNightlife: []
  }
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextValue = !standalone ? useVisualization() : null;
  const { state, fetchData } = contextValue || { 
    state: { 
      visualizationData: { nodes: propNodes, connections: propConnections },
      loading: false,
      error: null,
      places: [],
      selectedPlace: null
    },
    fetchData: () => {}
  };

  const [hoveredNode, setHoveredNode] = useState<VisualizationNode | null>(null);
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<VisualizationNode | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const {
    isInitialized,
    getScene,
    getCamera,
    radius = 100,
    setCameraPosition,
    nodeGroup,
    latLngToCartesian
  } = useGlobeVisualization(containerRef, {
    nodes: standalone ? propNodes : (state.visualizationData?.nodes || []),
    connections: standalone ? propConnections : (state.visualizationData?.connections || []),
    radius: 100,
    nodeSize: 2,
    detail: 64,
    enableRotation: autoRotate,
    standalone: standalone
  });

  useEffect(() => {
    if (isInitialized) {
      setLoading(false);
    }
  }, [isInitialized]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (getScene() && getCamera()) {
      raycasterRef.current.setFromCamera(mouseRef.current, getCamera()!);
      raycasterRef.current.params.Line = { threshold: 0.1 };
      
      const continentGroup = getScene()!.children.find(
        child => child instanceof THREE.Group && child.userData.isContinent
      ) as THREE.Group | undefined;

      if (continentGroup) {
        const continentIntersects = raycasterRef.current.intersectObjects(continentGroup.children, true);
        
        if (continentIntersects.length > 0) {
          const hitObject = continentIntersects[0].object;
          const continentId = hitObject.userData.continentId;
          
          if (continentId !== hoveredContinent) {
            setHoveredContinent(continentId);
            
            const material = hitObject.material as THREE.ShaderMaterial;
            if (material.uniforms) {
              material.uniforms.opacity.value = 0.6;
              material.uniforms.pulseScale.value = 0.2;
              material.uniforms.pulseSpeed.value = 2.0;
            }
            
            const continentName = hitObject.userData.continentName || continentId;
            setTooltip({
              visible: true,
              x: event.clientX,
              y: event.clientY,
              content: continentName
            });
          }
        } else if (hoveredContinent) {
          const prevHovered = continentGroup.children.find(
            child => child.userData.continentId === hoveredContinent
          );
          
          if (prevHovered) {
            const material = prevHovered.material as THREE.ShaderMaterial;
            if (material.uniforms) {
              material.uniforms.opacity.value = 0.3;
              material.uniforms.pulseScale.value = 0.1;
              material.uniforms.pulseSpeed.value = 1.0;
            }
          }
          
          setHoveredContinent(null);
          setTooltip(prev => ({ ...prev, visible: false }));
        }
      }

      if (!hoveredContinent) {
        const nodeIntersects = raycasterRef.current.intersectObjects(
          nodeGroup?.children || [],
          true
        );
        
        const hoveredPoint = nodeIntersects.find(intersect => 
          intersect.object.userData?.type === 'node' || 
          intersect.object.userData?.type === 'landmass'
        );

        if (hoveredPoint) {
          const node = hoveredPoint.object.userData?.node;
          setHoveredNode(node);
          setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            content: node.name
          });
        } else {
          setHoveredNode(null);
          setTooltip(prev => ({ ...prev, visible: false }));
        }
      }
    }
  }, [getScene, getCamera, hoveredContinent, nodeGroup]);

  const calculateContinentCenter = useCallback((continentId: string): THREE.Vector3 | null => {
    const continent = CONTINENT_BOUNDARIES.find(c => c.id === continentId);
    if (!continent) return null;

    const points = continent.triangles.flatMap(t => t.points);
    const center = points.reduce((acc, point) => {
      const pos = latLngToCartesian(point.lat, point.lng, radius);
      return acc.add(new THREE.Vector3(pos[0], pos[1], pos[2]));
    }, new THREE.Vector3());

    return center.divideScalar(points.length).normalize().multiplyScalar(radius * 1.5);
  }, [radius, latLngToCartesian]);

  const onMouseClick = useCallback((event: MouseEvent) => {
    if (!isInitialized) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouse = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };

    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 0.1 };
    raycaster.setFromCamera(mouse, getCamera()!);

    const continentGroup = getScene()?.children.find(
      child => child instanceof THREE.Group && child.userData.isContinent
    ) as THREE.Group | undefined;

    if (continentGroup) {
      const intersects = raycaster.intersectObjects(continentGroup.children, true);
      
      if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        const continentId = hitObject.userData.continentId;
        
        if (selectedContinent === continentId) {
          setSelectedContinent(null);
          setCameraPosition(
            new THREE.Vector3(0, 0, radius * 2.5),
            new THREE.Vector3(0, 0, 0),
            true
          );
        } else {
          setSelectedContinent(continentId);
          const centerPoint = calculateContinentCenter(continentId);
          if (centerPoint) {
            setCameraPosition(
              centerPoint,
              new THREE.Vector3(0, 0, 0),
              true
            );
          }
        }
        setAutoRotate(!selectedContinent);
      }
    }
  }, [isInitialized, getScene, getCamera, selectedContinent, calculateContinentCenter, setCameraPosition, radius]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', onMouseClick);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', onMouseClick);
    };
  }, [handleMouseMove, onMouseClick]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height, 
        position: 'relative',
        cursor: hoveredNode || hoveredContinent ? 'pointer' : 'default'
      }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white">Loading...</div>
        </div>
      )}
      
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default GeoNetworkGlobe;
