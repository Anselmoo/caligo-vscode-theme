/**
 * Eclipse motif — 5 celestial eclipse scenes, one per harmony mode.
 *
 * Stillness : Total solar eclipse — full corona at peak totality
 * Drift     : Diamond ring — partial eclipse arc, golden bead
 * Break     : Blood moon — lunar eclipse with red corona
 * Void      : Totality — near-complete darkness with thin corona
 * Pulse     : Eclipse over ridge — mountain silhouette below event
 */
import {
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  constellationBrick,
  fogWispBrick,
  horizonGlowBrick,
  milkyWayBrick,
  nebulaGlowBrick,
  noiseBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainStackBrick,
  toneCurveBrick,
  vignetteBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import { assembleScene } from "../templates/engine.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";
import { buildEclipseCoronaVars } from "./eclipse-vars.js";

export function eclipse(params: BrickParams): ComposedWallpaper {
  // Use the modular eclipse-corona scene for landscape platforms.
  // Mobile is portrait so falls back to the procedural brick composition.
  if (params.platform !== "mobile") {
    return eclipseTemplate(params);
  }
  switch (params.harmonyMode) {
    case "analogous":
      return eclipseDrift(params);
    case "split-complementary":
      return eclipseBreak(params);
    case "monochromatic":
      return eclipseVoid(params);
    case "triadic":
      return eclipsePulse(params);
    default:
      return eclipseStillness(params);
  }
}

/* ── Template: eclipse corona scene (monitor + tablet) ──────────────────── */
function eclipseTemplate(p: BrickParams): ComposedWallpaper {
  const vars = buildEclipseCoronaVars(p.colors, p.harmonyMode);
  const assembled = assembleScene("eclipse-corona", vars);

  const scaleX = (p.viewBox.width / 1600).toFixed(6);
  const scaleY = (p.viewBox.height / 900).toFixed(6);
  const scaledElements = `<g transform="scale(${scaleX}, ${scaleY})">\n${assembled.elements}\n</g>`;

  return { defs: assembled.defs ?? "", elements: scaledElements };
}

/* ── Stillness: Total solar eclipse — corona ring ─────────────────────────── */
function eclipseStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "35%", color: colors.bgSoft },
      { offset: "65%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Eclipse body — dark disc with crater detail and orange corona glow
  const moon = celestialBrick(p, {
    id: "ec-s-mn",
    cx: 0.5,
    cy: 0.38,
    r: 0.065,
    color: colors.bg,
    glowColor: colors.hueOrange,
    glowSize: 0.14,
    craterCount: 5,
    texture: true,
  });

  const corona = nebulaGlowBrick(p, {
    id: "ec-s-co",
    blur: 0.06,
    blobs: [
      { cx: 0.5, cy: 0.38, rx: 0.18, ry: 0.18, color: colors.hueOrange, opacity: 0.2 },
      { cx: 0.5, cy: 0.38, rx: 0.12, ry: 0.12, color: colors.hueYellow, opacity: 0.15 },
      { cx: 0.52, cy: 0.36, rx: 0.22, ry: 0.08, color: colors.hueOrange, opacity: 0.08 },
    ],
  });

  // Multi-layer star field with feature stars
  const stars = starFieldBrick(p, {
    id: "ec-s-st",
    count: 80,
    brightCount: 6,
    featureCount: 4,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#ffe8d0",
    distribution: "full",
    opacity: 0.5,
  });

  const hGlow = horizonGlowBrick(p, {
    id: "ec-s-hg",
    y: 0.92,
    color: colors.hueOrange,
    opacity: 0.1,
    height: 0.06,
  });

  // Mountain range with snow caps and gradient
  const mountains = terrainStackBrick(p, {
    id: "ec-s-mt",
    layers: [
      {
        baseY: 0.78,
        roughness: 0.06,
        color: colors.bgMid,
        opacity: 0.4,
        snowCaps: true,
        snowColor: "#c0c8d0",
        gradient: { topColor: colors.bgMid, bottomColor: colors.bg },
      },
      {
        baseY: 0.85,
        roughness: 0.05,
        color: colors.bgSoft,
        opacity: 0.6,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueOrange,
      },
      { baseY: 0.92, roughness: 0.04, color: colors.bg, opacity: 0.85 },
    ],
  });

  // Constellations revealed during totality
  const constellations = constellationBrick(p, {
    id: "ec-s-cst",
    count: 4,
    lineOpacity: 0.12,
    starRadius: 1.5,
    color: "#ffffff",
  });

  const vignette = vignetteBrick(p, { id: "ec-s-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ec-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    constellations,
    corona,
    moon,
    stars,
    hGlow,
    mountains,
    vignette,
    noise,
  ]);
}

