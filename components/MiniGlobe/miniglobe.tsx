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
  scale = 1
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
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
      markers,
      scale,
      onRender: (state) => {
        // Called on every animation frame.
        state.phi = currentPhi;
        currentPhi += 0.005;
      }
    });

    return () => {
      globe.destroy();
    };
  }, [width, height, markers, phi, dark, mapBrightness, baseColor, markerColor, glowColor, scale]);

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
