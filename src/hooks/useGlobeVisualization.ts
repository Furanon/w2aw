import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import gsap from "gsap";

// Types for visualization data
interface VisualizationNode {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  position?: [number, number, number];
  color?: string | number;
  size?: number;
  type?: string;
  metadata?: Record<string, any>;
}

interface VisualizationConnection {
  id: string;
  source: string;
  target: string;
  weight?: number;
  color?: string | number;
  metadata?: Record<string, any>;
}

// Types for continent visualization
interface ContinentPoint {
  lat: number;
  lng: number;
}

interface ContinentTriangle {
  points: [ContinentPoint, ContinentPoint, ContinentPoint];
}

interface ContinentData {
  id: string;
  name: string;
  triangles: ContinentTriangle[];
  properties?: {
    color?: string;
    opacity?: number;
    weight?: number;
  };
}

// Shader uniforms interface
interface ShaderUniforms {
  time: { value: number };
  color: { value: THREE.Color };
  baseOpacity: { value: number };
  opacity: { value: number };
  pulseScale: { value: number };
  pulseSpeed: { value: number };
}

// Options for the hook
interface GlobeVisualizationOptions {
  nodes?: VisualizationNode[];
  connections?: VisualizationConnection[];
  radius?: number;
  nodeSize?: number;
  detail?: number;
  enableRotation?: boolean;
  autoRotationSpeed?: number;
  showContinents?: boolean;
  continentOpacity?: number;
  glowColor?: string | number;
  backgroundColor?: string | number;
}

// Return type for the hook
interface GlobeVisualizationReturn {
  isInitialized: boolean;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | undefined;
  renderer: THREE.WebGLRenderer | undefined;
  controls: OrbitControls | undefined;
  globe: THREE.Mesh | undefined;
  nodeGroup: THREE.Group;
  continentGroup: THREE.Group;
  connectionGroup: THREE.Group;
  zoomToNode: (nodeId: string) => void;
  rotateToLatLong: (lat: number, lng: number, distance?: number) => void;
  setCameraPosition: (position: THREE.Vector3, target: THREE.Vector3, animate?: boolean) => void;
  updateRotation: (enable: boolean) => void;
  latLngToCartesian: (lat: number, lng: number, radius: number) => [number, number, number];
}

// Utility function for converting lat/lng to 3D coordinates
const latLngToCartesian = (lat: number, lng: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
};

export const useGlobeVisualization = (
  containerRef: React.RefObject<HTMLDivElement>,
  options: GlobeVisualizationOptions
): GlobeVisualizationReturn => {
  // Extract options with defaults
  const {
    nodes = [],
    connections = [],
    radius = 100,
    nodeSize = 2,
    detail = 64,
    enableRotation = true,
    autoRotationSpeed = 0.5,
    showContinents = true,
    continentOpacity = 0.3,
    glowColor = 0x2233ff,
    backgroundColor = 0x000000
  } = options;

  // Scene and rendering refs
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();

  // Visualization element refs
  const globeRef = useRef<THREE.Mesh>();
  const nodeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const connectionGroupRef = useRef<THREE.Group>(new THREE.Group());
  const continentGroupRef = useRef<THREE.Group>(new THREE.Group());

  // Animation and cleanup refs
  const frameIdRef = useRef<number>();
  const materialsRef = useRef<THREE.Material[]>([]);
  const geometriesRef = useRef<THREE.BufferGeometry[]>([]);

  // State
  const [isInitialized, setIsInitialized] = useState(false);

  // Calculate distance-based opacity for continents
  const calculateDistanceBasedOpacity = useCallback(
    (cameraPosition: THREE.Vector3): number => {
      const distance = cameraPosition.length();
      const minDistance = radius * 1.5;
      const maxDistance = radius * 4;
      const opacity = 1 - THREE.MathUtils.smoothstep(distance, minDistance, maxDistance);
      return THREE.MathUtils.clamp(opacity * continentOpacity, 0.1, 0.5);
    },
    [radius, continentOpacity]
  );

  // Camera position setter with animation
  const setCameraPosition = useCallback(
    (position: THREE.Vector3, target: THREE.Vector3 = new THREE.Vector3(), animate = true) => {
      if (!cameraRef.current || !controlsRef.current) return;

      if (animate) {
        gsap.to(cameraRef.current.position, {
          duration: 1,
          x: position.x,
          y: position.y,
          z: position.z,
          ease: "power2.inOut"
        });

        gsap.to(controlsRef.current.target, {
          duration: 1,
          x: target.x,
          y: target.y,
          z: target.z,
          ease: "power2.inOut",
          onUpdate: () => controlsRef.current?.update()
        });
      } else {
        cameraRef.current.position.copy(position);
        controlsRef.current.target.copy(target);
        controlsRef.current.update();
      }
    },
    []
  );

  // Navigation helpers
  const rotateToLatLong = useCallback(
    (lat: number, lng: number, distance = radius * 2) => {
      const [x, y, z] = latLngToCartesian(lat, lng, distance);
      setCameraPosition(
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(0, 0, 0),
        true
      );
    },
    [radius, setCameraPosition]
  );

  const zoomToNode = useCallback(
    (nodeId: string) => {
      const node = nodeGroupRef.current?.children.find(
        (child) => child.userData?.id === nodeId
      );

      if (node) {
        const nodePosition = node.position.clone();
        const distance = radius * 1.5;
        const direction = nodePosition.clone().normalize();
        const cameraPosition = direction.multiplyScalar(distance);
        setCameraPosition(cameraPosition, nodePosition, true);
      }
    },
    [radius, setCameraPosition]
  );

  const updateRotation = useCallback((enable: boolean) => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = enable;
    }
  }, []);

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Setup camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.z = radius * 2.5;
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(backgroundColor as number, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.minDistance = radius * 1.2;
    controls.maxDistance = radius * 3.5;
    controls.autoRotate = enableRotation;
    controls.autoRotateSpeed = autoRotationSpeed;
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(radius * 2, radius * 2, radius * 2);
    sceneRef.current.add(ambientLight);
    sceneRef.current.add(pointLight);

    // Create globe mesh
    const globeGeometry = new THREE.SphereGeometry(radius, detail, detail);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: glowColor as number,
      transparent: true,
      opacity: 0.2,
      shininess: 0.7
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    sceneRef.current.add(globe);
    globeRef.current = globe;

    // Store for cleanup
    geometriesRef.current.push(globeGeometry);
    materialsRef.current.push(globeMaterial);

    // Add groups to scene
    sceneRef.current.add(nodeGroupRef.current);
    sceneRef.current.add(connectionGroupRef.current);
    sceneRef.current.add(continentGroupRef.current);

    setIsInitialized(true);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();

      // Update shader uniforms
      const time = performance.now() * 0.001;
      sceneRef.current.traverse((child) => {
        if (
          (child instanceof THREE.Mesh || child instanceof THREE.Line) &&
          child.material instanceof THREE.ShaderMaterial &&
          child.material.uniforms?.time
        ) {
          child.material.uniforms.time.value = time;
        }
      });

      renderer.render(sceneRef.current, camera);
    };
    animate();

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      window.removeEventListener("resize", handleResize);

      // Dispose of all materials and geometries
      materialsRef.current.forEach((material) => material?.dispose());
      geometriesRef.current.forEach((geometry) => geometry?.dispose());

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [
    radius,
    detail,
    enableRotation,
    autoRotationSpeed,
    backgroundColor,
    glowColor
  ]);
