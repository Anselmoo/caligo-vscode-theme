/**
 * Maps WallpaperColors → the 19 token placeholders in the eclipse-corona scene.
 *
 * Sky is near-total darkness. Corona inner/outer/blood vary dramatically by mode.
 * Mountain silhouettes derive from bg (dark, barely distinguishable).
 */
import type { WallpaperColors } from "../types.js";

function lerp(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ra = (pa >> 16) & 0xff,
    ga = (pa >> 8) & 0xff,
    ba = pa & 0xff;
  const rb = (pb >> 16) & 0xff,
    gb = (pb >> 8) & 0xff,
    bb = pb & 0xff;
  const r = Math.round(ra + (rb - ra) * t);
  const g = Math.round(ga + (gb - ga) * t);
  const bl = Math.round(ba + (bb - ba) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

const BLACK = "#000000";
const WHITE = "#ffffff";

function darken(hex: string, t: number): string {
  return lerp(hex, BLACK, t);
}
function lighten(hex: string, t: number): string {
  return lerp(hex, WHITE, t);
}

/**
 * Per-mode corona variation — returns [inner, outer, blood].
 *   none              → Stillness : golden corona (classic solar eclipse)
 *   analogous         → Drift     : warm amber corona
 *   split-complementary → Break   : blood-red outer (lunar eclipse variant)
 *   monochromatic     → Void      : barely-visible grey corona
 *   triadic           → Pulse     : vivid multi-color corona
 */
function eclipseTriple(colors: WallpaperColors, mode: string): [string, string, string] {
  switch (mode) {
    case "monochromatic":
      return [lighten(colors.bgSoft, 0.45), lighten(colors.bgSoft, 0.22), colors.bgSoft];
    case "split-complementary":
      return [
        lerp(colors.hueOrange, WHITE, 0.42),
        lerp(colors.hueRed, colors.hueOrange, 0.35),
        colors.hueRed,
      ];
    case "triadic":
      return [
        lerp(colors.accent, WHITE, 0.42),
        lerp(colors.accent, colors.hueOrange, 0.42),
        lerp(colors.hueRed, colors.huePurple, 0.32),
      ];
    case "analogous":
      return [
        lerp(colors.hueYellow, WHITE, 0.38),
        lerp(colors.hueOrange, colors.hueYellow, 0.32),
        lerp(colors.hueRed, colors.hueOrange, 0.42),
      ];
    default:
      return [
        lerp(colors.hueYellow, WHITE, 0.52),
        lerp(colors.hueYellow, colors.hueOrange, 0.42),
        lerp(colors.hueRed, colors.hueOrange, 0.58),
      ];
  }
}

/**
 * Build the complete token map for the eclipse-corona scene.
 * All 19 tokens are always present.
 */
export function buildEclipseCoronaVars(
  colors: WallpaperColors,
  mode: string
): Record<string, string> {
  const [coronaInner, coronaOuter, coronaBlood] = eclipseTriple(colors, mode);

  return {
    // ── Sky (near-total darkness during totality) ─────────────────────────────
    skyTop: darken(colors.bg, 0.68),
    skyMid: darken(colors.bg, 0.38),
    skyBottom: colors.bg,

    // ── Stars (visible in eclipse darkness — denser field) ────────────────────
    starWhite: "#ffffff",
    starFaint: "#ddeeff",
    starBlue: "#bbccff",
    milkyWayColor: "#9aabc8",

    // ── Corona rings ──────────────────────────────────────────────────────────
    coronaInner,
    coronaMid: lerp(coronaInner, coronaOuter, 0.5),
    coronaOuter,
    coronaBlood,
    eclipseCore: BLACK,

    // ── Mountain silhouettes ──────────────────────────────────────────────────
    mountainFar: lerp(colors.bg, colors.bgSoft, 0.30),
    mountainMid: lerp(colors.bg, colors.bgSoft, 0.15),
    mountainNear: darken(colors.bg, 0.20),

    // ── Horizon haze (subtle corona-tinted atmospheric glow) ──────────────────
    hazeColor: lerp(colors.bgSoft, coronaInner, 0.14),
    hazeOpacity: "0.14",

    // ── Vignette ──────────────────────────────────────────────────────────────
    vignetteColor: BLACK,
    vignetteOpacity: "0.62",
  };
}
