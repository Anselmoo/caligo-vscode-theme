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
  cloudBandBrick,
  noiseBrick,
  ridgeHighlightBrick,
  shootingStarBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainBrick,
  terrainContourBrick,
  terrainStackBrick,
  toneCurveBrick,
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
    count: Math.round(260 * tuning.starDensity),
    brightCount: Math.max(8, Math.round(12 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.7,
  });

  const aurora = auroraAdvancedBrick(p, {
    id: "an-s-au",
    bands: Math.max(3, Math.round(4 * tuning.auroraBandScale)),
    cy: shiftDown(0.22, tuning.auroraYShift * 0.75),
    zoneHeight: scaleZone(0.2, tuning.auroraZoneScale),
    color: colors.hueGreen,
    color2: colors.hueCyan,
    opacity: 0.5,
  });

  // Fjord walls — steep terrain on both sides leaving a narrow water gap
  const leftWall = terrainBrick(p, {
    id: "an-s-tc-lw",
    baseY: liftTerrain(0.5, tuning.terrainLift * 0.8),
    roughness: 0.1,
    points: 16,
    color: colors.bgMid,
    opacity: 0.9,
    seedSuffix: "an-s-lw",
    gradient: { topColor: colors.hueGreen, bottomColor: colors.bgMid, topOpacity: 0.12 },
  });
  const leftRidge = ridgeHighlightBrick(p, {
    id: "an-s-lw-hl",
    baseY: liftTerrain(0.5, tuning.terrainLift * 0.8),
    roughness: 0.1,
    points: 16,
    color: colors.hueGreen,
    opacity: 0.18,
    seedSuffix: "an-s-lw",
  });
  const rightWall = terrainBrick(p, {
    id: "an-s-tc-rw",
    baseY: liftTerrain(0.52, tuning.terrainLift * 0.7),
    roughness: 0.08,
    points: 16,
    color: colors.bgSoft,
    opacity: 0.85,
    seedSuffix: "an-s-rw",
    gradient: { topColor: colors.hueGreen, bottomColor: colors.bgSoft, topOpacity: 0.1 },
  });
  const rightRidge = ridgeHighlightBrick(p, {
    id: "an-s-rw-hl",
    baseY: liftTerrain(0.52, tuning.terrainLift * 0.7),
    roughness: 0.08,
    points: 16,
    color: colors.hueGreen,
    opacity: 0.15,
    seedSuffix: "an-s-rw",
  });

  // Water surface at 50%
  const water = waterReflectionBrick(p, {
    id: "an-s-w",
    waterY: liftTerrain(0.5, tuning.terrainLift * 0.45, 0.18),
    color: colors.hueGreen,
    opacity: 0.07,
    rippleScale: 6,
  });

  // Foreground terrain (closest mountains, darkest)
  const foreground = terrainBrick(p, {
    id: "an-s-tc-fg",
    baseY: liftTerrain(0.6, tuning.terrainLift),
    roughness: 0.12,
    points: 20,
    color: colors.bg,
    opacity: 0.95,
    seedSuffix: "an-s-fg",
  });
  const foreRidge = ridgeHighlightBrick(p, {
    id: "an-s-fg-hl",
    baseY: liftTerrain(0.6, tuning.terrainLift),
    roughness: 0.12,
    points: 20,
    color: colors.hueGreen,
    opacity: 0.12,
    glowPx: 14,
    seedSuffix: "an-s-fg",
  });

  const mist = cloudBandBrick(p, {
    id: "an-s-mist",
    cy: liftTerrain(0.5, tuning.fogLift, 0.2),
    bandHeight: 0.08,
    color: colors.bgSoft,
    opacity: 0.07,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-s-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueGreen,
    opacity: 0.1 * tuning.atmosphereScale,
    lightAzimuth: 210,
    lightElevation: 30,
    seed: 3,
  });
  const vignette = vignetteBrick(p, { id: "an-s-vig", opacity: 0.5 });
  const tone = toneCurveBrick(p, { id: "an-s-tone", preset: "cinematic", opacity: 0.35 });
  const noise = noiseBrick(p, { id: "an-s-n", opacity: 0.04 });

  const meteor = shootingStarBrick(p, {
    id: "an-s-mt",
    count: 1,
    color: "#ffffff",
    opacity: 0.3,
  });

  return mergeBricks([
    bg,
    sky,
    stars,
    meteor,
    aurora,
    leftWall,
    leftRidge,
    rightWall,
    rightRidge,
    water,
    foreground,
    foreRidge,
    mist,
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
      { offset: "60%", color: colors.hueGreen, opacity: 0.08 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-d-st",
    count: Math.round(280 * tuning.starDensity),
    brightCount: Math.max(8, Math.round(10 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.6,
  });

  const aurora = auroraAdvancedBrick(p, {
    id: "an-d-au",
    bands: Math.max(4, Math.round(6 * tuning.auroraBandScale)),
    cy: shiftDown(0.2, tuning.auroraYShift * 0.6),
    zoneHeight: scaleZone(0.25, tuning.auroraZoneScale),
    color: colors.hueGreen,
    color2: colors.hueCyan,
    opacity: 0.45,
    displacement: true,
  });

  // Layered mountain range — 3 contour levels with atmospheric perspective
  const mountains = terrainContourBrick(p, {
    id: "an-d-mtn",
    horizonY: Math.max(0.18, 0.3 - tuning.terrainLift),
    layers: [
      { color: colors.bgMid, opacity: 0.55, edgeBlur: 4 },
      { color: colors.bgSoft, opacity: 0.72 },
      { color: colors.bg, opacity: 0.95 },
    ],
  });

  // Snow/mist layer at the mountain bases
  const mist = cloudBandBrick(p, {
    id: "an-d-mist",
    cy: liftTerrain(0.58, tuning.fogLift + tuning.terrainLift * 0.2, 0.24),
    bandHeight: 0.1,
    color: colors.bgSoft,
    opacity: 0.07,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-d-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueCyan,
    opacity: 0.09 * tuning.atmosphereScale,
    lightAzimuth: 190,
    lightElevation: 25,
    seed: 11,
  });
  const vignette = vignetteBrick(p, { id: "an-d-vig", opacity: 0.55 });
  const tone = toneCurveBrick(p, { id: "an-d-tone", preset: "cinematic", opacity: 0.35 });
  const noise = noiseBrick(p, { id: "an-d-n", opacity: 0.04 });

  return mergeBricks([bg, sky, stars, aurora, mountains, mist, atmo, vignette, tone, noise]);
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
      { offset: "50%", color: colors.accent, opacity: 0.12 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-b-st",
    count: Math.round(250 * tuning.starDensity),
    brightCount: Math.max(7, Math.round(9 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.6,
  });

  // Dramatic vertical aurora tear
  const aurora = auroraAdvancedBrick(p, {
    id: "an-b-au",
    bands: Math.max(3, Math.round(3 * tuning.auroraBandScale)),
    cy: shiftDown(0.3, tuning.auroraYShift),
    zoneHeight: scaleZone(0.4, Math.max(0.78, tuning.auroraZoneScale)),
    color: colors.hueGreen,
    color2: colors.huePurple,
    opacity: 0.6,
    displacement: true,
  });

  // Energy bloom at the rupture centre
  const bloomCy = shiftDown(0.35, tuning.auroraYShift * 0.8, 0.16, 0.62);
  const bloom = {
    defs: `<filter id="an-b-bloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${(Math.max(width, height) * 0.02).toFixed(0)}"/></filter>`,
    elements: `<ellipse cx="${(width * 0.5).toFixed(0)}" cy="${(height * bloomCy).toFixed(0)}" rx="${(width * 0.15).toFixed(0)}" ry="${(height * 0.25).toFixed(0)}" fill="${colors.accent}" opacity="0.12" filter="url(#an-b-bloom)"/>`,
  };

  // Jagged ice terrain — high roughness for fractured look
  const ice = terrainStackBrick(p, {
    id: "an-b-tc-ice",
    points: 30,
    layers: [
      {
        baseY: liftTerrain(0.6, tuning.terrainLift * 1.05),
        roughness: 0.15,
        color: colors.bgMid,
        opacity: 0.6,
        edgeBlur: 2,
      },
      {
        baseY: liftTerrain(0.72, tuning.terrainLift * 0.85),
        roughness: 0.12,
        color: colors.bgSoft,
        opacity: 0.8,
      },
      {
        baseY: liftTerrain(0.82, tuning.terrainLift * 0.65),
        roughness: 0.1,
        color: colors.bg,
        opacity: 0.95,
      },
    ],
  });

  const atmo = atmosphereBrick(p, {
    id: "an-b-atmo",
    color: colors.accent,
    highlightColor: colors.huePurple,
    opacity: 0.08 * tuning.atmosphereScale,
    lightAzimuth: 230,
    lightElevation: 40,
    seed: 17,
  });
  const vignette = vignetteBrick(p, { id: "an-b-vig", opacity: 0.6 });
  const tone = toneCurveBrick(p, { id: "an-b-tone", preset: "cinematic", opacity: 0.4 });
  const noise = noiseBrick(p, { id: "an-b-n", opacity: 0.04 });

  return mergeBricks([bg, sky, stars, aurora, bloom, ice, atmo, vignette, tone, noise]);
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
      { offset: "100%", color: colors.bgSoft, opacity: 0.5 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-v-st",
    count: Math.round(200 * tuning.starDensity),
    brightCount: Math.max(5, Math.round(6 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.4,
  });

  // Single thin aurora veil
  const aurora = auroraAdvancedBrick(p, {
    id: "an-v-au",
    bands: 2,
    cy: shiftDown(0.35, tuning.auroraYShift * 0.65),
    zoneHeight: scaleZone(0.08, Math.max(0.88, tuning.auroraZoneScale)),
    color: colors.hueGreen,
    opacity: 0.35,
    displacement: true,
  });

  // Flat, desolate tundra — low roughness, just a subtle ridge
  const tundra = terrainBrick(p, {
    id: "an-v-tc-td",
    baseY: liftTerrain(0.7, tuning.terrainLift),
    roughness: 0.03,
    points: 16,
    color: colors.bgMid,
    opacity: 0.6,
  });
  const ground = terrainBrick(p, {
    id: "an-v-tc-gr",
    baseY: liftTerrain(0.75, tuning.terrainLift * 0.9),
    roughness: 0.02,
    points: 12,
    color: colors.bg,
    opacity: 0.95,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-v-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueGreen,
    opacity: 0.07 * tuning.atmosphereScale,
    lightAzimuth: 200,
    lightElevation: 20,
    seed: 23,
  });
  const vignette = vignetteBrick(p, { id: "an-v-vig", opacity: 0.5 });
  const tone = toneCurveBrick(p, { id: "an-v-tone", preset: "cinematic", opacity: 0.3 });
  const noise = noiseBrick(p, { id: "an-v-n", opacity: 0.03 });

  return mergeBricks([bg, sky, stars, aurora, tundra, ground, atmo, vignette, tone, noise]);
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
      { offset: "50%", color: colors.hueGreen, opacity: 0.06 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "an-p-st",
    count: Math.round(300 * tuning.starDensity),
    brightCount: Math.max(9, Math.round(12 * tuning.starDensity)),
    distribution: "upper",
    opacity: 0.65,
  });

  // Three converging aurora bands
  const aurora = auroraAdvancedBrick(p, {
    id: "an-p-au",
    bands: Math.max(5, Math.round(7 * tuning.auroraBandScale)),
    cy: shiftDown(0.2, tuning.auroraYShift * 0.6),
    zoneHeight: scaleZone(0.28, tuning.auroraZoneScale),
    color: colors.hueGreen,
    color2: colors.hueCyan,
    opacity: 0.5,
    displacement: true,
  });

  // Layered peaks — 4 contour levels with atmospheric depth
  const peaks = terrainContourBrick(p, {
    id: "an-p-tc-pk",
    horizonY: Math.max(0.17, 0.28 - tuning.terrainLift),
    layers: [
      { color: colors.bgMid, opacity: 0.45, edgeBlur: 5 },
      { color: colors.bgMid, opacity: 0.62 },
      { color: colors.bgSoft, opacity: 0.8 },
      { color: colors.bg, opacity: 0.95 },
    ],
  });

  const mist = cloudBandBrick(p, {
    id: "an-p-mist",
    cy: liftTerrain(0.55, tuning.fogLift + tuning.terrainLift * 0.1, 0.2),
    bandHeight: 0.06,
    color: colors.hueGreen,
    opacity: 0.08,
  });

  const atmo = atmosphereBrick(p, {
    id: "an-p-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueGreen,
    opacity: 0.11 * tuning.atmosphereScale,
    lightAzimuth: 215,
    lightElevation: 35,
    seed: 29,
  });
  const vignette = vignetteBrick(p, { id: "an-p-vig", opacity: 0.5 });
  const tone = toneCurveBrick(p, { id: "an-p-tone", preset: "cinematic", opacity: 0.35 });
  const noise = noiseBrick(p, { id: "an-p-n", opacity: 0.04 });

  const pulseMetors = shootingStarBrick(p, {
    id: "an-p-mt",
    count: 2,
    color: "#ffffff",
    opacity: 0.35,
  });

  return mergeBricks([
    bg,
    sky,
    stars,
    pulseMetors,
    aurora,
    peaks,
    mist,
    atmo,
    vignette,
    tone,
    noise,
  ]);
}
