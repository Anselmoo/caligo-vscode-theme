/**
 * The measurements behind the Science page.
 *
 * Everything is derived from the hex values at runtime. The manifest's own `oklch`
 * metadata is not used: it is wrong for some colours (Deep Sable's `types` is
 * #ce8545, L 0.68 by measurement, but the manifest says 0.92).
 *
 * Contrast is reported for the colour as it renders. Several inks are translucent
 * (`strings` is #rrggbbbf, 75% opaque), so they are composited over the background
 * before the WCAG ratio is taken; the ratio of the opaque value would overstate it.
 */

import * as culori from "culori";
import type { ThemeIndexEntry } from "../../types/theme.js";

type CuloriFns = {
  blend: (colors: string[]) => unknown;
  wcagContrast: (a: unknown, b: unknown) => number;
};
const { blend, wcagContrast } = culori as unknown as CuloriFns;

/** Smallest WCAG ratio for small text (AA). */
export const AA_TEXT = 4.5;

/** Keys that are plotted as inks; the rest of the core list are surfaces. */
const SURFACE_KEYS = new Set(["bg0", "bg1", "bg2"]);

export type ColourRow = {
  key: string;
  label: string;
  hex: string;
  /** Surfaces are the background ramp; inks are drawn on bg0. */
  kind: "surface" | "ink";
  l: number;
  c: number;
  /** Degrees, 0 for achromatic colours (their hue is not meaningful). */
  h: number;
  /** 0-1; below 1 for translucent colours such as `strings`. */
  alpha: number;
  /** WCAG ratio over bg0 after compositing; null for surfaces. */
  contrast: number | null;
};

/** WCAG 2 ratio of a (possibly translucent) colour as it renders over `bg`. */
export function renderedContrast(fg: string, bg: string): number {
  return wcagContrast(blend([bg, fg]), bg);
}

/** OKLCH of a hex string, computed here and never read from the manifest. */
export function measureHex(hex: string) {
  const o = culori.oklch(hex);
  return {
    l: o?.l ?? 0,
    c: o?.c ?? 0,
    h: o?.h ?? 0,
    alpha: o?.alpha ?? 1,
  };
}

export function colourRows(theme: ThemeIndexEntry | null): ColourRow[] {
  if (!theme) return [];
  const bg0 = theme.colors.bg0;
  const colors = theme.colors as unknown as Record<string, string>;
  return theme.core.map(entry => {
    // `colors` is what the theme paints; `core[].hex` is a copy of it.
    const hex = colors[entry.key] ?? entry.hex;
    const kind = SURFACE_KEYS.has(entry.key) ? "surface" : "ink";
    return {
      key: entry.key,
      label: entry.label || entry.key,
      hex,
      kind,
      ...measureHex(hex),
      contrast: kind === "ink" ? renderedContrast(hex, bg0) : null,
    };
  });
}

/**
 * The lowest OKLCH lightness at which a neutral grey reaches `ratio` over `bg`.
 * Grey is the best case, so inks need at least this much lightness (more when
 * they carry chroma). Returns null when even white cannot reach it.
 */
export function minLightnessFor(bg: string, ratio = AA_TEXT): number | null {
  const grey = (l: number) => ({ mode: "oklch", l, c: 0, h: 0 });
  if (wcagContrast(grey(1), bg) < ratio) return null;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (wcagContrast(grey(mid), bg) >= ratio) high = mid;
    else low = mid;
  }
  return high;
}

/** Percent opacity as shown in the table, or null when fully opaque. */
export function opacityPercent(alpha: number): number | null {
  return alpha < 0.995 ? Math.round(alpha * 100) : null;
}
