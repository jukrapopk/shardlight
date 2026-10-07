import { isLowMemoryDevice } from '../core/index.js';

/** Lower/upper bounds for the auto bake resolution. */
const MIN_EDGE = 64;
const LOW_MEMORY_CAP = 1024;
const CAP = 2048;

/**
 * Round to the nearest power of two. `autoResolution` quantises to these so a
 * resize only re-bakes when it crosses a step (and few cache keys are created).
 */
function nearestPowerOfTwo(value: number): number {
  return 2 ** Math.round(Math.log2(value));
}

/**
 * The bake resolution for `resolution: 'auto'`: the rendered edge in CSS px ×
 * DPR, quantised to a power of two and capped. Prefers a measured edge (so
 * string sizes and resizes work), falling back to a numeric `size`, then to 256
 * when nothing is laid out yet (SSR / first paint).
 */
export function autoResolution(size: number | string, measured?: number): number {
  const edge = measured && measured > 0 ? measured : typeof size === 'number' ? size : 256;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const cap = isLowMemoryDevice() ? LOW_MEMORY_CAP : CAP;
  const wanted = Math.max(MIN_EDGE, Math.min(cap, edge * dpr));
  return Math.min(cap, Math.max(MIN_EDGE, nearestPowerOfTwo(wanted)));
}

/** The rendered edge of an element in CSS px, or `undefined` if not laid out. */
export function measuredEdge(
  node: { getBoundingClientRect(): { width: number; height: number } } | null,
): number | undefined {
  if (!node) return undefined;
  const rect = node.getBoundingClientRect();
  const edge = rect.width || rect.height;
  return edge > 0 ? edge : undefined;
}
