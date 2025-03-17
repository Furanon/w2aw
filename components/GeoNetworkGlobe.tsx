'use client';

import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Stars, useTexture, Html, Environment, Loader } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { useGLTF } from '@react-three/drei';
import { Particles, IParticlesParams } from 'react-tsparticles';
import { loadFull } from "tsparticles";
import Engine from "tsparticles-engine";

// Types for the visualization data
export interface GeoNode {
  id: string;
  name: string;
  type: 'user' | 'activity' | 'category' | 'interest';
  latitude: number;
  longitude: number;
  size?: number;
  color?: string;
  strength?: number; // Connection strength
  userData?: Record<string, any>; // Additional data
  isHotspot?: boolean; // If this is a high-activity hotspot
  activities?: Array<{
    id: string;
    name: string;
    description?: string;
    image?: string;
    rating?: number;
    price?: string;
  }>;
}
export interface GeoConnection {
  source: string;
  target: string;
  strength: number;
  color?: string;
}

export interface GeoNetworkData {
  nodes: GeoNode[];
  connections: GeoConnection[];
}
interface GeoNetworkGlobeProps {
  data: GeoNetworkData;
  height?: string;
  width?: string;
  backgroundColor?: string;
  onNodeClick?: (node: GeoNode) => void;
  highlightedNodeId?: string;
  userId?: string; // To identify the user's node
  userColor?: string; // User's unique color
  autoRotate?: boolean;
  globeSize?: number;
  useGeolocation?: boolean; // Whether to center on user's geolocation
  initialLatitude?: number; // Initial latitude to center on if not using geolocation
  initialLongitude?: number; // Initial longitude to center on if not using geolocation
  showParticles?: boolean; // Whether to show particle effects
  showDetailPanel?: boolean; // Whether to show detail panel when clicking a node
}

// Helper function to convert lat/long to 3D coordinates on a sphere
function latLongToVector3(lat: number, long: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (long + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = (radius * Math.cos(phi));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  
  return [x, y, z];
}

// Helper function to get color based on node type and strength
const getNodeColor = (node: GeoNode, userColor: string, userId?: string): string => {
  // If this is the user's node, use the user color
  if (userId && node.id === userId) {
    return userColor || '#FF5500';
  }
  
  // If this is a hotspot, use a special color
  if (node.isHotspot) {
    return '#FFD700'; // Gold color for hotspots
  }
  
  // Base colors for different node types
  const baseColors = {
    user: '#4CAF50',
    activity: '#2196F3',
    category: '#FF9800',
    interest: '#E91E63'
  };
  // If the node has a custom color, use it
  if (node.color) {
    return node.color;
  }

  // Get the base color for the node type
  const baseColor = baseColors[node.type] || '#9C27B0';
  
  // If there's a strength value, adjust color intensity
  if (node.strength !== undefined) {
    // Convert to HSL to adjust brightness based on strength
    const color = new THREE.Color(baseColor);
    const hsl = {};
    color.getHSL(hsl as THREE.HSL);
    
    // Adjust saturation and lightness based on strength (0-1)
    const normalizedStrength = Math.min(Math.max(node.strength, 0), 1);
    const adjustedColor = new THREE.Color().setHSL(
      hsl.h,
      hsl.s * (0.5 + normalizedStrength * 0.5), // Higher strength = more saturated
      hsl.l * (0.7 + normalizedStrength * 0.3)  // Higher strength = brighter
    );
    
    return '#' + adjustedColor.getHexString();
  }
  
  return baseColor;
};
// Grid Overlay component
const GridOverlay = ({ 
  size, 
  hotspots 
}: { 
  size: number, 
  hotspots: GeoNode[] 
}) => {
  // Create a wireframe grid with highlighted hotspot areas
  return (
    <mesh>
      <sphereGeometry args={[size * 1.02, 48, 48]} />
      <meshBasicMaterial 
        color="#255F85" 
        wireframe={true} 
        transparent={true}
        opacity={0.15}
      />
      
      {/* Hotspot highlights */}
      {hotspots.map((hotspot) => {
        const [x, y, z] = latLongToVector3(hotspot.latitude, hotspot.longitude, size * 1.025);
        
        return (
          <mesh key={`hotspot-${hotspot.id}`} position={[x, y, z]}>
            <sphereGeometry args={[size * 0.05, 16, 16]} />
            <meshBasicMaterial
              color="#FFD700"
              transparent={true}
              opacity={0.4}
            />
          </mesh>
        );
      })}
    </mesh>
  );
};

// Particle system for activity markers
const ActivityParticles = ({ 
  nodes, 
  size 
}: { 
  nodes: GeoNode[], 
  size: number 
}) => {
  const particlesInit = async (engine: Engine) => {
    await loadFull(engine);
  };

  // Convert node positions to screen coordinates for particles
  const { camera } = useThree();
  const [particlePositions, setParticlePositions] = useState<Array<{ x: number, y: number }>>([]);
  
  useEffect(() => {
    const positions = nodes.map(node => {
      const [x, y, z] = latLongToVector3(node.latitude, node.longitude, size * 1.03);
      const vector = new THREE.Vector3(x, y, z);
      vector.project(camera);
      
      return {
        x: (vector.x * 0.5 + 0.5) * window.innerWidth,
        y: (-(vector.y * 0.5) + 0.5) * window.innerHeight
      };
    });
    
    setParticlePositions(positions);
  }, [nodes, camera, size]);

  // Parameters for the particle system
  const particlesParams: IParticlesParams = {
    particles: {
      number: {
        value: nodes.length,
        density: {
          enable: true,
          value_area: 800
        }
      },
      color: {
        value: "#2196F3"
      },
      shape: {
        type: "circle"
      },
      opacity: {
        value: 0.7,
        random: true
      },
      size: {
        value: 3,
        random: true
      },
      line_linked: {
        enable: false
      },
      move: {
        enable: true,
        speed: 1,
        direction: "none",
        random: true,
        out_mode: "out"
      }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: {
          enable: true,
          mode: "bubble"
        },
        onclick: {
          enable: true,
          mode: "push"
        }
      },
      modes: {
        bubble: {
          distance: 250,
          size: 6,
          duration: 2,
          opacity: 0.8
        },
        push: {
          particles_nb: 4
        }
      }
    },
    retina_detect: true
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Particles id="activity-particles" options={particlesParams} init={particlesInit} />
    </div>
  );
};

