# shardlight

[![CI](https://github.com/jukrapopk/shardlight/actions/workflows/ci.yml/badge.svg)](https://github.com/jukrapopk/shardlight/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/shardlight.svg)](https://www.npmjs.com/package/shardlight)
[![license](https://img.shields.io/npm/l/shardlight.svg)](./LICENSE)

Layered **shard** lens-flare lights that render the same in normal 2D React (DOM),
[three.js](https://threejs.org) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber).

A light is an ordered list of _shards_ (glows, rays, streak bundles, halos). Shards that
share a motion channel are baked into one image, then animated with transforms and opacity —
no re-rendering.

- **One light, three targets.** The same config renders to `<img>`, to three.js planes, and
  to R3F meshes, and looks identical everywhere.
- **Easy by default.** `<ShardLight />` draws a light; `<ShardLight preset="sun" />` picks
  another look.
- **Tunable all the way down.** Tweak or replace any single layer with `<Shard>` children.
- **Extensible without forking.** New shard kinds, effects and presets plug in through public
  registries. The built-ins are registered the same way.
- **Data first.** Every light is a plain, versioned JSON config. JSX compiles to it.

## Install

```bash
npm install shardlight
```

`react`, `react-dom`, `three` and `@react-three/fiber` are **optional peers** — install only
the ones a target needs. The DOM entry never loads three.js; the three.js entry never loads
React.

## Usage

### 2D React (DOM) — `shardlight/react`

```tsx
import { ShardLight, Shard, Glow, Rays, Halo } from 'shardlight/react';

<ShardLight preset="star" size={320} />
<ShardLight preset="sun" size={320} />

<ShardLight preset="star" size={320} flicker>
  <Shard id="beam" strength={0.9} size={1.1} />   {/* tweak a preset shard */}
  <Shard id="ring" visible={false} />             {/* hide one */}
  <Shard id="glint" kind="fan" count={5} size={0.25} channel="glint" /> {/* add one */}
</ShardLight>
```

`flicker` is a shorthand for a `flicker` effect. Omit `preset` (or pass `preset={null}`) to start
empty and build a light purely from `<Shard>` children.

Animate from CSS variables, or imperatively through a ref — never through React props:

```tsx
const ref = useRef<ShardLightHandle>(null);
ref.current?.set({ channels: { rays: { scale: 1.3 } } });
ref.current?.setChannel('rays', { scale: 1.3 });
```

### three.js — `shardlight/three`

```ts
import { createShardLight } from 'shardlight/three';

const light = createShardLight({ preset: 'sun', size: 0.6 });
scene.add(light.object);

// per frame: no re-bake, just transforms and opacity
light.set({ channels: { rays: { scale: 1.2 } }, opacity: 0.8 });

light.update({ shards: [{ id: 'beam', strength: 1 }] }); // re-bakes only what changed
light.dispose();
```

### React Three Fiber — `shardlight/r3f`

```tsx
import { ShardLightMesh, Shard } from 'shardlight/r3f';

<ShardLightMesh ref={light} preset="sun" size={0.4} position={[0, 1, -2]} flicker>
  <Shard id="ring" visible={false} />
</ShardLightMesh>;
```

### Headless core — `shardlight`

Framework-free: config, kinds, presets, effects, baking and cache. Every adapter wraps
`createLightModel()`.

```ts
import { createLightModel, resolveConfig, prewarm } from 'shardlight';

const model = createLightModel({ preset: 'star', accepts: ['bitmap'] });
model.subscribe((layers) => {
  /* one image per layer */
});
model.onFrame((values) => {
  /* channel scale / opacity */
});
await model.ready;
```

## Extending

```ts
import { defineShardKind, registerShardKind, defineEffect, registerEffect, definePreset, registerPreset } from 'shardlight';

const dots = defineShardKind({
  kind: 'dots',
  label: 'Ring of dots',
  params: { count: { type: 'number', default: 12, min: 1, max: 64, step: 1 } },
  draw(ctx, p, env) { /* context is centred, rotated and coloured for you */ },
});
registerShardKind(dots);

// now it works in every target
<ShardLight preset="star"><Shard id="crown" kind="dots" count={8} /></ShardLight>
```

## Adapter contract

`shardlight/testing` exports the contract suite (`runAdapterContract`, `createFakeBaker`,
`waitFor`) that any adapter — including a third-party one — can run against itself.

## Testing

```bash
pnpm test           # Vitest unit tests (config, model, effects, three adapter)
pnpm test:visual    # Playwright: golden PNGs + cross-target parity (Chromium)
```

The visual tests render every preset in real headless Chromium through all three targets,
compare against golden PNGs in `tests/visual/__screenshots__`, and check parity between
`<ShardLight>`, `createShardLight()` and `<ShardLightMesh>`. Regenerate goldens with
`pnpm test:visual:update` after an intentional look change.

## License

MIT
