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
  backgroundBrick,
  celestialBrick,
  constellationBrick,
  fogWispBrick,
  horizonGlowBrick,
  nebulaGlowBrick,
  noiseBrick,
  shootingStarBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainStackBrick,
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
      { cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.1, color: colors.hueOrange, opacity: 0.12 },
      { cx: 0.5, cy: 0.5, rx: 0.05, ry: 0.05, color: colors.hueYellow, opacity: 0.2 },
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
    glowSize: 0.03,
  });

  // Faint distant stars behind the void
  const stars = starFieldBrick(p, {
    id: "ve-s-st",
    count: 30,
    brightCount: 2,
    color: "#ffffff",
    color2: "#ddeeff",
    distribution: "full",
    opacity: 0.15,
    featureCount: 1,
  });

  // Desert horizon — ember suspended over night landscape
  const desert = terrainStackBrick(p, {
    id: "ve-s-ds",
    layers: [
      {
        baseY: 0.82,
        roughness: 0.02,
        color: colors.bgMid,
        opacity: 0.2,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueOrange,
      },
      { baseY: 0.9, roughness: 0.025, color: colors.bgSoft, opacity: 0.35 },
    ],
  });

  // Heat haze drifting around the ember
  const haze = fogWispBrick(p, {
    id: "ve-s-hz",
    cy: 0.52,
    hazeCount: 1,
    wispCount: 2,
    color: colors.hueOrange,
    hazeOpacity: 0.02,
    wispOpacity: 0.015,
  });

  const vignette = vignetteBrick(p, { id: "ve-s-vig", opacity: 0.9 });
  const noise = noiseBrick(p, { id: "ve-s-n", opacity: 0.03 });
  return mergeBricks([bg, dark, stars, heatCorona, ember, haze, desert, vignette, noise]);
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
    y: 0.7,
    color: colors.hueRed,
    opacity: 0.06,
    height: 0.08,
  });

  // Smoky red moon above the trail with craters and texture
  const moon = celestialBrick(p, {
    id: "ve-d-mn",
    cx: 0.68,
    cy: 0.2,
    r: 0.025,
    color: "#c8a880",
    glowColor: colors.hueOrange,
    glowSize: 2.5,
    glowOpacity: 0.1,
    crescent: { offsetX: -0.006, offsetY: -0.003, color: colors.bg },
    craterCount: 3,
    texture: true,
  });

  // Terrain silhouette with ridge highlights
  const terrain = terrainStackBrick(p, {
    id: "ve-d-tr",
    points: 16,
    layers: [
      {
        baseY: 0.65,
        roughness: 0.06,
        color: colors.bgMid,
        opacity: 0.4,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueOrange,
      },
      { baseY: 0.75, roughness: 0.04, color: colors.bg, opacity: 0.8 },
    ],
  });

  // Ember trail — shooting star-like streak with warm trail glow
  const trail = shootingStarBrick(p, {
    id: "ve-d-tl",
    color: colors.hueOrange,
    opacity: 0.35,
    trailColor: colors.hueYellow,
  });

  // Drifting cinder particles with featured bright embers
  const cinders = starFieldBrick(p, {
    id: "ve-d-ci",
    count: 35,
    brightCount: 8,
    color: colors.hueOrange,
    color2: colors.hueYellow,
    distribution: "full",
    opacity: 0.45,
    featureCount: 2,
  });

  // Smoke haze drifting across the trail
  const smoke = fogWispBrick(p, {
    id: "ve-d-fg",
    cy: 0.6,
    hazeCount: 2,
    wispCount: 3,
    color: colors.bgMid,
    hazeOpacity: 0.03,
    wispOpacity: 0.02,
  });

  const vignette = vignetteBrick(p, { id: "ve-d-vig", opacity: 0.75 });
  const noise = noiseBrick(p, { id: "ve-d-n", opacity: 0.03 });
  return mergeBricks([bg, sky, moon, hGlow, terrain, smoke, trail, cinders, vignette, noise]);
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

  // Explosion centre with texture
  const burstCore = celestialBrick(p, {
    id: "ve-b-bc",
    cx: 0.5,
    cy: 0.48,
    r: 0.015,
    color: "#ffffff",
    glowColor: colors.hueYellow,
    glowSize: 0.06,
    texture: true,
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

  // Radial ejecta lines with warm trail colors
  const ejecta1 = shootingStarBrick(p, {
    id: "ve-b-e1",
    count: 2,
    color: colors.hueOrange,
    opacity: 0.3,
    trailColor: colors.hueYellow,
  });
  const ejecta2 = shootingStarBrick(p, {
    id: "ve-b-e2",
    count: 2,
    color: colors.hueOrange,
    opacity: 0.25,
    trailColor: colors.hueRed,
  });
  const ejecta3 = shootingStarBrick(p, {
    id: "ve-b-e3",
    count: 2,
    color: colors.hueOrange,
    opacity: 0.2,
    trailColor: colors.hueRed,
  });

  // Scattered particles with featured bright sparks
  const scatter = starFieldBrick(p, {
    id: "ve-b-sc",
    count: 50,
    brightCount: 10,
    color: colors.hueOrange,
    color2: colors.hueYellow,
    color3: colors.hueRed,
    distribution: "full",
    opacity: 0.5,
    featureCount: 4,
  });

  // Volcanic terrain — particle burst over jagged landscape with ridge glow
  const volcanicGround = terrainStackBrick(p, {
    id: "ve-b-vg",
    layers: [
      {
        baseY: 0.8,
        roughness: 0.05,
        color: colors.bgMid,
        opacity: 0.3,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueOrange,
      },
      { baseY: 0.88, roughness: 0.04, color: colors.bgSoft, opacity: 0.5 },
      { baseY: 0.94, roughness: 0.03, color: colors.bg, opacity: 0.7 },
    ],
  });

  // Blast smoke and debris fog
  const blastFog = fogWispBrick(p, {
    id: "ve-b-fg",
    cy: 0.55,
    hazeCount: 2,
    wispCount: 3,
    color: colors.bgMid,
    hazeOpacity: 0.04,
    wispOpacity: 0.03,
  });

  const vignette = vignetteBrick(p, { id: "ve-b-vig", opacity: 0.7 });
  const noise = noiseBrick(p, { id: "ve-b-n", opacity: 0.03 });
  return mergeBricks([
    bg,
    dark,
    rings,
    burstCore,
    ejecta1,
    ejecta2,
    ejecta3,
    scatter,
    blastFog,
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
    blur: 0.03,
    blobs: [{ cx: 0.5, cy: 0.5, rx: 0.015, ry: 0.015, color: colors.hueRed, opacity: 0.15 }],
  });

  // Barren terrain — desolate night landscape with faint ridge glow
  const barren = terrainStackBrick(p, {
    id: "ve-v-br",
    layers: [
      {
        baseY: 0.88,
        roughness: 0.015,
        color: colors.bgSoft,
        opacity: 0.12,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueRed,
      },
      { baseY: 0.94, roughness: 0.02, color: colors.bgMid, opacity: 0.2 },
    ],
  });

  // Faint heat mist near the dying ember
  const haze = fogWispBrick(p, {
    id: "ve-v-hz",
    cy: 0.52,
    hazeCount: 1,
    wispCount: 1,
    color: colors.hueRed,
    hazeOpacity: 0.01,
    wispOpacity: 0.008,
  });

  const vignette = vignetteBrick(p, { id: "ve-v-vig", opacity: 0.92 });
  const noise = noiseBrick(p, { id: "ve-v-n", opacity: 0.03 });
  return mergeBricks([bg, dark, dyingEmber, haze, barren, vignette, noise]);
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

  // Ember constellations — star-like cinder patterns with connecting lines
  const constellations = constellationBrick(p, {
    id: "ve-p-cns",
    count: 5,
    color: colors.hueOrange,
    starRadius: 2,
    lineOpacity: 0.08,
    starOpacity: 0.45,
  });

  // Terrain silhouette with ridge glow from ground fire
  const terrain = terrainStackBrick(p, {
    id: "ve-p-tr",
    points: 18,
    layers: [
      {
        baseY: 0.7,
        roughness: 0.06,
        color: colors.bgMid,
        opacity: 0.4,
        ridgeHighlight: true,
        ridgeHighlightColor: colors.hueOrange,
      },
      { baseY: 0.8, roughness: 0.04, color: colors.bg, opacity: 0.8 },
    ],
  });

  // Three tiers of embers — bright, medium, dim — with featured sparks
  const bright = starFieldBrick(p, {
    id: "ve-p-t1",
    count: 15,
    brightCount: 12,
    color: colors.hueYellow,
    color2: "#ffffff",
    distribution: "full",
    opacity: 0.7,
    featureCount: 3,
  });
  const medium = starFieldBrick(p, {
    id: "ve-p-t2",
    count: 30,
    brightCount: 8,
    color: colors.hueOrange,
    color2: colors.hueYellow,
    distribution: "full",
    opacity: 0.5,
    featureCount: 2,
  });
  const dim = starFieldBrick(p, {
    id: "ve-p-t3",
    count: 45,
    brightCount: 3,
    color: colors.hueRed,
    color2: colors.hueOrange,
    distribution: "full",
    opacity: 0.3,
    featureCount: 1,
  });

  // Horizon warmth from ground fire
  const hGlow = horizonGlowBrick(p, {
    id: "ve-p-hg",
    y: 0.75,
    color: colors.hueOrange,
    opacity: 0.08,
    height: 0.05,
  });

  // Desert heat haze rising over terrain
  const heatHaze = fogWispBrick(p, {
    id: "ve-p-fg",
    cy: 0.68,
    hazeCount: 2,
    wispCount: 3,
    color: colors.hueOrange,
    hazeOpacity: 0.02,
    wispOpacity: 0.015,
  });

  const vignette = vignetteBrick(p, { id: "ve-p-vig", opacity: 0.65 });
  const noise = noiseBrick(p, { id: "ve-p-n", opacity: 0.03 });
  return mergeBricks([
    bg,
    sky,
    warmth,
    constellations,
    hGlow,
    terrain,
    heatHaze,
    dim,
    medium,
    bright,
    vignette,
    noise,
  ]);
}
