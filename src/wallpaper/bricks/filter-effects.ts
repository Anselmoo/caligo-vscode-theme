/**
 * Filter-effect bricks — SVG filter-based visual effects.
 * Emboss, glitch, chromatic aberration, halftone, scanlines, bokeh,
 * frosted glass, neon glow, metallic sheen, plasma, etch, stipple,
 * solarize, vintage film, and data mesh.
 */
import type { BrickOutput, BrickParams } from "../types.js";

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────

function seedRng(seed: number) {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Convert hex color to normalised [0-1] RGB tuple. */
function hexToNorm(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

/** Scale a value relative to a 2160-reference canvas. */
function s(val: number, scale: number): string {
  return ((val * scale) / 2160).toFixed(1);
}

// ─── 1. Emboss Brick ─────────────────────────────────────────────────────────

export interface EmbossBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Centre X as fraction of width (0-1) */
  cx?: number;
  /** Centre Y as fraction of height (0-1) */
  cy?: number;
  /** Radius as fraction of max(width, height) */
  size?: number;
  /** Controls the strength of the emboss relief (default 4) */
  surfaceScale?: number;
  /** Sun azimuth for the specular light in degrees (default 215) */
  lightAngle?: number;
}

/** Embossed surface texture — feSpecularLighting on a blurred alpha shape. */
export function embossBrick(params: BrickParams, options: EmbossBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "emboss",
    color,
    opacity = 0.35,
    cx = 0.5,
    cy = 0.5,
    size = 0.25,
    surfaceScale = 4,
    lightAngle = 215,
  } = options;

  const pcx = (cx * width).toFixed(1);
  const pcy = (cy * height).toFixed(1);
  const pr = (size * scale).toFixed(1);
  const blurSd = s(6, scale);

  const filterId = `${id}-f`;
  const defs = `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="linearRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${blurSd}" result="blurred"/>
  <feSpecularLighting in="blurred" surfaceScale="${surfaceScale}" specularConstant="0.6" specularExponent="20" result="specLit" lighting-color="${color}">
    <feDistantLight azimuth="${lightAngle}" elevation="35"/>
  </feSpecularLighting>
  <feComposite in="specLit" in2="SourceAlpha" operator="in"/>
</filter>`;

  const elements = `<circle cx="${pcx}" cy="${pcy}" r="${pr}" fill="${color}" opacity="${opacity}" filter="url(#${filterId})"/>`;

  return { defs, elements };
}

// ─── 2. Glitch Brick ─────────────────────────────────────────────────────────

export interface GlitchBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Number of glitch bands (default 5) */
  bandCount?: number;
  /** Displacement intensity as fraction of scale (default 0.02) */
  intensity?: number;
}

