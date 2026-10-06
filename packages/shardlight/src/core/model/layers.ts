import type { ResolvedLight, ResolvedLayer, ResolvedShard } from '../config/types.js';
import { hashString } from '../util/hash.js';
import { stableStringify } from '../util/stringify.js';

export interface BakeInputs {
  resolution: number;
  rayScale: number;
  baker: string;
  accept: string[];
}

/**
 * Group shards into layers: shards that share `channel` + `blend` are baked
 * baked together into one image. The layer `key` is a stable content
 * hash (resolved shards + light-wide bake inputs) used for caching and sharing.
 */
export function buildLayers(light: ResolvedLight, inputs: BakeInputs): ResolvedLayer[] {
  const groups = new Map<string, ResolvedShard[]>();
  for (const shard of light.shards) {
    if (!shard.visible) continue;
    const id = layerId(shard.channel, shard.blend);
    let group = groups.get(id);
    if (!group) {
      group = [];
      groups.set(id, group);
    }
    group.push(shard);
  }

  const layers: ResolvedLayer[] = [];
  for (const [id, shards] of groups) {
    const [channel, blend] = id.split('|') as [string, string];
    const content = {
      shards: shards.map((s) => ({
        id: s.id,
        kind: s.kind,
        params: s.params,
        color: s.color,
        seed: s.seed,
      })),
      color: light.color,
      rotation: light.rotation,
      seed: light.seed,
      resolution: inputs.resolution,
      rayScale: inputs.rayScale,
      baker: inputs.baker,
      accept: inputs.accept,
    };
    layers.push({
      key: `sl_${hashString(stableStringify(content)).toString(36)}`,
      id,
      channel,
      blend: blend as 'add' | 'screen',
      shards,
      color: light.color,
      rotation: light.rotation,
      seed: light.seed,
    });
  }
  return layers;
}

export function layerId(channel: string, blend: string): string {
  return `${channel}|${blend}`;
}
