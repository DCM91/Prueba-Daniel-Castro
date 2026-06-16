// Setup file for Jest tests. jest-preset-angular no longer ships a setup-jest entry point
// in 16.x; the preset's transformer and globals are loaded via jest.config.js instead.

const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
