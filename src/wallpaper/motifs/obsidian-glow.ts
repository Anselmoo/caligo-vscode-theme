/**
 * ObsidianGlow motif — 5 volcanic and mineral night scenes.
 *
 * Stillness : Obsidian volcanic plain under full moon
 * Drift     : Glacial ice strata reflecting cold moonlight
 * Break     : Geothermal vent erupting at night
 * Void      : Crystal cave — single distant light source
 * Pulse     : Mountain peak mirrored in obsidian lake
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
  volcanoBrick,
  waterReflectionBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function obsidianGlow(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return obsidianDrift(params);
    case "split-complementary":
      return obsidianBreak(params);
    case "monochromatic":
      return obsidianVoid(params);
    case "triadic":
      return obsidianPulse(params);
    default:
      return obsidianStillness(params);
  }
}

/* ── Stillness: Obsidian plain under full moon ────────────────────────────── */
function obsidianStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "og-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "35%", color: colors.bgSoft },
      { offset: "60%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Full moon
  const moon = celestialBrick(p, {
    id: "og-s-mn",
    cx: 0.5,
    cy: 0.25,
    r: 0.055,
    color: "#c8d0e0",
    glowColor: colors.hueCyan,
    glowSize: 2.18,
  });

  // Volcanic plain terrain
  const terrain = terrainStackBrick(p, {
    id: "og-s-tr",
    points: 22,
    layers: [
      { baseY: 0.55, roughness: 0.08, color: colors.bgMid, opacity: 0.6 },
      { baseY: 0.62, roughness: 0.06, color: colors.bgSoft, opacity: 0.7 },
      { baseY: 0.72, roughness: 0.04, color: colors.bg, opacity: 0.9 },
    ],
  });

  // Moonlight reflection on glassy obsidian floor
  const reflection = nebulaGlowBrick(p, {
    id: "og-s-ref",
    blur: 0.04,
    blobs: [{ cx: 0.5, cy: 0.85, rx: 0.15, ry: 0.06, color: colors.hueCyan, opacity: 0.08 }],
  });

  // Horizon glow from volcanic activity
  const hGlow = horizonGlowBrick(p, {
    id: "og-s-hg",
    y: 0.6,
    color: colors.hueOrange,
    opacity: 0.06,
    height: 0.05,
  });

  const stars = starFieldBrick(p, {
    id: "og-s-st",
    count: 80,
    brightCount: 5,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.5,
  });

  const vignette = vignetteBrick(p, { id: "og-s-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "og-s-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, moon, hGlow, terrain, reflection, vignette, noise]);
}

/* ── Drift: Glacial ice strata ────────────────────────────────────────────── */
function obsidianDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "og-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "60%", color: colors.hueCyan, opacity: 0.08 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Glacial ice layers — terrain stacks at shallow angles
  const ice = terrainStackBrick(p, {
    id: "og-d-ice",
    points: 20,
    layers: [
      { baseY: 0.52, roughness: 0.03, color: colors.hueCyan, opacity: 0.1 },
      { baseY: 0.6, roughness: 0.025, color: colors.hueBlue, opacity: 0.08 },
      { baseY: 0.68, roughness: 0.03, color: colors.hueCyan, opacity: 0.06 },
      { baseY: 0.76, roughness: 0.02, color: colors.hueBlue, opacity: 0.05 },
    ],
  });

  // Crystal refraction texture
  const crystals = cloudBandBrick(p, {
    id: "og-d-cr",
    cy: 0.45,
    bandHeight: 0.2,
    color: colors.hueCyan,
    opacity: 0.06,
    frequency: 0.008,
    seed: 31,
  });

  // Dark moraine foreground
  const moraine = terrainStackBrick(p, {
    id: "og-d-mo",
    points: 14,
    layers: [{ baseY: 0.72, roughness: 0.04, color: colors.bg, opacity: 0.92 }],
  });

  const stars = starFieldBrick(p, {
    id: "og-d-st",
    count: 60,
    brightCount: 4,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.4,
  });

  const vignette = vignetteBrick(p, { id: "og-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "og-d-n", opacity: 0.04 });
  return mergeBricks([bg, sky, crystals, ice, stars, moraine, vignette, noise]);
}

/* ── Break: Geothermal vent erupting ──────────────────────────────────────── */
function obsidianBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "og-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "70%", color: colors.hueOrange, opacity: 0.1 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Volcanic cone
  const volcano = volcanoBrick(p, {
    id: "og-b-vc",
    cx: 0.5,
    baseY: 0.75,
    peakHeight: 0.35,
    craterWidth: 0.03,
    color: colors.bgMid,
    lavaColor: colors.hueOrange,
  });

  // Lava glow at vent
  const lavaGlow = nebulaGlowBrick(p, {
    id: "og-b-lg",
    blur: 0.05,
    blobs: [
      { cx: 0.5, cy: 0.42, rx: 0.05, ry: 0.04, color: colors.hueOrange, opacity: 0.4 },
      { cx: 0.5, cy: 0.42, rx: 0.12, ry: 0.08, color: colors.hueRed, opacity: 0.15 },
    ],
  });

  // Steam and ash cloud
  const steam = cloudBandBrick(p, {
    id: "og-b-st",
    cy: 0.2,
    bandHeight: 0.2,
    color: colors.bgSoft,
    opacity: 0.07,
    frequency: 0.006,
    seed: 13,
  });

  // Ember particles
  const embers = starFieldBrick(p, {
    id: "og-b-em",
    count: 35,
    brightCount: 10,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.5,
  });

  const stars = starFieldBrick(p, {
    id: "og-b-stars",
    count: 50,
    brightCount: 3,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.35,
  });

  const vignette = vignetteBrick(p, { id: "og-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "og-b-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, lavaGlow, steam, volcano, embers, vignette, noise]);
}

