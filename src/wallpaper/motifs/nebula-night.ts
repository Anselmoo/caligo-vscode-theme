/**
 * NebulaNight motif — 5 cosmic deep-space night scenes.
 *
 * Stillness : Pillars of creation — cosmic dust columns against starfield
 * Drift     : Spiral galaxy arm — sweeping nebula band
 * Break     : Supernova remnant — expanding shockwave with debris
 * Void      : Dark nebula silhouette — absorption cloud against faint stars
 * Pulse     : Galactic core — dense star cloud with warm center
 */
import {
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  constellationBrick,
  fogWispBrick,
  milkyWayBrick,
  nebulaGlowBrick,
  nebulaOrganicBrick,
  noiseBrick,
  shootingStarBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainStackBrick,
  vignetteBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function nebulaNight(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return nebulaDrift(params);
    case "split-complementary":
      return nebulaBreak(params);
    case "monochromatic":
      return nebulaVoid(params);
    case "triadic":
      return nebulaPulse(params);
    default:
      return nebulaStillness(params);
  }
}

/* ── Stillness: Pillars of creation — dust columns ────────────────────────── */
function nebulaStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "nn-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "70%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Nebula emission glow — warm region behind pillars, organic edges
  const emission = nebulaOrganicBrick(p, {
    id: "nn-s-em",
    blur: 0.06,
    turbulence: true,
    turbulenceFreq: 0.004,
    displacement: 0.02,
    blobs: [
      { cx: 0.5, cy: 0.7, rx: 0.3, ry: 0.25, color: colors.accent, opacity: 0.18 },
      { cx: 0.35, cy: 0.6, rx: 0.15, ry: 0.2, color: colors.huePurple, opacity: 0.1 },
      { cx: 0.65, cy: 0.5, rx: 0.2, ry: 0.15, color: colors.accentSoft, opacity: 0.12 },
    ],
  });

  // Pillar silhouettes — dark terrain columns rising from bottom
  const pillar1 = terrainStackBrick(p, {
    id: "nn-s-p1",
    points: 10,
    layers: [
      {
        baseY: 0.15,
        roughness: 0.04,
        color: colors.bgMid,
        opacity: 0.85,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.accent,
      },
    ],
  });
  const pillar2 = terrainStackBrick(p, {
    id: "nn-s-p2",
    points: 8,
    layers: [{ baseY: 0.25, roughness: 0.03, color: colors.bg, opacity: 0.9 }],
  });

  // Dust cloud texture
  const dust = cloudBandBrick(p, {
    id: "nn-s-du",
    cy: 0.6,
    bandHeight: 0.3,
    color: colors.huePurple,
    opacity: 0.06,
    frequency: 0.003,
    seed: 11,
  });

  const stars = starFieldBrick(p, {
    id: "nn-s-st",
    count: 90,
    brightCount: 8,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#ffe8d0",
    distribution: "full",
    opacity: 0.55,
    featureCount: 5,
  });

  // Constellation patterns among the pillars
  const constellations = constellationBrick(p, {
    id: "nn-s-cns",
    count: 3,
    color: "#ffffff",
    starRadius: 1.8,
    lineOpacity: 0.12,
    starOpacity: 0.5,
  });

  // Cosmic dust wisps drifting between pillars
  const cosmicDust = fogWispBrick(p, {
    id: "nn-s-cd",
    cy: 0.45,
    hazeCount: 3,
    wispCount: 4,
    color: colors.huePurple,
    hazeOpacity: 0.03,
    wispOpacity: 0.02,
  });

  const vignette = vignetteBrick(p, { id: "nn-s-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "nn-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    emission,
    dust,
    stars,
    constellations,
    cosmicDust,
    pillar1,
    pillar2,
    vignette,
    noise,
  ]);
}

