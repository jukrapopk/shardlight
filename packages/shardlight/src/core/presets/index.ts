import { registerPreset } from './registry.js';
import { star } from './star.js';
import { sun } from './sun.js';
import { anamorphic } from './anamorphic.js';
import { sparkle } from './sparkle.js';

/** Register the built-in presets by name (plan §4.2, §9). */
export function registerBuiltInPresets(): void {
  registerPreset('star', star);
  registerPreset('sun', sun);
  registerPreset('anamorphic', anamorphic);
  registerPreset('sparkle', sparkle);
}

registerBuiltInPresets();

export { star, sun, anamorphic, sparkle };
