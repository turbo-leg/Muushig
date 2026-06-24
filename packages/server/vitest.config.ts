import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Prevent picking up transpiled/bundled output under dist/
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Room boot + socket teardown can exceed the 5s default.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
