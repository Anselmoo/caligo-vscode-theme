/**
 * GraphiteFlux motif — 5 urban night scenes, one per harmony mode.
 *
 * Stillness : City skyline — sharp building silhouettes against night sky
 * Drift     : Wet streets — rain reflections on puddle surfaces
 * Break     : Thunderstrike — lightning over the city
 * Void      : Dense fog — buildings vanishing in mist
 * Pulse     : Bridge at night — cables and lights reflected in water
 */
import {
  atmosphereBrick,
  backgroundBrick,
  cityscapeBrick,
  cloudBandBrick,
  horizonGlowBrick,
  lightningBrick,
  nebulaGlowBrick,
  noiseBrick,
  raysBrick,
  ringBrick,
  shootingStarBrick,
  skyGradientBrick,
  sparksBrick,
  starFieldBrick,
  terrainBrick,
  terrainStackBrick,
  vignetteBrick,
  waterReflectionBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function graphiteFlux(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return graphiteDrift(params);
    case "split-complementary":
      return graphiteBreak(params);
    case "monochromatic":
      return graphiteVoid(params);
    case "triadic":
      return graphitePulse(params);
    default:
      return graphiteStillness(params);
  }
}

/* ── Stillness: City skyline at night — viewed from distance ─────────────── */
function graphiteStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Night sky — dark above, light pollution glow towards city
  const sky = skyGradientBrick(p, {
    id: "gf-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "55%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "gf-s-st",
    count: 200,
    brightCount: 6,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.35,
  });

  // Urban light pollution glow on horizon — BEHIND the skyline
  const urbanGlow = horizonGlowBrick(p, {
    id: "gf-s-ug",
    y: 0.60,
    color: colors.hueOrange,
    opacity: 0.12,
    height: 0.12,
  });

  // Ground planes anchor each city layer — without these the buildings float in sky
  const skylineGround = terrainBrick(p, {
    id: "gf-s-sgr",
    baseY: 0.60,
    roughness: 0.012,
    points: 14,
    color: colors.bgMid,
    opacity: 0.9,
  });

  const skyline = cityscapeBrick(p, {
    id: "gf-s-sl",
    baseY: 0.78,
    heightRange: [0.08, 0.2],
    density: 14,
    color: colors.bgMid,
    opacity: 0.8,
    hasWindows: true,
    windowProbability: 0.04,
  });

  // Near ground covers lower portion of far skyline — creates perspective depth
  const buildingGround = terrainBrick(p, {
    id: "gf-s-bgr",
    baseY: 0.70,
    roughness: 0.008,
    points: 12,
    color: colors.bg,
    opacity: 1.0,
  });

  const buildings = cityscapeBrick(p, {
    id: "gf-s-bld",
    baseY: 0.88,
    heightRange: [0.06, 0.14],
    density: 8,
    color: colors.bg,
    opacity: 0.95,
    hasWindows: false,
  });

  // Streetlight rays from cityscape — vertical accent
  const streetRays = raysBrick(p, {
    id: "gf-s-ray",
    cx: 0.5,
    cy: 0.78,
    count: 3,
    length: 0.12,
    color: colors.hueYellow,
    distribution: "full",
    maxY: 0.55,
    opacity: 0.6,
  });

  // Atmospheric light pollution haze
  const atmo = atmosphereBrick(p, {
    id: "gf-s-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueOrange,
    opacity: 0.06,
    lightAzimuth: 180,
    lightElevation: 20,
    seed: 9,
  });

  const meteor = shootingStarBrick(p, {
    id: "gf-s-mt",
    count: 1,
    color: "#ffffff",
    opacity: 0.3,
  });

  const vignette = vignetteBrick(p, { id: "gf-s-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "gf-s-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, urbanGlow, skylineGround, skyline, buildingGround, buildings, lights, vignette, noise]);
}

