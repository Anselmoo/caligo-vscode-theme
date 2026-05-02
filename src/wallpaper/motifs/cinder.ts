/**
 * Cinder motif — 5 fire & ash night scenes.
 *
 * Stillness : Forest embers — glowing treeline embers under starfield
 * Drift     : Smoke drift — lava rivers down volcanic slope with smoke layers
 * Break     : Fire ridge — lightning strike splits storm clouds over burning ridge
 * Void      : Ash void — white ash drifting over extinguished landscape
 * Pulse     : Campfire — warm lanterns and sparks ascending over mountain camp
 */
import {
  atmosphereBrick,
  backgroundBrick,
  campfireFlameBrick,
  cloudBandBrick,
  lavaRiverBrick,
  noiseBrick,
  particlesBrick,
  radialGradientBrick,
  skyGradientBrick,
  smokeRisingBrick,
  sparksBrick,
  starFieldBrick,
  terrainBrick,
  terrainContourBrick,
  treelineBrick,
  vignetteBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function cinder(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return cinderDrift(params);
    case "split-complementary":
      return cinderBreak(params);
    case "monochromatic":
      return cinderVoid(params);
    case "triadic":
      return cinderPulse(params);
    default:
      return cinderStillness(params);
  }
}

/* ── Stillness: Forest embers — glowing treeline under starfield ──────────── */
function cinderStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "ci-s-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "60%", color: colors.bgSoft, opacity: 1 },
      { offset: "85%", color: colors.hueOrange, opacity: 0.1 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "ci-s-st",
    count: 180,
    brightCount: 5,
    distribution: "upper",
    opacity: 0.7,
  });

  // Warm ground glow from embers
  const fireGlow = radialGradientBrick(p, {
    id: "ci-s-fg",
    cx: 0.5,
    cy: 0.88,
    r: 0.35,
    stops: [
      { offset: "0%", color: colors.hueOrange, opacity: 0.5 },
      { offset: "50%", color: colors.hueRed, opacity: 0.15 },
      { offset: "100%", color: colors.bg, opacity: 0 },
    ],
  });

  // Treeline silhouette (jagged for tree tops)
  const treeline = terrainBrick(p, {
    id: "ci-s-tr",
    baseY: 0.68,
    roughness: 0.12,
    points: 40,
    color: colors.bgMid,
    opacity: 0.9,
  });
  const ground = terrainBrick(p, {
    id: "ci-s-gr",
    baseY: 0.82,
    roughness: 0.03,
    points: 16,
    color: colors.bg,
    opacity: 0.95,
  });

  // Rising sparks
  const sparks = sparksBrick(p, {
    id: "ci-s-sp",
    count: 35,
    color: colors.hueYellow,
    opacity: 0.7,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.2,
  });

  // Pine treeline silhouette over rough terrain
  const pines = treelineBrick(p, {
    id: "ci-s-tl",
    baseY: 0.68,
    count: 45,
    color: colors.bg,
    opacity: 0.95,
    maxHeight: 0.1,
  });

  const smokeHaze = atmosphereBrick(p, {
    id: "ci-s-ah",
    color: colors.bgMid,
    highlightColor: colors.hueOrange,
    opacity: 0.07,
    lightAzimuth: 200,
    lightElevation: 25,
    seed: 5,
  });

  const vignette = vignetteBrick(p, { id: "ci-s-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ci-s-n", opacity: 0.04 });

  return mergeBricks([
    bg,
    sky,
    stars,
    fireGlow,
    treeline,
    pines,
    ground,
    smokeHaze,
    sparks,
    vignette,
    noise,
  ]);
}

