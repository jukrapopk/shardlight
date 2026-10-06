import type { ParamMap } from '../config/schema.js';
import type { ShardKindDefinition } from './types.js';

/**
 * The kind registry. Lookups go through `getShardKind` only, so a scoped
 * registry can be added later without breaking anything.
 */
const kinds = new Map<string, ShardKindDefinition<never, ParamMap>>();

/** Define a kind object. Does not register it. */
export function defineShardKind<K extends string, const P extends ParamMap>(
  def: ShardKindDefinition<K, P>,
): ShardKindDefinition<K, P> {
  return def;
}

export function registerShardKind(def: ShardKindDefinition<string, ParamMap>): void {
  if (kinds.has(def.kind)) {
    warn(`overwriting already-registered shard kind "${def.kind}"`);
  }
  kinds.set(def.kind, def as unknown as ShardKindDefinition<never, ParamMap>);
}

export function getShardKind(kind: string): ShardKindDefinition<string, ParamMap> | undefined {
  return kinds.get(kind) as unknown as ShardKindDefinition<string, ParamMap> | undefined;
}

export function listShardKinds(): ShardKindDefinition<string, ParamMap>[] {
  return [...kinds.values()] as unknown as ShardKindDefinition<string, ParamMap>[];
}

export function unregisterShardKind(kind: string): void {
  kinds.delete(kind);
}

function warn(message: string): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  console.warn(`[shardlight] ${message}`);
}
