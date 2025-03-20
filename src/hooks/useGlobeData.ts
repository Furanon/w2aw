import { useMemo } from "react";
import { VisualizationNode, VisualizationConnection, VisualizationData, latLngToCartesian } from "@/types/visualization";

export const useGlobeData = (): VisualizationData => {
  return useMemo(() => {
    // Mock data for initial globe visualization
    const mockNodes: VisualizationNode[] = [
      {
        id: "sample1",
        name: "Sample Location 1",
        position: latLngToCartesian(35.6762, 139.6503), // Tokyo
        rating: 4.5,
        type: "city"
      },
      {
        id: "sample2",
        name: "Sample Location 2",
        position: latLngToCartesian(40.7128, -74.0060), // New York
        rating: 4.8,
        type: "city"
      },
      {
        id: "sample3",
        name: "Sample Location 3",
        position: latLngToCartesian(51.5074, -0.1278), // London
        rating: 4.6,
        type: "city"
      }
    ];

    const mockConnections: VisualizationConnection[] = [
      {
        source: "sample1",
        target: "sample2",
        type: "route",
        weight: 0.8
      },
      {
        source: "sample2",
        target: "sample3",
        type: "route",
        weight: 0.6
      }
    ];

    return {
      nodes: mockNodes,
      connections: mockConnections
    };
  }, []); // Empty dependency array since we are not using any external data yet
};