/* ── Void: Crystal cave — single distant light ────────────────────────────── */
function obsidianVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const dark = skyGradientBrick(p, {
    id: "og-v-dk",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.15 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Cave walls — converging terrain layers from sides
  const wallL = terrainStackBrick(p, {
    id: "og-v-wl",
    points: 12,
    layers: [{ baseY: 0.2, roughness: 0.08, color: colors.bgMid, opacity: 0.4 }],
  });
  const wallR = terrainStackBrick(p, {
    id: "og-v-wr",
    points: 12,
    layers: [{ baseY: 0.3, roughness: 0.06, color: colors.bgMid, opacity: 0.35 }],
  });

  // Single distant light point
  const light = nebulaGlowBrick(p, {
    id: "og-v-li",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.48, rx: 0.02, ry: 0.02, color: colors.hueCyan, opacity: 0.5 },
      { cx: 0.5, cy: 0.48, rx: 0.06, ry: 0.06, color: colors.accent, opacity: 0.1 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "og-v-vig", opacity: 0.88 });
  const noise = noiseBrick(p, { id: "og-v-n", opacity: 0.04 });
  return mergeBricks([bg, dark, wallL, wallR, light, vignette, noise]);
}

/* ── Pulse: Mountain peak mirrored in obsidian lake ───────────────────────── */
function obsidianPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "og-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "48%", color: colors.bgMid },
      { offset: "52%", color: colors.bgMid },
      { offset: "70%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Mountain peaks above waterline
  const peaks = terrainStackBrick(p, {
    id: "og-p-pk",
    points: 18,
    layers: [
      { baseY: 0.35, roughness: 0.1, color: colors.bgMid, opacity: 0.5 },
      { baseY: 0.42, roughness: 0.08, color: colors.bgSoft, opacity: 0.65 },
      { baseY: 0.48, roughness: 0.05, color: colors.bg, opacity: 0.85 },
    ],
  });

  // Moon above peaks
  const moon = celestialBrick(p, {
    id: "og-p-mn",
    cx: 0.5,
    cy: 0.15,
    r: 0.04,
    color: "#c8d0e0",
    glowColor: colors.hueCyan,
    glowSize: 2.0,
  });

  // Lake reflection — water surface with ripple
  const lake = waterReflectionBrick(p, {
    id: "og-p-lk",
    waterY: 0.5,
    color: colors.bgSoft,
    opacity: 0.2,
    rippleScale: 6,
    rippleFrequency: 0.02,
  });

  // Moon reflection in water
  const moonRefl = nebulaGlowBrick(p, {
    id: "og-p-mr",
    blur: 0.03,
    blobs: [{ cx: 0.5, cy: 0.85, rx: 0.04, ry: 0.02, color: colors.bgSoft, opacity: 0.2 }],
  });

  const stars = starFieldBrick(p, {
    id: "og-p-st",
    count: 65,
    brightCount: 4,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.45,
  });

  const vignette = vignetteBrick(p, { id: "og-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "og-p-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, moon, peaks, lake, moonRefl, vignette, noise]);
}
