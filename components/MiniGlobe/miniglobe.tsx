import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import styles from "./styles.module.css";

interface MiniGlobeProps {
  width?: number;
  height?: number;
  markers?: Array<{
    location: [number, number];
    size: number;
  }>;
  phi?: number;
  dark?: number;
  mapBrightness?: number;
  baseColor?: [number, number, number];
  markerColor?: [number, number, number];
  glowColor?: [number, number, number];
  scale?: number;
  continentColors?: Array<[number, number, number]>;
}

export default function MiniGlobe({
  width = 600,
  height = 600,
  markers = [
    { location: [37.7595, -122.4367], size: 0.03 },
    { location: [40.7128, -74.006], size: 0.1 }
  ],
  phi = 0,
  dark = 1,
  mapBrightness = 6,
  baseColor = [0.3, 0.3, 0.3],
  markerColor = [0.1, 0.8, 1],
  glowColor = [1, 1, 1],
  scale = 1,
  continentColors = [
    [0.3, 0.3, 0.3],   // Default
    [0.2, 0.5, 0.8],   // North America
    [0.8, 0.3, 0.2],   // South America
    [0.1, 0.6, 0.4],   // Europe
    [0.9, 0.7, 0.1],   // Africa
    [0.7, 0.2, 0.5],   // Asia
    [0.5, 0.8, 0.2],   // Australia/Oceania
    [0.8, 0.8, 0.8]    // Antarctica
  ]
}: MiniGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let currentPhi = phi;
    let currentCanvas = canvasRef.current;

    if (!currentCanvas) return;

    const globe = createGlobe(currentCanvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: height * 2,
      phi: currentPhi,
      theta: 0,
      dark,
      diffuse: 1.2,
      mapSamples: 16000,
      mapColor: (coordinates, texture) => {
        const [lat, long] = coordinates;
        // Normalize longitude to -180 to 180 range
        const normalizedLong = ((long + 180) % 360) - 180;
        
        // North America: long -170 to -30, lat 15 to 70
        if (normalizedLong >= -170 && normalizedLong <= -30 && lat >= 15 && lat <= 70) {
          return 1; // Index for North America color
        }
        // South America: long -80 to -35, lat -60 to 15
        else if (normalizedLong >= -80 && normalizedLong <= -35 && lat >= -60 && lat <= 15) {
          return 2; // Index for South America color
        }
        // Europe: long -10 to 40, lat 35 to 70
        else if (normalizedLong >= -10 && normalizedLong <= 40 && lat >= 35 && lat <= 70) {
          return 3; // Index for Europe color
        }
        // Africa: long -20 to 60, lat -35 to 35
        else if (normalizedLong >= -20 && normalizedLong <= 60 && lat >= -35 && lat <= 35) {
          return 4; // Index for Africa color
        }
        // Asia: long 40 to 180, lat 0 to 75
        else if (normalizedLong >= 40 && normalizedLong <= 180 && lat >= 0 && lat <= 75) {
          return 5; // Index for Asia color
        }
        // Australia/Oceania: long 110 to 180, lat -50 to 0
        else if (normalizedLong >= 110 && normalizedLong <= 180 && lat >= -50 && lat <= 0) {
          return 6; // Index for Australia/Oceania color
        }
        // Antarctica: lat < -60
        else if (lat < -60) {
          return 7; // Index for Antarctica color
        }
        
        return texture ? 0 : -1; // Default color or ocean
      },
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
      markers,
      scale,
      opacity: 1,
      mapColors: continentColors,
      onRender: (state) => {
        // Called on every animation frame.
        state.phi = currentPhi;
        currentPhi += 0.005;
      }
    });

    return () => {
      globe.destroy();
    };
  }, [width, height, markers, phi, dark, mapBrightness, baseColor, markerColor, glowColor, scale, continentColors]);

  return (
    <div className={styles.globeContainer}>
      <canvas
        ref={canvasRef}
        style={{
          width: width,
          height: height,
          maxWidth: "100%",
          aspectRatio: "1"
        }}
      />
    </div>
  );
}
