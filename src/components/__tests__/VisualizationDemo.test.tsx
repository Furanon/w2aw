import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useVisualization } from "@context/VisualizationContext";
import VisualizationDemo from "../VisualizationDemo";

// Mock the useVisualization hook
vi.mock("@context/VisualizationContext", () => ({
  useVisualization: vi.fn()
}));

// Mock the child components
vi.mock("../GeoNetworkGlobe", () => ({
  default: vi.fn(() => <div data-testid="mock-globe">Mock Globe</div>)
}));

vi.mock("../MapView", () => ({
  default: vi.fn(() => <div data-testid="mock-map">Mock Map</div>)
}));

describe("VisualizationDemo", () => {
  const mockDispatch = vi.fn();

  // Setup function to mock the useVisualization hook with different states
  const setupVisualizationMock = (stateOverrides = {}) => {
    const state = {
      view: "map",
      loading: false,
      error: null,
      places: [],
      selectedPlace: null,
      center: { lat: 0, lng: 0 },
      ...stateOverrides
    };
    
    (useVisualization as jest.Mock).mockReturnValue({
      state,
      dispatch: mockDispatch
    });
  };

  beforeEach(() => {
    mockDispatch.mockReset();
  });

  test("renders with default map view", () => {
    setupVisualizationMock();
    render(<VisualizationDemo />);

    expect(screen.getByTestId("visualization-demo")).toBeInTheDocument();
    expect(screen.getByTestId("mock-map")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-globe")).not.toBeInTheDocument();
  });

  test("switches from map to globe view", () => {
    setupVisualizationMock();
    render(<VisualizationDemo />);

    const globeButton = screen.getByRole("button", { name: /globe view/i });
    fireEvent.click(globeButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SET_VIEW",
      payload: "globe"
    });
  });

  test("switches from globe to map view", () => {
    setupVisualizationMock({ view: "globe" });
    render(<VisualizationDemo />);

    expect(screen.getByTestId("mock-globe")).toBeInTheDocument();
    
    const mapButton = screen.getByRole("button", { name: /map view/i });
    fireEvent.click(mapButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SET_VIEW",
      payload: "map"
    });
  });

  test("shows loading state", () => {
    setupVisualizationMock({ loading: true });
    render(<VisualizationDemo />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  test("shows error message", () => {
    const errorMessage = "Test error message";
    setupVisualizationMock({ error: errorMessage });
    render(<VisualizationDemo />);

    const errorElement = screen.getByTestId("error-message");
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveTextContent(errorMessage);
  });
});
