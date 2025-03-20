import { vi } from 'vitest';

export const Raycaster = vi.fn().mockImplementation(() => ({
  setFromCamera: vi.fn(),
  intersectObjects: vi.fn().mockReturnValue([]),
}));

export const Vector2 = vi.fn().mockImplementation(() => ({
  x: 0,
  y: 0,
  set: vi.fn(),
}));

export const Vector3 = vi.fn().mockImplementation(() => ({
  x: 0,
  y: 0,
  z: 0,
  set: vi.fn(),
  normalize: vi.fn(),
}));

export const Scene = vi.fn().mockImplementation(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  children: [],
}));

export const WebGLRenderer = vi.fn().mockImplementation(() => ({
  setSize: vi.fn(),
  render: vi.fn(),
  domElement: document.createElement('canvas'),
  setPixelRatio: vi.fn(),
}));

export const PerspectiveCamera = vi.fn().mockImplementation(() => ({
  position: { set: vi.fn() },
  lookAt: vi.fn(),
  aspect: 1,
  updateProjectionMatrix: vi.fn(),
}));

export const Group = vi.fn().mockImplementation(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  rotation: { x: 0, y: 0, z: 0 },
}));
export const BoxGeometry = vi.fn();
export const SphereGeometry = vi.fn();
export const MeshBasicMaterial = vi.fn();
export const MeshPhongMaterial = vi.fn();
export const Mesh = vi.fn().mockImplementation(() => ({
  position: { set: vi.fn() },
  rotation: { set: vi.fn() },
  scale: { set: vi.fn() },
}));

export const AmbientLight = vi.fn();
export const DirectionalLight = vi.fn().mockImplementation(() => ({
  position: { set: vi.fn() },
}));

export const Color = vi.fn();
export const LineBasicMaterial = vi.fn();
export const BufferGeometry = vi.fn();
export const Line = vi.fn();
export const LineSegments = vi.fn();
export const Points = vi.fn();
export const PointsMaterial = vi.fn();
export const WireframeGeometry = vi.fn();
