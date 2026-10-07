import { defineEffect } from './registry.js';

/**
 * `spin`: adds `phase + speed · 360 · t` degrees to each target channel's
 * rotation. Several spin effects on one channel add up, so a shard can turn at
 * the sum of their speeds.
 */
export const spin = defineEffect({
  name: 'spin',
  label: 'Spin',
  params: {
    channels: { type: 'channels', default: ['main'] },
    speed: { type: 'number', default: 0.1, min: -10, max: 10, step: 0.01, unit: 'turns/s' },
    phase: { type: 'angle', default: 0 },
  },
  apply(t, p, out) {
    const rotation = p.phase + p.speed * 360 * t;
    for (const channel of p.channels) out.channel(channel).rotation += rotation;
  },
});
