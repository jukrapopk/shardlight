import type { ParamMap, ParamsFromSchema } from '../config/schema.js';
import type { ChannelValues } from '../index.js';

/**
 * A frame's animation values. Effects start from scale 1, opacity 1, rotation 0
 * and compose by multiplying scale/opacity and adding to rotation.
 */
export interface FrameValues {
  /** The values for a channel, created on first access at scale 1 / opacity 1. */
  channel(name: string): ChannelValues;
  /** The whole light's opacity. */
  opacity: number;
  /** Light-wide hover amount, 0..1, eased by the model. */
  hover: number;
  /** Seconds accumulated while hovered; lets effects spin up on hover. */
  hoverTime: number;
  /** Light-wide collapsed amount, 0..1, eased by the model. */
  collapse: number;
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
  /**
   * True when `apply` keeps changing the frame over time with no input (pulse,
   * flicker, spin). Input-driven effects (hover, collapse) leave it unset: the
   * model reports them idle once their easing settles.
   */
  continuous?: boolean;
  /** Pause under `prefers-reduced-motion` unless this is `'keep'`. */
  reducedMotion?: 'keep';
}
