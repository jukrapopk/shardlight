import { defineShardKind } from './registry.js';
import { conicVarianceMask, GRADIENT_STOPS } from './draw.js';

/**
 * `halo`: a ring. A radial gradient between `size − width/2` and
 * `size + width/2`, brightest at `size`.
 */
export const halo = defineShardKind({
  kind: 'halo',
  label: 'Halo',
  params: {
    strength: { type: 'number', default: 0.1, min: 0, max: 2 },
    size: { type: 'number', default: 0.5, min: 0, max: 2 },
    width: { type: 'number', default: 0.05, min: 0, max: 2 },
    falloff: { type: 'number', default: 1, min: 0, max: 8 },
    softness: { type: 'number', default: 0, min: 0, max: 50, unit: 'px' },
    variance: { type: 'number', default: 0, min: 0, max: 1 },
  },
  draw(ctx, p, env) {
    const inner = Math.max(0, p.size - p.width / 2) * env.unit;
    const outer = Math.max(inner, (p.size + p.width / 2) * env.unit);
    if (outer <= 0 || p.strength <= 0) return;

    const gradient = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
    for (let i = 0; i <= GRADIENT_STOPS; i++) {
      const t = i / GRADIENT_STOPS;
      const across = 1 - Math.abs(2 * t - 1);
      gradient.addColorStop(t, env.rgba(Math.pow(across, p.falloff) * p.strength));
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.fill();
  },
  mask: conicVarianceMask,
});