/* ── Drift: Spiral galaxy arm — sweeping nebula band ──────────────────────── */
function nebulaDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "nn-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Galaxy core glow — lower left
  const core = nebulaGlowBrick(p, {
    id: "nn-d-co",
    blur: 0.06,
    blobs: [
      { cx: 0.15, cy: 0.8, rx: 0.2, ry: 0.15, color: colors.hueYellow, opacity: 0.2 },
      { cx: 0.2, cy: 0.75, rx: 0.12, ry: 0.1, color: colors.hueOrange, opacity: 0.12 },
    ],
  });

  // Milky Way band — main galactic arm across the sky
  const milkyWay = milkyWayBrick(p, {
    id: "nn-d-mw",
    cy: 0.45,
    bandHeight: 0.22,
    angle: -25,
    color: colors.bgSoft,
    edgeColor: colors.bgMid,
    opacity: 0.1,
  });

  // Galaxy arm band — diagonal nebula strip
  const armGlow = nebulaGlowBrick(p, {
    id: "nn-d-ag",
    blur: 0.05,
    blobs: [
      { cx: 0.3, cy: 0.6, rx: 0.15, ry: 0.04, color: colors.accent, opacity: 0.15 },
      { cx: 0.5, cy: 0.5, rx: 0.18, ry: 0.05, color: colors.huePurple, opacity: 0.1 },
      { cx: 0.7, cy: 0.4, rx: 0.15, ry: 0.04, color: colors.hueBlue, opacity: 0.12 },
    ],
  });

  // Dust lane — dark cloud crossing the arm
  const dustLane = cloudBandBrick(p, {
    id: "nn-d-dl",
    cy: 0.5,
    bandHeight: 0.08,
    color: colors.bg,
    opacity: 0.3,
    frequency: 0.005,
    seed: 19,
  });

  // Dense stars along the arm
  const denseStars = starFieldBrick(p, {
    id: "nn-d-ds",
    count: 120,
    brightCount: 10,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#ffe8d0",
    distribution: "full",
    opacity: 0.5,
    featureCount: 5,
  });

  // Background dim stars
  const bgStars = starFieldBrick(p, {
    id: "nn-d-bs",
    count: 50,
    brightCount: 2,
    color: colors.accentSoft,
    distribution: "full",
    opacity: 0.25,
    featureCount: 1,
  });

  // Distant planetary terrain — viewing the galaxy from surface
  const terrain = terrainStackBrick(p, {
    id: "nn-d-tr",
    layers: [
      {
        baseY: 0.82,
        roughness: 0.03,
        color: colors.bgMid,
        opacity: 0.3,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.accent,
      },
      { baseY: 0.9, roughness: 0.04, color: colors.bg, opacity: 0.6 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "nn-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "nn-d-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    milkyWay,
    core,
    armGlow,
    dustLane,
    bgStars,
    denseStars,
    terrain,
    vignette,
    noise,
  ]);
}

/* ── Break: Supernova remnant — expanding shockwave ───────────────────────── */
function nebulaBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "nn-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Supernova centre — bright glow
  const novaCore = celestialBrick(p, {
    id: "nn-b-nc",
    cx: 0.5,
    cy: 0.45,
    r: 0.02,
    color: "#ffffff",
    glowColor: colors.hueBlue,
    glowSize: 0.08,
    texture: true,
  });

  // Expanding shockwave rings — concentric nebula blobs
  const rings = nebulaGlowBrick(p, {
    id: "nn-b-ri",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.45, rx: 0.06, ry: 0.06, color: colors.hueCyan, opacity: 0.3 },
      { cx: 0.5, cy: 0.45, rx: 0.14, ry: 0.14, color: colors.hueBlue, opacity: 0.18 },
      { cx: 0.5, cy: 0.45, rx: 0.24, ry: 0.22, color: colors.huePurple, opacity: 0.1 },
      { cx: 0.5, cy: 0.45, rx: 0.35, ry: 0.3, color: colors.hueRed, opacity: 0.05 },
    ],
  });

  // Ejected debris
  const debris = starFieldBrick(p, {
    id: "nn-b-db",
    count: 50,
    brightCount: 8,
    color: colors.hueCyan,
    color2: colors.hueBlue,
    distribution: "full",
    opacity: 0.5,
    featureCount: 4,
  });

  // Shooting stars — ejecta trails
  const ejecta = shootingStarBrick(p, {
    id: "nn-b-ej",
    count: 3,
    color: colors.hueBlue,
    opacity: 0.4,
    trailColor: colors.hueCyan,
  });

  const bgStars = starFieldBrick(p, {
    id: "nn-b-bs",
    count: 60,
    brightCount: 3,
    color: "#ffffff",
    color2: "#ddeeff",
    distribution: "full",
    opacity: 0.35,
    featureCount: 2,
  });

  // Rocky asteroid terrain in foreground
  const asteroidTerrain = terrainStackBrick(p, {
    id: "nn-b-at",
    layers: [
      {
        baseY: 0.85,
        roughness: 0.05,
        color: colors.bgMid,
        opacity: 0.35,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueCyan,
      },
      { baseY: 0.92, roughness: 0.04, color: colors.bg, opacity: 0.65 },
    ],
  });

  // Supernova debris fog
  const debrisFog = fogWispBrick(p, {
    id: "nn-b-fg",
    cy: 0.5,
    hazeCount: 2,
    wispCount: 3,
    color: colors.huePurple,
    hazeOpacity: 0.03,
    wispOpacity: 0.02,
  });

  const vignette = vignetteBrick(p, { id: "nn-b-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "nn-b-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    rings,
    novaCore,
    ejecta,
    bgStars,
    debris,
    debrisFog,
    asteroidTerrain,
    vignette,
    noise,
  ]);
}

