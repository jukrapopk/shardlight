import * as THREE from 'three';
import {
  createLightModel,
  definedOnly,
  type Baker,
  type EffectConfig,
  type FrameValues,
  type Layer,
  type LightModel,
  type Preset,
  type SetValues,
  type ShardInput,
  type ShardLightConfig,
} from '../core/index.js';
import { acquireTexture, releaseTexture } from './texture-cache.js';

export interface CreateShardLightOptions {
  preset?: Preset | null;
  config?: Partial<ShardLightConfig>;
  shards?: ShardInput[];
  effects?: EffectConfig[];
  color?: string;
  /** World units (plane edge). */
  size?: number;
  /** Texture edge. Default 1024. */
  resolution?: number;
  rayScale?: number;
  baker?: Baker;
  /** Default true: effects run from `onBeforeRender`. */
  autoUpdate?: boolean;
  /** Faces the camera. Default false. */
  billboard?: boolean;
  /** Circular hit radius at the centre, as a fraction of the half-edge. */
  hitRadius?: number;
  /** Custom material factory, for custom shading. */
  material?: (layer: Layer) => THREE.Material;
  renderOrder?: number;
  depthTest?: boolean;
  toneMapped?: boolean;
  onReady?: () => void;
}

export interface ShardLightController {
  object: THREE.Group;
  model: LightModel;
  set(values: SetValues): void;
  update(patch: Partial<CreateShardLightOptions>): void;
  tick(dt: number): void;
  ready: Promise<void>;
  dispose(): void;
}

interface MeshEntry {
  mesh: THREE.Mesh;
  material: THREE.Material & { map?: THREE.Texture | null; transparent?: boolean };
  key: string;
  textureKey: string | null;
  channel: string;
}

/**
 * The three.js adapter (plan §7.1): one additive plane per layer, spin layers
 * inside a rotating child group. It wraps a `createLightModel()` and turns the
 * model's layers and frame values into meshes, scales, opacities and rotation.
 */