/* ── Drift: Smoke drift — lava rivers with smoke and volcanic terrain ──────── */
function cinderDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "ci-d-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "45%", color: colors.bgSoft, opacity: 1 },
      { offset: "75%", color: colors.hueOrange, opacity: 0.2 },
      { offset: "100%", color: colors.hueRed, opacity: 0.15 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "ci-d-st",
    count: 80,
    brightCount: 3,
    distribution: "upper",
    opacity: 0.45,
  });

  // Volcanic terrain — steep, dark layers
  const volcanicBack = terrainBrick(p, {
    id: "ci-d-vb",
    baseY: 0.5,
    roughness: 0.12,
    points: 20,
    color: colors.bgMid,
    opacity: 0.6,
  });
  const volcanicMid = terrainBrick(p, {
    id: "ci-d-vm",
    baseY: 0.62,
    roughness: 0.1,
    points: 22,
    color: colors.bgSoft,
    opacity: 0.75,
  });
  const volcanicFront = terrainBrick(p, {
    id: "ci-d-vf",
    baseY: 0.75,
    roughness: 0.08,
    points: 18,
    color: colors.bg,
    opacity: 0.95,
  });

  // Sinuous lava rivers flowing down the volcanic slope
  const lavaRiver = lavaRiverBrick(p, {
    id: "ci-d-lv",
    startY: 0.48,
    endY: 0.78,
    cx: 0.42,
    spreadX: 0.55,
    rivers: 4,
    hotColor: "#ffdd44",
    glowColor: "#ff4400",
    opacity: 0.85,
  });

  // Smoke rising from the hot lava channels
  const smokePlume = smokeRisingBrick(p, {
    id: "ci-d-sm",
    sourceY: 0.58,
    riseHeight: 0.52,
    spreadX: 0.65,
    color: colors.bgMid,
    opacity: 0.12,
    columns: 3,
  });

  const emberSparks = sparksBrick(p, {
    id: "ci-d-es",
    count: 25,
    color: colors.hueOrange,
    opacity: 0.6,
    direction: 1,
    sourceCx: 0.4,
    sourceSpread: 0.25,
  });

  const vignette = vignetteBrick(p, { id: "ci-d-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ci-d-n", opacity: 0.05 });

  return mergeBricks([
    bg,
    sky,
    stars,
    volcanicBack,
    lavaRiver,
    smokePlume,
    volcanicMid,
    volcanicFront,
    emberSparks,
    vignette,
    noise,
  ]);
}

/* ── Break: Fire ridge — lightning over burning mountain ridge ─────────────── */
function cinderBreak(p: BrickParams): ComposedWallpaper {
  const {
    colors,
    viewBox: { width, height },
  } = p;
  const scale = Math.max(width, height);

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "ci-b-sky",
    stops: [
      { offset: "0%", color: colors.bgMid, opacity: 1 },
      { offset: "40%", color: colors.bgSoft, opacity: 1 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  // Storm cloud layer
  const clouds = cloudBandBrick(p, {
    id: "ci-b-cl",
    cy: 0.25,
    bandHeight: 0.12,
    color: colors.bgMid,
    opacity: 0.06,
    frequency: 0.006,
  });

  // Lightning bolt with glow
  const boltGlow = radialGradientBrick(p, {
    id: "ci-b-bg",
    cx: 0.5,
    cy: 0.3,
    r: 0.35,
    stops: [
      { offset: "0%", color: colors.hueYellow, opacity: 0.3 },
      { offset: "100%", color: colors.bg, opacity: 0 },
    ],
  });
  const bolt = {
    defs: `<filter id="ci-b-bf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(scale * 0.004).toFixed(0)}"/></filter>`,
    elements: `<line x1="${(width * 0.48).toFixed(0)}" y1="${(height * 0.05).toFixed(0)}" x2="${(width * 0.52).toFixed(0)}" y2="${(height * 0.55).toFixed(0)}" stroke="${colors.hueYellow}" stroke-width="${(scale * 0.003).toFixed(1)}" opacity="0.85"/>
<line x1="${(width * 0.48).toFixed(0)}" y1="${(height * 0.05).toFixed(0)}" x2="${(width * 0.52).toFixed(0)}" y2="${(height * 0.55).toFixed(0)}" stroke="${colors.accent}" stroke-width="${(scale * 0.01).toFixed(1)}" opacity="0.2" filter="url(#ci-b-bf)"/>`,
  };

  // Burning mountain ridge
  const ridge = terrainContourBrick(p, {
    id: "ci-b-rd",
    horizonY: 0.52,
    layers: [
      { color: colors.hueRed, opacity: 0.2 },
      { color: colors.bgMid, opacity: 0.7 },
      { color: colors.bg, opacity: 0.95 },
    ],
  });

  // Fire glow behind the ridge
  const fireGlow = radialGradientBrick(p, {
    id: "ci-b-fr",
    cx: 0.5,
    cy: 0.62,
    r: 0.35,
    stops: [
      { offset: "0%", color: colors.hueOrange, opacity: 0.35 },
      { offset: "100%", color: colors.bg, opacity: 0 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "ci-b-st",
    count: 40,
    brightCount: 1,
    distribution: "upper",
    opacity: 0.3,
  });

  const fireSparks = sparksBrick(p, {
    id: "ci-b-fs",
    count: 30,
    color: colors.hueYellow,
    opacity: 0.5,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.3,
  });

  const vignette = vignetteBrick(p, { id: "ci-b-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ci-b-n", opacity: 0.05 });

  return mergeBricks([
    bg,
    sky,
    stars,
    clouds,
    boltGlow,
    bolt,
    fireGlow,
    ridge,
    fireSparks,
    vignette,
    noise,
  ]);
}

/* ── Void: Ash void — white ash over extinguished landscape ───────────────── */
function cinderVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "ci-v-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "100%", color: colors.bgSoft, opacity: 0.6 },
    ],
  });

  // Barely visible stars through ash haze
  const stars = starFieldBrick(p, {
    id: "ci-v-st",
    count: 30,
    brightCount: 1,
    distribution: "upper",
    opacity: 0.25,
  });

  // Last ember glow
  const glow = radialGradientBrick(p, {
    id: "ci-v-g",
    cx: 0.5,
    cy: 0.72,
    r: 0.2,
    stops: [
      { offset: "0%", color: colors.hueOrange, opacity: 0.4 },
      { offset: "100%", color: colors.bg, opacity: 0 },
    ],
  });

  // Desolate burnt landscape
  const terrain = terrainBrick(p, {
    id: "ci-v-t",
    baseY: 0.72,
    roughness: 0.04,
    points: 16,
    color: colors.bgMid,
    opacity: 0.5,
  });
  const ground = terrainBrick(p, {
    id: "ci-v-gr",
    baseY: 0.78,
    roughness: 0.02,
    points: 12,
    color: colors.bg,
    opacity: 0.9,
  });

  // Ash rising from the burnt ground — diffuse, slow vertical columns
  const ashHaze = smokeRisingBrick(p, {
    id: "ci-v-ah",
    sourceY: 0.72,
    riseHeight: 0.68,
    spreadX: 1.0,
    color: colors.bgSoft,
    opacity: 0.06,
    columns: 4,
  });

  // Drifting ash particles
  const ash = particlesBrick(p, {
    id: "ci-v-ash",
    count: 80,
    color: colors.bgSoft,
    minRadius: 1,
    maxRadius: 2,
    opacity: 0.25,
    distribution: "uniform",
  });

  const vignette = vignetteBrick(p, { id: "ci-v-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ci-v-n", opacity: 0.04 });

  return mergeBricks([bg, sky, stars, glow, ashHaze, ash, terrain, ground, vignette, noise]);
}

