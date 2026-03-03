/**
 * Maps WallpaperColors → the 16 token placeholders in the desert-night scene.
 *
 * Sky and dune tokens derive from bg/bgSoft.
 * Horizon glow and moon tint vary by harmony mode.
 * Stars use fixed warm-tinted reference values suitable for a desert night.
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
 * Per-mode desert variation — returns [horizonGlowColor, moonTintColor].
 *   none              → Stillness : warm sand horizon, ivory moon
 *   analogous         → Drift     : soft amber glow, warm moon
 *   split-complementary → Break   : wildfire red glow, flame-tinted moon
 *   monochromatic     → Void      : nearly dark, dim moon
 *   triadic           → Pulse     : vivid orange horizon, golden moon
 */
function desertTriple(colors: WallpaperColors, mode: string): [string, string] {
  switch (mode) {
    case "monochromatic":
      return [darken(colors.bgSoft, 0.3), "#c8c0a8"];
    case "split-complementary":
      return [lerp(colors.hueOrange, colors.hueRed, 0.4), "#f0d8b0"];
    case "triadic":
      return [lerp(colors.hueOrange, colors.hueYellow, 0.4), "#ffe0a0"];
    case "analogous":
      return [lerp(colors.bgSoft, colors.hueOrange, 0.18), "#e8dcc0"];
    default:
      return [lerp(colors.bgSoft, colors.hueOrange, 0.12), "#f0e8c8"];
  }
}

/**
 * Build the complete token map for the desert-night scene.
 * All 16 tokens are always present.
 */
export function buildDesertNightVars(
  colors: WallpaperColors,
  mode: string
): Record<string, string> {
  const [horizonGlow, moonTint] = desertTriple(colors, mode);

  return {
    // ── Sky ───────────────────────────────────────────────────────────────────
    skyTop: darken(colors.bg, 0.48),
    skyMid: colors.bg,
    skyBottom: lerp(colors.bg, horizonGlow, 0.28),

    // ── Stars (warm-tinted for desert atmosphere) ─────────────────────────────
    starWhite: "#ffffff",
    starFaint: "#fff2e8",
    starBlue: "#eef4ff",

    // ── Moon (warm crescent) ──────────────────────────────────────────────────
    moonSurface: lerp("#fffff8", moonTint, 0.12),
    moonGlow: moonTint,

    // ── Horizon haze (warm sandy glow at dune line) ───────────────────────────
    hazeColor: lerp(colors.bgSoft, horizonGlow, 0.48),
    hazeOpacity: "0.22",

    // ── Dune silhouettes (warmly dark, layered depth) ─────────────────────────
    duneFar: lerp(colors.bg, colors.bgSoft, 0.48),
    duneMidFar: lerp(colors.bg, colors.bgSoft, 0.24),
    duneMidNear: lerp(colors.bg, colors.bgSoft, 0.10),
    duneFront: darken(colors.bg, 0.18),

    // ── Vignette (pure black edge darkening) ──────────────────────────────────
    vignetteColor: BLACK,
    vignetteOpacity: "0.55",
  };
}
