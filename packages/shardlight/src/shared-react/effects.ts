import type { EffectConfig } from '../core/index.js';

/** `true` adds the effect with its defaults; an object adds it with those params. */
export type EffectShorthand = boolean | Record<string, unknown>;

/**
 * Turn the `spin` / `flicker` shorthands into effect configs and append them to
 * any explicit `effects` (plan §4.3).
 */
export function normalizeEffects(
  effects?: readonly EffectConfig[] | null,
  spin?: EffectShorthand,
  flicker?: EffectShorthand,
): EffectConfig[] {
  const out: EffectConfig[] = effects ? [...effects] : [];
  if (spin) out.push({ type: 'spin', ...(typeof spin === 'object' ? spin : {}) });
  if (flicker) out.push({ type: 'flicker', ...(typeof flicker === 'object' ? flicker : {}) });
  return out;
}
