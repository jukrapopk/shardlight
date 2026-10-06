import { definePreset } from './registry.js';

/** `anamorphic`: a cinematic horizontal streak from a wide bloom and two long rays. */
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
      size: 0.55,
      hardness: 0,
      falloff: 2.4,
      aspect: 4,
      softness: 7,
    },
    {
      id: 'hotspot',
      kind: 'blob',
      channel: 'body',
      strength: 1,
      size: 0.1,
      hardness: 0.45,
      falloff: 2,
    },
    {
      id: 'beam',
      kind: 'fan',
      channel: 'rays',
      strength: 0.65,
      size: 1.2,
      count: 2,
      angle: 0,
      width: 3,
      taper: 1,
      falloff: 1.5,
      fadeIn: 0.02,
      softness: 3,
    },
  ],
});
