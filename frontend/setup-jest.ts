import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

try {
  setupZoneTestEnv();
} catch {
  // TestBed was already initialized by the Angular CLI test builder
  // or by a prior setupFilesAfterEnv execution. Safe to ignore.
}

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
