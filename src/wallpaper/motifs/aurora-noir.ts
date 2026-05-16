/**
 * AuroraNoir motif — 5 arctic aurora night scenes.
 *
 * Stillness : Fjord aurora — aurora reflected in still fjord water between mountain walls
 * Drift     : Ice shelf drift — aurora ribbons sweeping over snow-covered mountains
 * Break     : Cracking glacier — aurora shockwave over fractured ice terrain
 * Void      : Polar void — single thin aurora breath across desolate tundra
 * Pulse     : Pulse borealis — three aurora bands converge over layered peaks
 */
import {
  atmosphereBrick,
  auroraAdvancedBrick,
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  horizonGlowBrick,
  noiseBrick,
  ridgeHighlightBrick,
  shootingStarBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainBrick,
  terrainContourBrick,
  terrainStackBrick,
  toneCurveBrick,
  treelineBrick,
  vignetteBrick,
  waterReflectionBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";
import { PLATFORM_SCENE_TUNING } from "../types.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getAuroraNoirTuning(p: BrickParams) {
  return PLATFORM_SCENE_TUNING[p.platform];
}

function shiftDown(value: number, delta: number, min = 0.08, max = 0.92): number {
  return clamp(value + delta, min, max);
}

function liftTerrain(value: number, delta: number, min = 0.14): number {
  return Math.max(min, value - delta);
}

function scaleZone(value: number, factor: number, min = 0.06): number {
  return Math.max(min, value * factor);
}

export function auroraNoir(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return auroraDrift(params);
    case "split-complementary":
      return auroraBreak(params);
    case "monochromatic":
      return auroraVoid(params);
    case "triadic":
      return auroraPulse(params);
    default:
      return auroraStillness(params);
  }
}

