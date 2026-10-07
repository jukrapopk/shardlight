import { afterEach, describe, expect, it } from 'vitest';
import {
  cacheSize,
  clearCache,
  createLightModel,
  defineEffect,
  definedOnly,
  NullContextError,
  registerEffect,
  unregisterEffect,
  type Baker,
  type FrameValues,
  type Layer,
} from '../src/core/index.js';
import { createFakeBaker, waitFor } from '../src/testing/index.js';

afterEach(() => {
  clearCache();
  unregisterEffect('sway-test');
});

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

describe('createLightModel', () => {
  it('groups shards into layers by channel + blend', () => {
    const model = makeModel();
    expect(ids(model.layers)).toEqual(['body|add', 'rays|add']);
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
    expect(ids(model.layers)).toEqual(['body|add', 'extra|add', 'rays|add']);
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

  it('spins a per-shard motion shard and eases hover', () => {
    const model = makeModel({ shards: [{ id: 'beam', spin: 0.25, hover: { scale: 2 } }] });
    // 'beam' splits out of 'rays'; 'ring' stays.
    expect(ids(model.layers)).toEqual(['beam|add', 'body|add', 'rays|add']);

    const frames: FrameValues[] = [];
    model.onFrame((values) => frames.push(values));

    model.tick(1);
    expect(frames.at(-1)!.channel('beam').rotation).toBeCloseTo(90, 3);
    expect(frames.at(-1)!.hover).toBe(0);

    model.setHover(true);
    model.tick(1);
    const hovered = frames.at(-1)!;
    expect(hovered.hover).toBeGreaterThan(0.9);
    expect(hovered.channel('beam').rotation).toBeCloseTo(180, 3);
    expect(hovered.channel('beam').scale).toBeCloseTo(1 + hovered.hover, 3);

    model.setHover(false);
    model.tick(2);
    expect(frames.at(-1)!.hover).toBeLessThan(0.01);
    model.dispose();
  });

  it('winds a hover spin up while hovered and holds it after', () => {
    const model = makeModel({ shards: [{ id: 'beam', hover: { spin: 0.25 } }] });
    const frames: FrameValues[] = [];
    model.onFrame((values) => frames.push(values));

    model.setHover(true);
    model.tick(1);
    const spun = frames.at(-1)!.channel('beam').rotation;
    expect(spun).toBeGreaterThan(0);

    model.tick(1);
    const more = frames.at(-1)!.channel('beam').rotation;
    expect(more).toBeGreaterThan(spun);

    // Hover out: the banked angle stops growing once the ease reaches 0.
    model.setHover(false);
    model.tick(5);
    const settled = frames.at(-1)!.channel('beam').rotation;
    model.tick(1);
    expect(frames.at(-1)!.channel('beam').rotation).toBeCloseTo(settled, 5);
    model.dispose();
  });

  it('collapses on click and expands again', () => {
    const model = makeModel({ shards: [{ id: 'beam', collapse: true }] });
    const frames: FrameValues[] = [];
    model.onFrame((values) => frames.push(values));
    expect(frames.at(-1)!.channel('beam').scale).toBeCloseTo(1, 5);

    model.toggleCollapsed();
    model.tick(2);
    expect(frames.at(-1)!.collapse).toBeGreaterThan(0.9);
    expect(frames.at(-1)!.channel('beam').scale).toBeLessThan(0.1);

    model.toggleCollapsed();
    model.tick(2);
    expect(frames.at(-1)!.collapse).toBeLessThan(0.1);
    expect(frames.at(-1)!.channel('beam').scale).toBeGreaterThan(0.9);
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
      if (layer.id === 'extra|add') continue;
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

  it('reports itself idle when there is nothing to animate', () => {
    const model = makeModel();
    expect(model.animating).toBe(false);
    model.dispose();
  });

  it('reports active while a continuous effect runs, and stops when it is removed', () => {
    const model = makeModel({ effects: [{ type: 'spin', speed: 0.2, channels: ['main'] }] });
    expect(model.animating).toBe(true);
    model.update({ effects: [] });
    expect(model.animating).toBe(false);
    model.dispose();
  });

  it('treats an effect with no flag as time-driven, so custom effects animate', () => {
    registerEffect(
      defineEffect({
        name: 'sway-test',
        params: {},
        apply(t, _p, out) {
          out.channel('body').rotation += t;
        },
      }) as never,
    );
    const model = makeModel({ effects: [{ type: 'sway-test', channels: ['body'] }] });
    expect(model.animating).toBe(true);
    model.dispose();
  });

  it('reports active only while hover easing is in flight', () => {
    const model = makeModel({ shards: [{ id: 'beam', hover: { scale: 2 } }], hoverEase: 0.1 });
    const seen: boolean[] = [];
    model.onActivity((active) => seen.push(active));
    expect(model.animating).toBe(false);

    model.setHover(true);
    expect(model.animating).toBe(true);
    for (let i = 0; i < 500 && model.animating; i += 1) model.tick(0.05);
    expect(model.animating).toBe(false);

    expect(seen).toEqual([false, true, false]);
    model.dispose();
  });

  it('stays active while a hovered shard winds its spin', () => {
    const model = makeModel({ shards: [{ id: 'beam', hover: { spin: 0.25 } }], hoverEase: 0.1 });
    model.setHover(true);
    for (let i = 0; i < 500 && model.animating; i += 1) model.tick(0.05);
    // Hover has settled, but the spin keeps winding while the pointer rests.
    expect(model.animating).toBe(true);

    model.setHover(false);
    for (let i = 0; i < 500 && model.animating; i += 1) model.tick(0.05);
    expect(model.animating).toBe(false);
    model.dispose();
  });

  it('re-bakes a failed layer on the next update', async () => {
    const errors: unknown[] = [];
    let calls = 0;
    const flaky: Baker = {
      id: 'flaky',
      async bake() {
        calls += 1;
        if (calls === 1) throw new NullContextError();
        return {
          type: 'bitmap',
          bitmap: { width: 64, height: 64, close() {} } as unknown as ImageBitmap,
        };
      },
    };
    const model = createLightModel({
      preset: 'star',
      resolution: 64,
      accepts: ['bitmap'],
      baker: flaky,
      onError: (error) => errors.push(error),
    });

    await waitFor(() => errors.length === 1);
    // The failed layer is still pending: no source, and `ready` has not resolved.
    expect(model.layers.some((layer) => layer.source === null)).toBe(true);

    // A later update retries it instead of being skipped by the acquisition.
    model.update({});
    await model.ready;
    expect(model.layers.every((layer) => layer.source !== null)).toBe(true);
    expect(errors).toHaveLength(1);
    model.dispose();
  });
});

describe('definedOnly', () => {
  it('drops undefined but keeps null', () => {
    expect(definedOnly({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });
});
