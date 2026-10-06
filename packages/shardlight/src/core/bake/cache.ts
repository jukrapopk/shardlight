import type { LayerSource } from './baker.js';

/**
 * A ref-counted cache keyed by the layer's content hash, shared across every
 * light and target on the page. A null/deferred context is not an
 * error: the source simply never lands in the cache, so the next call retries.
 *
 * The cache — not the caller — owns each bake's `AbortController`. Several
 * lights can wait on one in-flight bake; it is cancelled only when the last
 * interested light releases it. This prevents one consumer's `dispose()` from
 * aborting a bake another consumer is still waiting for (which StrictMode's
 * mount/unmount/remount triggers immediately).
 */
const sources = new Map<string, LayerSource>();
const refs = new Map<string, number>();
const pending = new Map<string, Pending>();

interface Pending {
  promise: Promise<LayerSource>;
  controller: AbortController;
}

export function acquireSource(
  key: string,
  start: (signal: AbortSignal) => Promise<LayerSource>,
): Promise<LayerSource> {
  refs.set(key, (refs.get(key) ?? 0) + 1);

  const existing = sources.get(key);
  if (existing) return Promise.resolve(existing);

  const inflight = pending.get(key);
  if (inflight) return inflight.promise;

  const controller = new AbortController();
  const entry: Pending = { controller, promise: undefined as unknown as Promise<LayerSource> };
  entry.promise = start(controller.signal).then(
    (source) => {
      if (pending.get(key) === entry) pending.delete(key);
      sources.set(key, source);
      // Everyone released while we were baking: free it right away.
      if (!refs.has(key)) {
        sources.delete(key);
        disposeSource(source);
      }
      return source;
    },
    (error) => {
      if (pending.get(key) === entry) pending.delete(key);
      throw error;
    },
  );
  pending.set(key, entry);
  return entry.promise;
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
    return;
  }

  const inflight = pending.get(key);
  if (inflight) {
    // Nobody wants it any more: cancel and drop it immediately, so a later
    // acquire starts a fresh bake instead of adopting an aborted one.
    pending.delete(key);
    inflight.controller.abort();
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
  for (const inflight of pending.values()) inflight.controller.abort();
  pending.clear();
}
