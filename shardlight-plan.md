# ShardLight — plan

**ShardLight** (`shardlight` on npm) is a lens-flare light built from layered **shards**. It
renders the same in normal 2D React UI, in React Three Fiber and in plain three.js.

> **For the implementer**
> - **Status:** plan only. Nothing is built yet.
> - **Where:** a new, standalone repository (§3.1). Don't add it to the repo this file sits
>   in, and don't change anything there.
> - **Start** with phase 0 (§10) and work through the phases in order. Each phase should
>   end with its tests passing (§11).
> - **Open questions (§12)** each carry a proposal. Implement the proposal unless told
>   otherwise.
> - **Code sketches are illustrative.** The tables and stated rules are the spec. Where a
>   sketch and a rule disagree, follow the rule.

---

## 0. Scope

Three targets, one look. All three share the same core: config model, shard kinds, presets,
effects, baking and cache.

| Target | Entry | Peer deps | API | Customise | Animate |
|---|---|---|---|---|---|
| **2D React (DOM)** | `shardlight/react` | `react`, `react-dom` | `<ShardLight>` | `<Shard>` children, `config` prop | `effects`, CSS variables, `setChannel()` (§6.3) |
| **React Three Fiber** | `shardlight/r3f` | `react`, `three`, `@react-three/fiber` | `<ShardLightMesh>` | `<Shard>` children, `config` prop | `effects`, `ref.set()` in `useFrame` (§7.2) |
| **three.js (no React)** | `shardlight/three` | `three` | `createShardLight()` | `shards` option, `update()` | `effects`, `light.set()` in your loop (§7.1) |
| *Core (headless)* | `shardlight` | none | `createLightModel()`, registries, `define*()` helpers | the config object | — |

Layering, so nothing is written twice:

```
            ┌──────────── core (headless) ────────────┐
            │ config · kinds · effects · bake · model  │
            └───────┬──────────────────────┬───────────┘
                    ▼                      ▼
             three (adapter)        react (adapter) ◄── shared-react (<Shard>, context)
                    └──────────┬───────────┘                 │
                               ▼                             │
                         r3f (adapter) ◄─────────────────────┘
```

- **Core does all the thinking:** it resolves the config, groups shards, bakes, caches,
  diffs and runs effects. A target is a thin **adapter** that turns the model's layers into
  host objects (`<img>`, meshes) and applies channel values to them (§5).
- `three` uses no React. `react` uses no three. Only `r3f` uses both.
- `<Shard>` and the named shards are one implementation, shared by both React entries.

**Out of scope for v1:** other frameworks (Vue, Svelte, plain DOM without React), Babylon,
PlayCanvas, raw WebGL. The adapter contract (§5) is public, so these can be written later,
by us or by anyone, without touching core.

---

## 1. Goals

- **One light, three targets.** The same light renders in the DOM (`<img>`), in R3F and in
  plain three.js (textured planes), and looks identical everywhere.
- **Easy by default, tunable all the way down.** `<ShardLight />` alone draws a light, and
  `<ShardLight preset="sun" />` picks another look. `<Shard>` children fine-tune or replace
  any single layer.
- **Extensible without forking.** New shard kinds, presets, effects, bake backends and
  targets plug in through public registries and contracts (§4). The built-in ones are
  registered the same way.
- **Animate without re-rendering.** Per-frame animation goes through effects, CSS variables
  (DOM) or an imperative `set()` (R3F, three.js), not React props.
- **Memory-safe on mobile.** Free scratch canvases right away, encode DOM lights to blobs,
  ref-count every cache, and cap bake size on low-memory devices.
- **Data first.** Every light is a plain, versioned JSON config. JSX compiles to it, a
  playground edits it, and presets are just configs.

## 2. Non-goals (v1)

- Real lens optics such as ghosts along a flare axis or occlusion-aware flares. The kind
  registry (§4.1) is where these would plug in later.