/* ── Stillness: Fjord aurora — aurora mirrored in still fjord water ────────── */
function auroraStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const tuning = getAuroraNoirTuning(p);

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "an-s-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "30%", color: colors.bgSoft, opacity: 1 },
      { offset: "48%", color: colors.bgMid, opacity: 0.8 },
      { offset: "52%", color: colors.bgMid, opacity: 0.8 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-s-st",
    count: Math.round(340 * tuning.starDensity),
    brightCount: Math.max(12, Math.round(18 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.85,
  });

  // Crescent moon — upper right
  const moon = celestialBrick(p, {
    id: "an-s-mn",
    cx: 0.78,
    cy: 0.12,
    r: 0.022,
    color: "#d0dce8",
    glowColor: colors.hueGreen,
    glowSize: 3.0,
    crescent: { offsetX: 0.55, offsetY: -0.2, color: colors.bg },
  });

  // Primary aurora curtain
  const aurora = auroraAdvancedBrick(p, {
    id: "an-s-au",
    bands: Math.max(4, Math.round(5 * tuning.auroraBandScale)),
    cy: shiftDown(0.2, tuning.auroraYShift * 0.75),
    zoneHeight: scaleZone(0.34, tuning.auroraZoneScale),
    color: colors.hueGreen,
    color2: colors.hueCyan,
    opacity: 0.65,
  });

  // Secondary aurora haze — deeper purple tone behind primary
  const aurora2 = auroraAdvancedBrick(p, {
    id: "an-s-au2",
    bands: Math.max(2, Math.round(3 * tuning.auroraBandScale)),
    cy: shiftDown(0.28, tuning.auroraYShift * 0.65),
    zoneHeight: scaleZone(0.18, tuning.auroraZoneScale),
    color: colors.huePurple,
    color2: colors.hueGreen,
    opacity: 0.3,
    displacement: true,
  });

  // Fjord walls — steep terrain on both sides leaving a narrow water gap
  const leftWall = terrainBrick(p, {
    id: "an-s-tc-lw",
    baseY: liftTerrain(0.44, tuning.terrainLift * 0.8),
    roughness: 0.1,
    points: 16,
    color: colors.bgMid,
    opacity: 0.9,
    seedSuffix: "an-s-lw",
    gradient: { topColor: colors.hueGreen, bottomColor: colors.bgMid, topOpacity: 0.15 },
  });
  const leftRidge = ridgeHighlightBrick(p, {
    id: "an-s-lw-hl",
    baseY: liftTerrain(0.44, tuning.terrainLift * 0.8),
    roughness: 0.1,
    points: 16,
    color: colors.hueGreen,
    opacity: 0.22,
    seedSuffix: "an-s-lw",
  });
  const rightWall = terrainBrick(p, {
    id: "an-s-tc-rw",
    baseY: liftTerrain(0.46, tuning.terrainLift * 0.7),
    roughness: 0.08,
    points: 16,
    color: colors.bgSoft,
    opacity: 0.85,
    seedSuffix: "an-s-rw",
    gradient: { topColor: colors.hueGreen, bottomColor: colors.bgSoft, topOpacity: 0.12 },
  });
  const rightRidge = ridgeHighlightBrick(p, {
    id: "an-s-rw-hl",
    baseY: liftTerrain(0.46, tuning.terrainLift * 0.7),
    roughness: 0.08,
    points: 16,
    color: colors.hueGreen,
    opacity: 0.18,
    seedSuffix: "an-s-rw",
  });

  // Water surface — strong reflection of aurora, the scene's centrepiece
  const water = waterReflectionBrick(p, {
    id: "an-s-w",
    waterY: liftTerrain(0.52, tuning.terrainLift * 0.45, 0.22),
    color: colors.hueGreen,
    opacity: 0.14,
    rippleScale: 6,
  });

  // Foreground terrain — pushed low to let water/aurora scene breathe
  const foreground = terrainBrick(p, {
    id: "an-s-tc-fg",
    baseY: liftTerrain(0.68, tuning.terrainLift),
    roughness: 0.1,
    points: 16,
    color: colors.bg,
    opacity: 0.95,
    seedSuffix: "an-s-fg",
  });
  const foreRidge = ridgeHighlightBrick(p, {
    id: "an-s-fg-hl",
    baseY: liftTerrain(0.68, tuning.terrainLift),
    roughness: 0.1,
    points: 16,
    color: colors.hueGreen,
    opacity: 0.14,
    glowPx: 14,
    seedSuffix: "an-s-fg",
  });

  // Pine treeline on foreground terrain — small pines at lake shore
  const pines = treelineBrick(p, {
    id: "an-s-tl",
    baseY: liftTerrain(0.69, tuning.terrainLift * 0.95),
    count: 20,
    color: colors.bg,
    opacity: 0.75,
    maxHeight: 0.035,
  });

  const mist = cloudBandBrick(p, {
    id: "an-s-mist",
    cy: liftTerrain(0.47, tuning.fogLift, 0.2),
    bandHeight: 0.07,
    color: colors.bgSoft,
    opacity: 0.08,
  });

  // Horizon glow from aurora ground-scatter
  const hGlow = horizonGlowBrick(p, {
    id: "an-s-hg",
    y: liftTerrain(0.44, tuning.terrainLift * 0.6),
    color: colors.hueGreen,
    opacity: 0.07,
    height: 0.06,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-s-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueGreen,
    opacity: 0.12 * tuning.atmosphereScale,
    lightAzimuth: 210,
    lightElevation: 30,
    seed: 3,
  });
  const vignette = vignetteBrick(p, { id: "an-s-vig", opacity: 0.5 });
  const tone = toneCurveBrick(p, { id: "an-s-tone", preset: "cinematic", opacity: 0.35 });
  const noise = noiseBrick(p, { id: "an-s-n", opacity: 0.04 });

  const meteor = shootingStarBrick(p, {
    id: "an-s-mt",
    count: 3,
    color: "#ffffff",
    opacity: 0.55,
  });

  return mergeBricks([
    bg,
    sky,
    stars,
    meteor,
    moon,
    aurora2,
    aurora,
    leftWall,
    leftRidge,
    rightWall,
    rightRidge,
    pines,
    water,
    foreground,
    foreRidge,
    mist,
    hGlow,
    atmo,
    vignette,
    tone,
    noise,
  ]);
}

