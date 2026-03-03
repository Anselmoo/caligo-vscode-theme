/**
 * Maps WallpaperColors → the 19 token placeholders in the ocean-night scene.
 *
 * Sky and sea tokens derive from bg/bgSoft.
 * Moon and horizon tint vary by harmony mode.
 * Stars use cool blue-tinted reference values for a coastal night atmosphere.
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

function darken(hex: string, t: number): string {
  return lerp(hex, BLACK, t);
}

/**
 * Per-mode ocean variation — returns [horizonTintColor, moonTintColor].
 *   none              → Stillness : soft silver moon, pale horizon
 *   analogous         → Drift     : misty cool blue horizon
 *   split-complementary → Break   : cold dramatic cyan
 *   monochromatic     → Void      : barely-lit, dim grey moon
 *   triadic           → Pulse     : vivid blue horizon, bright moon
 */
function oceanTriple(colors: WallpaperColors, mode: string): [string, string] {
  switch (mode) {
    case "monochromatic":
      return [colors.bgSoft, "#c8ccd8"];
    case "split-complementary":
      return [lerp(colors.hueCyan, colors.bg, 0.5), "#ccdcee"];
    case "triadic":
      return [lerp(colors.hueCyan, colors.hueBlue, 0.3), "#d8ecff"];
    case "analogous":
      return [lerp(colors.bgSoft, colors.hueCyan, 0.16), "#e0eeff"];
    default:
      return [lerp(colors.bgSoft, "#aaddff", 0.22), "#f0f4ff"];
  }
}

/**
 * Build the complete token map for the ocean-night scene.
 * All 19 tokens are always present.
 */
export function buildOceanNightVars(
  colors: WallpaperColors,
  mode: string
): Record<string, string> {
  const [horizonTint, moonTint] = oceanTriple(colors, mode);

  return {
    // ── Sky ───────────────────────────────────────────────────────────────────
    skyTop: darken(colors.bg, 0.48),
    skyMid: colors.bg,
    skyBottom: lerp(colors.bg, colors.bgSoft, 0.38),

    // ── Stars (cool blue for coastal atmosphere) ──────────────────────────────
    starWhite: "#ffffff",
    starFaint: "#e2eeff",
    starBlue: "#aacbff",

    // ── Moon (silver full moon with corona) ───────────────────────────────────
    moonSurface: lerp("#f8faff", moonTint, 0.06),
    moonCorona: lerp(moonTint, "#d8e8ff", 0.35),
    moonGlow: lerp(moonTint, horizonTint, 0.22),

    // ── Ocean surface ─────────────────────────────────────────────────────────
    seaDeep: darken(colors.bg, 0.40),
    seaMid: lerp(colors.bg, colors.bgSoft, 0.30),
    moonReflection: moonTint,
    waveEdge: lerp(colors.bgSoft, "#c0d8ff", 0.38),

    // ── Wave crest ────────────────────────────────────────────────────────────
    waveColor: lerp(colors.bg, colors.bgSoft, 0.38),
    foamColor: lerp(colors.bgSoft, "#ffffff", 0.48),

    // ── Horizon haze ──────────────────────────────────────────────────────────
    hazeColor: lerp(colors.bgSoft, horizonTint, 0.42),
    hazeOpacity: "0.16",

    // ── Vignette ──────────────────────────────────────────────────────────────
    vignetteColor: BLACK,
    vignetteOpacity: "0.52",
  };
}
