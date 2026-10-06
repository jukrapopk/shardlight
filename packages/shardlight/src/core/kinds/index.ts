import { registerShardKind } from './registry.js';
import { blob } from './blob.js';
import { fan } from './fan.js';
import { clusters } from './clusters.js';
import { halo } from './halo.js';

/** Register the built-in kinds as ordinary definitions (plan §4.1). */
export function registerBuiltInKinds(): void {
  registerShardKind(blob as never);
  registerShardKind(fan as never);
  registerShardKind(clusters as never);
  registerShardKind(halo as never);
}

registerBuiltInKinds();

export { blob, fan, clusters, halo };
