import { vi } from 'vitest';

const mockMap = {
  setView: vi.fn().mockReturnThis(),
  remove: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

const mockLayerGroup = {
  addTo: vi.fn().mockReturnThis(),
  clearLayers: vi.fn(),
  addLayer: vi.fn(),
};

const mockMarker = {
  addTo: vi.fn().mockReturnThis(),
  bindPopup: vi.fn().mockReturnThis(),
  setLatLng: vi.fn(),
  openPopup: vi.fn(),
};

const mockTileLayer = {
  addTo: vi.fn().mockReturnThis(),
};

const L = {
  map: vi.fn(() => mockMap),
  tileLayer: vi.fn(() => mockTileLayer),
  marker: vi.fn(() => mockMarker),
  LayerGroup: vi.fn(() => mockLayerGroup),
  latLng: vi.fn((lat, lng) => ({ lat, lng })),
};

// Export for direct access in tests
export const mocks = {
  map: mockMap,
  layerGroup: mockLayerGroup,
  marker: mockMarker,
  tileLayer: mockTileLayer,
};

export default L;
