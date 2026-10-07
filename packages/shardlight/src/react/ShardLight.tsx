import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject, ReactNode } from 'react';
import {
  collapseTrigger,
  createLightModel,
  type Baker,
  type EffectConfig,
  type FrameValues,
  type Layer,
  type LightModel,
  type Preset,
  type SetValues,
  type ShardLightConfig,
} from '../core/index.js';
import {
  normalizeEffects,
  ShardLightContext,
  useShardRegistry,
  type EffectShorthand,
} from '../shared-react/index.js';
import { autoResolution, measuredEdge } from './resolution.js';
import { sharedTicker } from './ticker.js';

export interface ShardLightProps {
  /** Starting config. Omitted or `null` = start empty. */
  preset?: Preset | null;
  /** Data-driven alternative or addition to children. */
  config?: Partial<ShardLightConfig>;
  /** Shorthand for `config.color`. */
  color?: string;
  /** CSS edge length of the light box. */
  size?: number | string;
  /** Bake size. `'auto'` uses rendered size × DPR, capped. */
  resolution?: number | 'auto';
  /** Thins every ray. */
  rayScale?: number;
  effects?: EffectConfig[];
  flicker?: EffectShorthand;
  /** Click the light to collapse it (click again to expand). */
  collapse?: EffectShorthand;
  /** Static channel values. */
  channels?: Record<string, { scale?: number; opacity?: number }>;
  /** CSS `mix-blend-mode` of the whole light. Default `plus-lighter`. */
  blend?: string;
  baker?: Baker;
  /** Fires once every layer is baked and decoded. */
  onReady?: () => void;
  /** Shown until it's ready (SSR, first paint). */
  fallback?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** The root `<div>` plus the imperative API. */
export type ShardLightHandle = HTMLDivElement & {
  set(values: SetValues): void;
  setChannel(
    channel: string,
    values: { scale?: number; opacity?: number; rotation?: number },
  ): void;
  /** Drives the whole-light hover amount (`spin`/`hover` shards use it). */
  setHover(hovered: boolean): void;
  /** Eases the light toward collapsed (click behavior). */
  setCollapsed(collapsed: boolean): void;
  /** Flips between expanded and collapsed. */
  toggleCollapsed(): void;
  readonly ready: Promise<void>;
  readonly model: LightModel | null;
};

export const ShardLight = forwardRef<ShardLightHandle, ShardLightProps>(
  function ShardLight(props, ref) {
    const {
      preset,
      config,
      color,
      size = 256,
      resolution = 1024,
      rayScale,
      effects,
      flicker,
      collapse,
      channels,
      blend,
      baker,
      onReady,
      fallback,
      className,
      style,
      children,
    } = props;

    const rootRef = useRef<HTMLDivElement | null>(null);
    const modelRef = useRef<LightModel | null>(null);
    const readyFiredRef = useRef(false);
    const [layers, setLayers] = useState<Layer[]>([]);
    const [ready, setReady] = useState(false);

    const { registry, shards } = useShardRegistry();
    const effectsList = useMemo(
      () => normalizeEffects(effects, flicker, collapse),
      [effects, flicker, collapse],
    );

    const bakeResolution = useCallback(
      () =>
        resolution === 'auto' ? autoResolution(size, measuredEdge(rootRef.current)) : resolution,
      [resolution, size],
    );

    const applyFrame = useCallback((values: FrameValues) => {
      const root = rootRef.current;
      if (!root) return;
      for (const name of values.channels()) {
        const channel = values.channel(name);
        root.style.setProperty(`--shardlight-${name}-scale`, String(channel.scale));
        root.style.setProperty(`--shardlight-${name}-opacity`, String(channel.opacity));
        root.style.setProperty(`--shardlight-${name}-rotation`, `${channel.rotation}deg`);
      }
      root.style.setProperty('--shardlight-opacity', String(values.opacity));
    }, []);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node as ShardLightHandle | null);
        else if (ref)
          (ref as MutableRefObject<ShardLightHandle | null>).current =
            node as ShardLightHandle | null;
      },
      [ref],
    );

    // Create the model once, on the client.
    useEffect(() => {
      const reducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const model = createLightModel({
        preset,
        config,
        shards,
        effects: effectsList,
        color,
        resolution: bakeResolution(),
        rayScale,
        baker,
        accepts: ['url'],
        reducedMotion,
      });
      modelRef.current = model;

      const unsubscribeLayers = model.subscribe(setLayers);
      const unsubscribeFrame = model.onFrame(applyFrame);
      model.ready.then(() => {
        if (readyFiredRef.current) return;
        readyFiredRef.current = true;
        setReady(true);
        onReady?.();
      });

      // Subscribe to the shared loop only while this light is both on screen
      // and has something to animate (a continuous effect, or hover/collapse
      // easing). A static preset runs no frames at all.
      let visible = false;
      let active = model.animating;
      let unsubscribeTick: (() => void) | null = null;
      const syncTick = () => {
        const shouldRun = visible && active;
        if (shouldRun && !unsubscribeTick) {
          unsubscribeTick = sharedTicker.subscribe((dt) => model.tick(dt));
        } else if (!shouldRun && unsubscribeTick) {
          unsubscribeTick();
          unsubscribeTick = null;
        }
      };
      const unsubscribeActivity = model.onActivity((value) => {
        active = value;
        syncTick();
      });

      const node = rootRef.current;
      let observer: IntersectionObserver | null = null;
      if (node && typeof IntersectionObserver !== 'undefined') {
        observer = new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          syncTick();
        });
        observer.observe(node);
      } else {
        // No IntersectionObserver (SSR, tests): treat as on screen.
        visible = true;
        syncTick();
      }

      return () => {
        observer?.disconnect();
        unsubscribeActivity();
        unsubscribeTick?.();
        unsubscribeLayers();
        unsubscribeFrame();
        model.dispose();
        modelRef.current = null;
      };
      // Model is created once; prop changes are pushed through update() below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Push prop and `<Shard>` changes into the model.
    const updateKey = JSON.stringify({
      preset,
      config,
      color,
      size,
      resolution,
      rayScale,
      effects: effectsList,
      shards,
    });
    useEffect(() => {
      modelRef.current?.update({
        preset,
        config,
        color,
        shards,
        effects: effectsList,
        resolution: bakeResolution(),
        rayScale,
        baker,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateKey]);

    // Static channel values.
    const channelKey = JSON.stringify(channels ?? null);
    useEffect(() => {
      if (channels) modelRef.current?.set({ channels });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelKey]);

    // Expose the imperative API on the root element.
    useEffect(() => {
      const node = rootRef.current as ShardLightHandle | null;
      if (!node) return;
      node.set = (values: SetValues) => modelRef.current?.set(values);
      node.setChannel = (
        channel: string,
        values: { scale?: number; opacity?: number; rotation?: number },
      ) => modelRef.current?.setChannel(channel, values);
      node.setHover = (hovered: boolean) => modelRef.current?.setHover(hovered);
      node.setCollapsed = (collapsed: boolean) => modelRef.current?.setCollapsed(collapsed);
      node.toggleCollapsed = () => modelRef.current?.toggleCollapsed();
      Object.defineProperty(node, 'ready', {
        configurable: true,
        get: () => modelRef.current?.ready ?? Promise.resolve(),
      });
      Object.defineProperty(node, 'model', {
        configurable: true,
        get: () => modelRef.current,
      });
    }, []);

    const rootStyle: CSSProperties = {
      position: 'relative',
      display: 'inline-block',
      width: size,
      height: size,
      opacity: 'var(--shardlight-opacity, 1)' as unknown as number,
      mixBlendMode: (blend ?? 'plus-lighter') as CSSProperties['mixBlendMode'],
      ...style,
    };

    return (
      <ShardLightContext.Provider value={registry}>
        <div
          ref={setRefs}
          className={className}
          style={rootStyle}
          aria-hidden="true"
          onPointerEnter={() => modelRef.current?.setHover(true)}
          onPointerLeave={() => modelRef.current?.setHover(false)}
          onPointerCancel={() => modelRef.current?.setHover(false)}
          onClick={() => {
            const model = modelRef.current;
            if (!model) return;
            const trigger = collapseTrigger(model.resolved.effects);
            if (trigger === 'click') model.toggleCollapsed();
            else if (trigger === 'once') model.setCollapsed(true);
          }}
        >
          {layers.map((layer) => renderLayer(layer))}
          {!ready && fallback ? (
            <div style={{ position: 'absolute', inset: 0 }}>{fallback}</div>
          ) : null}
          {children}
        </div>
      </ShardLightContext.Provider>
    );
  },
);

function renderLayer(layer: Layer): ReactNode {
  if (!layer.source || layer.source.type !== 'url') return null;
  const src = layer.source.url;
  const imgStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transformOrigin: 'center',
    transform: `rotate(var(--shardlight-${layer.channel}-rotation, 0deg)) scale(var(--shardlight-${layer.channel}-scale, 1))`,
    opacity: `var(--shardlight-${layer.channel}-opacity, 1)` as unknown as number,
  };
  return <img key={layer.id} src={src} alt="" draggable={false} style={imgStyle} />;
}
