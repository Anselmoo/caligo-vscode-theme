/**
 * Shapes bricks — reusable geometric SVG primitives.
 * Rings, arcs, bands, rays, bezier curtains, and brush strokes.
 */
import { createNoise2D } from "simplex-noise";
import type { BrickOutput, BrickParams } from "../types.js";

// ─── Seeded PRNG (mirrors landscape.ts helpers) ───────────────────────────────

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

// ─── Ring / Arc ───────────────────────────────────────────────────────────────

export interface RingBrickOptions {
  id?: string;
  cx?: number;
  cy?: number;
  r: number;
  strokeWidth?: number;
  color: string;
  opacity?: number;
  /** Optional feGaussianBlur radius for soft halo effect */
  blurRadius?: number;
}

export function ringBrick(params: BrickParams, options: RingBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const {
    cx = 0.5,
    cy = 0.5,
    r,
    strokeWidth = 2,
    color,
    opacity = 0.8,
    id = "ring",
    blurRadius,
  } = options;
  const pcx = (cx * width).toFixed(1);
  const pcy = (cy * height).toFixed(1);
  const scale = Math.max(width, height);
  const filterAttr = blurRadius ? ` filter="url(#${id}-blur)"` : "";
  const defs = blurRadius
    ? `<filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blurRadius}"/></filter>`
    : undefined;
  return {
    defs,
    elements: `<circle id="${id}" cx="${pcx}" cy="${pcy}" r="${(r * scale).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${((strokeWidth * scale) / 2160).toFixed(1)}" opacity="${opacity}"${filterAttr}/>`,
  };
}

export interface ArcBrickOptions {
  id?: string;
  cx?: number;
  cy?: number;
  r: number;
  startDeg: number;
  endDeg: number;
  strokeWidth?: number;
  color: string;
  opacity?: number;
}

export function arcBrick(params: BrickParams, options: ArcBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const {
    cx = 0.5,
    cy = 0.5,
    r,
    startDeg,
    endDeg,
    strokeWidth = 3,
    color,
    opacity = 0.8,
    id = "arc",
  } = options;
  const scale = Math.max(width, height);
  const pcx = cx * width;
  const pcy = cy * height;
  const pr = r * scale;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = pcx + Math.cos(toRad(startDeg)) * pr;
  const y1 = pcy + Math.sin(toRad(startDeg)) * pr;
  const x2 = pcx + Math.cos(toRad(endDeg)) * pr;
  const y2 = pcy + Math.sin(toRad(endDeg)) * pr;
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const sw = (strokeWidth * scale) / 2160;
  return {
    elements: `<path id="${id}" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${pr.toFixed(1)} ${pr.toFixed(1)} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`,
  };
}

// ─── Light rays ───────────────────────────────────────────────────────────────

export interface RaysBrickOptions {
  id?: string;
  cx?: number;
  cy?: number;
  count?: number;
  /** Length as fraction of max(width,height) */
  length?: number;
  color: string;
  opacity?: number;
  spreadDeg?: number;
  startDeg?: number;
}