/* ── Drift: Wet streets — rain reflections ────────────────────────────────── */
function graphiteDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "gf-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "45%", color: colors.bgSoft },
      { offset: "55%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // City grounded in lower third — buildings grow upward from base
  const skyline = cityscapeBrick(p, {
    id: "gf-d-sl",
    baseY: 0.72,
    heightRange: [0.1, 0.22],
    density: 12,
    color: colors.bgMid,
    opacity: 0.7,
    hasWindows: true,
    windowProbability: 0.07,
  });

  // Street level between building bases and water surface — grounds the cityscape
  const street = terrainBrick(p, {
    id: "gf-d-str",
    baseY: 0.52,
    roughness: 0.006,
    points: 10,
    color: colors.bgSoft,
    opacity: 0.85,
  });

  const neon = nebulaGlowBrick(p, {
    id: "gf-d-ne",
    blur: 0.03,
    blobs: [
      { cx: 0.2, cy: 0.62, rx: 0.015, ry: 0.01, color: colors.accent, opacity: 0.5 },
      { cx: 0.45, cy: 0.58, rx: 0.012, ry: 0.008, color: colors.hueBlue, opacity: 0.4 },
      { cx: 0.7, cy: 0.65, rx: 0.018, ry: 0.012, color: colors.hueOrange, opacity: 0.45 },
      { cx: 0.85, cy: 0.6, rx: 0.01, ry: 0.008, color: colors.accent, opacity: 0.35 },
    ],
  });

  // Wet street reflection below city
  const reflection = waterReflectionBrick(p, {
    id: "gf-d-ref",
    waterY: 0.72,
    color: colors.bgSoft,
    opacity: 0.08,
    rippleScale: 8,
    rippleFrequency: 0.025,
  });

  const clouds = cloudBandBrick(p, {
    id: "gf-d-cl",
    cy: 0.15,
    bandHeight: 0.25,
    color: colors.bgMid,
    opacity: 0.12,
    frequency: 0.004,
    seed: 7,
  });

  const rainAtmo = atmosphereBrick(p, {
    id: "gf-d-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueBlue,
    opacity: 0.08,
    lightAzimuth: 210,
    lightElevation: 20,
    seed: 11,
  });

  const vignette = vignetteBrick(p, { id: "gf-d-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "gf-d-n", opacity: 0.04 });
  return mergeBricks([bg, sky, clouds, skyline, street, neon, reflection, vignette, noise]);
}

/* ── Break: Thunderstrike — lightning over city ───────────────────────────── */
function graphiteBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "gf-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  const clouds1 = cloudBandBrick(p, {
    id: "gf-b-c1",
    cy: 0.12,
    bandHeight: 0.2,
    color: colors.bgMid,
    opacity: 0.2,
    frequency: 0.005,
    seed: 3,
  });
  const clouds2 = cloudBandBrick(p, {
    id: "gf-b-c2",
    cy: 0.25,
    bandHeight: 0.15,
    color: colors.bgSoft,
    opacity: 0.12,
    frequency: 0.006,
    seed: 17,
  });

  const bolt = lightningBrick(p, {
    id: "gf-b-lt",
    startX: 0.48,
    startY: 0.05,
    color: colors.hueCyan,
    branches: 3,
  });

  const flash = nebulaGlowBrick(p, {
    id: "gf-b-fl",
    blur: 0.08,
    blobs: [{ cx: 0.48, cy: 0.3, rx: 0.3, ry: 0.2, color: colors.hueCyan, opacity: 0.08 }],
  });

  // City skyline silhouette — grounded in lower third
  const skyline = terrainStackBrick(p, {
    id: "gf-b-sl",
    points: 28,
    layers: [
      { baseY: 0.68, roughness: 0.1, color: colors.bgMid, opacity: 0.6 },
      { baseY: 0.78, roughness: 0.06, color: colors.bg, opacity: 0.9 },
    ],
  });

  const lightSparks = sparksBrick(p, {
    id: "gf-b-lsp",
    count: 20,
    color: colors.hueCyan,
    opacity: 0.4,
    direction: 1,
    sourceCx: 0.48,
    sourceSpread: 0.15,
  });

  const vignette = vignetteBrick(p, { id: "gf-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "gf-b-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    clouds1,
    clouds2,
    flash,
    bolt,
    skyline,
    lightSparks,
    vignette,
    noise,
  ]);
}

