import { definePreset } from './registry.js';

/** `starburst`: a bright core throwing many long, fine, uneven rays. */
export const starburst = definePreset({
  version: 1,
  color: '#FFFFFF',
  rotation: 0,
  seed: 7,
  shards: [
    {
      id: 'glow',
      kind: 'blob',
      channel: 'body',
      strength: 0.3,
      size: 0.5,
      hardness: 0,
      falloff: 3,
      softness: 4,
    },
    {
      id: 'core',
      kind: 'blob',
      channel: 'body',
      strength: 1,
      size: 0.1,
      hardness: 0.5,
      falloff: 2,
    },
    {
      id: 'rays',
      kind: 'fan',
      channel: 'rays',
      strength: 0.7,
      size: 1.1,
      count: 24,
      variance: 0.45,
      width: 2,
      taper: 1,
      falloff: 1.6,
      fadeIn: 0.02,
      softness: 1,
    },
  ],
});
