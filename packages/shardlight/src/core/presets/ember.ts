import { definePreset } from './registry.js';

/** `ember`: a warm, low glow with a few short, uneven sparks. */
export const ember = definePreset({
  version: 1,
  color: '#FF9A4D',
  rotation: 0,
  seed: 6,
  shards: [
    {
      id: 'bloom',
      kind: 'blob',
      channel: 'body',
      strength: 0.5,
      size: 1,
      hardness: 0,
      falloff: 2.2,
      softness: 6,
    },
    {
      id: 'hotspot',
      kind: 'blob',
      channel: 'body',
      strength: 1,
      size: 0.18,
      hardness: 0.25,
      falloff: 2.4,
    },
    {
      id: 'sparks',
      kind: 'fan',
      channel: 'rays',
      strength: 0.3,
      size: 0.85,
      count: 6,
      variance: 0.8,
      jitter: 0.4,
      inner: 0.15,
      width: 2,
      taper: 1,
      falloff: 2,
      fadeIn: 0.15,
      softness: 1,
    },
  ],
});
