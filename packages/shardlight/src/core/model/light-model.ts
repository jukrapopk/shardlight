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

/** One host unit: one baked image, one `<img>` or plane. */
export interface Layer {
  /** Stable while the layer exists: `${channel}|${blend}`. */
  id: string;
  /** Content hash; changes when the layer needs re-baking. */
  key: string;
  channel: string;
  blend: 'add' | 'screen';
  source: LayerSource | null;
}

export interface SetValues {
  channels?: Record<string, { scale?: number; opacity?: number; rotation?: number }>;
  /** The whole light's opacity. */
  opacity?: number;
  /** Direct hover amount 0..1; also snaps the eased hover target. */
  hover?: number;
  /** Direct collapsed amount 0..1; also snaps the eased collapse target. */
  collapse?: number;
}

export interface LightModelOptions extends ResolveInput {
  resolution?: number;
  rayScale?: number;
  baker?: Baker;
  accepts?: LayerSource['type'][];
  /** Pause effects under `prefers-reduced-motion`. */
  reducedMotion?: boolean;
  /** Seconds for hover to ease in/out. Default 0.25; 0 snaps. */
  hoverEase?: number;
  /** Seconds for the click collapse to ease in/out. Default 0.3; 0 snaps. */
  collapseEase?: number;
  warn?: boolean;
  onError?: (error: unknown) => void;
}

export interface LightModel {
  subscribe(listener: (layers: Layer[]) => void): () => void;
  onFrame(listener: (values: FrameValues) => void): () => void;
  update(patch: Partial<LightModelOptions>): void;
  set(values: SetValues): void;
  setChannel(
    channel: string,
    values: { scale?: number; opacity?: number; rotation?: number },
  ): void;
  /** Ease the light-wide hover amount toward 0 or 1. */
  setHover(hovered: boolean): void;
  /** Ease the light-wide collapse toward 0 (expanded) or 1 (collapsed). */
  setCollapsed(collapsed: boolean): void;
  /** Flip between expanded and collapsed. */
  toggleCollapsed(): void;
  tick(dt: number): void;
  dispose(): void;
  readonly layers: readonly Layer[];
  readonly resolved: ResolvedLight;
  /**
   * True while the model has something that changes frame to frame: a
   * time-driven effect, or hover/collapse easing in flight. An effect-free,
   * settled light reports `false`, so a host can stop ticking it.
   */
  readonly animating: boolean;
  /** Fires when `animating` changes; calls the listener immediately with the current value. */
  onActivity(listener: (active: boolean) => void): () => void;
  /** Resolves once every currently-known layer has a baked source. */
  readonly ready: Promise<void>;
}

const DEFAULT_RESOLUTION = 1024;
const DEFAULT_ACCEPTS: LayerSource['type'][] = ['url'];
const DEFAULT_HOVER_EASE = 0.25;
const DEFAULT_COLLAPSE_EASE = 0.3;

