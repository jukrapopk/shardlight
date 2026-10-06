import { definePreset } from './registry.js';

/** `star` (default): a warm 4-point star with a soft bloom and a faint ring. */
export const star = definePreset({
  version: 1,
  color: '#FFF4E0',
  rotation: 45,
  seed: 1,
  shards: [
    {
      id: 'bloom',
      kind: 'blob',
      channel: 'body',
      strength: 0.4,
      size: 0.85,
      hardness: 0,
      falloff: 3,
      softness: 3,
    },
    {
      id: 'hotspot',
      kind: 'blob',
      channel: 'body',
      strength: 1,
      size: 0.13,
      hardness: 0.4,
      falloff: 2.2,
    },
    {
      id: 'beam',
      kind: 'fan',
      channel: 'rays',
      strength: 0.9,
      size: 1,
      count: 4,
      variance: 0.08,
      width: 5,
      taper: 1,
      falloff: 2,
      softness: 2,
    },
    {
      id: 'ring',
      kind: 'halo',
      channel: 'rays',
      strength: 0.06,
      size: 0.62,
      width: 0.05,
      falloff: 2,
      softness: 1.5,
      variance: 0.35,
    },
  ],
});
