import type {
  EffectConfig,
  Preset,
  ResolvedLight,
  ResolvedShard,
  ShardConfig,
  ShardInput,
  ShardLightConfig,
} from './types.js';
import type { ParamSchema } from './schema.js';
import { getShardKind } from '../kinds/registry.js';
import { getPreset } from '../presets/registry.js';
import { getEffect } from '../effects/registry.js';
import { isCssIdentifier } from '../util/color.js';

export interface ResolveInput {
  /** Starting config. Omitted = default preset; `null` = start empty. */
  preset?: Preset | null;
  /** Data-driven config merged over the preset. */
  config?: Partial<ShardLightConfig> | null;
  /** Per-shard overrides (`<Shard>` children / the `shards` option). */
  shards?: readonly ShardInput[] | null;
  /** Effects; overrides `config.effects` when provided. */
  effects?: readonly EffectConfig[] | null;
  color?: string;
  rotation?: number;
  seed?: number;
}

export interface ResolveOptions {
  /** Force development warnings on/off. Defaults to NODE_ENV !== 'production'. */
  warn?: boolean;
  /** Preset used when `preset` is omitted. Defaults to 'star'. */
  defaultPreset?: string;
}

const DEFAULT_PRESET = 'star';
const DEFAULT_COLOR = '#FFFFFF';

/**
 * The single place that decides what gets drawn (plan §4.5). Every adapter calls
 * it. Order: preset → config → shard overrides, merged per shard by `id`; then
 * kind defaults are filled in; then values are clamped.
 */
export function resolveConfig(
  input: ResolveInput = {},
  options: ResolveOptions = {},
): ResolvedLight {
  const warn = makeWarn(options.warn);

  const presetConfig = resolvePreset(input.preset, options.defaultPreset ?? DEFAULT_PRESET, warn);
  const config = input.config ?? undefined;

  // Light-wide values: preset < config < explicit options.
  const color = input.color ?? config?.color ?? presetConfig?.color ?? DEFAULT_COLOR;
  const rotation = input.rotation ?? config?.rotation ?? presetConfig?.rotation ?? 0;
  const seed = input.seed ?? config?.seed ?? presetConfig?.seed ?? 1;

  // Shard list: preset, then config.shards, then explicit overrides.
  let list: ShardConfig[] = presetConfig ? presetConfig.shards.map((s) => ({ ...s })) : [];
  if (config?.shards) list = mergeShardList(list, config.shards, warn);
  if (input.shards) list = mergeShardList(list, input.shards, warn);

  // Effects: explicit overrides config.effects overrides the preset's.
  const effects = input.effects ?? config?.effects ?? presetConfig?.effects ?? [];

  const shards: ResolvedShard[] = [];
  for (const shard of list) {
    const resolved = resolveShard(shard, color, seed, warn);
    if (resolved) shards.push(resolved);
  }
  resolveRelativeAngles(shards);

  return {
    version: 1,
    color,
    rotation,
    seed,
    shards,
    effects: resolveEffects(effects, warn),
  };
}

function resolvePreset(
  preset: Preset | null | undefined,
  defaultName: string,
  warn: Warn,
): ShardLightConfig | undefined {
  if (preset === null) return undefined;
  if (preset === undefined) {
    const fallback = getPreset(defaultName);
    if (!fallback) warn(`default preset "${defaultName}" is not registered`);
    return fallback;
  }
  if (typeof preset === 'string') {
    const found = getPreset(preset);
    if (!found) {
      warn(`unknown preset "${preset}"; falling back to "${defaultName}"`);
      return getPreset(defaultName);
    }
    return found;
  }
  return preset;
}

/**
 * Merge overrides into a base list by `id`. A full shard (with `kind`) whose id
 * matches nothing is added; a partial one whose id matches nothing is skipped
 * with a warning (plan §4).
 */
function mergeShardList(
  base: ShardConfig[],
  overrides: readonly ShardInput[],
  warn: Warn,
): ShardConfig[] {
  const list = base.map((s) => ({ ...s }));
  const indexById = new Map(list.map((s, i) => [s.id, i] as const));

  for (const override of overrides) {
    const id = (override as { id?: unknown }).id;
    if (typeof id !== 'string') {
      warn('a shard override without a string `id` was skipped');
      continue;
    }
    const index = indexById.get(id);
    if (index === undefined) {
      if ((override as { kind?: unknown }).kind === undefined) {
        warn(`override for unknown shard "${id}" skipped (no \`kind\` to add it)`);
        continue;
      }
      list.push({ ...override } as ShardConfig);
      indexById.set(id, list.length - 1);
    } else {
      list[index] = { ...list[index], ...override } as ShardConfig;
    }
  }

  return list;
}