export function raysBrick(params: BrickParams, options: RaysBrickOptions): BrickOutput {
  const { viewBox, seedId } = params;
  const { width, height } = viewBox;
  const {
    cx = 0.5,
    cy = 0.5,
    count = 16,
    length = 0.6,
    color,
    opacity = 0.15,
    spreadDeg = 360,
    startDeg = 0,
    id = "rays",
  } = options;
  const scale = Math.max(width, height);
  const pcx = cx * width;
  const pcy = cy * height;
  const pl = length * scale;
  const sw = (scale / 1080) * 2.5;

  const defs: string[] = [];
  const elems: string[] = [];

  // Per-ray PRNG so widths/lengths vary deterministically
  const rng = seedRng(hashStr(`${seedId}-${id}-rays`));

  // Soft glow filter — rays look like volumetric light, not just sharp lines
  const glowId = `${id}-glow`;
  defs.push(
    `<filter id="${glowId}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(scale * 0.003).toFixed(1)}"/></filter>`
  );

  // Each ray gets its OWN linear gradient (bright at source → transparent at tip)
  // No more cosine cycling — every ray is fully visible, varied only in width/length.
  for (let i = 0; i < count; i++) {
    const deg = startDeg + (spreadDeg * (i + (count > 1 ? 0 : 0))) / Math.max(1, count);
    const rad = (deg * Math.PI) / 180;
    // Length jitter — rays of varying length feel volumetric, not cookie-cutter
    const lenJitter = 0.78 + rng() * 0.42;
    const rayLen = pl * lenJitter;
    const x2 = pcx + Math.cos(rad) * rayLen;
    const y2 = pcy + Math.sin(rad) * rayLen;
    const rayOp = opacity * (0.65 + rng() * 0.35);
    const rayWidth = sw * (0.55 + rng() * 1.1);

    const gradId = `${id}-g${i}`;
    defs.push(
      `<linearGradient id="${gradId}" x1="${pcx.toFixed(1)}" y1="${pcy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${rayOp.toFixed(3)}"/>
  <stop offset="35%" stop-color="${color}" stop-opacity="${(rayOp * 0.7).toFixed(3)}"/>
  <stop offset="80%" stop-color="${color}" stop-opacity="${(rayOp * 0.18).toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`
    );

    // Outer soft glow pass (wider, blurred)
    elems.push(
      `<line x1="${pcx.toFixed(1)}" y1="${pcy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="url(#${gradId})" stroke-width="${(rayWidth * 3.2).toFixed(1)}" stroke-linecap="round" opacity="${(rayOp * 0.45).toFixed(3)}" filter="url(#${glowId})"/>`
    );
    // Crisp core ray on top
    elems.push(
      `<line x1="${pcx.toFixed(1)}" y1="${pcy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="url(#${gradId})" stroke-width="${rayWidth.toFixed(1)}" stroke-linecap="round"/>`
    );
  }
  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// ─── Horizontal band ──────────────────────────────────────────────────────────

export interface BandBrickOptions {
  id?: string;
  /** Y position as fraction of height */
  y?: number;
  /** Band height as fraction of height */
  bandHeight?: number;
  color: string;
  opacity?: number;
  /** Add a gaussian blur for soft glow */
  blur?: number;
}

export function bandBrick(params: BrickParams, options: BandBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { y = 0.5, bandHeight = 0.1, color, opacity = 0.4, blur, id = "band" } = options;

  const py = (y * height).toFixed(1);
  const ph = (bandHeight * height).toFixed(1);
  const filterId = `${id}-blur`;

  const defs = blur
    ? `<filter id="${filterId}" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>`
    : undefined;
  const filterAttr = blur ? ` filter="url(#${filterId})"` : "";

  return {
    defs,
    elements: `<rect id="${id}" x="0" y="${py}" width="${width}" height="${ph}" fill="${color}" opacity="${opacity}"${filterAttr}/>`,
  };
}

// ─── Aurora curtain (smooth sine-wave bands) ──────────────────────────────────

export interface CurtainBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Y centre of the curtain as fraction of height */
  cy?: number;
  /** Amplitude as fraction of height */
  amplitude?: number;
  /** Phase offset in degrees */
  phase?: number;
  width?: number;
  strokeWidth?: number;
}

