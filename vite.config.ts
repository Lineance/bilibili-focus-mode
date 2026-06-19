import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@content': resolve(__dirname, 'src/content'),
      '@background': resolve(__dirname, 'src/background'),
      '@manager': resolve(__dirname, 'src/manager'),
      '@popup': resolve(__dirname, 'src/popup'),
    },
  },
  base: './',
  build: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
  },
});
