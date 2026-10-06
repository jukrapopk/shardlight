import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'core/index': 'src/core/index.ts',
    'react/index': 'src/react/index.ts',
    'three/index': 'src/three/index.ts',
    'r3f/index': 'src/r3f/index.tsx',
    'testing/index': 'src/testing/index.ts',
  },
  format: ['esm'],
  target: 'es2020',
  dts: true,
  sourcemap: true,
  splitting: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'react/jsx-runtime', 'three', '@react-three/fiber'],
});
