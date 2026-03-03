/**
 * Mode: Triadic → Topic: "Convergence"
 *
 * Three visual elements converge at a central focal point (triptych arrangement).
 * Two accent radial glows flank the motif from off-screen corners.
 */
import {
  nebulaGlowBrick,
  radialGradientBrick,
  starFieldBrick,
  vignetteBrick,
} from "../bricks/index.js";
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

  // Nebula glow clusters — three-point convergence adds cosmic depth
  const nebula = nebulaGlowBrick(params, {
    id: "mode-conv-nb",
    blur: 0.05,
    blobs: [
      { cx: 0.15, cy: 0.15, rx: 0.12, ry: 0.1, color: colors.huePurple, opacity: 0.06 },
      { cx: 0.85, cy: 0.5, rx: 0.1, ry: 0.12, color: colors.hueBlue, opacity: 0.06 },
      { cx: 0.5, cy: 0.85, rx: 0.12, ry: 0.08, color: colors.accent, opacity: 0.05 },
    ],
  });

  // Sparse star cluster — distant stars deepening the convergence
  const stars = starFieldBrick(params, {
    id: "mode-conv-st",
    count: 25,
    brightCount: 3,
    color: "#ffffff",
    color2: colors.hueBlue,
    distribution: "full",
    opacity: 0.12,
    featureCount: 1,
  });

  const vignette = vignetteBrick(params, { id: "mode-conv-vig", opacity: 0.5, innerRadius: 0.25 });

  const extra = mergeBricks([leftGlow, rightGlow, nebula, stars, vignette]);
  return {
    defs: [motif.defs, extra.defs].filter(Boolean).join("\n"),
    elements: [motif.elements, extra.elements].filter(Boolean).join("\n"),
  };
}
