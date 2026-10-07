---
"shardlight": patch
---

Scale `softness` (and a custom kind's `blur()`) with the bake resolution. These are documented as px at a 1024 bake, but the baker applied them at raw pixels, so a light baked below 1024 (for example with `resolution: 'auto'`, a small `size`, or an explicit low resolution) came out visibly softer. Lights now look the same at any resolution.
