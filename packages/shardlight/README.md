# shardlight

[![CI](https://github.com/jukrapopk/shardlight/actions/workflows/ci.yml/badge.svg)](https://github.com/jukrapopk/shardlight/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/shardlight.svg)](https://www.npmjs.com/package/shardlight)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jukrapopk/shardlight/blob/main/packages/shardlight/LICENSE)
[![demo](https://img.shields.io/badge/demo-live-ffb454)](https://jukrapopk.github.io/shardlight/)

Procedural lens-flare lights for React, [three.js](https://threejs.org) and
[React Three Fiber](https://r3f.docs.pmnd.rs/). Build a light once and it looks the same
everywhere.

A light is an ordered list of _shards_ (glows, rays, streak bundles, halos). Shards that
share a motion channel are baked into one image, then animated — scale, opacity and rotation —
with no re-rendering.

![shardlight presets: star, sun, sparkle, starburst, ember](https://raw.githubusercontent.com/jukrapopk/shardlight/main/assets/demo.png)

- **One light, three targets.** The same config renders to `<img>`, to three.js planes, and
  to R3F meshes, and looks the same everywhere.
- **Easy by default.** `<ShardLight preset="star" />` draws a light; swap the preset, or start
  from nothing.
- **Tunable at every level.** Preset → shards → per-shard motion → channel effects → per-frame
  values → CSS variables. Change one shard, or drive the whole light.
- **Declarative or imperative.** Describe lights as JSX / JSON, or drive them per frame from state,
  a ref, or CSS — without re-baking.
- **Extensible without forking.** New shard kinds, effects and presets plug in through public
  registries (and augmentable types). The built-ins are registered the same way.
- **Data first.** Every light is a plain, versioned JSON config; JSX compiles to it.

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

`flicker` and `collapse` are shorthands for those effects. Omit `preset` (or pass `preset={null}`)
to start empty and build a light purely from `<Shard>` children.

Animate from CSS variables, or imperatively through a ref — never through React props:

```tsx
const ref = useRef<ShardLightHandle>(null);
ref.current?.set({ channels: { rays: { scale: 1.3, rotation: 20 } } });
ref.current?.setChannel('rays', { scale: 1.3 });
```

See [Control](#control) for every level you can change.

#### Effects

Five built-in effects:

| Effect | Params (defaults) | Does |
|---|---|---|
| `pulse` | `amount` 0.1, `speed` 1, `channels` `['main']` | Scales a channel in and out |
| `flicker` | `amount` 0.15, `speed` 1, `channels` all | Wobbles a channel's brightness |
| `spin` | `speed` 0.1 turns/s, `phase` 0, `channels` `['main']` | Turns a channel |
| `hover` | `scale` 1.15, `opacity` 1, `rotate` 0, `spin` 0, `channels` `['main']` | Reacts while hovered |
| `collapse` | `scale` 0, `opacity` 1, `channels` all, `trigger` click | Implodes on click (`click` toggles, `once` stays, `none` = manual) |

`flicker` and `collapse` are also shorthand props:

```tsx
<ShardLight preset="ember" size={320} flicker={{ amount: 0.35 }} />
<ShardLight preset="star" size={320} collapse />                      {/* click toggles */}
<ShardLight preset="star" size={320} collapse={{ trigger: 'once' }} /> {/* click collapses once */}
```

`collapse={{ trigger: 'none' }}` leaves the light's click alone so you can drive it yourself —
`ref.current?.setCollapsed(true)`, `toggleCollapsed()`, or `set({ collapse: 0..1 })` — and tie it to
your own state. `once` collapses and stays; `click` (the default) toggles.

`spin`, `hover` and `collapse` also sit directly on a shard, so a preset can carry its own defaults:

```tsx
<ShardLight preset="star" size={320}>
  <Shard id="beam" spin={0.08} />                             {/* turns on its own */}
  <Shard id="hotspot" hover={{ scale: 1.6, opacity: 1.4 }} /> {/* reacts to pointer-over */}
  <Shard id="ring" hover={{ spin: 0.3 }} />                    {/* spins up while hovered */}
  <Shard id="glint" kind="fan" count={5} collapse />           {/* implodes on click */}
</ShardLight>
```

A shard with `spin`, `hover` or `collapse` is moved to its own channel, so it never drags the
shards it was baked with. `spin` is `turns/second` (negative reverses). `hover` scales / fades /
turns the shard as the pointer sits over the light, eased in and out; add `spin` to keep turning
while hovered and hold that angle after. `collapse` scales / fades it away when the light is
clicked, eased in and out. Both are whole-light; drive them by hand with `ref.current?.setHover(…)`
and `ref.current?.setCollapsed(…)`.

Every effect is also plain config, so a preset (or you) can list them on any channel:

```ts
effects={[
  { type: 'spin', channels: ['rays'], speed: 0.05 },
  { type: 'hover', channels: ['body'], scale: 1.2, spin: 0.1 },
  { type: 'flicker', amount: 0.2, channels: ['*'] },
  { type: 'collapse', scale: 0.2, opacity: 0, channels: ['*'] },
]}
```

The five built-in presets ship effect-free, so a preset stays still until you give it motion.

A light only runs its animation loop while it is on screen and the tab is visible, so effects
pause offscreen and resume when it scrolls back. Every effect animates by default; `hover` and
`collapse` are input-driven and only run while easing. A light with nothing to animate — an
effect-free preset — runs no frames at all.

### three.js — `shardlight/three`

```ts
import { createShardLight } from 'shardlight/three';

const light = createShardLight({ preset: 'sun', size: 0.6 });
scene.add(light.object);

// per frame: no re-bake, just transforms and opacity
light.set({ channels: { rays: { scale: 1.2 } }, opacity: 0.8 });
light.setHover(true); // eases the light's `hover` shards in
light.toggleCollapsed(); // or setCollapsed(true) to implode

light.update({ shards: [{ id: 'beam', strength: 1 }] }); // re-bakes only what changed
light.dispose();
```

### React Three Fiber — `shardlight/r3f`

```tsx
import { ShardLightMesh, Shard } from 'shardlight/r3f';

<ShardLightMesh ref={light} preset="sun" size={0.4} position={[0, 1, -2]} flicker>
  <Shard id="ring" visible={false} />
</ShardLightMesh>;

// pointer-over eases `hover` shards in and clicks collapse — automatically
light.current?.setHover(false);
light.current?.setCollapsed(true);
```

### Headless core — `shardlight`

Framework-free: config, kinds, presets, effects, baking and cache. Every adapter wraps
`createLightModel()`.

```ts
import { createLightModel, resolveConfig, migrateConfig, prewarm } from 'shardlight';

const model = createLightModel({
  preset: 'star',        // a name, a config, or `null` (start empty)
  config,                // optional partial ShardLightConfig merged over the preset
  shards,                // optional per-shard overrides
  effects,               // optional effects
  resolution: 1024,
  rayScale: 1,           // thins every ray
  accepts: ['bitmap'],   // 'url' | 'bitmap' | 'canvas'
  reducedMotion: false,  // pauses auto effects
  hoverEase: 0.25,       // seconds; 0 snaps
  collapseEase: 0.3,
});

model.subscribe((layers) => {
  /* one image per layer: add / replace / remove host objects */
});
model.onFrame((values) => {
  /* channel scale / opacity / rotation, plus the eased `hover` and `collapse` */
});
model.animating;                 // false when there is nothing to animate
model.onActivity((active) => {
  /* drive your own render loop; called with the current value */
});

model.set({ channels: { rays: { scale: 1.2 } }, opacity: 0.8 }); // per frame
model.setChannel('rays', { rotation: 15 });
model.setHover(true);
model.setCollapsed(false);
model.toggleCollapsed();

await model.ready;               // every layer baked
model.update({ preset: 'sun' }); // re-resolves, re-bakes only what changed
model.resolved;                  // the current ResolvedLight
model.layers;                    // the current host layers
model.dispose();
```

### Blending and backgrounds

Layers composite **additively** — `plus-lighter` on the DOM, `AdditiveBlending` in
three.js and R3F. Additive light only ever brightens, so a light is invisible on a white
or very light background; give it a dark (or at least dark-enough) backdrop.

A shard's `blend` accepts `'add'` (the default) or `'screen'`, but only `'add'` is
implemented: `'screen'` is coerced to `'add'` (with one development warning per light).

## Reference

### Shard kinds

Four kinds build every light; `kind` is the `kind` prop / config value. Ranges are
the schema's `min`–`max`.

| Kind | Name | Params — default · range |
|---|---|---|
| `blob` | Glow | `strength` 1 · 0–2; `size` 0.5 · 0–2 (half-edge fraction); `hardness` 0 · 0–0.999; `falloff` 2 · 0.1–8; `aspect` 1 · 0.1–10; `angle` 0°; `softness` 0 · 0–50 px (at 1024); `variance` 0 · 0–1 |
| `fan` | Rays | `strength` 1 · 0–2; `size` 1 · 0–2 (half-edge fraction); `count` 4 · 1–256; `angle` 0°; `jitter` 0 · 0–1; `inner` 0 · 0–1; `variance` 0 · 0–1; `width` 4 · 0–100 px (at 1024, ray-scaled); `taper` 1 · 0–1; `falloff` 1 · 0–8; `fadeIn` 0 · 0–1; `softness` 1 · 0–50 px (ray-scaled) |
| `halo` | Halo | `strength` 0.1 · 0–2; `size` 0.5 · 0–2 (half-edge fraction); `width` 0.05 · 0–2 (half-edge fraction); `falloff` 1 · 0–8; `softness` 0 · 0–50 px (at 1024); `variance` 0 · 0–1 |
| `clusters` | Streaks | `clusters` 4 · 1–64; `perCluster` 5 · 1–64; `spread` 20 · 0–360°; `inner` 0.1 · 0–1; `strength` 0.5 · 0–2; `size` 0.5 · 0–2 (half-edge fraction); `angle` 0°; `variance` 0.5 · 0–1; `width` 2 · 0–100 px (at 1024, ray-scaled); `taper` 0.5 · 0–1; `falloff` 1 · 0–8; `fadeIn` 0.1 · 0–1; `softness` 1 · 0–50 px (ray-scaled) |

`relativeTo="<id>"` on a `fan` or `clusters` measures its `angle` from another shard's.

### Preset shards

Override, hide or extend a preset by `id`. Every preset also takes a light-wide
`color`, `rotation` and `seed`.

| Preset | Shards — `id` · kind · channel |
|---|---|
| `star` | `bloom` blob·body; `hotspot` blob·body; `beam` fan·rays; `ring` halo·rays |
| `sun` | `bloom` blob·body; `hotspot` blob·body; `rays` fan·rays; `ring` halo·rays |
| `sparkle` | `bloom` blob·body; `hotspot` blob·body; `spikes` fan·rays; `glint` fan·glint |
| `starburst` | `glow` blob·body; `core` blob·body; `rays` fan·rays |
| `ember` | `bloom` blob·body; `hotspot` blob·body; `sparks` fan·rays |

### Resolution

The bake edge. `<ShardLight>` defaults to **`'auto'`** — the rendered size × DPR, measured once
on mount, capped at 2048 (1024 on low-memory devices). It does not track a later resize, and a
light mounted while hidden falls back to 256. The headless model and the three.js / R3F adapters
default to **1024**. Each layer is one `resolution²` RGBA image — about 4 MiB decoded at 1024²,
so `star`'s two layers are ~8 MiB. Lower it for many lights at once; raise it for very large ones.

### SSR and first paint

The model is created in an effect, so on the server (and the first paint) a
`<ShardLight>` renders an empty box. Pass `fallback` for something to show meanwhile,
or `prewarm()` a config's layers before first paint.

### Accessibility

The DOM root is `aria-hidden` and its images have `alt=""` — a light is decorative.
`hover` follows pointer-over and `collapse` is click-only, with no keyboard path; for a
keyboard-accessible control, set `collapse={{ trigger: 'none' }}` and drive it yourself
with `ref.current?.toggleCollapsed()`.

## Control

Everything below animates without re-baking. Only changing a shard — its kind, params or color —
bakes again, and only the layers that changed.

**Presets.** Start from a built-in, your own config object, or nothing:

```tsx
<ShardLight preset="sun" />
<ShardLight preset={myConfig} />
<ShardLight />   {/* empty: build it from <Shard> children */}
```

**Shards.** Override, hide or add any shard by `id` — no deep merge:

```tsx
<ShardLight preset="star">
  <Shard id="beam" strength={0.9} size={1.1} />             {/* tweak a preset shard */}
  <Shard id="ring" visible={false} />                       {/* hide one */}
  <Shard id="glint" kind="fan" count={5} channel="glint" /> {/* add one */}
</ShardLight>
```

**Per-shard motion.** `spin`, `hover` and `collapse` sit on a shard (see [Effects](#effects)); each
gets its own channel so it moves independently of what it was baked with.

**Channel values.** Scale / opacity / rotation per channel, statically or per frame:

```tsx
<ShardLight channels={{ rays: { scale: 1.2, rotation: 15 } }} />
ref.current?.setChannel('rays', { opacity: 0.5 });
```

**Imperative / per-frame.** The DOM and R3F refs, and the three controller, expose:

```ts
set({ channels, opacity, hover, collapse });          // per-frame values
setChannel(channel, { scale, opacity, rotation });
setHover(bool); setCollapsed(bool); toggleCollapsed();
ready;   // Promise that resolves once every layer is baked
model;   // the headless LightModel
```

**CSS variables (DOM).** The light writes these on its root, so CSS, WAAPI, GSAP or Framer Motion
can drive it with no JS per frame:

```
--shardlight-<channel>-scale      (default 1)
--shardlight-<channel>-opacity    (default 1)
--shardlight-<channel>-rotation   (default 0deg)
--shardlight-opacity              (whole light)
```

```css
.badge:hover { --shardlight-rays-scale: 1.3; --shardlight-rays-rotation: 15deg; }
```

**Render options.** `resolution` (`'auto'` = rendered size × DPR, the `<ShardLight>` default) and
`rayScale` at the adapter; `baker`, `accepts`, `reducedMotion`, `hoverEase` and `collapseEase` on
the model.

**Data first.** Every light is a versioned `ShardLightConfig`: save and load it as JSON,
`migrateConfig()` old saves, and `prewarm()` a config's layers before first paint.

## Extending

New kinds, effects and presets register like the built-ins, so they work in every target:

```ts
import {
  star,
  defineShardKind, registerShardKind,
  defineEffect, registerEffect,
  definePreset, registerPreset,
} from 'shardlight';
import { createShardComponent } from 'shardlight/react';

// a new shard kind — `params` drives defaults, validation and typed props
const dots = defineShardKind({
  kind: 'dots',
  label: 'Ring of dots',
  params: { count: { type: 'number', default: 12, min: 1, max: 64, step: 1 } },
  draw(ctx, p, env) { /* the context is centered, rotated and colored for you */ },
});
registerShardKind(dots);

// a new effect — a pure function of time over the frame values
const sway = defineEffect({
  name: 'sway',
  params: { amount: { type: 'number', default: 0.4, min: 0, max: 1 } },
  apply(t, p, out) { out.channel('rays').rotation += p.amount * 30 * Math.sin(t); },
});
registerEffect(sway);

// a preset is just a config, and can carry its own motion
registerPreset('star-spin', {
  ...star,
  effects: [{ type: 'spin', channels: ['rays'], speed: 0.05 }],
});

// typed components for a kind, in either React entry
const Dots = createShardComponent(dots);
<ShardLight preset="star"><Dots id="crown" count={8} /></ShardLight>
```

An effect animates by default. Mark one `inputDriven: true` — as the built-in `hover` and
`collapse` do — only if it moves purely in response to input, so an idle light can stop its
animation loop.

`ShardKinds`, `ShardPresets` and `ChannelValues` are augmentable, so downstream kinds and presets
are typed too:

```ts
declare module 'shardlight' {
  interface ShardKinds { dots: ParamsOf<typeof dots> }
}
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
`<ShardLight>`, `createShardLight()` and `<ShardLightMesh>`, plus resolution parity and that
effects animate (and idle lights do not). Regenerate goldens with
`pnpm test:visual:update` after an intentional look change.

## License

[MIT](https://github.com/jukrapopk/shardlight/blob/main/packages/shardlight/LICENSE)
