import { registerEffect } from './registry.js';
import { spin } from './spin.js';
import { pulse } from './pulse.js';
import { flicker } from './flicker.js';

/** Register the built-in effects as ordinary definitions (plan §4.3). */
export function registerBuiltInEffects(): void {
  registerEffect(spin as never);
  registerEffect(pulse as never);
  registerEffect(flicker as never);
}

registerBuiltInEffects();

export { spin, pulse, flicker };
