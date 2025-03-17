import { useState, useEffect } from 'react';

export type PerformanceLevel = 'high' | 'medium' | 'low';

export interface PerformanceSettings {
  particleCount: number;
  particleSize: number;
  globeDetail: number;
  enablePostProcessing: boolean;
  enableShadows: boolean;
  maxFPS: number;
}

/**
 * A hook that detects the device's performance level and returns appropriate settings
 * for optimizing 3D rendering and particle effects.
 */
export const usePerformanceLevel = () => {
  const [performanceLevel, setPerformanceLevel] = useState<PerformanceLevel>('medium');
  const [settings, setSettings] = useState<PerformanceSettings>({
    particleCount: 1000,
    particleSize: 0.05,
    globeDetail: 32,
    enablePostProcessing: true,
    enableShadows: true,
    maxFPS: 60,
  });

  useEffect(() => {
    const detectPerformance = () => {
      // Simple device detection based on user agent and hardware concurrency
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      const cpuCores = navigator.hardwareConcurrency || 2;
      const isLowEndDevice = isMobile && cpuCores <= 4;
      const isHighEndDevice = !isMobile && cpuCores >= 8;

      // Memory detection if available
      let hasLimitedMemory = false;
      if ('deviceMemory' in navigator) {
        // @ts-ignore - deviceMemory is not in the standard type definitions
        hasLimitedMemory = (navigator.deviceMemory || 4) < 4;
      }

      // GPU detection via WebGL capabilities
      let hasGoodGPU = true;
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            // Check for signs of weaker GPUs in the renderer string
            hasGoodGPU = !(/Intel|HD Graphics|Integrated/i.test(renderer));
          }
        }
      } catch (e) {
        console.warn('WebGL detection failed', e);
      }

      // Determine final performance level
      let level: PerformanceLevel;
      if (isLowEndDevice || hasLimitedMemory || !hasGoodGPU) {
        level = 'low';
      } else if (isHighEndDevice && hasGoodGPU) {
        level = 'high';
      } else {
        level = 'medium';
      }

      setPerformanceLevel(level);

      // Set appropriate settings based on performance level
      const newSettings: PerformanceSettings = {
        particleCount: level === 'high' ? 2000 : level === 'medium' ? 1000 : 500,
        particleSize: level === 'high' ? 0.05 : level === 'medium' ? 0.08 : 0.12,
        globeDetail: level === 'high' ? 64 : level === 'medium' ? 32 : 24,
        enablePostProcessing: level !== 'low',
        enableShadows: level !== 'low',
        maxFPS: level === 'high' ? 60 : level === 'medium' ? 45 : 30,
      };

      setSettings(newSettings);
    };

    detectPerformance();
  }, []);

  return {
    performanceLevel,
    settings,
  };
};

export default usePerformanceLevel;

