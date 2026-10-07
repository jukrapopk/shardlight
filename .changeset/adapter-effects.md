---
"shardlight": patch
---

Fix the React and R3F adapters silently discarding a preset's or config's own effects. They always passed an empty `effects` array, which `resolveConfig` treats as "no effects" and therefore shadows both `config.effects` and the preset's effects — so `registerPreset('star-spin', { ...star, effects: [...] })` (or a saved config with effects) did nothing under `<ShardLight>`. They now pass `null` when no `effects` prop or shorthand is set, which lets the config/preset effects through.
