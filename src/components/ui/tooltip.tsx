
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The content to display in the tooltip
   */
  content: React.ReactNode;
  
  /**
   * The element that triggers the tooltip
   */
  children: React.ReactNode;
  
  /**
   * The delay before showing the tooltip (in ms)
   */
  delay?: number;
  
  /**
   * The position of the tooltip relative to the trigger
   */
  position?: "top" | "right" | "bottom" | "left";
  
  /**
   * Whether the tooltip is always visible
   */
  alwaysVisible?: boolean;
  
  /**
   * Whether the tooltip should show on touch devices
   */
  enableOnTouch?: boolean;
  
  /**
   * Use guided tour mode (controlled externally)
   */
  isTourStep?: boolean;
  
  /**
   * Mark tooltip as an important feature hint
   */
  isFeatureHint?: boolean;
  
  /**
   * Additional content to display (like keyboard shortcuts)
   */
  secondaryContent?: React.ReactNode;
}

/**
 * Animated tooltip component for providing helpful context
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  delay = 200,
  position = "top",
  alwaysVisible = false,
  enableOnTouch = false,
  isTourStep = false,
  isFeatureHint = false,
  secondaryContent,
  className,
  ...props
}) => {
  const [show, setShow] = React.useState(alwaysVisible || isTourStep);
  const [isMounted, setIsMounted] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  
  // Wait for mounting to avoid hydration issues
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Synchronize with controlled tour step mode
  React.useEffect(() => {
    if (isTourStep) {
      setShow(true);
    } else if (!alwaysVisible) {
      setShow(false);
    }
  }, [isTourStep, alwaysVisible]);
  
  // Handle mouse events
  const handleMouseEnter = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (!show) {
      timerRef.current = setTimeout(() => {
        setShow(true);
      }, delay);
    }
  }, [delay, show]);
  
  const handleMouseLeave = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (show && !alwaysVisible && !isTourStep) {
      timerRef.current = setTimeout(() => {
        setShow(false);
      }, 100);
    }
  }, [show, alwaysVisible, isTourStep]);
  
  // Handle touch events
  const handleTouchStart = React.useCallback(() => {
    if (enableOnTouch) {
      handleMouseEnter();
    }
  }, [enableOnTouch, handleMouseEnter]);
  
  const handleTouchEnd = React.useCallback(() => {
    if (enableOnTouch) {
      handleMouseLeave();
    }
  }, [enableOnTouch, handleMouseLeave]);
  
  // Clean up timers
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // Set position styles
  const getPositionStyles = React.useCallback(() => {
    if (!triggerRef.current) return {};
    
    const rect = triggerRef.current.getBoundingClientRect();
    
    switch (position) {
      case "top":
        return {
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%) translateY(-8px)",
        };
      case "right":
        return {
          left: "100%",
          top: "50%",
          transform: "translateY(-50%) translateX(8px)",
        };
      case "bottom":
        return {
          top: "100%",
          left: "50%",
          transform: "translateX(-50%) translateY(8px)",
        };
      case "left":
        return {
          right: "100%",
          top: "50%",
          transform: "translateY(-50%) translateX(-8px)",
        };
      default:
        return {
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%) translateY(-8px)",
        };
    }
  }, [position]);
  
  // Animation variants
  const tooltipVariants = {
    initial: {
      opacity: 0,
      scale: 0.9,
      ...getPositionStyles(),
    },
    visible: {
      opacity: 1,
      scale: 1,
      ...getPositionStyles(),
      transition: {
        duration: 0.15,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      ...getPositionStyles(),
      transition: {
        duration: 0.1,
        ease: "easeIn",
      },
    },
  };
  
  // Get the triangle/pointer position class
  const getTriangleClass = () => {
    switch (position) {
      case "top":
        return "before:bottom-[-6px] before:left-1/2 before:ml-[-6px] before:border-t-current before:border-r-transparent before:border-b-transparent before:border-l-transparent";
      case "right":
        return "before:left-[-6px] before:top-1/2 before:mt-[-6px] before:border-t-transparent before:border-r-current before:border-b-transparent before:border-l-transparent";
      case "bottom":
        return "before:top-[-6px] before:left-1/2 before:ml-[-6px] before:border-t-transparent before:border-r-transparent before:border-b-current before:border-l-transparent";
      case "left":
        return "before:right-[-6px] before:top-1/2 before:mt-[-6px] before:border-t-transparent before:border-r-transparent before:border-b-transparent before:border-l-current";
      default:
        return "before:bottom-[-6px] before:left-1/2 before:ml-[-6px] before:border-t-current before:border-r-transparent before:border-b-transparent before:border-l-transparent";
    }
  };
  
  if (!isMounted) {
    return <div ref={triggerRef}>{children}</div>;
  }
  
  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {children}
      
      <AnimatePresence>
        {show && (
          <motion.div
            className={cn(
              "absolute z-50 rounded-md bg-background p-2 text-sm text-foreground shadow-md border border-muted",
              "before:absolute before:size-0 before:border-[6px]",
              getTriangleClass(),
              isFeatureHint && "ring-2 ring-blue-500 border-blue-400/20 shadow-lg shadow-blue-500/10",
              className
            )}
            variants={tooltipVariants}
            initial="initial"
            animate="visible"
            exit="exit"
          >
            <div>
              {isFeatureHint && (
                <div className="mb-1 font-semibold text-blue-500">New Feature</div>
              )}
              
              <div className="max-w-xs">{content}</div>
              
              {secondaryContent && (
                <div className="mt-1 pt-1 border-t border-muted text-xs text-muted-foreground">
                  {secondaryContent}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;

