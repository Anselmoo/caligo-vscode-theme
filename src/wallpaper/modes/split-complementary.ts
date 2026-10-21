/**
 * Mode: Split-Complementary → Topic: "Rupture"
 *
 * A soft diagonal split tints the canvas into two contrasting zones: one half
 * leans to the motif's hue, the other to its complement. There is no drawn
 * dividing line: over the 3D scenes a constant-width stroke read as a scratch
 * across the image (user, 2026-10-21).
 */
import { linearGradientBrick, vignetteBrick } from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function splitComplementaryMode(
  motif: ComposedWallpaper,
  params: BrickParams
): ComposedWallpaper {
  const { colors, viewBox } = params;
  const { width, height } = viewBox;

  // Hard diagonal split: accent bleeds across from top-left to bottom-right edge
  const splitGrad = linearGradientBrick(params, {
    id: "mode-rupture-split",
    angle: 45,
    stops: [
      { offset: "0%", color: colors.hueBlue, opacity: 0.12 },
      { offset: "40%", color: colors.bg, opacity: 0.0 },
      { offset: "60%", color: colors.bg, opacity: 0.0 },
      { offset: "100%", color: colors.accent, opacity: 0.14 },
    ],
    opacity: 1,
  });

  const vignette = vignetteBrick(params, { opacity: 0.5, innerRadius: 0.25 });

  const extra = mergeBricks([splitGrad, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
