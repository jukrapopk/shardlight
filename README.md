# shardlight

[![CI](https://github.com/jukrapopk/shardlight/actions/workflows/ci.yml/badge.svg)](https://github.com/jukrapopk/shardlight/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/shardlight.svg)](https://www.npmjs.com/package/shardlight)
[![license](https://img.shields.io/npm/l/shardlight.svg)](./LICENSE)

Monorepo for [`shardlight`](packages/shardlight) — layered shard lens-flare lights for the
DOM (React), three.js and React Three Fiber.

The design and full specification live in [`shardlight-plan.md`](./shardlight-plan.md).

```
shardlight/
├── packages/shardlight/   # the published package (core + react + three + r3f + testing)
└── apps/                  # playground and docs (later phases)
```

## Development

```bash
pnpm install
pnpm build        # build packages/shardlight
pnpm test         # unit tests (Vitest)
pnpm test:visual  # Playwright golden + cross-target parity tests (Chromium)
pnpm lint
pnpm typecheck
pnpm format:check
```

The first visual run needs a browser: `pnpm --filter shardlight exec playwright install chromium`.

## Publishing

```bash
pnpm build
cd packages/shardlight
npm pack --dry-run   # inspect what ships
npm publish          # requires `npm login` and access to the `shardlight` name
```

Or, with changesets:

```bash
pnpm changeset
pnpm version-packages
pnpm release
```
