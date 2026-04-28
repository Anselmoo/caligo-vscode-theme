/**
 * DeepSable motif — 5 deep ocean night scenes.
 *
 * Stillness : Bioluminescent jellyfish column drifting in abyss
 * Drift     : Deep current — pressure bands with bioluminescent trail
 * Break     : Surface burst — looking up from deep water at night sky
 * Void      : Total abyss — single distant bioluminescent point
 * Pulse     : Coral reef bioluminescence with rhythmic rings
 */
import {
  backgroundBrick,
  cloudBandBrick,
  nebulaGlowBrick,
  noiseBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainStackBrick,
  vignetteBrick,
  waterReflectionBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function deepSable(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return deepDrift(params);
    case "split-complementary":
      return deepBreak(params);
    case "monochromatic":
      return deepVoid(params);
    case "triadic":
      return deepPulse(params);
    default:
      return deepStillness(params);
  }
}

/* ── Stillness: Bioluminescent jellyfish column ───────────────────────────── */
function deepStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const abyss = skyGradientBrick(p, {
    id: "ds-s-aby",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "70%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Jellyfish glow clusters — large soft blobs at varying depths
  const jellies = nebulaGlowBrick(p, {
    id: "ds-s-jel",
    blur: 0.04,
    blobs: [
      { cx: 0.3, cy: 0.25, rx: 0.05, ry: 0.07, color: colors.hueCyan, opacity: 0.5 },
      { cx: 0.65, cy: 0.4, rx: 0.04, ry: 0.06, color: colors.hueCyan, opacity: 0.4 },
      { cx: 0.15, cy: 0.55, rx: 0.03, ry: 0.05, color: colors.hueBlue, opacity: 0.35 },
      { cx: 0.8, cy: 0.2, rx: 0.025, ry: 0.04, color: colors.hueCyan, opacity: 0.3 },
      { cx: 0.45, cy: 0.65, rx: 0.035, ry: 0.05, color: colors.accent, opacity: 0.35 },
    ],
  });

  // Deep current bands
  const current1 = cloudBandBrick(p, {
    id: "ds-s-c1",
    cy: 0.35,
    bandHeight: 0.14,
    color: colors.hueCyan,
    opacity: 0.18,
    frequency: 0.005,
    seed: 11,
  });
  const current2 = cloudBandBrick(p, {
    id: "ds-s-c2",
    cy: 0.6,
    bandHeight: 0.12,
    color: colors.hueBlue,
    opacity: 0.14,
    frequency: 0.007,
    seed: 23,
  });

  // Bioluminescent particles — sparse, scattered
  const biolum = starFieldBrick(p, {
    id: "ds-s-bl",
    count: 80,
    brightCount: 12,
    color: colors.hueCyan,
    distribution: "upper",
    opacity: 0.7,
  });

  // Ocean floor terrain — jagged rock silhouettes
  const floor = terrainStackBrick(p, {
    id: "ds-s-fl",
    layers: [
      { baseY: 0.78, roughness: 0.06, color: colors.bgMid, opacity: 0.6 },
      { baseY: 0.85, roughness: 0.05, color: colors.bgSoft, opacity: 0.78 },
      { baseY: 0.92, roughness: 0.04, color: colors.bg, opacity: 0.92 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ds-s-vig", opacity: 0.65 });
  const noise = noiseBrick(p, { id: "ds-s-n", opacity: 0.04 });
  return mergeBricks([bg, abyss, current1, current2, jellies, biolum, floor, vignette, noise]);
}

/* ── Drift: Deep current — pressure bands ─────────────────────────────────── */
function deepDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const waterGrad = skyGradientBrick(p, {
    id: "ds-d-wg",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "60%", color: colors.hueBlue, opacity: 0.15 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Pressure layers — multiple cloud bands across depth
  const band1 = cloudBandBrick(p, {
    id: "ds-d-b1",
    cy: 0.2,
    bandHeight: 0.15,
    color: colors.hueCyan,
    opacity: 0.2,
    frequency: 0.004,
    seed: 5,
  });
  const band2 = cloudBandBrick(p, {
    id: "ds-d-b2",
    cy: 0.4,
    bandHeight: 0.12,
    color: colors.hueBlue,
    opacity: 0.22,
    frequency: 0.006,
    seed: 11,
  });
  const band3 = cloudBandBrick(p, {
    id: "ds-d-b3",
    cy: 0.6,
    bandHeight: 0.14,
    color: colors.hueCyan,
    opacity: 0.17,
    frequency: 0.005,
    seed: 19,
  });
  const band4 = cloudBandBrick(p, {
    id: "ds-d-b4",
    cy: 0.8,
    bandHeight: 0.1,
    color: colors.hueBlue,
    opacity: 0.14,
    frequency: 0.007,
    seed: 29,
  });

  // Bioluminescent drift trail — glowing particles in current
  const trail = nebulaGlowBrick(p, {
    id: "ds-d-tr",
    blur: 0.04,
    blobs: [
      { cx: 0.2, cy: 0.3, rx: 0.08, ry: 0.02, color: colors.hueCyan, opacity: 0.3 },
      { cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.025, color: colors.accent, opacity: 0.25 },
      { cx: 0.8, cy: 0.7, rx: 0.07, ry: 0.02, color: colors.hueCyan, opacity: 0.22 },
    ],
  });

  const particles = starFieldBrick(p, {
    id: "ds-d-p",
    count: 50,
    brightCount: 4,
    color: colors.hueCyan,
    distribution: "full",
    opacity: 0.45,
  });

  // Seafloor ridges at varying depths
  const ridges = terrainStackBrick(p, {
    id: "ds-d-rd",
    layers: [
      { baseY: 0.74, roughness: 0.06, color: colors.bgMid, opacity: 0.55 },
      { baseY: 0.82, roughness: 0.05, color: colors.bgSoft, opacity: 0.72 },
      { baseY: 0.9, roughness: 0.04, color: colors.bg, opacity: 0.88 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ds-d-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ds-d-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    waterGrad,
    band1,
    band2,
    band3,
    band4,
    trail,
    particles,
    ridges,
    vignette,
    noise,
  ]);
}

/* ── Break: Surface burst — looking up at night sky from below ────────────── */
function deepBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Split: deep dark below, night sky above
  const split = skyGradientBrick(p, {
    id: "ds-b-sp",
    stops: [
      { offset: "0%", color: colors.bgSoft },
      { offset: "42%", color: colors.bgMid },
      { offset: "48%", color: colors.hueBlue, opacity: 0.3 },
      { offset: "52%", color: colors.hueBlue, opacity: 0.2 },
      { offset: "58%", color: colors.bg },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Sky visible through water surface — stars
  const stars = starFieldBrick(p, {
    id: "ds-b-st",
    count: 70,
    brightCount: 5,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.45,
  });

  // Surface tension — water ripple effect at the boundary
  const surface = waterReflectionBrick(p, {
    id: "ds-b-sf",
    waterY: 0.5,
    color: colors.hueBlue,
    opacity: 0.2,
    rippleScale: 12,
    rippleFrequency: 0.02,
  });

  // Rising bubbles — small glow blobs below surface
  const bubbles = nebulaGlowBrick(p, {
    id: "ds-b-bu",
    blur: 0.02,
    blobs: [
      { cx: 0.35, cy: 0.65, rx: 0.008, ry: 0.008, color: colors.accentSoft, opacity: 0.4 },
      { cx: 0.5, cy: 0.7, rx: 0.01, ry: 0.01, color: colors.hueCyan, opacity: 0.35 },
      { cx: 0.6, cy: 0.6, rx: 0.007, ry: 0.007, color: colors.accentSoft, opacity: 0.3 },
      { cx: 0.42, cy: 0.8, rx: 0.012, ry: 0.012, color: colors.hueCyan, opacity: 0.25 },
      { cx: 0.55, cy: 0.85, rx: 0.006, ry: 0.006, color: colors.accent, opacity: 0.2 },
    ],
  });

  // Caustic light patterns at surface
  const caustics = cloudBandBrick(p, {
    id: "ds-b-ca",
    cy: 0.48,
    bandHeight: 0.08,
    color: colors.hueCyan,
    opacity: 0.12,
    frequency: 0.015,
    seed: 7,
  });

  const vignette = vignetteBrick(p, { id: "ds-b-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ds-b-n", opacity: 0.04 });
  return mergeBricks([bg, split, stars, caustics, surface, bubbles, vignette, noise]);
}

/* ── Void: Total abyss — single faint light ───────────────────────────────── */
function deepVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Deep gradient — barely perceptible
  const abyss = skyGradientBrick(p, {
    id: "ds-v-ab",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.3 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Single distant bioluminescent point — radial glow
  const light = nebulaGlowBrick(p, {
    id: "ds-v-li",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.5, rx: 0.02, ry: 0.02, color: colors.accent, opacity: 0.5 },
      { cx: 0.5, cy: 0.5, rx: 0.06, ry: 0.06, color: colors.accent, opacity: 0.1 },
    ],
  });

  // Faint current texture
  const current = cloudBandBrick(p, {
    id: "ds-v-cu",
    cy: 0.5,
    bandHeight: 0.3,
    color: colors.bgSoft,
    opacity: 0.04,
    frequency: 0.003,
    seed: 41,
  });

  // Distant trench walls — visible terrain silhouettes
  const trench = terrainStackBrick(p, {
    id: "ds-v-tr",
    layers: [
      { baseY: 0.8, roughness: 0.05, color: colors.bgMid, opacity: 0.45 },
      { baseY: 0.88, roughness: 0.04, color: colors.bgSoft, opacity: 0.65 },
      { baseY: 0.94, roughness: 0.03, color: colors.bg, opacity: 0.85 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ds-v-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ds-v-n", opacity: 0.03 });
  return mergeBricks([bg, abyss, current, light, trench, vignette, noise]);
}

/* ── Pulse: Coral reef bioluminescence ────────────────────────────────────── */
function deepPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const ocean = skyGradientBrick(p, {
    id: "ds-p-oc",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "60%", color: colors.bgSoft },
      { offset: "100%", color: colors.bgMid },
    ],
  });

  // Coral reef terrain — organic Bézier ridgeline at bottom
  const reef = terrainStackBrick(p, {
    id: "ds-p-rf",
    points: 16,
    layers: [
      { baseY: 0.72, roughness: 0.06, color: colors.bgMid, opacity: 0.6 },
      { baseY: 0.78, roughness: 0.05, color: colors.bgSoft, opacity: 0.75 },
      { baseY: 0.84, roughness: 0.04, color: colors.bg, opacity: 0.9 },
    ],
  });

  // Bioluminescent emission rings from coral
  const glows = nebulaGlowBrick(p, {
    id: "ds-p-gl",
    blur: 0.03,
    blobs: [
      { cx: 0.15, cy: 0.72, rx: 0.03, ry: 0.04, color: colors.hueGreen, opacity: 0.3 },
      { cx: 0.3, cy: 0.68, rx: 0.025, ry: 0.035, color: colors.hueCyan, opacity: 0.25 },
      { cx: 0.5, cy: 0.74, rx: 0.035, ry: 0.04, color: colors.accent, opacity: 0.3 },
      { cx: 0.65, cy: 0.7, rx: 0.02, ry: 0.03, color: colors.hueGreen, opacity: 0.2 },
      { cx: 0.82, cy: 0.73, rx: 0.03, ry: 0.035, color: colors.hueCyan, opacity: 0.25 },
      { cx: 0.4, cy: 0.76, rx: 0.02, ry: 0.03, color: colors.hueBlue, opacity: 0.2 },
    ],
  });

  // Rising bioluminescent particles
  const particles = starFieldBrick(p, {
    id: "ds-p-bl",
    count: 45,
    brightCount: 6,
    color: colors.hueCyan,
    distribution: "full",
    opacity: 0.5,
  });

  const vignette = vignetteBrick(p, { id: "ds-p-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ds-p-n", opacity: 0.04 });
  return mergeBricks([bg, ocean, glows, reef, particles, vignette, noise]);
}
