import { hashString } from './hash.js';

/** mulberry32: a tiny, fast, seedable PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A shard's PRNG seed: `hash(id) ^ (shard.seed ?? light.seed)`.
 * Seeding by id (not position) keeps each shard's randomness stable.
 */
export function shardSeed(id: string, seed: number): number {
  return (hashString(id) ^ (seed >>> 0)) >>> 0;
}
