import { useEffect, useState } from 'react';
import { 
  useAnimation, 
  AnimationControls, 
  Transition, 
  Variant, 
  Variants, 
  TargetAndTransition,
  VariantLabels 
} from 'framer-motion';

// Animation preset types
export type AnimationType = 'fade' | 'scale' | 'slide' | 'rotate' | 'spring' | 'custom';
export type AnimationDirection = 'up' | 'down' | 'left' | 'right' | 'none';
export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'circIn' | 'circOut' | 'circInOut' | 'backIn' | 'backOut' | 'backInOut' | 'anticipate';

// Interface for animation configurations
export interface AnimationConfig {
  type: AnimationType;
  direction?: AnimationDirection;
  duration?: number;
  delay?: number;
  staggerChildren?: number;
  delayChildren?: number;
  easing?: EasingType;
  stiffness?: number;
  damping?: number;
  mass?: number;
  bounce?: number;
  restDelta?: number;
  restSpeed?: number;
  initialVelocity?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  repeat?: number;
  custom?: Record<string, any>;
}

// Default animation configurations
const defaultConfig: AnimationConfig = {
  type: 'fade',
  direction: 'none',
  duration: 0.5,
  delay: 0,
  easing: 'easeOut',
};

// Easing presets
const easingPresets: Record<EasingType, string> = {
  linear: 'linear',
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  circIn: [0.55, 0, 1, 0.45],
  circOut: [0, 0.55, 0.45, 1],
  circInOut: [0.85, 0, 0.15, 1],
  backIn: [0.31, 0.01, 0.66, -0.59],
  backOut: [0.33, 1.53, 0.69, 0.99],
  backInOut: [0.83, -0.54, 0.17, 1.54],
  anticipate: [0.68, -0.55, 0.27, 1.55],
};

/**
 * Pre-defined animation variants for common animation types
 */
export const animationVariants = {
  // Fade animations
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Scale animations
  scale: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
  },

  // Slide animations with configurable directions
  slideUp: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -100, opacity: 0 },
  },
  slideDown: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 },
  },
  slideLeft: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
  },
  slideRight: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
  },

  // Rotation animations
  rotate: {
    initial: { rotate: -180, opacity: 0 },
    animate: { rotate: 0, opacity: 1 },
    exit: { rotate: 180, opacity: 0 },
  },

  // Spring animations for interactive elements
  spring: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  },
  
  // Button spring animation
  buttonSpring: {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  },

  // List item animations (for staggered children)
  listItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  // Page transitions
  pageTransition: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

/**
 * Creates a transition configuration based on the provided animation config
 */
const createTransition = (config: AnimationConfig): Transition => {
  const { type, duration, delay, staggerChildren, delayChildren, easing } = config;
  
  const baseTransition: Transition = {
    duration,
    delay,
    staggerChildren,
    delayChildren,
    ease: easing ? easingPresets[easing] : undefined,
  };
  
  // If it's a spring animation, add spring-specific parameters
  if (type === 'spring') {
    return {
      type: 'spring',
      stiffness: config.stiffness || 400,
      damping: config.damping || 40,
      mass: config.mass || 1,
      bounce: config.bounce,
      restDelta: config.restDelta,
      restSpeed: config.restSpeed,
      initialVelocity: config.initialVelocity,
      ...baseTransition,
    };
  }
  
  return baseTransition;
};

/**
 * Generates variant configurations based on animation type and direction
 */
const generateVariants = (config: AnimationConfig): Variants => {
  const { type, direction, custom } = config;

  // Return pre-defined variants based on type and direction
  if (type === 'slide' && direction) {
    switch (direction) {
      case 'up': return animationVariants.slideUp;
      case 'down': return animationVariants.slideDown;
      case 'left': return animationVariants.slideLeft;
      case 'right': return animationVariants.slideRight;
      default: return animationVariants.slideUp;
    }
  }

  // Return other pre-defined variants based on type
  switch (type) {
    case 'fade': return animationVariants.fade;
    case 'scale': return animationVariants.scale;
    case 'rotate': return animationVariants.rotate;
    case 'spring': return animationVariants.spring;
    case 'custom': 
      if (custom && typeof custom === 'object') {
        return custom as Variants;
      }
      return animationVariants.fade;
    default: return animationVariants.fade;
  }
};

