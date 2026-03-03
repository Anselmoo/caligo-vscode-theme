/**
 * Shapes bricks — reusable geometric SVG primitives.
 * Rings, arcs, bands, rays, bezier curtains, and brush strokes.
 */
import type { BrickOutput, BrickParams } from "../types.js";
import { fmtCoord, fmtLength, fmtOpacity, fmtStroke } from "./svg-format.js";

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
  const pcx = fmtCoord(cx * width);
  const pcy = fmtCoord(cy * height);
  const scale = Math.max(width, height);
  return {
    elements: `<circle id="${id}" cx="${pcx}" cy="${pcy}" r="${fmtLength(r * scale)}" fill="none" stroke="${color}" stroke-width="${fmtStroke((strokeWidth * scale) / 2160)}" opacity="${fmtOpacity(opacity)}"/>`,
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
    elements: `<path id="${id}" d="M ${fmtCoord(x1)} ${fmtCoord(y1)} A ${fmtLength(pr)} ${fmtLength(pr)} 0 ${large} 1 ${fmtCoord(x2)} ${fmtCoord(y2)}" fill="none" stroke="${color}" stroke-width="${fmtStroke(sw)}" opacity="${fmtOpacity(opacity)}"/>`,
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
      `  <line x1="${fmtCoord(pcx)}" y1="${fmtCoord(pcy)}" x2="${fmtCoord(x2)}" y2="${fmtCoord(y2)}" stroke="${color}" stroke-width="${fmtStroke((scale / 2160) * 2)}" opacity="${fmtOpacity(alpha)}"/>`
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

  const py = fmtCoord(y * height);
  const ph = fmtLength(bandHeight * height);
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
  const { viewBox } = params;
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
  const phaseRad = (phase * Math.PI) / 180;
  const steps = 64;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * vw;
    const y = pcy + Math.sin((i / steps) * Math.PI * 2 + phaseRad) * amp;
    pts.push(`${i === 0 ? "M" : "L"} ${fmtCoord(x)} ${fmtCoord(y)}`);
  }

  const sw = (strokeWidth * vw) / 3840;
  return {
    elements: `<path id="${id}" d="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${fmtStroke(sw)}" stroke-linecap="round" opacity="${fmtOpacity(opacity)}"/>`,
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
  // Control points with slight roughness
  const cpx = ((x1 + x2) / 2) * vw + roughness * scale * (Math.random() - 0.5);
  const cpy = ((y1 + y2) / 2) * vh + roughness * scale * (Math.random() - 0.5);
  const sw = strokeWidth * scale;
  return {
    elements: `<path id="${id}" d="M ${fmtCoord(px1)} ${fmtCoord(py1)} Q ${fmtCoord(cpx)} ${fmtCoord(cpy)} ${fmtCoord(px2)} ${fmtCoord(py2)}" fill="none" stroke="${color}" stroke-width="${fmtStroke(sw)}" stroke-linecap="round" opacity="${fmtOpacity(opacity)}"/>`,
  };
}
