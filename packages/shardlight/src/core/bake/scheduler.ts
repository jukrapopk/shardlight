/**
 * Runs bakes one layer per task, yielding between them, so a big light never
 * blocks a frame and stale bakes never finish.
 */
export interface Scheduler {
  run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T>;
  /** Drop everything still queued (does not cancel the running task). */
  clear(): void;
}

export interface SchedulerOptions {
  /** Delay between tasks, in ms. 0 (a macrotask) still yields. */
  yieldDelay?: number;
}

export function createScheduler(options: SchedulerOptions = {}): Scheduler {
  const delay = options.yieldDelay ?? 0;
  interface Item {
    task: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
    signal?: AbortSignal;
  }
  const queue: Item[] = [];
  let running = false;

  async function pump(): Promise<void> {
    if (running) return;
    running = true;
    try {
      while (queue.length > 0) {
        const item = queue.shift()!;
        if (item.signal?.aborted) {
          item.reject(abortError());
          continue;
        }
        try {
          item.resolve(await item.task());
        } catch (error) {
          item.reject(error);
        }
        if (queue.length > 0) await sleep(delay);
      }
    } finally {
      running = false;
    }
  }

  return {
    run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({
          task: task as () => Promise<unknown>,
          resolve: resolve as (value: unknown) => void,
          reject,
          signal,
        });
        void pump();
      });
    },
    clear(): void {
      queue.length = 0;
    },
  };
}

export function abortError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Aborted', 'AbortError');
  }
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
