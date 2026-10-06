import { defineEffect } from './registry.js';

/**
 * `hover`: eases each target channel toward `scale` / `opacity` / `rotate` as
 * the pointer sits over the light. `out.hover` is the light-wide hover amount
 * (0..1), eased by the model, so the response is the same shape everywhere.
 *
 * Hover is user-driven, so it keeps running under `prefers-reduced-motion`.
 */
export const hover = defineEffect({
  name: 'hover',
  label: 'Hover',
  params: {
    channels: { type: 'channels', default: ['main'] },
    scale: { type: 'number', default: 1.15, min: 0, max: 4, step: 0.01 },
    opacity: { type: 'number', default: 1, min: 0, max: 4, step: 0.01 },
    rotate: { type: 'angle', default: 0 },
  },
  reducedMotion: 'keep',
  apply(_t, p, out) {
    const h = out.hover;
    if (h <= 0) return;
    for (const channel of p.channels) {
      const values = out.channel(channel);
      values.scale *= 1 + (p.scale - 1) * h;
      values.opacity *= 1 + (p.opacity - 1) * h;
      values.rotation += p.rotate * h;
    }
  },
});
