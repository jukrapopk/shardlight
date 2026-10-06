import { fileURLToPath } from 'node:url';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..', '..');

/**
 * Serves the visual-test harness from source (no build step), aliasing the
 * package's subpath exports to `src`.
 */
export default defineConfig({
  root: here,
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
    host: '127.0.0.1',
  },
});
