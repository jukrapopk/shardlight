import { describe, expect, it } from 'vitest';
import { computeFrame, migrateConfig, resolveConfig } from '../src/core/index.js';

describe('built-in effects', () => {
  it('pulse multiplies a channel scale', () => {
    const effects = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'pulse', amount: 0.1, speed: 1, channels: ['main'] }],
    }).effects;
    const quarter = computeFrame({}, effects, 0.25);
    expect(quarter.channel('main').scale).toBeCloseTo(1.1, 5);
    const threeQuarter = computeFrame({}, effects, 0.75);
    expect(threeQuarter.channel('main').scale).toBeCloseTo(0.9, 5);
  });

  it('flicker multiplies opacity and defaults to all channels', () => {
    const effects = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'flicker', amount: 0.15, speed: 1 }],
    }).effects;
    const frame = computeFrame({}, effects, 0, ['a', 'b']);
    const s = 0;
    const expected = 1 - 0.15 * (0.5 + 0.25 * Math.sin(11.3 * s) + 0.25 * Math.sin(17.9 * s + 1.7));
    expect(frame.channel('a').opacity).toBeCloseTo(expected, 5);
    expect(frame.channel('b').opacity).toBeCloseTo(expected, 5);
  });

  it('composes several effects multiplicatively with manual values', () => {
    const effects = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'pulse', amount: 0.1, speed: 1, channels: ['main'] }],
    }).effects;
    const frame = computeFrame({ channels: { main: { scale: 2 } } }, effects, 0.25);
    expect(frame.channel('main').scale).toBeCloseTo(2.2, 5);
  });
});

describe('migration', () => {
  it('is a no-op for current configs', () => {
    const config = resolveConfig({ preset: 'star' });
    const migrated = migrateConfig(config);
    expect(migrated.version).toBe(1);
  });

  it('adds a version when missing', () => {
    const migrated = migrateConfig({ color: '#fff', rotation: 0, seed: 1, shards: [] });
    expect(migrated.version).toBe(1);
  });

  it('leaves a future version alone rather than throwing', () => {
    const migrated = migrateConfig({ version: 99, color: '#fff', shards: [] });
    expect((migrated as unknown as { version: number }).version).toBe(99);
  });
});
