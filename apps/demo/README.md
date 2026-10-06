# shardlight demo

The demo and landing page for shardlight — also deployed to GitHub Pages.

It loads the package straight from `../packages/shardlight/src` (via a Vite alias), so there is
no build step and edits to the library hot-reload immediately.

## Local

From the repo root:

```bash
pnpm install
pnpm demo            # start Vite (opens http://localhost:5173)
pnpm demo:build      # static build into apps/demo/dist
pnpm demo:preview    # serve the static build
```

The build uses a relative `base`, so `apps/demo/dist` can be served from any path.

## GitHub Pages

The `.github/workflows/deploy.yml` workflow builds the demo and deploys `apps/demo/dist` to GitHub
Pages on every push to `main` (Pages source is set to **GitHub Actions**).

Live: https://jukrapopk.github.io/shardlight/