- Adapters beyond the three targets (see §0's out-of-scope list).
- Animating the drawn shape itself, for example ray lengths changing per frame. Motion is
  transform and opacity on baked layers only. A live shader backend (§4.4) could lift this
  later.

---

## 3. Package layout

One package with subpath exports, so each target pulls in only what it uses: DOM users
never load three.js, and three.js users never load React.

```
shardlight/
├── src/
│   ├── core/                       # framework-free; no React, no three
│   │   ├── config/
│   │   │   ├── types.ts            # ShardLightConfig, ShardConfig, ShardKinds (augmentable)
│   │   │   ├── schema.ts           # param schema types: number / angle / color / boolean / enum / channels
│   │   │   ├── resolve.ts          # resolveConfig(): preset → config → shard overrides, defaults filled
│   │   │   └── migrate.ts          # migrateConfig(): older `version`s → current
│   │   ├── kinds/
│   │   │   ├── registry.ts         # defineShardKind(), registerShardKind(), getShardKind()
│   │   │   └── blob.ts, fan.ts, clusters.ts, halo.ts      # built-ins, defined like any custom kind
│   │   ├── effects/
│   │   │   ├── registry.ts         # defineEffect(), registerEffect()
│   │   │   └── spin.ts, flicker.ts, pulse.ts              # built-ins
│   │   ├── presets/
│   │   │   ├── registry.ts         # definePreset(), registerPreset(), getPreset()
│   │   │   └── star.ts, sun.ts, anamorphic.ts, sparkle.ts # built-ins
│   │   ├── bake/
│   │   │   ├── baker.ts            # Baker interface + LayerSource union
│   │   │   ├── canvas2d.ts         # the default baker
│   │   │   ├── scheduler.ts        # one layer per task, prewarm(), cancellation
│   │   │   └── cache.ts            # ref-counted, keyed by layer hash
│   │   ├── model/
│   │   │   └── light-model.ts      # createLightModel(): the headless controller adapters wrap (§5)
│   │   └── util/                   # PRNG, string hash, color parsing, stable stringify
│   ├── shared-react/               # internal: <Shard>, createShardComponent(), named shards, context
│   ├── react/                      # adapter: <ShardLight>
│   ├── three/                      # adapter: createShardLight()
│   └── r3f/                        # adapter: <ShardLightMesh>, wraps createShardLight
└── playground/                     # tuning UI, generated from the param schemas (§4.1)
```

```jsonc
// package.json (excerpt)
"name": "shardlight",
"exports": {
  ".":       "./dist/core/index.js",
  "./react": "./dist/react/index.js",
  "./three": "./dist/three/index.js",
  "./r3f":   "./dist/r3f/index.js"
},
"peerDependencies": {
  "react": ">=18", "react-dom": ">=18", "three": ">=0.150", "@react-three/fiber": ">=8"
},
"peerDependenciesMeta": {   // every peer is optional: each entry needs only its own (§0)
  "react": { "optional": true }, "react-dom": { "optional": true },
  "three": { "optional": true }, "@react-three/fiber": { "optional": true }
}
```

The built-in kinds, effects and presets are registered when `shardlight` is first
imported, so `preset="sun"` works with no setup. They are a few KB in total, which is worth
that convenience. This is the package's only side effect, so `sideEffects` names just the
registration module.

### 3.1 Repository and tooling

A pnpm workspace in a new repository:

```
shardlight-repo/
├── packages/shardlight/     # the package above
├── apps/playground/         # Vite + React app (phase 4), depends on the workspace package
└── apps/docs/               # docs site (phase 5)
```

- **TypeScript:** `strict`, ESM only, with `.d.ts` output.
- **Build:** tsup, one entry per subpath export.
- **Unit tests:** Vitest with jsdom. Canvas output is not checked here.
- **Pixel and parity tests:** Playwright in Chromium, with golden PNGs stored in the repo.
- **Releases:** changesets.
- **Lint and format:** ESLint + Prettier.
- **CI:** build and every test in §11 (including the packaging check), on every PR.

---

## 4. Data model and extension points

A ShardLight is an **ordered list of shards**. Each shard has an `id`, a `kind`, and that
kind's parameters as **flat** fields. Flat means no nested `shape: {}` objects, so
overriding one field never needs a deep merge, and config keys match the component props
one to one.

```ts
interface ShardBase {
  id: string;                 // stable name: seeds its randomness, target of overrides
  kind: keyof ShardKinds;     // any registered kind (§4.1)
  visible?: boolean;          // default true
  channel?: string;           // motion channel it animates with; default 'main'
  spin?: boolean;             // turns with the light's spin; default false
  blend?: 'add' | 'screen';   // default 'add'
  color?: string;             // overrides the light's color for this shard only
  seed?: number;              // overrides the light's seed for this shard only
}

// Every registered kind adds itself here (§4.1), which keeps ShardConfig a typed union.
interface ShardKinds {
  blob: BlobParams;           // soft round glows
  fan: FanParams;             // rays spread evenly round the centre
  clusters: ClusterParams;    // bundles of near-parallel fine rays
  halo: HaloParams;           // a ring
}

// A full shard: `kind` required, params optional (kind defaults fill the rest).
type ShardConfig = { [K in keyof ShardKinds]: ShardBase & { kind: K } & Partial<ShardKinds[K]> }[keyof ShardKinds];

// What overrides accept (<Shard> props, the `shards` option, `config.shards`): either a
// full shard, or a partial one whose `id` names a shard already in the preset. A partial
// one omits `kind` and inherits it.
type ShardInput = ShardConfig | ({ id: string; kind?: undefined } & Partial<Omit<ShardBase, 'id' | 'kind'>> & Record<string, unknown>);

interface ShardLightConfig {
  version: 1;                 // schema version, see §4.6
  color: string;              // default '#FFFFFF'
  rotation: number;           // degrees, turns the whole light; default 0
  seed: number;               // default 1
  shards: ShardConfig[];      // drawn in order (additive, so order only matters for 'screen')
  effects?: EffectConfig[];   // §4.3
}
```

An override with no `kind` whose `id` matches nothing is skipped, with a development warning.

Design rules:

- **Seeds are hashed from the shard's `id`,** not its position. Reordering or inserting
  shards never reshuffles the others' randomness.
- **`channel` is any string.** Shards on the same channel swell and fade together, and a
  light can have as many channels as it needs.
- **Shards become layers.** Shards that share `channel` + `spin` + `blend` are baked
  together into one **layer**: one image, one `<img>` or plane. The plan uses "layer" for
  this unit everywhere: bakes, cache entries and host objects are all per layer.
- **`relativeTo?: string`** on a fan measures its `angle` from another shard's, e.g. a cross
  arm kept square to the main streak.
- **Missing params take the kind's defaults,** so a shard can be as short as
  `{ id: 'x', kind: 'fan' }`.
- **Units:**
  - `size` is a fraction of the light's half-edge (1 reaches the edge).
  - Widths and blurs are in px at a 1024 base, scaled with the bake resolution.
  - Angles are in degrees, clockwise, with 0 pointing right.
  - `rayScale` (a render option) thins every ray for lights shown much larger than tuned.

### Extension points at a glance

| To add… | Use | Changes needed in the package |
|---|---|---|
| A new kind of layer (e.g. ghost, fringe, ring of dots) | `defineShardKind()` + `registerShardKind()` (§4.1) | none |
| A named look | `definePreset()` + `registerPreset()` (§4.2) | none |
| A new animation (pulse, twinkle, follow-pointer) | `defineEffect()` + `registerEffect()` (§4.3) | none |
| A different way to bake (worker, server, shader) | `Baker` interface (§4.4) | none |
| A new target (Vue, Babylon, PixiJS) | `createLightModel()` + adapter contract (§5) | none |
| A new config field | `version` bump + `migrateConfig()` step (§4.6) | core |

### 4.1 Shard kinds

A kind is a **definition object**: a param schema plus a draw function. The four built-ins
are written the same way and go through the same registry. Nothing in core switches on kind
names.

```ts
import { defineShardKind, registerShardKind } from 'shardlight';

export const dots = defineShardKind({
  kind: 'dots',
  label: 'Ring of dots',
  params: {
    count:    { type: 'number', default: 12,  min: 1, max: 64, step: 1 },
    size:     { type: 'number', default: 0.5, min: 0, max: 2 },   // ring radius
    radius:   { type: 'number', default: 4,   min: 0, max: 40, unit: 'px' },
    strength: { type: 'number', default: 0.6, min: 0, max: 2 },
  },
  // ctx: a 2D context on the scratch canvas, centred, rotated and coloured for you.
  // env: half-edge `unit`, base-px scale `px`, `rng()`, `rgba(alpha)`, `rayScale`.
  draw(ctx, p, env) {
    for (let i = 0; i < p.count; i++) {
      const a = (i / p.count) * Math.PI * 2;
      ctx.fillStyle = env.rgba(p.strength);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * p.size * env.unit, Math.sin(a) * p.size * env.unit, p.radius * env.px, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  blur: (p, env) => 0,        // optional: the composite blur for this shard
});

registerShardKind(dots);

// type it everywhere: config, <Shard kind="dots">, createShardLight({ shards })
declare module 'shardlight' {
  interface ShardKinds { dots: ParamsOf<typeof dots> }
}
```

Once registered, it works in every target with no further setup:

```tsx
import { createShardComponent, ShardLight, Shard } from 'shardlight/react';   // also exported by 'shardlight/r3f'
const Dots = createShardComponent(dots);

// typed component
<ShardLight preset="star">
  <Dots id="crown" count={8} size={0.4} channel="rays" spin />
</ShardLight>

// the same, through the generic <Shard>
<ShardLight preset="star">
  <Shard id="crown" kind="dots" count={8} size={0.4} channel="rays" spin />
</ShardLight>

// three.js
createShardLight({ preset: 'star', shards: [{ id: 'crown', kind: 'dots', count: 8, size: 0.4, channel: 'rays', spin: true }] });
```

The one schema then drives everything else, so a new kind needs nothing more:

- **Types:** `ParamsOf<>` derives the param types.
- **Defaults and validation:** `resolveConfig()` fills defaults and clamps values to
  `min`/`max`, warning in development.
- **Components:** `createShardComponent(dots)` gives a typed `<Dots>` for both React
  entries. The built-in `<Glow>`, `<Rays>`, `<Streaks>`, `<Halo>` are made the same way.
- **Playground:** controls are generated from the schema (sliders, colour pickers,
  toggles), so a custom kind is tunable there straight away.
- **Unknown kinds:** a config naming a kind that isn't registered (e.g. JSON from a newer
  version) skips that shard with a development warning. It doesn't throw.

