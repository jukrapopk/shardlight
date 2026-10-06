/**
 * Stable, deterministic serialisation used for cache keys and diffing.
 * Key order never affects the output.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = sortValue(obj[key]);
    return out;
  }
  if (typeof value === 'number') {
    // Normalise -0 and NaN so keys are stable.
    if (Object.is(value, -0)) return 0;
    if (Number.isNaN(value)) return 'NaN';
  }
  return value;
}