/** Horizontal displacement bands — glitch distortion using feDisplacementMap. */
export function glitchBrick(params: BrickParams, options: GlitchBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const { id = "glitch", color, opacity = 0.25, bandCount = 5, intensity = 0.02 } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-glitch`));
  const dispScale = (intensity * scale).toFixed(1);
  const turbFreqY = (bandCount / height).toFixed(6);

  const filterId = `${id}-f`;
  const defs = `<filter id="${filterId}" x="-10%" y="0" width="120%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.001 ${turbFreqY}" numOctaves="1" seed="${(rng() * 9999) | 0}" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="${dispScale}" xChannelSelector="R" yChannelSelector="R"/>
</filter>`;

  const elems: string[] = [];
  const bandH = height / bandCount;
  for (let i = 0; i < bandCount; i++) {
    const by = (i * bandH).toFixed(1);
    const bh = bandH.toFixed(1);
    const shift = ((rng() - 0.5) * intensity * scale).toFixed(1);
    const a = (0.4 + rng() * 0.6) * opacity;
    elems.push(
      `<rect x="${shift}" y="${by}" width="${width}" height="${bh}" fill="${color}" opacity="${a.toFixed(3)}"/>`
    );
  }

  return {
    defs,
    elements: `<g id="${id}" filter="url(#${filterId})">\n${elems.join("\n")}\n</g>`,
  };
}

// ─── 3. Chromatic Aberration Brick ───────────────────────────────────────────

export interface ChromaticAberrationBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Pixel offset amount as fraction of scale (default 0.004) */
  offsetAmount?: number;
}

/** RGB channel split — three offset layers tinted to R, G, B via feColorMatrix. */
export function chromaticAberrationBrick(
  params: BrickParams,
  options: ChromaticAberrationBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const { id = "chroma-ab", color, opacity = 0.15, offsetAmount = 0.004 } = options;

  const off = (offsetAmount * scale).toFixed(1);
  const negOff = (-offsetAmount * scale).toFixed(1);
  const [cr, cg, cb] = hexToNorm(color);

  // Red channel: offset left, Green channel: centred, Blue channel: offset right
  const rFilter = `${id}-r`;
  const gFilter = `${id}-g`;
  const bFilter = `${id}-b`;

  const defs = [
    `<filter id="${rFilter}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feOffset dx="${negOff}" dy="0" in="SourceGraphic" result="shifted"/>
  <feColorMatrix in="shifted" type="matrix" values="${cr.toFixed(3)} 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
</filter>`,
    `<filter id="${gFilter}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 ${cg.toFixed(3)} 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
</filter>`,
    `<filter id="${bFilter}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feOffset dx="${off}" dy="0" in="SourceGraphic" result="shifted"/>
  <feColorMatrix in="shifted" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 ${cb.toFixed(3)} 0 0  0 0 0 1 0"/>
</filter>`,
  ].join("\n");

  const elements = [
    `<rect width="${width}" height="${height}" fill="${color}" opacity="${opacity}" filter="url(#${rFilter})"/>`,
    `<rect width="${width}" height="${height}" fill="${color}" opacity="${opacity}" filter="url(#${gFilter})"/>`,
    `<rect width="${width}" height="${height}" fill="${color}" opacity="${opacity}" filter="url(#${bFilter})"/>`,
  ].join("\n");

  return { defs, elements };
}

// ─── 4. Halftone Brick ──────────────────────────────────────────────────────

export interface HalftoneBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Dot radius as fraction of scale (default 0.002) */
  dotSize?: number;
  /** Spacing between dot centres as fraction of scale (default 0.008) */
  spacing?: number;
}

/** Ben-Day dot pattern — repeating circle pattern inside a rect. */
export function halftoneBrick(params: BrickParams, options: HalftoneBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const { id = "halftone", color, opacity = 0.12, dotSize = 0.002, spacing = 0.008 } = options;

  const dr = (dotSize * scale).toFixed(2);
  const sp = (spacing * scale).toFixed(2);
  const halfSp = (spacing * scale * 0.5).toFixed(2);

  const patId = `${id}-pat`;
  const defs = `<pattern id="${patId}" x="0" y="0" width="${sp}" height="${sp}" patternUnits="userSpaceOnUse">
  <circle cx="${halfSp}" cy="${halfSp}" r="${dr}" fill="${color}"/>
</pattern>`;

  const elements = `<rect id="${id}" width="${width}" height="${height}" fill="url(#${patId})" opacity="${opacity}"/>`;

  return { defs, elements };
}

// ─── 5. Scanline Brick ──────────────────────────────────────────────────────

export interface ScanlineBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Spacing between scanlines as fraction of scale (default 0.003) */
  lineSpacing?: number;
  /** Line height as fraction of scale (default 0.001) */
  lineHeight?: number;
}

/** Horizontal scanline overlay — repeating thin rects across the viewport. */
export function scanlineBrick(params: BrickParams, options: ScanlineBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "scanlines",
    color,
    opacity = 0.08,
    lineSpacing = 0.003,
    lineHeight = 0.001,
  } = options;

  const sp = (lineSpacing * scale).toFixed(2);
  const lh = (lineHeight * scale).toFixed(2);

  const patId = `${id}-pat`;
  const defs = `<pattern id="${patId}" x="0" y="0" width="${width}" height="${sp}" patternUnits="userSpaceOnUse">
  <rect x="0" y="0" width="${width}" height="${lh}" fill="${color}"/>
</pattern>`;

  const elements = `<rect id="${id}" width="${width}" height="${height}" fill="url(#${patId})" opacity="${opacity}"/>`;

  return { defs, elements };
}

// ─── 6. Bokeh Brick ─────────────────────────────────────────────────────────

export interface BokehBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Number of bokeh circles (default 30) */
  count?: number;
  /** Minimum radius as fraction of scale (default 0.01) */
  minRadius?: number;
  /** Maximum radius as fraction of scale (default 0.05) */
  maxRadius?: number;
  /** Gaussian blur standard deviation as fraction of scale (default 0.008) */
  blurAmount?: number;
}

/** Scattered blurred circles at various sizes and opacities — bokeh effect. */
export function bokehBrick(params: BrickParams, options: BokehBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "bokeh",
    color,
    opacity = 0.2,
    count = 30,
    minRadius = 0.01,
    maxRadius = 0.05,
    blurAmount = 0.008,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-bokeh`));
  const blurSd = (blurAmount * scale).toFixed(1);

  const filterId = `${id}-blur`;
  const defs = `<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blurSd}"/></filter>`;

  const elems: string[] = [];
  for (let i = 0; i < count; i++) {
    const cx = (rng() * width).toFixed(1);
    const cy = (rng() * height).toFixed(1);
    const r = ((minRadius + rng() * (maxRadius - minRadius)) * scale).toFixed(1);
    const a = ((0.3 + rng() * 0.7) * opacity).toFixed(3);
    elems.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${a}" filter="url(#${filterId})"/>`
    );
  }

  return {
    defs,
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// ─── 7. Frosted Glass Brick ─────────────────────────────────────────────────

export interface FrostedGlassBrickOptions {
  id?: string;
  color?: string;
  opacity?: number;
  /** Centre X as fraction of width (default 0.5) */
  cx?: number;
  /** Centre Y as fraction of height (default 0.5) */
  cy?: number;
  /** Width as fraction of viewport width (default 0.4) */
  width?: number;
  /** Height as fraction of viewport height (default 0.3) */
  height?: number;
  /** Blur radius as fraction of scale (default 0.012) */
  blurRadius?: number;
}

/** Frosted glass region — feMorphology dilate + feGaussianBlur on a rect. */
export function frostedGlassBrick(
  params: BrickParams,
  options: FrostedGlassBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width: vw, height: vh } = viewBox;
  const scale = Math.max(vw, vh);
  const {
    id = "frosted",
    color = "#ffffff",
    opacity = 0.06,
    cx = 0.5,
    cy = 0.5,
    width = 0.4,
    height = 0.3,
    blurRadius = 0.012,
  } = options;

  const rx = (cx * vw - (width * vw) / 2).toFixed(1);
  const ry = (cy * vh - (height * vh) / 2).toFixed(1);
  const rw = (width * vw).toFixed(1);
  const rh = (height * vh).toFixed(1);
  const blurSd = (blurRadius * scale).toFixed(1);
  const dilateR = s(2, scale);

  const filterId = `${id}-f`;
  const defs = `<filter id="${filterId}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feMorphology in="SourceGraphic" operator="dilate" radius="${dilateR}" result="dilated"/>
  <feGaussianBlur in="dilated" stdDeviation="${blurSd}" result="blurred"/>
  <feFlood flood-color="${color}" flood-opacity="${opacity}" result="tint"/>
  <feComposite in="tint" in2="blurred" operator="over"/>
</filter>`;

  const elements = `<rect id="${id}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${color}" opacity="${opacity}" filter="url(#${filterId})"/>`;

  return { defs, elements };
}

