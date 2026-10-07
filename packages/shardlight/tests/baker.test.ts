import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvas2dBaker } from '../src/core/bake/canvas2d.js';
import { defineShardKind, registerShardKind, unregisterShardKind } from '../src/core/index.js';
import type { ResolvedLayer } from '../src/core/config/types.js';

/**
 * A recording 2D context that models the state the baker's reuse relies on:
 * a save/restore stack, the current transform, the composite operation and
 * `reset()`. It does not rasterise; it only records state so a test can assert
 * what a shard's `draw` sees.
 */
class FakeContext2D {
  transform = [1, 0, 0, 1, 0, 0];
  globalCompositeOperation = 'source-over';
  filter = 'none';
  globalAlpha = 1;
  fillStyle = '#000000';
  strokeStyle = '#000000';

  private readonly stack: Array<Partial<FakeContext2D>> = [];

  save(): void {
    this.stack.push({
      transform: [...this.transform],
      globalCompositeOperation: this.globalCompositeOperation,
      filter: this.filter,
      globalAlpha: this.globalAlpha,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
    });
  }

  restore(): void {
    const saved = this.stack.pop();
    if (saved) Object.assign(this, saved);
  }

  reset(): void {
    this.stack.length = 0;
    this.transform = [1, 0, 0, 1, 0, 0];
    this.globalCompositeOperation = 'source-over';
    this.filter = 'none';
    this.globalAlpha = 1;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.transform = [a, b, c, d, e, f];
  }

  translate(x: number, y: number): void {
    const [a, b, c, d, e, f] = this.transform;
    this.transform = [a, b, c, d, e + x * a + y * c, f + x * b + y * d];
  }

  rotate(angle: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [a, b, c, d, e, f] = this.transform;
    this.transform = [
      a * cos + c * sin,
      b * cos + d * sin,
      -a * sin + c * cos,
      -b * sin + d * cos,
      e,
      f,
    ];
  }

  clearRect(): void {}
  drawImage(): void {}
  beginPath(): void {}
  arc(): void {}
  fill(): void {}
  createRadialGradient(): { addColorStop(): void } {
    return { addColorStop() {} };
  }
  createLinearGradient(): { addColorStop(): void } {
    return { addColorStop() {} };
  }
}

const originalOffscreen = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;

/** Every canvas gets its own context, as the real API does. */
function installFakeCanvas(): void {
  class FakeOffscreenCanvas {
    width: number;
    height: number;
    private readonly context = new FakeContext2D();
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext(): FakeContext2D {
      return this.context;
    }
  }
  (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = FakeOffscreenCanvas;
}

function baseLayer(shards: ResolvedLayer['shards']): ResolvedLayer {
  return {
    key: 'layer',
    id: 'body|add',
    channel: 'body',
    blend: 'add',
    color: '#ffffff',
    rotation: 0,
    seed: 1,
    shards,
  } as unknown as ResolvedLayer;
}

function shard(id: string, kind: string): ResolvedLayer['shards'][number] {
  return {
    id,
    kind,
    visible: true,
    channel: 'body',
    blend: 'add',
    color: '#ffffff',
    seed: 1,
    params: {},
  } as unknown as ResolvedLayer['shards'][number];
}

const BAKE = { resolution: 64, rayScale: 1, accept: ['canvas'] as const };

afterEach(() => {
  (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = originalOffscreen;
  unregisterShardKind('boom-test');
  unregisterShardKind('leaky-test');
  unregisterShardKind('probe-test');
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
    const source = await canvas2dBaker.bake(
      baseLayer([shard('boom', 'boom-test')]),
      { ...BAKE, accept: ['canvas'] },
      new AbortController().signal,
    );

    expect(source.type).toBe('canvas');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('"boom"');
    expect(warn.mock.calls[0]?.[0]).toContain('boom-test');
    warn.mockRestore();
  });

  it('gives every shard a clean context, even after one leaks state and throws', async () => {
    registerShardKind(
      defineShardKind({
        kind: 'leaky-test',
        params: {},
        draw(ctx) {
          // Move and switch to destination-out, then save *that* as the
          // innermost snapshot, then throw without restoring. A naive single
          // restore() would leave this state in place for the next shard.
          ctx.translate(50, 50);
          ctx.globalCompositeOperation = 'destination-out';
          ctx.save();
          throw new Error('leaky');
        },
      }) as never,
    );
    const seen: Array<{ transform: number[]; gco: string }> = [];
    registerShardKind(
      defineShardKind({
        kind: 'probe-test',
        params: {},
        draw(ctx) {
          seen.push({
            transform: [...(ctx as unknown as FakeContext2D).transform],
            gco: ctx.globalCompositeOperation,
          });
        },
      }) as never,
    );
    installFakeCanvas();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await canvas2dBaker.bake(
      baseLayer([shard('leak', 'leaky-test'), shard('probe', 'probe-test')]),
      { ...BAKE, accept: ['canvas'] },
      new AbortController().signal,
    );

    expect(seen).toHaveLength(1);
    // The probe runs centred (translate by unit = 32) with source-over — not
    // the leaky shard's extra translate(50,50) or its destination-out.
    expect(seen[0]?.transform).toEqual([1, 0, 0, 1, 32, 32]);
    expect(seen[0]?.gco).toBe('source-over');
    warn.mockRestore();
  });
});
