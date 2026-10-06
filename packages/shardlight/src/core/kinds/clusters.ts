import { defineShardKind } from './registry.js';
import { drawRay } from './draw.js';

/**
 * `clusters`: `clusters` bundles, spread evenly round the centre, of
 * `perCluster` fine rays each. Rays are drawn like `fan` rays.
 */
export const clusters = defineShardKind({
  kind: 'clusters',
  label: 'Streaks',
  params: {
    clusters: { type: 'number', default: 4, min: 1, max: 64, step: 1 },
    perCluster: { type: 'number', default: 5, min: 1, max: 64, step: 1 },
    spread: { type: 'number', default: 20, min: 0, max: 360 },
    inner: { type: 'number', default: 0.1, min: 0, max: 1 },
    strength: { type: 'number', default: 0.5, min: 0, max: 2 },
    size: { type: 'number', default: 0.5, min: 0, max: 2 },
    angle: { type: 'angle', default: 0 },
    variance: { type: 'number', default: 0.5, min: 0, max: 1 },
    width: { type: 'number', default: 2, min: 0, max: 100, unit: 'px', ray: true },
    taper: { type: 'number', default: 0.5, min: 0, max: 1 },
    falloff: { type: 'number', default: 1, min: 0, max: 8 },
    fadeIn: { type: 'number', default: 0.1, min: 0, max: 1 },
    softness: { type: 'number', default: 1, min: 0, max: 50, unit: 'px', ray: true },
  },
  draw(ctx, p, env) {
    const clusterCount = Math.max(1, Math.round(p.clusters));
    const perCluster = Math.max(1, Math.round(p.perCluster));
    const gap = (Math.PI * 2) / clusterCount;
    const spreadRad = (p.spread * Math.PI) / 180;
    const lengthPx = p.size * env.unit;
    const rootHalf = (p.width * env.px) / 2;

    for (let c = 0; c < clusterCount; c++) {
      const center = (p.angle * Math.PI) / 180 + c * gap;
      for (let i = 0; i < perCluster; i++) {
        const dirR = env.rng();
        const innerR = env.rng();
        const varianceR = env.rng();

        const angle = center + (dirR - 0.5) * spreadRad;
        const inner = Math.max(0, p.inner + (innerR - 0.5) * p.variance);
        const rootDist = inner * env.unit;

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
    }
  },
});
