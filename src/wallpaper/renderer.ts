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
import { mergeBricks, toSvgDocument } from "./composer.js";
import { MODE_COMPOSERS } from "./modes/index.js";
import { MOTIFS } from "./motifs/index.js";
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeHex(hex: string): string | null {
  const trimmed = hex.trim();
  if (/^#?[\da-f]{3}$/i.test(trimmed)) {
    const short = trimmed.replace("#", "");
    return `#${short
      .split("")
      .map(char => `${char}${char}`)
      .join("")}`;
  }
  if (/^#?[\da-f]{6}$/i.test(trimmed)) {
    return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  }
  return null;
}

function blendHex(color: string, shadow: string, shadowRatio: number): string {
  const normalizedColor = normalizeHex(color);
  const normalizedShadow = normalizeHex(shadow);
  if (!normalizedColor || !normalizedShadow) {
    return color;
  }

  const mix = clamp01(shadowRatio);
  const toRgb = (hex: string) => {
    const clean = hex.slice(1);
    return {
      r: Number.parseInt(clean.slice(0, 2), 16),
      g: Number.parseInt(clean.slice(2, 4), 16),
      b: Number.parseInt(clean.slice(4, 6), 16),
    };
  };
  const fromRgb = ({ r, g, b }: { r: number; g: number; b: number }) =>
    `#${[r, g, b].map(channel => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

  const base = toRgb(normalizedColor);
  const tint = toRgb(normalizedShadow);
  return fromRgb({
    r: base.r * (1 - mix) + tint.r * mix,
    g: base.g * (1 - mix) + tint.g * mix,
    b: base.b * (1 - mix) + tint.b * mix,
  });
}

function weatherColor(color: string, shadow: string, amount: number): string {
  return blendHex(color, shadow, amount);
}

export function extractWallpaperColors(palette: DerivedPalette): WallpaperColors {
  const deepen = (color: string, amount: number, shadow = palette.bg0) =>
    weatherColor(color, shadow, amount);

  return {
    bg: palette.bg0,
    bgSoft: palette.bg1,
    bgMid: palette.bg2,
    accent: deepen(palette.accent, 0.14, palette.bg1),
    accentSoft: deepen(palette.accentSoft, 0.18, palette.bg1),
    accentMuted: deepen(palette.accentMuted, 0.1, palette.bg1),
    hueRed: deepen(palette.hueRed, 0.2, palette.bg1),
    hueOrange: deepen(palette.hueOrange, 0.17, palette.bg1),
    hueYellow: deepen(palette.hueYellow, 0.22, palette.bg1),
    hueGreen: deepen(palette.hueGreen, 0.16, palette.bg1),
    hueCyan: deepen(palette.hueCyan, 0.18, palette.bg1),
    hueBlue: deepen(palette.hueBlue, 0.18, palette.bg1),
    huePurple: deepen(palette.huePurple, 0.2, palette.bg1),
    strings: deepen(palette.harmony.strings, 0.12, palette.bg1),
    keywords: deepen(palette.harmony.keywords, 0.12, palette.bg1),
    functions: deepen(palette.harmony.functions, 0.12, palette.bg1),
    types: deepen(palette.harmony.types, 0.12, palette.bg1),
    variables: deepen(palette.harmony.variables, 0.1, palette.bg1),
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

  // Compose: motif → mode overlay
  const motifFn = MOTIFS[seedId];
  if (!motifFn) {
    throw new Error(`No motif registered for seedId "${seedId}"`);
  }
  const motifResult = motifFn(params);

  const modeComposer = MODE_COMPOSERS[harmonyMode] ?? MODE_COMPOSERS.none;
  const withMode = modeComposer(motifResult, params);

  // Optionally inject text
  let finalComposed = withMode;
  if (textVariant === "text") {
    const topic = MODE_TOPICS[harmonyMode] ?? "Core";
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
    const topic = MODE_TOPICS[seed.harmonyMode] ?? "Core";
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
