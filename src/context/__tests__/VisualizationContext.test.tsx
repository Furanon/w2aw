import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, act, renderHook } from "@testing-library/react";
import { VisualizationProvider, useVisualization } from "../VisualizationContext";
import { useGlobeData } from "@/hooks/useGlobeData";
import { VisualizationData, VisualizationNode, VisualizationConnection, Place } from "@/types/visualization";

// Mock dependencies
vi.mock("@/hooks/useGlobeData");

describe("VisualizationContext", () => {
  const wrapper = ({ children }) => (
    <VisualizationProvider>{children}</VisualizationProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    (useGlobeData as jest.Mock).mockReturnValue({
      nodes: [],
      connections: []
    });
  });

  test("should throw error when used outside provider", () => {
    expect(() => {
      renderHook(() => useVisualization());
    }).toThrow("useVisualization must be used within a VisualizationProvider");
  });

  test("should return null when used with standalone flag", () => {
    const { result } = renderHook(() => useVisualization(true));
    expect(result.current).toBeNull();
  });

  test("should provide initial state", () => {
    const { result } = renderHook(() => useVisualization(), { wrapper });
    
    expect(result.current.state).toMatchObject({
      places: [],
      loading: false,
      error: null,
      selectedPlace: null,
      view: "globe"
    });
    expect(result.current.state.visualizationData).toBeDefined();
  });

  test("should fetch and process data successfully", async () => {
    const mockVisData: VisualizationData = {
      nodes: [{
        id: "1",
        name: "Sample Place",
        position: [1, 1, 1],
        rating: 4.5,
        type: "test",
        color: 0x000000
      }],
      connections: []
    };

    const { result } = renderHook(() => useVisualization(), { wrapper });

    await act(async () => {
      await result.current.fetchData({ lat: 0, lng: 0 });
    });

    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.places).toHaveLength(1);
    expect(result.current.state.visualizationData).toBeDefined();
  });

  test("should handle fetch data error", async () => {
    const { result } = renderHook(() => useVisualization(), { wrapper });

    await act(async () => {
      await result.current.fetchData({ lat: 999, lng: 999 }); // Invalid coordinates
    });

    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeDefined();
  });

  test("should update selected place", () => {
    const { result } = renderHook(() => useVisualization(), { wrapper });
    const testPlace: Place = {
      id: "1",
      name: "Test Place",
      location: { lat: 0, lng: 0 },
      rating: 4.5,
      types: ["test"],
      photos: []
    };

    act(() => {
      result.current.selectPlace(testPlace);
    });

    expect(result.current.state.selectedPlace).toEqual(testPlace);
  });

  test("should update view mode", () => {
    const { result } = renderHook(() => useVisualization(), { wrapper });

    act(() => {
      result.current.setView("map");
    });

    expect(result.current.state.view).toBe("map");
  });

  test("should use globe data when visualization data is null", () => {
    const mockGlobeData: VisualizationData = {
      nodes: [{
        id: "globe1",
        name: "Globe Test",
        position: [1, 1, 1],
        rating: 4.5,
        type: "test"
      }],
      connections: []
    };
    (useGlobeData as jest.Mock).mockReturnValue(mockGlobeData);

    const { result } = renderHook(() => useVisualization(), { wrapper });

    expect(result.current.state.visualizationData).toEqual(mockGlobeData);
  });
});
