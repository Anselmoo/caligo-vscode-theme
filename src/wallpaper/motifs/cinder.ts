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
  backgroundBrick,
  campfireFlameBrick,
  cloudBandBrick,
  lavaRiverBrick,
  lightningBrick,
  noiseBrick,
  particlesBrick,
  ridgeHighlightBrick,
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
    count: 280,
    brightCount: 10,
    distribution: "upper",
    opacity: 0.7,
  });

  // Treeline silhouette — rough terrain backing + pine shapes on top
  const treeline = terrainBrick(p, {
    id: "ci-s-tr",
    baseY: 0.68,
    roughness: 0.12,
    points: 40,
    color: colors.bgMid,
    opacity: 0.9,
  });
  const pines = treelineBrick(p, {
    id: "ci-s-tl",
    baseY: 0.68,
    count: 50,
    color: colors.bg,
    opacity: 0.95,
    maxHeight: 0.055,
  });

  // Ember glow catching the ridge tops — fire light from below illuminates the treeline
  const ridgeGlow = ridgeHighlightBrick(p, {
    id: "ci-s-rg",
    baseY: 0.68,
    roughness: 0.12,
    points: 40,
    color: "#ff6a00",
    opacity: 0.18,
    glowPx: 28,
    seedSuffix: "ci-s-tr",
  });

  // Scattered ember fires smouldering in the treeline — 3 independent flame clusters
  const ember1 = campfireFlameBrick(p, {
    id: "ci-s-e1",
    cx: 0.28,
    baseY: 0.69,
    flameHeight: 0.035,
    baseWidth: 0.022,
    hotColor: "#fff4a0",
    warmColor: "#ff6a00",
    opacity: 0.75,
    seed: 11,
  });
  const ember2 = campfireFlameBrick(p, {
    id: "ci-s-e2",
    cx: 0.52,
    baseY: 0.68,
    flameHeight: 0.045,
    baseWidth: 0.028,
    hotColor: "#fff4a0",
    warmColor: "#ff5500",
    opacity: 0.8,
    seed: 37,
  });
  const ember3 = campfireFlameBrick(p, {
    id: "ci-s-e3",
    cx: 0.74,
    baseY: 0.7,
    flameHeight: 0.03,
    baseWidth: 0.018,
    hotColor: "#fff4a0",
    warmColor: "#ff6a00",
    opacity: 0.65,
    seed: 59,
  });

  // Smoke drifting from the smouldering treeline
  const emberSmoke = smokeRisingBrick(p, {
    id: "ci-s-sm",
    sourceY: 0.67,
    riseHeight: 0.55,
    spreadX: 0.8,
    color: colors.bgMid,
    opacity: 0.08,
    columns: 3,
  });

  // Solid ground plane — fully opaque, anchors the treeline to canvas bottom
  const ground = terrainBrick(p, {
    id: "ci-s-gr",
    baseY: 0.82,
    roughness: 0.02,
    points: 10,
    color: colors.bg,
    opacity: 1.0,
  });

  // Rising sparks from the embers
  const sparks = sparksBrick(p, {
    id: "ci-s-sp",
    count: 35,
    color: "#ff9944",
    opacity: 0.7,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.35,
  });

  const vignette = vignetteBrick(p, { id: "ci-s-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ci-s-n", opacity: 0.04 });

  return mergeBricks([
    bg,
    sky,
    stars,
    treeline,
    ridgeGlow,
    ember1,
    ember2,
    ember3,
    pines,
    ground,
    emberSmoke,
    sparks,
    vignette,
    noise,
  ]);
}

