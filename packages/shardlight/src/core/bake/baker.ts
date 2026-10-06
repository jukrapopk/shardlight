import type { ResolvedLayer } from '../config/types.js';

/**
 * What a baked layer can become. Adapters say which types they
 * accept, and the model asks the baker for a compatible one: DOM takes `url`,
 * three takes `bitmap` or `canvas`.
 */
export type LayerSource =
  | { type: 'url'; url: string }
  | { type: 'bitmap'; bitmap: ImageBitmap }
  | { type: 'canvas'; canvas: HTMLCanvasElement | OffscreenCanvas };

export interface BakeOptions {
  resolution: number;
  rayScale: number;
  accept: LayerSource['type'][];
}

/**
 * Baking sits behind this interface, so where and how it happens can change
 * without touching kinds or adapters. The baker's `id` is part of the cache key.
 */
export interface Baker {
  id: string;
  bake(layer: ResolvedLayer, opts: BakeOptions, signal: AbortSignal): Promise<LayerSource>;
}

/**
 * Thrown when a 2D context is unavailable (canvas memory cap). Treat it as a
 * non-fatal "try again later": the result is left uncached.
 */
export class NullContextError extends Error {
  constructor() {
    super('shardlight: 2D context unavailable (canvas memory cap?)');
    this.name = 'NullContextError';
  }
}
