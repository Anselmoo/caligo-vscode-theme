/**
 * Color Utilities using Culori
 * Helper functions for OKLCH color space operations
 */

import * as culori from "culori";

type CuloriOklchInput = { l: number; c: number; h: number; mode: "oklch" };
type CuloriShape = {
  oklch: (input: CuloriOklchInput) => unknown;
  formatHex: (color: unknown) => string | null | undefined;
  wcagContrast: (color1: string, color2: string) => number | null | undefined;
  differenceEuclidean: (mode?: string, weights?: number[]) => (a: unknown, b: unknown) => number;
};

// Some TypeScript setups in this repo rely on @types/culori, which may lag behind
// the actual culori runtime exports. Cast through `unknown` to avoid `any`.
const culoriFns = culori as unknown as CuloriShape;

/**
 * Convert OKLCH object to hex color
 */
export function oklchToHex(l: number, c: number, h: number): string {
  const color = culoriFns.oklch({ l, c, h, mode: "oklch" });
  return culoriFns.formatHex(color) || "#000000";
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
export function calculateContrast(color1: string, color2: string): number {
  const ratio = culoriFns.wcagContrast(color1, color2);
  return ratio || 1;
}

/**
 * Perceptual distance between two OKLCH colors, measured as Euclidean distance in OKLab.
 *
 * Note: This is useful for clustering/heatmaps/"distance matrices".
 */
export function distanceOklabFromOKLCH(
  a: { l: number; c: number; h: number },
  b: { l: number; c: number; h: number }
): number {
  const dist = culoriFns.differenceEuclidean("oklab");
  const ca = culoriFns.oklch({ l: a.l, c: a.c, h: a.h, mode: "oklch" });
  const cb = culoriFns.oklch({ l: b.l, c: b.c, h: b.h, mode: "oklch" });
  return dist(ca, cb);
}

/**
 * Get WCAG compliance level for a contrast ratio
 */
export function getWCAGLevel(ratio: number): "AAA" | "AA" | "FAIL" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "FAIL";
}

/**
 * Calculate hue spread (range) for an array of colors
 */
export function calculateHueSpread(colors: Array<{ h: number }>): number {
  if (colors.length === 0) return 0;
  if (colors.length === 1) return 0;

  const hues = colors.map(c => c.h).sort((a, b) => a - b);

  // Handle circular nature of hue (0° = 360°)
  let maxSpread = 0;
  for (let i = 0; i < hues.length - 1; i++) {
    const spread = hues[i + 1] - hues[i];
    maxSpread = Math.max(maxSpread, spread);
  }

  // Check wrap-around
  const wrapSpread = 360 - hues[hues.length - 1] + hues[0];
  maxSpread = Math.max(maxSpread, wrapSpread);

  return Math.round(maxSpread);
}

/**
 * Generate full hue spectrum colors for visualization
 */
export function generateHueSpectrum(steps: number = 360): string[] {
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const hue = (i / steps) * 360;
    colors.push(oklchToHex(0.65, 0.15, hue));
  }
  return colors;
}

/**
 * Format OKLCH values for display
 */
export function formatOKLCH(l: number, c: number, h: number): string {
  return `oklch(${(l * 100).toFixed(0)}% ${c.toFixed(3)} ${Math.round(h)})`;
}

/**
 * Get color for WCAG level badge (theme-aware)
 * Returns CSS variable names that will be resolved at runtime
 */
export function getWCAGColor(level: "AAA" | "AA" | "FAIL"): string {
  switch (level) {
    case "AAA":
      return "var(--color-success)"; // Uses theme's strings/functions color
    case "AA":
      return "var(--color-warning)"; // Uses theme's keywords color
    case "FAIL":
      return "var(--color-error)"; // Uses theme's error color
  }
}

/**
 * Convert hex color to RGB components as string "r, g, b"
 * Throws error if hex is invalid to prevent silent failures
 */
export function hexToRgb(hex?: string | null): string {
  if (!hex) {
    throw new Error("hexToRgb: hex color is required");
  }

  const normalized = hex.trim().replace(/^#/, "");
  // Accept #RRGGBB and #RRGGBBAA (alpha ignored for RGB components)
  const rgbHex = normalized.length === 8 ? normalized.slice(0, 6) : normalized;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(rgbHex);

  if (!result) {
    throw new Error(`hexToRgb: invalid hex color "${hex}"`);
  }

  const r = Number.parseInt(result[1], 16);
  const g = Number.parseInt(result[2], 16);
  const b = Number.parseInt(result[3], 16);

  return `${r}, ${g}, ${b}`;
}

/**
 * Convert hex color to RGB tuple [r, g, b]
 * Throws error if hex is invalid to prevent silent failures
 */
export function hexToRgbTuple(hex: string): [number, number, number] {
  const normalized = hex.trim().replace(/^#/, "");
  const rgbHex = normalized.length === 8 ? normalized.slice(0, 6) : normalized;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(rgbHex);

  if (!result) {
    throw new Error(`hexToRgbTuple: invalid hex color "${hex}"`);
  }

  const r = Number.parseInt(result[1], 16);
  const g = Number.parseInt(result[2], 16);
  const b = Number.parseInt(result[3], 16);

  return [r, g, b];
}

/**
 * Convert hex color to RGBA string for canvas
 * Throws error if hex is invalid to prevent silent failures
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Convert hex color to sRGB string for APCA
 */
export function hexToSRGB(hex: string): string {
  const [r, g, b] = hexToRgbTuple(hex);
  return `rgb(${r}, ${g}, ${b})`;
}
