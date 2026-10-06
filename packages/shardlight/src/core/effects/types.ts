import type { ParamMap, ParamsFromSchema } from '../config/schema.js';
import type { ChannelValues } from '../index.js';

/**
 * A frame's animation values. Effects start from scale 1 and opacity 1 and
 * compose by multiplying scale and opacity.
 */
export interface FrameValues {
  /** The values for a channel, created on first access at scale 1 / opacity 1. */
  channel(name: string): ChannelValues;
  /** The whole light's opacity. */
  opacity: number;
  /** Channel names currently present (built-in effects use this for `channels: 'all'`). */
  channels(): string[];
}

export interface EffectDefinition<N extends string = string, P extends ParamMap = ParamMap> {
  name: N;
  label?: string;
  params: P;
  /** Pure: advance the frame values for time `t` (seconds). */
  apply: (t: number, params: ParamsFromSchema<P>, out: FrameValues) => void;
  /**
   * Optional CSS-keyframes form the DOM adapter can use instead of one JS call
   * per frame. Reserved for a later release.
   */
  css?: (params: ParamsFromSchema<P>) => string;
  /** Pause under `prefers-reduced-motion` unless this is `'keep'`. */
  reducedMotion?: 'keep';
}
