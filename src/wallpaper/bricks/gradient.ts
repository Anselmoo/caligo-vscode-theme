/**
 * Gradient bricks — linear and radial gradient overlays.
 * Used by motifs and mode composers for decorative colour washes.
 */
import type { BrickOutput, BrickParams } from "../types.js";

export interface LinearGradientOptions {
  id?: string;
  /** Angle in degrees (0 = top→bottom, 90 = left→right) */
  angle?: number;
  stops: Array<{ offset: string; color: string; opacity?: number }>;
  opacity?: number;
}

export function linearGradientBrick(
  params: BrickParams,
  options: LinearGradientOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { id = "lg", angle = 180, stops, opacity = 1 } = options;

  const rad = ((angle - 90) * Math.PI) / 180;
  const x1 = (50 - 50 * Math.cos(rad)).toFixed(2);
  const y1 = (50 - 50 * Math.sin(rad)).toFixed(2);
  const x2 = (50 + 50 * Math.cos(rad)).toFixed(2);
  const y2 = (50 + 50 * Math.sin(rad)).toFixed(2);

  const stopMarkup = stops
    .map(
      s => `  <stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`
    )
    .join("\n");

  return {
    defs: `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
${stopMarkup}
</linearGradient>`,
    elements: `<rect width="${width}" height="${height}" fill="url(#${id})" opacity="${opacity}"/>`,
  };
}

export interface RadialGradientOptions {
  id?: string;
  /** Centre as fraction of width/height (0..1) */
  cx?: number;
  cy?: number;
  /** Radius as fraction of max(width, height) */
  r?: number;
  stops: Array<{ offset: string; color: string; opacity?: number }>;
  opacity?: number;
}

export function radialGradientBrick(
  params: BrickParams,
  options: RadialGradientOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { id = "rg", cx = 0.5, cy = 0.5, r = 0.6, stops, opacity = 1 } = options;

  const stopMarkup = stops
    .map(
      s => `  <stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`
    )
    .join("\n");

  return {
    defs: `<radialGradient id="${id}" cx="${(cx * width).toFixed(0)}" cy="${(cy * height).toFixed(0)}" r="${(r * Math.max(width, height)).toFixed(0)}" gradientUnits="userSpaceOnUse">
${stopMarkup}
</radialGradient>`,
    elements: `<rect width="${width}" height="${height}" fill="url(#${id})" opacity="${opacity}"/>`,
  };
}
