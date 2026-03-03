/**
 * Maps WallpaperColors → the 57 {{palette_token}} placeholders in night-aurora.svg.
 *
 * Sky and mountain tokens are derived from bg/bgSoft/bgMid.
 * Aurora tokens vary by harmony mode — primary/secondary/tertiary are selected
 * from the palette, then 9 green variants are computed from the primary.
 * Moon, snow, stars, and shooting-star tokens use fixed natural reference values.
 */
import type { WallpaperColors } from "../types.js";

/** Linear interpolate two hex colours by factor t (0 = a, 1 = b). */
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
 * Resolve per-mode aurora primary / secondary / tertiary colours.
 * Mode mapping mirrors aurora-noir.ts scene concepts:
 *   none              → Stillness  : classic green / cyan / purple
 *   analogous         → Drift      : green / cyan / accentSoft
 *   split-complementary → Break    : green / accent / cyan
 *   monochromatic     → Void       : desaturated near-dark palette
 *   triadic           → Pulse      : vivid green / cyan / purple
 */
function auroraTriple(colors: WallpaperColors, mode: string): [string, string, string] {
  switch (mode) {
    case "monochromatic":
      return [
        lerp(colors.hueGreen, colors.bg, 0.3),
        lerp(colors.bgSoft, colors.bg, 0.4),
        colors.bgSoft,
      ];
    case "split-complementary":
      return [colors.hueGreen, colors.accent, colors.hueCyan];
    case "triadic":
      return [colors.hueGreen, colors.hueCyan, colors.huePurple];
    case "analogous":
      return [colors.hueGreen, colors.hueCyan, colors.accentSoft];
    default:
      return [colors.hueGreen, colors.hueCyan, colors.huePurple];
  }
}

/**
 * Build the complete token map for night-aurora.svg.
 * All 57 tokens are always present; TypeScript computes palette-derived values
 * and passes fixed references for natural-color elements (moon, stars, snow).
 */
export function buildNightAuroraVars(
  colors: WallpaperColors,
  mode: string
): Record<string, string> {
  const [primary, secondary, tertiary] = auroraTriple(colors, mode);

  return {
    // ── Sky ───────────────────────────────────────────────────────────────────
    skyDeep: darken(colors.bg, 0.5),
    skyLow: colors.bg,
    skyMid: lerp(colors.bg, colors.bgSoft, 0.3),
    skyHigh: lerp(colors.bg, colors.bgSoft, 0.5),
    skyUp: lerp(colors.bg, colors.bgSoft, 0.7),
    skyHorizon: colors.bgSoft,

    // ── Aurora green variants (derived from per-mode primary) ─────────────────
    auroraGreen: primary,
    auroraGreenSoft: lighten(primary, 0.08),
    auroraGreenMid: lerp(primary, secondary, 0.3),
    auroraGreenBright: lighten(primary, 0.15),
    auroraGreenCool: lerp(primary, secondary, 0.6),
    auroraGreenDeep: darken(primary, 0.45),
    auroraGreenDim: darken(primary, 0.55),
    auroraGreenDark: darken(primary, 0.7),
    auroraGreenFade: darken(primary, 0.85),

    // ── Aurora secondary / tertiary ────────────────────────────────────────────
    auroraCyan: secondary,
    auroraPurple: tertiary,
    auroraPurpleMid: lighten(tertiary, 0.27),
    auroraPurpleSoft: lighten(tertiary, 0.4),

    // ── Mountains (atmospheric depth: far=bgSoft/bgMid, front=near-black) ─────
    mountainFarTop: lerp(colors.bgSoft, colors.bgMid, 0.4),
    mountainFarBase: lerp(colors.bg, colors.bgSoft, 0.6),
    mountainMidTop: lerp(colors.bg, colors.bgMid, 0.7),
    mountainMidBase: lerp(colors.bg, colors.bgSoft, 0.3),
    mountainNearTop: lerp(colors.bg, colors.bgSoft, 0.2),
    mountainNearBase: darken(colors.bg, 0.1),
    mountainFrontTop: darken(colors.bg, 0.2),
    mountainFrontBase: darken(colors.bg, 0.4),

    // ── Lake ───────────────────────────────────────────────────────────────────
    lakeDeep: lerp(colors.bg, colors.bgSoft, 0.5),
    lakeMid: lerp(colors.bg, colors.bgSoft, 0.3),
    lakeDark: darken(colors.bg, 0.05),

    // ── Moon (warm neutral reference — does not derive from theme palette) ─────
    moonGlowColor: "#ffeedd",
    moonGlowWarm: "#ccbbaa",
    moonGlowDim: "#665544",
    moonSurfaceTop: "#fffff0",
    moonSurfaceMid: "#eee8d5",
    moonSurfaceBase: "#ddd5c0",
    moonCrater: "#d5cdb8",

    // ── Snow (cool blue-white — independent of palette) ───────────────────────
    snowTop: "#c8d8ee",
    snowBase: "#8899bb",
    snowFaint: "#aabbdd",

    // ── Stars & Milky Way (fixed natural colours) ─────────────────────────────
    starWhite: "#ffffff",
    starBlue: "#ddeeff",
    starFaint: "#cce0ff",
    starFeature: "#eef4ff",
    milkyWayColor: "#aaddff",

    // ── Shooting star ─────────────────────────────────────────────────────────
    shootingStarMid: "#aaccff",
    shootingStarTail: "#4488ff",

    // ── Ridge / fog / mist / shore (derived, subtle blue tint) ────────────────
    ridgeLight: lerp(colors.bgSoft, "#aaddff", 0.3),
    rippleColor: lerp(colors.bg, colors.bgSoft, 0.5),
    fogColor: lerp(colors.bg, colors.bgSoft, 0.45),
    shoreColor: darken(colors.bg, 0.1),
    mistLight: lerp(colors.bgSoft, "#aaddff", 0.5),
    mistMid: lerp(colors.bgSoft, "#aaddff", 0.35),

    // ── Trees & ground (near-black, slight bg tint) ───────────────────────────
    treeColor: darken(colors.bg, 0.05),
    treeColorDark: darken(colors.bg, 0.1),
    treeColorBack: darken(colors.bg, 0.02),

    // ── Vignette (always pure black) ──────────────────────────────────────────
    vignetteColor: BLACK,
  };
}
