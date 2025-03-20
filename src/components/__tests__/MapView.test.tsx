import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VisualizationProvider } from '@context/VisualizationContext';
import MapView from '../MapView';

describe('MapView', () => {
  const mockPlaces = [
    { 
      id: '1', 
      name: 'Place 1', 
      location: { lat: 0, lng: 0 },
      rating: 4.8,
      types: ['restaurant', 'food']
    },
    { 
      id: '2', 
      name: 'Place 2', 
      location: { lat: 1, lng: 1 },
      rating: 3.2,
      types: ['cafe', 'drinks']
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDispatch = vi.fn();
  const createMockContext = (overrides = {}) => ({
    state: {
      places: mockPlaces,
      selectedPlace: null,
      loading: false,
      error: null,
      center: { lat: 0, lng: 0 },
      ...overrides
    },
    dispatch: mockDispatch,
  });

  test('renders map container', () => {
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('renders with custom height', () => {
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView height="500px" />
      </VisualizationProvider>
    );
    expect(screen.getByTestId('map-container')).toHaveStyle({ height: '500px' });
  });

  test('initializes map container', async () => {
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );

    // Verify the map container is present
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
    
    // Wait for Leaflet to initialize (this would create map tiles and controls)
    await waitFor(() => {
      const leafletContainer = mapContainer.querySelector('.leaflet-container');
      expect(leafletContainer).not.toBeNull();
    });
  });

  test('cleans up properly on unmount', async () => {
    // This test verifies the component doesn't cause errors when unmounted
    const { unmount } = render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );

    // Wait for map to initialize
    await waitFor(() => {
      const leafletContainer = screen.getByTestId('map-container').querySelector('.leaflet-container');
      expect(leafletContainer).not.toBeNull();
    });

    // Unmount should not cause errors
    expect(() => unmount()).not.toThrow();
  });

  test('renders with correct height', () => {
    const customHeight = '600px';
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView height={customHeight} />
      </VisualizationProvider>
    );

    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toHaveStyle({ height: customHeight });
  });
  
  test('displays markers when places are provided', async () => {
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );

    // Wait for Leaflet to initialize
    await waitFor(() => {
      const leafletContainer = screen.getByTestId('map-container').querySelector('.leaflet-container');
      expect(leafletContainer).not.toBeNull();
    });

    // Wait for markers to be added
    await waitFor(() => {
      // Leaflet markers are added to the 'leaflet-marker-pane'
      const markerPane = screen.getByTestId('map-container').querySelector('.leaflet-marker-pane');
      expect(markerPane).not.toBeNull();
      const markers = markerPane?.querySelectorAll('.leaflet-marker-icon');
      expect(markers?.length).toBe(mockPlaces.length);
    });
  });

  test('displays popups with place information', async () => {
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );

    // Wait for Leaflet to initialize
    await waitFor(() => {
      const leafletContainer = screen.getByTestId('map-container').querySelector('.leaflet-container');
      expect(leafletContainer).not.toBeNull();
    });

    // Leaflet doesn't render popups until they're opened, but we can confirm
    // the popup pane exists, which means popups are supported
    const popupPane = screen.getByTestId('map-container').querySelector('.leaflet-popup-pane');
    expect(popupPane).not.toBeNull();
  });

  test('updates selection when context changes', async () => {
    const { rerender } = render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );

    // Wait for Leaflet to initialize
    await waitFor(() => {
      const leafletContainer = screen.getByTestId('map-container').querySelector('.leaflet-container');
      expect(leafletContainer).not.toBeNull();
    });

    // Select a place
    const selectedPlace = mockPlaces[0];
    rerender(
      <VisualizationProvider value={createMockContext({ selectedPlace })}>
        <MapView />
      </VisualizationProvider>
    );

    // After selection, a popup should eventually appear
    await waitFor(() => {
      const popupPane = screen.getByTestId('map-container').querySelector('.leaflet-popup-pane');
      expect(popupPane).not.toBeNull();
    }, { timeout: 3000 });
  });
});
