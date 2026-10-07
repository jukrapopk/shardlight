---
"shardlight": patch
---

Fix a state leak between shards in one bake. The canvas2d baker reuses a single scratch canvas, but it was only `clearRect`-ed between shards, so a custom kind that left the context dirty — or threw part-way through `draw`/`mask` — could leak its transform, clip or composite mode into the *next* shard. The scratch is now fully reset before each shard (`reset()`, falling back to a fresh canvas per shard on engines without it).
