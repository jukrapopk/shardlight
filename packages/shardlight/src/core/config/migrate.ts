import type { ShardLightConfig } from './types.js';

export const CURRENT_VERSION = 1;

/**
 * Upgrade older config JSON to the current schema version, step by step
 * (plan §4.6). Adapters run this on every config they're given, so old saves
 * keep working. Unknown fields are preserved so a config from a newer version
 * degrades gracefully rather than throwing.
 */
export function migrateConfig(input: unknown): ShardLightConfig {
  if (!input || typeof input !== 'object') {
    throw new Error('shardlight: migrateConfig expected a config object');
  }

  let config: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  let version = typeof config.version === 'number' ? config.version : CURRENT_VERSION;

  if (version > CURRENT_VERSION) {
    // From the future: leave it alone and let unknown kinds/effects be skipped.
    return config as unknown as ShardLightConfig;
  }

  // No historical versions yet. Future steps chain here: `while (version < N)`.
  while (version < CURRENT_VERSION) {
    version += 1;
    config = { ...config, version };
  }

  if (config.version !== CURRENT_VERSION) config = { ...config, version: CURRENT_VERSION };
  return config as unknown as ShardLightConfig;
}
