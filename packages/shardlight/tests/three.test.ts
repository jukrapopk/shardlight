import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createShardLight, textureCacheSize } from '../src/three/index.js';
import { createFakeBaker, runAdapterContract } from '../src/testing/index.js';

afterEach(() => {
  expect(textureCacheSize()).toBe(0);
});

function meshNames(object: THREE.Object3D): string[] {
  const names: string[] = [];
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if ((mesh as unknown as { isMesh?: boolean }).isMesh && mesh.name) {
      names.push(mesh.name);
    }
  });
  return names.filter((name) => name !== 'shardlight-hit');
}

describe('three adapter (§7.1)', () => {
  it('creates one plane per layer and disposes its textures', async () => {
    const controller = createShardLight({
      preset: 'star',
      size: 1,
      resolution: 64,
      baker: createFakeBaker(),
    });
    await controller.ready;
    expect(meshNames(controller.object).sort()).toEqual(['body|false|add', 'rays|false|add']);
    expect(textureCacheSize()).toBe(2);
    controller.dispose();
  });

  it('instances share textures', async () => {
    const a = createShardLight({
      preset: 'star',
      size: 1,
      resolution: 64,
      baker: createFakeBaker(),
    });
    await a.ready;
    const b = createShardLight({
      preset: 'star',
      size: 1,
      resolution: 64,
      baker: createFakeBaker(),
    });
    await b.ready;
    expect(textureCacheSize()).toBe(2);
    a.dispose();
    expect(textureCacheSize()).toBe(2);
    b.dispose();
  });

  it('satisfies the shared adapter contract', async () => {
    await runAdapterContract({
      name: 'three',
      async create(config) {
        const controller = createShardLight({
          preset: config.preset ?? 'star',
          shards: config.shards,
          size: 1,
          resolution: 64,
          baker: createFakeBaker(),
        });
        await controller.ready;
        return {
          hostIds: () => meshNames(controller.object),
          async update(patch) {
            controller.update({ preset: patch.preset, shards: patch.shards });
            await controller.ready;
          },
          dispose: () => controller.dispose(),
        };
      },
    });
  });
});
