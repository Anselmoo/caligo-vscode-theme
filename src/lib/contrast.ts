/**
 * Single contrast implementation for the generator, the quality gates and the web app.
 *
 * Scoring model (pinned by tests/contrast-truth):
 *   - Colors are `#RRGGBB` / `#RRGGBBAA` strings (case-insensitive) or `Rgba` objects.
 *     Anything else throws; there is no silent fallback to "opaque" or "Lc 0".
 *   - Translucent colors are composited with Porter-Duff source-over in gamma-encoded sRGB,
 *     which is how browsers and VS Code paint them. Channels stay UNROUNDED floats so results
 *     are reproducible against an independent implementation to ~1e-9.
 *   - A foreground is scored as `compositeOver(fg, bgEff)` against `bgEff`, where `bgEff` is the
 *     background flattened over its declared `base` layers (bottom -> top). The bottom layer must
 *     be opaque, otherwise the background has no defined color and the call throws.
 */
import { APCAcontrast, sRGBtoY } from "./apca-wrapper.js";

/** r, g, b in 0..255 (floats allowed), a in 0..1. */
export type Rgba = { r: number; g: number; b: number; a: number };
/** `#RRGGBB` | `#RRGGBBAA` hex string, or an already parsed color. */
export type Color = string | Rgba;

const HEX_RE = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

/** Parse `#RRGGBB` or `#RRGGBBAA`. The alpha byte is kept (a = byte / 255); no alpha means a = 1. */
export function parseHex(hex: string): Rgba {
  if (typeof hex !== "string" || !HEX_RE.test(hex)) {
    throw new Error(`parseHex: expected #RRGGBB or #RRGGBBAA, got '${String(hex)}'`);
  }
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
    a: hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) / 255 : 1,
  };
}

function toRgba(color: Color): Rgba {
  return typeof color === "string" ? parseHex(color) : color;
}

/**
 * Porter-Duff source-over of `top` on `bottom` in sRGB, unrounded.
 * With an opaque `bottom` the result is opaque; `a = 1` returns `top`'s channels and `a = 0`
 * returns `bottom`'s channels exactly.
 */
export function compositeOver(top: Color, bottom: Color): Rgba {
  const t = toRgba(top);
  const b = toRgba(bottom);
  const outA = t.a + b.a * (1 - t.a);
  if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (ct: number, cb: number): number => (ct * t.a + cb * b.a * (1 - t.a)) / outA;
  return { r: mix(t.r, b.r), g: mix(t.g, b.g), b: mix(t.b, b.b), a: outA };
}

/** Flatten a bottom -> top stack. Throws on an empty stack or a translucent bottom layer. */
export function flattenLayers(layers: readonly Color[]): Rgba {
  if (layers.length === 0) {
    throw new Error("flattenLayers: empty layer stack");
  }
  const bottom = toRgba(layers[0]);
  if (bottom.a !== 1) {
    throw new Error(
      `flattenLayers: bottom layer must be opaque (alpha ${bottom.a}); declare an opaque base`
    );
  }
  let acc = bottom;
  for (let i = 1; i < layers.length; i++) acc = compositeOver(layers[i], acc);
  return acc;
}

function resolvePair(
  fg: Color,
  bg: Color,
  base?: Color | readonly Color[]
): { fg: Rgba; bg: Rgba } {
  const baseLayers: readonly Color[] =
    base === undefined ? [] : Array.isArray(base) ? (base as readonly Color[]) : [base as Color];
  const bgEff = flattenLayers([...baseLayers, bg]);
  return { fg: compositeOver(fg, bgEff), bg: bgEff };
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 2.x contrast ratio (1..21), unrounded, of `fg` painted over `bg` (over `base`). */
export function wcagContrastRatio(fg: Color, bg: Color, base?: Color | readonly Color[]): number {
  const r = resolvePair(fg, bg, base);
  const lf = relativeLuminance(r.fg);
  const lb = relativeLuminance(r.bg);
  return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
}

/**
 * SIGNED APCA Lc (apca-w3 0.1.9) in (text, background) order, on composited float RGB.
 * Positive = dark text on light background, negative = light text on dark background.
 */
export function apcaContrast(fg: Color, bg: Color, base?: Color | readonly Color[]): number {
  const r = resolvePair(fg, bg, base);
  return APCAcontrast(sRGBtoY([r.fg.r, r.fg.g, r.fg.b]), sRGBtoY([r.bg.r, r.bg.g, r.bg.b]));
}

/** Absolute APCA Lc: `Math.abs(apcaContrast(...))`. */
export function apcaLc(fg: Color, bg: Color, base?: Color | readonly Color[]): number {
  return Math.abs(apcaContrast(fg, bg, base));
}

/** Minimum WCAG AA contrast ratio for normal-size text. */
const WCAG_AA_RATIO = 4.5;

/**
 * Returns whichever of `primaryCandidateHex` or `fallbackHex` produces a higher WCAG contrast
 * ratio against `bgHex`.
 *
 * When neither palette candidate achieves WCAG AA (>=4.5:1), the function falls back to
 * whichever of pure black (`#000000`) or pure white (`#ffffff`) scores higher, guaranteeing
 * maximum-contrast text in all cases including mid-luminance backgrounds where palette colors
 * alone cannot reach the threshold.
 *
 * Accepts `#RRGGBB` or `#RRGGBBAA`. A translucent candidate is composited over `bgHex` before
 * scoring; `bgHex` itself must be opaque (a translucent background throws, it has no defined
 * color without a base).
 */
export function pickReadableForeground(
  bgHex: string,
  primaryCandidateHex: string,
  fallbackHex: string
): string {
  const primaryContrast = wcagContrastRatio(primaryCandidateHex, bgHex);
  const fallbackContrast = wcagContrastRatio(fallbackHex, bgHex);
  const [best, bestContrast] =
    primaryContrast >= fallbackContrast
      ? [primaryCandidateHex, primaryContrast]
      : [fallbackHex, fallbackContrast];

  if (bestContrast >= WCAG_AA_RATIO) {
    return best;
  }

  // Neither palette color reaches WCAG AA: fall back to the absolute extreme
  // (black or white) that gives the highest contrast against this background.
  const whiteContrast = wcagContrastRatio("#ffffff", bgHex);
  const blackContrast = wcagContrastRatio("#000000", bgHex);
  return blackContrast >= whiteContrast ? "#000000" : "#ffffff";
}
