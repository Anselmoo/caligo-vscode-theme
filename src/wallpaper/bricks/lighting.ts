/**
 * Shared 3D lighting utilities — Bob Ross Drama Model.
 *
 * Every brick representing a physical object should use these helpers
 * for consistent directional lighting, atmospheric perspective, rim
 * highlights, and base shadows.
 *
 * Sun: upper-left (azimuth 215°, elevation 35°)
 * Warm highlights → cool shadows for depth.
 */
import type { ViewBox } from "../types.js";

// ─── Global Light Parameters ─────────────────────────────────────────────────

export const SUN_AZIMUTH = 215;
export const SUN_ELEVATION = 35;
export const WARM_HIGHLIGHT = "#fff0d0";
export const COOL_SHADOW = "#0a1020";

// ─── Directional Gradient ────────────────────────────────────────────────────

export interface DirectionalGradientOptions {
  id: string;
  /** Base surface color */
  color: string;
  /** Lit-side brightness boost (0–1, default 0.15) */
  litBoost?: number;
  /** Shadow-side darkening (0–1, default 0.35) */
  shadowDarken?: number;
  /** Override gradient angle in degrees (default: follows SUN_AZIMUTH) */
  angleDeg?: number;
  /** Warm highlight color override */
  warmColor?: string;
  /** Cool shadow color override */
  coolColor?: string;
}

/**
 * Creates a SVG `<linearGradient>` that goes from warm-lit to cool-shadow
 * across the sun direction. Returns the defs string.
 *
 * Usage: apply `fill="url(#${id})"` to any shape.
 */
export function directionalGradient(options: DirectionalGradientOptions): string {
  const {
    id,
    color,
    litBoost = 0.15,
    shadowDarken = 0.35,
    angleDeg = SUN_AZIMUTH - 180, // gradient runs FROM the sun
    warmColor = WARM_HIGHLIGHT,
    coolColor = COOL_SHADOW,
  } = options;

  const rad = (angleDeg * Math.PI) / 180;
  const x1 = (50 + Math.cos(rad) * 50).toFixed(0);
  const y1 = (50 + Math.sin(rad) * 50).toFixed(0);
  const x2 = (50 - Math.cos(rad) * 50).toFixed(0);
  const y2 = (50 - Math.sin(rad) * 50).toFixed(0);

  return `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
  <stop offset="0%" stop-color="${warmColor}" stop-opacity="${litBoost.toFixed(3)}"/>
  <stop offset="35%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="65%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="100%" stop-color="${coolColor}" stop-opacity="${shadowDarken.toFixed(3)}"/>
</linearGradient>`;
}

// ─── Rim Highlight ───────────────────────────────────────────────────────────

export interface RimHighlightOptions {
  /** SVG path data of the contour to highlight */
  pathD: string;
  /** Unique filter id */
  id: string;
  /** Highlight color (default: WARM_HIGHLIGHT) */
  color?: string;
  /** Opacity (default: 0.25) */
  opacity?: number;
  /** Stroke width in pixels (default: 2) */
  strokeWidth?: number;
  /** Blur radius for soft glow (default: 3) */
  blurRadius?: number;
  /** Optional clip-path id */
  clipId?: string;
}

/**
 * Creates a glowing rim highlight stroke along a path, with soft blur.
 * Returns { defs, elements }.
 */
export function rimHighlight(options: RimHighlightOptions): { defs: string; elements: string } {
  const {
    pathD,
    id,
    color = WARM_HIGHLIGHT,
    opacity = 0.25,
    strokeWidth = 2,
    blurRadius = 3,
    clipId,
  } = options;

  const filterId = `${id}-glow`;
  const clip = clipId ? ` clip-path="url(#${clipId})"` : "";

  const defs = `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blurRadius}"/></filter>`;

  const elements = [
    // Outer glow (wide, soft, dim)
    `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${(strokeWidth * 3).toFixed(1)}" opacity="${(opacity * 0.4).toFixed(3)}" stroke-linecap="round" filter="url(#${filterId})"${clip}/>`,
    // Core highlight (thin, bright)
    `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${strokeWidth.toFixed(1)}" opacity="${opacity.toFixed(3)}" stroke-linecap="round"${clip}/>`,
  ].join("\n");

  return { defs, elements };
}

// ─── Atmospheric Haze ────────────────────────────────────────────────────────

export interface AtmosphericHazeOptions {
  id: string;
  viewBox: ViewBox;
  /** Y position (0–1 fraction of height) where haze band sits */
  y: number;
  /** Height of haze band (0–1 fraction, default 0.08) */
  bandHeight?: number;
  /** Haze color (default: bg-like dark blue) */
  color?: string;
  /** Opacity (default: 0.12) */
  opacity?: number;
  /** Blur the haze vertically (default: 10) */
  blur?: number;
}

/**
 * Creates a semi-transparent fog/haze rectangle between depth layers.
 * Place between far and near layers for atmospheric perspective.
 */
