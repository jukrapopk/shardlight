import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base so the build works both locally (any path) and on GitHub Pages
// (https://<user>.github.io/shardlight/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