/* ── Drift: Ice shelf — aurora ribbons over snow-covered mountains ─────────── */
function auroraDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const tuning = getAuroraNoirTuning(p);

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "an-d-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "35%", color: colors.bgSoft, opacity: 1 },
      { offset: "60%", color: colors.hueGreen, opacity: 0.1 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-d-st",
    count: Math.round(300 * tuning.starDensity),
    brightCount: Math.max(10, Math.round(14 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.75,
  });

  const aurora = auroraAdvancedBrick(p, {
    id: "an-d-au",
    bands: Math.max(5, Math.round(7 * tuning.auroraBandScale)),
    cy: shiftDown(0.18, tuning.auroraYShift * 0.6),
    zoneHeight: scaleZone(0.40, tuning.auroraZoneScale),
    color: colors.hueGreen,
    color2: colors.hueCyan,
    opacity: 0.65,
    displacement: true,
  });

  // Layered mountain range — 3 contour levels with atmospheric perspective
  const mountains = terrainContourBrick(p, {
    id: "an-d-mtn",
    horizonY: Math.max(0.16, 0.22 - tuning.terrainLift),
    layers: [
      { color: colors.bgMid, opacity: 0.55, edgeBlur: 4 },
      { color: colors.bgSoft, opacity: 0.72 },
      { color: colors.bg, opacity: 0.95 },
    ],
  });

  // No treeline — highlands are above treeline, bare rock only

  // Snow/mist layer at the mountain bases
  const mist = cloudBandBrick(p, {
    id: "an-d-mist",
    cy: liftTerrain(0.52, tuning.fogLift + tuning.terrainLift * 0.2, 0.22),
    bandHeight: 0.1,
    color: colors.bgSoft,
    opacity: 0.09,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-d-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueCyan,
    opacity: 0.1 * tuning.atmosphereScale,
    lightAzimuth: 190,
    lightElevation: 25,
    seed: 11,
  });
  const vignette = vignetteBrick(p, { id: "an-d-vig", opacity: 0.55 });
  const tone = toneCurveBrick(p, { id: "an-d-tone", preset: "cinematic", opacity: 0.35 });
  const noise = noiseBrick(p, { id: "an-d-n", opacity: 0.04 });

  const meteors = shootingStarBrick(p, {
    id: "an-d-mt",
    count: 3,
    color: "#ffffff",
    opacity: 0.5,
  });

  return mergeBricks([
    bg,
    sky,
    stars,
    meteors,
    aurora,
    mountains,
    mist,
    atmo,
    vignette,
    tone,
    noise,
  ]);
}

