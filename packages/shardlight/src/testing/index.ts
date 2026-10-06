/**
 * **shardlight/testing** — the adapter contract suite (plan §5, §11). Any
 * adapter (ours or a third party's) can run it against itself: add / replace /
 * remove / dispose, checking the adapter's host objects follow the model.
 */
import type {
  Baker,
  BakeOptions,
  LayerSource,
  Preset,
  ResolvedLayer,
  ShardInput,
} from '../core/index.js';

// ---------------------------------------------------------------------------
// A fake baker that needs no canvas, so tests run headlessly.
// ---------------------------------------------------------------------------

export interface FakeBakerOptions {
  id?: string;
  /** Delay before resolving, to exercise cancellation. */
  delayMs?: number;
}

export interface FakeBaker extends Baker {
  /** Layer keys that finished baking. */
  baked: string[];
  /** Layer keys that were cancelled before finishing. */
  cancelled: string[];
}

export function createFakeBaker(options: FakeBakerOptions = {}): FakeBaker {
  const baked: string[] = [];
  const cancelled: string[] = [];
  const delay = options.delayMs ?? 0;

  return {
    id: options.id ?? 'fake',
    baked,
    cancelled,
    async bake(
      layer: ResolvedLayer,
      opts: BakeOptions,
      signal: AbortSignal,
    ): Promise<LayerSource> {
      if (delay > 0) await sleep(delay);
      if (signal.aborted) {
        cancelled.push(layer.key);
        throw abortError();
      }
      baked.push(layer.key);
      if (opts.accept.includes('bitmap')) {
        return {
          type: 'bitmap',
          bitmap: {
            width: opts.resolution,
            height: opts.resolution,
            close() {},
          } as unknown as ImageBitmap,
        };
      }
      return {
        type: 'canvas',
        canvas: {
          width: opts.resolution,
          height: opts.resolution,
        } as unknown as HTMLCanvasElement,
      };
    },
  } as FakeBaker;
}

// ---------------------------------------------------------------------------
// Async helpers
// ---------------------------------------------------------------------------

export async function waitFor(
  condition: () => boolean,
  timeoutMs = 2000,
  intervalMs = 5,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('shardlight/testing: waitFor timed out');
    }
    await sleep(intervalMs);
  }
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface AdapterContractInstance {
  /** Ids of the host objects currently on screen (one per layer). */
  hostIds(): string[];
  update(patch: { preset?: Preset | null; shards?: ShardInput[] }): Promise<void>;
  dispose(): void;
}

export interface AdapterContract {
  name: string;
  create(config: { preset?: Preset | null; shards?: ShardInput[] }): Promise<AdapterContractInstance>;
}

/**
 * Drive an adapter through add / replace / remove / dispose and check its host
 * objects follow. Runs with a fake baker when the adapter uses the default.
 */
export async function runAdapterContract(contract: AdapterContract): Promise<void> {
  const adapter = await contract.create({ preset: 'star' });
  try {
    await waitFor(() => adapter.hostIds().length >= 2, 3000);
    const initial = adapter.hostIds();
    assert(initial.length >= 2, `${contract.name}: expected at least two layers for "star"`);

    // Add a shard on a brand-new channel => a brand-new layer / host object.
    await adapter.update({
      shards: [{ id: 'extra', kind: 'fan', channel: 'extra', count: 3, size: 0.4 }],
    });
    await waitFor(() => adapter.hostIds().some((id) => id.startsWith('extra|')), 3000);

    // Hide every preset shard => no layers left.
    await adapter.update({
      preset: null,
      shards: [],
    });
    await waitFor(() => adapter.hostIds().length === 0, 3000);
  } finally {
    adapter.dispose();
  }

  assert(adapter.hostIds().length === 0, `${contract.name}: hosts not cleared on dispose`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}
