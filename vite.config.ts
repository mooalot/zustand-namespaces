import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: 'dist', // Output directory for build files
    lib: {
      entry: 'src/index.ts', // Entry point for your library
      name: 'ZustandSlicer', // Global variable name if your library is used in a non-ESM environment
      fileName: (format) => `zustand-slicer.${format}.js`, // Output file naming pattern
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: [], // Add any external dependencies here
      output: {
        globals: {}, // Global variables for external dependencies
      },
    },
  },
  test: {
    environment: 'jsdom', // Required for React testing
    globals: true, // Allows using `test`, `expect` globally
    setupFiles: 'tests/vitest.setup.ts', // Path to your setup file
  },
});
