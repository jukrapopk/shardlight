# shardlight

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
