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
  atmosphereBrick,
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  horizonGlowBrick,
  nebulaGlowBrick,
  noiseBrick,
  ringBrick,
  shootingStarBrick,
  skyGradientBrick,
  sparksBrick,
  starFieldBrick,
  terrainStackBrick,
  treelineBrick,
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

  // Nebula emission glow — warm region behind pillars — boosted opacity
  const emission = nebulaGlowBrick(p, {
    id: "nn-s-em",
    blur: 0.06,
    blobs: [
      { cx: 0.5, cy: 0.65, rx: 0.35, ry: 0.3, color: colors.accent, opacity: 0.28 },
      { cx: 0.35, cy: 0.55, rx: 0.2, ry: 0.25, color: colors.huePurple, opacity: 0.18 },
      { cx: 0.65, cy: 0.45, rx: 0.22, ry: 0.18, color: colors.accentSoft, opacity: 0.2 },
      { cx: 0.5, cy: 0.35, rx: 0.25, ry: 0.15, color: colors.hueCyan, opacity: 0.1 },
    ],
  });

  // Pillar silhouettes — dark terrain columns rising from bottom
  const pillar1 = terrainStackBrick(p, {
    id: "nn-s-p1",
    points: 10,
    layers: [{ baseY: 0.15, roughness: 0.04, color: colors.bgMid, opacity: 0.85 }],
  });
  const pillar2 = terrainStackBrick(p, {
    id: "nn-s-p2",
    points: 8,
    layers: [{ baseY: 0.25, roughness: 0.03, color: colors.bg, opacity: 0.9 }],
  });

  // Dust cloud texture — denser
  const dust = cloudBandBrick(p, {
    id: "nn-s-du",
    cy: 0.55,
    bandHeight: 0.35,
    color: colors.huePurple,
    opacity: 0.1,
    frequency: 0.003,
    seed: 11,
  });

  const stars = starFieldBrick(p, {
    id: "nn-s-st",
    count: 380,
    brightCount: 18,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.65,
  });

  // Bright star cluster visible through nebula gap
  const clusterStars = starFieldBrick(p, {
    id: "nn-s-cs",
    count: 80,
    brightCount: 10,
    color: colors.accentSoft,
    distribution: "full",
    opacity: 0.45,
  });

  const vignette = vignetteBrick(p, { id: "nn-s-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "nn-s-n", opacity: 0.04 });

  const horizGlow = horizonGlowBrick(p, {
    id: "nn-s-hg",
    y: 0.4,
    color: colors.accentSoft,
    opacity: 0.18,
    height: 0.12,
  });

  const meteors = shootingStarBrick(p, {
    id: "nn-s-mt",
    count: 5,
    color: "#ffffff",
    opacity: 0.55,
  });

  return mergeBricks([
    bg,
    sky,
    emission,
    dust,
    clusterStars,
    stars,
    meteors,
    horizGlow,
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
      { cx: 0.15, cy: 0.75, rx: 0.22, ry: 0.18, color: colors.hueYellow, opacity: 0.25 },
      { cx: 0.2, cy: 0.68, rx: 0.14, ry: 0.12, color: colors.hueOrange, opacity: 0.16 },
    ],
  });

  // Galaxy arm band — diagonal nebula strip
  const armGlow = nebulaGlowBrick(p, {
    id: "nn-d-ag",
    blur: 0.05,
    blobs: [
      { cx: 0.28, cy: 0.58, rx: 0.18, ry: 0.06, color: colors.accent, opacity: 0.2 },
      { cx: 0.5, cy: 0.47, rx: 0.2, ry: 0.07, color: colors.huePurple, opacity: 0.15 },
      { cx: 0.72, cy: 0.36, rx: 0.18, ry: 0.06, color: colors.hueBlue, opacity: 0.16 },
    ],
  });

  // Dust lane — dark cloud crossing the arm
  const dustLane = cloudBandBrick(p, {
    id: "nn-d-dl",
    cy: 0.48,
    bandHeight: 0.1,
    color: colors.bg,
    opacity: 0.14,
    frequency: 0.005,
    seed: 19,
  });

  // Dense stars along the arm
  const denseStars = starFieldBrick(p, {
    id: "nn-d-ds",
    count: 200,
    brightCount: 16,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.6,
  });

  // Background dim stars
  const bgStars = starFieldBrick(p, {
    id: "nn-d-bs",
    count: 80,
    brightCount: 4,
    color: colors.accentSoft,
    distribution: "full",
    opacity: 0.3,
  });

  // Distant planetary terrain — raised by 0.15
  const terrain = terrainStackBrick(p, {
    id: "nn-d-tr",
    layers: [
      { baseY: 0.65, roughness: 0.04, color: colors.bgMid, opacity: 0.38 },
      { baseY: 0.75, roughness: 0.05, color: colors.bg, opacity: 0.7 },
    ],
  });

  // Alien treeline silhouette on distant world
  const treeline = treelineBrick(p, {
    id: "nn-d-tl",
    baseY: 0.72,
    count: 28,
    color: colors.bg,
    opacity: 0.65,
    maxHeight: 0.06,
  });

  const meteor = shootingStarBrick(p, {
    id: "nn-d-mt",
    count: 4,
    color: "#ffffff",
    opacity: 0.5,
  });

  const spiralRing = ringBrick(p, {
    id: "nn-d-sr",
    cx: 0.5,
    cy: 0.5,
    r: 0.32,
    strokeWidth: 1,
    color: colors.accentSoft,
    opacity: 0.1,
  });

  const vignette = vignetteBrick(p, { id: "nn-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "nn-d-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    core,
    armGlow,
    spiralRing,
    dustLane,
    bgStars,
    denseStars,
    meteor,
    terrain,
    treeline,
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
    cy: 0.42,
    r: 0.022,
    color: "#ffffff",
    glowColor: colors.hueBlue,
    glowSize: 4.5,
  });

  // Expanding shockwave rings — concentric nebula blobs
  const rings = nebulaGlowBrick(p, {
    id: "nn-b-ri",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.42, rx: 0.07, ry: 0.07, color: colors.hueCyan, opacity: 0.35 },
      { cx: 0.5, cy: 0.42, rx: 0.16, ry: 0.16, color: colors.hueBlue, opacity: 0.22 },
      { cx: 0.5, cy: 0.42, rx: 0.28, ry: 0.26, color: colors.huePurple, opacity: 0.12 },
      { cx: 0.5, cy: 0.42, rx: 0.4, ry: 0.35, color: colors.hueRed, opacity: 0.06 },
    ],
  });

  // Ejected debris
  const debris = starFieldBrick(p, {
    id: "nn-b-db",
    count: 80,
    brightCount: 14,
    color: colors.hueCyan,
    distribution: "full",
    opacity: 0.6,
  });

  // Shooting stars — ejecta trails
  const ejecta = shootingStarBrick(p, {
    id: "nn-b-ej",
    count: 5,
    color: colors.hueBlue,
    opacity: 0.55,
  });

  const bgStars = starFieldBrick(p, {
    id: "nn-b-bs",
    count: 120,
    brightCount: 5,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.45,
  });

  // Explosion particle sparks radiating outward
  const burst = sparksBrick(p, {
    id: "nn-b-sp",
    count: 35,
    color: colors.hueCyan,
    opacity: 0.5,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.3,
  });

  // Rocky asteroid terrain in foreground — raised by 0.15
  const asteroidTerrain = terrainStackBrick(p, {
    id: "nn-b-at",
    layers: [
      { baseY: 0.7, roughness: 0.06, color: colors.bgMid, opacity: 0.4 },
      { baseY: 0.8, roughness: 0.05, color: colors.bg, opacity: 0.72 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "nn-b-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "nn-b-n", opacity: 0.04 });

  const horizGlow = horizonGlowBrick(p, {
    id: "nn-b-hg",
    y: 0.58,
    color: colors.hueBlue,
    opacity: 0.16,
    height: 0.1,
  });

  // Crisp shockwave ring at outer expansion boundary
  const shockRing = ringBrick(p, {
    id: "nn-b-sr",
    cx: 0.5,
    cy: 0.42,
    r: 0.3,
    strokeWidth: 2,
    color: colors.hueCyan,
    opacity: 0.25,
  });

  return mergeBricks([
    bg,
    sky,
    rings,
    shockRing,
    novaCore,
    ejecta,
    burst,
    bgStars,
    debris,
    horizGlow,
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
      { offset: "50%", color: colors.bgSoft, opacity: 0.25 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Faint background stars — behind the dark cloud
  const bgStars = starFieldBrick(p, {
    id: "nn-v-bs",
    count: 140,
    brightCount: 8,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.45,
  });

  // More distant dim stars
  const dimStars = starFieldBrick(p, {
    id: "nn-v-ds",
    count: 80,
    brightCount: 2,
    color: colors.accentSoft,
    distribution: "full",
    opacity: 0.2,
  });

  // Dark nebula mass — terrain-like silhouette absorbing stars
  const darkCloud = terrainStackBrick(p, {
    id: "nn-v-dc",
    points: 20,
    layers: [
      { baseY: 0.3, roughness: 0.15, color: colors.bgMid, opacity: 0.88 },
      { baseY: 0.45, roughness: 0.1, color: colors.bg, opacity: 0.75 },
    ],
  });

  // Faint nebula edge glow — boosted
  const edgeGlow = cloudBandBrick(p, {
    id: "nn-v-eg",
    cy: 0.32,
    bandHeight: 0.18,
    color: colors.huePurple,
    opacity: 0.08,
    frequency: 0.004,
    seed: 41,
  });

  // Faint emission behind the cloud
  const backGlow = nebulaGlowBrick(p, {
    id: "nn-v-bg",
    blur: 0.07,
    blobs: [
      { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.2, color: colors.huePurple, opacity: 0.1 },
      { cx: 0.3, cy: 0.4, rx: 0.15, ry: 0.12, color: colors.accent, opacity: 0.06 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "nn-v-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "nn-v-n", opacity: 0.04 });

  const horizGlow = horizonGlowBrick(p, {
    id: "nn-v-hg",
    y: 0.48,
    color: colors.huePurple,
    opacity: 0.14,
    height: 0.14,
  });

  const voidMeteor = shootingStarBrick(p, {
    id: "nn-v-mt",
    count: 3,
    color: "#ffffff",
    opacity: 0.35,
  });

  return mergeBricks([
    bg,
    sky,
    backGlow,
    dimStars,
    bgStars,
    voidMeteor,
    edgeGlow,
    darkCloud,
    horizGlow,
    vignette,
    noise,
  ]);
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
      { cx: 0.5, cy: 0.5, rx: 0.14, ry: 0.12, color: colors.hueYellow, opacity: 0.35 },
      { cx: 0.5, cy: 0.5, rx: 0.26, ry: 0.22, color: colors.hueOrange, opacity: 0.18 },
      { cx: 0.5, cy: 0.5, rx: 0.4, ry: 0.35, color: colors.accent, opacity: 0.1 },
    ],
  });

  // Dust lanes crossing core
  const dust1 = cloudBandBrick(p, {
    id: "nn-p-d1",
    cy: 0.47,
    bandHeight: 0.07,
    color: colors.bg,
    opacity: 0.14,
    frequency: 0.006,
    seed: 7,
  });
  const dust2 = cloudBandBrick(p, {
    id: "nn-p-d2",
    cy: 0.54,
    bandHeight: 0.05,
    color: colors.bg,
    opacity: 0.1,
    frequency: 0.008,
    seed: 13,
  });

  // Dense star field
  const denseStars = starFieldBrick(p, {
    id: "nn-p-ds",
    count: 250,
    brightCount: 20,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.7,
  });

  // Secondary warm stars
  const warmStars = starFieldBrick(p, {
    id: "nn-p-ws",
    count: 60,
    brightCount: 8,
    color: colors.hueYellow,
    distribution: "full",
    opacity: 0.5,
  });

  // Cratered landscape beneath — raised by 0.15
  const craters = terrainStackBrick(p, {
    id: "nn-p-cr",
    layers: [
      { baseY: 0.62, roughness: 0.05, color: colors.bgMid, opacity: 0.35 },
      { baseY: 0.72, roughness: 0.055, color: colors.bgSoft, opacity: 0.55 },
      { baseY: 0.83, roughness: 0.04, color: colors.bg, opacity: 0.8 },
    ],
  });

  // Alien vegetation at crater ridge — small scale relative to crater landscape
  const treeline = treelineBrick(p, {
    id: "nn-p-tl",
    baseY: 0.75,
    count: 35,
    color: colors.bg,
    opacity: 0.7,
    maxHeight: 0.035,
  });

  // Galactic halo ring
  const coreRing = ringBrick(p, {
    id: "nn-p-cr2",
    cx: 0.5,
    cy: 0.5,
    r: 0.22,
    strokeWidth: 1,
    color: colors.hueYellow,
    opacity: 0.12,
  });

  const coreAtmo = atmosphereBrick(p, {
    id: "nn-p-atmo",
    color: colors.hueYellow,
    highlightColor: colors.hueOrange,
    opacity: 0.07,
    lightAzimuth: 180,
    lightElevation: 45,
    seed: 19,
  });

  const pulseMeteors = shootingStarBrick(p, {
    id: "nn-p-mt",
    count: 4,
    color: "#ffffff",
    opacity: 0.5,
  });

  const vignette = vignetteBrick(p, { id: "nn-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "nn-p-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    coreGlow,
    coreRing,
    dust1,
    dust2,
    warmStars,
    denseStars,
    pulseMeteors,
    coreAtmo,
    craters,
    treeline,
    vignette,
    noise,
  ]);
}
