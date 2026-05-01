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
      { offset: "50%", color: colors.bgSoft, opacity: 0.15 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Heat corona around ember
  const heatCorona = nebulaGlowBrick(p, {
    id: "ve-s-hc",
    blur: 0.06,
    blobs: [
      { cx: 0.5, cy: 0.5, rx: 0.12, ry: 0.12, color: colors.hueOrange, opacity: 0.3 },
      { cx: 0.5, cy: 0.5, rx: 0.06, ry: 0.06, color: colors.hueYellow, opacity: 0.45 },
      { cx: 0.5, cy: 0.5, rx: 0.02, ry: 0.02, color: "#ffffff", opacity: 0.6 },
    ],
  });

  // The ember itself
  const ember = celestialBrick(p, {
    id: "ve-s-em",
    cx: 0.5,
    cy: 0.5,
    r: 0.008,
    color: colors.hueOrange,
    glowColor: colors.hueYellow,
    glowSize: 4.44,
  });

  // Desert horizon — ember suspended over night landscape
  const desert = terrainStackBrick(p, {
    id: "ve-s-ds",
    layers: [
      { baseY: 0.8, roughness: 0.04, color: colors.bgMid, opacity: 0.55 },
      { baseY: 0.88, roughness: 0.03, color: colors.bgSoft, opacity: 0.75 },
      { baseY: 0.94, roughness: 0.025, color: colors.bg, opacity: 0.9 },
    ],
  });

  // Concentric heat halo rings
  const ring1 = ringBrick(p, {
    id: "ve-s-r1",
    cx: 0.5,
    cy: 0.5,
    r: 0.14,
    strokeWidth: 2,
    color: colors.hueOrange,
    opacity: 0.2,
  });
  const ring2 = ringBrick(p, {
    id: "ve-s-r2",
    cx: 0.5,
    cy: 0.5,
    r: 0.22,
    strokeWidth: 1,
    color: colors.hueOrange,
    opacity: 0.1,
  });

  const vignette = vignetteBrick(p, { id: "ve-s-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ve-s-n", opacity: 0.03 });
  return mergeBricks([bg, dark, heatCorona, ring1, ring2, ember, desert, vignette, noise]);
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
    y: 0.68,
    color: colors.hueRed,
    opacity: 0.2,
    height: 0.12,
  });

  // Terrain silhouette
  const terrain = terrainStackBrick(p, {
    id: "ve-d-tr",
    points: 40,
    layers: [
      { baseY: 0.62, roughness: 0.1, color: colors.bgMid, opacity: 0.6 },
      { baseY: 0.72, roughness: 0.07, color: colors.bgSoft, opacity: 0.8 },
      { baseY: 0.82, roughness: 0.04, color: colors.bg, opacity: 0.95 },
    ],
  });

  // Ember trail — shooting star-like streak
  const trail = shootingStarBrick(p, {
    id: "ve-d-tl",
    count: 3,
    color: colors.hueOrange,
    opacity: 0.65,
  });

  // Drifting cinder particles
  const cinders = starFieldBrick(p, {
    id: "ve-d-ci",
    count: 60,
    brightCount: 12,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.7,
  });

  const cinderAtmo = atmosphereBrick(p, {
    id: "ve-d-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueOrange,
    opacity: 0.07,
    lightAzimuth: 200,
    lightElevation: 20,
    seed: 17,
  });

  const vignette = vignetteBrick(p, { id: "ve-d-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ve-d-n", opacity: 0.03 });
  return mergeBricks([bg, sky, hGlow, terrain, trail, cinders, cinderAtmo, vignette, noise]);
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

  // Explosion centre
  const burstCore = celestialBrick(p, {
    id: "ve-b-bc",
    cx: 0.5,
    cy: 0.48,
    r: 0.015,
    color: "#ffffff",
    glowColor: colors.hueYellow,
    glowSize: 4.0,
  });

  // Expanding shockwave rings
  const rings = nebulaGlowBrick(p, {
    id: "ve-b-ri",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.48, rx: 0.05, ry: 0.05, color: colors.hueYellow, opacity: 0.3 },
      { cx: 0.5, cy: 0.48, rx: 0.12, ry: 0.12, color: colors.hueOrange, opacity: 0.18 },
      { cx: 0.5, cy: 0.48, rx: 0.22, ry: 0.22, color: colors.hueRed, opacity: 0.1 },
    ],
  });

  // Radial ejecta lines
  const ejecta1 = shootingStarBrick(p, {
    id: "ve-b-e1",
    count: 2,
    color: colors.hueOrange,
    opacity: 0.3,
  });
  const ejecta2 = shootingStarBrick(p, {
    id: "ve-b-e2",
    count: 2,
    color: colors.hueOrange,
    opacity: 0.25,
  });
  const ejecta3 = shootingStarBrick(p, {
    id: "ve-b-e3",
    count: 2,
    color: colors.hueOrange,
    opacity: 0.2,
  });

  // Scattered particles
  const scatter = starFieldBrick(p, {
    id: "ve-b-sc",
    count: 50,
    brightCount: 10,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.5,
  });

  // Volcanic terrain — particle burst over jagged landscape
  const volcanicGround = terrainStackBrick(p, {
    id: "ve-b-vg",
    layers: [
      { baseY: 0.78, roughness: 0.08, color: colors.bgMid, opacity: 0.55 },
      { baseY: 0.86, roughness: 0.06, color: colors.bgSoft, opacity: 0.75 },
      { baseY: 0.93, roughness: 0.04, color: colors.bg, opacity: 0.9 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ve-b-vig", opacity: 0.45 });
  const noise = noiseBrick(p, { id: "ve-b-n", opacity: 0.03 });
  // Geometric shockwave ring at expansion front
  const shockRing = ringBrick(p, {
    id: "ve-b-sr",
    cx: 0.5,
    cy: 0.48,
    r: 0.28,
    strokeWidth: 2,
    color: colors.hueYellow,
    opacity: 0.2,
  });

  return mergeBricks([
    bg,
    dark,
    rings,
    shockRing,
    burstCore,
    ejecta1,
    ejecta2,
    ejecta3,
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
      { offset: "50%", color: colors.bgSoft, opacity: 0.08 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Barely-visible dying ember
  const dyingEmber = nebulaGlowBrick(p, {
    id: "ve-v-de",
    blur: 0.05,
    blobs: [
      { cx: 0.5, cy: 0.5, rx: 0.04, ry: 0.04, color: colors.hueRed, opacity: 0.35 },
      { cx: 0.5, cy: 0.5, rx: 0.015, ry: 0.015, color: colors.hueOrange, opacity: 0.6 },
    ],
  });

  // Barren terrain — desolate night landscape
  const barren = terrainStackBrick(p, {
    id: "ve-v-br",
    layers: [
      { baseY: 0.85, roughness: 0.04, color: colors.bgMid, opacity: 0.45 },
      { baseY: 0.92, roughness: 0.025, color: colors.bgSoft, opacity: 0.65 },
      { baseY: 0.97, roughness: 0.02, color: colors.bg, opacity: 0.85 },
    ],
  });

  const voidAtmo = atmosphereBrick(p, {
    id: "ve-v-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueRed,
    opacity: 0.05,
    lightAzimuth: 190,
    lightElevation: 10,
    seed: 29,
  });

  const vignette = vignetteBrick(p, { id: "ve-v-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ve-v-n", opacity: 0.03 });
  return mergeBricks([bg, dark, dyingEmber, barren, voidAtmo, vignette, noise]);
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

  // Faint nebula warmth
  const warmth = nebulaGlowBrick(p, {
    id: "ve-p-wa",
    blur: 0.06,
    blobs: [{ cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.25, color: colors.hueRed, opacity: 0.05 }],
  });

  // Terrain silhouette
  const terrain = terrainStackBrick(p, {
    id: "ve-p-tr",
    points: 18,
    layers: [
      { baseY: 0.7, roughness: 0.06, color: colors.bgMid, opacity: 0.4 },
      { baseY: 0.8, roughness: 0.04, color: colors.bg, opacity: 0.8 },
    ],
  });

  // Three tiers of embers — bright, medium, dim
  const bright = starFieldBrick(p, {
    id: "ve-p-t1",
    count: 15,
    brightCount: 12,
    color: colors.hueYellow,
    distribution: "full",
    opacity: 0.7,
  });
  const medium = starFieldBrick(p, {
    id: "ve-p-t2",
    count: 30,
    brightCount: 8,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.5,
  });
  const dim = starFieldBrick(p, {
    id: "ve-p-t3",
    count: 45,
    brightCount: 3,
    color: colors.hueRed,
    distribution: "full",
    opacity: 0.3,
  });

  // Horizon warmth from ground fire
  const hGlow = horizonGlowBrick(p, {
    id: "ve-p-hg",
    y: 0.75,
    color: colors.hueOrange,
    opacity: 0.08,
    height: 0.05,
  });

  // Ground fire sparks rising
  const groundSparks = sparksBrick(p, {
    id: "ve-p-gs",
    count: 20,
    color: colors.hueOrange,
    opacity: 0.55,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.4,
  });

  // Distant treeline silhouette at horizon
  const trees = treelineBrick(p, {
    id: "ve-p-tl",
    baseY: 0.7,
    count: 25,
    color: colors.bg,
    opacity: 0.7,
    maxHeight: 0.07,
  });

  const vignette = vignetteBrick(p, { id: "ve-p-vig", opacity: 0.65 });
  const noise = noiseBrick(p, { id: "ve-p-n", opacity: 0.03 });
  return mergeBricks([
    bg,
    sky,
    warmth,
    hGlow,
    terrain,
    trees,
    dim,
    medium,
    bright,
    groundSparks,
    vignette,
    noise,
  ]);
}
