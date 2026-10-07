---
"shardlight": patch
---

The canvas2d baker reuses one scratch canvas per bake instead of allocating a full-size canvas per shard, cutting peak allocations for layers with many shards. Output is unchanged.
