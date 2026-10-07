---
"shardlight": minor
---

DOM lights stop ticking when they have nothing to animate. The shared loop ran for every visible light, and presets ship effect-free, so an idle light used to run an `requestAnimationFrame` every frame. The model now exposes `model.animating` and `model.onActivity(listener)`, and the DOM adapter subscribes only while a light is on screen and animating. Every effect animates by default; the built-in `hover` and `collapse` are marked `inputDriven` and only count while easing, so a custom effect keeps animating unless it opts in.
