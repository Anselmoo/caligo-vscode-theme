/**
 * Mode: Monochromatic → Topic: "Depth"
 *
 * A single-hue journey downward into texture and material.
 * Vertical gradient layers simulate falling through progressively deeper colour.
 */
import { linearGradientBrick, noiseBrick, vignetteBrick } from "../bricks/index.js";
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

  // Enhanced grain for material texture
  const grain = noiseBrick(params, { id: "mode-depth-noise", opacity: 0.055, numOctaves: 6 });

  const vignette = vignetteBrick(params, { opacity: 0.65, innerRadius: 0.4 });

  const extra = mergeBricks([depthGrad, grain, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
