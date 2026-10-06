import { definePreset } from './registry.js';

/** `sparkle`: a small crisp glint (plan §9). */
export const sparkle = definePreset({
  version: 1,
  color: '#FFFFFF',
  rotation: 0,
  seed: 4,
  shards: [
    {
      id: 'hotspot',
      kind: 'blob',
      channel: 'body',
      strength: 1,
      size: 0.06,
      hardness: 0.5,
      falloff: 2,
    },
    {
      id: 'spikes',
      kind: 'fan',
      channel: 'rays',
      strength: 0.9,
      size: 0.3,
      count: 6,
      width: 3,
      taper: 1,
      falloff: 2,
      softness: 1,
    },
    {
      id: 'glint',
      kind: 'fan',
      channel: 'glint',
      strength: 0.6,
      size: 0.18,
      count: 6,
      angle: 30,
      width: 2,
      taper: 1,
      falloff: 2,
      softness: 1,
      spin: true,
    },
  ],
});
