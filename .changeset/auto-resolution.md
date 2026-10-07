---
"shardlight": minor
---

`resolution: 'auto'` now measures the rendered element, so string sizes such as `size="100%"` bake at the right resolution instead of assuming a 256px edge. Numeric sizes and the 1024 default are unchanged.
