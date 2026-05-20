/**
 * Mode: Analogous → Topic: "Flow"
 *
 * Organic gradient dissolve. The motif bleeds into soft, adjacent-colour haze.
 * A long diagonal gradient wash amplifies the flowing quality.
 */
import { linearGradientBrick, vignetteBrick } from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function analogousMode(motif: ComposedWallpaper, params: BrickParams): ComposedWallpaper {
  const { colors } = params;

  // Diagonal colour wash — accent bleeds from top-right toward bottom-left
  const wash = linearGradientBrick(params, {
    id: "mode-flow-wash",
    angle: 135,
    stops: [
      { offset: "0%", color: colors.accentMuted, opacity: 0.18 },
      { offset: "50%", color: colors.bgSoft, opacity: 0.0 },
      { offset: "100%", color: colors.accentMuted, opacity: 0.1 },
    ],
    opacity: 1,
  });

  const vignette = vignetteBrick(params, { opacity: 0.45, innerRadius: 0.2 });

  const extra = mergeBricks([wash, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
