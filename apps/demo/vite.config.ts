import { fileURLToPath } from 'node:url';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..', '..', 'packages', 'shardlight');

// Load the package from source, so the demo needs no build step and edits to
// the library hot-reload reliably (a linked prebuilt package does not).
export default defineConfig({
  // Relative base so the build works both locally (any path) and on GitHub
  // Pages (https://<user>.github.io/shardlight/).
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'shardlight/react', replacement: path.join(pkg, 'src/react/index.ts') },
      { find: 'shardlight/three', replacement: path.join(pkg, 'src/three/index.ts') },
      { find: 'shardlight/r3f', replacement: path.join(pkg, 'src/r3f/index.tsx') },
      { find: 'shardlight/testing', replacement: path.join(pkg, 'src/testing/index.ts') },
      { find: 'shardlight', replacement: path.join(pkg, 'src/core/index.ts') },
    ],
  },
  server: {
    port: 5173,
    open: true,
  },
});