/**
 * The headless controller every target wraps. It owns everything that
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
  let hover = 0;
  let hoverTarget = 0;
  let hoverTime = 0;
  let collapse = 0;
  let collapseTarget = 0;
  let disposed = false;

  const activityListeners = new Set<(active: boolean) => void>();

  /** True while the model has something that changes frame to frame. */
  function isActive(): boolean {
    if (activeEffects().some((effect) => getEffect(effect.type)?.inputDriven !== true)) {
      return true;
    }
    if (hover !== hoverTarget || collapse !== collapseTarget) return true;
    // A settled hover can still wind a spin while the pointer rests on the
    // light, so it keeps animating until the pointer leaves.
    if (hover > 0) {
      return resolved.effects.some(
        (effect) =>
          effect.type === 'hover' && Number((effect as { spin?: number }).spin ?? 0) !== 0,
      );
    }
    return false;
  }

  let active = isActive();

  function refreshActivity(): void {
    const next = isActive();
    if (next === active) return;
    active = next;
    for (const listener of activityListeners) listener(active);
  }

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

  function hasEffect(type: string): boolean {
    return resolved.effects.some((effect) => effect.type === type);
  }

  function emitLayers(): void {
    const snapshot = layers.slice();
    for (const listener of layerListeners) listener(snapshot);
  }

  function frame(): FrameValues {
    return computeFrame(
      { ...manual, hover, hoverTime, collapse },
      activeEffects(),
      time,
      channelNames(),
    );
  }

  function emitFrame(): void {
    const values = frame();
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
        // Leave it pending so a later update retries.
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
      listener(frame());
      return () => frameListeners.delete(listener);
    },
    onActivity(listener) {
      activityListeners.add(listener);
      listener(active);
      return () => activityListeners.delete(listener);
    },
    update(patch) {
      if (disposed) return;
      opts = { ...opts, ...definedOnly(patch) };
      resolved = resolve(opts);
      sync();
      // Effects may have changed: recompute the current frame.
      emitFrame();
      refreshActivity();
    },
    set(values) {
      if (values.hover !== undefined) {
        hover = clamp01(values.hover);
        hoverTarget = hover;
      }
      if (values.collapse !== undefined) {
        collapse = clamp01(values.collapse);
        collapseTarget = collapse;
      }
      manual = {
        ...manual,
        ...values,
        channels: values.channels ? { ...manual.channels, ...values.channels } : manual.channels,
      };
      emitFrame();
      refreshActivity();
    },
    setChannel(channel, values) {
      model.set({ channels: { [channel]: values } });
    },
    setHover(hovered) {
      if (disposed) return;
      if (!hasEffect('hover')) return;
      hoverTarget = hovered ? 1 : 0;
      if ((opts.hoverEase ?? DEFAULT_HOVER_EASE) <= 0) {
        hover = hoverTarget;
        emitFrame();
      }
      refreshActivity();
    },
    setCollapsed(collapsed) {
      if (disposed) return;
      if (!hasEffect('collapse')) return;
      collapseTarget = collapsed ? 1 : 0;
      if ((opts.collapseEase ?? DEFAULT_COLLAPSE_EASE) <= 0) {
        collapse = collapseTarget;
        emitFrame();
      }
      refreshActivity();
    },
    toggleCollapsed() {
      model.setCollapsed(collapseTarget < 0.5);
    },
    tick(dt) {
      if (disposed) return;
      if (!isActive()) return;
      time += dt;
      if (hover !== hoverTarget) {
        const ease = opts.hoverEase ?? DEFAULT_HOVER_EASE;
        if (ease <= 0) {
          hover = hoverTarget;
        } else {
          hover += (hoverTarget - hover) * (1 - Math.exp(-dt / ease));
          if (Math.abs(hoverTarget - hover) < 0.001) hover = hoverTarget;
        }
      }
      if (collapse !== collapseTarget) {
        const ease = opts.collapseEase ?? DEFAULT_COLLAPSE_EASE;
        if (ease <= 0) {
          collapse = collapseTarget;
        } else {
          collapse += (collapseTarget - collapse) * (1 - Math.exp(-dt / ease));
          if (Math.abs(collapseTarget - collapse) < 0.001) collapse = collapseTarget;
        }
      }
      // Bank time spent hovering, so `hover.spin` can wind up and down.
      hoverTime += hover * dt;
      emitFrame();
      refreshActivity();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scheduler.clear();
      for (const key of acquired.keys()) releaseSource(key);
      acquired.clear();
      layerListeners.clear();
      frameListeners.clear();
      activityListeners.clear();
      flushReady();
    },
    get layers() {
      return layers;
    },
    get resolved() {
      return resolved;
    },
    get animating() {
      return active;
    },
    get ready() {
      if (pendingCount() === 0) return Promise.resolve();
      return new Promise<void>((resolveReady) => readyWaiters.push(resolveReady));
    },
  };

  sync();
  return model;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
