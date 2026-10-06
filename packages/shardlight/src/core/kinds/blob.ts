import { defineShardKind } from './registry.js';
import { conicVarianceMask, GRADIENT_STOPS } from './draw.js';

/** `blob`: a soft round glow. A radial gradient from the centre out to `size`. */
export const blob = defineShardKind({
  kind: 'blob',
  label: 'Glow',
  params: {
    strength: { type: 'number', default: 1, min: 0, max: 2 },
    size: { type: 'number', default: 0.5, min: 0, max: 2 },
    hardness: { type: 'number', default: 0, min: 0, max: 0.999 },
    falloff: { type: 'number', default: 2, min: 0.1, max: 8 },
    aspect: { type: 'number', default: 1, min: 0.1, max: 10 },
    angle: { type: 'angle', default: 0 },
    softness: { type: 'number', default: 0, min: 0, max: 50, unit: 'px' },
    variance: { type: 'number', default: 0, min: 0, max: 1 },
  },
  draw(ctx, p, env) {
    const radius = p.size * env.unit;
    if (radius <= 0 || p.strength <= 0) return;

    ctx.save();
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.scale(p.aspect, 1);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    for (let i = 0; i <= GRADIENT_STOPS; i++) {
      const t = i / GRADIENT_STOPS;
      let a: number;
      if (p.hardness >= 1) {
        a = t < 1 ? 1 : 0;
      } else if (p.hardness > 0 && t <= p.hardness) {
        a = 1;
      } else {
        a = Math.pow((1 - t) / (1 - p.hardness), p.falloff);
      }
      gradient.addColorStop(t, env.rgba(Math.max(0, a) * p.strength));
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  mask: conicVarianceMask,
});
