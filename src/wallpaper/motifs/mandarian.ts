/**
 * Mandarian motif — 5 desert and fire night scenes, one per harmony mode.
 *
 * Stillness : Desert dunes under a warm half-moon
 * Drift     : Last light of dusk bleeding over sand
 * Break     : Wildfire ridge — fire glow behind mountain silhouette
 * Void      : Empty dune sea — vast, barely-lit sand
 * Pulse     : Fire dance — ember sparks rising from desert floor
 */
import {
  atmosphereBrick,
  backgroundBrick,
  celestialBrick,
  duneBrick,
  horizonGlowBrick,
  nebulaGlowBrick,
  noiseBrick,
  raysBrick,
  skyGradientBrick,
  smokeRisingBrick,
  sparksBrick,
  starFieldBrick,
  terrainContourBrick,
  treelineBrick,
  vignetteBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function mandarian(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return mandarianDrift(params);
    case "split-complementary":
      return mandarianBreak(params);
    case "monochromatic":
      return mandarianVoid(params);
    case "triadic":
      return mandarianPulse(params);
    default:
      return mandarianStillness(params);
  }
}

/* ── Stillness: Desert moon — crescent over sweeping dunes ──────────────────── */
function mandarianStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mn-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // FOCAL POINT: Large crescent moon high in the sky
  const moon = celestialBrick(p, {
    id: "mn-s-mn",
    cx: 0.62,
    cy: 0.2,
    r: 0.03,
    color: colors.hueYellow,
    glowColor: colors.hueOrange,
    glowSize: 4.5,
    crescent: { offsetX: 0.55, offsetY: -0.2, color: colors.bg },
  });

  // Moonlight beams casting diagonal light onto the desert
  const moonRays = raysBrick(p, {
    id: "mn-s-ray",
    cx: 0.62,
    cy: 0.2,
    count: 5,
    length: 0.5,
    color: colors.hueYellow,
    opacity: 0.05,
    spreadDeg: 100,
    startDeg: 210,
  });

  const stars = starFieldBrick(p, {
    id: "mn-s-st",
    count: 250,
    brightCount: 10,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.5,
  });

  // TWO dune layers only — Bob Ross: fewer dramatic layers, not many flat bands.
  // Far dune: gentle, hazy. Near dune: bold, dark, fills bottom.
  const farDune = duneBrick(p, {
    id: "mn-s-d1",
    baseY: 0.6,
    ridges: 2,
    color: colors.bgMid,
    opacity: 0.4,
  });
  const nearDune = duneBrick(p, {
    id: "mn-s-d2",
    baseY: 0.78,
    ridges: 2,
    color: colors.bg,
    opacity: 0.9,
  });

  // Lone desert tree — vertical silhouette gives human scale reference
  const tree = treelineBrick(p, {
    id: "mn-s-tl",
    baseY: 0.77,
    count: 3,
    color: colors.bg,
    opacity: 0.75,
    maxHeight: 0.06,
  });

  // Atmospheric depth
  const atmo = atmosphereBrick(p, {
    id: "mn-s-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueOrange,
    opacity: 0.06,
    lightAzimuth: 215,
    lightElevation: 25,
    seed: 5,
  });

  const vignette = vignetteBrick(p, { id: "mn-s-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "mn-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    stars,
    moon,
    moonRays,
    farDune,
    nearDune,
    tree,
    atmo,
    vignette,
    noise,
  ]);
}

