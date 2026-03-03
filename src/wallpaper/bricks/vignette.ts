/**
 * Vignette brick — edge darkening overlay for depth and focus.
 */
import type { BrickOutput, BrickParams } from "../types.js";
import { renderTemplate } from "../templates/engine.js";
import { fmtCoord, fmtLength, fmtOpacity, fmtPercent } from "./svg-format.js";

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
  return renderTemplate("vignette.svg", {
    gradId: id,
    cx: fmtCoord(cx),
    cy: fmtCoord(cy),
    r: fmtLength(r),
    color,
    innerStop: `${fmtPercent(innerRadius * 100)}%`,
    opacity: fmtOpacity(opacity),
    width,
    height,
  });
}
