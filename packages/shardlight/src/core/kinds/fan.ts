import { defineShardKind } from './registry.js';
import { drawRay } from './draw.js';

/**
 * `fan`: `count` rays spread evenly round the centre. Each ray is a quad
 * tapering from root to tip, filled with a linear gradient along its length.
 */
export const fan = defineShardKind({
  kind: 'fan',
  label: 'Rays',
  params: {
    strength: { type: 'number', default: 1, min: 0, max: 2 },
    size: { type: 'number', default: 1, min: 0, max: 2 },
    count: { type: 'number', default: 4, min: 1, max: 256, step: 1 },
    angle: { type: 'angle', default: 0 },
    jitter: { type: 'number', default: 0, min: 0, max: 1 },
    inner: { type: 'number', default: 0, min: 0, max: 1 },
    variance: { type: 'number', default: 0, min: 0, max: 1 },
    width: { type: 'number', default: 4, min: 0, max: 100, unit: 'px', ray: true },
    taper: { type: 'number', default: 1, min: 0, max: 1 },
    falloff: { type: 'number', default: 1, min: 0, max: 8 },
    fadeIn: { type: 'number', default: 0, min: 0, max: 1 },
    softness: { type: 'number', default: 1, min: 0, max: 50, unit: 'px', ray: true },
  },
  draw(ctx, p, env) {
    const count = Math.max(1, Math.round(p.count));
    const gap = (Math.PI * 2) / count;
    const rootDist = p.inner * env.unit;
    const lengthPx = p.size * env.unit;
    const rootHalf = (p.width * env.px) / 2;

    for (let i = 0; i < count; i++) {
      const jitterR = env.rng();
      const varianceR = env.rng();

      const base = (p.angle * Math.PI) / 180 + i * gap;
      const angle = base + (jitterR * 2 - 1) * p.jitter * (gap / 2);

      const lengthMul = 1 - p.variance * varianceR;
      const brightMul = 1 - p.variance * varianceR;
      const widthMul = 1 - 0.5 * p.variance * varianceR;

      const half = rootHalf * widthMul;
      drawRay(ctx, env, {
        angleRad: angle,
        rootDist,
        tipDist: rootDist + lengthPx * lengthMul,
        rootHalf: half,
        tipHalf: half * (1 - p.taper),
        strength: p.strength * brightMul,
        falloff: p.falloff,
        fadeIn: p.fadeIn * env.unit,
      });
    }
  },
});