/* ── Drift: Diamond ring — partial eclipse with golden bead ───────────────── */
function eclipseDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  const eclipseBody = celestialBrick(p, {
    id: "ec-d-eb",
    cx: 0.5,
    cy: 0.4,
    r: 0.06,
    color: colors.bg,
    glowColor: colors.hueYellow,
    glowSize: 0.1,
    craterCount: 4,
    texture: true,
  });

  const diamond = nebulaGlowBrick(p, {
    id: "ec-d-dm",
    blur: 0.03,
    blobs: [
      { cx: 0.54, cy: 0.36, rx: 0.012, ry: 0.012, color: "#ffffff", opacity: 0.8 },
      { cx: 0.54, cy: 0.36, rx: 0.035, ry: 0.035, color: colors.hueYellow, opacity: 0.3 },
    ],
  });

  const corona = nebulaGlowBrick(p, {
    id: "ec-d-co",
    blur: 0.05,
    blobs: [
      { cx: 0.56, cy: 0.38, rx: 0.14, ry: 0.1, color: colors.hueOrange, opacity: 0.15 },
      { cx: 0.45, cy: 0.42, rx: 0.1, ry: 0.08, color: colors.hueYellow, opacity: 0.08 },
    ],
  });

  // Stars with feature and color variety
  const stars = starFieldBrick(p, {
    id: "ec-d-st",
    count: 60,
    brightCount: 4,
    featureCount: 3,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#ffe8d0",
    distribution: "full",
    opacity: 0.4,
  });

  // Milky Way band stretching behind the eclipse
  const milkyWay = milkyWayBrick(p, {
    id: "ec-d-mw",
    color: colors.bgSoft,
    cy: 0.4,
    bandHeight: 0.18,
    angle: 30,
    opacity: 0.1,
  });

  // Rolling hills with snow and gradient
  const hills = terrainStackBrick(p, {
    id: "ec-d-hl",
    layers: [
      {
        baseY: 0.8,
        roughness: 0.04,
        color: colors.bgMid,
        opacity: 0.35,
        snowCaps: true,
        snowColor: "#c8d0d8",
      },
      {
        baseY: 0.88,
        roughness: 0.03,
        color: colors.bgSoft,
        opacity: 0.55,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueYellow,
      },
      { baseY: 0.94, roughness: 0.025, color: colors.bg, opacity: 0.8 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ec-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ec-d-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    milkyWay,
    corona,
    eclipseBody,
    diamond,
    stars,
    hills,
    vignette,
    noise,
  ]);
}

/* ── Break: Blood moon — red-tinted lunar eclipse ─────────────────────────── */
function eclipseBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Blood moon with craters
  const bloodMoon = celestialBrick(p, {
    id: "ec-b-bm",
    cx: 0.5,
    cy: 0.35,
    r: 0.07,
    color: colors.hueRed,
    glowColor: colors.hueRed,
    glowSize: 0.16,
    craterCount: 6,
    texture: true,
  });

  const redHaze = nebulaGlowBrick(p, {
    id: "ec-b-rh",
    blur: 0.06,
    blobs: [
      { cx: 0.5, cy: 0.35, rx: 0.2, ry: 0.2, color: colors.hueRed, opacity: 0.15 },
      { cx: 0.5, cy: 0.35, rx: 0.3, ry: 0.25, color: colors.hueOrange, opacity: 0.06 },
    ],
  });

  // Jagged terrain with gradient and ridge highlight
  const terrain = terrainStackBrick(p, {
    id: "ec-b-tr",
    points: 18,
    layers: [
      {
        baseY: 0.68,
        roughness: 0.08,
        color: colors.bgMid,
        opacity: 0.5,
        gradient: { topColor: colors.bgMid, bottomColor: colors.bg },
      },
      {
        baseY: 0.75,
        roughness: 0.06,
        color: colors.bgSoft,
        opacity: 0.7,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueRed,
      },
      { baseY: 0.82, roughness: 0.04, color: colors.bg, opacity: 0.9 },
    ],
  });

  // Stars with red/warm color variety
  const stars = starFieldBrick(p, {
    id: "ec-b-st",
    count: 70,
    brightCount: 5,
    featureCount: 3,
    color: "#ffffff",
    color2: "#ffd8d0",
    color3: "#ffe0c8",
    distribution: "upper",
    opacity: 0.4,
  });

  // Cinematic red tone curve for blood moon atmosphere
  const tone = toneCurveBrick(p, {
    id: "ec-b-tc",
    preset: "cinematic",
    opacity: 0.08,
  });

  // Fog wisps at terrain base
  const fog = fogWispBrick(p, {
    id: "ec-b-fog",
    cy: 0.72,
    hazeCount: 2,
    wispCount: 3,
    color: colors.hueRed,
    hazeOpacity: 0.04,
    wispOpacity: 0.03,
  });

  const vignette = vignetteBrick(p, { id: "ec-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ec-b-n", opacity: 0.04 });
  return mergeBricks([bg, sky, redHaze, bloodMoon, stars, terrain, fog, tone, vignette, noise]);
}

