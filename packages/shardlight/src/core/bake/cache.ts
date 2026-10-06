import type { LayerSource } from './baker.js';

/**
 * A ref-counted cache keyed by the layer's content hash, shared across every
 * light and target on the page (plan §8). A null/deferred context is not an
 * error: the source simply never lands in the cache, so the next call retries.
 */
const sources = new Map<string, LayerSource>();
const refs = new Map<string, number>();
const pending = new Map<string, Promise<LayerSource>>();

export function acquireSource(
  key: string,
  factory: () => Promise<LayerSource>,
): Promise<LayerSource> {
  refs.set(key, (refs.get(key) ?? 0) + 1);

  const existing = sources.get(key);
  if (existing) return Promise.resolve(existing);

  let promise = pending.get(key);
  if (!promise) {
    promise = factory().then(
      (source) => {
        pending.delete(key);
        sources.set(key, source);
        // Everyone released while we were baking: free it right away.
        if (!refs.has(key)) {
          sources.delete(key);
          disposeSource(source);
        }
        return source;
      },
      (error) => {
        pending.delete(key);
        throw error;
      },
    );
    pending.set(key, promise);
  }
  return promise;
}

export function releaseSource(key: string): void {
  const next = (refs.get(key) ?? 0) - 1;
  if (next > 0) {
    refs.set(key, next);
    return;
  }
  refs.delete(key);
  const source = sources.get(key);
  if (source) {
    sources.delete(key);
    disposeSource(source);
  }
}

export function disposeSource(source: LayerSource): void {
  if (source.type === 'url') {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(source.url);
    }
  } else if (source.type === 'bitmap') {
    try {
      source.bitmap.close();
    } catch {
      /* ignore */
    }
  } else if (source.type === 'canvas') {
    try {
      source.canvas.width = 0;
      source.canvas.height = 0;
    } catch {
      /* ignore */
    }
  }
}

/** Number of live entries; used by the memory tests. */
export function cacheSize(): number {
  return sources.size;
}

export function clearCache(): void {
  for (const source of sources.values()) disposeSource(source);
  sources.clear();
  refs.clear();
  pending.clear();
}
