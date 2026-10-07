import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvas2dBaker } from '../src/core/bake/canvas2d.js';
import { defineShardKind, registerShardKind, unregisterShardKind } from '../src/core/index.js';
import type { ResolvedLayer } from '../src/core/config/types.js';

/** A recording 2D context, good enough for the baker's own calls. */
function fakeContext(): CanvasRenderingContext2D {
  return {
    filter: '',
    globalCompositeOperation: '',
    fillStyle: '',
    clearRect() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    drawImage() {},
    beginPath() {},
    arc() {},
    fill() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
  } as unknown as CanvasRenderingContext2D;
}

const originalOffscreen = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;

function installFakeCanvas(): void {
  const context = fakeContext();
  class FakeOffscreenCanvas {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext(): CanvasRenderingContext2D {
      return context;
    }
  }
  (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = FakeOffscreenCanvas;
}

afterEach(() => {
  (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = originalOffscreen;
  unregisterShardKind('boom-test');
});

describe('canvas2dBaker', () => {
  it('warns and keeps baking when a custom kind throws', async () => {
    registerShardKind(
      defineShardKind({
        kind: 'boom-test',
        params: {},
        draw() {
          throw new Error('kaboom');
        },
      }) as never,
    );
    installFakeCanvas();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layer = {
      key: 'layer',
      id: 'body|add',
      channel: 'body',
      blend: 'add',
      color: '#ffffff',
      rotation: 0,
      seed: 1,
      shards: [
        {
          id: 'boom',
          kind: 'boom-test',
          visible: true,
          channel: 'body',
          blend: 'add',
          color: '#ffffff',
          seed: 1,
          params: {},
        },
      ],
    } as unknown as ResolvedLayer;

    const source = await canvas2dBaker.bake(
      layer,
      { resolution: 64, rayScale: 1, accept: ['canvas'] },
      new AbortController().signal,
    );

    expect(source.type).toBe('canvas');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('"boom"');
    expect(warn.mock.calls[0]?.[0]).toContain('boom-test');
    warn.mockRestore();
  });
});
