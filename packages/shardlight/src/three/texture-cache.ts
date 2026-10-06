import * as THREE from 'three';
import type { LayerSource } from '../core/index.js';

/**
 * Instance-shared, ref-counted textures (plan §7.1). Every light with the same
 * baked layer reuses one texture; each light still gets its own material, so
 * opacity can fade per instance. Textures are disposed when their last user is.
 */
interface Entry {
  texture: THREE.Texture;
  refs: number;
}

const cache = new Map<string, Entry>();

export function acquireTexture(key: string, source: LayerSource): THREE.Texture {
  const existing = cache.get(key);
  if (existing) {
    existing.refs += 1;
    return existing.texture;
  }
  const texture = createTexture(source);
  cache.set(key, { texture, refs: 1 });
  return texture;
}

export function releaseTexture(key: string): void {
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    cache.delete(key);
    entry.texture.dispose();
  }
}

/** Live texture count; used by the memory tests. */
export function textureCacheSize(): number {
  return cache.size;
}

export function clearTextureCache(): void {
  for (const entry of cache.values()) entry.texture.dispose();
  cache.clear();
}

function createTexture(source: LayerSource): THREE.Texture {
  if (source.type === 'bitmap') {
    const texture = new THREE.Texture(source.bitmap as unknown as HTMLImageElement);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  if (source.type === 'canvas') {
    const texture = new THREE.CanvasTexture(source.canvas as HTMLCanvasElement);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }
  // 'url': three has to load it; only used if an adapter requests url sources.
  const texture = new THREE.TextureLoader().load(source.url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
