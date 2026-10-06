import { definePreset } from './registry.js';

/** `star` (default): a warm 4-point star (plan §9). */
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
      strength: 0.35,
      size: 0.8,
      hardness: 0,
      falloff: 3.2,
      softness: 2,
    },
    {
      id: 'hotspot',
      kind: 'blob',
      channel: 'body',
      strength: 1,
      size: 0.14,
      hardness: 0.35,
      falloff: 2,
    },
    {
      id: 'beam',
      kind: 'fan',
      channel: 'rays',
      strength: 0.85,
      size: 0.95,
      count: 4,
      variance: 0.05,
      width: 6,
      taper: 1,
      falloff: 2,
      softness: 2,
    },
    {
      id: 'ring',
      kind: 'halo',
      channel: 'rays',
      strength: 0.08,
      size: 0.65,
      width: 0.05,
      falloff: 2,
      softness: 1,
      variance: 0.3,
    },
  ],
});