/* ── Pulse: Campfire — warm sparks ascending over mountain camp ────────────── */
function cinderPulse(p: BrickParams): ComposedWallpaper {
  const {
    colors,
    viewBox: { width, height },
  } = p;
  const scale = Math.max(width, height);

  const bg = backgroundBrick(p);
  const sky = skyGradientBrick(p, {
    id: "ci-p-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "55%", color: colors.bgSoft, opacity: 1 },
      { offset: "80%", color: colors.hueOrange, opacity: 0.08 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "ci-p-st",
    count: 150,
    brightCount: 6,
    distribution: "upper",
    opacity: 0.6,
  });

  // Campfire — anatomical flame tongues with bezier paths.
  // Fire colors are physically constrained; override palette to keep them warm.
  const campfire = campfireFlameBrick(p, {
    id: "ci-p-cf",
    cx: 0.5,
    baseY: 0.82,
    flameHeight: 0.08,
    baseWidth: 0.05,
    hotColor: "#fff4a0",
    warmColor: "#ff6a00",
    opacity: 0.92,
  });

  // Warm lantern glows ascending
  const lanterns: string[] = [];
  const positions = [
    [0.5, 0.72],
    [0.38, 0.58],
    [0.62, 0.52],
    [0.28, 0.4],
    [0.72, 0.36],
    [0.5, 0.24],
  ];
  positions.forEach(([cx, cy], i) => {
    const r = (scale * 0.012 * (1 - cy * 0.3)).toFixed(1);
    lanterns.push(
      `<circle cx="${(cx * width).toFixed(0)}" cy="${(cy * height).toFixed(0)}" r="${r}" fill="${colors.hueOrange}" opacity="${(0.3 + i * 0.05).toFixed(2)}"/>`
    );
  });
  const lanternElems = {
    defs: `<filter id="ci-p-lg" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="${(scale * 0.008).toFixed(0)}"/></filter>`,
    elements: `<g filter="url(#ci-p-lg)">${lanterns.join("\n")}</g>`,
  };

  // Mountain backdrop
  const mountains = terrainContourBrick(p, {
    id: "ci-p-mt",
    horizonY: 0.5,
    layers: [
      { color: colors.bgMid, opacity: 0.5 },
      { color: colors.bgSoft, opacity: 0.7 },
      { color: colors.bg, opacity: 0.95 },
    ],
  });

  const sparks = sparksBrick(p, {
    id: "ci-p-sp",
    count: 50,
    color: colors.hueYellow,
    opacity: 0.55,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.15,
  });

  // Forest treeline silhouette behind the camp
  const forest = treelineBrick(p, {
    id: "ci-p-fl",
    baseY: 0.62,
    count: 35,
    color: colors.bg,
    opacity: 0.9,
    maxHeight: 0.09,
  });

  const vignette = vignetteBrick(p, { id: "ci-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ci-p-n", opacity: 0.04 });

  return mergeBricks([
    bg,
    sky,
    stars,
    mountains,
    forest,
    campfire,
    lanternElems,
    sparks,
    vignette,
    noise,
  ]);
}
