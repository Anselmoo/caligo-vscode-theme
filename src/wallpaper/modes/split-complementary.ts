/**
 * Mode: Split-Complementary → Topic: "Rupture"
 *
 * A dramatic diagonal split divides the canvas into two contrasting visual zones.
 * One half belongs to the motif; the other to its complement.
 */
import { linearGradientBrick, vignetteBrick } from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";
import { fmtCoord, fmtStroke } from "../bricks/svg-format.js";

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

  // Diagonal dividing line
  const lineX1 = 0;
  const lineY1 = height * 0.5;
  const lineX2 = width;
  const lineY2 = height * 0.4;
  const divLine: { defs?: string; elements: string } = {
    elements: `<line x1="${lineX1}" y1="${fmtCoord(lineY1)}" x2="${lineX2}" y2="${fmtCoord(lineY2)}" stroke="${colors.accentMuted}" stroke-width="${fmtStroke(Math.max(width, height) / 2160)}" opacity="0.25"/>`,
  };

  const vignette = vignetteBrick(params, { opacity: 0.5, innerRadius: 0.25 });

  const extra = mergeBricks([splitGrad, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, divLine.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
