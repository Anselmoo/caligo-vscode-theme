/**
 * Cinder motif — 5 fire / ash night scenes, one per harmony mode.
 *
 * Stillness : Smouldering treeline — embers drift from a silent, burnt forest
 * Drift     : Volcanic ridge — lava veins glowing below a dark terrain
 * Break     : Lightning strike — electric fork over a burning ridge
 * Void      : Ash haze — desolation scene with near-invisible horizon
 * Pulse     : Night campfire — warm glow illuminating sparse trees and sparks
 */
import {
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  constellationBrick,
  fogWispBrick,
  horizonGlowBrick,
  lightningBrick,
  nebulaGlowBrick,
  noiseBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainBrick,
  terrainStackBrick,
  toneCurveBrick,
  treelineBrick,
  vignetteBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

/* --- re-export under the same public name -------------------------------- */
import { sparksBrick, radialGradientBrick } from "../bricks/index.js";

export function cinder(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return cinderDrift(params);
    case "split-complementary":
      return cinderBreak(params);
    case "monochromatic":
      return cinderVoid(params);
    case "triadic":
      return cinderPulse(params);
    default:
      return cinderStillness(params);
  }
}

/* ── Stillness: Smouldering treeline — embers from burnt forest ───────────── */
function cinderStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ci-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "35%", color: colors.bgSoft },
      { offset: "60%", color: colors.hueRed, opacity: 0.06 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Crescent moon with craters in smoky sky
  const moon = celestialBrick(p, {
    id: "ci-s-mn",
    cx: 0.22,
    cy: 0.15,
    r: 0.028,
    color: "#c8a880",
    glowColor: colors.hueOrange,
    glowSize: 2.5,
    glowOpacity: 0.1,
    crescent: { offsetX: -0.006, offsetY: -0.003, color: colors.bg },
    texture: true,
    craterCount: 3,
  });

  // Stars with warm color tints
  const stars = starFieldBrick(p, {
    id: "ci-s-st",
    count: 60,
    brightCount: 3,
    featureCount: 2,
    color: "#ffffff",
    color2: "#ffe8d0",
    distribution: "upper",
    opacity: 0.4,
  });

  // Sparks rising from the treeline
  const sparks = sparksBrick(p, {
    id: "ci-s-sp",
    count: 60,
    color: colors.hueOrange,
    opacity: 0.6,
    sourceCx: 0.5,
    sourceSpread: 0.4,
  });

  // Background fire glow — radial gradient behind treeline
  const fireGlow = radialGradientBrick(p, {
    id: "ci-s-fg",
    cx: 0.5,
    cy: 0.55,
    r: 0.25,
    stops: [
      { offset: "0%", color: colors.hueOrange, opacity: 0.12 },
      { offset: "100%", color: colors.hueOrange, opacity: 0 },
    ],
    opacity: 0.12,
  });

  // Pine tree silhouettes — using treelineBrick for detailed trees
  const trees = treelineBrick(p, {
    id: "ci-s-tree",
    baseY: 0.58,
    count: 18,
    minHeight: 0.08,
    maxHeight: 0.18,
    color: colors.bg,
    opacity: 0.9,
    minTiers: 2,
    maxTiers: 4,
  });

  // Foreground burnt terrain
  const ground = terrainBrick(p, {
    id: "ci-s-gr",
    baseY: 0.8,
    roughness: 0.04,
    points: 18,
    color: colors.bg,
    opacity: 0.95,
  });

  // Smoke wisps drifting from treeline
  const smoke = fogWispBrick(p, {
    id: "ci-s-smoke",
    cy: 0.5,
    hazeCount: 3,
    wispCount: 4,
    color: colors.bgMid,
    hazeOpacity: 0.06,
    wispOpacity: 0.04,
  });

  const tone = toneCurveBrick(p, {
    id: "ci-s-tone",
    preset: "cinematic",
    opacity: 0.15,
  });

  const vignette = vignetteBrick(p, { id: "ci-s-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ci-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    moon,
    stars,
    fireGlow,
    trees,
    sparks,
    smoke,
    ground,
    tone,
    vignette,
    noise,
  ]);
}

