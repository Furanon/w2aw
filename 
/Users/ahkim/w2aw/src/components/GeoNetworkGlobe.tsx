const GeoNetworkGlobe: React.FC<GeoNetworkGlobeProps> = ({ height = '500px' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, fetchData, selectPlace } = useVisualization();
  const [hoveredNode, setHoveredNode] = useState<VisualizationNode | null>(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  // Animation system setup
  const nodeAnimation = useAnimationSystem({
    type: 'spring',
    stiffness: 300,
    damping: 25
  });
  
  const tooltipAnimation = useAnimationSystem({
    type: 'scale',
    duration: 0.2,
    easing: 'backOut'
  });
  
  const loadingAnimation = useAnimationSystem({
    type: 'fade',
    duration: 0.4
  });
  
  const infoAnimation = useAnimationSystem({
    type: 'slide',
    direction: 'right',
    duration: 0.3,
    easing: 'circOut'
  });
  // Add connections between nodes when data changes
  useEffect(() => {
    if (!isInitialized || !state.visualizationData) return;
    
    const scene = getScene();
    if (!scene) return;
  
    // Remove existing connection lines
    const existingLines = scene.children.filter(child => child.name === 'connection-line');
    existingLines.forEach(line => scene.remove(line));
    
    // Create new connection lines
    const { nodes, connections } = state.visualizationData;
    
    // Add delay between connection animations for a staggered effect
    let delay = 0;
    const delayIncrement = 0.05;
    
    connections.forEach(connection => {
      const sourceNode = nodes.find(node => node.id === connection.source);
      const targetNode = nodes.find(node => node.id === connection.target);
      
      if (sourceNode && targetNode) {
        const material = new THREE.LineBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0
        });
        
        const points = [
          new THREE.Vector3(...sourceNode.position),
          new THREE.Vector3(...targetNode.position)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.name = 'connection-line';
        
        scene.add(line);
        
        // Animate line opacity for a fade-in effect
        setTimeout(() => {
          const fadeIn = new THREE.Tween(material)
            .to({ opacity: 0.3 }, 500)
            .easing(THREE.Easing.Cubic.Out)
            .start();
          
          // Store the tween in userData for potential future reference
          line.userData.tween = fadeIn;
        }, delay * 1000);
        
        delay += delayIncrement;
      }
    });
    
    // Handle hover effects on connections when a node is hovered
    if (hoveredNode) {
      const relatedConnections = connections.filter(
        conn => conn.source === hoveredNode.id || conn.target === hoveredNode.id
      );
      
      // Highlight connections related to hovered node
      scene.children.forEach(child => {
        if (child.name === 'connection-line') {
          const material = (child as THREE.Line).material as THREE.LineBasicMaterial;
          
          // Reset any existing tweens
          if (child.userData.tween) {
            child.userData.tween.stop();
          }
          
          // Check if this connection is related to the hovered node
          const isRelated = relatedConnections.some(conn => {
            const connSourceNode = nodes.find(node => node.id === conn.source);
            const connTargetNode = nodes.find(node => node.id === conn.target);
            
            if (!connSourceNode || !connTargetNode) return false;
            
            const linePoints = [
              new THREE.Vector3(...connSourceNode.position),
              new THREE.Vector3(...connTargetNode.position)
            ];
            
            // Compare line vertices with this connection
            const lineVertices = (child as THREE.Line).geometry.attributes.position;
            if (!lineVertices) return false;
            
            return (
              Math.abs(lineVertices.getX(0) - linePoints[0].x) < 0.001 &&
              Math.abs(lineVertices.getY(0) - linePoints[0].y) < 0.001 &&
              Math.abs(lineVertices.getZ(0) - linePoints[0].z) < 0.001 &&
              Math.abs(lineVertices.getX(1) - linePoints[1].x) < 0.001 &&
              Math.abs(lineVertices.getY(1) - linePoints[1].y) < 0.001 &&
              Math.abs(lineVertices.getZ(1) - linePoints[1].z) < 0.001
            );
          });
          
          // Animate the opacity based on relation
          const targetOpacity = isRelated ? 0.8 : 0.1;
          const targetColor = isRelated ? 0x00aaff : 0xffffff;
          
          child.userData.tween = new THREE.Tween(material)
            .to({ 
              opacity: targetOpacity,
              color: new THREE.Color(targetColor)
            }, 300)
            .easing(THREE.Easing.Cubic.Out)
            .start();
        }
      });
    } else {
      // Reset all connections when no node is hovered
      scene.children.forEach(child => {
        if (child.name === 'connection-line') {
          const material = (child as THREE.Line).material as THREE.LineBasicMaterial;
          
          // Reset any existing tweens
          if (child.userData.tween) {
            child.userData.tween.stop();
          }
          
          child.userData.tween = new THREE.Tween(material)
            .to({ 
              opacity: 0.3,
              color: new THREE.Color(0xffffff)
            }, 300)
            .easing(THREE.Easing.Cubic.Out)
            .start();
        }
      });
    }
    
  }, [state.visualizationData, isInitialized, getScene, hoveredNode]);
  useEffect(() => {
    // Start animations when component mounts
    tooltipAnimation.resetAnimation();
    loadingAnimation.startAnimation();
            key="loading"
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 p-2 rounded"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={presetAnimations.fadeIn.variants}
            transition={presetAnimations.fadeIn.transition}
              className="text-sm"
              variants={presetAnimations.listItem.variants}
              transition={presetAnimations.listItem.transition}
              className="text-sm"
              variants={presetAnimations.listItem.variants}
              transition={presetAnimations.listItem.transition}
