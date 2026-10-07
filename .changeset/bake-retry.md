---
"shardlight": patch
---

Fix the failed-bake retry. A bake that threw (for example `NullContextError`, the canvas memory cap) left its cache key marked as acquired, so `sync()` skipped it forever and `ready` never resolved — the documented "try again later" never happened. A failed bake now releases its acquisition, so the next `update()` re-bakes it.