export function createShardLight(options: CreateShardLightOptions = {}): ShardLightController {
  let opts = {
    size: 0.5,
    resolution: 1024,
    autoUpdate: true,
    billboard: false,
    ...definedOnly(options),
  };
  const object = new THREE.Group();
  const spinGroup = new THREE.Group();
  object.add(spinGroup);

  let geometry = new THREE.PlaneGeometry(opts.size, opts.size);
  const entries = new Map<string, MeshEntry>();
  const clock = new THREE.Clock();
  let disposed = false;

  const model = createLightModel({
    preset: opts.preset,
    config: opts.config,
    shards: opts.shards,
    effects: opts.effects,
    color: opts.color,
    resolution: opts.resolution,
    rayScale: opts.rayScale,
    baker: opts.baker,
    accepts: ['bitmap', 'canvas'],
    onError: (error) => {
      console.error('[shardlight] bake error', error);
    },
  });

  let hitMesh: THREE.Mesh | null = null;
  if (opts.hitRadius !== undefined) hitMesh = createHitMesh(opts.size, opts.hitRadius);

  function createMaterial(layer: Layer): MeshEntry['material'] {
    if (opts.material) return opts.material(layer) as MeshEntry['material'];
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: opts.toneMapped ?? false,
      depthTest: opts.depthTest ?? true,
      side: THREE.DoubleSide,
      blending: layer.blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    return material as MeshEntry['material'];
  }

  function createHitMesh(size: number, hitRadius: number): THREE.Mesh {
    const hitGeometry = new THREE.CircleGeometry((hitRadius * size) / 2, 24);
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(hitGeometry, hitMaterial);
    mesh.name = 'shardlight-hit';
    object.add(mesh);
    return mesh;
  }

  function applyTexture(entry: MeshEntry, layer: Layer): void {
    if (!layer.source) return;
    if (entry.textureKey) releaseTexture(entry.textureKey);
    entry.textureKey = layer.key;
    entry.material.map = acquireTexture(layer.key, layer.source);
    entry.material.needsUpdate = true;
    entry.mesh.visible = true;
  }

  function beforeRender(
    _renderer: THREE.WebGLRenderer,
    _scene: THREE.Scene,
    camera: THREE.Camera,
  ): void {
    if (disposed) return;
    if (opts.billboard) {
      const position = new THREE.Vector3();
      camera.getWorldPosition(position);
      object.lookAt(position);
    }
    if (opts.autoUpdate) {
      const dt = clock.getDelta();
      if (dt > 0) model.tick(dt);
    }
  }

  function syncLayers(layers: readonly Layer[]): void {
    const byId = new Map(layers.map((layer) => [layer.id, layer] as const));

    // Remove meshes whose layer is gone.
    for (const [id, entry] of [...entries]) {
      if (byId.has(id)) continue;
      removeEntry(id, entry);
    }

    for (const layer of layers) {
      let entry = entries.get(layer.id);
      if (entry && entry.key !== layer.key) {
        // Re-bake in place: swap the texture, keep the mesh.
        if (entry.textureKey) releaseTexture(entry.textureKey);
        entry.textureKey = null;
        entry.key = layer.key;
        // Hide until the new texture is ready, so a stale/absent map never
        // shows as a white quad.
        entry.material.map = null;
        entry.material.needsUpdate = true;
        entry.mesh.visible = false;
        if (layer.source) applyTexture(entry, layer);
      } else if (entry) {
        // The layer was created before its source finished baking.
        if (!entry.textureKey && layer.source) applyTexture(entry, layer);
      } else {
        const material = createMaterial(layer);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = layer.id;
        mesh.visible = false;
        mesh.renderOrder = opts.renderOrder ?? 0;
        mesh.onBeforeRender = beforeRender;
        entry = {
          mesh,
          material,
          key: layer.key,
          textureKey: null,
          channel: layer.channel,
        };
        entries.set(layer.id, entry);
        if (layer.source) applyTexture(entry, layer);
        (layer.spin ? spinGroup : object).add(mesh);
      }
    }
  }

  function removeEntry(id: string, entry: MeshEntry): void {
    entries.delete(id);
    if (entry.textureKey) releaseTexture(entry.textureKey);
    entry.mesh.removeFromParent();
    entry.material.dispose();
  }

  function applyFrame(values: FrameValues): void {
    for (const entry of entries.values()) {
      const channel = values.channel(entry.channel);
      entry.mesh.scale.set(channel.scale, channel.scale, 1);
      entry.material.opacity = channel.opacity * values.opacity;
    }
    spinGroup.rotation.z = (values.spin * Math.PI) / 180;
  }

  const unsubscribeLayers = model.subscribe(syncLayers);
  const unsubscribeFrame = model.onFrame(applyFrame);
  model.ready.then(() => opts.onReady?.());

  const controller: ShardLightController = {
    object,
    model,
    set(values) {
      model.set(values);
    },
    update(patch) {
      if (disposed) return;
      const previousSize = opts.size;
      opts = { ...opts, ...definedOnly(patch) };
      if (patch.size !== undefined && patch.size !== previousSize) {
        geometry.dispose();
        geometry = new THREE.PlaneGeometry(opts.size, opts.size);
        for (const entry of entries.values()) entry.mesh.geometry = geometry;
        if (hitMesh) resizeHitMesh(hitMesh, opts.size, opts.hitRadius ?? 0);
      }
      model.update({
        preset: opts.preset,
        config: opts.config,
        shards: opts.shards,
        effects: opts.effects,
        color: opts.color,
        resolution: opts.resolution,
        rayScale: opts.rayScale,
        baker: opts.baker,
      });
    },
    tick(dt) {
      model.tick(dt);
    },
    ready: model.ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribeLayers();
      unsubscribeFrame();
      model.dispose();
      for (const [id, entry] of [...entries]) removeEntry(id, entry);
      geometry.dispose();
      if (hitMesh) {
        hitMesh.geometry.dispose();
        (hitMesh.material as THREE.Material).dispose();
        hitMesh.removeFromParent();
        hitMesh = null;
      }
      object.removeFromParent();
    },
  };

  return controller;
}

function resizeHitMesh(mesh: THREE.Mesh, size: number, hitRadius: number): void {
  mesh.geometry.dispose();
  mesh.geometry = new THREE.CircleGeometry((hitRadius * size) / 2, 24);
}
