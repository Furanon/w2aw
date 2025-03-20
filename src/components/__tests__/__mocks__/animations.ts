import { vi } from 'vitest';

export default {
  controls: {
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  },
  variants: {
    container: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
    globe: {
      hidden: { scale: 0.8, opacity: 0 },
      visible: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 },
    },
    markers: {
      hidden: { scale: 0 },
      visible: { scale: 1 },
      exit: { scale: 0 },
    },
  },
  transition: {
    duration: 0.5,
    ease: 'easeInOut',
  },
};
