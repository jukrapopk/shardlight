/**
 * Copy only the own properties whose value is not `undefined`.
 *
 * Used when merging options over defaults: a caller that spreads an optional
 * prop (e.g. `{ baker }` where `baker` is undefined) must not wipe out the
 * default. `null` is kept, since it is a meaningful value for `preset`.
 */
export function definedOnly<T extends object>(value: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] !== undefined) out[key] = value[key];
  }
  return out;
}
