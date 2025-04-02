'use client';

import { ReactNode } from 'react';

interface VideoBackgroundProps {
  src: string;
  poster?: string;
  children?: ReactNode;
  overlayOpacity?: string; // Tailwind opacity class like 'opacity-50'
  overlayBlur?: string; // Tailwind blur class like 'blur-sm'
  objectFit?: 'cover' | 'contain' | 'fill'; // Tailwind object-fit options
  priority?: boolean; // Whether video should load with priority
  muted?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}

/**
 * VideoBackground - A full-screen video background component with overlay
 * 
 * @param src - Video source URL
 * @param poster - Optional poster image to show while video loads
 * @param children - Content to display over the video
 * @param overlayOpacity - Tailwind opacity class for the overlay
 * @param overlayBlur - Tailwind blur class for the overlay
 * @param objectFit - How the video should fit the container
 * @param priority - Whether the video should load with priority
 * @param muted - Whether the video should be muted
 * @param autoPlay - Whether the video should autoplay
 * @param loop - Whether the video should loop
 */
const VideoBackground = ({
  src,
  poster,
  children,
  overlayOpacity = 'opacity-50',
  overlayBlur = 'blur-sm',
  objectFit = 'cover',
  priority = false,
  muted = true,
  autoPlay = true,
  loop = true,
}: VideoBackgroundProps) => {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Video element */}
      <video
        className={`absolute top-0 left-0 min-w-full min-h-full w-auto h-auto object-${objectFit} z-0`}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        poster={poster}
        preload={priority ? 'auto' : 'metadata'}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Semi-transparent blurred overlay */}
      <div 
        className={`absolute top-0 left-0 w-full h-full bg-black ${overlayOpacity} ${overlayBlur} z-10`}
        aria-hidden="true"
      ></div>

      {/* Content container */}
      <div className="relative w-full h-full z-20">
        {children}
      </div>
    </div>
  );
};

export default VideoBackground;

