import { describe, expect, it } from 'vitest';
import { autoResolution, measuredEdge } from '../src/react/resolution.js';

describe('autoResolution', () => {
  it('uses a measured edge over the declared size', () => {
    expect(autoResolution('100%', 512)).toBe(512);
  });

  it('falls back to a numeric size when nothing was measured', () => {
    expect(autoResolution(300)).toBe(300);
  });

  it('falls back to 256 for a string size with no measurement', () => {
    expect(autoResolution('100%')).toBe(256);
  });

  it('ignores a zero measurement', () => {
    expect(autoResolution(200, 0)).toBe(200);
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
