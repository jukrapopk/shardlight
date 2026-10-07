export interface Ticker {
  /** Run `callback(dt)` each frame; returns an unsubscribe. */
  subscribe(callback: (dt: number) => void): () => void;
}

/**
 * A shared `requestAnimationFrame` loop. Every DOM light subscribes to one
 * instance instead of running its own loop, so idle and offscreen lights cost
 * nothing. The loop stops when the last subscriber leaves and while the tab is
 * hidden.
 */
export function createTicker(): Ticker {
  const callbacks = new Set<(dt: number) => void>();
  let raf = 0;
  let last = 0;
  let listening = false;

  const hidden = (): boolean =>
    typeof document !== 'undefined' && document.visibilityState === 'hidden';

  const step = (now: number): void => {
    const dt = last === 0 ? 0 : (now - last) / 1000;
    last = now;
    for (const callback of [...callbacks]) callback(dt);
    raf = requestAnimationFrame(step);
  };

  const start = (): void => {
    if (raf !== 0 || callbacks.size === 0 || hidden()) return;
    last = 0;
    raf = requestAnimationFrame(step);
  };

  const stop = (): void => {
    if (raf === 0) return;
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const onVisibility = (): void => {
    if (hidden()) stop();
    else start();
  };

  return {
    subscribe(callback) {
      callbacks.add(callback);
      if (callbacks.size === 1 && !listening && typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibility);
        listening = true;
      }
      start();
      return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) stop();
      };
    },
  };
}

/** The process-wide animation loop shared by every DOM light. */
export const sharedTicker: Ticker = createTicker();