**Later backends.** A kind can grow optional per-backend implementations next to `draw`
(e.g. `glsl` for a live shader backend, §4.4) without breaking existing kinds. A backend
falls back to baking with `draw` for kinds that don't provide one.

**How a layer is baked** (the `canvas2d` baker):

1. Clear a layer canvas (`resolution` square).
2. For each shard in the layer, in order:
   - clear a scratch canvas;
   - call the kind's `draw` with the context centred and turned by `rotation`;
   - apply its `variance` mask, if it has one;
   - composite it onto the layer canvas with `globalCompositeOperation = 'lighter'` and
     `filter = blur(<kind.blur>px)`.
3. Output the layer canvas as the requested `LayerSource`.

Blurring each shard on its own costs one blur pass per shard. It also lets the variance
mask touch only that shard.

#### Built-in kinds

Every kind also takes the `ShardBase` fields. "px" means base pixels at a 1024 bake.
Parameters marked *ray* are multiplied by `rayScale`.

**`blob`**: a soft round glow. A radial gradient from the centre out to `size`.

| Param | Default | Range | Meaning |
|---|---|---|---|
| `strength` | 1 | 0–2 | Peak brightness. Above 1 saturates the middle |
| `size` | 0.5 | 0–2 | Fade-out radius |
| `hardness` | 0 | 0–0.999 | Share of the radius held at full brightness before the falloff |
| `falloff` | 2 | 0.1–8 | Curve past `hardness`: alpha = ((1 − t) / (1 − hardness))^falloff |
| `aspect` | 1 | 0.1–10 | Horizontal ÷ vertical stretch |
| `angle` | 0 | degrees | Direction of the stretch |
| `softness` | 0 | 0–50 px | Composite blur |
| `variance` | 0 | 0–1 | Uneven brightness around the centre (see the variance mask below) |