/* ── Drift: Volcanic slope — unified cone with lava veins and summit smoke ─── */
function cinderDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

  const bg = backgroundBrick(p);

  // Sky: dark top → warm volcanic glow at horizon → dark ground
  // Ends with bg so no color bleeds through the opaque mountain mass
  const sky = skyGradientBrick(p, {
    id: "ci-d-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "35%", color: colors.bgSoft, opacity: 1 },
      { offset: "55%", color: colors.hueOrange, opacity: 0.12 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "ci-d-st",
    count: 180,
    brightCount: 5,
    distribution: "upper",
    opacity: 0.35,
  });

  // ONE unified volcanic mass using terrainContourBrick — forms continuous
  // mountain from peak (~35% height) all the way to the bottom of the canvas.
  // No gaps, no floating layers. Bob Ross rule: mountain is one solid shape.
  const volcano = terrainContourBrick(p, {
    id: "ci-d-vol",
    horizonY: 0.35,
    layers: [
      { color: colors.bgMid, opacity: 0.6, edgeBlur: 3 }, // far ridges, hazy
      { color: colors.bgSoft, opacity: 0.8 }, // mid slopes
      { color: colors.bg, opacity: 1.0 }, // near face, fully opaque
    ],
  });

  // Lava rivers flow ON the visible mountain face (between far and near layers)
  // startY begins where the far ridge emerges, endY at the near face
  const lavaRiver = lavaRiverBrick(p, {
    id: "ci-d-lv",
    startY: 0.4,
    endY: 0.82,
    cx: 0.45,
    spreadX: 0.4,
    rivers: 3,
    hotColor: "#ffdd44",
    glowColor: "#ff4400",
    opacity: 0.8,
  });

  // Summit smoke — rises from the peak area
  const smokePlume = smokeRisingBrick(p, {
    id: "ci-d-sm",
    sourceY: 0.38,
    riseHeight: 0.35,
    spreadX: 0.4,
    color: colors.bgMid,
    opacity: 0.1,
    columns: 2,
  });

  // Ember sparks from lava channels
  const emberSparks = sparksBrick(p, {
    id: "ci-d-es",
    count: 20,
    color: colors.hueOrange,
    opacity: 0.55,
    direction: 1,
    sourceCx: 0.45,
    sourceSpread: 0.2,
  });

  const vignette = vignetteBrick(p, { id: "ci-d-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ci-d-n", opacity: 0.05 });

  return mergeBricks([
    bg,
    sky,
    stars,
    volcano,
    lavaRiver,
    smokePlume,
    emberSparks,
    vignette,
    noise,
  ]);
}

