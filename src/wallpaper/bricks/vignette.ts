/**
 * Vignette brick — edge darkening overlay for depth and focus.
 */
import type { BrickOutput, BrickParams } from "../types.js";

export interface VignetteBrickOptions {
  id?: string;
  opacity?: number;
  /** Fraction of max(width,height) at which vignette starts (inner radius) */
  innerRadius?: number;
  color?: string;
}

export function vignetteBrick(
  params: BrickParams,
  options: VignetteBrickOptions = {}
): BrickOutput {
  const { viewBox, colors } = params;
  const { width, height } = viewBox;
  const { id = "vignette", opacity = 0.6, innerRadius = 0.35, color = colors.bg } = options;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(width, height) * 0.75;
  return {
    defs: `<radialGradient id="${id}" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="${(innerRadius * 100).toFixed(0)}%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="${opacity}"/>
</radialGradient>`,
    elements: `<rect width="${width}" height="${height}" fill="url(#${id})"/>`,
  };
}
