import { Variants } from "framer-motion";

// Basic animation variants
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

export const scaleVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  },
  exit: { 
    scale: 0.8, 
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" } 
  }
};

export const slideVariants: Variants = {
  hiddenLeft: { x: -50, opacity: 0 },
  hiddenRight: { x: 50, opacity: 0 },
  hiddenTop: { y: -50, opacity: 0 },
  hiddenBottom: { y: 50, opacity: 0 },
  visible: { 
    x: 0, 
    y: 0, 
    opacity: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.3 } 
  }
};

// Globe container animation
export const globeContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.8,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: 0.5,
      when: "afterChildren", 
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

// Info panel animation with staggered children
export const infoPanelVariants: Variants = {
  hidden: { 
    opacity: 0,
    x: 30,
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: { 
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      when: "beforeChildren",
      staggerChildren: 0.07
    }
  },
  exit: { 
    opacity: 0,
    x: 30,
    transition: { 
      duration: 0.3,
      ease: "easeIn",
      when: "afterChildren",
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

// Info panel item animations
export const infoPanelItemVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 10
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    opacity: 0,
    y: 5,
    transition: { 
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Loading animation variants
export const loadingVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.5,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.9,
    transition: { 
      duration: 0.3,
      ease: "easeIn"
    }
  },
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop"
    }
  }
};

// Error animation variants
export const errorVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 20 
    }
  },
  exit: { 
    opacity: 0,
    y: -10,
    transition: { 
      duration: 0.3 
    }
  },
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { 
      duration: 0.6,
      ease: "easeInOut" 
    }
  }
};

// Tooltip animation variants
export const tooltipVariants: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.85,
    y: 10
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.85,
    y: 10,
    transition: { 
      duration: 0.2,
      ease: "easeIn" 
    }
  }
};

// Hover animations for interactive elements
export const hoverVariants = {
  hover: { 
    scale: 1.05,
    transition: { 
      duration: 0.2,
      ease: "easeOut" 
    }
  },
  tap: { 
    scale: 0.95,
    transition: { 
      duration: 0.1,
      ease: "easeIn" 
    }
  }
};

// Connection line animation
export const connectionLineVariants: Variants = {
  hidden: { 
    pathLength: 0,
    opacity: 0 
  },
  visible: { 
    pathLength: 1,
    opacity: 1,
    transition: { 
      pathLength: { 
        duration: 1.5, 
        ease: "easeInOut" 
      },
      opacity: { 
        duration: 0.5, 
        ease: "easeOut" 
      }
    }
  },
  exit: { 
    pathLength: 0,
    opacity: 0,
    transition: { 
      duration: 0.5,
      ease: "easeIn" 
    }
  }
};

// Node hover animation that works with Three.js objects
export const nodeHoverScale = {
  initial: 1,
  hover: 1.2,
  selected: 1.4,
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1]
};

// Globe rotation animation params
export const globeRotationParams = {
  idle: { speed: 0.002, dampingFactor: 0.95 },
  interactive: { speed: 0.005, dampingFactor: 0.85 },
  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
};

// Camera transition params compatible with Three.js
export const cameraTransitionParams = {
  duration: 1.2,
  ease: [0.16, 1, 0.3, 1],
  positionLerpFactor: 0.08,
  rotationLerpFactor: 0.06,
  zoomFactor: 0.1
};

// Helper function to apply Three.js compatible spring animation
export const applyThreeJsSpring = (
  currentValue: number,
  targetValue: number,
  velocity: { current: number },
  stiffness = 170,
  damping = 26,
  mass = 1
) => {
  const spring = -(currentValue - targetValue) * stiffness;
  const damper = -velocity.current * damping;
  const acceleration = (spring + damper) / mass;
  
  velocity.current += acceleration * 0.001;
  return currentValue + velocity.current;
};