/* ── Break: Fire ridge — lightning strikes a burning mountain range ─────────── */
function cinderBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

  const bg = backgroundBrick(p);

  // Stormy sky — dark and oppressive, lit from below by the fire
  const sky = skyGradientBrick(p, {
    id: "ci-b-sky",
    stops: [
      { offset: "0%", color: colors.bgMid, opacity: 1 },
      { offset: "30%", color: colors.bgSoft, opacity: 1 },
      { offset: "60%", color: colors.hueRed, opacity: 0.06 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  // Storm clouds — turbulent pressure bands at upper sky
  const clouds = cloudBandBrick(p, {
    id: "ci-b-cl",
    cy: 0.2,
    bandHeight: 0.2,
    color: colors.bgMid,
    opacity: 0.1,
    frequency: 0.006,
  });

  // Lightning bolt — FOCAL POINT striking from clouds to ridge
  const bolt = lightningBrick(p, {
    id: "ci-b-bolt",
    startX: 0.48,
    startY: 0.06,
    endX: 0.44,
    endY: 0.48,
    color: "#c8e0ff",
    opacity: 0.92,
    branches: 4,
  });

  // Unified mountain mass — continuous from peak to canvas bottom.
  // horizonY 0.42 means peaks start at ~42% height, fills down completely.
  const ridge = terrainContourBrick(p, {
    id: "ci-b-rd",
    horizonY: 0.42,
    layers: [
      { color: colors.hueRed, opacity: 0.15, edgeBlur: 2 }, // far fire-lit ridge
      { color: colors.bgMid, opacity: 0.7 }, // mid mountain
      { color: colors.bg, opacity: 1.0 }, // near face, opaque
    ],
  });

  // Forest fire burning along the far ridgeline
  const forestFire = campfireFlameBrick(p, {
    id: "ci-b-ff",
    cx: 0.5,
    baseY: 0.48,
    flameHeight: 0.05,
    baseWidth: 0.5,
    hotColor: "#fff4a0",
    warmColor: "#ff4400",
    opacity: 0.45,
    seed: 77,
  });

  // Smoke billowing up from the burning ridge into the storm
  const fireSmoke = smokeRisingBrick(p, {
    id: "ci-b-sm",
    sourceY: 0.45,
    riseHeight: 0.4,
    spreadX: 0.6,
    color: colors.bgMid,
    opacity: 0.12,
    columns: 3,
  });

  // Sparks carried by wind from the fire
  const fireSparks = sparksBrick(p, {
    id: "ci-b-fs",
    count: 28,
    color: "#ff9944",
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
    clouds,
    bolt,
    forestFire,
    fireSmoke,
    ridge,
    fireSparks,
    vignette,
    noise,
  ]);
}

/* ── Void: Ash void — desolate post-fire landscape with drifting ash ────────── */
function cinderVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;

  const bg = backgroundBrick(p);

  // Overcast ash-choked sky — no visible horizon glow, just oppressive grey
  const sky = skyGradientBrick(p, {
    id: "ci-v-sky",
    stops: [
      { offset: "0%", color: colors.bg, opacity: 1 },
      { offset: "60%", color: colors.bgSoft, opacity: 0.4 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  // Barely visible stars through ash haze
  const stars = starFieldBrick(p, {
    id: "ci-v-st",
    count: 120,
    brightCount: 2,
    distribution: "upper",
    opacity: 0.15,
  });

  // Distant burnt hills — very faded, atmospheric haze
  const distantHills = terrainBrick(p, {
    id: "ci-v-dh",
    baseY: 0.58,
    roughness: 0.06,
    points: 20,
    color: colors.bgMid,
    opacity: 0.3,
    edgeBlur: 3,
  });

  // Mid-ground scorched earth — the main terrain plane
  const terrain = terrainBrick(p, {
    id: "ci-v-t",
    baseY: 0.68,
    roughness: 0.04,
    points: 16,
    color: colors.bgSoft,
    opacity: 0.7,
  });

  // Dead tree stumps — vertical silhouettes breaking horizontal desolation
  // Bob Ross: "dead trees" add drama and scale reference
  const deadTrees = treelineBrick(p, {
    id: "ci-v-tl",
    baseY: 0.68,
    count: 8,
    color: colors.bg,
    opacity: 0.6,
    maxHeight: 0.07,
  });

  // Solid foreground ground plane — fully opaque, anchors the scene
  const ground = terrainBrick(p, {
    id: "ci-v-gr",
    baseY: 0.82,
    roughness: 0.02,
    points: 10,
    color: colors.bg,
    opacity: 1.0,
  });

  // Last dying ember — a tiny almost-extinguished campfire on the ground
  // FOCAL POINT: the only warm color in an otherwise dead scene
  const glow = campfireFlameBrick(p, {
    id: "ci-v-g",
    cx: 0.4,
    baseY: 0.83,
    flameHeight: 0.015,
    baseWidth: 0.014,
    hotColor: "#fff4a0",
    warmColor: "#ff4400",
    opacity: 0.35,
    seed: 91,
  });

  // Ash rising from the burnt ground — diffuse vertical columns
  const ashHaze = smokeRisingBrick(p, {
    id: "ci-v-ah",
    sourceY: 0.68,
    riseHeight: 0.6,
    spreadX: 1.0,
    color: colors.bgSoft,
    opacity: 0.05,
    columns: 4,
  });

  // Drifting ash particles — the scene's defining detail
  const ash = particlesBrick(p, {
    id: "ci-v-ash",
    count: 90,
    color: colors.bgSoft,
    minRadius: 1,
    maxRadius: 2.5,
    opacity: 0.2,
    distribution: "uniform",
  });

  const vignette = vignetteBrick(p, { id: "ci-v-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ci-v-n", opacity: 0.04 });

  return mergeBricks([
    bg,
    sky,
    stars,
    distantHills,
    terrain,
    deadTrees,
    ground,
    glow,
    ashHaze,
    ash,
    vignette,
    noise,
  ]);
}

/* ── Pulse: Campfire — intimate camp scene with distant mountains ─────────── */
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
      { offset: "50%", color: colors.bgSoft, opacity: 1 },
      { offset: "75%", color: colors.hueOrange, opacity: 0.06 },
      { offset: "100%", color: colors.bg, opacity: 1 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "ci-p-st",
    count: 260,
    brightCount: 8,
    distribution: "upper",
    opacity: 0.6,
  });

  // DISTANT mountain silhouette — far away, hazy, occupies upper-mid area
  // Bob Ross: background mountains are simple, muted, atmospheric
  const mountains = terrainContourBrick(p, {
    id: "ci-p-mtn",
    horizonY: 0.42,
    layers: [
      { color: colors.bgMid, opacity: 0.35, edgeBlur: 4 }, // very far, nearly invisible
      { color: colors.bgSoft, opacity: 0.55, edgeBlur: 2 }, // mid-distance
    ],
  });

  // Foreground campsite ground — solid, dark, opaque. This IS the viewer's ground plane.
  // Occupies bottom 20% of canvas. The campfire sits ON this ground.
  const campGround = terrainBrick(p, {
    id: "ci-p-cg",
    baseY: 0.8,
    roughness: 0.03,
    points: 12,
    color: colors.bg,
    opacity: 1.0,
  });

  // Small foreground trees framing the camp — at ground level, not on mountains
  const campTrees = treelineBrick(p, {
    id: "ci-p-fl",
    baseY: 0.8,
    count: 12,
    color: colors.bg,
    opacity: 0.85,
    maxHeight: 0.06,
  });

  // Campfire — the FOCAL POINT. Sits on the ground plane.
  const campfire = campfireFlameBrick(p, {
    id: "ci-p-cf",
    cx: 0.5,
    baseY: 0.88,
    flameHeight: 0.07,
    baseWidth: 0.04,
    hotColor: "#fff4a0",
    warmColor: "#ff6a00",
    opacity: 0.92,
  });

  // Sparks rising from the campfire — the primary vertical element
  const sparks = sparksBrick(p, {
    id: "ci-p-sp",
    count: 45,
    color: colors.hueYellow,
    opacity: 0.6,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.12,
  });

  // Warm lantern glows ascending from campfire into sky — like embers/fireflies
  const lanterns: string[] = [];
  const positions = [
    [0.48, 0.75],
    [0.53, 0.62],
    [0.45, 0.48],
    [0.55, 0.35],
    [0.5, 0.22],
  ];
  positions.forEach(([cx, cy], i) => {
    const r = (scale * 0.008 * (1 - cy * 0.4)).toFixed(1);
    lanterns.push(
      `<circle cx="${(cx * width).toFixed(0)}" cy="${(cy * height).toFixed(0)}" r="${r}" fill="${colors.hueOrange}" opacity="${(0.2 + i * 0.04).toFixed(2)}"/>`
    );
  });
  const lanternElems = {
    defs: `<filter id="ci-p-lg" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="${(scale * 0.006).toFixed(0)}"/></filter>`,
    elements: `<g filter="url(#ci-p-lg)">${lanterns.join("\n")}</g>`,
  };

  const vignette = vignetteBrick(p, { id: "ci-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ci-p-n", opacity: 0.04 });

  return mergeBricks([
    bg,
    sky,
    stars,
    mountains,
    campGround,
    campTrees,
    campfire,
    lanternElems,
    sparks,
    vignette,
    noise,
  ]);
}
