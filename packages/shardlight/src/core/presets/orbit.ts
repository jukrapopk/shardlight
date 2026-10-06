import { definePreset } from './registry.js';

/** `orbit`: a violet system of concentric rings around a small core. */
export const orbit = definePreset({
  version: 1,
  color: '#B9A8FF',
  rotation: 0,
  seed: 10,
  shards: [
    {
      id: 'core',
      kind: 'blob',
      channel: 'body',
      strength: 0.6,
      size: 0.16,
      hardness: 0.25,
      falloff: 2.4,
    },
    {
      id: 'ring1',
      kind: 'halo',
      channel: 'body',
      strength: 0.5,
      size: 0.45,
      width: 0.05,
      falloff: 1.6,
      softness: 2,
      variance: 0.2,
    },
    {
      id: 'ring2',
      kind: 'halo',
      channel: 'body',
      strength: 0.25,
      size: 0.68,
      width: 0.03,
      falloff: 2,
      softness: 2,
      variance: 0.35,
    },
    {
      id: 'ring3',
      kind: 'halo',
      channel: 'body',
      strength: 0.1,
      size: 0.88,
      width: 0.02,
      falloff: 2.4,
      softness: 2,
      variance: 0.5,
    },
  ],
});