export function atmosphericHaze(options: AtmosphericHazeOptions): {
  defs?: string;
  elements: string;
} {
  const {
    id,
    viewBox,
    y,
    bandHeight = 0.08,
    color = "#0c1420",
    opacity = 0.12,
    blur = 10,
  } = options;

  const py = (y * viewBox.height).toFixed(0);
  const ph = (bandHeight * viewBox.height).toFixed(0);
  const filterId = `${id}-hblur`;

  const defs = `<filter id="${filterId}" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="0 ${blur}"/></filter>`;

  const elements = `<rect id="${id}" x="0" y="${py}" width="${viewBox.width}" height="${ph}" fill="${color}" opacity="${opacity}" filter="url(#${filterId})"/>`;

  return { defs, elements };
}

// ─── Base Shadow ─────────────────────────────────────────────────────────────

export interface BaseShadowOptions {
  id: string;
  /** Center X in pixels */
  cx: number;
  /** Y position at the base of the object (pixels) */
  baseY: number;
  /** Shadow spread width (pixels) */
  width: number;
  /** Shadow height/depth (pixels, default: 15) */
  height?: number;
  /** Shadow opacity (default: 0.20) */
  opacity?: number;
}

/**
 * Creates a dark elliptical shadow at the base of an object,
 * grounding it on the surface.
 */
export function baseShadow(options: BaseShadowOptions): { defs: string; elements: string } {
  const { id, cx, baseY, width, height = 15, opacity = 0.2 } = options;

  const gradId = `${id}-grad`;
  const defs = `<radialGradient id="${gradId}" cx="50%" cy="30%" r="50%">
  <stop offset="0%" stop-color="#000000" stop-opacity="${opacity.toFixed(3)}"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
</radialGradient>`;

  const elements = `<ellipse cx="${cx.toFixed(0)}" cy="${(baseY + height * 0.3).toFixed(0)}" rx="${(width * 0.5).toFixed(0)}" ry="${height.toFixed(0)}" fill="url(#${gradId})"/>`;

  return { defs, elements };
}

// ─── 3D Surface Filter ──────────────────────────────────────────────────────

export interface SurfaceTextureOptions {
  id: string;
  /** Surface type controls default parameters */
  type: "rock" | "sand" | "water" | "snow" | "earth";
  /** Override surfaceScale (default: varies by type) */
  surfaceScale?: number;
  /** Override base frequency (default: varies by type) */
  baseFrequency?: string;
  /** Seed for feTurbulence */
  seed?: number;
  /** Lighting color (default: varies by type) */
  lightingColor?: string;
}

/**
 * Creates a complete feDiffuseLighting + feSpecularLighting filter
 * for 3D surface texture. Returns the filter defs string.
 *
 * Usage: apply `filter="url(#${id})"` to a rect clipped to the shape.
 */
export function surfaceTextureFilter(options: SurfaceTextureOptions): string {
  const { id, type, seed = 42 } = options;

  const presets: Record<
    string,
    {
      baseFrequency: string;
      surfaceScale: number;
      specScale: number;
      specConstant: number;
      specExponent: number;
      octaves: number;
      lightingColor: string;
    }
  > = {
    rock: {
      baseFrequency: "0.035 0.05",
      surfaceScale: 4,
      specScale: 3,
      specConstant: 0.3,
      specExponent: 12,
      octaves: 6,
      lightingColor: "#806050",
    },
    sand: {
      baseFrequency: "0.10 0.08",
      surfaceScale: 2,
      specScale: 1.5,
      specConstant: 0.2,
      specExponent: 20,
      octaves: 5,
      lightingColor: "#c0a060",
    },
    water: {
      baseFrequency: "0.02 0.06",
      surfaceScale: 1.5,
      specScale: 2.5,
      specConstant: 0.4,
      specExponent: 18,
      octaves: 4,
      lightingColor: "#6080a0",
    },
    snow: {
      baseFrequency: "0.06 0.06",
      surfaceScale: 1.2,
      specScale: 2,
      specConstant: 0.6,
      specExponent: 25,
      octaves: 4,
      lightingColor: "#e0e8f0",
    },
    earth: {
      baseFrequency: "0.05 0.07",
      surfaceScale: 3,
      specScale: 2,
      specConstant: 0.25,
      specExponent: 14,
      octaves: 5,
      lightingColor: "#705040",
    },
  };

  const p = presets[type] || presets.rock;
  const bf = options.baseFrequency || p.baseFrequency;
  const ss = options.surfaceScale ?? p.surfaceScale;
  const lc = options.lightingColor || p.lightingColor;

  return `<filter id="${id}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${bf}" numOctaves="${p.octaves}" seed="${seed}" result="bump"/>
  <feDiffuseLighting in="bump" surfaceScale="${ss}" diffuseConstant="0.7" result="diffLit" lighting-color="${lc}">
    <feDistantLight azimuth="${SUN_AZIMUTH}" elevation="${SUN_ELEVATION}"/>
  </feDiffuseLighting>
  <feComposite in="diffLit" in2="SourceGraphic" operator="in" result="diffClip"/>
  <feSpecularLighting in="bump" surfaceScale="${p.specScale}" specularConstant="${p.specConstant}" specularExponent="${p.specExponent}" result="specLit" lighting-color="${lc}">
    <feDistantLight azimuth="${SUN_AZIMUTH}" elevation="${SUN_ELEVATION}"/>
  </feSpecularLighting>
  <feComposite in="specLit" in2="SourceGraphic" operator="in" result="specClip"/>
  <feMerge>
    <feMergeNode in="diffClip"/>
    <feMergeNode in="specClip"/>
  </feMerge>
</filter>`;
}
