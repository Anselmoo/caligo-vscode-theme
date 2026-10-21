import { clampChroma, converter, formatHex, formatHex8 } from "culori";

export type OkLch = {
  mode: "oklch";
  l: number;
  c: number;
  h: number;
  alpha?: number;
};

const toRgb = converter("rgb");

export function oklch(l: number, c: number, h: number, alpha = 1): OkLch {
  return { mode: "oklch", l, c, h, alpha };
}

/**
 * Convert an OKLCH color to hex, gamut-mapping by chroma reduction.
 *
 * Uses `clampChroma` rather than `clampRgb`. The difference is not cosmetic:
 * `clampRgb` clamps R, G and B independently, so it alters lightness and hue as
 * a side effect. Asked for OKLCH(0.98, 0.6, 29) it returns #ff0000 -- a color at
 * L ~0.63, two thirds of a lightness scale away from what was requested.
 * `clampChroma` holds L and H fixed and surrenders only chroma, which is the
 * one axis that has to yield when a color falls outside sRGB.
 */
export function toHex(color: OkLch): string {
  const rgb = toRgb(clampChroma(color, "oklch"));

  // culori exports both `formatHex` and `formatHex8` in modern versions.
  // Prefer hex8 when alpha is present.
  const a = typeof color.alpha === "number" ? color.alpha : 1;
  if (a < 1 && typeof formatHex8 === "function") {
    return formatHex8(rgb);
  }

  return formatHex(rgb);
}

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(normalized)) {
    throw new Error(`withAlpha: expected #RRGGBB or #RRGGBBAA, got '${hex}'`);
  }

  const rgb = normalized.slice(0, 7);
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");

  return `${rgb}${aa}`;
}

/**
 * Multiply a color's existing alpha by `factor` (`#RRGGBB` counts as alpha 1).
 *
 * `withAlpha` replaces the alpha byte, so `withAlpha(selection, 0.6)` on a 0.28-alpha
 * selection makes it MORE opaque. Use this when a weaker variant of a translucent color
 * is meant.
 */
export function scaleAlpha(hex: string, factor: number): string {
  const normalized = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(normalized)) {
    throw new Error(`scaleAlpha: expected #RRGGBB or #RRGGBBAA, got '${hex}'`);
  }
  const alpha = normalized.length === 9 ? Number.parseInt(normalized.slice(7), 16) / 255 : 1;
  return withAlpha(normalized.slice(0, 7), alpha * factor);
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
