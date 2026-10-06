import { defineEffect } from './registry.js';

/**
 * `flicker`: a two-sine brightness wobble, applied to each channel's opacity.
 * `channels: ['*']` (the default) means every channel.
 */
export const flicker = defineEffect({
  name: 'flicker',
  label: 'Flicker',
  params: {
    amount: { type: 'number', default: 0.15, min: 0, max: 1 },
    speed: { type: 'number', default: 1, min: 0, max: 10, step: 0.01 },
    channels: { type: 'channels', default: ['*'] },
  },
  apply(t, p, out) {
    const s = t * p.speed;
    const factor =
      1 -
      p.amount *
        (0.5 + 0.25 * Math.sin(11.3 * s) + 0.25 * Math.sin(17.9 * s + 1.7));
    const targets = p.channels.includes('*') ? out.channels() : p.channels;
    for (const channel of targets) out.channel(channel).opacity *= factor;
  },
});
