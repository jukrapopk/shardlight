import { definePreset } from './registry.js';

/** `anamorphic`: a cinematic horizontal streak (plan §9). */
export const anamorphic = definePreset({
  version: 1,
  color: '#CFE6FF',
  rotation: 0,
  seed: 3,
  shards: [
    {
      id: 'bloom',
      kind: 'blob',
      channel: 'body',
      strength: 0.3,
      size: 0.5,
      hardness: 0,
      falloff: 2.4,
      aspect: 3.5,
      softness: 6,
    },
    {
      id: 'hotspot',
      kind: 'blob',
      channel: 'body',
      strength: 1,
      size: 0.1,
      hardness: 0.4,
      falloff: 2,
    },
    {
      id: 'beam',
      kind: 'fan',
      channel: 'rays',
      strength: 0.6,
      size: 1.15,
      count: 2,
      angle: 0,
      width: 3,
      taper: 1,
      falloff: 1.6,
      fadeIn: 0.02,
      softness: 3,
    },
  ],
});
