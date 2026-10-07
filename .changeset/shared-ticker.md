---
"shardlight": minor
---

DOM lights now share one `requestAnimationFrame` loop and stop ticking while offscreen or while the tab is hidden, instead of each running a permanent loop. Effects pause out of view and resume when the light scrolls back into view.