/* ── Void: Total darkness — thin corona whisper ───────────────────────────── */
function eclipseVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-v-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.3 },
      { offset: "100%", color: colors.bg },
    ],
  });

  const eclipseBody = celestialBrick(p, {
    id: "ec-v-eb",
    cx: 0.5,
    cy: 0.45,
    r: 0.05,
    color: colors.bg,
    glowColor: colors.bgSoft,
    glowSize: 0.08,
  });

  const whisper = nebulaGlowBrick(p, {
    id: "ec-v-wh",
    blur: 0.03,
    blobs: [{ cx: 0.5, cy: 0.45, rx: 0.07, ry: 0.07, color: colors.accentSoft, opacity: 0.1 }],
  });

  // Faint horizon terrain — barely visible landscape
  const horizon = terrainStackBrick(p, {
    id: "ec-v-hz",
    layers: [
      { baseY: 0.88, roughness: 0.02, color: colors.bgSoft, opacity: 0.2 },
      { baseY: 0.94, roughness: 0.015, color: colors.bgMid, opacity: 0.3 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ec-v-vig", opacity: 0.85 });
  const noise = noiseBrick(p, { id: "ec-v-n", opacity: 0.03 });
  return mergeBricks([bg, sky, whisper, eclipseBody, horizon, vignette, noise]);
}

/* ── Pulse: Eclipse over mountain ridge ───────────────────────────────────── */
function eclipsePulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "55%", color: colors.bgMid },
      { offset: "75%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Eclipse with crater detail
  const eclipseBody = celestialBrick(p, {
    id: "ec-p-eb",
    cx: 0.5,
    cy: 0.28,
    r: 0.055,
    color: colors.bg,
    glowColor: colors.hueOrange,
    glowSize: 0.12,
    craterCount: 4,
    texture: true,
  });

  const corona = nebulaGlowBrick(p, {
    id: "ec-p-co",
    blur: 0.05,
    blobs: [
      { cx: 0.5, cy: 0.28, rx: 0.15, ry: 0.15, color: colors.hueOrange, opacity: 0.18 },
      { cx: 0.53, cy: 0.25, rx: 0.08, ry: 0.04, color: colors.hueYellow, opacity: 0.1 },
    ],
  });

  const hGlow = horizonGlowBrick(p, {
    id: "ec-p-hg",
    y: 0.6,
    color: colors.hueOrange,
    opacity: 0.12,
    height: 0.08,
  });

  // 4-layer mountain ridge with snow caps and ridge highlights
  const ridge = terrainStackBrick(p, {
    id: "ec-p-rd",
    points: 22,
    layers: [
      {
        baseY: 0.55,
        roughness: 0.1,
        color: colors.bgMid,
        opacity: 0.5,
        snowCaps: true,
        snowColor: "#c0c8d0",
        gradient: { topColor: colors.bgMid, bottomColor: colors.bg },
      },
      {
        baseY: 0.62,
        roughness: 0.08,
        color: colors.bgSoft,
        opacity: 0.65,
        snowCaps: true,
        snowColor: "#c8d0d8",
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueOrange,
      },
      { baseY: 0.7, roughness: 0.06, color: colors.bg, opacity: 0.85 },
      { baseY: 0.8, roughness: 0.03, color: colors.bg, opacity: 0.95 },
    ],
  });

  // Stars with feature and warm color variety
  const stars = starFieldBrick(p, {
    id: "ec-p-st",
    count: 55,
    brightCount: 4,
    featureCount: 3,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#ffe8d0",
    distribution: "upper",
    opacity: 0.45,
  });

  // Constellations visible above the mountain ridge
  const constellations = constellationBrick(p, {
    id: "ec-p-cst",
    count: 3,
    lineOpacity: 0.1,
    starRadius: 1.5,
    color: "#ffffff",
  });

  // Fog wisps between ridge layers
  const fog = fogWispBrick(p, {
    id: "ec-p-fog",
    cy: 0.65,
    hazeCount: 3,
    wispCount: 4,
    color: colors.bgSoft,
    hazeOpacity: 0.05,
    wispOpacity: 0.03,
  });

  const mist = cloudBandBrick(p, {
    id: "ec-p-mi",
    cy: 0.65,
    bandHeight: 0.1,
    color: colors.bgSoft,
    opacity: 0.15,
    frequency: 0.005,
    seed: 13,
  });

  const vignette = vignetteBrick(p, { id: "ec-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ec-p-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    constellations,
    corona,
    eclipseBody,
    stars,
    hGlow,
    fog,
    mist,
    ridge,
    vignette,
    noise,
  ]);
}