/* ── Break: Cracking glacier — aurora shockwave over fractured ice ─────────── */
function auroraBreak(p: BrickParams): ComposedWallpaper {
  const {
    colors,
    viewBox: { width, height },
  } = p;
  const tuning = getAuroraNoirTuning(p);

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "an-b-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "40%", color: colors.bgSoft, opacity: 1 },
      { offset: "50%", color: colors.accent, opacity: 0.14 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-b-st",
    count: Math.round(280 * tuning.starDensity),
    brightCount: Math.max(8, Math.round(12 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.72,
  });

  // Dramatic vertical aurora tear
  const aurora = auroraAdvancedBrick(p, {
    id: "an-b-au",
    bands: Math.max(3, Math.round(4 * tuning.auroraBandScale)),
    cy: shiftDown(0.26, tuning.auroraYShift),
    zoneHeight: scaleZone(0.42, Math.max(0.78, tuning.auroraZoneScale)),
    color: colors.hueGreen,
    color2: colors.huePurple,
    opacity: 0.72,
    displacement: true,
  });

  // Energy bloom at the rupture centre
  const bloomCy = shiftDown(0.35, tuning.auroraYShift * 0.8, 0.16, 0.62);
  const bloom = {
    defs: `<filter id="an-b-bloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${(Math.max(width, height) * 0.02).toFixed(0)}"/></filter>`,
    elements: `<ellipse cx="${(width * 0.5).toFixed(0)}" cy="${(height * bloomCy).toFixed(0)}" rx="${(width * 0.15).toFixed(0)}" ry="${(height * 0.25).toFixed(0)}" fill="${colors.accent}" opacity="0.14" filter="url(#an-b-bloom)"/>`,
  };

  // Jagged ice terrain — high roughness for fractured look — raised by 0.1
  const ice = terrainStackBrick(p, {
    id: "an-b-tc-ice",
    points: 30,
    layers: [
      {
        baseY: liftTerrain(0.5, tuning.terrainLift * 1.05),
        roughness: 0.15,
        color: colors.bgMid,
        opacity: 0.6,
        edgeBlur: 2,
      },
      {
        baseY: liftTerrain(0.62, tuning.terrainLift * 0.85),
        roughness: 0.12,
        color: colors.bgSoft,
        opacity: 0.8,
      },
      {
        baseY: liftTerrain(0.74, tuning.terrainLift * 0.65),
        roughness: 0.1,
        color: colors.bg,
        opacity: 0.95,
      },
    ],
  });

  const meteors = shootingStarBrick(p, {
    id: "an-b-mt",
    count: 3,
    color: "#ffffff",
    opacity: 0.55,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-b-atmo",
    color: colors.accent,
    highlightColor: colors.huePurple,
    opacity: 0.1 * tuning.atmosphereScale,
    lightAzimuth: 230,
    lightElevation: 40,
    seed: 17,
  });
  const vignette = vignetteBrick(p, { id: "an-b-vig", opacity: 0.6 });
  const tone = toneCurveBrick(p, { id: "an-b-tone", preset: "cinematic", opacity: 0.4 });
  const noise = noiseBrick(p, { id: "an-b-n", opacity: 0.04 });

  return mergeBricks([bg, sky, stars, meteors, aurora, bloom, ice, atmo, vignette, tone, noise]);
}

/* ── Void: Polar void — single aurora breath across black tundra ──────────── */
function auroraVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const tuning = getAuroraNoirTuning(p);

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "an-v-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "100%", color: colors.bgSoft, opacity: 0.6 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-v-st",
    count: Math.round(280 * tuning.starDensity),
    brightCount: Math.max(7, Math.round(10 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.65,
  });

  // Single thin aurora veil — slightly thicker so it's visible
  const aurora = auroraAdvancedBrick(p, {
    id: "an-v-au",
    bands: 3,
    cy: shiftDown(0.3, tuning.auroraYShift * 0.65),
    zoneHeight: scaleZone(0.16, Math.max(0.88, tuning.auroraZoneScale)),
    color: colors.hueGreen,
    opacity: 0.55,
    displacement: true,
  });

  // Flat, desolate tundra — raised by 0.12
  const tundra = terrainBrick(p, {
    id: "an-v-tc-td",
    baseY: liftTerrain(0.58, tuning.terrainLift),
    roughness: 0.03,
    points: 16,
    color: colors.bgMid,
    opacity: 0.65,
  });
  const ground = terrainBrick(p, {
    id: "an-v-tc-gr",
    baseY: liftTerrain(0.65, tuning.terrainLift * 0.9),
    roughness: 0.02,
    points: 12,
    color: colors.bg,
    opacity: 0.95,
  });

  // Faint horizon glow — aurora touching ground
  const hGlow = horizonGlowBrick(p, {
    id: "an-v-hg",
    y: liftTerrain(0.57, tuning.terrainLift * 0.8),
    color: colors.hueGreen,
    opacity: 0.06,
    height: 0.05,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-v-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueGreen,
    opacity: 0.08 * tuning.atmosphereScale,
    lightAzimuth: 200,
    lightElevation: 20,
    seed: 23,
  });

  const meteor = shootingStarBrick(p, {
    id: "an-v-mt",
    count: 2,
    color: "#ffffff",
    opacity: 0.45,
  });

  const vignette = vignetteBrick(p, { id: "an-v-vig", opacity: 0.5 });
  const tone = toneCurveBrick(p, { id: "an-v-tone", preset: "cinematic", opacity: 0.3 });
  const noise = noiseBrick(p, { id: "an-v-n", opacity: 0.03 });

  return mergeBricks([
    bg,
    sky,
    stars,
    meteor,
    aurora,
    tundra,
    ground,
    hGlow,
    atmo,
    vignette,
    tone,
    noise,
  ]);
}

