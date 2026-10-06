import { resolveConfig, type ResolveInput } from '../config/resolve.js';
import { migrateConfig } from '../config/migrate.js';
import type { EffectConfig, ResolvedLayer, ResolvedLight } from '../config/types.js';
import { getEffect } from '../effects/registry.js';
import { computeFrame } from '../effects/frame-values.js';
import type { FrameValues } from '../effects/types.js';
import { canvas2dBaker } from '../bake/canvas2d.js';
import { acquireSource, releaseSource } from '../bake/cache.js';
import type { Baker, LayerSource } from '../bake/baker.js';
import { createScheduler } from '../bake/scheduler.js';
import { isAbortError } from '../bake/scheduler.js';
import { buildLayers } from './layers.js';
import { definedOnly } from '../util/object.js';

/** One host unit: one baked image, one `<img>` or plane (plan §5). */
export interface Layer {
  /** Stable while the layer exists: `${channel}|${spin}|${blend}`. */
  id: string;
  /** Content hash; changes when the layer needs re-baking. */
  key: string;
  channel: string;
  spin: boolean;
  blend: 'add' | 'screen';
  source: LayerSource | null;
}

export interface SetValues {
  channels?: Record<string, { scale?: number; opacity?: number }>;
  /** The whole light's opacity. */
  opacity?: number;
  /** Degrees; turns the `spin` shards. */
  spin?: number;
}

export interface LightModelOptions extends ResolveInput {
  resolution?: number;
  rayScale?: number;
  baker?: Baker;
  accepts?: LayerSource['type'][];
  /** Pause effects under `prefers-reduced-motion` (plan §4.3). */
  reducedMotion?: boolean;
  warn?: boolean;
  onError?: (error: unknown) => void;
}

export interface LightModel {
  subscribe(listener: (layers: Layer[]) => void): () => void;
  onFrame(listener: (values: FrameValues) => void): () => void;
  update(patch: Partial<LightModelOptions>): void;
  set(values: SetValues): void;
  setChannel(channel: string, values: { scale?: number; opacity?: number }): void;
  tick(dt: number): void;
  dispose(): void;
  readonly layers: readonly Layer[];
  readonly resolved: ResolvedLight;
  /** Resolves once every currently-known layer has a baked source. */
  readonly ready: Promise<void>;
}

const DEFAULT_RESOLUTION = 1024;
const DEFAULT_ACCEPTS: LayerSource['type'][] = ['url'];

/**
 * The headless controller every target wraps (plan §5). It owns everything that
 * isn't drawing to a host: resolving, grouping, baking, caching, diffing and
 * effects.
 */
