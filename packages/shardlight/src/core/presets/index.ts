import { registerPreset } from './registry.js';
import { star } from './star.js';
import { sun } from './sun.js';
import { sparkle } from './sparkle.js';
import { starburst } from './starburst.js';
import { ember } from './ember.js';

/** Register the built-in presets by name. */
export function registerBuiltInPresets(): void {
  registerPreset('star', star);
  registerPreset('sun', sun);
  registerPreset('sparkle', sparkle);
  registerPreset('starburst', starburst);
  registerPreset('ember', ember);
}

registerBuiltInPresets();

export { star, sun, sparkle, starburst, ember };
