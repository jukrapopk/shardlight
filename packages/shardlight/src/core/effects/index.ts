import { registerEffect } from './registry.js';
import { pulse } from './pulse.js';
import { flicker } from './flicker.js';
import { spin } from './spin.js';
import { hover } from './hover.js';
import { collapse } from './collapse.js';

/** Register the built-in effects as ordinary definitions. */
export function registerBuiltInEffects(): void {
  registerEffect(pulse as never);
  registerEffect(flicker as never);
  registerEffect(spin as never);
  registerEffect(hover as never);
  registerEffect(collapse as never);
}

registerBuiltInEffects();

export { pulse, flicker, spin, hover, collapse };