export function createLightModel(options: LightModelOptions = {}): LightModel {
  let opts: LightModelOptions = {
    resolution: DEFAULT_RESOLUTION,
    rayScale: 1,
    baker: canvas2dBaker,
    accepts: DEFAULT_ACCEPTS,
    ...definedOnly(options),
  };

  const scheduler = createScheduler();
  const layerListeners = new Set<(layers: Layer[]) => void>();
  const frameListeners = new Set<(values: FrameValues) => void>();
  const acquired = new Map<string, number>();
  const readyWaiters: Array<() => void> = [];

  let resolved: ResolvedLight = resolve(opts);
  let layers: Layer[] = [];
  let manual: SetValues = {};
  let time = 0;
  let disposed = false;

  function resolve(current: LightModelOptions): ResolvedLight {
    const config = current.config ? migrateConfig(current.config) : undefined;
    return resolveConfig(
      {
        preset: current.preset,
        config,
        shards: current.shards,
        effects: current.effects,
        color: current.color,
        rotation: current.rotation,
        seed: current.seed,
      },
      { warn: current.warn },
    );
  }

  function activeEffects(): EffectConfig[] {
    if (!opts.reducedMotion) return resolved.effects;
    return resolved.effects.filter((effect) => getEffect(effect.type)?.reducedMotion === 'keep');
  }

  function channelNames(): string[] {
    return [...new Set(layers.map((layer) => layer.channel))];
  }

  function emitLayers(): void {
    const snapshot = layers.slice();
    for (const listener of layerListeners) listener(snapshot);
  }

  function emitFrame(): void {
    const values = computeFrame(manual, activeEffects(), time, channelNames());
    for (const listener of frameListeners) listener(values);
  }

  function pendingCount(): number {
    return layers.reduce((count, layer) => count + (layer.source ? 0 : 1), 0);
  }

  function flushReady(): void {
    if (pendingCount() !== 0) return;
    while (readyWaiters.length > 0) readyWaiters.shift()!();
  }

  function bake(resolvedLayer: ResolvedLayer, view: Layer): void {
    acquireSource(view.key, (signal) =>
      scheduler.run(
        () =>
          opts.baker!.bake(
            resolvedLayer,
            {
              resolution: opts.resolution ?? DEFAULT_RESOLUTION,
              rayScale: opts.rayScale ?? 1,
              accept: opts.accepts ?? DEFAULT_ACCEPTS,
            },
            signal,
          ),
        signal,
      ),
    )
      .then((source) => {
        if (disposed) return;
        const current = currentView(view);
        if (!current) return;
        current.source = source;
        emitLayers();
        flushReady();
      })
      .catch((error) => {
        if (disposed || isAbortError(error)) return;
        opts.onError?.(error);
        // Leave it pending so a later update retries (plan §8).
      });
  }

  /** Find the current view for a possibly-replaced layer. */
  function currentView(view: Layer): Layer | undefined {
    return layers.find((layer) => layer.id === view.id && layer.key === view.key);
  }

  /** Rebuild the resolved layers and reconcile host layers + bakes. */
  function sync(): void {
    const desired = buildLayers(resolved, {
      resolution: opts.resolution ?? DEFAULT_RESOLUTION,
      rayScale: opts.rayScale ?? 1,
      baker: opts.baker!.id,
      accept: opts.accepts ?? DEFAULT_ACCEPTS,
    });

    const desiredKeys = new Set(desired.map((layer) => layer.key));
    for (const key of [...acquired.keys()]) {
      if (!desiredKeys.has(key)) {
        releaseSource(key);
        acquired.delete(key);
      }
    }

    const previous = new Map(layers.map((layer) => [layer.id, layer] as const));
    layers = desired.map((layer) => {
      const prev = previous.get(layer.id);
      return {
        id: layer.id,
        key: layer.key,
        channel: layer.channel,
        spin: layer.spin,
        blend: layer.blend,
        source: prev && prev.key === layer.key ? prev.source : null,
      };
    });

    emitLayers();

    for (let i = 0; i < desired.length; i++) {
      const layer = layers[i]!;
      if (acquired.has(layer.key)) continue;
      acquired.set(layer.key, 1);
      bake(desired[i]!, layer);
    }

    flushReady();
  }

  const model: LightModel = {
    subscribe(listener) {
      layerListeners.add(listener);
      listener(layers.slice());
      return () => layerListeners.delete(listener);
    },
    onFrame(listener) {
      frameListeners.add(listener);
      listener(computeFrame(manual, activeEffects(), time, channelNames()));
      return () => frameListeners.delete(listener);
    },
    update(patch) {
      if (disposed) return;
      opts = { ...opts, ...definedOnly(patch) };
      resolved = resolve(opts);
      sync();
      // Effects may have changed: recompute the current frame.
      emitFrame();
    },
    set(values) {
      manual = {
        ...manual,
        ...values,
        channels: values.channels ? { ...manual.channels, ...values.channels } : manual.channels,
      };
      emitFrame();
    },
    setChannel(channel, values) {
      model.set({ channels: { [channel]: values } });
    },
    tick(dt) {
      if (disposed) return;
      if (activeEffects().length === 0) return;
      time += dt;
      emitFrame();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scheduler.clear();
      for (const key of acquired.keys()) releaseSource(key);
      acquired.clear();
      layerListeners.clear();
      frameListeners.clear();
      flushReady();
    },
    get layers() {
      return layers;
    },
    get resolved() {
      return resolved;
    },
    get ready() {
      if (pendingCount() === 0) return Promise.resolve();
      return new Promise<void>((resolveReady) => readyWaiters.push(resolveReady));
    },
  };

  sync();
  return model;
}