// ─── 8. Neon Glow Brick ─────────────────────────────────────────────────────

export interface NeonGlowBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Shape to glow: "circle" or "rect" (default "circle") */
  shape?: "circle" | "rect";
  /** Centre X as fraction of width (default 0.5) */
  cx?: number;
  /** Centre Y as fraction of height (default 0.5) */
  cy?: number;
  /** Size as fraction of scale (default 0.15) */
  size?: number;
  /** Glow blur radius as fraction of scale (default 0.015) */
  glowRadius?: number;
}

/** Neon glow — bright gaussian blur halo behind a sharp stroke shape. */
export function neonGlowBrick(params: BrickParams, options: NeonGlowBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "neon",
    color,
    opacity = 0.7,
    shape = "circle",
    cx = 0.5,
    cy = 0.5,
    size = 0.15,
    glowRadius = 0.015,
  } = options;

  const pcx = (cx * width).toFixed(1);
  const pcy = (cy * height).toFixed(1);
  const ps = (size * scale).toFixed(1);
  const sw = s(3, scale);
  const glowSd = (glowRadius * scale).toFixed(1);

  const glowFilterId = `${id}-glow`;
  const defs = `<filter id="${glowFilterId}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${glowSd}"/></filter>`;

  let glowShape: string;
  let sharpShape: string;

  if (shape === "rect") {
    const rx = (cx * width - size * scale * 0.5).toFixed(1);
    const ry = (cy * height - size * scale * 0.5).toFixed(1);
    glowShape = `<rect x="${rx}" y="${ry}" width="${ps}" height="${ps}" fill="none" stroke="${color}" stroke-width="${s(6, scale)}" opacity="${(opacity * 0.6).toFixed(3)}" filter="url(#${glowFilterId})"/>`;
    sharpShape = `<rect x="${rx}" y="${ry}" width="${ps}" height="${ps}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity.toFixed(3)}"/>`;
  } else {
    glowShape = `<circle cx="${pcx}" cy="${pcy}" r="${ps}" fill="none" stroke="${color}" stroke-width="${s(6, scale)}" opacity="${(opacity * 0.6).toFixed(3)}" filter="url(#${glowFilterId})"/>`;
    sharpShape = `<circle cx="${pcx}" cy="${pcy}" r="${ps}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity.toFixed(3)}"/>`;
  }

  return {
    defs,
    elements: `<g id="${id}">\n${glowShape}\n${sharpShape}\n</g>`,
  };
}

