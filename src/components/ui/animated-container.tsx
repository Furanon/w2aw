import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimationSystem, AnimationConfig, presetAnimations } from '@/hooks/useAnimationSystem';

interface AnimatedContainerProps {
  children: ReactNode;
  isVisible?: boolean;
  animationConfig?: Partial<AnimationConfig>;
  className?: string;
  animateOnMount?: boolean;
  layoutId?: string;
  onExitComplete?: () => void;
}

/**
 * A container component that provides animation capabilities
 * Wraps content in Framer Motion components for smooth transitions
 */
export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  isVisible = true,
  animationConfig = {},
  className = '',
  animateOnMount = true,
  layoutId,
  onExitComplete,
}) => {
  const { variants, transition } = useAnimationSystem(animationConfig);

  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      {isVisible && (
        <motion.div
          className={className}
          initial={animateOnMount ? 'initial' : false}
          animate="animate"
          exit="exit"
          variants={variants}
          transition={transition}
          layoutId={layoutId}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Animated card component for content blocks with smooth transitions
 */
export const AnimatedCard: React.FC<AnimatedContainerProps> = ({
  children,
  isVisible = true,
  animationConfig = { type: 'fade', duration: 0.3 },
  className = '',
  animateOnMount = true,
  layoutId,
  onExitComplete,
}) => {
  return (
    <AnimatedContainer
      isVisible={isVisible}
      animationConfig={animationConfig}
      className={`bg-card rounded-lg shadow-md overflow-hidden ${className}`}
      animateOnMount={animateOnMount}
      layoutId={layoutId}
      onExitComplete={onExitComplete}
    >
      {children}
    </AnimatedContainer>
  );
};

/**
 * Animated list that staggers the animation of its children
 */
export const AnimatedList: React.FC<{
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}> = ({ children, className = '', staggerDelay = 0.05 }) => {
  const { createStaggeredAnimation } = useAnimationSystem();
  const containerVariants = createStaggeredAnimation(staggerDelay);

  return (
    <motion.ul
      className={className}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {React.Children.map(children, (child, index) => (
        <motion.li key={index} variants={presetAnimations.listItem.variants}>
          {child}
        </motion.li>
      ))}
    </motion.ul>
  );
};

/**
 * Animated transitioner for view switching
 * Provides smooth transitions between different views or states
 */
export const ViewTransition: React.FC<{
  children: ReactNode;
  view: string | number;
  className?: string;
}> = ({ children, view, className = '' }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedContainer;

