# shardlight demo

The demo and landing page for shardlight — also deployed to GitHub Pages.

## Local

From the repo root:

```bash
pnpm install
pnpm demo            # build the package, then start Vite (opens http://localhost:5173)
pnpm demo:build      # static build into apps/demo/dist
pnpm demo:preview    # serve the static build
```

The build uses a relative `base`, so `apps/demo/dist` can be served from any path.

## GitHub Pages

The `.github/workflows/deploy.yml` workflow builds the package and the demo and deploys
`apps/demo/dist` to GitHub Pages on every push to `main`. Enable it in the repo settings
under **Settings → Pages → Source: GitHub Actions**.