/* ── Drift: Desert sunset — strong horizon glow with mesa silhouette ─────── */
function mandarianDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Dramatic sunset sky — warm bands concentrated at horizon
  const sky = skyGradientBrick(p, {
    id: "mn-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "60%", color: colors.hueOrange, opacity: 0.12 },
      { offset: "75%", color: colors.hueRed, opacity: 0.08 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // FOCAL POINT: Strong horizon glow — the "setting sun" behind the mesa
  const hGlow = horizonGlowBrick(p, {
    id: "mn-d-hg",
    y: 0.52,
    color: colors.hueOrange,
    opacity: 0.2,
    height: 0.12,
  });

  // Dusk rays from the setting sun — crepuscular diagonals
  const duskRays = raysBrick(p, {
    id: "mn-d-ray",
    cx: 0.35,
    cy: 0.52,
    count: 7,
    length: 0.55,
    color: colors.hueOrange,
    opacity: 0.05,
    spreadDeg: 110,
    startDeg: 230,
  });

  // Mesa silhouette — ONE solid dark shape against the bright horizon
  // This is the RECOGNIZABLE SCENE ELEMENT: flat-topped desert mesa
  const mesa = terrainContourBrick(p, {
    id: "mn-d-mesa",
    horizonY: 0.5,
    layers: [
      { color: colors.bgMid, opacity: 0.5 },
      { color: colors.bg, opacity: 0.95 },
    ],
  });

  // Foreground dune — solid, dark, anchors the bottom
  const dune = duneBrick(p, {
    id: "mn-d-d1",
    baseY: 0.78,
    ridges: 2,
    color: colors.bg,
    opacity: 0.9,
  });

  // Dusk haze — centered above the dune tops (dune1 baseY: 0.55)
  const haze = cloudBandBrick(p, {
    id: "mn-d-hz",
    cy: 0.45,
    bandHeight: 0.12,
    color: colors.hueOrange,
    opacity: 0.08,
    frequency: 0.004,
    seed: 9,
  });

  const hGlow = horizonGlowBrick(p, {
    id: "mn-d-hg",
    y: 0.6,
    color: colors.hueRed,
    opacity: 0.12,
    height: 0.1,
  });

  const stars = starFieldBrick(p, {
    id: "mn-d-st",
    count: 150,
    brightCount: 5,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.25,
  });

  // Heat shimmer rising from hot sand
  const heatSmoke = smokeRisingBrick(p, {
    id: "mn-d-sm",
    sourceY: 0.65,
    riseHeight: 0.25,
    spreadX: 0.6,
    color: colors.hueOrange,
    opacity: 0.05,
    columns: 2,
  });

  // Atmospheric depth
  const atmo = atmosphereBrick(p, {
    id: "mn-d-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueRed,
    opacity: 0.07,
    lightAzimuth: 240,
    lightElevation: 15,
    seed: 13,
  });

  const vignette = vignetteBrick(p, { id: "mn-d-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "mn-d-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    stars,
    hGlow,
    duskRays,
    mesa,
    heatSmoke,
    dune,
    atmo,
    vignette,
    noise,
  ]);
}

/* ── Break: Wildfire — mountain ridge burning against night sky ───────────── */
function mandarianBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Red-tinted sky from fire below
  const sky = skyGradientBrick(p, {
    id: "mn-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "65%", color: colors.hueRed, opacity: 0.1 },
      { offset: "100%", color: colors.bg },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "mn-b-st",
    count: 180,
    brightCount: 5,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.3,
  });

  // FOCAL POINT: Fire glow BEHIND the ridge — illuminates from behind
  const fireGlow = horizonGlowBrick(p, {
    id: "mn-b-fg",
    y: 0.48,
    color: colors.hueOrange,
    opacity: 0.25,
    height: 0.14,
  });

  // Unified mountain ridge — ONE continuous mass filling bottom half
  // The fire glows behind it; smoke rises above it.
  const ridge = terrainContourBrick(p, {
    id: "mn-b-rd",
    horizonY: 0.48,
    layers: [
      { color: colors.bgMid, opacity: 0.65 },
      { color: colors.bg, opacity: 1.0 },
    ],
  });

  // Smoke billowing up from the fire behind the ridge
  const smoke = smokeRisingBrick(p, {
    id: "mn-b-sm",
    sourceY: 0.48,
    riseHeight: 0.4,
    spreadX: 0.7,
    color: "#887070",
    opacity: 0.1,
    columns: 3,
  });

  // Wildfire embers — capped above ridge horizon (horizonY: 0.45)
  const embers = starFieldBrick(p, {
    id: "mn-b-em",
    count: 30,
    brightCount: 8,
    color: colors.hueOrange,
    distribution: "full",
    maxY: 0.43,
    opacity: 0.5,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.35,
  });

  const vignette = vignetteBrick(p, { id: "mn-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mn-b-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, smoke, fireGlow, ridge, sparks, vignette, noise]);
}

/* ── Void: Empty desert night — lone tree under vast sky ─────────────────── */
function mandarianVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Nearly featureless sky — oppressive emptiness
  const sky = skyGradientBrick(p, {
    id: "mn-v-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.2 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Faint stars — vast empty sky is the canvas
  const stars = starFieldBrick(p, {
    id: "mn-v-st",
    count: 200,
    brightCount: 4,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.3,
  });

  // Moon as faint light source — not overpowering, just enough to see
  const moonGlow = nebulaGlowBrick(p, {
    id: "mn-v-mg",
    blur: 0.06,
    blobs: [
      { cx: 0.72, cy: 0.18, rx: 0.04, ry: 0.04, color: colors.bgSoft, opacity: 0.15 },
      { cx: 0.72, cy: 0.18, rx: 0.12, ry: 0.08, color: colors.bgSoft, opacity: 0.06 },
    ],
  });

  // Single dune — the ONLY terrain element. Vast, low, clean horizon line.
  const dune = duneBrick(p, {
    id: "mn-v-dn",
    baseY: 0.72,
    ridges: 2,
    color: colors.bgMid,
    opacity: 0.35,
  });

  // Solid foreground ground plane
  const ground = duneBrick(p, {
    id: "mn-v-gr",
    baseY: 0.85,
    ridges: 1,
    color: colors.bg,
    opacity: 0.8,
  });

  // FOCAL POINT: Single dead tree silhouette — the only vertical element.
  // Gives scale, drama, and narrative to the emptiness.
  const loneTree = treelineBrick(p, {
    id: "mn-v-tl",
    baseY: 0.73,
    count: 1,
    color: colors.bg,
    opacity: 0.6,
    maxHeight: 0.08,
  });

  // Faint moonlight rays from the moon
  const moonRays = raysBrick(p, {
    id: "mn-v-ray",
    cx: 0.72,
    cy: 0.18,
    count: 4,
    length: 0.4,
    color: colors.bgSoft,
    opacity: 0.03,
    spreadDeg: 80,
    startDeg: 220,
  });

  const vignette = vignetteBrick(p, { id: "mn-v-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "mn-v-n", opacity: 0.03 });
  return mergeBricks([bg, sky, stars, moonGlow, moonRays, dune, loneTree, ground, vignette, noise]);
}

/* ── Pulse: Desert campfire — sparks ascending into starry night ─────────── */
function mandarianPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mn-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "45%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "mn-p-st",
    count: 280,
    brightCount: 12,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.5,
  });

  // Distant dune silhouette — just enough to establish "desert" context
  const farDune = duneBrick(p, {
    id: "mn-p-d1",
    baseY: 0.65,
    ridges: 2,
    color: colors.bgMid,
    opacity: 0.35,
  });

  // Foreground ground plane — solid, dark, where the campfire sits
  const ground = duneBrick(p, {
    id: "mn-p-d2",
    baseY: 0.82,
    ridges: 1,
    color: colors.bg,
    opacity: 0.95,
  });

  // FOCAL POINT: campfire glow on the ground
  const fireGlow = nebulaGlowBrick(p, {
    id: "mn-p-fg",
    blur: 0.035,
    blobs: [
      { cx: 0.5, cy: 0.85, rx: 0.05, ry: 0.03, color: colors.hueOrange, opacity: 0.4 },
      { cx: 0.5, cy: 0.85, rx: 0.1, ry: 0.06, color: colors.hueRed, opacity: 0.12 },
    ],
  });

  // Fire dance embers — capped above dunes (dune1 baseY: 0.65)
  const embers = starFieldBrick(p, {
    id: "mn-p-em",
    count: 45,
    brightCount: 10,
    color: colors.hueOrange,
    distribution: "full",
    maxY: 0.62,
    opacity: 0.55,
  });

  // Smoke column rising from fire — gives height and breaks horizontals
  const smoke = smokeRisingBrick(p, {
    id: "mn-p-sm",
    sourceY: 0.82,
    riseHeight: 0.6,
    spreadX: 0.25,
    color: colors.bgMid,
    opacity: 0.07,
    columns: 1,
  });

  const vignette = vignetteBrick(p, { id: "mn-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "mn-p-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, farDune, ground, fireGlow, smoke, sparks, vignette, noise]);
}