function resolveShard(
  shard: ShardConfig,
  lightColor: string,
  lightSeed: number,
  warn: Warn,
): ResolvedShard | null {
  const kindDef = getShardKind(shard.kind);
  if (!kindDef) {
    warn(`unknown shard kind "${shard.kind}" (shard "${shard.id}") skipped`);
    return null;
  }

  const params: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(kindDef.params)) {
    const raw = (shard as unknown as Record<string, unknown>)[name];
    params[name] = coerce(schema, raw, `${shard.id}.${name}`, warn);
  }

  const relativeTo = (shard as unknown as { relativeTo?: unknown }).relativeTo;
  if (typeof relativeTo === 'string') params.relativeTo = relativeTo;

  const channel = shard.channel ?? 'main';
  if (!isCssIdentifier(channel)) {
    warn(`shard "${shard.id}" channel "${channel}" is not a valid CSS identifier`);
  }

  return {
    id: shard.id,
    kind: shard.kind,
    visible: shard.visible ?? true,
    channel,
    spin: shard.spin ?? false,
    blend: shard.blend ?? 'add',
    color: shard.color ?? lightColor,
    seed: shard.seed ?? lightSeed,
    params,
  };
}

/** `relativeTo` measures a fan/cluster's `angle` from another shard's `angle`. */
function resolveRelativeAngles(shards: ResolvedShard[]): void {
  const byId = new Map(shards.map((s) => [s.id, s] as const));
  for (const shard of shards) {
    const relativeTo = shard.params.relativeTo;
    if (typeof relativeTo !== 'string') continue;
    const target = byId.get(relativeTo);
    if (!target) continue;
    if (typeof target.params.angle === 'number' && typeof shard.params.angle === 'number') {
      shard.params.angle += target.params.angle;
    }
  }
}

function resolveEffects(
  effects: readonly EffectConfig[],
  warn: Warn,
): EffectConfig[] {
  const out: EffectConfig[] = [];
  for (const effect of effects) {
    const def = getEffect(effect.type);
    if (!def) {
      warn(`unknown effect "${effect.type}" skipped`);
      continue;
    }
    const params: Record<string, unknown> = { type: effect.type };
    for (const [name, schema] of Object.entries(def.params)) {
      params[name] = coerce(
        schema,
        (effect as Record<string, unknown>)[name],
        `effect ${effect.type}.${name}`,
        warn,
      );
    }
    out.push(params as EffectConfig);
  }
  return out;
}

function coerce(schema: ParamSchema, raw: unknown, label: string, warn: Warn): unknown {
  switch (schema.type) {
    case 'number':
    case 'angle': {
      let value = raw === undefined || raw === null ? schema.default : Number(raw);
      if (!Number.isFinite(value)) {
        warn(`${label} is not a number; using default ${schema.default}`);
        value = schema.default;
      }
      if (schema.min !== undefined && value < schema.min) {
        warn(`${label} (${value}) clamped to min ${schema.min}`);
        value = schema.min;
      }
      if (schema.max !== undefined && value > schema.max) {
        warn(`${label} (${value}) clamped to max ${schema.max}`);
        value = schema.max;
      }
      return value;
    }
    case 'boolean':
      return raw === undefined || raw === null ? schema.default : Boolean(raw);
    case 'color':
      return raw === undefined || raw === null ? schema.default : String(raw);
    case 'enum': {
      const value = raw === undefined || raw === null ? schema.default : String(raw);
      if (!schema.values.includes(value)) {
        warn(`${label} "${value}" is not one of ${schema.values.join(', ')}; using default`);
        return schema.default;
      }
      return value;
    }
    case 'channels': {
      if (raw === undefined || raw === null) return [...schema.default];
      if (!Array.isArray(raw)) {
        warn(`${label} is not an array; using default`);
        return [...schema.default];
      }
      return raw.map((v) => String(v));
    }
    default:
      return raw;
  }
}

type Warn = (message: string) => void;

function makeWarn(enabled?: boolean): Warn {
  const on =
    enabled ??
    (typeof process !== 'undefined' ? process.env?.NODE_ENV !== 'production' : true);
  if (!on) return () => {};
  return (message: string) => {
    // eslint-disable-next-line no-console
    console.warn(`[shardlight] ${message}`);
  };
}
