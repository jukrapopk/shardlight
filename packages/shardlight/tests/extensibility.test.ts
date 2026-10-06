import { afterEach, describe, expect, it } from 'vitest';
import {
  computeFrame,
  defineEffect,
  defineShardKind,
  registerEffect,
  registerPreset,
  registerShardKind,
  resolveConfig,
  unregisterEffect,
  unregisterPreset,
  unregisterShardKind,
} from '../src/core/index.js';

describe('extensibility from outside the package', () => {
  afterEach(() => {
    unregisterShardKind('dots');
    unregisterEffect('sway');
    unregisterPreset('neon');
  });

  it('registers a custom kind and resolves its defaults', () => {
    const dots = defineShardKind({
      kind: 'dots',
      label: 'Ring of dots',
      params: {
        count: { type: 'number', default: 12, min: 1, max: 64, step: 1 },
        size: { type: 'number', default: 0.5, min: 0, max: 2 },
      },
      draw() {},
    });
    registerShardKind(dots as never);

    const light = resolveConfig({
      preset: null,
      shards: [{ id: 'crown', kind: 'dots', count: 8 }],
    });
    const crown = light.shards.find((s) => s.id === 'crown')!;
    expect(crown.params.count).toBe(8);
    expect(crown.params.size).toBe(0.5);
  });

  it('registers a custom effect and runs it', () => {
    const sway = defineEffect({
      name: 'sway',
      params: { amount: { type: 'number', default: 0.5, min: 0, max: 1 } },
      apply(t, p, out) {
        out.channel('main').scale += p.amount * t;
      },
    });
    registerEffect(sway as never);

    const light = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'sway' }],
    });
    expect(light.effects[0]!.amount).toBe(0.5);
    const frame = computeFrame({}, light.effects, 2);
    expect(frame.channel('main').scale).toBeCloseTo(2, 5);
  });

  it('registers a custom preset by name', () => {
    registerPreset('neon', {
      version: 1,
      color: '#00ff00',
      rotation: 0,
      seed: 1,
      shards: [{ id: 'bloom', kind: 'blob', channel: 'body' }],
    });
    const light = resolveConfig({ preset: 'neon' });
    expect(light.color).toBe('#00ff00');
    expect(light.shards).toHaveLength(1);
  });
});
