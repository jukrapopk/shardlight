import { useContext, useMemo } from 'react';
import type { ShardInput } from '../core/index.js';
import { ShardLightContext } from './context.js';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect.js';

/**
 * `<Shard>` props: a stable `id`, an optional `kind`, and any of that kind's
 * flat parameters. Returns `null` and registers itself with the nearest
 * `<ShardLight>` / `<ShardLightMesh>` (plan §6.2).
 */
export interface ShardProps {
  id: string;
  kind?: string;
  [param: string]: unknown;
}

export function Shard(props: ShardProps): null {
  const registry = useContext(ShardLightContext);
  const key = JSON.stringify(props);
  // A stable input per prop-change so the layout effect re-runs only then.
  const input = useMemo(() => ({ ...props }) as ShardInput, [key]);

  useIsomorphicLayoutEffect(() => {
    if (!registry) return;
    return registry.register(input);
  }, [registry, input]);

  return null;
}
