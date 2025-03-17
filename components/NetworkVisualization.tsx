import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { Engine, ISourceOptions } from 'tsparticles-engine';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';

// Types for the visualization data
export interface Node {
  id: string;
  name: string;
  type: 'user' | 'activity' | 'category' | 'interest';
  size?: number;
  color?: string;
  position?: [number, number, number];
}

export interface Connection {
  source: string;
  target: string;
  strength: number;
  color?: string;
}

export interface NetworkData {
  nodes: Node[];
  connections: Connection[];
}

interface NetworkVisualizationProps {
  data: NetworkData;
  height?: string;
  width?: string;
  backgroundColor?: string;
  onNodeClick?: (node: Node) => void;
  highlightedNodeId?: string;
}

// Particle configuration
const particlesConfig: ISourceOptions = {
  fpsLimit: 60,
  particles: {
    number: {
      value: 100,
      density: {
        enable: true,
        value_area: 800
      }
    },
    color: {
      value: "#ffffff"
    },
    opacity: {
      value: 0.5,
      random: true,
      anim: {
        enable: true,
        speed: 1,
        opacity_min: 0.1,
        sync: false
      }
    },
    size: {
      value: 3,
      random: true,
      anim: {
        enable: true,
        speed: 2,
        size_min: 0.1,
        sync: false
      }
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#ffffff",
      opacity: 0.4,
      width: 1
    },
    move: {
      enable: true,
      speed: 1,
      direction: "none",
      random: true,
      straight: false,
      out_mode: "out",
      bounce: false,
    }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: {
        enable: true,
        mode: "grab"
      },
      onclick: {
        enable: true,
        mode: "push"
      },
      resize: true
    },
    modes: {
      grab: {
        distance: 140,
        line_linked: {
          opacity: 1
        }
      },
      push: {
        particles_nb: 4
      }
    }
  },
  retina_detect: true
};

