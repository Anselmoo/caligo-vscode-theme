/**
 * VoidEmber motif — 5 minimal ember/void scenes, one per harmony mode.
 *
 * Stillness : Suspended ember — single spark in total void with heat corona
 * Drift     : Cinder trail — ember path drifting across dark terrain
 * Break     : Particle burst — radial explosion from single point
 * Void      : Dying ember — perception-edge existence, near-total dark
 * Pulse     : Ember constellation — scattered embers over desert night
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

export function voidEmber(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return voidEmberDrift(params);
    case "split-complementary":
      return voidEmberBreak(params);
    case "monochromatic":
      return voidEmberVoid(params);
    case "triadic":
      return voidEmberPulse(params);
    default:
      return voidEmberStillness(params);
  }
}

/* ── Stillness: Suspended ember — single spark in void ────────────────────── */
function voidEmberStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const dark = skyGradientBrick(p, {
    id: "ve-s-dk",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.2 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Stars above the desert
  const stars = starFieldBrick(p, {
    id: "ve-s-st",
    count: 220,
    brightCount: 8,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.55,
  });

  // Heat corona around ember
  const heatCorona = nebulaGlowBrick(p, {
    id: "ve-s-hc",
    blur: 0.06,
    blobs: [
      { cx: 0.5, cy: 0.45, rx: 0.14, ry: 0.14, color: colors.hueOrange, opacity: 0.32 },
      { cx: 0.5, cy: 0.45, rx: 0.07, ry: 0.07, color: colors.hueYellow, opacity: 0.5 },
      { cx: 0.5, cy: 0.45, rx: 0.025, ry: 0.025, color: "#ffffff", opacity: 0.65 },
    ],
  });

  // The ember itself — slightly above center so terrain doesn't crowd it
  const ember = celestialBrick(p, {
    id: "ve-s-em",
    cx: 0.5,
    cy: 0.45,
    r: 0.009,
    color: colors.hueOrange,
    glowColor: colors.hueYellow,
    glowSize: 4.44,
  });

  // Desert horizon — raised by ~0.18 so it's visible mid-canvas
  const desert = terrainStackBrick(p, {
    id: "ve-s-ds",
    layers: [
      { baseY: 0.62, roughness: 0.04, color: colors.bgMid, opacity: 0.55 },
      { baseY: 0.72, roughness: 0.035, color: colors.bgSoft, opacity: 0.75 },
      { baseY: 0.82, roughness: 0.025, color: colors.bg, opacity: 0.92 },
    ],
  });

  // Sparse desert treeline at horizon
  const trees = treelineBrick(p, {
    id: "ve-s-tl",
    baseY: 0.7,
    count: 18,
    color: colors.bg,
    opacity: 0.6,
    maxHeight: 0.05,
  });

  // Horizon heat shimmer
  const hGlow = horizonGlowBrick(p, {
    id: "ve-s-hg",
    y: 0.61,
    color: colors.hueOrange,
    opacity: 0.08,
    height: 0.05,
  });

  // Concentric heat halo rings
  const ring1 = ringBrick(p, {
    id: "ve-s-r1",
    cx: 0.5,
    cy: 0.45,
    r: 0.16,
    strokeWidth: 2,
    color: colors.hueOrange,
    opacity: 0.22,
  });
  const ring2 = ringBrick(p, {
    id: "ve-s-r2",
    cx: 0.5,
    cy: 0.45,
    r: 0.26,
    strokeWidth: 1,
    color: colors.hueOrange,
    opacity: 0.11,
  });

  const meteor = shootingStarBrick(p, {
    id: "ve-s-mt",
    count: 2,
    color: "#ffffff",
    opacity: 0.45,
  });

  const vignette = vignetteBrick(p, { id: "ve-s-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ve-s-n", opacity: 0.03 });
  return mergeBricks([
    bg,
    dark,
    stars,
    meteor,
    heatCorona,
    ring1,
    ring2,
    ember,
    hGlow,
    desert,
    trees,
    vignette,
    noise,
  ]);
}

/* ── Drift: Cinder trail — ember path across terrain ──────────────────────── */
function voidEmberDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ve-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Faint horizon warm glow
  const hGlow = horizonGlowBrick(p, {
    id: "ve-d-hg",
    y: 0.62,
    color: colors.hueRed,
    opacity: 0.22,
    height: 0.12,
  });

  // Terrain silhouette — already the best in the file, keep ratios
  const terrain = terrainStackBrick(p, {
    id: "ve-d-tr",
    points: 40,
    layers: [
      { baseY: 0.58, roughness: 0.1, color: colors.bgMid, opacity: 0.62 },
      { baseY: 0.68, roughness: 0.07, color: colors.bgSoft, opacity: 0.82 },
      { baseY: 0.78, roughness: 0.04, color: colors.bg, opacity: 0.95 },
    ],
  });

  // Sparse trees on foreground ridge — scaled to terrain distance
  const trees = treelineBrick(p, {
    id: "ve-d-tl",
    baseY: 0.73,
    count: 25,
    color: colors.bg,
    opacity: 0.7,
    maxHeight: 0.04,
  });

  // Ember trail — shooting star-like streak
  const trail = shootingStarBrick(p, {
    id: "ve-d-tl2",
    count: 4,
    color: colors.hueOrange,
    opacity: 0.7,
  });

  // Drifting cinder particles
  const cinders = starFieldBrick(p, {
    id: "ve-d-ci",
    count: 80,
    brightCount: 16,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.75,
  });

  const cinderAtmo = atmosphereBrick(p, {
    id: "ve-d-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueOrange,
    opacity: 0.08,
    lightAzimuth: 200,
    lightElevation: 20,
    seed: 17,
  });

  const vignette = vignetteBrick(p, { id: "ve-d-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ve-d-n", opacity: 0.03 });
  return mergeBricks([bg, sky, hGlow, terrain, trees, trail, cinders, cinderAtmo, vignette, noise]);
}

