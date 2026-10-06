import type { EffectConfig } from '../config/types.js';
import { defineEffect } from './registry.js';

/** How a light reacts to a click when it has a `collapse` effect. */
export type CollapseTrigger = 'click' | 'once' | 'none';

/**
 * `collapse`: shrinks (`scale`) and fades (`opacity`) each target channel as the
 * light is clicked. `out.collapse` is the light-wide collapsed amount (0..1),
 * eased by the model.
 *
 * `trigger` decides the built-in click behavior: `'click'` toggles, `'once'`
 * collapses and stays, `'none'` leaves the click alone so you can drive
 * `setCollapsed()` yourself.
 *
 * Click is user-driven, so it keeps running under `prefers-reduced-motion`.
 */
export const collapse = defineEffect({
  name: 'collapse',
  label: 'Collapse',
  params: {
    channels: { type: 'channels', default: ['*'] },
    scale: { type: 'number', default: 0, min: 0, max: 4, step: 0.01 },
    opacity: { type: 'number', default: 1, min: 0, max: 4, step: 0.01 },
    trigger: { type: 'enum', default: 'click', values: ['click', 'once', 'none'] },
  },
  reducedMotion: 'keep',
  apply(_t, p, out) {
    const amount = out.collapse;
    if (amount <= 0) return;
    const targets = p.channels.includes('*') ? out.channels() : p.channels;
    for (const channel of targets) {
      const values = out.channel(channel);
      values.scale *= 1 + (p.scale - 1) * amount;
      values.opacity *= 1 + (p.opacity - 1) * amount;
    }
  },
});

/**
 * The built-in click behavior for a light's `collapse` effects. `'none'` wins
 * when set (an explicit opt-out), then `'once'`, otherwise `'click'`.
 */
export function collapseTrigger(effects: readonly EffectConfig[]): CollapseTrigger {
  let has = false;
  let once = false;
  for (const effect of effects) {
    if (effect.type !== 'collapse') continue;
    has = true;
    if (effect.trigger === 'none') return 'none';
    if (effect.trigger === 'once') once = true;
  }
  if (!has) return 'none';
  return once ? 'once' : 'click';
}
