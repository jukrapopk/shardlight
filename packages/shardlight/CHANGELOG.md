# shardlight

## 0.2.1

### Patch Changes

- 23aa470: Fix the React and R3F adapters silently discarding a preset's or config's own effects. They always passed an empty `effects` array, which `resolveConfig` treats as "no effects" and therefore shadows both `config.effects` and the preset's effects — so `registerPreset('star-spin', { ...star, effects: [...] })` (or a saved config with effects) did nothing under `<ShardLight>`. They now pass `null` when no `effects` prop or shorthand is set, which lets the config/preset effects through.
- 9e3ad8b: `<ShardLight resolution="auto">` (the default) now re-measures with a `ResizeObserver` and re-bakes when the rendered size crosses a power-of-two step, instead of measuring only once on mount. This fixes lights mounted hidden (which fell back to 256) and lights inside a resizing or transformed ancestor. The previous image stays on screen until the new bake is ready, so a re-bake swaps in place rather than blanking.
- 7e89511: Fix the failed-bake retry. A bake that threw (for example `NullContextError`, the canvas memory cap) left its cache key marked as acquired, so `sync()` skipped it forever and `ready` never resolved — the documented "try again later" never happened. A failed bake now releases its acquisition, so the next `update()` re-bakes it.
- 3e19e57: `<ShardLight>` now defaults `resolution` to `'auto'` — the rendered size × DPR, measured on mount — instead of a fixed 1024, so a light bakes at the size it is shown (less memory and bake time in the common case). The headless model and the three.js / R3F adapters still default to 1024; pass `resolution` to override either way.
- 3d8c62d: Fix a state leak between shards in one bake. The canvas2d baker reuses a single scratch canvas, but it was only `clearRect`-ed between shards, so a custom kind that left the context dirty — or threw part-way through `draw`/`mask` — could leak its transform, clip or composite mode into the _next_ shard. The scratch is now fully reset before each shard (`reset()`, falling back to a fresh canvas per shard on engines without it).
- 34d4d07: Coerce an unsupported `blend: 'screen'` to `'add'` at resolve time instead of passing it through. Previously the resolved shard kept `'screen'`, which split it into its own layer (an extra bake) and made three.js/R3F render it as _normal_ blending while the DOM rendered it additively — three targets disagreeing, contradicting the docs. The request is now reported once per light (not per shard per resolve) and every target renders additively.
- 45dc7e2: DOM lights stop ticking when they have nothing to animate. The shared loop ran for every visible light, and presets ship effect-free, so an idle light used to run an `requestAnimationFrame` every frame. The model now exposes `model.animating` and `model.onActivity(listener)`, and the DOM adapter subscribes only while a light is on screen and animating. Every effect animates by default; the built-in `hover` and `collapse` are marked `inputDriven` and only count while easing, so a custom effect keeps animating unless it opts in.

## 0.2.0

### Minor Changes

- bd41118: `resolution: 'auto'` now measures the rendered element, so string sizes such as `size="100%"` bake at the right resolution instead of assuming a 256px edge. Numeric sizes and the 1024 default are unchanged.
- 900f918: DOM lights now share one `requestAnimationFrame` loop and stop ticking while offscreen or while the tab is hidden, instead of each running a permanent loop. Effects pause out of view and resume when the light scrolls back into view.

### Patch Changes

- 7b49a71: A custom shard kind that throws in `draw` or `mask` is still skipped (the bake survives), but it now logs a development warning naming the shard and kind instead of failing silently.
- c112a09: Document blending. Layers composite additively (`plus-lighter` on the DOM, `AdditiveBlending` in three.js/R3F), so a light is invisible on white or very light backgrounds. A shard's `blend: 'screen'` is accepted but no target implements it, so it renders as `'add'` and now logs a development warning instead of failing silently.
- 60c8fad: Expand the package README with a shard-kinds parameter table, per-preset shard ids, and notes on resolution/memory, SSR and first paint, and accessibility.
- ed327c9: The canvas2d baker reuses one scratch canvas per bake instead of allocating a full-size canvas per shard, cutting peak allocations for layers with many shards. Output is unchanged.
- 31cf7ce: Scale `softness` (and a custom kind's `blur()`) with the bake resolution. These are documented as px at a 1024 bake, but the baker applied them at raw pixels, so a light baked below 1024 (for example with `resolution: 'auto'`, a small `size`, or an explicit low resolution) came out visibly softer. Lights now look the same at any resolution.
