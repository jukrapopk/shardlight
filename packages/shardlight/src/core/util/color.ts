export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX = /^#?([0-9a-f]{3,8})$/i;
const RGB_FN = /^rgba?\(\s*([^)]+)\)$/i;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Parse the common CSS colour forms used by lights: #rgb, #rgba, #rrggbb,
 * #rrggbbaa, rgb()/rgba(). Falls back to opaque white for anything unknown so a
 * malformed colour never blanks a whole light.
 */
export function parseColor(input: string): RGB {
  const value = (input ?? '').trim();

  const hex = HEX.exec(value);
  if (hex) {
    const h = hex[1]!;
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0]! + h[0]!, 16);
      const g = parseInt(h[1]! + h[1]!, 16);
      const b = parseInt(h[2]! + h[2]!, 16);
      const a = h.length === 4 ? parseInt(h[3]! + h[3]!, 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  const fn = RGB_FN.exec(value);
  if (fn) {
    const parts = fn[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      return {
        r: clampByte(parts[0]!),
        g: clampByte(parts[1]!),
        b: clampByte(parts[2]!),
        a: parts.length >= 4 ? Math.max(0, Math.min(1, parts[3]!)) : 1,
      };
    }
  }

  return { r: 255, g: 255, b: 255, a: 1 };
}

/** A function that formats a colour at a given alpha, for a draw env. */
export type RgbaFormatter = (alpha: number) => string;

export function makeRgba(color: string): RgbaFormatter {
  const { r, g, b, a } = parseColor(color);
  return (alpha: number) => {
    const clamped = Math.max(0, Math.min(1, alpha)) * a;
    return `rgba(${r},${g},${b},${clamped})`;
  };
}

/** Loose validity check for names used in CSS custom properties (plan §6.3). */
export function isCssIdentifier(name: string): boolean {
  return /^-?[_a-zA-Z][-_a-zA-Z0-9]*$/.test(name);
}
