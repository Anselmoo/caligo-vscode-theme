/**
 * MidnightAtelier motif — 5 studio / material / art night scenes.
 *
 * Stillness : Moonlit studio window — view of rooftops and sky
 * Drift     : Ink wash — brushstroke sweeping across wet paper
 * Break     : Fractured canvas — angular shards of night light
 * Void      : Charcoal cave — single form barely emerging
 * Pulse     : Stained glass — moonlight through cathedral window
 */
import {
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  horizonGlowBrick,
  nebulaGlowBrick,
  noiseBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainStackBrick,
  vignetteBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function midnightAtelier(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return midnightDrift(params);
    case "split-complementary":
      return midnightBreak(params);
    case "monochromatic":
      return midnightVoid(params);
    case "triadic":
      return midnightPulse(params);
    default:
      return midnightStillness(params);
  }
}

/* ── Stillness: Moonlit studio — rooftops through window ──────────────────── */
function midnightStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mi-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "35%", color: colors.bgSoft },
      { offset: "60%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Moon in upper corner
  const moon = celestialBrick(p, {
    id: "mi-s-mn",
    cx: 0.72,
    cy: 0.18,
    r: 0.035,
    color: colors.bgSoft,
    glowColor: colors.hueYellow,
    glowSize: 0.08,
  });

  // Warm interior glow — from a lamp
  const lampGlow = nebulaGlowBrick(p, {
    id: "mi-s-lg",
    blur: 0.06,
    blobs: [{ cx: 0.5, cy: 0.5, rx: 0.15, ry: 0.12, color: colors.hueOrange, opacity: 0.12 }],
  });

  // Rooftop silhouettes visible through window
  const rooftops = terrainStackBrick(p, {
    id: "mi-s-rt",
    points: 18,
    layers: [
      { baseY: 0.62, roughness: 0.06, color: colors.bgMid, opacity: 0.5 },
      { baseY: 0.7, roughness: 0.04, color: colors.bgSoft, opacity: 0.65 },
      { baseY: 0.78, roughness: 0.03, color: colors.bg, opacity: 0.85 },
    ],
  });

  // City light glow at horizon
  const hGlow = horizonGlowBrick(p, {
    id: "mi-s-hg",
    y: 0.68,
    color: colors.hueOrange,
    opacity: 0.08,
    height: 0.06,
  });

  const stars = starFieldBrick(p, {
    id: "mi-s-st",
    count: 45,
    brightCount: 3,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.4,
  });

  const vignette = vignetteBrick(p, { id: "mi-s-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "mi-s-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, moon, lampGlow, hGlow, rooftops, vignette, noise]);
}