// ─── 9. Metallic Brick ──────────────────────────────────────────────────────

export interface MetallicBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Centre X as fraction of width (default 0.5) */
  cx?: number;
  /** Centre Y as fraction of height (default 0.5) */
  cy?: number;
  /** Width as fraction of viewport width (default 0.3) */
  width?: number;
  /** Height as fraction of viewport height (default 0.2) */
  height?: number;
  /** Light position: "left" | "center" | "right" (default "left") */
  lightPosition?: "left" | "center" | "right";
}

/** Metallic sheen — feSpecularLighting + feComposite with a gradient. */
export function metallicBrick(params: BrickParams, options: MetallicBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width: vw, height: vh } = viewBox;
  const scale = Math.max(vw, vh);
  const {
    id = "metallic",
    color,
    opacity = 0.3,
    cx = 0.5,
    cy = 0.5,
    width = 0.3,
    height = 0.2,
    lightPosition = "left",
  } = options;

  const rx = (cx * vw - (width * vw) / 2).toFixed(1);
  const ry = (cy * vh - (height * vh) / 2).toFixed(1);
  const rw = (width * vw).toFixed(1);
  const rh = (height * vh).toFixed(1);

  const azimuthMap = { left: 215, center: 270, right: 325 };
  const azimuth = azimuthMap[lightPosition];

  const filterId = `${id}-f`;
  const gradId = `${id}-grad`;
  const defs = [
    `<filter id="${filterId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.02" numOctaves="3" seed="17" result="bump"/>
  <feSpecularLighting in="bump" surfaceScale="3" specularConstant="0.75" specularExponent="28" result="specLit" lighting-color="#ffffff">
    <feDistantLight azimuth="${azimuth}" elevation="40"/>
  </feSpecularLighting>
  <feComposite in="specLit" in2="SourceGraphic" operator="in"/>
</filter>`,
    `<linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>
  <stop offset="50%" stop-color="${color}" stop-opacity="0.4"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0.8"/>
</linearGradient>`,
  ].join("\n");

  const elements = [
    `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="url(#${gradId})" opacity="${opacity}"/>`,
    `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${color}" opacity="${(opacity * 0.5).toFixed(3)}" filter="url(#${filterId})"/>`,
  ].join("\n");

  return { defs, elements };
}

// ─── 10. Plasma Effect Brick ────────────────────────────────────────────────

export interface PlasmaEffectBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Turbulence base frequency (default 0.005) */
  frequency?: number;
  /** feTurbulence seed (default 42) */
  seed?: number;
}

