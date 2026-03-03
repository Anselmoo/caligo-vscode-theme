/**
 * AuroraNoir motif — 5 arctic aurora night scenes.
 *
 * Stillness : Fjord aurora — aurora reflected in still fjord water between mountain walls
 * Drift     : Ice shelf drift — aurora ribbons sweeping over snow-covered mountains
 * Break     : Cracking glacier — aurora shockwave over fractured ice terrain
 * Void      : Polar void — single thin aurora breath across desolate tundra
 * Pulse     : Pulse borealis — three aurora bands converge over layered peaks
 *
 * Monitor + tablet: uses the hand-designed night-aurora.svg reference template.
 *   TypeScript drives only the colour mapping; all geometry is preserved.
 * Mobile: uses the procedural brick-based fallback (portrait orientation).
 */
import {
  auroraAdvancedBrick,
  backgroundBrick,
  bloomEllipseBrick,
  celestialBrick,
  cloudBandBrick,
  constellationBrick,
  fogWispBrick,
  milkyWayBrick,
  noiseBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainBrick,
  terrainStackBrick,
  toneCurveBrick,
  vignetteBrick,
  waterReflectionBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import { applyVars, loadTemplate, parseBrickOutput } from "../templates/engine.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";
import { buildNightAuroraVars } from "./aurora-vars.js";

export function auroraNoir(params: BrickParams): ComposedWallpaper {
  // Use the hand-designed reference template for landscape platforms.
  // Mobile is portrait so falls back to the procedural brick composition.
  if (params.platform !== "mobile") {
    return auroraNoirTemplate(params);
  }
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

/* ── Template: reference-quality night aurora scene ─────────────────────────── */
function auroraNoirTemplate(p: BrickParams): ComposedWallpaper {
  const vars = buildNightAuroraVars(p.colors, p.harmonyMode);
  const raw = applyVars(loadTemplate("night-aurora.svg"), vars);
  const parsed = parseBrickOutput(raw);

  // Scale the 1600×900 template to the target resolution.
  const scaleX = (p.viewBox.width / 1600).toFixed(6);
  const scaleY = (p.viewBox.height / 900).toFixed(6);
  const scaledElements = `<g transform="scale(${scaleX}, ${scaleY})">\n${parsed.elements}\n</g>`;

  return { defs: parsed.defs ?? "", elements: scaledElements };
}

/* ── Stillness: Fjord aurora — aurora mirrored in still fjord water ────────── */
function auroraStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

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

  // Crescent moon lighting the fjord — with craters and texture
  const moon = celestialBrick(p, {
    id: "an-s-mn",
    cx: 0.78,
    cy: 0.12,
    r: 0.025,
    color: "#e8e4d8",
    glowColor: colors.hueCyan,
    glowSize: 3,
    glowOpacity: 0.12,
    crescent: { offsetX: 0.008, offsetY: -0.004, color: colors.bg },
    texture: true,
    craterCount: 4,
  });

  // Multi-layer star field with feature stars and color variety
  const stars = starFieldBrick(p, {
    id: "an-s-st",
    count: 100,
    brightCount: 5,
    featureCount: 3,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#cce0ff",
    distribution: "upper",
    opacity: 0.7,
  });

  // Constellation patterns in the arctic sky
  const constellations = constellationBrick(p, {
    id: "an-s-cns",
    count: 3,
    color: "#ffffff",
    starRadius: 1.5,
    lineOpacity: 0.12,
    starOpacity: 0.55,
  });

  // Aurora with filled curtains, vertical rays, and sharp detail strokes
  const aurora = auroraAdvancedBrick(p, {
    id: "an-s-au",
    bands: 4,
    cy: 0.22,
    zoneHeight: 0.2,
    color: colors.hueGreen,
    color2: colors.hueCyan,
    color3: colors.huePurple,
    opacity: 0.5,
    verticalRays: 16,
    sharpCurtains: true,
  });

  // Fjord walls — steep terrain with ridge highlights
  const leftWall = terrainBrick(p, {
    id: "an-s-lw",
    baseY: 0.35,
    roughness: 0.1,
    points: 16,
    color: colors.bgMid,
    opacity: 0.9,
    ridgeHighlight: true,
    ridgeHighlightColor: colors.bgSoft,
  });
  const rightWall = terrainBrick(p, {
    id: "an-s-rw",
    baseY: 0.38,
    roughness: 0.08,
    points: 16,
    color: colors.bgSoft,
    opacity: 0.85,
    ridgeHighlight: true,
    ridgeHighlightColor: colors.bgMid,
  });

  // Fog wisps drifting between the fjord walls
  const fog = fogWispBrick(p, {
    id: "an-s-fog",
    cy: 0.45,
    hazeCount: 3,
    wispCount: 4,
    color: colors.bgSoft,
    hazeOpacity: 0.06,
    wispOpacity: 0.04,
  });

  // Water surface with ripple lines, aurora shimmer, and moon reflection
  const water = waterReflectionBrick(p, {
    id: "an-s-w",
    waterY: 0.5,
    color: colors.hueGreen,
    opacity: 0.15,
    rippleScale: 6,
    rippleLines: 6,
    shimmerColor: colors.hueCyan,
    shimmerOpacity: 0.08,
    moonReflection: { cx: 0.78, color: "#e8e4d8" },
    shoreEdge: true,
  });

  // Foreground terrain (closest mountains, darkest)
  const foreground = terrainBrick(p, {
    id: "an-s-fg",
    baseY: 0.48,
    roughness: 0.12,
    points: 20,
    color: colors.bg,
    opacity: 0.95,
  });

  const mist = cloudBandBrick(p, {
    id: "an-s-mist",
    cy: 0.5,
    bandHeight: 0.08,
    color: colors.bgSoft,
    opacity: 0.15,
  });

  // Cinematic tone — deepen blacks for night feel
  const tone = toneCurveBrick(p, {
    id: "an-s-tone",
    preset: "cinematic",
    opacity: 0.25,
  });

  const vignette = vignetteBrick(p, { id: "an-s-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "an-s-n", opacity: 0.04 });

  return mergeBricks([
    bg,
    sky,
    moon,
    stars,
    constellations,
    aurora,
    leftWall,
    rightWall,
    fog,
    water,
    foreground,
    mist,
    tone,
    vignette,
    noise,
  ]);
}

/* ── Drift: Ice shelf — aurora ribbons over snow-covered mountains ─────────── */
function auroraDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

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

  // Multi-layer stars with feature stars
  const stars = starFieldBrick(p, {
    id: "an-d-st",
    count: 120,
    brightCount: 4,
    featureCount: 3,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#cce0ff",
    distribution: "upper",
    opacity: 0.6,
  });

  // Aurora with filled curtains, vertical rays, and color depth
  const aurora = auroraAdvancedBrick(p, {
    id: "an-d-au",
    bands: 6,
    cy: 0.2,
    zoneHeight: 0.25,
    color: colors.hueGreen,
    color2: colors.hueCyan,
    color3: colors.huePurple,
    opacity: 0.45,
    displacement: true,
    verticalRays: 12,
    sharpCurtains: true,
  });

  // Layered mountain range with snow caps and ridge highlights
  const mountains = terrainStackBrick(p, {
    id: "an-d-mtn",
    points: 24,
    layers: [
      {
        baseY: 0.52,
        roughness: 0.1,
        color: colors.bgMid,
        opacity: 0.5,
        edgeBlur: 3,
        snowCaps: true,
        snowColor: "#c8d8e8",
        gradient: { topColor: colors.bgMid, bottomColor: colors.bg },
      },
      {
        baseY: 0.6,
        roughness: 0.08,
        color: colors.bgSoft,
        opacity: 0.7,
        snowCaps: true,
        snowColor: "#d0dce8",
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueCyan,
      },
      {
        baseY: 0.72,
        roughness: 0.06,
        color: colors.bg,
        opacity: 0.95,
      },
    ],
  });

  // Fog wisps gathering at the mountain bases
  const fog = fogWispBrick(p, {
    id: "an-d-fog",
    cy: 0.62,
    hazeCount: 4,
    wispCount: 5,
    color: colors.bgSoft,
    hazeOpacity: 0.05,
    wispOpacity: 0.04,
  });

  // Snow/mist layer at the mountain bases
  const mist = cloudBandBrick(p, {
    id: "an-d-mist",
    cy: 0.58,
    bandHeight: 0.1,
    color: colors.bgSoft,
    opacity: 0.12,
  });

  const vignette = vignetteBrick(p, { id: "an-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "an-d-n", opacity: 0.04 });

  return mergeBricks([bg, sky, stars, aurora, mountains, fog, mist, vignette, noise]);
}

/* ── Break: Cracking glacier — aurora shockwave over fractured ice ─────────── */
function auroraBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

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
    count: 80,
    brightCount: 3,
    featureCount: 2,
    color: "#ffffff",
    color2: "#ddeeff",
    distribution: "upper",
    opacity: 0.6,
  });

  // Dramatic vertical aurora tear with sharp curtains
  const aurora = auroraAdvancedBrick(p, {
    id: "an-b-au",
    bands: 3,
    cy: 0.3,
    zoneHeight: 0.4,
    color: colors.hueGreen,
    color2: colors.huePurple,
    color3: colors.hueCyan,
    opacity: 0.6,
    displacement: true,
    verticalRays: 8,
    sharpCurtains: true,
  });

  // Energy bloom at the rupture centre
  const bloom = bloomEllipseBrick(p, {
    id: "an-b-bloom",
    cx: 0.5,
    cy: 0.35,
    rx: 0.15,
    ry: 0.25,
    color: colors.accent,
    opacity: 0.12,
    blurRatio: 0.02,
  });

  // Jagged ice terrain with ridge highlights — high roughness for fractured look
  const ice = terrainStackBrick(p, {
    id: "an-b-ice",
    points: 30,
    layers: [
      { baseY: 0.6, roughness: 0.15, color: colors.bgMid, opacity: 0.6, edgeBlur: 2 },
      {
        baseY: 0.72,
        roughness: 0.12,
        color: colors.bgSoft,
        opacity: 0.8,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueCyan,
      },
      { baseY: 0.82, roughness: 0.1, color: colors.bg, opacity: 0.95 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "an-b-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "an-b-n", opacity: 0.04 });

  return mergeBricks([bg, sky, stars, aurora, bloom, ice, vignette, noise]);
}

/* ── Void: Polar void — single aurora breath across black tundra ──────────── */
function auroraVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

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
    count: 50,
    brightCount: 2,
    featureCount: 1,
    color: "#ffffff",
    color2: "#ddeeff",
    distribution: "upper",
    opacity: 0.4,
  });

  // Single thin aurora veil
  const aurora = auroraAdvancedBrick(p, {
    id: "an-v-au",
    bands: 2,
    cy: 0.35,
    zoneHeight: 0.08,
    color: colors.hueGreen,
    opacity: 0.35,
    displacement: true,
    verticalRays: 4,
    sharpCurtains: false,
  });

  // Flat, desolate tundra — low roughness, just a subtle ridge
  const tundra = terrainBrick(p, {
    id: "an-v-td",
    baseY: 0.7,
    roughness: 0.03,
    points: 16,
    color: colors.bgMid,
    opacity: 0.6,
  });
  const ground = terrainBrick(p, {
    id: "an-v-gr",
    baseY: 0.75,
    roughness: 0.02,
    points: 12,
    color: colors.bg,
    opacity: 0.95,
  });

  const vignette = vignetteBrick(p, { id: "an-v-vig", opacity: 0.75 });
  const noise = noiseBrick(p, { id: "an-v-n", opacity: 0.03 });

  return mergeBricks([bg, sky, stars, aurora, tundra, ground, vignette, noise]);
}

/* ── Pulse: Three aurora bands converge over layered peaks ─────────────────── */
function auroraPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

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

  // Milky Way band across the sky behind aurora
  const milkyWay = milkyWayBrick(p, {
    id: "an-p-mw",
    cy: 0.25,
    bandHeight: 0.18,
    angle: 20,
    color: colors.bgSoft,
    edgeColor: colors.bgMid,
    opacity: 0.08,
  });

  // Dense multi-color star field with feature stars
  const stars = starFieldBrick(p, {
    id: "an-p-st",
    count: 140,
    brightCount: 6,
    featureCount: 5,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#cce0ff",
    distribution: "upper",
    opacity: 0.65,
  });

  // Constellation patterns visible between aurora bands
  const constellations = constellationBrick(p, {
    id: "an-p-cns",
    count: 5,
    color: "#ffffff",
    starRadius: 1.8,
    lineOpacity: 0.1,
    starOpacity: 0.5,
  });

  // Three converging aurora bands with full detail
  const aurora = auroraAdvancedBrick(p, {
    id: "an-p-au",
    bands: 7,
    cy: 0.2,
    zoneHeight: 0.28,
    color: colors.hueGreen,
    color2: colors.hueCyan,
    color3: colors.huePurple,
    opacity: 0.5,
    displacement: true,
    verticalRays: 20,
    sharpCurtains: true,
  });

  // Layered peaks with snow caps, ridge highlights, and gradients
  const peaks = terrainStackBrick(p, {
    id: "an-p-pk",
    points: 28,
    layers: [
      {
        baseY: 0.45,
        roughness: 0.12,
        color: colors.bgMid,
        opacity: 0.4,
        edgeBlur: 4,
        snowCaps: true,
        snowColor: "#c0d0e0",
        gradient: { topColor: colors.bgMid, bottomColor: colors.bg },
      },
      {
        baseY: 0.55,
        roughness: 0.1,
        color: colors.bgMid,
        opacity: 0.6,
        snowCaps: true,
        snowColor: "#c8d8e8",
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueCyan,
      },
      {
        baseY: 0.65,
        roughness: 0.08,
        color: colors.bgSoft,
        opacity: 0.8,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueGreen,
      },
      {
        baseY: 0.78,
        roughness: 0.06,
        color: colors.bg,
        opacity: 0.95,
      },
    ],
  });

  // Fog wisps at mountain bases
  const fog = fogWispBrick(p, {
    id: "an-p-fog",
    cy: 0.6,
    hazeCount: 3,
    wispCount: 4,
    color: colors.hueGreen,
    hazeOpacity: 0.04,
    wispOpacity: 0.03,
  });

  const mist = cloudBandBrick(p, {
    id: "an-p-mist",
    cy: 0.55,
    bandHeight: 0.06,
    color: colors.hueGreen,
    opacity: 0.08,
  });

  const vignette = vignetteBrick(p, { id: "an-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "an-p-n", opacity: 0.04 });

  return mergeBricks([
    bg,
    sky,
    milkyWay,
    stars,
    constellations,
    aurora,
    peaks,
    fog,
    mist,
    vignette,
    noise,
  ]);
}
