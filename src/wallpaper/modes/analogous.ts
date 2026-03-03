/**
 * Mode: Analogous → Topic: "Flow"
 *
 * Organic gradient dissolve. The motif bleeds into soft, adjacent-colour haze.
 * A long diagonal gradient wash amplifies the flowing quality.
 */
import {
  cloudBandBrick,
  horizonGlowBrick,
  linearGradientBrick,
  vignetteBrick,
} from "../bricks/index.js";
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

  // Cloud band — organic flow lines amplifying analogous color drift
  const cloud = cloudBandBrick(params, {
    id: "mode-flow-cl",
    cy: 0.35,
    bandHeight: 0.2,
    color: colors.accentMuted,
    opacity: 0.06,
    frequency: 0.004,
    seed: 71,
  });

  // Horizon atmospheric glow — warmth at the lower horizon
  const hGlow = horizonGlowBrick(params, {
    id: "mode-flow-hg",
    y: 0.72,
    color: colors.accentMuted,
    opacity: 0.07,
    height: 0.08,
  });

  const vignette = vignetteBrick(params, { id: "mode-flow-vig", opacity: 0.45, innerRadius: 0.2 });

  const extra = mergeBricks([wash, cloud, hGlow, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
