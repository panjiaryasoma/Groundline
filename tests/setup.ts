import "@testing-library/jest-dom/vitest";


class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  value: 800,
});

Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  value: 1200,
});

HTMLElement.prototype.getBoundingClientRect = function () {
  return {
    width: 1200,
    height: 800,
    top: 0,
    left: 0,
    bottom: 800,
    right: 1200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
};
