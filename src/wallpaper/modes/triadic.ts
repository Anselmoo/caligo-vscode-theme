/**
 * Mode: Triadic → Topic: "Convergence"
 *
 * Three visual elements converge at a central focal point (triptych arrangement).
 * Two accent radial glows flank the motif from off-screen corners.
 */
import { radialGradientBrick, vignetteBrick } from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function triadicMode(motif: ComposedWallpaper, params: BrickParams): ComposedWallpaper {
  const { colors } = params;

  // Left corner glow — hueBlue family
  const leftGlow = radialGradientBrick(params, {
    id: "mode-conv-left",
    cx: 0.05,
    cy: 0.1,
    r: 0.45,
    stops: [
      { offset: "0%", color: colors.hueBlue, opacity: 0.14 },
      { offset: "100%", color: colors.hueBlue, opacity: 0.0 },
    ],
    opacity: 1,
  });

  // Right corner glow — huePurple family
  const rightGlow = radialGradientBrick(params, {
    id: "mode-conv-right",
    cx: 0.95,
    cy: 0.9,
    r: 0.45,
    stops: [
      { offset: "0%", color: colors.huePurple, opacity: 0.12 },
      { offset: "100%", color: colors.huePurple, opacity: 0.0 },
    ],
    opacity: 1,
  });

  const vignette = vignetteBrick(params, { opacity: 0.5, innerRadius: 0.25 });

  const extra = mergeBricks([leftGlow, rightGlow, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
