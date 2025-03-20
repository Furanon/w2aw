import { beforeEach, test, expect, vi, describe } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useVisualization } from "@context/VisualizationContext";

// Mock Three.js
vi.mock("three", () => {
  const mockVector3 = {
    x: 0, y: 0, z: 0,
    set: vi.fn(),
    copy: vi.fn(),
    clone: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
    lerpVectors: vi.fn(),
  };

  return {
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      render: vi.fn(),
      domElement: document.createElement("canvas"),
      dispose: vi.fn(),
      setPixelRatio: vi.fn(),
    })),
    Scene: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
    })),
    PerspectiveCamera: vi.fn(() => ({
      position: mockVector3,
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      aspect: 1,
    })),
    Vector3: vi.fn(() => mockVector3),
    Vector2: vi.fn(() => ({ x: 0, y: 0 })),
    Group: vi.fn(() => ({
      name: "",
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
    })),
    SphereGeometry: vi.fn(),
    MeshPhongMaterial: vi.fn(),
    Mesh: vi.fn(() => ({
      position: mockVector3,
      rotation: mockVector3,
      scale: mockVector3,
      userData: {},
    })),
    BufferGeometry: vi.fn(() => ({
      setFromPoints: vi.fn(),
    })),
    AmbientLight: vi.fn(() => ({
      position: mockVector3,
    })),
    PointLight: vi.fn(() => ({
      position: mockVector3,
    })),
    LineBasicMaterial: vi.fn(),
    Line: vi.fn(() => ({ name: "" })),
    __esModule: true,
  };
});

// Mock OrbitControls
vi.mock("three/examples/jsm/controls/OrbitControls", () => ({
  OrbitControls: vi.fn(() => ({
    update: vi.fn(),
    enabled: true,
    enableDamping: true,
    dampingFactor: 0.05,
    target: { x: 0, y: 0, z: 0 },
  }))
}));

// Import GeoNetworkGlobe after mocks
import GeoNetworkGlobe from "../GeoNetworkGlobe";

describe("GeoNetworkGlobe", () => {
  const mockPlaces = [
    { id: "1", name: "Place 1", location: { lat: 0, lng: 0 }, rating: 4.5, types: ["restaurant"] },
    { id: "2", name: "Place 2", location: { lat: 10, lng: 10 }, rating: 3.8, types: ["cafe"] },
  ];

  const mockFetchData = vi.fn();
  const mockSelectPlace = vi.fn();

  const setupVisualizationMock = (stateOverrides = {}) => {
    const state = {
      places: mockPlaces,
      selectedPlace: null,
      loading: false,
      error: null,
      center: { lat: 0, lng: 0 },
      view: "globe",
      visualizationData: {
        nodes: [],
        connections: []
      },
      ...stateOverrides
    };
    
    (useVisualization as any).mockReturnValue({
      state,
      fetchData: mockFetchData,
      selectPlace: mockSelectPlace
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupVisualizationMock();
  });

  test("renders the globe container", () => {
    render(<GeoNetworkGlobe />);
    expect(document.querySelector(".geo-network-globe")).toBeInTheDocument();
  });

  test("fetches data on component mount", () => {
    render(<GeoNetworkGlobe />);
    expect(mockFetchData).toHaveBeenCalled();
  });

  test("displays loading state", () => {
    setupVisualizationMock({ loading: true });
    render(<GeoNetworkGlobe />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("displays error message when error occurs", () => {
    const errorMessage = "Failed to load places";
    setupVisualizationMock({ error: errorMessage });
    render(<GeoNetworkGlobe />);
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });

  test("displays the number of locations loaded", () => {
    render(<GeoNetworkGlobe />);
    expect(screen.getByText(`${mockPlaces.length} locations loaded`)).toBeInTheDocument();
  });

  test("displays place info when a place is selected", () => {
    const selectedPlace = mockPlaces[0];
    setupVisualizationMock({ selectedPlace });
    render(<GeoNetworkGlobe />);
    
    expect(screen.getByText(selectedPlace.name)).toBeInTheDocument();
    expect(screen.getByText(`Rating: ${selectedPlace.rating}/5`)).toBeInTheDocument();
    expect(screen.getByText(`Types: ${selectedPlace.types.join(", ")}`)).toBeInTheDocument();
  });

  test("clears selected place when clear selection button is clicked", () => {
    const selectedPlace = mockPlaces[0];
    setupVisualizationMock({ selectedPlace });
    render(<GeoNetworkGlobe />);
    
    const clearButton = screen.getByText("Clear Selection");
    fireEvent.click(clearButton);
    
    expect(mockSelectPlace).toHaveBeenCalledWith(null);
  });
});
