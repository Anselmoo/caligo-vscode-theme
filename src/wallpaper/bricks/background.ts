/**
 * Background brick — solid fill + soft atmospheric radial gradient.
 * Every wallpaper starts here.
 */

import { renderTemplate } from "../templates/engine.js";
import type { BrickOutput, BrickParams } from "../types.js";
import { fmtCoord, fmtLength } from "./svg-format.js";

export function backgroundBrick(params: BrickParams, id = "bg-atm"): BrickOutput {
  const { viewBox, colors } = params;
  const { width, height } = viewBox;
  const cx = width * 0.5;
  const cy = height * 0.35;
  const r = Math.max(width, height) * 0.65;
  return renderTemplate("background-glow.svg", {
    gradId: id,
    cx: fmtCoord(cx),
    cy: fmtCoord(cy),
    r: fmtLength(r),
    bgColor: colors.bg,
    softColor: colors.bgSoft,
    width,
    height,
  });
}
