import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' giúp assets chạy đúng khi deploy dưới subpath GitHub Pages
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2000 },
});
