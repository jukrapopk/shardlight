import { describe, expect, it, vi } from 'vitest';
import { createTicker } from '../src/react/ticker.js';

/** Replace rAF with a controllable queue and return a flusher. */
function installRaf() {
  let next = 0;
  const queue = new Map<number, FrameRequestCallback>();
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;

  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const id = ++next;
    queue.set(id, callback);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    queue.delete(id);
  }) as typeof cancelAnimationFrame;

  return {
    get pending(): number {
      return queue.size;
    },
    flush(now: number): void {
      const callbacks = [...queue.values()];
      queue.clear();
      for (const callback of callbacks) callback(now);
    },
    restore(): void {
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancel;
    },
  };
}

describe('createTicker', () => {
  it('drives every subscriber from one loop and stops when idle', () => {
    const raf = installRaf();
    try {
      const ticker = createTicker();
      const a = vi.fn();
      const b = vi.fn();
      const unsubscribeA = ticker.subscribe(a);
      const unsubscribeB = ticker.subscribe(b);

      // One shared frame, not one per subscriber.
      expect(raf.pending).toBe(1);

      raf.flush(16);
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
      expect(a).toHaveBeenLastCalledWith(0);

      raf.flush(32);
      expect(a).toHaveBeenCalledTimes(2);
      expect(a.mock.calls[1]?.[0]).toBeCloseTo(0.016, 5);

      unsubscribeB();
      raf.flush(48);
      expect(a).toHaveBeenCalledTimes(3);
      expect(b).toHaveBeenCalledTimes(2);

      unsubscribeA();
      expect(raf.pending).toBe(0);
    } finally {
      raf.restore();
    }
  });
});
