import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { GroupProps, ThreeEvent } from '@react-three/fiber';
import type * as THREE from 'three';
import {
  normalizeEffects,
  ShardLightContext,
  useShardRegistry,
  type EffectShorthand,
} from '../shared-react/index.js';
import {
  createShardLight,
  type CreateShardLightOptions,
  type ShardLightController,
} from '../three/index.js';
import type { EffectConfig, LightModel, SetValues, ShardInput } from '../core/index.js';

export interface ShardLightMeshProps extends Omit<GroupProps, 'ref'> {
  preset?: CreateShardLightOptions['preset'];
  config?: CreateShardLightOptions['config'];
  /** Overrides the preset's colour for the whole light. */
  color?: string;
  /** Plain shard objects; `<Shard>` children are also accepted. */
  shards?: ShardInput[];
  effects?: EffectConfig[];
  flicker?: EffectShorthand;
  /** Click the light to collapse it (click again to expand). */
  collapse?: EffectShorthand;
  size?: number;
  resolution?: number;
  rayScale?: number;
  baker?: CreateShardLightOptions['baker'];
  autoUpdate?: boolean;
  billboard?: boolean;
  hitRadius?: number;
  /** Seconds for hover to ease in/out. Default 0.25; 0 snaps. */
  hoverEase?: number;
  /** Seconds for the click collapse to ease in/out. Default 0.3; 0 snaps. */
  collapseEase?: number;
  material?: CreateShardLightOptions['material'];
  renderOrder?: number;
  depthTest?: boolean;
  toneMapped?: boolean;
  onReady?: () => void;
}

export interface ShardLightHandle {
  set(values: SetValues): void;
  /** Ease the whole-light hover amount toward 0 or 1. */
  setHover(hovered: boolean): void;
  /** Ease the collapse toward expanded / collapsed. */
  setCollapsed(collapsed: boolean): void;
  /** Flip between expanded and collapsed. */
  toggleCollapsed(): void;
  ready: Promise<void>;
  object: THREE.Group | null;
  model: LightModel | null;
}

/**
 * `<ShardLightMesh>`: a thin wrapper over `createShardLight`,
 * mounting its `object` with `<primitive>` and pushing prop and `<Shard>`
 * changes into `update()`.
 */
export const ShardLightMesh = forwardRef<ShardLightHandle, ShardLightMeshProps>(
  function ShardLightMesh(props, ref) {
    const {
      preset,
      config,
      color,
      shards: shardsProp,
      effects,
      flicker,
      collapse,
      size,
      resolution,
      rayScale,
      baker,
      autoUpdate,
      billboard,
      hitRadius,
      hoverEase,
      collapseEase,
      material,
      renderOrder,
      depthTest,
      toneMapped,
      onReady,
      children,
      ...groupProps
    } = props;

    const { registry, shards: childShards } = useShardRegistry();
    const effectsList = useMemo(
      () => normalizeEffects(effects, flicker, collapse),
      [effects, flicker, collapse],
    );
    const shards = useMemo(
      () => [...childShards, ...(shardsProp ?? [])],
      [childShards, shardsProp],
    );

    const [controller, setController] = useState<ShardLightController | null>(null);

    // Create the controller once, on mount.
    useEffect(() => {
      const created = createShardLight({
        preset,
        config,
        color,
        shards,
        effects: effectsList,
        size,
        resolution,
        rayScale,
        baker,
        autoUpdate,
        billboard,
        hitRadius,
        hoverEase,
        collapseEase,
        material,
        renderOrder,
        depthTest,
        toneMapped,
      });
      setController(created);
      return () => {
        created.dispose();
        setController(null);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateKey = JSON.stringify({
      preset,
      config,
      color,
      shards,
      effects: effectsList,
      size,
      resolution,
      rayScale,
      renderOrder,
      depthTest,
      toneMapped,
      autoUpdate,
      billboard,
      hitRadius,
      hoverEase,
      collapseEase,
    });

    useEffect(() => {
      controller?.update({
        preset,
        config,
        color,
        shards,
        effects: effectsList,
        size,
        resolution,
        rayScale,
        baker,
        autoUpdate,
        billboard,
        hitRadius,
        hoverEase,
        collapseEase,
        material,
        renderOrder,
        depthTest,
        toneMapped,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controller, updateKey]);

    useEffect(() => {
      if (!controller) return;
      let alive = true;
      controller.ready.then(() => {
        if (alive) onReady?.();
      });
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controller]);

    useImperativeHandle(
      ref,
      () => ({
        set: (values: SetValues) => controller?.set(values),
        setHover: (hovered: boolean) => controller?.setHover(hovered),
        setCollapsed: (collapsed: boolean) => controller?.setCollapsed(collapsed),
        toggleCollapsed: () => controller?.toggleCollapsed(),
        ready: controller?.ready ?? Promise.resolve(),
        object: controller?.object ?? null,
        model: controller?.model ?? null,
      }),
      [controller],
    );

    if (!controller) return null;

    const { onPointerOver, onPointerOut, onClick, ...restGroupProps } = groupProps;

    return (
      <ShardLightContext.Provider value={registry}>
        <primitive
          object={controller.object}
          {...restGroupProps}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            controller.setHover(true);
            onPointerOver?.(event);
          }}
          onPointerOut={(event: ThreeEvent<PointerEvent>) => {
            controller.setHover(false);
            onPointerOut?.(event);
          }}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            controller.toggleCollapsed();
            onClick?.(event);
          }}
        >
          {children}
        </primitive>
      </ShardLightContext.Provider>
    );
  },
);
