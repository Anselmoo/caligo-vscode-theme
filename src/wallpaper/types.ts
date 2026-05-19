/**
 * Caligo Wallpaper Export — Type Definitions
 *
 * The generation pipeline is: TypeScript bricks → SVG composition → PNG rasterisation.
 * Every brick is a pure function `(BrickParams) → BrickOutput`, enabling lego-style assembly.
 */

// ─── Platform ────────────────────────────────────────────────────────────────

export type Platform = "monitor" | "tablet" | "mobile";
export type TextVariant = "text" | "no-text";

export const PLATFORM_SIZES: Record<Platform, { width: number; height: number }> = {
  monitor: { width: 3840, height: 2160 },
  tablet: { width: 2732, height: 2048 },
  mobile: { width: 1290, height: 2796 },
};

export const PLATFORMS: Platform[] = ["monitor", "tablet", "mobile"];
export const TEXT_VARIANTS: TextVariant[] = ["text", "no-text"];

export interface PlatformSceneTuning {
  /** Multiplier for aurora band count and density */
  auroraBandScale: number;
  /** Positive values push the visual focal band further down the viewport */
  auroraYShift: number;
  /** Compresses or expands the active aurora zone */
  auroraZoneScale: number;
  /** Positive values lift landforms higher into the frame */
  terrainLift: number;
  /** Positive values lift mist/fog layers upward */
  fogLift: number;
  /** Density factor for sparse celestial details */
  starDensity: number;
  /** Scales broad haze so portrait scenes do not feel too empty */
  atmosphereScale: number;
}

export const PLATFORM_SCENE_TUNING: Record<Platform, PlatformSceneTuning> = {
  monitor: {
    auroraBandScale: 1,
    auroraYShift: 0,
    auroraZoneScale: 1,
    terrainLift: 0,
    fogLift: 0,
    starDensity: 1,
    atmosphereScale: 1,
  },
  tablet: {
    auroraBandScale: 0.94,
    auroraYShift: 0.035,
    auroraZoneScale: 0.93,
    terrainLift: 0.04,
    fogLift: 0.025,
    starDensity: 0.92,
    atmosphereScale: 1.04,
  },
  mobile: {
    auroraBandScale: 0.82,
    auroraYShift: 0.08,
    auroraZoneScale: 0.8,
    terrainLift: 0.075,
    fogLift: 0.055,
    starDensity: 0.78,
    atmosphereScale: 1.12,
  },
};

// ─── Mode → Topic ─────────────────────────────────────────────────────────────

/** The five conceptual "topics" that make each harmony mode visually distinct. */
export type ModeTopic = "Stillness" | "Drift" | "Break" | "Void" | "Pulse";

export const MODE_TOPICS: Record<string, ModeTopic> = {
  none: "Stillness",
  analogous: "Drift",
  "split-complementary": "Break",
  monochromatic: "Void",
  triadic: "Pulse",
};

// ─── Color palette (extracted from DerivedPalette) ────────────────────────────

/** Hex colors extracted from a derived palette, ready for SVG use. */
export interface WallpaperColors {
  /** Primary background — darkest surface */
  bg: string;
  /** Secondary background — slightly elevated */
  bgSoft: string;
  /** Tertiary background */
  bgMid: string;
  /** Primary accent */
  accent: string;
  /** Soft accent — for secondary glows */
  accentSoft: string;
  /** Muted accent — for subtle tints */
  accentMuted: string;
  /** Decorative hue wheel colors */
  hueRed: string;
  hueOrange: string;
  hueYellow: string;
  hueGreen: string;
  hueCyan: string;
  hueBlue: string;
  huePurple: string;
  /** Harmony syntax colours */
  strings: string;
  keywords: string;
  functions: string;
  types: string;
  variables: string;
  constants: string;
  numbers: string;
  tags: string;
  attributes: string;
}

// ─── ViewBox ──────────────────────────────────────────────────────────────────

export interface ViewBox {
  width: number;
  height: number;
}

// ─── Brick API ────────────────────────────────────────────────────────────────

/** Parameters available to every brick. */
export interface BrickParams {
  viewBox: ViewBox;
  colors: WallpaperColors;
  /** Seed identifier (e.g. "AuroraNoir") — used for deterministic randomness */
  seedId: string;
  /** Harmony mode (e.g. "analogous") */
  harmonyMode: string;
  platform: Platform;
}

/** Output of a single brick. Defs accumulate in <defs>; elements render in order. */
export interface BrickOutput {
  /** Content to place inside SVG <defs> (gradients, filters, etc.) */
  defs?: string;
  /** SVG elements to render as a layer */
  elements: string;
}

/** A pure function that generates one visual layer as an SVG fragment. */
export type BrickFn = (params: BrickParams) => BrickOutput;

// ─── Composed Wallpaper ───────────────────────────────────────────────────────

/** The result of assembling bricks for one seed+mode combination. */
export interface ComposedWallpaper {
  defs: string;
  elements: string;
}

/**
 * A motif function generates the seed-specific visual identity.
 * It receives BrickParams and returns a composed SVG fragment.
 */
export type MotifFn = (params: BrickParams) => ComposedWallpaper;

/**
 * A mode composer applies the harmonic "topic" (compositional rules)
 * on top of the motif output.
 */
export type ModeComposerFn = (motif: ComposedWallpaper, params: BrickParams) => ComposedWallpaper;

// ─── Wallpaper Spec / Manifest ─────────────────────────────────────────────────

export interface WallpaperSpec {
  seedId: string;
  seedDisplayName: string;
  /** Raw harmony mode key (e.g. "analogous") */
  harmonyMode: string;
  topic: ModeTopic;
  platform: Platform;
  textVariant: TextVariant;
  /** Human-readable name, e.g. "Aurora Noir · Flow" */
  displayName: string;
}

export interface WallpaperManifestEntry extends WallpaperSpec {
  harmonyLabel: string;
  /** Relative path from public root, e.g. "wallpapers/AuroraNoir/analogous/monitor.svg" */
  svgPath: string;
  /** Relative path for the PNG, e.g. "wallpapers/AuroraNoir/analogous/monitor.png" */
  pngPath: string;
  colors: WallpaperColors;
}

export interface WallpapersManifest {
  total: number;
  entries: WallpaperManifestEntry[];
}