/**
 * Hook to use the animation system with predefined animations
 */
export const useAnimationSystem = (
  initialConfig: Partial<AnimationConfig> = {}
) => {
  // Merge provided config with default config
  const config: AnimationConfig = { ...defaultConfig, ...initialConfig };
  
  // Animation controls for programmatic animations
  const controls = useAnimation();
  
  // Current animation state
  const [animationState, setAnimationState] = useState<'initial' | 'animate' | 'exit'>('initial');
  
  // Generate variants based on configuration
  const variants = generateVariants(config);
  
  // Create transition configuration
  const transition = createTransition(config);

  // Start animation with the 'animate' state
  const startAnimation = async () => {
    setAnimationState('animate');
    return controls.start('animate');
  };

  // Reset animation to 'initial' state
  const resetAnimation = async () => {
    setAnimationState('initial');
    return controls.start('initial');
  };

  // Exit animation with the 'exit' state
  const exitAnimation = async () => {
    setAnimationState('exit');
    return controls.start('exit');
  };

  // Sequence multiple animations
  const sequenceAnimations = async (
    animations: TargetAndTransition[] | VariantLabels[]
  ) => {
    return controls.start(animations as any);
  };

  // Run custom animation with specific properties
  const customAnimation = async (
    animationProps: TargetAndTransition
  ) => {
    return controls.start(animationProps);
  };

  // Helper to create staggered animations for lists
  const createStaggeredAnimation = (
    staggerAmount: number = 0.1, 
    delayChildren: number = 0
  ): Variants => {
    return {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: {
          staggerChildren: staggerAmount,
          delayChildren,
        }
      },
      exit: {
        opacity: 0,
        transition: {
          staggerChildren: staggerAmount / 2,
          staggerDirection: -1,
        }
      }
    };
  };

  // Helper to create spring animation for interactive elements
  const createSpringAnimation = (
    stiffness: number = 400, 
    damping: number = 40,
    mass: number = 1
  ): Variants => {
    return {
      initial: { scale: 1 },
      hover: { 
        scale: 1.05,
        transition: {
          type: 'spring',
          stiffness,
          damping,
          mass,
        }
      },
      tap: { 
        scale: 0.95,
        transition: {
          type: 'spring',
          stiffness,
          damping,
          mass,
        }
      }
    };
  };

  return {
    controls,
    animationState,
    variants,
    transition,
    startAnimation,
    resetAnimation,
    exitAnimation,
    sequenceAnimations,
    customAnimation,
    createStaggeredAnimation,
    createSpringAnimation,
  };
};

/**
 * Creates animation variants based on the specified configuration
 */
export const createAnimationVariants = (config: AnimationConfig): {
  variants: Variants;
  transition: Transition;
} => {
  return {
    variants: generateVariants(config),
    transition: createTransition(config),
  };
};

/**
 * Preset animations for common use cases
 */
export const presetAnimations = {
  // Basic animations
  fadeIn: createAnimationVariants({ type: 'fade', duration: 0.5 }),
  scaleIn: createAnimationVariants({ type: 'scale', duration: 0.5 }),
  
  // Page transitions
  pageEnter: createAnimationVariants({ 
    type: 'fade', 
    duration: 0.5,
    easing: 'easeOut'
  }),
  
  // Modal animations
  modalEnter: createAnimationVariants({
    type: 'scale',
    duration: 0.4,
    easing: 'backOut'
  }),
  
  // List item animations
  listItem: createAnimationVariants({
    type: 'custom',
    custom: animationVariants.listItem,
    duration: 0.3,
    easing: 'easeOut'
  }),
  
  // Button animations
  button: createAnimationVariants({
    type: 'spring',
    stiffness: 500,
    damping: 30
  }),
  
  // Notification animations
  notification: createAnimationVariants({
    type: 'slide',
    direction: 'left',
    duration: 0.4,
    easing: 'backOut'
  }),
};

export default useAnimationSystem;

