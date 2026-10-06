import { getEffect } from './registry.js';
import type { FrameValues } from './types.js';
import type { ChannelValues } from '../index.js';
import type { EffectConfig } from '../config/types.js';

/** Values set by hand through `set()`; effects compose on top of these. */
export interface FrameBase {
  channels?: Record<string, { scale?: number; opacity?: number }>;
  opacity?: number;
}

/**
 * Compute a frame: start from the manual base (scale 1 / opacity 1), seed every
 * known channel, then let each effect multiply scale and opacity.
 */
export function computeFrame(
  base: FrameBase,
  effects: readonly EffectConfig[],
  t: number,
  channelNames: readonly string[] = [],
): FrameValues {
  const map = new Map<string, ChannelValues>();
  for (const name of channelNames) map.set(name, { scale: 1, opacity: 1 });
  if (base.channels) {
    for (const [name, values] of Object.entries(base.channels)) {
      const current = map.get(name) ?? { scale: 1, opacity: 1 };
      map.set(name, {
        scale: values.scale ?? current.scale,
        opacity: values.opacity ?? current.opacity,
      });
    }
  }

  const out: FrameValues = {
    opacity: base.opacity ?? 1,
    channel(name) {
      let channel = map.get(name);
      if (!channel) {
        channel = { scale: 1, opacity: 1 };
        map.set(name, channel);
      }
      return channel;
    },
    channels() {
      return [...map.keys()];
    },
  };

  for (const effect of effects) {
    const def = getEffect(effect.type);
    if (!def) continue;
    def.apply(t, effect as never, out);
  }

  return out;
}
