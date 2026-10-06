/**
 * FNV-1a string hash. Deterministic across runs and platforms.
 * Used to seed a shard's PRNG from its `id`, so reordering or inserting
 * shards never reshuffles the other shards' randomness.
 */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
