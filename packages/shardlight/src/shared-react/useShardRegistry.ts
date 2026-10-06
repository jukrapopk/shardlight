import { useCallback, useMemo, useRef, useState } from 'react';
import type { ShardInput } from '../core/index.js';
import type { ShardLightRegistry } from './context.js';

export interface ShardRegistryState {
  registry: ShardLightRegistry;
  /** Overrides collected from `<Shard>` children, in registration order. */
  shards: ShardInput[];
  /** Bumps whenever the collected set changes. */
  version: number;
}

/**
 * Collects `<Shard>` registrations for one light. A plain `Map` preserves
 * insertion order and lets shards sit inside fragments, conditionals and
 * wrapper components (plan §6.2).
 */
export function useShardRegistry(): ShardRegistryState {
  const mapRef = useRef(new Map<string, ShardInput>());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const registry = useMemo<ShardLightRegistry>(
    () => ({
      register(input: ShardInput) {
        const id = (input as { id?: unknown }).id;
        if (typeof id !== 'string') return () => {};
        mapRef.current.set(id, input);
        bump();
        return () => {
          mapRef.current.delete(id);
          bump();
        };
      },
    }),
    [bump],
  );

  // `version` is the dependency that makes this recompute on registration.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shards = useMemo(() => [...mapRef.current.values()], [version]);

  return { registry, shards, version };
}
