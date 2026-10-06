import { resolveConfig, type ResolveInput } from '../config/resolve.js';
import { migrateConfig } from '../config/migrate.js';
import { buildLayers } from '../model/layers.js';
import { canvas2dBaker } from './canvas2d.js';
import { acquireSource, releaseSource } from './cache.js';
import type { Baker, LayerSource } from './baker.js';
import { createScheduler } from './scheduler.js';

export interface PrewarmOptions extends ResolveInput {
  resolution?: number;
  rayScale?: number;
  baker?: Baker;
  accepts?: LayerSource['type'][];
  warn?: boolean;
}

const prewarmed: string[] = [];

/**
 * Bake a config into the shared cache ahead of time, so a light that appears on
 * a key moment (a reveal, an entrance) is ready before it's needed (plan §8).
 * Holds a cache reference until `releasePrewarm()` is called.
 */
export async function prewarm(options: PrewarmOptions = {}): Promise<void> {
  const baker = options.baker ?? canvas2dBaker;
  const resolution = options.resolution ?? 1024;
  const rayScale = options.rayScale ?? 1;
  const accepts = options.accepts ?? (['url'] as LayerSource['type'][]);
  const config = options.config ? migrateConfig(options.config) : undefined;

  const light = resolveConfig(
    {
      preset: options.preset,
      config,
      shards: options.shards,
      effects: options.effects,
      color: options.color,
      rotation: options.rotation,
      seed: options.seed,
    },
    { warn: options.warn },
  );

  const layers = buildLayers(light, {
    resolution,
    rayScale,
    baker: baker.id,
    accept: accepts,
  });

  const scheduler = createScheduler();
  await Promise.all(
    layers.map((layer) => {
      const controller = new AbortController();
      prewarmed.push(layer.key);
      return acquireSource(layer.key, () =>
        scheduler.run(
          () => baker.bake(layer, { resolution, rayScale, accept: accepts }, controller.signal),
          controller.signal,
        ),
      );
    }),
  );
}

/** Release the cache references held by `prewarm()`. */
export function releasePrewarm(): void {
  for (const key of prewarmed) releaseSource(key);
  prewarmed.length = 0;
}
