import { defineEffect } from './registry.js';

/** `spin`: adds `speed · 360 · t` degrees to the light's spin angle. */
export const spin = defineEffect({
  name: 'spin',
  label: 'Spin',
  params: {
    speed: { type: 'number', default: 0.05, min: 0, max: 10, step: 0.01, unit: 'turns/s' },
  },
  apply(t, p, out) {
    out.spin += p.speed * 360 * t;
  },
});