/** Plasma texture — feTurbulence mapped through feColorMatrix for coloured plasma. */
export function plasmaEffectBrick(
  params: BrickParams,
  options: PlasmaEffectBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { id = "plasma", color, opacity = 0.2, frequency = 0.005, seed = 42 } = options;

  const [cr, cg, cb] = hexToNorm(color);

  const filterId = `${id}-f`;
  const defs = `<filter id="${filterId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="turbulence" baseFrequency="${frequency} ${(frequency * 0.8).toFixed(4)}" numOctaves="5" seed="${seed}" result="turb"/>
  <feColorMatrix in="turb" type="matrix" values="0 0 0 0 ${cr.toFixed(4)}  0 0 0 0 ${cg.toFixed(4)}  0 0 0 0 ${cb.toFixed(4)}  0 0 0 3.5 -1.2" result="tinted"/>
  <feGaussianBlur in="tinted" stdDeviation="2"/>
</filter>`;

  const elements = `<rect id="${id}" width="${width}" height="${height}" opacity="${opacity}" filter="url(#${filterId})"/>`;

  return { defs, elements };
}

// ─── 11. Etch Brick ─────────────────────────────────────────────────────────

export interface EtchBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Turbulence frequency — high values produce fine lines (default 0.08) */
  frequency?: number;
}

/** Fine line engraving texture — high-frequency feTurbulence + feComponentTransfer. */
export function etchBrick(params: BrickParams, options: EtchBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { id = "etch", color, opacity = 0.1, frequency = 0.08 } = options;

  const [cr, cg, cb] = hexToNorm(color);

  const filterId = `${id}-f`;
  const defs = `<filter id="${filterId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${frequency} ${(frequency * 0.15).toFixed(4)}" numOctaves="2" stitchTiles="stitch" seed="53" result="noise"/>
  <feComponentTransfer in="noise" result="lines">
    <feFuncR type="discrete" tableValues="0 0 0 0 1 1 0 0"/>
    <feFuncG type="discrete" tableValues="0 0 0 0 1 1 0 0"/>
    <feFuncB type="discrete" tableValues="0 0 0 0 1 1 0 0"/>
    <feFuncA type="linear" slope="1.5" intercept="-0.3"/>
  </feComponentTransfer>
  <feColorMatrix in="lines" type="matrix" values="0 0 0 0 ${cr.toFixed(4)}  0 0 0 0 ${cg.toFixed(4)}  0 0 0 0 ${cb.toFixed(4)}  0 0 0 1 0"/>
</filter>`;

  const elements = `<rect id="${id}" width="${width}" height="${height}" opacity="${opacity}" filter="url(#${filterId})"/>`;

  return { defs, elements };
}

// ─── 12. Stipple Brick ──────────────────────────────────────────────────────

export interface StippleBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Number of stipple dots (default 400) */
  count?: number;
  /** Minimum dot radius as fraction of scale (default 0.0005) */
  minR?: number;
  /** Maximum dot radius as fraction of scale (default 0.002) */
  maxR?: number;
}

/** Pointillism dots — many tiny filled circles scattered via PRNG. */
export function stippleBrick(params: BrickParams, options: StippleBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "stipple",
    color,
    opacity = 0.3,
    count = 400,
    minR = 0.0005,
    maxR = 0.002,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-stipple`));
  const elems: string[] = [];

  for (let i = 0; i < count; i++) {
    const cx = (rng() * width).toFixed(1);
    const cy = (rng() * height).toFixed(1);
    const r = ((minR + rng() * (maxR - minR)) * scale).toFixed(2);
    const a = ((0.4 + rng() * 0.6) * opacity).toFixed(3);
    elems.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${a}"/>`);
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// ─── 13. Solarize Brick ─────────────────────────────────────────────────────

export interface SolarizeBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Solarization intensity — controls the inversion curve steepness (default 0.6) */
  intensity?: number;
}

