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
}

export function ringBrick(params: BrickParams, options: RingBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { cx = 0.5, cy = 0.5, r, strokeWidth = 2, color, opacity = 0.8, id = "ring" } = options;
  const pcx = (cx * width).toFixed(1);
  const pcy = (cy * height).toFixed(1);
  const scale = Math.max(width, height);
  return {
    elements: `<circle id="${id}" cx="${pcx}" cy="${pcy}" r="${(r * scale).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${((strokeWidth * scale) / 2160).toFixed(1)}" opacity="${opacity}"/>`,
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
  const { viewBox } = params;
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
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const deg = startDeg + (spreadDeg * i) / count;
    const rad = (deg * Math.PI) / 180;
    const x2 = pcx + Math.cos(rad) * pl;
    const y2 = pcy + Math.sin(rad) * pl;
    const alpha = opacity * (0.5 + 0.5 * Math.cos((i * Math.PI * 2) / count));
    lines.push(
      `  <line x1="${pcx.toFixed(1)}" y1="${pcy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${((scale / 2160) * 2).toFixed(1)}" opacity="${alpha.toFixed(3)}"/>`
    );
  }
  return {
    elements: `<g id="${id}">\n${lines.join("\n")}\n</g>`,
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
    const n = noise2D(t * 3.5 + phaseOffset, 0) * 0.7 + noise2D(t * 8.0 + phaseOffset, 1) * 0.3;
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
