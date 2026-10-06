import type { ShardLightConfig } from '../config/types.js';

const presets = new Map<string, ShardLightConfig>();

/** Define a preset object. Does not register it, so it can be passed directly. */
export function definePreset(config: ShardLightConfig): ShardLightConfig {
  return config;
}

export function registerPreset(name: string, config: ShardLightConfig): void {
  if (presets.has(name)) {
    warn(`overwriting already-registered preset "${name}"`);
  }
  presets.set(name, config);
}

export function getPreset(name: string): ShardLightConfig | undefined {
  return presets.get(name);
}

export function listPresets(): string[] {
  return [...presets.keys()];
}

export function unregisterPreset(name: string): void {
  presets.delete(name);
}

function warn(message: string): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.warn(`[shardlight] ${message}`);
}
