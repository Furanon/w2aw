import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VisualizationNode } from '@/types/visualization';

interface GlobeVisualizationOptions {
  nodes: VisualizationNode[];
  connections: any[];
  radius?: number;
  nodeSize?: number;
  detail?: number;
  enableRotation?: boolean;
  standalone?: boolean;
}

export function useGlobeVisualization(
  containerRef: React.RefObject<HTMLDivElement>,
  options: GlobeVisualizationOptions
) {
  const {
    nodes = [],
    radius = 100,
    nodeSize = 2,
    detail = 64,
    enableRotation = true,
    standalone = false
  } = options;

  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const frameIdRef = useRef<number>();
  const globeRef = useRef<THREE.Mesh>();

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = radius * 2.5;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = true;
    controls.minDistance = radius * 1.5;
    controls.maxDistance = radius * 4;
    controlsRef.current = controls;

    // Create globe
    const globeGeometry = new THREE.SphereGeometry(radius, detail, detail);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x093766,
      transparent: true,
      opacity: 0.8,
      wireframe: true
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeRef.current = globe;
    scene.add(globe);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add point light
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(radius * 2, radius * 2, radius * 2);
    scene.add(pointLight);

    setIsInitialized(true);
  }, [radius, detail, containerRef]);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();

    rendererRef.current.setSize(width, height);
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) return;

    frameIdRef.current = requestAnimationFrame(animate);

    if (enableRotation && globeRef.current) {
      globeRef.current.rotation.y += 0.001;
    }

    controlsRef.current.update();
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [enableRotation]);

  // Initialize scene on mount
  useEffect(() => {
    initScene();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [initScene, handleResize]);

  // Start animation when initialized
  useEffect(() => {
    if (isInitialized) {
      animate();
    }
  }, [isInitialized, animate]);

  // Update nodes
  useEffect(() => {
    if (!isInitialized || !sceneRef.current) return;

    // Remove existing nodes
    const existingNodesGroup = sceneRef.current.children.find(child => child.name === 'nodes-group');
    if (existingNodesGroup) {
      sceneRef.current.remove(existingNodesGroup);
    }

    // Create new nodes group
    const nodesGroup = new THREE.Group();
    nodesGroup.name = 'nodes-group';

    // Add nodes
    nodes.forEach(node => {
      const geometry = new THREE.SphereGeometry(nodeSize, 16, 16);
      const material = new THREE.MeshPhongMaterial({ 
        color: node.color || 0x00ff00,
        emissive: 0x222222
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...node.position);
      mesh.userData.nodeData = node;
      nodesGroup.add(mesh);
    });

    sceneRef.current.add(nodesGroup);
  }, [isInitialized, nodes, nodeSize]);

  // Helper functions
  const zoomToNode = useCallback((node: VisualizationNode) => {
    if (!controlsRef.current || !cameraRef.current) return;

    const targetPosition = new THREE.Vector3(...node.position);
    const distance = radius * 1.75;

    // Calculate camera position
    const direction = targetPosition.normalize();
    const cameraPosition = direction.multiplyScalar(distance);

    // Animate camera movement
    const duration = 1000;
    const startPosition = cameraRef.current.position.clone();
    const startTime = Date.now();

    function updateCamera() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease function
      const t = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      cameraRef.current!.position.lerpVectors(startPosition, cameraPosition, t);
      controlsRef.current!.target.copy(targetPosition);
      controlsRef.current!.update();

      if (progress < 1) {
        requestAnimationFrame(updateCamera);
      }
    }

    updateCamera();
  }, [radius]);

  const rotateToLatLong = useCallback((lat: number, lng: number) => {
    if (!globeRef.current) return;

    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    globeRef.current.rotation.y = theta;
    globeRef.current.rotation.x = phi;
  }, []);

  return {
    isInitialized,
    getScene: () => sceneRef.current,
    getCamera: () => cameraRef.current,
    getRenderer: () => rendererRef.current,
    getControls: () => controlsRef.current,
    zoomToNode,
    rotateToLatLong
  };
}

