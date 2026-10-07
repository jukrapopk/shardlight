import { describe, expect, it } from 'vitest';
import { autoResolution, measuredEdge } from '../src/react/resolution.js';

describe('autoResolution', () => {
  it('uses a measured edge over the declared size', () => {
    expect(autoResolution('100%', 512)).toBe(512);
    expect(autoResolution(256, 900)).toBe(1024);
  });

  it('quantises to the nearest power of two', () => {
    expect(autoResolution(200)).toBe(256);
    expect(autoResolution(300)).toBe(256);
    expect(autoResolution(400)).toBe(512);
    expect(autoResolution(900)).toBe(1024);
  });

  it('keeps sizes within a step stable, so a resize rarely re-bakes', () => {
    expect(autoResolution(256)).toBe(256);
    expect(autoResolution(300)).toBe(256);
    expect(autoResolution(320)).toBe(256);
  });

  it('falls back to 256 for a string size with no measurement', () => {
    expect(autoResolution('100%')).toBe(256);
  });

  it('ignores a zero measurement', () => {
    expect(autoResolution(200, 0)).toBe(256);
  });

  it('clamps to a minimum of 64', () => {
    expect(autoResolution(10)).toBe(64);
  });
});

describe('measuredEdge', () => {
  it('reads the larger of width and height', () => {
    expect(measuredEdge({ getBoundingClientRect: () => ({ width: 0, height: 400 }) })).toBe(400);
  });

  it('returns undefined when there is nothing to measure', () => {
    expect(
      measuredEdge({ getBoundingClientRect: () => ({ width: 0, height: 0 }) }),
    ).toBeUndefined();
    expect(measuredEdge(null)).toBeUndefined();
  });
});
