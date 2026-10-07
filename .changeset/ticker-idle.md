---
"shardlight": patch
---

Stop ticking DOM lights that have nothing to animate. The shared `requestAnimationFrame` loop ran for every visible light, even when idle — and presets ship effect-free, so that was the default case. A light now subscribes only while it has a continuous effect (`pulse`, `flicker`, `spin`) or hover/collapse easing in flight. The model exposes the state as `model.animating` / `model.onActivity(listener)`, and `tick()` returns immediately while idle.