**`fan`**: `count` rays spread evenly round the centre. Each ray is a quad tapering from
root to tip, filled with a linear gradient along its length.

| Param | Default | Range | Meaning |
|---|---|---|---|
| `strength` | 1 | 0–2 | Peak brightness per ray |
| `size` | 1 | 0–2 | Length, from `inner` out |
| `count` | 4 | 1–256 | Number of rays (2 = one line through the centre) |
| `angle` | 0 | degrees | First ray's direction |
| `relativeTo` | — | shard id | Measure `angle` from that fan's `angle` |
| `jitter` | 0 | 0–1 | Angular wander per ray, as a share of half the gap between rays |
| `inner` | 0 | 0–1 | Where rays start, from the centre |
| `variance` | 0 | 0–1 | Per-ray randomness: length × (1 − v·r), brightness × (1 − v·r), width × (1 − 0.5·v·r) |
| `width` | 4 | 0–100 px, *ray* | Width at the root |
| `taper` | 1 | 0–1 | 0 = constant width, 1 = pointed tip |
| `falloff` | 1 | 0–8 | Brightness along the length: (1 − t)^falloff |
| `fadeIn` | 0 | 0–1 | Distance from the root over which the ray ramps in. Absolute (fraction of half-edge), the same for every ray |
| `softness` | 1 | 0–50 px, *ray* | Composite blur |

**`clusters`**: `clusters` bundles, spread evenly round the centre, of `perCluster` fine
rays each. Rays are drawn like `fan` rays.

| Param | Default | Meaning |
|---|---|---|
| `clusters` | 4 | Number of bundles |
| `perCluster` | 5 | Rays per bundle |
| `spread` | 20 | Angular width of a bundle, degrees. Rays are placed uniformly at random inside it |
| `inner` | 0.1 | Where rays start. Each ray's start also varies by ±`variance`/2 |
| `strength` 0.5, `size` 0.5, `angle` 0, `variance` 0.5, `width` 2, `taper` 0.5, `falloff` 1, `fadeIn` 0.1, `softness` 1 | | As in `fan` |

**`halo`**: a ring. A radial gradient between `size − width/2` and `size + width/2`,
brightest at `size`.

| Param | Default | Meaning |
|---|---|---|
| `strength` | 0.1 | Peak brightness |
| `size` | 0.5 | Radius of the brightest line |
| `width` | 0.05 | Ring thickness (fraction of half-edge) |
| `falloff` | 1 | Edge curve across the thickness: across^falloff |
| `softness` | 0 | Composite blur, px |
| `variance` | 0 | Uneven brightness around the ring |

**Variance mask** (`blob`, `halo`): a conic gradient around the centre with 12 evenly
spaced stops. Each stop's alpha is `1 − variance · rng()`, and the last stop repeats the
first so there's no seam. It is applied to the scratch canvas with `destination-in`.

**Randomness:** each shard gets its own PRNG (mulberry32), seeded by
`hash(id) ^ (shard.seed ?? light.seed)`. Draw functions consume it in a fixed order, so the
same config always gives the same pixels.

**Gradients** approximate their curves with 16 colour stops.

### 4.2 Presets

Plain `ShardLightConfig` objects, registered by name. String names are typed through the
same augmentation pattern, so `preset="neon"` autocompletes once registered.

```ts
import { definePreset, registerPreset } from 'shardlight';

registerPreset('neon', definePreset({ /* ShardLightConfig */ }));
declare module 'shardlight' { interface ShardPresets { neon: true } }

type PresetName = keyof ShardPresets;   // 'star' | 'sun' | 'anamorphic' | 'sparkle' | 'neon'
```

`preset` also accepts the config object itself, so a preset can be passed without
registering it. See §9 for the built-ins.

### 4.3 Effects

Animation is pluggable in the same way. An effect is a pure function from time to channel
values, run once per frame by the adapter:

```ts
import { defineEffect, registerEffect } from 'shardlight';

export const pulse = defineEffect({
  name: 'pulse',
  params: {
    channels: { type: 'channels', default: ['main'] },
    speed:    { type: 'number', default: 1, min: 0, max: 10 },
    amount:   { type: 'number', default: 0.1, min: 0, max: 1 },
  },
  // t: seconds; out: this frame's values, starting from scale 1, opacity 1, spin 0
  apply(t, p, out) {
    const k = 1 + Math.sin(t * p.speed * Math.PI * 2) * p.amount;
    for (const ch of p.channels) out.channel(ch).scale *= k;
  },
  // optional `css(p)`: a CSS-keyframes version the DOM adapter uses instead of rAF
});
registerEffect(pulse);
```

```ts
interface ChannelValues { scale: number; opacity: number }        // per channel (augmentable, §12)
interface FrameValues {
  channel(name: string): ChannelValues;
  opacity: number;                                                 // the whole light
  spin: number;                                                    // degrees; turns the `spin` shards
}
type EffectConfig = { type: string; [param: string]: unknown };   // e.g. { type: 'spin', speed: 0.2 }
```