/* ── Drift: Volcanic ridge — lava veins below dark terrain ────────────────── */
function cinderDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ci-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "50%", color: colors.hueRed, opacity: 0.08 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Stars with features
  const stars = starFieldBrick(p, {
    id: "ci-d-st",
    count: 55,
    brightCount: 3,
    featureCount: 2,
    color: "#ffffff",
    color2: "#ffe8d0",
    distribution: "upper",
    opacity: 0.35,
  });

  // Lava glow along horizon
  const lavaGlow = horizonGlowBrick(p, {
    id: "ci-d-lg",
    y: 0.5,
    color: colors.hueOrange,
    opacity: 0.2,
    height: 0.12,
  });

  // Terrain with ridge highlight for lava glow effect
  const terrain = terrainStackBrick(p, {
    id: "ci-d-tr",
    points: 22,
    layers: [
      {
        baseY: 0.45,
        roughness: 0.1,
        color: colors.bgMid,
        opacity: 0.5,
        gradient: { topColor: colors.bgMid, bottomColor: colors.bg },
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueOrange,
      },
      {
        baseY: 0.55,
        roughness: 0.08,
        color: colors.bgSoft,
        opacity: 0.7,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueRed,
      },
      { baseY: 0.68, roughness: 0.06, color: colors.bg, opacity: 0.95 },
    ],
  });

  // Smoke/ash wisps
  const smoke = fogWispBrick(p, {
    id: "ci-d-smoke",
    cy: 0.42,
    hazeCount: 3,
    wispCount: 3,
    color: colors.bgSoft,
    hazeOpacity: 0.05,
    wispOpacity: 0.03,
  });

  const ashCloud = cloudBandBrick(p, {
    id: "ci-d-ash",
    cy: 0.2,
    bandHeight: 0.15,
    color: colors.bgMid,
    opacity: 0.08,
    frequency: 0.005,
    seed: 7,
  });

  const vignette = vignetteBrick(p, { id: "ci-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ci-d-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, ashCloud, lavaGlow, terrain, smoke, vignette, noise]);
}

/* ── Break: Lightning strike — electric fork over burning ridge ────────────── */
function cinderBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ci-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Stars with feature
  const stars = starFieldBrick(p, {
    id: "ci-b-st",
    count: 45,
    brightCount: 2,
    featureCount: 1,
    color: "#ffffff",
    color2: "#ddeeff",
    distribution: "upper",
    opacity: 0.35,
  });

  // Lightning bolt
  const bolt = lightningBrick(p, {
    id: "ci-b-lt",
    startX: 0.45,
    startY: 0.05,
    color: colors.hueCyan,
    branches: 3,
  });

  // Flash illumination
  const flash = nebulaGlowBrick(p, {
    id: "ci-b-fl",
    blur: 0.08,
    blobs: [{ cx: 0.45, cy: 0.3, rx: 0.25, ry: 0.15, color: colors.hueCyan, opacity: 0.06 }],
  });

  // Fire glow along the ridge
  const fireGlow = horizonGlowBrick(p, {
    id: "ci-b-fg",
    y: 0.52,
    color: colors.hueOrange,
    opacity: 0.15,
    height: 0.1,
  });

  // Burning ridge terrain with ridge highlight
  const ridge = terrainStackBrick(p, {
    id: "ci-b-rd",
    points: 20,
    layers: [
      {
        baseY: 0.48,
        roughness: 0.1,
        color: colors.bgMid,
        opacity: 0.6,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueOrange,
      },
      { baseY: 0.58, roughness: 0.06, color: colors.bg, opacity: 0.9 },
    ],
  });

  // Storm clouds
  const clouds = cloudBandBrick(p, {
    id: "ci-b-cl",
    cy: 0.12,
    bandHeight: 0.2,
    color: colors.bgMid,
    opacity: 0.15,
    frequency: 0.005,
    seed: 11,
  });

  const vignette = vignetteBrick(p, { id: "ci-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ci-b-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, clouds, flash, bolt, fireGlow, ridge, vignette, noise]);
}

/* ── Void: Ash haze — desolation with near-invisible horizon ──────────────── */
function cinderVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ci-v-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.2 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Ash haze — smothering fog wisps
  const ashFog = fogWispBrick(p, {
    id: "ci-v-fog",
    cy: 0.5,
    hazeCount: 5,
    wispCount: 3,
    color: colors.bgMid,
    hazeOpacity: 0.08,
    wispOpacity: 0.04,
  });

  // Barely visible terrain
  const desolation = terrainBrick(p, {
    id: "ci-v-ds",
    baseY: 0.72,
    roughness: 0.03,
    points: 14,
    color: colors.bgMid,
    opacity: 0.2,
  });

  // Single ember glow — barely alive fire source
  const ember = nebulaGlowBrick(p, {
    id: "ci-v-em",
    blur: 0.04,
    blobs: [{ cx: 0.5, cy: 0.68, rx: 0.03, ry: 0.02, color: colors.hueRed, opacity: 0.15 }],
  });

  const vignette = vignetteBrick(p, { id: "ci-v-vig", opacity: 0.85 });
  const noise = noiseBrick(p, { id: "ci-v-n", opacity: 0.03 });
  return mergeBricks([bg, sky, ashFog, ember, desolation, vignette, noise]);
}

/* ── Pulse: Night campfire — warm glow with sparks and trees ──────────────── */
function cinderPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ci-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "55%", color: colors.hueOrange, opacity: 0.05 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Multi-color stars with features
  const stars = starFieldBrick(p, {
    id: "ci-p-st",
    count: 90,
    brightCount: 5,
    featureCount: 3,
    color: "#ffffff",
    color2: "#ffe8d0",
    color3: "#ddeeff",
    distribution: "upper",
    opacity: 0.55,
  });

  // Constellations above the campfire scene
  const constellations = constellationBrick(p, {
    id: "ci-p-cst",
    count: 4,
    color: "#ffffff",
    starRadius: 1.5,
    lineOpacity: 0.08,
    starOpacity: 0.45,
  });

  // Campfire glow — warm radial
  const campfire = radialGradientBrick(p, {
    id: "ci-p-cf",
    cx: 0.5,
    cy: 0.72,
    r: 0.2,
    stops: [
      { offset: "0%", color: colors.hueOrange, opacity: 0.2 },
      { offset: "100%", color: colors.hueOrange, opacity: 0 },
    ],
    opacity: 0.2,
  });

  // Tree silhouettes around campfire — detailed trunks and tiers
  const trees = treelineBrick(p, {
    id: "ci-p-tree",
    baseY: 0.6,
    count: 14,
    minHeight: 0.1,
    maxHeight: 0.22,
    color: colors.bg,
    opacity: 0.9,
    minTiers: 2,
    maxTiers: 4,
  });

  // Sparks rising from fire
  const sparks = sparksBrick(p, {
    id: "ci-p-sp",
    count: 50,
    color: colors.hueOrange,
    opacity: 0.55,
    sourceCx: 0.5,
    sourceSpread: 0.2,
  });

  // Smoke wisps drifting up from fire
  const smoke = fogWispBrick(p, {
    id: "ci-p-smoke",
    cy: 0.55,
    hazeCount: 2,
    wispCount: 3,
    color: colors.bgMid,
    hazeOpacity: 0.04,
    wispOpacity: 0.03,
  });

  // Landing / terrain
  const ground = terrainBrick(p, {
    id: "ci-p-gr",
    baseY: 0.78,
    roughness: 0.03,
    points: 18,
    color: colors.bg,
    opacity: 0.95,
  });

  const vignette = vignetteBrick(p, { id: "ci-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ci-p-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    constellations,
    stars,
    campfire,
    trees,
    sparks,
    smoke,
    ground,
    vignette,
    noise,
  ]);
}
