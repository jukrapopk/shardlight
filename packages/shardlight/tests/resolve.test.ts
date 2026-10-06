import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../src/core/index.js';

describe('resolveConfig merge rules (§4.5)', () => {
  it('uses the default preset (star) when none is given', () => {
    const light = resolveConfig({});
    expect(light.version).toBe(1);
    expect(light.color).toBe('#FFF4E0');
    expect(light.shards.map((s) => s.id)).toEqual(['bloom', 'hotspot', 'beam', 'ring']);
  });

  it('uses a named preset as-is', () => {
    const light = resolveConfig({ preset: 'sun' });
    expect(light.shards).toHaveLength(4);
    expect(light.shards[0]!.id).toBe('bloom');
  });

  it('preset: null starts empty', () => {
    const light = resolveConfig({ preset: null });
    expect(light.shards).toEqual([]);
  });

  it('overrides a preset shard by id without needing kind', () => {
    const light = resolveConfig({
      preset: 'star',
      shards: [{ id: 'beam', strength: 0.9, size: 1.1 }],
    });
    const beam = light.shards.find((s) => s.id === 'beam')!;
    expect(beam.kind).toBe('fan');
    expect(beam.params.strength).toBe(0.9);
    expect(beam.params.size).toBe(1.1);
    // Untouched params keep the preset value.
    expect(beam.params.count).toBe(4);
  });

  it('adds a full shard whose id matches nothing', () => {
    const light = resolveConfig({
      preset: 'star',
      shards: [{ id: 'glint', kind: 'fan', count: 5, channel: 'glint' }],
    });
    const glint = light.shards.find((s) => s.id === 'glint')!;
    expect(glint.channel).toBe('glint');
    expect(glint.params.count).toBe(5);
    expect(light.shards).toHaveLength(5);
  });

  it('skips an override with no kind whose id matches nothing', () => {
    const light = resolveConfig({
      preset: 'star',
      shards: [{ id: 'ghost', strength: 1 }],
    });
    expect(light.shards.find((s) => s.id === 'ghost')).toBeUndefined();
    expect(light.shards).toHaveLength(4);
  });
});

describe('defaults and clamping (§4.1)', () => {
  it('fills kind defaults', () => {
    const light = resolveConfig({ preset: null, shards: [{ id: 'x', kind: 'fan' }] });
    const x = light.shards[0]!;
    expect(x.params.count).toBe(4);
    expect(x.params.width).toBe(4);
    expect(x.params.taper).toBe(1);
  });

  it('clamps values outside min/max', () => {
    const light = resolveConfig({
      preset: null,
      shards: [{ id: 'x', kind: 'blob', strength: 5, falloff: 0 }],
    });
    const x = light.shards[0]!;
    expect(x.params.strength).toBe(2);
    expect(x.params.falloff).toBe(0.1);
  });

  it('skips unknown kinds and effects', () => {
    const light = resolveConfig({
      preset: null,
      shards: [{ id: 'x', kind: 'nope' }],
      effects: [{ type: 'nope' }],
    });
    expect(light.shards).toHaveLength(0);
    expect(light.effects).toHaveLength(0);
  });

  it('falls back to the default preset for an unknown preset name', () => {
    const light = resolveConfig({ preset: 'does-not-exist' });
    expect(light.shards.map((s) => s.id)).toEqual(['bloom', 'hotspot', 'beam', 'ring']);
  });

  it('measures relativeTo angles from the target shard', () => {
    const light = resolveConfig({
      preset: null,
      shards: [
        { id: 'a', kind: 'fan', angle: 30 },
        { id: 'b', kind: 'fan', angle: 10, relativeTo: 'a' },
      ],
    });
    expect(light.shards[0]!.params.angle).toBe(30);
    expect(light.shards[1]!.params.angle).toBe(40);
  });

  it('lets explicit options and config win over the preset', () => {
    const light = resolveConfig({
      preset: 'star',
      config: { color: '#123456', rotation: 10 },
      color: '#abcdef',
    });
    expect(light.color).toBe('#abcdef');
    expect(light.rotation).toBe(10);
  });
});
