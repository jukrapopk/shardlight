import { registerPreset } from './registry.js';
import { star } from './star.js';
import { sun } from './sun.js';
import { anamorphic } from './anamorphic.js';
import { sparkle } from './sparkle.js';
import { neon } from './neon.js';
import { ember } from './ember.js';
import { starburst } from './starburst.js';
import { frost } from './frost.js';
import { orbit } from './orbit.js';
import { comet } from './comet.js';

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
  registerPreset('orbit', orbit);
  registerPreset('comet', comet);
}

registerBuiltInPresets();

export { star, sun, anamorphic, sparkle, neon, ember, starburst, frost, orbit, comet };