/* ── Void: Dark nebula — absorption cloud ─────────────────────────────────── */
function nebulaVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "nn-v-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.2 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Faint background stars
  const bgStars = starFieldBrick(p, {
    id: "nn-v-bs",
    count: 80,
    brightCount: 4,
    color: "#ffffff",
    color2: "#ddeeff",
    distribution: "full",
    opacity: 0.3,
    featureCount: 2,
  });

  // Dark nebula mass — terrain-like silhouette absorbing stars
  const darkCloud = terrainStackBrick(p, {
    id: "nn-v-dc",
    points: 20,
    layers: [
      { baseY: 0.3, roughness: 0.15, color: colors.bg, opacity: 0.88 },
      { baseY: 0.45, roughness: 0.1, color: colors.bg, opacity: 0.75 },
    ],
  });

  // Faint nebula edge glow
  const edgeGlow = cloudBandBrick(p, {
    id: "nn-v-eg",
    cy: 0.35,
    bandHeight: 0.15,
    color: colors.huePurple,
    opacity: 0.04,
    frequency: 0.004,
    seed: 41,
  });

  const vignette = vignetteBrick(p, { id: "nn-v-vig", opacity: 0.7 });
  const noise = noiseBrick(p, { id: "nn-v-n", opacity: 0.04 });
  return mergeBricks([bg, sky, bgStars, edgeGlow, darkCloud, vignette, noise]);
}

/* ── Pulse: Galactic core — dense star cloud ──────────────────────────────── */
function nebulaPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "nn-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Dense galactic core glow
  const coreGlow = nebulaGlowBrick(p, {
    id: "nn-p-cg",
    blur: 0.06,
    blobs: [
      { cx: 0.5, cy: 0.5, rx: 0.12, ry: 0.1, color: colors.hueYellow, opacity: 0.3 },
      { cx: 0.5, cy: 0.5, rx: 0.22, ry: 0.18, color: colors.hueOrange, opacity: 0.15 },
      { cx: 0.5, cy: 0.5, rx: 0.35, ry: 0.3, color: colors.accent, opacity: 0.08 },
    ],
  });

  // Dust lanes crossing core
  const dust1 = cloudBandBrick(p, {
    id: "nn-p-d1",
    cy: 0.48,
    bandHeight: 0.06,
    color: colors.bg,
    opacity: 0.25,
    frequency: 0.006,
    seed: 7,
  });
  const dust2 = cloudBandBrick(p, {
    id: "nn-p-d2",
    cy: 0.55,
    bandHeight: 0.04,
    color: colors.bg,
    opacity: 0.15,
    frequency: 0.008,
    seed: 13,
  });

  // Dense star field
  const denseStars = starFieldBrick(p, {
    id: "nn-p-ds",
    count: 150,
    brightCount: 15,
    color: "#ffffff",
    color2: "#ddeeff",
    color3: "#ffe8d0",
    distribution: "full",
    opacity: 0.6,
    featureCount: 6,
  });

  // Secondary warm stars
  const warmStars = starFieldBrick(p, {
    id: "nn-p-ws",
    count: 40,
    brightCount: 5,
    color: colors.hueYellow,
    color2: colors.hueOrange,
    distribution: "full",
    opacity: 0.4,
    featureCount: 3,
  });

  // Cratered landscape beneath the galactic core
  const craters = terrainStackBrick(p, {
    id: "nn-p-cr",
    layers: [
      {
        baseY: 0.78,
        roughness: 0.04,
        color: colors.bgMid,
        opacity: 0.3,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueYellow,
      },
      { baseY: 0.85, roughness: 0.05, color: colors.bgSoft, opacity: 0.5 },
      { baseY: 0.93, roughness: 0.035, color: colors.bg, opacity: 0.75 },
    ],
  });

  // Cosmic fog wisps near galactic core
  const coreFog = fogWispBrick(p, {
    id: "nn-p-fg",
    cy: 0.5,
    hazeCount: 2,
    wispCount: 3,
    color: colors.hueOrange,
    hazeOpacity: 0.02,
    wispOpacity: 0.02,
  });

  const vignette = vignetteBrick(p, { id: "nn-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "nn-p-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    coreGlow,
    dust1,
    dust2,
    warmStars,
    denseStars,
    coreFog,
    craters,
    vignette,
    noise,
  ]);
}