- **Composition:** effects multiply scale and opacity and add to the spin angle. Several
  can run together, and they combine with values set by hand through `set()` the same way.
- **Built-ins:**

  | Effect | Params (defaults) | Does |
  |---|---|---|
  | `spin` | `speed` 0.05 turns/s | Adds `speed · 360 · t` to the spin angle |
  | `flicker` | `amount` 0.15, `speed` 1, `channels` all | Multiplies opacity by 1 − amount·(0.5 + 0.25·sin(11.3·s) + 0.25·sin(17.9·s + 1.7)), where s = t·speed |
  | `pulse` | `amount` 0.1, `speed` 1, `channels` `['main']` | Multiplies scale by 1 + amount·sin(2π·speed·t) |

  The `spin` and `flicker` component props are shorthands: `true` adds the effect with its
  defaults, and an object adds it with those params.
- **DOM:** an effect with a `css` version runs as CSS keyframes with no JavaScript per frame.
  The others run in one shared `requestAnimationFrame` loop that writes CSS variables.
- **3D:** effects run from the light's `onBeforeRender`, or from `light.tick(dt)` when
  `autoUpdate: false`.
- `prefers-reduced-motion` pauses every effect unless it declares `reducedMotion: 'keep'`.

### 4.4 Bakers

Baking turns a layer's shards into an image. It sits behind an interface, so where and how
it happens can change without touching kinds or adapters:

```ts
interface Baker {
  id: string;                                   // part of the cache key
  bake(layer: ResolvedLayer, opts: BakeOptions, signal: AbortSignal): Promise<LayerSource>;
}
interface ResolvedLayer { key: string; shards: ResolvedShard[]; color: string; rotation: number; seed: number }
interface BakeOptions { resolution: number; rayScale: number; accept: LayerSource['type'][] }

type LayerSource =
  | { type: 'url'; url: string }             // DOM: blob object URL
  | { type: 'bitmap'; bitmap: ImageBitmap }  // 3D: texture source, no canvas held
  | { type: 'canvas'; canvas: HTMLCanvasElement | OffscreenCanvas };
  // open for later: { type: 'shader'; ... } — a live layer drawn every frame, not baked
```

- **v1 ships `canvas2d`,** baking on the main thread.
- **Later:** `worker` (OffscreenCanvas, same kind `draw` functions run in a worker) and
  `shader` (live GLSL per kind, for shape animation and no texture memory).
- **Adapters say which `LayerSource` types they accept,** and the model asks the baker for a
  compatible one: DOM takes `url`, three takes `bitmap` or `canvas`.
- **Bakes are cancellable** (`AbortSignal`), so a rapid run of `update()` calls only finishes
  the last one.

### 4.5 Merge rules

`resolveConfig(preset, config, shards)` is the single place that decides what gets drawn.
Every adapter calls it.

| `preset` | Shard overrides | Result |
|---|---|---|
| omitted | none | The default preset (`star`), so `<ShardLight />` always shows a light |
| set | none | That preset as-is |
| set | some | The preset, with overrides changing or adding shards by `id` |
| `null` | some | Only the overrides: a fully custom light with no preset underneath |

The order is preset → `config` → shard overrides (`<Shard>` children or the `shards`
option), merged per shard by `id`. Then kind defaults are filled in, then values are
clamped.

### 4.6 Versioning

- **Configs carry `version`.** `migrateConfig()` upgrades older JSON (saved from the
  playground, stored in a CMS) step by step. Adapters run it on every config they're
  given, so old saves keep working.
- **Unknown fields are ignored** and unknown kinds and effects are skipped (§4.1), so a
  config from a newer version degrades gracefully in an older one.
- **The look is part of the API.** Changing how a built-in kind draws, or a built-in
  preset's values, is a breaking change (major version), because users tune against it. A
  visual improvement ships as a new kind or preset name (e.g. `fan2`, `star-soft`) in a
  minor version.

---

## 5. The headless model and the adapter contract

`createLightModel()` is the framework-free controller every target wraps. It owns
everything that isn't drawing to a host: resolving, grouping, baking, caching, diffing and
effects.

```ts
const model = createLightModel({ preset, config, shards, resolution, rayScale, baker, accepts: ['url'] });

model.subscribe((layers) => { /* layers changed: add / replace / remove host objects */ });
model.onFrame((values) => { /* FrameValues (§4.3): per-channel scale / opacity, light opacity, spin */ });

model.update({ shards });   // re-resolves, re-bakes only changed layers, emits a layer diff
model.set({ channels });    // manual channel values, combined with effects
model.tick(dt);             // advance effects (adapters call this from their frame loop)
model.ready;                // Promise: every layer baked
model.dispose();            // releases cache refs, cancels bakes
```

```ts
interface Layer {
  id: string;               // `${channel}|${spin}|${blend}`: stable while the layer exists
  channel: string;
  spin: boolean;
  blend: 'add' | 'screen';
  source: LayerSource;
}
```

**An adapter only has to:**
1. Create one host object per `Layer`, nesting spin layers under a rotating parent.
2. On `subscribe`, apply the diff (new `source` → swap the image or texture in place).
3. On `onFrame`, write each channel's scale and opacity to its layers, and the spin angle
   to the rotating parent.
4. Call `model.tick(dt)` from its frame loop, and `model.dispose()` on teardown.

The three shipped adapters are written this way, and a Vue, Svelte or Babylon adapter would
follow the same steps. The contract is covered by a shared test suite (§11) that any
adapter can run against itself.

