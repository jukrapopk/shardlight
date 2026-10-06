import { afterEach, describe, expect, it } from 'vitest';
import {
  cacheSize,
  clearCache,
  createLightModel,
  definedOnly,
  type Layer,
} from '../src/core/index.js';
import { createFakeBaker, waitFor } from '../src/testing/index.js';

afterEach(() => clearCache());

function makeModel(options: Record<string, unknown> = {}) {
  return createLightModel({
    preset: 'star',
    resolution: 64,
    accepts: ['bitmap'],
    baker: createFakeBaker(),
    ...options,
  });
}

const ids = (layers: readonly Layer[]) => layers.map((l) => l.id).sort();

describe('createLightModel (§5)', () => {
  it('groups shards into layers by channel + spin + blend', () => {
    const model = makeModel();
    expect(ids(model.layers)).toEqual(['body|false|add', 'rays|false|add']);
    model.dispose();
  });

  it('resolves ready once every layer is baked', async () => {
    const model = makeModel();
    await model.ready;
    expect(model.layers.every((l) => l.source !== null)).toBe(true);
    expect(cacheSize()).toBeGreaterThanOrEqual(2);
    model.dispose();
  });

  it('rebuilds the layer set on update', async () => {
    const model = makeModel();
    await model.ready;

    model.update({
      shards: [{ id: 'extra', kind: 'fan', channel: 'extra', count: 3, size: 0.4 }],
    });
    expect(ids(model.layers)).toEqual(['body|false|add', 'extra|false|add', 'rays|false|add']);
    await model.ready;
    expect(model.layers.every((l) => l.source !== null)).toBe(true);

    model.update({ preset: null, shards: [] });
    expect(model.layers).toHaveLength(0);
    model.dispose();
  });

  it('emits frame values and combines manual set() with effects', () => {
    const model = makeModel({
      effects: [{ type: 'pulse', amount: 0.1, speed: 1, channels: ['main'] }],
    });
    const frames: number[] = [];
    model.onFrame((values) => frames.push(values.channel('main').scale));
    model.set({ channels: { main: { scale: 2 } } });
    model.tick(0.25);
    expect(frames.at(-1)).toBeCloseTo(2.2, 5);
    model.dispose();
  });

  it('is deterministic: the same config gives the same layer keys', async () => {
    const a = makeModel();
    const b = makeModel();
    await Promise.all([a.ready, b.ready]);
    expect(a.layers.map((l) => l.key)).toEqual(b.layers.map((l) => l.key));
    a.dispose();
    b.dispose();
  });

  it('inserting a shard does not change the other shards\u2019 layers', () => {
    const before = makeModel();
    const beforeKeys = new Map(before.layers.map((l) => [l.id, l.key]));
    before.dispose();

    const after = makeModel({
      shards: [{ id: 'extra', kind: 'fan', channel: 'extra', count: 3, size: 0.4 }],
    });
    for (const layer of after.layers) {
      if (layer.id === 'extra|false|add') continue;
      expect(layer.key).toBe(beforeKeys.get(layer.id));
    }
    after.dispose();
  });

  it('releases every cache reference on dispose', async () => {
    const model = makeModel();
    await model.ready;
    expect(cacheSize()).toBeGreaterThan(0);
    model.dispose();
    expect(cacheSize()).toBe(0);
  });

  it('cancels stale bakes so only the last one lands', async () => {
    const baker = createFakeBaker({ delayMs: 30 });
    const model = createLightModel({
      preset: 'star',
      resolution: 64,
      accepts: ['bitmap'],
      baker,
    });
    // Immediately change the look; the first bake set is cancelled.
    model.update({ preset: null, shards: [] });
    await waitFor(() => model.layers.length === 0);
    expect(model.layers).toHaveLength(0);
    model.dispose();
  });

  it('ignores explicitly-undefined options instead of clobbering defaults', () => {
    // Regression: the React adapter passes `baker: undefined`, which used to
    // wipe the default baker via object spread and crash on `baker.id`.
    expect(() =>
      createLightModel({
        preset: 'star',
        resolution: 64,
        accepts: ['bitmap'],
        baker: undefined,
        rayScale: undefined,
      }),
    ).not.toThrow();
  });
  it('does not poison a shared bake when a StrictMode-style remount disposes the first model', async () => {
    const baker = createFakeBaker({ delayMs: 20 });
    const first = createLightModel({
      preset: 'star',
      resolution: 64,
      accepts: ['bitmap'],
      baker,
    });
    // StrictMode unmounts right after mount, before the bake can finish.
    first.dispose();

    const second = createLightModel({
      preset: 'star',
      resolution: 64,
      accepts: ['bitmap'],
      baker,
    });
    await second.ready;
    expect(second.layers.length).toBeGreaterThan(0);
    expect(second.layers.every((layer) => layer.source !== null)).toBe(true);
    second.dispose();
  });
});

describe('definedOnly', () => {
  it('drops undefined but keeps null', () => {
    expect(definedOnly({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });
});
