/**
 * Mode: Balanced → Topic: "Core"
 *
 * The seed's central motif stands alone in symmetric, geometric silence.
 * Minimal composition. The motif is centred; vignette pulls the eye inward.
 */
import { fogWispBrick, horizonGlowBrick, vignetteBrick } from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function balancedMode(motif: ComposedWallpaper, params: BrickParams): ComposedWallpaper {
  const { colors } = params;

  // Subtle horizon glow — atmospheric depth at lower third
  const hGlow = horizonGlowBrick(params, {
    id: "mode-bal-hg",
    y: 0.75,
    color: colors.bgSoft,
    opacity: 0.06,
    height: 0.08,
  });

  // Gentle fog layer — softens composition and adds scene depth
  const fog = fogWispBrick(params, {
    id: "mode-bal-fg",
    cy: 0.7,
    hazeCount: 2,
    wispCount: 3,
    color: colors.bgMid,
    hazeOpacity: 0.04,
    wispOpacity: 0.025,
  });

  const vignette = vignetteBrick(params, { id: "mode-bal-vig", opacity: 0.55, innerRadius: 0.3 });
  const extra = mergeBricks([hGlow, fog, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
