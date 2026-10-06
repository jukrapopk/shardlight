import { registerEffect } from './registry.js';
import { pulse } from './pulse.js';
import { flicker } from './flicker.js';

/** Register the built-in effects as ordinary definitions. */
export function registerBuiltInEffects(): void {
  registerEffect(pulse as never);
  registerEffect(flicker as never);
}

registerBuiltInEffects();

export { pulse, flicker };
