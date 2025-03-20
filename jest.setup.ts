import React from "react";
import "@testing-library/jest-dom";

// Type definitions for global mocks
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveTextContent(content: string | RegExp): R;
    }
  }
}

// Mock for three.js related modules
jest.mock("three", () => {
  const actualThree = jest.requireActual("three");
  
  return {
    ...actualThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      shadowMap: {},
      domElement: document.createElement("canvas"),
      dispose: jest.fn(),
    })),
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      children: [],
      remove: jest.fn(),
    })),
    PerspectiveCamera: jest.fn().mockImplementation(() => ({
      aspect: 1,
      position: { set: jest.fn() },
      lookAt: jest.fn(),
    })),
    Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z, set: jest.fn() })),
    Color: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
    })),
    Mesh: jest.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      material: {},
      geometry: {},
    })),
    Group: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      children: [],
      position: { x: 0, y: 0, z: 0 },
    })),
  };
});

// Mock for @react-three/fiber
jest.mock("@react-three/fiber", () => {
  return {
    Canvas: ({ children }) => React.createElement("div", { "data-testid": "mock-canvas" }, children),
    useThree: jest.fn().mockReturnValue({
      camera: { position: { set: jest.fn() } },
      gl: { domElement: document.createElement("canvas") },
      scene: { add: jest.fn(), children: [] },
    }),
    useFrame: jest.fn(),
  };
});

// Mock for @react-three/drei
jest.mock("@react-three/drei", () => {
  return {
    OrbitControls: () => React.createElement("div", { "data-testid": "mock-orbit-controls" }),
    Text: ({ children, ...props }) => React.createElement("div", { "data-testid": "mock-text", ...props }, children),
    Sphere: (props) => React.createElement("div", { "data-testid": "mock-sphere", ...props }),
    Line: (props) => React.createElement("div", { "data-testid": "mock-line", ...props }),
  };
});

// Mock for tsparticles
jest.mock("tsparticles", () => {
  return {
    loadFull: jest.fn().mockResolvedValue(undefined),
    Engine: {
      init: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock for react-tsparticles
jest.mock("react-tsparticles", () => {
  return {
    __esModule: true,
    default: ({ options }) => React.createElement("div", {
      "data-testid": "mock-particles",
      "data-options": JSON.stringify(options),
    }),
  };
});

// Mock for Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: "/",
    query: {},
  }),
  usePathname: jest.fn().mockReturnValue("/"),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}));

// DOM environment setup
if (typeof window !== "undefined") {
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    })),
  });

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    })),
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock fetch API
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    blob: () => Promise.resolve(new Blob()),
  })
) as jest.Mock;