/* ── Pulse: Three aurora bands converge over layered peaks ─────────────────── */
function auroraPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const tuning = getAuroraNoirTuning(p);

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "an-p-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "25%", color: colors.bgSoft, opacity: 1 },
      { offset: "50%", color: colors.hueGreen, opacity: 0.08 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-p-st",
    count: Math.round(340 * tuning.starDensity),
    brightCount: Math.max(10, Math.round(15 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.75,
  });

  // Three converging aurora bands — wider zone, higher opacity
  const aurora = auroraAdvancedBrick(p, {
    id: "an-p-au",
    bands: Math.max(6, Math.round(8 * tuning.auroraBandScale)),
    cy: shiftDown(0.18, tuning.auroraYShift * 0.6),
    zoneHeight: scaleZone(0.42, tuning.auroraZoneScale),
    color: colors.hueGreen,
    color2: colors.hueCyan,
    opacity: 0.68,
    displacement: true,
  });

  // Second aurora layer — different hue for chromatic depth
  const aurora2 = auroraAdvancedBrick(p, {
    id: "an-p-au2",
    bands: Math.max(3, Math.round(4 * tuning.auroraBandScale)),
    cy: shiftDown(0.30, tuning.auroraYShift * 0.5),
    zoneHeight: scaleZone(0.22, tuning.auroraZoneScale),
    color: colors.huePurple,
    color2: colors.hueGreen,
    opacity: 0.32,
    displacement: true,
  });

  // Layered peaks — 4 contour levels with atmospheric depth — raised by 0.08
  const peaks = terrainContourBrick(p, {
    id: "an-p-tc-pk",
    horizonY: Math.max(0.14, 0.20 - tuning.terrainLift),
    layers: [
      { color: colors.bgMid, opacity: 0.45, edgeBlur: 5 },
      { color: colors.bgMid, opacity: 0.62 },
      { color: colors.bgSoft, opacity: 0.8 },
      { color: colors.bg, opacity: 0.95 },
    ],
  });

  // No treeline — highland peaks are above treeline, bare rock only

  const mist = cloudBandBrick(p, {
    id: "an-p-mist",
    cy: liftTerrain(0.48, tuning.fogLift + tuning.terrainLift * 0.1, 0.2),
    bandHeight: 0.06,
    color: colors.hueGreen,
    opacity: 0.09,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-p-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueGreen,
    opacity: 0.12 * tuning.atmosphereScale,
    lightAzimuth: 215,
    lightElevation: 35,
    seed: 29,
  });
  const vignette = vignetteBrick(p, { id: "an-p-vig", opacity: 0.5 });
  const tone = toneCurveBrick(p, { id: "an-p-tone", preset: "cinematic", opacity: 0.35 });
  const noise = noiseBrick(p, { id: "an-p-n", opacity: 0.04 });

  const pulseMetors = shootingStarBrick(p, {
    id: "an-p-mt",
    count: 4,
    color: "#ffffff",
    opacity: 0.55,
  });

  return mergeBricks([
    bg,
    sky,
    stars,
    pulseMetors,
    aurora2,
    aurora,
    peaks,
    mist,
    atmo,
    vignette,
    tone,
    noise,
  ]);
}
