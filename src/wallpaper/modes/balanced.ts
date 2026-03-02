/**
 * Mode: Balanced → Topic: "Core"
 *
 * The seed's central motif stands alone in symmetric, geometric silence.
 * Minimal composition. The motif is centred; vignette pulls the eye inward.
 */
import { vignetteBrick } from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function balancedMode(motif: ComposedWallpaper, params: BrickParams): ComposedWallpaper {
  const vignette = vignetteBrick(params, { opacity: 0.55, innerRadius: 0.3 });
  const vignetteComposed = mergeBricks([vignette]);
  return {
    defs: [motif.defs, vignetteComposed.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, vignetteComposed.elements].filter(Boolean).join("\n"),
  };
}