---

## 6. 2D React (DOM): `shardlight/react`

### 6.1 `<ShardLight>`

```tsx
import { ShardLight } from 'shardlight/react';

<ShardLight />                          // the default preset (star)
<ShardLight preset="sun" size={320} />  // another preset, no further customisation needed
```

What gets drawn follows §4.5.

| Prop | Type | Notes |
|---|---|---|
| `preset` | `PresetName \| ShardLightConfig \| null` | Starting config. Default `'star'`. `null` = start empty |
| `config` | `Partial<ShardLightConfig>` | Data-driven alternative or addition to children (e.g. JSON exported by the playground) |
| `color` | `string` | Shorthand for `config.color` |
| `size` | `number \| string` | CSS edge length of the light box |
| `resolution` | `number \| 'auto'` | Bake size. `'auto'` uses rendered size × DPR, capped (2048, lower on low-memory devices) |
| `rayScale` | `number` | Thins every ray |
| `effects` | `EffectConfig[]` | Any registered effects (§4.3) |
| `spin` | `boolean \| { speed }` | Shorthand for a `spin` effect |
| `flicker` | `boolean \| { amount, speed, channels }` | Shorthand for a `flicker` effect |
| `channels` | `Record<string, { scale?, opacity? }>` | Static channel values |
| `blend` | CSS `mix-blend-mode` | Of the whole light against the page; default `plus-lighter` with `screen` fallback |
| `baker` | `Baker` | Defaults to `canvas2d` (§4.4) |
| `onReady` | `() => void` | Fires once every layer is baked and decoded, for sequencing an entrance |
| `fallback` | `ReactNode` | Shown until it's ready (SSR, first paint) |

It renders an `aria-hidden` box holding one `<img>` per layer, with spin layers wrapped in a
rotating element.

### 6.2 `<Shard>`: per-layer fine-tuning

