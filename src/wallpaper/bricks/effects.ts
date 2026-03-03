import { renderTemplate } from "../templates/engine.js";
import type { BrickOutput, BrickParams } from "../types.js";
import { fmtCoord, fmtLength, fmtOpacity } from "./svg-format.js";

export interface BloomEllipseBrickOptions {
  id?: string;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  color: string;
  opacity?: number;
  blurRatio?: number;
}

/**
 * Reusable glow/bloom primitive backed by the bloom-ellipse.svg template.
 * TypeScript computes all numeric values; the SVG template owns geometry/structure.
 */
export function bloomEllipseBrick(
  params: BrickParams,
  options: BloomEllipseBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const {
    id = "bloom",
    cx = 0.5,
    cy = 0.5,
    rx = 0.15,
    ry = 0.2,
    color,
    opacity = 0.12,
    blurRatio = 0.02,
  } = options;

  const blur = Math.max(width, height) * blurRatio;

  return renderTemplate("bloom-ellipse.svg", {
    filterId: id,
    blur: fmtLength(blur),
    cx: fmtCoord(cx * width),
    cy: fmtCoord(cy * height),
    rx: fmtLength(rx * width),
    ry: fmtLength(ry * height),
    color,
    opacity: fmtOpacity(opacity),
  });
}
