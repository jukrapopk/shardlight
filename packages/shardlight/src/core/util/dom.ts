/** Environment helpers shared by the bakers and adapters. */

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type AnyCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/** Create a canvas of the best available flavour for the current host. */
export function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  // No canvas host (SSR / unit tests). The caller treats a missing context as
  // a non-fatal "try again later" (plan §8).
  throw new Error('shardlight: no canvas implementation available in this environment');
}

export function get2dContext(canvas: AnyCanvas): AnyCanvasContext | null {
  try {
    return canvas.getContext('2d') as AnyCanvasContext | null;
  } catch {
    return null;
  }
}

/**
 * Free a scratch canvas immediately rather than waiting for the GC (plan §8).
 * Setting both dimensions to 0 releases the backing store in browsers.
 */
export function freeCanvas(canvas: AnyCanvas): void {
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    /* ignore */
  }
}

export function canvasToBlob(canvas: AnyCanvas): Promise<Blob> {
  if (typeof (canvas as OffscreenCanvas).convertToBlob === 'function') {
    return (canvas as OffscreenCanvas).convertToBlob({ type: 'image/png' });
  }
  const el = canvas as HTMLCanvasElement;
  return new Promise((resolve, reject) => {
    el.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('shardlight: canvas.toBlob returned null'));
    }, 'image/png');
  });
}

export function isLowMemoryDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === 'number') return nav.deviceMemory <= 2;
  return false;
}
