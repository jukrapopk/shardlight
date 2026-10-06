import type { ParamMap, ParamsFromSchema } from '../config/schema.js';

export type Ctx2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

/**
 * Everything a draw function needs besides the context and its params. The
 * context is already centred and rotated for the shard; draw functions work in
 * local coordinates with the origin at the light's centre (plan §4.1).
 */
export interface DrawEnv {
  /** Half-edge of the bake canvas, in px (`resolution / 2`). */
  unit: number;
  /** Base-pixel scale (`resolution / 1024`), for px-valued parameters. */
  px: number;
  /** The shard's resolved colour. */
  color: string;
  /** Render option that thins every ray on lights shown much larger than tuned. */
  rayScale: number;
  /** Bake canvas edge, in px. */
  size: number;
  /** The shard's own PRNG. Consume it in a fixed order for determinism. */
  rng: () => number;
  /** Format the shard's colour at a given alpha. */
  rgba: (alpha: number) => string;
}

/**
 * A shard kind: a param schema plus a draw function. The four built-ins are
 * written the same way and go through the same registry, so nothing in core
 * switches on kind names (plan §4.1).
 */
export interface ShardKindDefinition<
  K extends string = string,
  P extends ParamMap = ParamMap,
> {
  kind: K;
  label?: string;
  params: P;
  draw: (ctx: Ctx2D, params: ParamsFromSchema<P>, env: DrawEnv) => void;
  /**
   * Optional composite blur for this shard, in px. Defaults to the shard's
   * `softness` param when present.
   */
  blur?: (params: ParamsFromSchema<P>, env: DrawEnv) => number;
  /**
   * Optional mask applied to the shard's scratch canvas after drawing (e.g. the
   * variance mask for blob/halo). Receives an untransformed context.
   */
  mask?: (
    ctx: Ctx2D,
    params: ParamsFromSchema<P>,
    env: DrawEnv,
    size: number,
  ) => void;
}
