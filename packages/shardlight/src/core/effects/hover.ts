import { defineEffect } from './registry.js';

/**
 * `hover`: eases each target channel toward `scale` / `opacity` / `rotate` as
 * the pointer sits over the light, and keeps turning at `spin` turns/s while it
 * is there. `out.hover` is the light-wide hover amount (0..1) and
 * `out.hoverTime` is the seconds accumulated while hovered, both eased by the
 * model, so the response is the same shape everywhere.
 *
 * Hover is user-driven, so it keeps running under `prefers-reduced-motion`.
 */
export const hover = defineEffect({
  name: 'hover',
  label: 'Hover',
  inputDriven: true,
  params: {
    channels: { type: 'channels', default: ['main'] },
    scale: { type: 'number', default: 1.15, min: 0, max: 4, step: 0.01 },
    opacity: { type: 'number', default: 1, min: 0, max: 4, step: 0.01 },
    rotate: { type: 'angle', default: 0 },
    spin: { type: 'number', default: 0, min: -10, max: 10, step: 0.01, unit: 'turns/s' },
  },
  reducedMotion: 'keep',
  apply(_t, p, out) {
    const h = out.hover;
    for (const channel of p.channels) {
      const values = out.channel(channel);
      values.scale *= 1 + (p.scale - 1) * h;
      values.opacity *= 1 + (p.opacity - 1) * h;
      // A fixed nudge at full hover, plus a continuous turn banked while hovered.
      values.rotation += p.rotate * h + p.spin * 360 * out.hoverTime;
    }
  },
});
