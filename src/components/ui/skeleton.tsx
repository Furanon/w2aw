
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The width of the skeleton (default: full width)
   */
  width?: string | number;
  
  /**
   * The height of the skeleton (default: 1rem)
   */
  height?: string | number;
  
  /**
   * Whether to make the skeleton rounded (default: false)
   */
  rounded?: boolean;
  
  /**
   * Whether to show a shimmer effect (default: true)
   */
  shimmer?: boolean;
  
  /**
   * Whether to show the skeleton (useful for conditional rendering)
   */
  show?: boolean;
  
  /**
   * Time in milliseconds before skeleton starts fading out (0 means no auto hide)
   */
  hideAfter?: number;
}

/**
 * Skeleton loader component with optional shimmer effect
 * Used for content placeholders during loading
 */
export function Skeleton({
  className,
  width,
  height = "1rem",
  rounded = false,
  shimmer = true,
  show = true,
  hideAfter = 0,
  ...props
}: SkeletonProps) {
  const [visible, setVisible] = useState(show);
  const [fadeOut, setFadeOut] = useState(false);
  
  // Handle auto-hiding
  useEffect(() => {
    setVisible(show);
    
    if (show && hideAfter > 0) {
      const timer = setTimeout(() => {
        setFadeOut(true);
        
        // After animation completes, hide completely
        const hideTimer = setTimeout(() => {
          setVisible(false);
        }, 500); // Match animation duration
        
        return () => clearTimeout(hideTimer);
      }, hideAfter);
      
      return () => clearTimeout(timer);
    }
    
    setFadeOut(false);
  }, [show, hideAfter]);
  
  if (!visible) return null;
  
  const shimmerAnimation = {
    initial: { backgroundPosition: "-200% 0" },
    animate: { 
      backgroundPosition: "200% 0",
      transition: { 
        repeat: Infinity, 
        duration: 1.5, 
        ease: "linear" 
      }
    }
  };
  
  const fadeAnimation = {
    initial: { opacity: 1 },
    animate: { opacity: fadeOut ? 0 : 1 },
    transition: { duration: 0.5 }
  };
  
  const skeletonStyle = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    background: shimmer 
      ? "linear-gradient(90deg, var(--skeleton-from, rgba(0,0,0,0.05)) 25%, var(--skeleton-to, rgba(0,0,0,0.1)) 50%, var(--skeleton-from, rgba(0,0,0,0.05)) 75%)"
      : "var(--skeleton-base, rgba(0,0,0,0.08))",
    backgroundSize: shimmer ? "200% 100%" : "auto",
  };

  return (
    <motion.div
      className={cn(
        "animate-in fade-in zoom-in",
        rounded ? "rounded-full" : "rounded-md",
        className
      )}
      style={skeletonStyle}
      variants={shimmer ? shimmerAnimation : undefined}
      initial="initial"
      animate="animate"
      {...fadeAnimation}
      {...props}
    />
  );
}

/**
 * Text skeleton that mimics a paragraph with lines
 */
export function TextSkeleton({
  lines = 3,
  className,
  lastLineWidth = 75,
  lineHeight = "0.75rem",
  gap = "0.5rem",
  ...props
}: {
  lines?: number;
  className?: string;
  lastLineWidth?: number;
  lineHeight?: string;
  gap?: string;
} & Omit<SkeletonProps, 'height'>) {
  return (
    <div className={cn("flex flex-col", className)} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 && lastLineWidth ? `${lastLineWidth}%` : '100%'}
          {...props}
        />
      ))}
    </div>
  );
}

/**
 * Calendar skeleton that mimics a calendar grid
 */
export function CalendarSkeleton({
  rows = 4,
  columns = 7,
  className,
  cellClassName,
  cellHeight = "4rem",
  cellWidth = "100%",
  gap = "0.25rem",
  header = true,
  ...props
}: {
  rows?: number;
  columns?: number;
  className?: string;
  cellClassName?: string;
  cellHeight?: string | number;
  cellWidth?: string | number;
  gap?: string;
  header?: boolean;
} & Omit<SkeletonProps, 'height' | 'width'>) {
  return (
    <div className={cn("w-full", className)}>
      {/* Optional header row */}
      {header && (
        <div className="flex gap-1 mb-2">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              height="1.5rem"
              width="100%"
              className={cn("mb-2", cellClassName)}
              {...props}
            />
          ))}
        </div>
      )}
      
      {/* Calendar grid */}
      <div className="grid" style={{ 
        gridTemplateColumns: `repeat(${columns}, 1fr)`, 
        gap 
      }}>
        {Array.from({ length: rows * columns }).map((_, i) => (
          <Skeleton
            key={`cell-${i}`}
            height={cellHeight}
            width={cellWidth}
            className={cellClassName}
            {...props}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Map skeleton that mimics a map with markers
 */
export function MapSkeleton({
  className,
  height = "400px",
  width = "100%",
  markerCount = 5,
  ...props
}: {
  className?: string;
  markerCount?: number;
} & SkeletonProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ height, width }}>
      {/* Base map */}
      <Skeleton
        className="absolute inset-0"
        shimmer={false}
        {...props}
      />
      
      {/* Random markers */}
      {Array.from({ length: markerCount }).map((_, i) => {
        const top = Math.random() * 80 + 10; // 10-90%
        const left = Math.random() * 80 + 10; // 10-90%
        
        return (
          <Skeleton
            key={`marker-${i}`}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            height={12}
            width={12}
            rounded
            style={{ top: `${top}%`, left: `${left}%` }}
            {...props}
          />
        );
      })}
    </div>
  );
}

/**
 * Filter bar skeleton that mimics a filter interface
 */
export function FilterBarSkeleton({
  className,
  chipCount = 6,
  inputCount = 2,
  ...props
}: {
  className?: string;
  chipCount?: number;
  inputCount?: number;
} & Omit<SkeletonProps, 'height' | 'width'>) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: chipCount }).map((_, i) => (
          <Skeleton
            key={`chip-${i}`}
            height="2rem"
            width={60 + Math.random() * 40} // Random widths between 60-100px
            className="rounded-full"
            {...props}
          />
        ))}
      </div>
      
      {/* Filter inputs */}
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: inputCount }).map((_, i) => (
          <Skeleton
            key={`input-${i}`}
            height="2.5rem"
            width="180px"
            {...props}
          />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-800", className)}
      {...props}
    />
  )
}

export { Skeleton }
