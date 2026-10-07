---
"shardlight": patch
---

Coerce an unsupported `blend: 'screen'` to `'add'` at resolve time instead of passing it through. Previously the resolved shard kept `'screen'`, which split it into its own layer (an extra bake) and made three.js/R3F render it as *normal* blending while the DOM rendered it additively — three targets disagreeing, contradicting the docs. The request is now reported once per light (not per shard per resolve) and every target renders additively.
