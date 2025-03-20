import { vi } from 'vitest';

const mockRenderer = {
  setSize: vi.fn(),
  render: vi.fn(),
  domElement: document.createElement('canvas'),
  dispose: vi.fn(),
};

const mockScene = {
  add: vi.fn(),
  remove: vi.fn(),
};

const mockCamera = {
  position: { set: vi.fn() },
  lookAt: vi.fn(),
};

const mockRaycaster = {
  setFromCamera: vi.fn(),
  intersectObjects: vi.fn().mockReturnValue([]),
};

const mockVector2 = {
  x: 0,
  y: 0,
  set: vi.fn(),
};

const mockVector3 = {
  x: 0,
  y: 0,
  z: 0,
  set: vi.fn(),
};

const mockGroup = {
  add: vi.fn(),
  remove: vi.fn(),
  children: [],
  rotation: { x: 0, y: 0 },
};

const mockMesh = {
  position: { set: vi.fn() },
  userData: {},
};

const mockClock = {
  getElapsedTime: vi.fn().mockReturnValue(0),
};

export default {
  WebGLRenderer: vi.fn(() => mockRenderer),
  Scene: vi.fn(() => mockScene),
  PerspectiveCamera: vi.fn(() => mockCamera),
  Group: vi.fn(() => mockGroup),
  SphereGeometry: vi.fn(),
  MeshBasicMaterial: vi.fn(),
  Mesh: vi.fn(() => mockMesh),
  Raycaster: vi.fn(() => mockRaycaster),
  Vector2: vi.fn(() => mockVector2),
  Vector3: vi.fn(() => mockVector3),
  Clock: vi.fn(() => mockClock),
};

export const mocks = {
  renderer: mockRenderer,
  scene: mockScene,
  camera: mockCamera,
  group: mockGroup,
  mesh: mockMesh,
  raycaster: mockRaycaster,
  vector2: mockVector2,
  vector3: mockVector3,
  clock: mockClock,
};