/** Solarize effect — feComponentTransfer with partial inversion applied to a coloured rect. */
export function solarizeBrick(params: BrickParams, options: SolarizeBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { id = "solarize", color, opacity = 0.15, intensity = 0.6 } = options;

  // Build a custom table that creates a partial inversion curve:
  // values go 0 → peak → dip → 1, with intensity controlling the dip depth
  const dip = (1 - intensity).toFixed(3);
  const mid = ((1 + intensity) / 2).toFixed(3);
  const tableValues = `0 ${mid} 1 ${dip} ${mid} 1`;

  const filterId = `${id}-f`;
  const defs = `<filter id="${filterId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feComponentTransfer>
    <feFuncR type="table" tableValues="${tableValues}"/>
    <feFuncG type="table" tableValues="${tableValues}"/>
    <feFuncB type="table" tableValues="${tableValues}"/>
  </feComponentTransfer>
</filter>`;

  const elements = `<rect id="${id}" width="${width}" height="${height}" fill="${color}" opacity="${opacity}" filter="url(#${filterId})"/>`;

  return { defs, elements };
}

// ─── 14. Vintage Film Brick ─────────────────────────────────────────────────

export interface VintageFilmBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Grain turbulence frequency (default 0.65) */
  grainFrequency?: number;
}

/** Sepia-tinted grain overlay — feTurbulence + feColorMatrix sepia + low opacity. */
export function vintageFilmBrick(
  params: BrickParams,
  options: VintageFilmBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { id = "vintage", color, opacity = 0.12, grainFrequency = 0.65 } = options;

  const [cr, cg, cb] = hexToNorm(color);

  // Sepia matrix tinted toward the provided colour
  const rr = (0.393 + cr * 0.2).toFixed(4);
  const rg = (0.349 + cg * 0.1).toFixed(4);
  const rb = (0.272 + cb * 0.05).toFixed(4);
  const gr = (0.769 * cr).toFixed(4);
  const gg = (0.686 * cg + 0.3).toFixed(4);
  const gb = (0.534 * cb).toFixed(4);
  const br = (0.189 * cr).toFixed(4);
  const bg = (0.168 * cg).toFixed(4);
  const bb = (0.131 + cb * 0.15).toFixed(4);

  const filterId = `${id}-f`;
  const defs = `<filter id="${filterId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${grainFrequency}" numOctaves="4" stitchTiles="stitch" seed="23" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="${rr} ${rg} ${rb} 0 0  ${gr} ${gg} ${gb} 0 0  ${br} ${bg} ${bb} 0 0  0 0 0 0.8 -0.15"/>
</filter>`;

  const elements = `<rect id="${id}" width="${width}" height="${height}" opacity="${opacity}" filter="url(#${filterId})"/>`;

  return { defs, elements };
}

// ─── 15. Data Mesh Brick ────────────────────────────────────────────────────

export interface DataMeshBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Cell size as fraction of scale (default 0.012) */
  cellSize?: number;
  /** Number of columns (default 20) */
  columns?: number;
  /** Number of rows (default 12) */
  rows?: number;
  /** feTurbulence displacement scale as fraction of scale (default 0.008) */
  displacementScale?: number;
}

/** Data mesh — grid of small rects with feTurbulence displacement for corrupted data look. */
export function dataMeshBrick(params: BrickParams, options: DataMeshBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "datamesh",
    color,
    opacity = 0.15,
    cellSize = 0.012,
    columns = 20,
    rows = 12,
    displacementScale = 0.008,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-datamesh`));
  const cs = cellSize * scale;
  const dispSc = (displacementScale * scale).toFixed(1);

  // Grid centred in the viewport
  const gridW = columns * cs;
  const gridH = rows * cs;
  const ox = (width - gridW) / 2;
  const oy = (height - gridH) / 2;

  const filterId = `${id}-f`;
  const defs = `<filter id="${filterId}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feTurbulence type="turbulence" baseFrequency="0.02 0.03" numOctaves="3" seed="${(rng() * 9999) | 0}" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="${dispSc}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;

  const elems: string[] = [];
  const gap = cs * 0.15;
  const cellDraw = cs - gap;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const x = (ox + c * cs).toFixed(1);
      const y = (oy + r * cs).toFixed(1);
      const a = ((0.3 + rng() * 0.7) * opacity).toFixed(3);
      elems.push(
        `<rect x="${x}" y="${y}" width="${cellDraw.toFixed(1)}" height="${cellDraw.toFixed(1)}" fill="${color}" opacity="${a}"/>`
      );
    }
  }

  return {
    defs,
    elements: `<g id="${id}" filter="url(#${filterId})">\n${elems.join("\n")}\n</g>`,
  };
}