/* ── Break: Particle burst — radial explosion ─────────────────────────────── */
function voidEmberBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const dark = skyGradientBrick(p, {
    id: "ve-b-dk",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Stars visible around the explosion
  const stars = starFieldBrick(p, {
    id: "ve-b-st",
    count: 160,
    brightCount: 6,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.45,
  });

  // Explosion centre
  const burstCore = celestialBrick(p, {
    id: "ve-b-bc",
    cx: 0.5,
    cy: 0.44,
    r: 0.016,
    color: "#ffffff",
    glowColor: colors.hueYellow,
    glowSize: 4.5,
  });

  // Expanding shockwave rings
  const rings = nebulaGlowBrick(p, {
    id: "ve-b-ri",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.44, rx: 0.06, ry: 0.06, color: colors.hueYellow, opacity: 0.35 },
      { cx: 0.5, cy: 0.44, rx: 0.14, ry: 0.14, color: colors.hueOrange, opacity: 0.2 },
      { cx: 0.5, cy: 0.44, rx: 0.26, ry: 0.26, color: colors.hueRed, opacity: 0.12 },
    ],
  });

  // Radial ejecta lines
  const ejecta1 = shootingStarBrick(p, {
    id: "ve-b-e1",
    count: 3,
    color: colors.hueOrange,
    opacity: 0.45,
  });
  const ejecta2 = shootingStarBrick(p, {
    id: "ve-b-e2",
    count: 3,
    color: colors.hueYellow,
    opacity: 0.35,
  });
  const ejecta3 = shootingStarBrick(p, {
    id: "ve-b-e3",
    count: 2,
    color: colors.hueRed,
    opacity: 0.3,
  });

  // Scattered particles
  const scatter = starFieldBrick(p, {
    id: "ve-b-sc",
    count: 70,
    brightCount: 14,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.6,
  });

  // Rising sparks from impact
  const impactSparks = sparksBrick(p, {
    id: "ve-b-isp",
    count: 28,
    color: colors.hueYellow,
    opacity: 0.55,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.2,
  });

  // Volcanic terrain — raised by 0.16
  const volcanicGround = terrainStackBrick(p, {
    id: "ve-b-vg",
    layers: [
      { baseY: 0.62, roughness: 0.08, color: colors.bgMid, opacity: 0.55 },
      { baseY: 0.72, roughness: 0.06, color: colors.bgSoft, opacity: 0.75 },
      { baseY: 0.82, roughness: 0.04, color: colors.bg, opacity: 0.92 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ve-b-vig", opacity: 0.45 });
  const noise = noiseBrick(p, { id: "ve-b-n", opacity: 0.03 });
  // Geometric shockwave ring at expansion front
  const shockRing = ringBrick(p, {
    id: "ve-b-sr",
    cx: 0.5,
    cy: 0.44,
    r: 0.3,
    strokeWidth: 2,
    color: colors.hueYellow,
    opacity: 0.22,
  });

  return mergeBricks([
    bg,
    dark,
    stars,
    rings,
    shockRing,
    burstCore,
    ejecta1,
    ejecta2,
    ejecta3,
    impactSparks,
    scatter,
    volcanicGround,
    vignette,
    noise,
  ]);
}

/* ── Void: Dying ember — perception-edge ──────────────────────────────────── */
function voidEmberVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const dark = skyGradientBrick(p, {
    id: "ve-v-dk",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.12 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Faint stars — as if the dying light dims even the sky
  const stars = starFieldBrick(p, {
    id: "ve-v-st",
    count: 180,
    brightCount: 4,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.3,
  });

  // Barely-visible dying ember
  const dyingEmber = nebulaGlowBrick(p, {
    id: "ve-v-de",
    blur: 0.05,
    blobs: [
      { cx: 0.5, cy: 0.48, rx: 0.05, ry: 0.05, color: colors.hueRed, opacity: 0.38 },
      { cx: 0.5, cy: 0.48, rx: 0.018, ry: 0.018, color: colors.hueOrange, opacity: 0.65 },
    ],
  });

  // Faint horizon warmth
  const hGlow = horizonGlowBrick(p, {
    id: "ve-v-hg",
    y: 0.64,
    color: colors.hueRed,
    opacity: 0.05,
    height: 0.04,
  });

  // Barren terrain — raised by ~0.2 so it fills the lower third
  const barren = terrainStackBrick(p, {
    id: "ve-v-br",
    layers: [
      { baseY: 0.65, roughness: 0.04, color: colors.bgMid, opacity: 0.45 },
      { baseY: 0.75, roughness: 0.025, color: colors.bgSoft, opacity: 0.62 },
      { baseY: 0.86, roughness: 0.02, color: colors.bg, opacity: 0.85 },
    ],
  });

  const voidAtmo = atmosphereBrick(p, {
    id: "ve-v-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueRed,
    opacity: 0.06,
    lightAzimuth: 190,
    lightElevation: 10,
    seed: 29,
  });

  const vignette = vignetteBrick(p, { id: "ve-v-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ve-v-n", opacity: 0.03 });
  return mergeBricks([bg, dark, stars, dyingEmber, hGlow, barren, voidAtmo, vignette, noise]);
}

/* ── Pulse: Ember constellation over desert night ─────────────────────────── */
function voidEmberPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ve-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Faint nebula warmth from desert heat
  const warmth = nebulaGlowBrick(p, {
    id: "ve-p-wa",
    blur: 0.06,
    blobs: [{ cx: 0.5, cy: 0.45, rx: 0.35, ry: 0.3, color: colors.hueRed, opacity: 0.07 }],
  });

  // Moon over the desert
  const moon = celestialBrick(p, {
    id: "ve-p-mn",
    cx: 0.72,
    cy: 0.14,
    r: 0.022,
    color: colors.hueOrange,
    glowColor: colors.hueYellow,
    glowSize: 3.5,
    crescent: { offsetX: 0.58, offsetY: -0.2, color: colors.bg },
  });

  // Terrain silhouette — raised by 0.14
  const terrain = terrainStackBrick(p, {
    id: "ve-p-tr",
    points: 18,
    layers: [
      { baseY: 0.56, roughness: 0.06, color: colors.bgMid, opacity: 0.42 },
      { baseY: 0.68, roughness: 0.04, color: colors.bg, opacity: 0.82 },
    ],
  });

  // Three tiers of embers — bright, medium, dim
  const bright = starFieldBrick(p, {
    id: "ve-p-t1",
    count: 20,
    brightCount: 16,
    color: colors.hueYellow,
    distribution: "full",
    opacity: 0.75,
  });
  const medium = starFieldBrick(p, {
    id: "ve-p-t2",
    count: 40,
    brightCount: 10,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.55,
  });
  const dim = starFieldBrick(p, {
    id: "ve-p-t3",
    count: 60,
    brightCount: 4,
    color: colors.hueRed,
    distribution: "full",
    opacity: 0.35,
  });

  // Horizon warmth from ground fire
  const hGlow = horizonGlowBrick(p, {
    id: "ve-p-hg",
    y: 0.68,
    color: colors.hueOrange,
    opacity: 0.1,
    height: 0.06,
  });

  // Ground fire sparks rising
  const groundSparks = sparksBrick(p, {
    id: "ve-p-gs",
    count: 25,
    color: colors.hueOrange,
    opacity: 0.6,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.4,
  });

  // Treeline on foreground terrain — properly scaled to terrain distance
  const trees = treelineBrick(p, {
    id: "ve-p-tl",
    baseY: 0.7,
    count: 32,
    color: colors.bg,
    opacity: 0.72,
    maxHeight: 0.04,
  });

  // Shooting star trails through ember sky
  const meteors = shootingStarBrick(p, {
    id: "ve-p-mt",
    count: 2,
    color: "#ffffff",
    opacity: 0.4,
  });

  // Cloud band — heat haze in mid-sky
  const haze = cloudBandBrick(p, {
    id: "ve-p-hz",
    cy: 0.35,
    bandHeight: 0.15,
    color: colors.bgSoft,
    opacity: 0.05,
    frequency: 0.004,
    seed: 7,
  });

  const vignette = vignetteBrick(p, { id: "ve-p-vig", opacity: 0.65 });
  const noise = noiseBrick(p, { id: "ve-p-n", opacity: 0.03 });
  return mergeBricks([
    bg,
    sky,
    warmth,
    moon,
    haze,
    hGlow,
    terrain,
    trees,
    dim,
    medium,
    bright,
    meteors,
    groundSparks,
    vignette,
    noise,
  ]);
}
