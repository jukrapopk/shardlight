import { definePreset } from './registry.js';

/** `comet`: a bright head trailing a single long, tapered tail. */
export const comet = definePreset({
  version: 1,
  color: '#FFE6C0',
  rotation: 0,
  seed: 9,
  shards: [
    {
      id: 'glow',
      kind: 'blob',
      channel: 'body',
      strength: 0.3,
      size: 0.5,
      hardness: 0,
      falloff: 2.6,
      softness: 4,
    },
    {
      id: 'head',
      kind: 'blob',
      channel: 'body',
      strength: 1,
      size: 0.12,
      hardness: 0.4,
      falloff: 2,
    },
    {
      id: 'tail',
      kind: 'fan',
      channel: 'rays',
      strength: 0.7,
      size: 1.35,
      count: 1,
      angle: 0,
      width: 8,
      taper: 1,
      falloff: 1.2,
      fadeIn: 0.06,
      softness: 3,
    },
  ],
});
