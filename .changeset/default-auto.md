---
"shardlight": minor
---

`<ShardLight>` now defaults `resolution` to `'auto'` — the rendered size × DPR, measured on mount — instead of a fixed 1024, so a light bakes at the size it is shown (less memory and bake time in the common case). The headless model and the three.js / R3F adapters still default to 1024; pass `resolution` to override either way.
