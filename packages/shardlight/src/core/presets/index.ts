import { registerPreset } from './registry.js';
import { star } from './star.js';
import { sun } from './sun.js';
import { anamorphic } from './anamorphic.js';
import { sparkle } from './sparkle.js';
import { neon } from './neon.js';
import { ember } from './ember.js';
import { starburst } from './starburst.js';
import { frost } from './frost.js';

/** Register the built-in presets by name. */
export function registerBuiltInPresets(): void {
  registerPreset('star', star);
  registerPreset('sun', sun);
  registerPreset('anamorphic', anamorphic);
  registerPreset('sparkle', sparkle);
  registerPreset('neon', neon);
  registerPreset('ember', ember);
  registerPreset('starburst', starburst);
  registerPreset('frost', frost);
}

registerBuiltInPresets();

export { star, sun, anamorphic, sparkle, neon, ember, starburst, frost };
