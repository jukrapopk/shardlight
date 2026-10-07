export type Target = 'dom' | 'three' | 'r3f';

export interface RenderOptions {
  target: Target;
  /** Preset name, or null for an empty light. */
  preset?: string | null;
  /** Partial config merged over the preset (for controlled tests). */
  config?: Record<string, unknown>;
  /** Effects passed as the `effects` prop (the adapter's prop wins over config). */
  effects?: Record<string, unknown>[];
  /** Pixel size of the square stage. */
  size?: number;
  /** Bake resolution. */
  resolution?: number;
}

export interface Harness {
  /** Render a target into #stage; resolves once it is ready and painted. */
  render(options: RenderOptions): Promise<void>;
  /** Tear the current render down. */
  dispose(): void;
}

declare global {
  interface Window {
    __harness: Harness;
  }
}
