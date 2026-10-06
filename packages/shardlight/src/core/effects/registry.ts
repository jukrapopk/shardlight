import type { ParamMap } from '../config/schema.js';
import type { EffectDefinition } from './types.js';

const effects = new Map<string, EffectDefinition<string, ParamMap>>();

/** Define an effect object. Does not register it. */
export function defineEffect<N extends string, const P extends ParamMap>(
  def: EffectDefinition<N, P>,
): EffectDefinition<N, P> {
  return def;
}

export function registerEffect(def: EffectDefinition<string, ParamMap>): void {
  if (effects.has(def.name)) {
    warn(`overwriting already-registered effect "${def.name}"`);
  }
  effects.set(def.name, def as unknown as EffectDefinition<string, ParamMap>);
}

export function getEffect(name: string): EffectDefinition<string, ParamMap> | undefined {
  return effects.get(name);
}

export function listEffects(): EffectDefinition<string, ParamMap>[] {
  return [...effects.values()];
}

export function unregisterEffect(name: string): void {
  effects.delete(name);
}

function warn(message: string): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.warn(`[shardlight] ${message}`);
}
