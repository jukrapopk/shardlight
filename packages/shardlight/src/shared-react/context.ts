import { createContext } from 'react';
import type { ShardInput } from '../core/index.js';

/**
 * Lets `<Shard>` children register their props with the nearest light through
 * context, instead of parsing `React.Children` (plan §6.2). The same context
 * works in the DOM and R3F trees.
 */
export interface ShardLightRegistry {
  register(input: ShardInput): () => void;
}

export const ShardLightContext = createContext<ShardLightRegistry | null>(null);
