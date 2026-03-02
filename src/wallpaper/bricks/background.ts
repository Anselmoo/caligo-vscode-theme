/**
 * Background brick — solid fill + soft atmospheric radial gradient.
 * Every wallpaper starts here.
 */
import type { BrickOutput, BrickParams } from "../types.js";

export function backgroundBrick(params: BrickParams, id = "bg-atm"): BrickOutput {
  const { viewBox, colors } = params;
  const { width, height } = viewBox;
  const cx = width * 0.5;
  const cy = height * 0.35;
  const r = Math.max(width, height) * 0.65;
  return {
    defs: `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${colors.bgSoft}" stop-opacity="0.75"/>
  <stop offset="100%" stop-color="${colors.bg}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${width}" height="${height}" fill="${colors.bg}"/>
<rect width="${width}" height="${height}" fill="url(#${id})"/>`,
  };
}
