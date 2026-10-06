import type { Ctx2D, DrawEnv } from './types.js';

/** Gradients approximate their curves with 16 colour stops. */
export const GRADIENT_STOPS = 16;

/**
 * Multiply every ray-marked param by `rayScale`. Applied by the baker before a
 * kind's `draw`/`blur` run, so a light tuned at one size can be shown much
 * larger without its rays thickening.
 */
export function applyRayScale(
  params: Record<string, unknown>,
  schema: Record<string, { ray?: boolean }>,
  rayScale: number,
): Record<string, unknown> {
  if (rayScale === 1) return params;
  const out: Record<string, unknown> = { ...params };
  for (const [name, def] of Object.entries(schema)) {
    if (def.ray && typeof out[name] === 'number') {
      out[name] = (out[name] as number) * rayScale;
    }
  }
  return out;
}

export interface RayDraw {
  /** Direction of the ray, radians. */
  angleRad: number;
  /** Distance from the centre to the root, px. */
  rootDist: number;
  /** Distance from the centre to the tip, px. */
  tipDist: number;
  /** Half-width at the root, px. */
  rootHalf: number;
  /** Half-width at the tip, px. */
  tipHalf: number;
  strength: number;
  falloff: number;
  /** Ramp-in distance from the root, px. */
  fadeIn: number;
}

/**
 * One fan/cluster ray: a quad tapering root → tip, filled with a linear
 * gradient whose alpha follows `(1 - t)^falloff` and the fade-in ramp.
 */
export function drawRay(ctx: Ctx2D, env: DrawEnv, o: RayDraw): void {
  const length = o.tipDist - o.rootDist;
  if (length <= 0 || o.strength <= 0) return;

  ctx.save();
  ctx.rotate(o.angleRad);

  const gradient = ctx.createLinearGradient(o.rootDist, 0, o.tipDist, 0);
  for (let i = 0; i <= GRADIENT_STOPS; i++) {
    const t = i / GRADIENT_STOPS;
    const along = Math.pow(1 - t, o.falloff);
    const ramp = o.fadeIn > 0 ? Math.min(1, (t * length) / o.fadeIn) : 1;
    gradient.addColorStop(t, env.rgba(o.strength * along * ramp));
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(o.rootDist, -o.rootHalf);
  ctx.lineTo(o.tipDist, -o.tipHalf);
  ctx.lineTo(o.tipDist, o.tipHalf);
  ctx.lineTo(o.rootDist, o.rootHalf);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

interface VarianceParams {
  variance?: number;
}

/**
 * The variance mask: a conic gradient with 12 evenly spaced stops,
 * each alpha `1 − variance · rng()`, the last repeating the first so there is no
 * seam. Applied with `destination-in` on the untransformed scratch canvas.
 */
export function conicVarianceMask(
  ctx: Ctx2D,
  params: VarianceParams,
  env: DrawEnv,
  size: number,
): void {
  const variance = params.variance ?? 0;
  if (variance <= 0) return;

  const createConic = (
    ctx as unknown as {
      createConicGradient?: (angle: number, x: number, y: number) => CanvasGradient;
    }
  ).createConicGradient;
  if (typeof createConic !== 'function') return;

  const center = size / 2;
  const gradient = createConic.call(ctx, 0, center, center);
  const stops = 12;
  const alphas: number[] = [];
  for (let i = 0; i < stops; i++) alphas.push(1 - variance * env.rng());
  for (let i = 0; i < stops; i++) {
    gradient.addColorStop(i / stops, env.rgba(alphas[i]!));
  }
  gradient.addColorStop(1, env.rgba(alphas[0]!));

  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
}
