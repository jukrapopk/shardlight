import type { ComponentType } from 'react';
import type { ParamsOf, ShardBase, ShardKindDefinition } from '../core/index.js';
import { Shard, type ShardProps } from './Shard.js';

/** Props for a component made by `createShardComponent`. */
export type ShardComponentProps<D> = Omit<ShardBase, 'kind'> & { id: string } & Partial<
    ParamsOf<D>
  >;

/**
 * Make a typed component for a shard kind: `const Dots = createShardComponent(dots)`
 *. Works in both React entries.
 */
export function createShardComponent<D extends ShardKindDefinition<any, any>>(
  def: D,
): ComponentType<ShardComponentProps<D>> {
  function ShardComponent(props: ShardComponentProps<D>) {
    const shardProps = { ...(props as object), kind: def.kind } as ShardProps;
    return <Shard {...shardProps} />;
  }
  ShardComponent.displayName = `Shard(${def.kind})`;
  return ShardComponent as ComponentType<ShardComponentProps<D>>;
}
