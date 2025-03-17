'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface GlobeProps {
  position?: [number, number]; // [latitude, longitude]
  autoRotate?: boolean;
  size?: number;
}

const Earth = ({ position, autoRotate = true, size = 1 }: GlobeProps) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  
  // Load textures
  const [earthTexture, normalMap, specularMap, cloudsMap] = useTexture([
    '/textures/earth_daymap.jpg',
    '/textures/earth_normal_map.jpg',
    '/textures/earth_specular_map.jpg',
    '/textures/earth_clouds.jpg'
  ]);

  // Convert lat/long to 3D position
  useEffect(() => {
    if (position && markerRef.current) {
      const [lat, lon] = position;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      
      const x = -(size * 1.01) * Math.sin(phi) * Math.cos(theta);
      const y = (size * 1.01) * Math.cos(phi);
      const z = (size * 1.01) * Math.sin(phi) * Math.sin(theta);
      
      markerRef.current.position.set(x, y, z);
      markerRef.current.lookAt(0, 0, 0);
    }
  }, [position, size]);

  useFrame(({ clock }) => {
    if (autoRotate && earthRef.current) {
      earthRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
    
    if (cloudRef.current) {
      cloudRef.current.rotation.y = clock.getElapsedTime() * 0.07;
    }
  });

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
          opacity={0.2}
        />
      </mesh>
      
      {/* Position marker */}
      {position && (
        <mesh ref={markerRef}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color="#FF4500" />
        </mesh>
      )}
    </>
  );
};

const Globe = ({ position, autoRotate = true, size = 2 }: GlobeProps) => {
  const [userPosition, setUserPosition] = useState<[number, number] | undefined>(position);

  useEffect(() => {
    // Try to get user's geolocation if no position is provided
    if (!position && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (geoPosition) => {
          setUserPosition([
            geoPosition.coords.latitude,
            geoPosition.coords.longitude
          ]);
        },
        (error) => {
          console.error('Error getting geolocation:', error);
          // Default to a nice view of Earth if geolocation fails
          setUserPosition([0, 0]);
        }
      );
    }
  }, [position]);

  return (
    <div className="w-full h-[70vh] relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        className="bg-gradient-to-b from-black to-slate-900"
      >
        <ambientLight intensity={0.1} />
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={1} 
          castShadow 
        />
        
        <Earth 
          position={userPosition} 
          autoRotate={autoRotate}
          size={size}
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
          enablePan={false}
          minDistance={size * 2}
          maxDistance={size * 6}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export default Globe;