/* ── Drift: Ink wash — sweeping brushstroke on wet paper ──────────────────── */
function midnightDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Paper texture — warm subtle gradient
  const paper = skyGradientBrick(p, {
    id: "mi-d-pap",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.3 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Ink wash — using terrain-like Bézier shapes as brush strokes
  const stroke = terrainStackBrick(p, {
    id: "mi-d-str",
    points: 20,
    layers: [
      { baseY: 0.35, roughness: 0.15, color: colors.accent, opacity: 0.3 },
      { baseY: 0.45, roughness: 0.12, color: colors.accentSoft, opacity: 0.2 },
      { baseY: 0.55, roughness: 0.1, color: colors.accentMuted, opacity: 0.12 },
    ],
  });

  // Ink bloom — radial glow where brush lands
  const bloom = nebulaGlowBrick(p, {
    id: "mi-d-bl",
    blur: 0.05,
    blobs: [{ cx: 0.7, cy: 0.5, rx: 0.12, ry: 0.08, color: colors.accent, opacity: 0.15 }],
  });

  // Ink splatters — sparse dots
  const splatters = starFieldBrick(p, {
    id: "mi-d-sp",
    count: 25,
    brightCount: 5,
    color: colors.accentMuted,
    distribution: "full",
    opacity: 0.3,
  });

  // Paper grain
  const grain = cloudBandBrick(p, {
    id: "mi-d-gr",
    cy: 0.5,
    bandHeight: 0.8,
    color: colors.bgSoft,
    opacity: 0.04,
    frequency: 0.02,
    seed: 23,
  });

  const vignette = vignetteBrick(p, { id: "mi-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mi-d-n", baseFrequency: 0.85, opacity: 0.05 });
  return mergeBricks([bg, paper, grain, bloom, stroke, splatters, vignette, noise]);
}

/* ── Break: Fractured canvas — angular night light ────────────────────────── */
function midnightBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Multi-layer angular terrain creating shard-like shapes
  const sky = skyGradientBrick(p, {
    id: "mi-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Shard layers — sharp angular terrain at different heights
  const shard1 = terrainStackBrick(p, {
    id: "mi-b-sh1",
    points: 12,
    layers: [{ baseY: 0.2, roughness: 0.18, color: colors.bgMid, opacity: 0.45 }],
  });
  const shard2 = terrainStackBrick(p, {
    id: "mi-b-sh2",
    points: 10,
    layers: [{ baseY: 0.4, roughness: 0.2, color: colors.bgSoft, opacity: 0.35 }],
  });
  const shard3 = terrainStackBrick(p, {
    id: "mi-b-sh3",
    points: 14,
    layers: [{ baseY: 0.6, roughness: 0.15, color: colors.bgMid, opacity: 0.5 }],
  });

  // Light bleeding through cracks
  const crackLight = nebulaGlowBrick(p, {
    id: "mi-b-cl",
    blur: 0.03,
    blobs: [
      { cx: 0.3, cy: 0.35, rx: 0.02, ry: 0.08, color: colors.accent, opacity: 0.3 },
      { cx: 0.55, cy: 0.5, rx: 0.015, ry: 0.1, color: colors.accentSoft, opacity: 0.25 },
      { cx: 0.75, cy: 0.3, rx: 0.02, ry: 0.06, color: colors.accent, opacity: 0.2 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "mi-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mi-b-n", opacity: 0.04 });
  return mergeBricks([bg, sky, shard1, shard2, crackLight, shard3, vignette, noise]);
}

/* ── Void: Charcoal cave — single form in darkness ────────────────────────── */
function midnightVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const dark = skyGradientBrick(p, {
    id: "mi-v-dk",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.2 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Single emerging form — soft terrain ridge barely visible
  const form = terrainStackBrick(p, {
    id: "mi-v-fm",
    points: 14,
    layers: [{ baseY: 0.55, roughness: 0.06, color: colors.bgMid, opacity: 0.15 }],
  });

  // Faint haze
  const haze = cloudBandBrick(p, {
    id: "mi-v-hz",
    cy: 0.5,
    bandHeight: 0.3,
    color: colors.bgSoft,
    opacity: 0.05,
    frequency: 0.003,
    seed: 47,
  });

  const vignette = vignetteBrick(p, { id: "mi-v-vig", opacity: 0.85 });
  const noise = noiseBrick(p, { id: "mi-v-n", opacity: 0.04 });
  return mergeBricks([bg, dark, haze, form, vignette, noise]);
}

/* ── Pulse: Stained glass — moonlight through cathedral ───────────────────── */
function midnightPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mi-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "45%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Colored light panels — nebula glows simulating stained glass light
  const glass = nebulaGlowBrick(p, {
    id: "mi-p-gl",
    blur: 0.04,
    blobs: [
      { cx: 0.15, cy: 0.2, rx: 0.1, ry: 0.15, color: colors.accent, opacity: 0.18 },
      { cx: 0.4, cy: 0.3, rx: 0.12, ry: 0.18, color: colors.hueBlue, opacity: 0.12 },
      { cx: 0.65, cy: 0.2, rx: 0.1, ry: 0.15, color: colors.huePurple, opacity: 0.15 },
      { cx: 0.85, cy: 0.35, rx: 0.08, ry: 0.12, color: colors.hueGreen, opacity: 0.1 },
      { cx: 0.3, cy: 0.6, rx: 0.12, ry: 0.15, color: colors.hueCyan, opacity: 0.12 },
      { cx: 0.55, cy: 0.55, rx: 0.1, ry: 0.15, color: colors.accent, opacity: 0.15 },
      { cx: 0.78, cy: 0.6, rx: 0.08, ry: 0.12, color: colors.hueBlue, opacity: 0.1 },
    ],
  });

  // Moonlight beam — top-down soft glow
  const moonbeam = nebulaGlowBrick(p, {
    id: "mi-p-mb",
    blur: 0.06,
    blobs: [{ cx: 0.5, cy: 0.0, rx: 0.3, ry: 0.5, color: "#ffffff", opacity: 0.06 }],
  });

  // Floor silhouette
  const floor = terrainStackBrick(p, {
    id: "mi-p-fl",
    points: 10,
    layers: [{ baseY: 0.82, roughness: 0.02, color: colors.bg, opacity: 0.9 }],
  });

  const vignette = vignetteBrick(p, { id: "mi-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "mi-p-n", opacity: 0.04 });
  return mergeBricks([bg, sky, moonbeam, glass, floor, vignette, noise]);
}
