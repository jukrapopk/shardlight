import { getShardKind } from '../kinds/registry.js';
import { applyRayScale } from '../kinds/draw.js';
import { mulberry32, shardSeed } from '../util/rng.js';
import { makeRgba } from '../util/color.js';
import { canvasToBlob, createCanvas, freeCanvas, get2dContext } from '../util/dom.js';
import type { ResolvedLayer } from '../config/types.js';
import type { BakeOptions, Baker, LayerSource } from './baker.js';
import { NullContextError } from './baker.js';

/**
 * The default baker. Draws each shard to its own scratch canvas with
 * the kind's `draw`, applies its variance mask, then composites it onto the
 * layer canvas with `lighter` and a per-shard blur.
 */
export const canvas2dBaker: Baker = {
  id: 'canvas2d',

  async bake(layer: ResolvedLayer, opts: BakeOptions, signal: AbortSignal): Promise<LayerSource> {
    throwIfAborted(signal);
    const resolution = Math.max(1, Math.floor(opts.resolution));

    const canvas = createCanvas(resolution, resolution);
    const ctx = get2dContext(canvas);
    if (!ctx) {
      freeCanvas(canvas);
      throw new NullContextError();
    }
    ctx.clearRect(0, 0, resolution, resolution);

    const unit = resolution / 2;
    const px = resolution / 1024;

    for (const shard of layer.shards) {
      throwIfAborted(signal);
      if (!shard.visible) continue;
      const def = getShardKind(shard.kind);
      if (!def) continue;

      const scratch = createCanvas(resolution, resolution);
      const scratchCtx = get2dContext(scratch);
      if (!scratchCtx) {
        freeCanvas(scratch);
        continue;
      }

      const params = applyRayScale(
        shard.params,
        def.params as Record<string, { ray?: boolean }>,
        opts.rayScale,
      );
      const env = {
        unit,
        px,
        color: shard.color,
        rayScale: opts.rayScale,
        size: resolution,
        rng: mulberry32(shardSeed(shard.id, shard.seed)),
        rgba: makeRgba(shard.color),
      };

      // The context is centred and turned by the light's rotation for the shard.
      scratchCtx.save();
      scratchCtx.translate(unit, unit);
      scratchCtx.rotate((layer.rotation * Math.PI) / 180);
      try {
        def.draw(scratchCtx, params as never, env);
      } catch {
        // A misbehaving custom kind must not take down the whole bake.
      }
      scratchCtx.restore();

      if (def.mask) {
        try {
          def.mask(scratchCtx, params as never, env, resolution);
        } catch {
          /* ignore */
        }
      }

      let blur = 0;
      if (def.blur) blur = def.blur(params as never, env);
      else if (typeof params.softness === 'number') blur = params.softness;
      // `softness` (and a kind's `blur()`) are px at a 1024 bake; scale to this
      // bake's resolution so a light looks the same at any resolution.
      blur *= px;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (blur > 0 && typeof ctx.filter === 'string') ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(scratch as unknown as CanvasImageSource, 0, 0);
      ctx.restore();

      freeCanvas(scratch);
    }

    return encode(canvas, opts, signal);
  },
};

async function encode(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  opts: BakeOptions,
  signal: AbortSignal,
): Promise<LayerSource> {
  const accept = opts.accept;

  if (accept.includes('url')) {
    const blob = await canvasToBlob(canvas);
    freeCanvas(canvas);
    throwIfAborted(signal);
    return { type: 'url', url: URL.createObjectURL(blob) };
  }

  if (accept.includes('bitmap') && typeof createImageBitmap === 'function') {
    try {
      // Straight (non-premultiplied) alpha, no colour-space conversion: three
      // uploads it as-is and premultiplies once on blending, exactly like the
      // DOM composites the PNG. The default is premultiplied, which three then
      // premultiplies again, darkening faint (low-alpha) pixels.
      const bitmap = await createImageBitmap(canvas as unknown as ImageBitmapSource, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      });
      throwIfAborted(signal);
      freeCanvas(canvas);
      return { type: 'bitmap', bitmap };
    } catch (error) {
      if (isAbort(error)) throw error;
      // Fall through to a canvas source.
    }
  }

  if (accept.includes('canvas') || accept.includes('bitmap')) {
    return { type: 'canvas', canvas };
  }

  const blob = await canvasToBlob(canvas);
  freeCanvas(canvas);
  throwIfAborted(signal);
  return { type: 'url', url: URL.createObjectURL(blob) };
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    throw error;
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
