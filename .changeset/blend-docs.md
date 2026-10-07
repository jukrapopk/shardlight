---
"shardlight": patch
---

Document blending. Layers composite additively (`plus-lighter` on the DOM, `AdditiveBlending` in three.js/R3F), so a light is invisible on white or very light backgrounds. A shard's `blend: 'screen'` is accepted but no target implements it, so it renders as `'add'` and now logs a development warning instead of failing silently.
