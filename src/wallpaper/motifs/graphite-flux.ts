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
  celestialBrick,
  cloudBandBrick,
  fogWispBrick,
  horizonGlowBrick,
  lightningBrick,
  nebulaGlowBrick,
  noiseBrick,
  skyGradientBrick,
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

/* ── Stillness: City skyline at night ─────────────────────────────────────── */
function graphiteStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "gf-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "80%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  const urbanGlow = horizonGlowBrick(p, {
    id: "gf-s-ug",
    y: 0.62,
    color: colors.hueOrange,
    opacity: 0.15,
    height: 0.1,
  });

  const skyline = terrainBrick(p, {
    id: "gf-s-sl",
    baseY: 0.58,
    roughness: 0.12,
    points: 32,
    color: colors.bgMid,
    opacity: 0.85,
    ridgeHighlight: true,
    ridgeHighlightColor: colors.hueOrange,
  });

  const buildings = terrainBrick(p, {
    id: "gf-s-bld",
    baseY: 0.68,
    roughness: 0.08,
    points: 20,
    color: colors.bg,
    opacity: 0.95,
  });

  const lights = starFieldBrick(p, {
    id: "gf-s-li",
    count: 40,
    brightCount: 8,
    color: colors.hueYellow,
    color2: colors.hueOrange,
    distribution: "full",
    opacity: 0.6,
    featureCount: 2,
  });

  const stars = starFieldBrick(p, {
    id: "gf-s-st",
    count: 40,
    brightCount: 3,
    color: "#ffffff",
    color2: "#ddeeff",
    distribution: "upper",
    opacity: 0.35,
    featureCount: 2,
  });

  // Moon above city skyline
  const moon = celestialBrick(p, {
    id: "gf-s-mn",
    cx: 0.25,
    cy: 0.18,
    r: 0.03,
    color: "#e2ddd0",
    glowColor: colors.hueYellow,
    glowSize: 2.5,
    glowOpacity: 0.12,
    crescent: { offsetX: 0.008, offsetY: -0.003, color: colors.bg },
    craterCount: 3,
    texture: true,
  });

  const vignette = vignetteBrick(p, { id: "gf-s-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "gf-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    moon,
    stars,
    urbanGlow,
    skyline,
    buildings,
    lights,
    vignette,
    noise,
  ]);
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

  const skyline = terrainBrick(p, {
    id: "gf-d-sl",
    baseY: 0.48,
    roughness: 0.1,
    points: 24,
    color: colors.bgMid,
    opacity: 0.7,
    ridgeHighlight: true,
    ridgeHighlightColor: colors.hueBlue,
  });

  const neon = nebulaGlowBrick(p, {
    id: "gf-d-ne",
    blur: 0.03,
    blobs: [
      { cx: 0.2, cy: 0.46, rx: 0.015, ry: 0.01, color: colors.accent, opacity: 0.5 },
      { cx: 0.45, cy: 0.44, rx: 0.012, ry: 0.008, color: colors.hueBlue, opacity: 0.4 },
      { cx: 0.7, cy: 0.48, rx: 0.018, ry: 0.012, color: colors.hueOrange, opacity: 0.45 },
      { cx: 0.85, cy: 0.45, rx: 0.01, ry: 0.008, color: colors.accent, opacity: 0.35 },
    ],
  });

  const reflection = waterReflectionBrick(p, {
    id: "gf-d-ref",
    waterY: 0.55,
    color: colors.bgSoft,
    opacity: 0.2,
    rippleScale: 8,
    rippleFrequency: 0.025,
    rippleLines: 4,
    shimmerColor: colors.accent,
    shimmerOpacity: 0.05,
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

  // Rain haze atmosphere — cinematic depth
  const haze = atmosphereBrick(p, {
    id: "gf-d-hz",
    color: colors.bgMid,
    highlightColor: colors.hueBlue,
    turbulenceFreq: 0.004,
    displacementScale: 0.01,
    lightElevation: 20,
    lightAzimuth: 180,
    surfaceScale: 0.8,
    opacity: 0.06,
    seed: 13,
  });

  // Fog wisps drifting through rain-soaked streets
  const fog = fogWispBrick(p, {
    id: "gf-d-fg",
    cy: 0.52,
    hazeCount: 2,
    wispCount: 3,
    color: colors.bgMid,
    hazeOpacity: 0.04,
    wispOpacity: 0.03,
  });

  const vignette = vignetteBrick(p, { id: "gf-d-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "gf-d-n", opacity: 0.04 });
  return mergeBricks([bg, sky, clouds, skyline, neon, reflection, haze, fog, vignette, noise]);
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

  const skyline = terrainStackBrick(p, {
    id: "gf-b-sl",
    points: 28,
    layers: [
      {
        baseY: 0.55,
        roughness: 0.12,
        color: colors.bgMid,
        opacity: 0.6,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueCyan,
      },
      { baseY: 0.65, roughness: 0.08, color: colors.bg, opacity: 0.9 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "gf-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "gf-b-n", opacity: 0.04 });
  return mergeBricks([bg, sky, clouds1, clouds2, flash, bolt, skyline, vignette, noise]);
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

  const ghost = terrainBrick(p, {
    id: "gf-v-gh",
    baseY: 0.55,
    roughness: 0.06,
    points: 16,
    color: colors.bgMid,
    opacity: 0.2,
  });

  const light = nebulaGlowBrick(p, {
    id: "gf-v-li",
    blur: 0.05,
    blobs: [{ cx: 0.5, cy: 0.5, rx: 0.06, ry: 0.04, color: colors.hueYellow, opacity: 0.12 }],
  });

  // Thick rolling fog wisps in the void scene
  const thickFog = fogWispBrick(p, {
    id: "gf-v-fg",
    cy: 0.45,
    hazeCount: 4,
    wispCount: 5,
    color: colors.bgSoft,
    hazeOpacity: 0.06,
    wispOpacity: 0.04,
  });

  const vignette = vignetteBrick(p, { id: "gf-v-vig", opacity: 0.75 });
  const noise = noiseBrick(p, { id: "gf-v-n", opacity: 0.04 });
  return mergeBricks([bg, sky, ghost, fog1, fog2, light, thickFog, fog3, vignette, noise]);
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

  const bridge = terrainStackBrick(p, {
    id: "gf-p-br",
    points: 20,
    layers: [
      {
        baseY: 0.42,
        roughness: 0.06,
        color: colors.bgMid,
        opacity: 0.6,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueYellow,
      },
      { baseY: 0.48, roughness: 0.04, color: colors.bg, opacity: 0.8 },
    ],
  });

  const bridgeLights = nebulaGlowBrick(p, {
    id: "gf-p-bl",
    blur: 0.02,
    blobs: [
      { cx: 0.15, cy: 0.44, rx: 0.01, ry: 0.008, color: colors.hueYellow, opacity: 0.5 },
      { cx: 0.35, cy: 0.42, rx: 0.012, ry: 0.009, color: colors.hueOrange, opacity: 0.45 },
      { cx: 0.55, cy: 0.43, rx: 0.01, ry: 0.008, color: colors.hueYellow, opacity: 0.5 },
      { cx: 0.75, cy: 0.44, rx: 0.012, ry: 0.009, color: colors.hueOrange, opacity: 0.45 },
      { cx: 0.9, cy: 0.43, rx: 0.01, ry: 0.008, color: colors.hueYellow, opacity: 0.4 },
    ],
  });

  const water = waterReflectionBrick(p, {
    id: "gf-p-wa",
    waterY: 0.5,
    color: colors.bgSoft,
    opacity: 0.25,
    rippleScale: 10,
    rippleFrequency: 0.02,
    rippleLines: 5,
    shimmerColor: colors.hueYellow,
    shimmerOpacity: 0.06,
  });

  const cityGlow = horizonGlowBrick(p, {
    id: "gf-p-cg",
    y: 0.48,
    color: colors.hueOrange,
    opacity: 0.1,
    height: 0.06,
  });

  const stars = starFieldBrick(p, {
    id: "gf-p-st",
    count: 35,
    brightCount: 3,
    color: "#ffffff",
    color2: "#ddeeff",
    distribution: "upper",
    opacity: 0.3,
    featureCount: 1,
  });

  const vignette = vignetteBrick(p, { id: "gf-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "gf-p-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, cityGlow, bridge, bridgeLights, water, vignette, noise]);
}
