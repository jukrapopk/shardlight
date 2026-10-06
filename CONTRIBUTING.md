# Contributing to shardlight

Thanks for helping out. This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting set up

Requires **Node 18+** and **pnpm** (`corepack enable` or `npm i -g pnpm`).

```bash
pnpm install
pnpm build        # build packages/shardlight
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest unit tests
pnpm lint         # ESLint
pnpm format       # Prettier --write
```

## Project layout

- `packages/shardlight` — the published package.
  - `src/core` — headless: config, kinds, effects, presets, bake, model. No React, no three.
  - `src/shared-react` — `<Shard>`, `createShardComponent()`, named shards, context.
  - `src/react`, `src/three`, `src/r3f` — adapters.
  - `src/testing` — the adapter contract suite.
- `shardlight-plan.md` — the design spec. The tables and stated rules are the spec; where a
  code sketch and a rule disagree, follow the rule.

## Ground rules

- **Keep core framework-free.** Nothing under `src/core` may import React or three.
- **The look is part of the API.** Changing how a built-in kind draws, or a built-in preset's
  values, is a breaking change. Ship a visual improvement as a new kind or preset name.
- **Determinism.** The same config must always give the same pixels. Draw functions consume
  their shard's PRNG in a fixed order; seeds are hashed from the shard `id`, never position.
- **No new side effects.** Importing the package registers the built-ins; that is the only one.

## Adding a shard kind, effect or preset

Register it in code (`defineShardKind` / `defineEffect` / `definePreset`) exactly the way the
built-ins do — the built-ins are not special-cased. Add a test, and update the README if it
changes the public API.

## Before you open a PR

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

- Add a changeset for any change a user would notice: `pnpm changeset`.
- Keep pull requests focused, and describe the change and how you tested it.

## Reporting bugs and security issues

Open an issue for bugs. For security, follow [`SECURITY.md`](./SECURITY.md) instead of filing
a public issue.
