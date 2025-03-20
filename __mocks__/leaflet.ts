import { vi } from 'vitest';

const mockLatLng = vi.fn().mockImplementation((lat, lng) => ({ lat, lng }));
const mockMarker = vi.fn().mockImplementation(() => ({
  setLatLng: vi.fn(),
  addTo: vi.fn(),
  remove: vi.fn(),
  bindPopup: vi.fn(),
  openPopup: vi.fn(),
  closePopup: vi.fn(),
}));

const L = {
  map: vi.fn().mockReturnValue({
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  }),
  tileLayer: vi.fn().mockReturnValue({
    addTo: vi.fn(),
    remove: vi.fn(),
  }),
  marker: mockMarker,
  latLng: mockLatLng,
  LatLng: mockLatLng,
  DivIcon: vi.fn().mockImplementation(() => ({})),
};

export default L;

