import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    maxWorkers: 4,
    minWorkers: 1,
    testTimeout: 30000,
    include: [
      'src/test/unit/**/*.test.ts',
      'src/test/unit/**/*.test.tsx',
      'src/test/integration/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/**/*.d.ts',
        'src/test/**/*.ts',
        'src/test/**/*.tsx',
        'src/**/index.ts',
        'src/manager/**',
        'src/popup/**',
        'src/content/**',
        'src/background/**',
        'src/hooks/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@components': resolve(__dirname, 'src/components'),
      '@adapters': resolve(__dirname, 'src/adapters'),
      '@content': resolve(__dirname, 'src/content'),
      '@background': resolve(__dirname, 'src/background'),
      '@manager': resolve(__dirname, 'src/manager'),
      '@popup': resolve(__dirname, 'src/popup'),
    },
  },
});
