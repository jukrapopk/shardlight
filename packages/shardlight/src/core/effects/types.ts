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
   * Set for effects that only move in response to input (the built-in `hover`
   * and `collapse`). The model treats every other effect as running over time,
   * so an idle light can stop its animation loop. Unset by default, which keeps
   * a custom effect animating.
   */
  inputDriven?: boolean;
  /** Pause under `prefers-reduced-motion` unless this is `'keep'`. */
  reducedMotion?: 'keep';
}
