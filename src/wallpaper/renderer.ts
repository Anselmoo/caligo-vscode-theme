/**
 * Wallpaper Renderer
 *
 * Main entry point: seed + harmonyMode + platform + textVariant → SVG string.
 *
 * Pipeline:
 *   1. derivePalette(seed, themeMode) — get OKLCH-derived hex palette
 *   2. extractWallpaperColors(palette) — pick the fields we need
 *   3. MOTIFS[seedId](brickParams) → motif ComposedWallpaper
 *   4. MODE_COMPOSERS[harmonyMode](motif, params) → composed with mode overlay
 *   5. Optionally inject textBrick
 *   6. toSvgDocument(composed, viewBox) → final SVG string
 */

import { textBrick } from "./bricks/index.js";
import { composeSeedWallpaper } from "./compose.js";
import { mergeBricks, toSvgDocument } from "./composer.js";
import { MODE_COMPOSERS } from "./modes/index.js";
import type {
  BrickParams,
  Platform,
  TextVariant,
  WallpaperColors,
  WallpaperSpec,
} from "./types.js";
import { MODE_TOPICS, PLATFORM_SIZES } from "./types.js";

// ─── Palette extraction ───────────────────────────────────────────────────────

import type { DerivedPalette } from "../lib/palette.js";

export function extractWallpaperColors(palette: DerivedPalette): WallpaperColors {
  const h = palette.harmony;
  // For non-"none" modes the decorative wheel hues cluster near the base hue
  // (e.g. all within ±40° for analogous). Map hue* slots to the harmony
  // palette instead so every layer gets a genuinely diverse color.
  const isNone = h.mode === "none";
  return {
    bg: palette.bg0,
    bgSoft: palette.bg1,
    bgMid: palette.bg2,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    accentMuted: palette.accentMuted,
    hueRed: isNone ? palette.hueRed : h.tags,
    hueOrange: isNone ? palette.hueOrange : h.numbers,
    hueYellow: isNone ? palette.hueYellow : h.constants,
    hueGreen: isNone ? palette.hueGreen : h.strings,
    hueCyan: isNone ? palette.hueCyan : h.types,
    hueBlue: isNone ? palette.hueBlue : h.functions,
    huePurple: isNone ? palette.huePurple : h.keywords,
    strings: h.strings,
    keywords: h.keywords,
    functions: h.functions,
    types: h.types,
    variables: h.variables,
    // These 4 roles always have well-spread hues regardless of harmony mode
    constants: h.constants,
    numbers: h.numbers,
    tags: h.tags,
    attributes: h.attributes,
  };
}

// ─── Core render function ─────────────────────────────────────────────────────

export interface RenderWallpaperOptions {
  palette: DerivedPalette;
  spec: WallpaperSpec;
}

/**
 * Renders a single wallpaper SVG string.
 * Call this function for each of the 300 spec combinations.
 */
export function renderWallpaperSvg(options: RenderWallpaperOptions): string {
  const { palette, spec } = options;
  const { seedId, harmonyMode, platform, textVariant } = spec;

  const colors = extractWallpaperColors(palette);
  const viewBox = PLATFORM_SIZES[platform];

  const params: BrickParams = {
    viewBox,
    colors,
    seedId,
    harmonyMode,
    platform,
  };

  // Compose: seed-mapped composition → mode overlay
  const motifResult = composeSeedWallpaper(params);

  const modeComposer = MODE_COMPOSERS[harmonyMode] ?? MODE_COMPOSERS.none;
  const withMode = modeComposer(motifResult, params);

  // Optionally inject text
  let finalComposed = withMode;
  if (textVariant === "text") {
    const topic = MODE_TOPICS[harmonyMode] ?? "Balanced";
    const label = textBrick(params, {
      line1: "Caligo",
      line2: `${spec.seedDisplayName} · ${topic}`,
      position: "bottom-left",
    });
    const merged = mergeBricks([label]);
    finalComposed = {
      defs: [withMode.defs, merged.defs].filter(Boolean).join("\n"),
      elements: [withMode.elements, merged.elements].filter(Boolean).join("\n"),
    };
  }

  return toSvgDocument(finalComposed, viewBox);
}

// ─── Spec builder helpers ────────────────────────────────────────────────────

/** All 300 specs (50 seed×mode × 3 platforms × 2 text variants) */
export function buildAllSpecs(
  seeds: Array<{ id: string; displayName: string; harmonyMode: string }>
): WallpaperSpec[] {
  const platforms: Platform[] = ["monitor", "tablet", "mobile"];
  const textVariants: TextVariant[] = ["no-text", "text"];
  const specs: WallpaperSpec[] = [];

  for (const seed of seeds) {
    const topic = MODE_TOPICS[seed.harmonyMode] ?? "Balanced";
    for (const platform of platforms) {
      for (const textVariant of textVariants) {
        specs.push({
          seedId: seed.id,
          seedDisplayName: seed.displayName,
          harmonyMode: seed.harmonyMode,
          topic,
          platform,
          textVariant,
          displayName: `${seed.displayName} · ${topic}`,
        });
      }
    }
  }

  return specs;
}

/** File path for a wallpaper relative to the public/wallpapers directory */
export function wallpaperFilename(spec: WallpaperSpec, ext: "svg" | "png"): string {
  const mode = spec.harmonyMode === "none" ? "balanced" : spec.harmonyMode;
  const textSuffix = spec.textVariant === "text" ? "-text" : "";
  return `${spec.seedId}/${mode}/${spec.platform}${textSuffix}.${ext}`;
}
