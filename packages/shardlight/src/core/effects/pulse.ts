import { defineEffect } from './registry.js';

/**
 * `pulse`: multiplies each channel's scale by `1 + amount·sin(2π·speed·t)`.
 */
export const pulse = defineEffect({
  name: 'pulse',
  label: 'Pulse',
  params: {
    channels: { type: 'channels', default: ['main'] },
    speed: { type: 'number', default: 1, min: 0, max: 10, step: 0.01 },
    amount: { type: 'number', default: 0.1, min: 0, max: 1 },
  },
  apply(t, p, out) {
    const k = 1 + Math.sin(t * p.speed * Math.PI * 2) * p.amount;
    for (const channel of p.channels) out.channel(channel).scale *= k;
  },
});