// Activity Detail Panel
const ActivityDetailPanel = ({ 
  node, 
  onClose 
}: { 
  node: GeoNode | null, 
  onClose: () => void 
}) => {
  if (!node) return null;
  
  return (
    <div className="activity-detail-panel">
      <div className="activity-detail-header">
        <h3>{node.name}</h3>
        <button onClick={onClose}>×</button>
      </div>
      
      {node.activities && node.activities.length > 0 ? (
        <div className="activity-list">
          {node.activities.map(activity => (
            <div key={activity.id} className="activity-item">
              {activity.image && (
                <div className="activity-image">
                  <img src={activity.image} alt={activity.name} />
                </div>
              )}
              <div className="activity-info">
                <h4>{activity.name}</h4>
                {activity.description && <p>{activity.description}</p>}
                <div className="activity-meta">
                  {activity.rating && <span className="rating">⭐ {activity.rating}</span>}
                  {activity.price && <span className="price">{activity.price}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No activities available at this location.</p>
      )}
    </div>
  );
};

// Earth component with nodes
const Earth = ({ 
  nodes, 
  connections, 
  onNodeClick, 
  highlightedNodeId, 
  userId,
  userColor,
  autoRotate = true, 
  size = 2,
  showHotspots = true
}: {
  nodes: GeoNode[];
  connections: GeoConnection[];
  onNodeClick?: (node: GeoNode) => void;
  highlightedNodeId?: string;
  userId?: string;
  userColor: string;
  autoRotate?: boolean;
  size?: number;
  showHotspots?: boolean;
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  
  // Load earth textures with preloading
  const textures = useTexture(
    {
      earthMap: '/textures/earth_daymap.jpg',
      normalMap: '/textures/earth_normal_map.jpg',
      specularMap: '/textures/earth_specular_map.jpg',
      cloudsMap: '/textures/earth_clouds.jpg',
      bumpMap: '/textures/earth_bump_map.jpg',
    },
    (loadedTextures) => {
      // Optimize textures once loaded
      Object.values(loadedTextures).forEach(texture => {
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.anisotropy = 4;
      });
    }
  );
  // Create a lookup for quick node access by ID
  const nodeMap = useMemo(() => {
    const map = new Map<string, GeoNode>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);
  
  // Filter out hotspot nodes for special rendering
  const hotspotNodes = useMemo(() => {
    return nodes.filter(node => node.isHotspot);
  }, [nodes]);
  // Calculate 3D positions for nodes based on lat/long
  const nodesWithPositions = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      position: latLongToVector3(node.latitude, node.longitude, size * 1.02) // Slightly above earth surface
    }));
  }, [nodes, size]);
  
  useFrame(({ clock }) => {
    if (autoRotate && earthRef.current) {
      earthRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
    
    if (cloudRef.current) {
      cloudRef.current.rotation.y = clock.getElapsedTime() * 0.07;
    }
  });
  
  // Process connections to create curved lines between nodes
  const connectionLines = useMemo(() => {
    return connections.map((connection, index) => {
      const sourceNode = nodeMap.get(connection.source);
      const targetNode = nodeMap.get(connection.target);
      
      if (!sourceNode || !targetNode) return null;
      
      const sourcePos = latLongToVector3(sourceNode.latitude, sourceNode.longitude, size * 1.02);
      const targetPos = latLongToVector3(targetNode.latitude, targetNode.longitude, size * 1.02);
      
      // Create a slightly elevated midpoint for the curve
      const midPoint = new THREE.Vector3(
        (sourcePos[0] + targetPos[0]) / 2,
        (sourcePos[1] + targetPos[1]) / 2,
        (sourcePos[2] + targetPos[2]) / 2
      );
      
      // Pull the midpoint out from the center to create an arc
      const earthCenter = new THREE.Vector3(0, 0, 0);
      const midPointDirection = midPoint.clone().sub(earthCenter).normalize();
      const elevationFactor = 0.15 + connection.strength * 0.1; // Higher strength = higher arc
      midPoint.add(midPointDirection.multiplyScalar(size * elevationFactor));
      
      // Create a quadratic bezier curve
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...sourcePos),
        midPoint,
        new THREE.Vector3(...targetPos)
      );
      
      // Get points along the curve
      const points = curve.getPoints(20);
      
      // Determine if this connection should be highlighted
      const isHighlighted = 
        highlightedNodeId === connection.source || 
        highlightedNodeId === connection.target;
      
      const lineWidth = connection.strength * 2 + (isHighlighted ? 1 : 0);
      const color = connection.color || (isHighlighted ? '#FFFFFF' : '#AAAAAA');
      
      return {
        points,
        color,
        lineWidth,
        opacity: 0.7 + (connection.strength * 0.3),
        key: `${connection.source}-${connection.target}-${index}`
      };
    }).filter(Boolean);
  }, [connections, nodeMap, size, highlightedNodeId]);
  
  return (
    <>
      {/* Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshPhongMaterial 
          map={earthTexture} 
          normalMap={normalMap}
          specularMap={specularMap}
          shininess={15}
        />
      </mesh>
      
      {/* Clouds */}
      <mesh ref={cloudRef}>
        <sphereGeometry args={[size * 1.01, 64, 64]} />
        <meshPhongMaterial 
          map={cloudsMap}
          transparent={true}
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
      
      {/* Grid */}
      <mesh>
        <sphereGeometry args={[size * 1.02, 64, 64]} />
        <meshBasicMaterial 
          color="#255F85" 
          wireframe={true} 
          transparent={true}
          opacity={0.1}
        />
      </mesh>
      
      {/* Nodes */}
      {nodesWithPositions.map(node => (
        <GeoNetworkNode 
          key={node.id} 
          node={node} 
          onClick={onNodeClick ? () => onNodeClick(node) : undefined}
          isHighlighted={node.id === highlightedNodeId}
          isUser={node.id === userId}
          userColor={userColor}
        />
      ))}
      
      {/* Connection lines */}
      {connectionLines.map(line => {
        if (!line) return null;
        
        return (
          <line key={line.key} geometry={new THREE.BufferGeometry().setFromPoints(line.points)}>
            <lineBasicMaterial 
              color={line.color} 
              linewidth={line.lineWidth} 
              opacity={line.opacity} 
              transparent={true} 
            />
          </line>
        );
      })}
    </>
  );
};