export function curtainBrick(params: BrickParams, options: CurtainBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width: vw, height: vh } = viewBox;
  const {
    color,
    opacity = 0.5,
    cy = 0.3,
    amplitude = 0.08,
    phase = 0,
    strokeWidth = 80,
    id = "curtain",
  } = options;

  const pcy = cy * vh;
  const amp = amplitude * vh;
  // Use phase as a spatial offset in noise domain so layered curtains stay distinct
  const phaseOffset = phase / 360;
  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-curtain-${id}`));
  const noise2D = createNoise2D(rng);
  const steps = 80;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * vw;
    // 2-octave fBm: primary swell + fine detail
    const n =
      noise2D(t * 6.5 + phaseOffset, 0.5) * 0.5 +
      noise2D(t * 15.0 + phaseOffset, 1.5) * 0.32 +
      noise2D(t * 33.0 + phaseOffset, 2.5) * 0.18;
    const y = pcy + n * amp;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  const sw = (strokeWidth * vw) / 3840;
  return {
    elements: `<path id="${id}" d="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${opacity}"/>`,
  };
}

// ─── Ink brush stroke ─────────────────────────────────────────────────────────

export interface BrushStrokeBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  strokeWidth?: number;
  roughness?: number;
}

export function brushStrokeBrick(
  params: BrickParams,
  options: BrushStrokeBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width: vw, height: vh } = viewBox;
  const {
    color,
    opacity = 0.6,
    x1 = 0.1,
    y1 = 0.5,
    x2 = 0.9,
    y2 = 0.5,
    strokeWidth = 0.015,
    roughness = 0.04,
    id = "brush",
  } = options;
  const scale = Math.max(vw, vh);
  const px1 = x1 * vw;
  const py1 = y1 * vh;
  const px2 = x2 * vw;
  const py2 = y2 * vh;
  // Control points with slight roughness — seeded PRNG for reproducibility
  const rng = seedRng(hashStr(`brush-${id}`));
  const cpx = ((x1 + x2) / 2) * vw + roughness * scale * (rng() - 0.5);
  const cpy = ((y1 + y2) / 2) * vh + roughness * scale * (rng() - 0.5);
  const sw = strokeWidth * scale;
  return {
    elements: `<path id="${id}" d="M ${px1.toFixed(1)} ${py1.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${px2.toFixed(1)} ${py2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${opacity}"/>`,
  };
}

// ─── Radial spectrum (pulsar chart) ───────────────────────────────────────────
// Each ray = gradient line + perpendicular tick marks. Pass one ray per palette
// color to produce a full-spectrum starburst that shows every Caligo color.

export interface RadialSpectrumRay {
  color: string;
  /** Ray length as fraction of Math.min(width, height) */
  length: number;
  /** Angle in radians from positive X-axis */
  angle: number;
  opacity?: number;
  strokeWidth?: number;
  /** Number of tick marks along the ray (default 7) */
  tickCount?: number;
}

export interface RadialSpectrumBrickOptions {
  id?: string;
  /** Center X as fraction of width (default 0.5) */
  cx?: number;
  /** Center Y as fraction of height (default 0.45) */
  cy?: number;
  rays: RadialSpectrumRay[];
  /** Tick half-length as fraction of Math.min(width, height) (default 0.005) */
  tickLength?: number;
}

export function radialSpectrumBrick(
  params: BrickParams,
  options: RadialSpectrumBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  // Use max so rays span the full landscape canvas, clipping at edges naturally
  const scale = Math.max(width, height);

  const { id = "rsp", cx = 0.5, cy = 0.45, rays, tickLength = 0.005 } = options;

  const ocx = cx * width;
  const ocy = cy * height;
  const tBase = tickLength * scale;
  // Scale factor so strokeWidth:1 = 1px at 1080p — matches all other bricks
  const scaleF = scale / 1080;

  const defs: string[] = [];
  const elems: string[] = [];

  rays.forEach((ray, i) => {
    const { color, angle, length, opacity = 0.85, strokeWidth = 1.0, tickCount = 7 } = ray;

    const rayLen = length * scale;
    const ex = ocx + Math.cos(angle) * rayLen;
    const ey = ocy + Math.sin(angle) * rayLen;

    // Perpendicular unit vector for tick marks
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    // Gradient: slight fade near center → full brightness → fades at tip
    const gradId = `${id}-g${i}`;
    defs.push(
      `<linearGradient id="${gradId}" x1="${ocx.toFixed(1)}" y1="${ocy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="6%" stop-color="${color}" stop-opacity="${opacity.toFixed(2)}"/>
  <stop offset="75%" stop-color="${color}" stop-opacity="${(opacity * 0.6).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`
    );

    const sw = (strokeWidth * scaleF).toFixed(1);
    elems.push(
      `<line x1="${ocx.toFixed(1)}" y1="${ocy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="url(#${gradId})" stroke-width="${sw}"/>`
    );

    // Tick marks at evenly-spaced intervals, starting past the center cluster
    const tsw = (strokeWidth * scaleF * 0.6).toFixed(1);
    for (let t = 1; t <= tickCount; t++) {
      const frac = 0.1 + (t / (tickCount + 1)) * 0.88;
      const tx = ocx + Math.cos(angle) * rayLen * frac;
      const ty = ocy + Math.sin(angle) * rayLen * frac;
      const isMajor = t % 3 === 0;
      const tLen = isMajor ? tBase * 1.8 : tBase;
      const tickOp = (opacity * (0.85 - frac * 0.4)).toFixed(2);
      elems.push(
        `<line x1="${(tx - perpX * tLen).toFixed(1)}" y1="${(ty - perpY * tLen).toFixed(1)}" x2="${(tx + perpX * tLen).toFixed(1)}" y2="${(ty + perpY * tLen).toFixed(1)}" stroke="${color}" stroke-opacity="${tickOp}" stroke-width="${tsw}"/>`
      );
    }
  });

  // Small white anchor dot at center
  const dotR = (scale * 0.003).toFixed(1);
  elems.push(
    `<circle cx="${ocx.toFixed(1)}" cy="${ocy.toFixed(1)}" r="${dotR}" fill="white" opacity="0.65"/>`
  );

  return { defs: defs.join("\n"), elements: elems.join("\n") };
}
