import { defineEffect } from './registry.js';

/**
 * `collapse`: shrinks (`scale`) and fades (`opacity`) each target channel as the
 * light is clicked. `out.collapse` is the light-wide collapsed amount (0..1),
 * eased by the model: a click implodes the light, a second click springs back.
 *
 * Click is user-driven, so it keeps running under `prefers-reduced-motion`.
 */
export const collapse = defineEffect({
  name: 'collapse',
  label: 'Collapse',
  params: {
    channels: { type: 'channels', default: ['*'] },
    scale: { type: 'number', default: 0, min: 0, max: 4, step: 0.01 },
    opacity: { type: 'number', default: 1, min: 0, max: 4, step: 0.01 },
  },
  reducedMotion: 'keep',
  apply(_t, p, out) {
    const amount = out.collapse;
    if (amount <= 0) return;
    const targets = p.channels.includes('*') ? out.channels() : p.channels;
    for (const channel of targets) {
      const values = out.channel(channel);
      values.scale *= 1 + (p.scale - 1) * amount;
      values.opacity *= 1 + (p.opacity - 1) * amount;
    }
  },
});
