---
"shardlight": minor
---

`<ShardLight resolution="auto">` (the default) now re-measures with a `ResizeObserver` and re-bakes when the rendered size crosses a power-of-two step, instead of measuring only once on mount. This fixes lights mounted hidden (which fell back to 256) and lights inside a resizing or transformed ancestor. The previous image stays on screen until the new bake is ready, so a re-bake swaps in place rather than blanking.
