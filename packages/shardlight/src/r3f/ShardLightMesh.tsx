import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { GroupProps } from '@react-three/fiber';
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
  /** Plain shard objects; `<Shard>` children are also accepted (plan §7.2). */
  shards?: ShardInput[];
  effects?: EffectConfig[];
  spin?: EffectShorthand;
  flicker?: EffectShorthand;
  size?: number;
  resolution?: number;
  rayScale?: number;
  baker?: CreateShardLightOptions['baker'];
  autoUpdate?: boolean;
  billboard?: boolean;
  hitRadius?: number;
  material?: CreateShardLightOptions['material'];
  renderOrder?: number;
  depthTest?: boolean;
  toneMapped?: boolean;
  onReady?: () => void;
}

export interface ShardLightHandle {
  set(values: SetValues): void;
  ready: Promise<void>;
  object: THREE.Group | null;
  model: LightModel | null;
}

/**
 * `<ShardLightMesh>` (plan §7.2): a thin wrapper over `createShardLight`,
 * mounting its `object` with `<primitive>` and pushing prop and `<Shard>`
 * changes into `update()`.
 */
export const ShardLightMesh = forwardRef<ShardLightHandle, ShardLightMeshProps>(
  function ShardLightMesh(props, ref) {
    const {
      preset,
      config,
      shards: shardsProp,
      effects,
      spin,
      flicker,
      size,
      resolution,
      rayScale,
      baker,
      autoUpdate,
      billboard,
      hitRadius,
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
      () => normalizeEffects(effects, spin, flicker),
      [effects, spin, flicker],
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
        shards,
        effects: effectsList,
        size,
        resolution,
        rayScale,
        baker,
        autoUpdate,
        billboard,
        hitRadius,
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
    });

    useEffect(() => {
      controller?.update({
        preset,
        config,
        shards,
        effects: effectsList,
        size,
        resolution,
        rayScale,
        baker,
        autoUpdate,
        billboard,
        hitRadius,
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
        ready: controller?.ready ?? Promise.resolve(),
        object: controller?.object ?? null,
        model: controller?.model ?? null,
      }),
      [controller],
    );

    if (!controller) return null;

    return (
      <ShardLightContext.Provider value={registry}>
        <primitive object={controller.object} {...groupProps}>
          {children}
        </primitive>
      </ShardLightContext.Provider>
    );
  },
);
