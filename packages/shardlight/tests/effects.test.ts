import { describe, expect, it } from 'vitest';
import { collapseTrigger, computeFrame, migrateConfig, resolveConfig } from '../src/core/index.js';

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

  it('spin adds rotation to a channel', () => {
    const effects = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'spin', speed: 0.25, channels: ['rays'] }],
    }).effects;
    // 0.25 turns/s → 90° after one second.
    expect(computeFrame({}, effects, 1).channel('rays').rotation).toBeCloseTo(90, 5);
  });

  it('hover scales, fades and turns by the hover amount', () => {
    const effects = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'hover', channels: ['main'], scale: 1.5, opacity: 2, rotate: 30 }],
    }).effects;
    expect(computeFrame({ hover: 0 }, effects, 0).channel('main')).toMatchObject({
      scale: 1,
      opacity: 1,
      rotation: 0,
    });
    const half = computeFrame({ hover: 0.5 }, effects, 0).channel('main');
    expect(half.scale).toBeCloseTo(1.25, 5);
    expect(half.opacity).toBeCloseTo(1.5, 5);
    expect(half.rotation).toBeCloseTo(15, 5);
  });

  it('hover spins by the time banked while hovered', () => {
    const effects = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'hover', channels: ['rays'], spin: 0.5 }],
    }).effects;
    // 0.5 s of full hover at 0.5 turns/s → 90°.
    expect(
      computeFrame({ hover: 1, hoverTime: 0.5 }, effects, 0).channel('rays').rotation,
    ).toBeCloseTo(90, 5);
    // Banked angle is kept once hovered out.
    expect(
      computeFrame({ hover: 0, hoverTime: 0.5 }, effects, 0).channel('rays').rotation,
    ).toBeCloseTo(90, 5);
  });

  it('collapse shrinks and fades by the collapsed amount', () => {
    const effects = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'collapse', channels: ['main'], scale: 0, opacity: 0.5 }],
    }).effects;
    const open = computeFrame({ collapse: 0 }, effects, 0).channel('main');
    expect(open).toMatchObject({ scale: 1, opacity: 1 });
    const half = computeFrame({ collapse: 0.5 }, effects, 0).channel('main');
    expect(half.scale).toBeCloseTo(0.5, 5);
    expect(half.opacity).toBeCloseTo(0.75, 5);
    const shut = computeFrame({ collapse: 1 }, effects, 0).channel('main');
    expect(shut.scale).toBeCloseTo(0, 5);
    expect(shut.opacity).toBeCloseTo(0.5, 5);
  });

  it('collapse defaults to every channel', () => {
    const effects = resolveConfig({
      preset: null,
      shards: [],
      effects: [{ type: 'collapse' }],
    }).effects;
    const frame = computeFrame({ collapse: 1 }, effects, 0, ['a', 'b']);
    expect(frame.channel('a').scale).toBeCloseTo(0, 5);
    expect(frame.channel('b').scale).toBeCloseTo(0, 5);
  });

  it('collapse trigger picks the click behavior', () => {
    const effects = (trigger?: string) =>
      resolveConfig({
        preset: null,
        shards: [],
        effects: [{ type: 'collapse', ...(trigger ? { trigger } : {}) }],
      }).effects;

    expect(effects()[0]!.trigger).toBe('click');
    expect(collapseTrigger(effects())).toBe('click');
    expect(collapseTrigger(effects('once'))).toBe('once');
    expect(collapseTrigger(effects('none'))).toBe('none');
    expect(collapseTrigger([])).toBe('none');
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
