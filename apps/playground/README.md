# shardlight playground

An interactive Vite + React app that renders the same light in all three targets side by
side — DOM, three.js and React Three Fiber — with preset, colour, spin and flicker controls.

From the repo root:

```bash
pnpm install
pnpm playground
```

`pnpm playground` builds `packages/shardlight` and then starts Vite (it opens
http://localhost:5173 automatically). It imports the real built package via the workspace
link, so it exercises the same entry points a consumer would.