// Node component that represents a neuron
const Neuron = ({ node, onClick, isHighlighted }: { 
  node: Node, 
  onClick: () => void,
  isHighlighted: boolean 
}) => {
  const nodeRef = useRef<THREE.Mesh>(null);
  
  // Use react-spring for animations
  const { scale, emissive } = useSpring({
    scale: isHighlighted ? 1.5 : 1,
    emissive: isHighlighted ? '#ffffff' : '#000000',
    config: { mass: 1, tension: 170, friction: 26 }
  });

  // Add subtle animation to nodes
  useFrame(() => {
    if (nodeRef.current) {
      nodeRef.current.rotation.x += 0.005;
      nodeRef.current.rotation.y += 0.005;
    }
  });

  const color = node.color || getNodeColor(node.type);
  
  return (
    <animated.mesh
      ref={nodeRef}
      position={node.position || [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5]}
      onClick={onClick}
      scale={scale}
    >
      <sphereGeometry args={[node.size || 0.5, 32, 32]} />
      <animated.meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.5}
        roughness={0.4}
        metalness={0.8}
      />
      
      {/* Node label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {node.name}
      </Text>
    </animated.mesh>
  );
};

// Connection component that represents a synapse between neurons
const Synapse = ({ connection, nodes, highlighted }: { 
  connection: Connection, 
  nodes: Node[],
  highlighted: boolean
}) => {
  const sourceNode = nodes.find(node => node.id === connection.source);
  const targetNode = nodes.find(node => node.id === connection.target);
  
  if (!sourceNode || !targetNode || !sourceNode.position || !targetNode.position) {
    return null;
  }
  
  const sourcePosition = new THREE.Vector3(...sourceNode.position);
  const targetPosition = new THREE.Vector3(...targetNode.position);
  
  // Calculate the curve points
  const curvePoints = useMemo(() => {
    const midPoint = new THREE.Vector3().addVectors(
      sourcePosition,
      targetPosition
    ).multiplyScalar(0.5);
    
    // Add some randomness to the curve
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
    midPoint.add(randomOffset);
    
    const curve = new THREE.QuadraticBezierCurve3(
      sourcePosition,
      midPoint,
      targetPosition
    );
    
    return curve.getPoints(20);
  }, [sourcePosition, targetPosition]);
  
  // Create a geometry from the curve points
  const points = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(curvePoints);
  }, [curvePoints]);
  
  // Animation for the line
  const [progress, setProgress] = useState(0);
  
  useFrame(() => {
    setProgress((prev) => (prev + 0.005) % 1);
  });
  
  const color = connection.color || '#ffffff';
  const lineWidth = connection.strength * 2 + (highlighted ? 1 : 0);
  
  return (
    <group>
      <line geometry={points}>
        <lineBasicMaterial 
          color={color} 
          linewidth={lineWidth} 
          opacity={0.7} 
          transparent 
        />
      </line>
      
      {/* Animated particle traveling along the connection */}
      <mesh position={curvePoints[Math.floor(progress * curvePoints.length)]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};

// Helper function to assign colors based on node type
const getNodeColor = (type: string): string => {
  switch (type) {
    case 'user':
      return '#4CAF50';
    case 'activity':
      return '#2196F3';
    case 'category':
      return '#FF9800';
    case 'interest':
      return '#E91E63';
    default:
      return '#9C27B0';
  }
};

// Main scene component
const NetworkScene = ({ data, onNodeClick, highlightedNodeId }: {
  data: NetworkData,
  onNodeClick: (node: Node) => void,
  highlightedNodeId?: string
}) => {
  // Setup position simulation for nodes
  const initializePositions = () => {
    return data.nodes.map(node => ({
      ...node,
      position: node.position || [
        Math.random() * 20 - 10,
        Math.random() * 20 - 10,
        Math.random() * 20 - 10
      ]
    }));
  };
  
  const [nodes, setNodes] = useState<Node[]>(initializePositions());
  
  // Force-directed layout simulation
  useEffect(() => {
    const simulateForces = () => {
      const updatedNodes = [...nodes];
      
      // Apply repulsive forces between all nodes
      for (let i = 0; i < updatedNodes.length; i++) {
        for (let j = i + 1; j < updatedNodes.length; j++) {
          if (!updatedNodes[i].position || !updatedNodes[j].position) continue;
          
          const dx = updatedNodes[j].position![0] - updatedNodes[i].position![0];
          const dy = updatedNodes[j].position![1] - updatedNodes[i].position![1];
          const dz = updatedNodes[j].position![2] - updatedNodes[i].position![2];
          
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (distance === 0) continue;
          
          // Repulsive force, inversely proportional to distance
          const force = 10 / (distance * distance);
          const fx = dx / distance * force;
          const fy = dy / distance * force;
          const fz = dz / distance * force;
          
          updatedNodes[i].position = [
            updatedNodes[i].position[0] - fx * 0.05,
            updatedNodes[i].position[1] - fy * 0.05,
            updatedNodes[i].position[2] - fz * 0.05
          ];
          
          updatedNodes[j].position = [
            updatedNodes[j].position[0] + fx * 0.05,
            updatedNodes[j].position[1] + fy * 0.05,
            updatedNodes[j].position[2] + fz * 0.05
          ];
        }
      }
      
      // Apply attractive forces along connections
      for (const connection of data.connections) {
        const sourceNode = updatedNodes.find(node => node.id === connection.source);
        const targetNode = updatedNodes.find(node => node.id === connection.target);
        
        if (!sourceNode || !targetNode || !sourceNode.position || !targetNode.position) continue;
        
        const dx = targetNode.position[0] - sourceNode.position[0];
        const dy = targetNode.position[1] - sourceNode.position[1];
        const dz = targetNode.position[2] - sourceNode.position[2];
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance === 0) continue;
        
        // Attractive force proportional to distance and connection strength
        const force = distance * 0.05 * connection.strength;
        const fx = dx / distance * force;
        const fy = dy / distance * force;
        const fz = dz / distance * force;
        
        sourceNode.position = [
          sourceNode.position[0] + fx * 0.1,
          sourceNode.position[1] + fy * 0.1,
          sourceNode.position[2] + fz * 0.1
        ];
        
        targetNode.position = [
          targetNode.position[0] - fx * 0.1,
          targetNode.position[1] - fy * 0.1,
          targetNode.position[2] - fz * 0.1
        ];
      }
      
      setNodes(updatedNodes);
    };
    
    // Run a limited number of simulation steps
    let steps = 0;
    const maxSteps = 100;
    const interval = setInterval(() => {
      simulateForces();
      steps++;
      
      if (steps >= maxSteps) {
        clearInterval(interval);
      }
    }, 16);
    
    return () => clearInterval(interval);
  }, [data]);
  
  return (
    <>
      {/* Add ambient light and point lights */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Add stars in the background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Render neurons (nodes) */}
      {nodes.map(node => (
        <Neuron 
          key={node.id} 
          node={node} 
          onClick={() => onNodeClick(node)}
          isHighlighted={node.id === highlightedNodeId}
        />
      ))}
      
      {/* Render synapses (connections) */}
      {data.connections.map((connection, index) => (
        <Synapse 
          key={`${connection.source}-${connection.target}-${index}`} 
          connection={connection} 
          nodes={nodes}
          highlighted={
            connection.source === highlightedNodeId || 
            connection.target === highlightedNodeId
          }
        />
      ))}
    </>
  );
};

// Main component export
const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  data,
  height = '600px',
  width = '100%',
  backgroundColor = '#141414',
  onNodeClick,
  highlightedNodeId
}) => {
  const particlesInit = async (engine: Engine) => {
    await loadFull(engine);
  };
  
  const handleNodeClick = (node: Node) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };
  
  return (
    <div style={{ position: 'relative', height, width }}>
      {/* Particles background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesConfig}
        />
      </div>
      
      {/* Three.js canvas */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
        <Canvas
          camera={{ position: [0, 0, 15], fov: 60 }}
          style={{ background: backgroundColor }}
        >
          <OrbitControls 
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            autoRotate={false}
            autoRotateSpeed={0.5}
          />
          <NetworkScene 
            data={data} 
            onNodeClick={handleNodeClick}
            highlightedNodeId={highlightedNodeId}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default NetworkVisualization;

