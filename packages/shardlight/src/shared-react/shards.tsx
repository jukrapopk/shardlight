import { blob, clusters, fan, halo } from '../core/index.js';
import { createShardComponent } from './createShardComponent.js';

/** The built-in kinds as typed components (plan §4.1). Shared by DOM and R3F. */
export const Glow = createShardComponent(blob);
export const Rays = createShardComponent(fan);
export const Streaks = createShardComponent(clusters);
export const Halo = createShardComponent(halo);