Shards are children of `<ShardLight>`. Each one either **overrides** a preset shard (when its
`id` matches one) or **adds** a new shard (when it doesn't).

```tsx
import { ShardLight, Shard } from 'shardlight/react';

<ShardLight preset="star" size={320}>
  {/* tweak one preset shard */}
  <Shard id="beam" strength={0.9} size={1.1} />
  {/* hide one */}
  <Shard id="ring" visible={false} />
  {/* add a new one */}
  <Shard id="glint" kind="fan" count={5} size={0.25} strength={0.7} channel="glint" spin />
</ShardLight>
```

Named shard components (made by `createShardComponent`, §4.1) narrow the props per kind:

```tsx
import { ShardLight, Glow, Rays, Streaks, Halo } from 'shardlight/react';

<ShardLight preset={null} color="#9FD8FF">
  <Glow id="bloom" size={0.7} strength={0.4} falloff={3} channel="body" />
  <Glow id="hotspot" size={0.12} strength={1} hardness={0.4} channel="body" />
  <Rays id="spikes" count={6} size={0.9} width={5} taper={1} channel="rays" spin />
  <Streaks id="dust" clusters={3} perCluster={6} spread={30} size={0.5} channel="rays" />
  <Halo id="ring" size={0.6} width={0.04} strength={0.2} />
</ShardLight>
```

**How children become config:** each `<Shard>` returns `null` and registers its props with
the nearest light through context (`useLayoutEffect`). The light passes them to
`model.update({ shards })`. Baking already has to wait for mount (it needs `document`), so
registering through context costs nothing extra. It also lets shards sit inside fragments,
conditionals and wrapper components, which `React.Children` parsing would not handle. The
same context works in R3F's tree.

**Shard prop changes re-bake** only the layers containing that shard. The bake is debounced
to one per frame and cancels any stale one. This works for tuning, but it is not a way to
animate (see §6.3).

### 6.3 Animating

Per-frame values never go through React. Options, from least to most hands-on:

1. **`effects`** (or `spin` / `flicker`): declarative, no code (§4.3).
2. **CSS variables** on the light's root, for CSS, WAAPI, Framer Motion or GSAP:
   ```
   --shardlight-<channel>-scale    (default 1)
   --shardlight-<channel>-opacity  (default 1)
   --shardlight-spin               (angle; spin layers use it)
   ```
3. **The ref**, which writes those variables. `set()` takes the same shape as the 3D
   `set()` (§7.1), and `setChannel()` is shorthand for one channel:
   ```tsx
   const ref = useRef<ShardLightElement>(null);
   ref.current.set({ channels: { rays: { scale: 1.3 } }, spin: 30 });
   ref.current.setChannel('rays', { scale: 1.3 });
   <ShardLight ref={ref} className="hover:[--shardlight-rays-scale:1.3]" />
   ```
   `ShardLightElement` is the root `HTMLDivElement` plus `set`, `setChannel`, `ready` and
   `model`.

Channel names are written into CSS variable names as-is, so they must be valid CSS
identifiers. `resolveConfig()` warns in development when one isn't.

---

## 7. 3D: three.js and React Three Fiber

The R3F component is a thin wrapper over the three.js adapter. Everything 3D-specific
(planes, materials, spin group, textures, hit area, billboarding) is built once, in
`shardlight/three`.

### 7.1 three.js (no React): `shardlight/three`

```ts
import { createShardLight } from 'shardlight/three';

// default preset, nothing else needed
const light = createShardLight({ size: 0.4 });
scene.add(light.object);

// or a preset with per-shard overrides and an effect (merge rules: §4.5)
const sun = createShardLight({
  preset: 'sun',
  size: 0.6,
  shards: [
    { id: 'ring', visible: false },
    { id: 'glint', kind: 'fan', count: 5, size: 0.25, strength: 0.7, channel: 'glint', spin: true },
  ],
  effects: [{ type: 'pulse', channels: ['glint'], speed: 0.5 }],
});

// per frame, by hand: no re-bake, just transforms and opacity (combined with effects)
light.set({ channels: { rays: { scale: 1.2 } }, opacity: 0.8, spin: angle });

// change the look: re-bakes only the layers whose shards changed
light.update({ shards: [{ id: 'beam', strength: 1 }] });

light.dispose();   // releases its materials; shared textures are ref-counted
```

`createShardLight(options)` wraps a `createLightModel()` (§5) and returns:

| Member | Notes |
|---|---|
| `object` | A `THREE.Group`: one additive plane per layer, spin layers inside a child group. Position or parent it like any object |
| `set(values)` | Per-frame: `channels` (scale, opacity), overall `opacity`, `spin` angle. Writes mesh scale and material opacity only |
| `update(options)` | Changes `preset` / `config` / `shards` / `effects` / `color` / `resolution`. Re-bakes the affected layers asynchronously |
| `tick(dt)` | Advances effects. Called for you in `onBeforeRender` unless `autoUpdate: false` |
| `ready` | Promise that resolves once every texture is baked |
| `model` | The underlying headless model, for advanced use |
| `dispose()` | Frees materials, releases shared textures |

| Option | Notes |
|---|---|
| `preset`, `config`, `shards`, `effects` | §4.5 and §4.3. `shards` takes plain shard objects instead of `<Shard>` children |
| `size` | World units (plane edge) |
| `resolution` | Texture edge. Default 1024 |
| `baker` | Defaults to `canvas2d` (§4.4) |
| `autoUpdate` | Default `true`: effects run from `onBeforeRender` |
| `billboard` | Faces the camera, done in `onBeforeRender`, so no camera needs passing in. Default `false` |
| `hitRadius` | Radius of a circular hit area at the centre, as a fraction of the light's half-edge (like `size`); omitted = not raycastable |
| `material` | `(layer) => Material` factory, for custom shading. Default: additive `MeshBasicMaterial` with `depthWrite: false`, `toneMapped: false` |
| `renderOrder`, `depthTest`, `toneMapped` | Shorthands applied to the default materials |

**Instances share textures.** Every light with the same baked layer shares one texture.
Each instance gets its own materials, so opacity can fade per instance. Textures are
ref-counted and disposed when their last user is disposed.

### 7.2 React Three Fiber: `shardlight/r3f`

`<ShardLightMesh>` creates a `createShardLight` controller on mount, mounts its `object` with
`<primitive>`, turns prop and `<Shard>` changes into `update()`, and disposes it on unmount.
Its `ref` exposes the controller's `set()`, `ready`, `object` and `model`.

```tsx
import { ShardLightMesh, Shard } from 'shardlight/r3f';

<ShardLightMesh size={0.4} />            // default preset, nothing else needed

const light = useRef<ShardLightHandle>(null);
useFrame(() => light.current?.set({ channels: { rays: { scale: grow } } }));

<ShardLightMesh ref={light} preset="sun" size={0.4} position={[0, 1, -2]} spin flicker>
  <Shard id="ring" visible={false} />
</ShardLightMesh>
```

| Prop | Notes |
|---|---|
| `preset`, `config`, `<Shard>` children, `effects`, `spin`, `flicker` | Same as the DOM version (§4.5, §4.3) |
| Every §7.1 option | `size`, `resolution`, `baker`, `billboard`, `hitRadius`, `material`, `renderOrder`, … |
| `position`, `rotation`, `scale`, … | Normal R3F `group` props, applied to the light's `object` |
| `onClick`, `onPointerOver`, … | R3F pointer events. Only fire when `hitRadius` is set |
| `onReady` | Same as `ready` resolving |

---

## 8. Caching and memory

Mobile browsers cap a page's total canvas memory. Over the cap, `getContext('2d')` returns
`null` and pages can crash. So:

- **Cache key:** stable hash of the layer's resolved shards plus `color`, `rotation`,
  `seed`, `resolution`, `rayScale`, the baker's id and the requested `LayerSource` type.
  Shared across every light and target on the page.
- **DOM path:** draw → `toBlob` → object URL → free the canvas (`width = height = 0`)
  straight away. Hold the blob URL, ref-counted, and revoke it on last release.
- **3D path:** prefer `ImageBitmap`, which frees the canvas. Fall back to keeping the
  canvas while the texture lives.
- **One scratch canvas per bake,** freed right after the bake, not left for the GC.
- **A null context is not an error:** leave the result uncached so the next call retries,
  and report it through `onError`.
- **Bake one layer per task** (yielding between them), cancellable, so a big light never
  blocks a frame and stale bakes never finish.
- **`prewarm(config, opts)`** bakes ahead of time, so a light that appears on a key moment
  (a reveal, an entrance) is ready before it's needed.
- **`resolution: 'auto'`** caps the bake on low-memory devices (`navigator.deviceMemory`,
  platform hints) rather than by screen size.

---

## 9. Built-in presets

Registered by default (§4.2). Users extend them by spreading or by `<Shard>` overrides.

| Preset | Look | Shards |
|---|---|---|
| `star` (default) | Warm 4-point star | `bloom` glow, `hotspot` core, `beam` fan ×4, `ring` halo |
| `sun` | Big soft sun | Wide `bloom`, `hotspot`, `rays` fan ×36 (high variance), faint `ring` |
| `anamorphic` | Cinematic horizontal streak | `hotspot`, `beam` fan ×2 at 0° (long, thin), cool-tinted `bloom` |
| `sparkle` | Small crisp glint | `hotspot`, `spikes` fan ×6, `glint` fan ×6 offset 30° (short) |

Sketch of the default, with flat params:

```ts
import { definePreset } from 'shardlight';

export const star = definePreset({
  version: 1,
  color: '#FFF4E0',
  rotation: 45,
  seed: 1,
  shards: [
    { id: 'bloom',   kind: 'blob', channel: 'body', strength: 0.35, size: 0.8,
      hardness: 0, falloff: 3.2, softness: 2 },
    { id: 'hotspot', kind: 'blob', channel: 'body', strength: 1, size: 0.14,
      hardness: 0.35, falloff: 2 },
    { id: 'beam',    kind: 'fan', channel: 'rays', strength: 0.85, size: 0.95, count: 4,
      variance: 0.05, width: 6, taper: 1, falloff: 2, softness: 2 },
    { id: 'ring',    kind: 'halo', channel: 'rays', strength: 0.08, size: 0.65,
      width: 0.05, falloff: 2, softness: 1, variance: 0.3 },
  ],
});
```

Anything left out (`aspect`, `angle`, `jitter`, `inner`, `fadeIn`, …) takes the kind's
default.

---

## 10. Phases

| Phase | Deliverable |
|---|---|
| **0. Core** | Config types and `resolveConfig()`, the three registries (kinds, presets, effects) with the built-ins written as ordinary definitions, `canvas2d` baker, scheduler, cache, `createLightModel()`, `migrateConfig()` (v1, no-op), golden-image tests |
| **1. 2D React** | `<ShardLight>` adapter, `shared-react` (`<Shard>`, `createShardComponent`, named shards, context), CSS-var channels, effects (CSS + rAF), reduced motion, SSR fallback |
| **2. three.js** | `createShardLight()` adapter: planes, spin group, shared textures, `set()` / `update()` / `tick()` / `ready` / `dispose()`, billboard, hit radius, `material` factory |
| **3. R3F** | `<ShardLightMesh>` over the phase 2 adapter, `<Shard>` children, ref handle, R3F events |
| **4. Playground** | Controls generated from param schemas (custom kinds included), previews all three targets side by side, exports JSON or JSX |
| **5. Docs + publish** | Docs site, one example per target, one "write your own kind / effect / adapter" guide each, publish `shardlight` to npm, changesets |
| **6. Later** | `worker` baker. `shader` backend (live layers, shape animation). New built-in kinds (ghosts, chromatic fringe). More adapters (Vue, Svelte, Babylon) |

## 11. Testing

- **Core:** golden-image tests. Render each preset in a headless browser (Playwright) and
  compare it with stored PNGs within a tolerance. These are also the check for §4.6: a
  golden diff on a built-in is a breaking change.
- **Determinism:** the same config gives byte-identical output. Inserting a shard doesn't
  change the other shards' pixels.
- **Merge rules and schema:** `resolveConfig()` unit tests for every row of §4.5, plus
  default-filling and clamping.
- **Extensibility:** a test-only custom kind, effect and preset registered from outside,
  then used through all three targets. If something can't be done without importing
  internals, that's a bug.
- **Adapter contract suite:** exported as `shardlight/testing`, it drives a model through
  add/replace/remove/dispose and checks the adapter's host objects. All three adapters
  run it, and third-party adapters can too.
- **Cross-target parity:** each preset rendered as `<ShardLight>`, `<ShardLightMesh>` and
  `createShardLight()` (orthographic camera, plane filling the frame), then compared by
  screenshot. All three must match within a tolerance.
- **Memory:** ref counts reach zero, URLs are revoked, and textures are released (three's
  `info.memory` returns to its baseline). Cancelled bakes never land.
- **Migration:** saved configs from every past `version` load and render.
- **Packaging:** `shardlight/three` imported in a project with no React installed, and
  `shardlight/react` in one with no three, both build and run (checks the optional peers).

## 12. Open questions

1. **Is the global registry enough?** It's simple, but two copies of the package on one
   page, or two apps wanting different kinds, would clash. Alternative: an optional
   `<ShardLightProvider registry={…}>` / `createRegistry()` for isolation, with the global
   one as the default. Proposal: global registry in v1, with registry lookups kept behind
   one internal function so a scoped registry can be added without breaking anything.
2. **Should the DOM version render to a live `<canvas>` instead of `<img>`?** Live canvases
   cost more memory, while images are cheaper and composite well. Proposal: `<img>` by
   default. A canvas-based DOM adapter can come later through the adapter contract.
3. **Channel values beyond scale and opacity** (e.g. per-channel rotation, tint, blur)?
   Effects and adapters would both need to support them. Proposal: keep `ChannelValues` an
   interface (augmentable) but ship only scale and opacity in v1, plus the light-wide spin.
4. **Reserve the name early:** publish a placeholder `shardlight@0.0.0` so the name stays
   free until v1.
