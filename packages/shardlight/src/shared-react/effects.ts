import type { EffectConfig } from '../core/index.js';

/** `true` adds the effect with its defaults; an object adds it with those params. */
export type EffectShorthand = boolean | Record<string, unknown>;

/**
 * Turn the `flicker` / `collapse` shorthands into effect configs and append them
 * to any explicit `effects`.
 */
export function normalizeEffects(
  effects?: readonly EffectConfig[] | null,
  flicker?: EffectShorthand,
  collapse?: EffectShorthand,
): EffectConfig[] {
  const out: EffectConfig[] = effects ? [...effects] : [];
  if (flicker) out.push({ type: 'flicker', ...(typeof flicker === 'object' ? flicker : {}) });
  if (collapse) out.push({ type: 'collapse', ...(typeof collapse === 'object' ? collapse : {}) });
  return out;
}