/* ── Void: Dense fog — buildings vanishing ────────────────────────────────── */
function graphiteVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "gf-v-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.4 },
      { offset: "100%", color: colors.bg },
    ],
  });

  const fog1 = cloudBandBrick(p, {
    id: "gf-v-f1",
    cy: 0.3,
    bandHeight: 0.2,
    color: colors.bgSoft,
    opacity: 0.15,
    frequency: 0.003,
    seed: 31,
  });
  const fog2 = cloudBandBrick(p, {
    id: "gf-v-f2",
    cy: 0.5,
    bandHeight: 0.25,
    color: colors.bgMid,
    opacity: 0.2,
    frequency: 0.004,
    seed: 43,
  });
  const fog3 = cloudBandBrick(p, {
    id: "gf-v-f3",
    cy: 0.7,
    bandHeight: 0.2,
    color: colors.bgSoft,
    opacity: 0.12,
    frequency: 0.005,
    seed: 53,
  });

  // Faint street level — city ground plane, barely visible through fog
  const ghostGround = terrainBrick(p, {
    id: "gf-v-ggr",
    baseY: 0.58,
    roughness: 0.006,
    points: 10,
    color: colors.bgMid,
    opacity: 0.15,
  });

  const ghost = cityscapeBrick(p, {
    id: "gf-v-gh",
    baseY: 0.72,
    heightRange: [0.1, 0.22],
    density: 10,
    color: colors.bgMid,
    opacity: 0.2,
    hasWindows: false,
  });

  const light = nebulaGlowBrick(p, {
    id: "gf-v-li",
    blur: 0.05,
    blobs: [{ cx: 0.5, cy: 0.65, rx: 0.06, ry: 0.04, color: colors.hueYellow, opacity: 0.12 }],
  });

  const fogAtmo = atmosphereBrick(p, {
    id: "gf-v-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueYellow,
    opacity: 0.07,
    lightAzimuth: 180,
    lightElevation: 15,
    seed: 23,
  });

  // Diffused light beams through fog — vertical/diagonal depth cue
  const fogRays = raysBrick(p, {
    id: "gf-v-ray",
    cx: 0.5,
    cy: 0.65,
    count: 4,
    length: 0.3,
    color: colors.hueYellow,
    opacity: 0.04,
    spreadDeg: 40,
    startDeg: 250,
  });

  const vignette = vignetteBrick(p, { id: "gf-v-vig", opacity: 0.75 });
  const noise = noiseBrick(p, { id: "gf-v-n", opacity: 0.04 });
  return mergeBricks([bg, sky, ghostGround, ghost, fog1, fog2, light, fog3, vignette, noise]);
}

/* ── Pulse: Bridge at night — lights reflected in water ───────────────────── */
function graphitePulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "gf-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "50%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Bridge structure grounded — spans across the lower half
  const bridge = terrainStackBrick(p, {
    id: "gf-p-br",
    points: 20,
    layers: [
      { baseY: 0.58, roughness: 0.04, color: colors.bgMid, opacity: 0.6 },
      { baseY: 0.64, roughness: 0.03, color: colors.bg, opacity: 0.8 },
    ],
  });

  const bridgeLights = nebulaGlowBrick(p, {
    id: "gf-p-bl",
    blur: 0.02,
    blobs: [
      { cx: 0.15, cy: 0.6, rx: 0.01, ry: 0.008, color: colors.hueYellow, opacity: 0.5 },
      { cx: 0.35, cy: 0.58, rx: 0.012, ry: 0.009, color: colors.hueOrange, opacity: 0.45 },
      { cx: 0.55, cy: 0.59, rx: 0.01, ry: 0.008, color: colors.hueYellow, opacity: 0.5 },
      { cx: 0.75, cy: 0.6, rx: 0.012, ry: 0.009, color: colors.hueOrange, opacity: 0.45 },
      { cx: 0.9, cy: 0.59, rx: 0.01, ry: 0.008, color: colors.hueYellow, opacity: 0.4 },
    ],
  });

  // Water below bridge
  const water = waterReflectionBrick(p, {
    id: "gf-p-wa",
    waterY: 0.66,
    color: colors.bgSoft,
    opacity: 0.08,
    rippleScale: 10,
    rippleFrequency: 0.02,
  });

  const cityGlow = horizonGlowBrick(p, {
    id: "gf-p-cg",
    y: 0.62,
    color: colors.hueOrange,
    opacity: 0.1,
    height: 0.06,
  });

  const stars = starFieldBrick(p, {
    id: "gf-p-st",
    count: 220,
    brightCount: 6,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.3,
  });

  // Moon over bridge
  const bridgeMoon = ringBrick(p, {
    id: "gf-p-mr",
    cx: 0.82,
    cy: 0.15,
    r: 0.04,
    strokeWidth: 2,
    color: colors.bgSoft,
    opacity: 0.4,
  });

  const pulseMeteor = shootingStarBrick(p, {
    id: "gf-p-mt",
    count: 1,
    color: "#ffffff",
    opacity: 0.25,
  });

  const vignette = vignetteBrick(p, { id: "gf-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "gf-p-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    stars,
    pulseMeteor,
    cityGlow,
    bridge,
    bridgeLights,
    bridgeMoon,
    water,
    vignette,
    noise,
  ]);
}
