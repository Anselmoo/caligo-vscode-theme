/**
 * Mode: Monochromatic → Topic: "Depth"
 *
 * A single-hue journey downward into texture and material.
 * Vertical gradient layers simulate falling through progressively deeper colour.
 */
import { cloudBandBrick, linearGradientBrick, noiseBrick, vignetteBrick } from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function monochromaticMode(
  motif: ComposedWallpaper,
  params: BrickParams
): ComposedWallpaper {
  const { colors } = params;

  // Vertical depth gradient — accent fades to void toward the bottom
  const depthGrad = linearGradientBrick(params, {
    id: "mode-depth-grad",
    angle: 180,
    stops: [
      { offset: "0%", color: colors.accentSoft, opacity: 0.12 },
      { offset: "45%", color: colors.accentMuted, opacity: 0.06 },
      { offset: "100%", color: colors.bg, opacity: 0.0 },
    ],
    opacity: 1,
  });

  // Atmospheric cloud band — organic single-hue texture reinforcing depth
  const cloud = cloudBandBrick(params, {
    id: "mode-depth-cl",
    cy: 0.4,
    bandHeight: 0.3,
    color: colors.accentMuted,
    opacity: 0.04,
    frequency: 0.003,
    seed: 83,
  });

  // Enhanced grain for material texture
  const grain = noiseBrick(params, { id: "mode-depth-noise", opacity: 0.055, numOctaves: 6 });

  const vignette = vignetteBrick(params, { id: "mode-depth-vig", opacity: 0.65, innerRadius: 0.4 });

  const extra = mergeBricks([depthGrad, cloud, grain, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
