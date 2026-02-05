import type { ThemeIndexEntry } from "../types/theme.js";

export interface OKLCHColor {
  l: number; // Lightness 0-1
  c: number; // Chroma 0-0.4
  h: number; // Hue 0-360
}

/**
 * Calculate hue delta in degrees, wrapping around the color wheel
 * Returns value in range -180 to +180
 */
export function nHueDeltaDeg(h1: number, h2: number): number {
  let delta = h2 - h1;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

/**
 * Calculate chroma delta
 */
export function nChromaDelta(c1: number, c2: number): number {
  return c2 - c1;
}

/**
 * Extract OKLCH values from theme for a given color key
 */
export function nGetCoreOklch(
  theme: ThemeIndexEntry | null | undefined,
  key: string
): OKLCHColor | null {
  if (!theme?.oklch) return null;

  const oklch = theme.oklch[key as keyof typeof theme.oklch];
  if (!oklch || typeof oklch !== "object") return null;

  return {
    l: oklch.l ?? 0.7,
    c: oklch.c ?? 0,
    h: oklch.h ?? 0,
  };
}

/**
 * Format number with sign prefix
 */
export function nSigned(val: number, decimals: number = 0): string {
  const rounded = Number(val.toFixed(decimals));
  if (rounded > 0) return `+${rounded}`;
  return String(rounded);
}

/**
 * Convert contrast ratio to percentage (max 21:1 = 100%)
 */
export function nRatioPct(ratio: number | null | undefined): number {
  if (!ratio || !Number.isFinite(ratio)) return 0;
  const maxRatio = 21;
  return Math.min(100, (ratio / maxRatio) * 100);
}

/**
 * Clamp value to 0-1 range
 */
export function nClamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

/**
 * Clamp chroma to valid range 0-0.4
 */
export function nClampChroma(val: number): number {
  return Math.max(0, Math.min(0.4, val));
}

/**
 * Normalize hue to 0-360 range
 */
export function nNormalizeHue(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Format ratio as short string
 */
export function nFmtRatioShort(ratio: number | null | undefined): string {
  if (!ratio || !Number.isFinite(ratio)) return "—";
  return `${ratio.toFixed(1)}:1`;
}

/**
 * Calculate hue spread (max angular distance from accent to other colors)
 */
export function calculateHueSpread(theme: ThemeIndexEntry | null | undefined): number {
  if (!theme) return 0;

  const accentOklch = nGetCoreOklch(theme, "accent");
  if (!accentOklch) return 0;

  const otherKeys = ["keywords", "functions", "types", "strings"];
  const otherHues = otherKeys
    .map(key => nGetCoreOklch(theme, key))
    .filter((ok): ok is OKLCHColor => ok !== null && typeof ok.h === "number");

  if (otherHues.length === 0) return 0;

  const deltas = otherHues.map(ok => Math.abs(nHueDeltaDeg(accentOklch.h, ok.h)));
  return Math.round(Math.max(0, ...deltas));
}

/**
 * Calculate delta from balanced mode accent
 */
export function calculateDeltaAccent(
  currentTheme: ThemeIndexEntry | null | undefined,
  balancedTheme: ThemeIndexEntry | null | undefined
): { hue: number; chroma: number; text: string } {
  const currentAccent = nGetCoreOklch(currentTheme, "accent");
  const balancedAccent = nGetCoreOklch(balancedTheme, "accent");

  if (!currentAccent || !balancedAccent) {
    return { hue: 0, chroma: 0, text: "—" };
  }

  const dHue = nHueDeltaDeg(balancedAccent.h, currentAccent.h);
  const dC = nChromaDelta(balancedAccent.c, currentAccent.c);

  return {
    hue: dHue,
    chroma: dC,
    text: `${nSigned(dHue, 0)}° · ${nSigned(dC, 2)}c`,
  };
}