// Node component
const GeoNetworkNode = ({ 
  node, 
  onClick, 
  isHighlighted,
  isUser,
  userColor
}: { 
  node: GeoNode & { position: [number, number, number] }, 
  onClick?: () => void,
  isHighlighted: boolean,
  isUser: boolean,
  userColor: string
}) => {
  // Calculate node size based on its strength/importance
  const baseSize = node.size || (isUser ? 0.08 : 0.05);
  const sizeMultiplier = node.strength !== undefined ? 1 + node.strength : 1;
  const finalSize = baseSize * sizeMultiplier;
  
  // Use react-spring for animations
  const { scale, emissive } = useSpring({
    scale: isHighlighted ? 1.5 : 1,
    emissive: isHighlighted ? '#ffffff' : '#000000',
    config: { mass: 1, tension: 170, friction: 26 }
  });
  
  // Get color based on node type and strength
  const color = getNodeColor(node, userColor, isUser ? node.id : undefined);
  
  return (
    <>
      <animated.mesh
        position={node.position}
        onClick={onClick}
        scale={scale}
      >
        <sphereGeometry args={[finalSize, 24, 24]} />
        <animated.meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.8}
        />
      </animated.mesh>
      
      {/* Only show labels when highlighted */}
      {isHighlighted && (
        <Text
          position={[
            node.position[0] * 1.15,
            node.position[1] * 1.15,
            node.position[2] * 1.15
          ]}
          fontSize={0.1}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {node.name}
        </Text>
      )}
    </>
  );
};

// Main component
const GeoNetworkGlobe: React.FC<GeoNetworkGlobeProps> = ({
  data,
  height = '600px',
  width = '100%',
  backgroundColor = '#000000',
  onNodeClick,
  highlightedNodeId,
  userId,
  userColor = '#FF5500', // Unique orange-red for user by default
  autoRotate = true,
  globeSize = 2
}) => {
  const handleNodeClick = (node: GeoNode) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };
  
  return (
    <div style={{ position: 'relative', height, width }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: backgroundColor }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={1} 
          castShadow 
        />
        
        <Earth 
          nodes={data.nodes}
          connections={data.connections}
          onNodeClick={handleNodeClick}
          highlightedNodeId={highlightedNodeId}
          userId={userId}
          userColor={userColor}
          autoRotate={autoRotate}
          size={globeSize}
        />
        
        <Stars 
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
        />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          minDistance={globeSize * 2.5}
          maxDistance={globeSize * 10}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
};

export default GeoNetworkGlobe;

