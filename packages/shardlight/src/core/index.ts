/**
 * **shardlight** — core (headless).
 *
 * Framework-free: no React, no three. Config model, shard kinds, presets,
 * effects, baking and cache. Adapters (`shardlight/react`, `shardlight/three`,
 * `shardlight/r3f`) wrap `createLightModel()` and draw its layers to a host.
 *
 * Importing this module registers the built-in kinds, effects and presets, so
 * `preset="sun"` works with no setup. That is the package's only side effect.
 */

// Side-effect: register the built-ins (plan §3).
import './kinds/index.js';
import './effects/index.js';
import './presets/index.js';

import type { BaseShardKinds, BaseShardPresets } from './config/types.js';

// ---------------------------------------------------------------------------
// Public, augmentable interfaces
// ---------------------------------------------------------------------------

/**
 * Built-in shard kinds, plus any added by downstream code:
 *
 * ```ts
 * declare module 'shardlight' {
 *   interface ShardKinds { dots: ParamsOf<typeof dots> }
 * }
 * ```
 */
export interface ShardKinds extends BaseShardKinds {}

/** Built-in presets, plus any registered by name via `registerPreset()`. */
export interface ShardPresets extends BaseShardPresets {}

/**
 * Per-channel animation values. Augmentable so a later release can add fields
 * (plan §12.3); v1 ships scale and opacity plus the light-wide spin.
 */
export interface ChannelValues {
  scale: number;
  opacity: number;
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export * from './config/schema.js';
export * from './config/types.js';
export { resolveConfig } from './config/resolve.js';
export type { ResolveInput, ResolveOptions } from './config/resolve.js';
export { migrateConfig, CURRENT_VERSION } from './config/migrate.js';

export * from './kinds/registry.js';
export * from './kinds/types.js';
export * from './kinds/index.js';
export * from './effects/registry.js';
export * from './effects/types.js';
export * from './effects/frame-values.js';
export * from './effects/index.js';
export * from './presets/registry.js';
export * from './presets/index.js';

export * from './bake/baker.js';
export { canvas2dBaker } from './bake/canvas2d.js';
export * from './bake/cache.js';
export * from './bake/scheduler.js';
export { prewarm, releasePrewarm } from './bake/prewarm.js';
export type { PrewarmOptions } from './bake/prewarm.js';

export * from './model/light-model.js';
export * from './model/layers.js';

export * from './util/color.js';
export * from './util/hash.js';
export * from './util/rng.js';
export * from './util/stringify.js';
export * from './util/dom.js';
