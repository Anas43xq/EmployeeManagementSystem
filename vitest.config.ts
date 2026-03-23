import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom to simulate browser environment
    environment: 'jsdom',
    
    // Setup file for global test configuration
    setupFiles: ['./src/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setup.ts',
      ],
    },
    
    // Include test files
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    
    // Global test timeout
    testTimeout: 10000,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
