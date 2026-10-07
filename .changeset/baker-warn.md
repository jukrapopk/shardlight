---
"shardlight": patch
---

A custom shard kind that throws in `draw` or `mask` is still skipped (the bake survives), but it now logs a development warning naming the shard and kind instead of failing silently.
