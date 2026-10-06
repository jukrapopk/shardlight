/**
 * The config model. A ShardLight is an ordered list of shards, each a
 * flat set of that kind's parameters. Flat means no nested `shape: {}` objects,
 * so overriding one field never needs a deep merge, and config keys match the
 * component props one to one.
 *
 * The `Base*` interfaces are the built-ins. The public, augmentable interfaces
 * (`ShardKinds`, `ShardPresets`, `ChannelValues`) are declared on the package
 * entry so downstream code can extend them with `declare module 'shardlight'`.
 */

// ---------------------------------------------------------------------------
// Built-in kind parameters
// ---------------------------------------------------------------------------

export interface BlobParams {
  /** Peak brightness. Above 1 saturates the middle. */
  strength: number;
  /** Fade-out radius, as a fraction of the light's half-edge. */
  size: number;
  /** Share of the radius held at full brightness before the falloff. */
  hardness: number;
  /** Curve past `hardness`. */
  falloff: number;
  /** Horizontal ÷ vertical stretch. */
  aspect: number;
  /** Direction of the stretch, degrees. */
  angle: number;
  /** Composite blur, px at a 1024 bake. */
  softness: number;
  /** Uneven brightness around the centre. */
  variance: number;
}

export interface FanParams {
  strength: number;
  /** Ray length, from `inner` out. */
  size: number;
  /** Number of rays; 2 = one line through the centre. */
  count: number;
  /** First ray's direction, degrees. */
  angle: number;
  /** Measure `angle` from that fan shard's `angle` instead of from 0. */
  relativeTo?: string;
  /** Angular wander per ray, as a share of half the gap between rays. */
  jitter: number;
  /** Where rays start, from the centre. */
  inner: number;
  /** Per-ray length / brightness / width randomness. */
  variance: number;
  /** Width at the root, px at a 1024 bake (ray-scaled). */
  width: number;
  /** 0 = constant width, 1 = pointed tip. */
  taper: number;
  /** Brightness along the length. */
  falloff: number;
  /** Distance from the root over which the ray ramps in. */
  fadeIn: number;
  /** Composite blur, px (ray-scaled). */
  softness: number;
}

export interface ClusterParams {
  /** Number of bundles. */
  clusters: number;
  /** Rays per bundle. */
  perCluster: number;
  /** Angular width of a bundle, degrees. */
  spread: number;
  /** Where rays start; each ray also varies by ±variance/2. */
  inner: number;
  strength: number;
  size: number;
  angle: number;
  relativeTo?: string;
  variance: number;
  width: number;
  taper: number;
  falloff: number;
  fadeIn: number;
  softness: number;
}

export interface HaloParams {
  strength: number;
  /** Radius of the brightest line. */
  size: number;
  /** Ring thickness, as a fraction of the half-edge. */
  width: number;
  /** Edge curve across the thickness. */
  falloff: number;
  /** Composite blur, px. */
  softness: number;
  /** Uneven brightness around the ring. */
  variance: number;
}

// ---------------------------------------------------------------------------
// Registries (augmentable)
// ---------------------------------------------------------------------------

/** Built-in kinds. Extend the public `ShardKinds` on the entry to add one. */
export interface BaseShardKinds {
  blob: BlobParams;
  fan: FanParams;
  clusters: ClusterParams;
  halo: HaloParams;
}

/** Built-in presets. Extend the public `ShardPresets` on the entry to add one. */
export interface BaseShardPresets {
  star: true;
  sun: true;
  anamorphic: true;
  sparkle: true;
  neon: true;
  ember: true;
  starburst: true;
  frost: true;
}

// ---------------------------------------------------------------------------
// Shards and lights
// ---------------------------------------------------------------------------

export type ShardBlend = 'add' | 'screen';

export interface ShardBase {
  /** Stable name: seeds its randomness, target of overrides. */
  id: string;
  /** Any registered kind. */
  kind: string;
  /** Default true. */
  visible?: boolean;
  /** Motion channel it animates with; default 'main'. */
  channel?: string;
  /** Default 'add'. */
  blend?: ShardBlend;
  /** Overrides the light's colour for this shard only. */
  color?: string;
  /** Overrides the light's seed for this shard only. */
  seed?: number;
}

/** A full shard: `kind` required, params optional (kind defaults fill the rest). */
export type ShardConfig = {
  [K in keyof BaseShardKinds]: ShardBase & { kind: K } & Partial<BaseShardKinds[K]>;
}[keyof BaseShardKinds] & { relativeTo?: string };

/**
 * What overrides accept (`<Shard>` props, the `shards` option,
 * `config.shards`): either a full shard, or a partial one whose `id` names a
 * shard already in the preset. A partial one omits `kind` and inherits it.
 */
export type ShardInput =
  | ShardConfig
  | ({ id: string; kind?: string } & Partial<Omit<ShardBase, 'id' | 'kind'>> &
      Record<string, unknown>);

export interface EffectConfig {
  type: string;
  [param: string]: unknown;
}

export interface ShardLightConfig {
  /** Schema version. */
  version: 1;
  /** Default '#FFFFFF'. */
  color: string;
  /** Degrees; turns the whole light. Default 0. */
  rotation: number;
  /** Default 1. */
  seed: number;
  /** Drawn in order (additive, so order only matters for 'screen'). */
  shards: ShardConfig[];
  /** Optional animations. */
  effects?: EffectConfig[];
}

/** A preset is a plain ShardLightConfig. Built-ins: star, sun, anamorphic, sparkle, neon, ember, starburst, frost. */
export type BuiltInPresetName = keyof BaseShardPresets;
export type Preset = string | ShardLightConfig;

// ---------------------------------------------------------------------------
// Resolved model
// ---------------------------------------------------------------------------

export interface ResolvedShard {
  id: string;
  kind: string;
  visible: boolean;
  channel: string;
  blend: ShardBlend;
  /** Resolved colour (shard override or the light's). */
  color: string;
  /** Resolved seed (shard override or the light's). */
  seed: number;
  /** Kind defaults filled in and clamped. */
  params: Record<string, unknown>;
}

export interface ResolvedLight {
  version: 1;
  color: string;
  rotation: number;
  seed: number;
  shards: ResolvedShard[];
  effects: EffectConfig[];
}

export interface ResolvedLayer {
  /** Content hash of the resolved shards plus light-wide bake inputs. */
  key: string;
  /** Stable while the layer exists: `${channel}|${blend}`. */
  id: string;
  channel: string;
  blend: ShardBlend;
  shards: ResolvedShard[];
  color: string;
  rotation: number;
  seed: number;
}
