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
  atmosphereBrick,
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  horizonGlowBrick,
  noiseBrick,
  raysBrick,
  shootingStarBrick,
  skyGradientBrick,
  solarCoronaBrick,
  starFieldBrick,
  terrainContourBrick,
  terrainStackBrick,
  treelineBrick,
  vignetteBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function eclipse(params: BrickParams): ComposedWallpaper {
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

/* ── Stillness: Total solar eclipse — dramatic corona above mountain silhouette */
function eclipseStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Corona: placed UPPER-LEFT of center, NOT dead center.
  // High turbulence (0.35) breaks the circular symmetry — avoids "billiard ball."
  // Extent 9 creates dramatic asymmetric streamers, not a round halo.
  const corona = solarCoronaBrick(p, {
    id: "ec-s-co",
    cx: 0.45,
    cy: 0.28,
    moonR: 0.058,
    color: colors.hueOrange,
    innerColor: colors.hueYellow,
    rayCount: 100,
    extent: 9,
    diamondAngleDeg: 42,
    diamondColor: "#fff3c0",
    turbulenceStrength: 0.35,
  });

  // Occluding disk — slightly smaller than moonR to let inner corona peek through edges
  const moon = celestialBrick(p, {
    id: "ec-s-od",
    cx: 0.45,
    cy: 0.28,
    r: 0.057,
    color: "#040406",
    glowColor: colors.hueOrange,
    glowSize: 0,
  });

  const stars = starFieldBrick(p, {
    id: "ec-s-st",
    count: 300,
    brightCount: 16,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.6,
  });

  // Crepuscular rays radiating from the eclipse — dramatic diagonal beams
  const crepRays = raysBrick(p, {
    id: "ec-s-ray",
    cx: 0.45,
    cy: 0.28,
    count: 8,
    length: 0.65,
    color: colors.hueOrange,
    opacity: 0.035,
    spreadDeg: 180,
    startDeg: 170,
  });

  // Strong mountain silhouette below — gives scale and grounding.
  // Mountains start at ~55% height, fill to bottom. The eclipse sits ABOVE them.
  const mountains = terrainContourBrick(p, {
    id: "ec-s-mtn",
    horizonY: 0.55,
    layers: [
      { color: colors.bgMid, opacity: 0.5, edgeBlur: 3 },
      { color: colors.bgSoft, opacity: 0.75 },
      { color: colors.bg, opacity: 0.95 },
    ],
  });

  // Horizon glow behind mountains — eclipse light silhouetting the ridge
  const hGlow = horizonGlowBrick(p, {
    id: "ec-s-hg",
    y: 0.55,
    color: colors.hueOrange,
    opacity: 0.12,
    height: 0.1,
  });

  const meteors = shootingStarBrick(p, {
    id: "ec-s-mt",
    count: 3,
    color: "#ffffff",
    opacity: 0.5,
  });

  // Atmospheric depth
  const atmo = atmosphereBrick(p, {
    id: "ec-s-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueOrange,
    opacity: 0.06,
    lightAzimuth: 210,
    lightElevation: 30,
    seed: 11,
  });

  const vignette = vignetteBrick(p, { id: "ec-s-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ec-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    corona,
    moon,
    stars,
    meteors,
    crepRays,
    hGlow,
    mountains,
    atmo,
    vignette,
    noise,
  ]);
}

/* ── Drift: Diamond ring — partial eclipse with dramatic bead flash ─────────── */
function eclipseDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "45%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Diamond ring: offset upper-right, high turbulence, strong diamond bead
  // The asymmetric diamond bead creates recognizable "ring" shape, not a ball
  const corona = solarCoronaBrick(p, {
    id: "ec-d-co",
    cx: 0.55,
    cy: 0.3,
    moonR: 0.055,
    color: colors.hueOrange,
    innerColor: colors.hueYellow,
    rayCount: 72,
    extent: 6,
    diamondAngleDeg: 28,
    diamondColor: "#ffffff",
    turbulenceStrength: 0.3,
  });

  const eclipseBody = celestialBrick(p, {
    id: "ec-d-od",
    cx: 0.55,
    cy: 0.3,
    r: 0.054,
    color: "#050507",
    glowColor: colors.hueYellow,
    glowSize: 0,
  });

  const stars = starFieldBrick(p, {
    id: "ec-d-st",
    count: 280,
    brightCount: 12,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.55,
  });

  // Rolling hills forming strong landscape foundation — more present than before
  const hills = terrainStackBrick(p, {
    id: "ec-d-hl",
    layers: [
      { baseY: 0.58, roughness: 0.07, color: colors.bgMid, opacity: 0.4 },
      { baseY: 0.68, roughness: 0.055, color: colors.bgSoft, opacity: 0.6 },
      { baseY: 0.78, roughness: 0.04, color: colors.bg, opacity: 0.9 },
    ],
  });

  // Treeline on mid-distance hill — proper scale to hill proportions
  const treeline = treelineBrick(p, {
    id: "ec-d-tl",
    baseY: 0.72,
    count: 30,
    color: colors.bg,
    opacity: 0.7,
    maxHeight: 0.035,
  });

  // Eclipse light on horizon behind hills
  const hGlow = horizonGlowBrick(p, {
    id: "ec-d-hg",
    y: 0.58,
    color: colors.hueOrange,
    opacity: 0.1,
    height: 0.08,
  });

  const meteors = shootingStarBrick(p, {
    id: "ec-d-mt",
    count: 2,
    color: "#ffffff",
    opacity: 0.4,
  });

  // Atmospheric perspective
  const atmo = atmosphereBrick(p, {
    id: "ec-d-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueYellow,
    opacity: 0.06,
    lightAzimuth: 200,
    lightElevation: 25,
    seed: 19,
  });

  const vignette = vignetteBrick(p, { id: "ec-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ec-d-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    corona,
    eclipseBody,
    stars,
    meteors,
    hGlow,
    hills,
    treeline,
    atmo,
    vignette,
    noise,
  ]);
}

/* ── Break: Blood moon — lunar eclipse with penumbral corona bleed ─────────── */
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

  const BLOOD_RED = "#8c1e1e";
  const BLOOD_GLOW = "#c43232";

  // Blood moon: offset left, high turbulence, irregular corona shape
  const bloodCorona = solarCoronaBrick(p, {
    id: "ec-b-co",
    cx: 0.42,
    cy: 0.28,
    moonR: 0.068,
    color: BLOOD_GLOW,
    innerColor: "#e05020",
    rayCount: 70,
    extent: 5,
    diamondAngleDeg: null,
    turbulenceStrength: 0.32,
  });

  const bloodMoon = celestialBrick(p, {
    id: "ec-b-bm",
    cx: 0.42,
    cy: 0.28,
    r: 0.068,
    color: BLOOD_RED,
    glowColor: BLOOD_GLOW,
    glowSize: 1.6,
    glowOpacity: 0.2,
  });

  // Terrain — raised from 0.68 to 0.56
  const terrain = terrainStackBrick(p, {
    id: "ec-b-tr",
    points: 18,
    layers: [
      { baseY: 0.56, roughness: 0.08, color: colors.bgMid, opacity: 0.52 },
      { baseY: 0.65, roughness: 0.06, color: colors.bgSoft, opacity: 0.72 },
      { baseY: 0.74, roughness: 0.04, color: colors.bg, opacity: 0.92 },
    ],
  });

  // Treeline on foreground ridge — proportional to terrain scale
  const treeline = treelineBrick(p, {
    id: "ec-b-tl",
    baseY: 0.70,
    count: 38,
    color: colors.bg,
    opacity: 0.8,
    maxHeight: 0.04,
  });

  const stars = starFieldBrick(p, {
    id: "ec-b-st",
    count: 240,
    brightCount: 14,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.55,
  });

  // Blood moon horizon glow
  const hGlow = horizonGlowBrick(p, {
    id: "ec-b-hg",
    y: 0.56,
    color: BLOOD_GLOW,
    opacity: 0.1,
    height: 0.07,
  });

  const atmo = atmosphereBrick(p, {
    id: "ec-b-atmo",
    color: BLOOD_GLOW,
    highlightColor: "#e06030",
    opacity: 0.07,
    lightAzimuth: 200,
    lightElevation: 30,
    seed: 7,
  });

  const meteors = shootingStarBrick(p, {
    id: "ec-b-mt",
    count: 2,
    color: "#ffcccc",
    opacity: 0.4,
  });

  const vignette = vignetteBrick(p, { id: "ec-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ec-b-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    bloodCorona,
    bloodMoon,
    stars,
    meteors,
    hGlow,
    terrain,
    treeline,
    atmo,
    vignette,
    noise,
  ]);
}

/* ── Void: Total darkness — faint corona whisper at deep totality ─────────── */
function eclipseVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-v-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Near-black corona: offset slightly, high turbulence for organic wispy shape
  const whisperCorona = solarCoronaBrick(p, {
    id: "ec-v-co",
    cx: 0.47,
    cy: 0.35,
    moonR: 0.05,
    color: colors.accentMuted,
    innerColor: colors.accentSoft,
    rayCount: 60,
    extent: 6,
    diamondAngleDeg: null,
    turbulenceStrength: 0.3,
  });

  const eclipseBody = celestialBrick(p, {
    id: "ec-v-od",
    cx: 0.47,
    cy: 0.35,
    r: 0.049,
    color: "#030305",
    glowColor: colors.accentSoft,
    glowSize: 0,
  });

  // Barely visible landscape — raised by 0.2 so it registers
  const horizon = terrainStackBrick(p, {
    id: "ec-v-hz",
    layers: [
      { baseY: 0.65, roughness: 0.04, color: colors.bgSoft, opacity: 0.22 },
      { baseY: 0.75, roughness: 0.03, color: colors.bgMid, opacity: 0.35 },
      { baseY: 0.86, roughness: 0.02, color: colors.bg, opacity: 0.58 },
    ],
  });

  // Faint treeline — shadow shapes in darkness
  const treeline = treelineBrick(p, {
    id: "ec-v-tl",
    baseY: 0.72,
    count: 25,
    color: colors.bg,
    opacity: 0.5,
    maxHeight: 0.05,
  });

  // Eclipse horizon glow
  const hGlow = horizonGlowBrick(p, {
    id: "ec-v-hg",
    y: 0.65,
    color: colors.accentSoft,
    opacity: 0.06,
    height: 0.06,
  });

  const stars = starFieldBrick(p, {
    id: "ec-v-st",
    count: 260,
    brightCount: 12,
    color: "#e8e8f0",
    distribution: "full",
    opacity: 0.55,
  });

  const meteors = shootingStarBrick(p, {
    id: "ec-v-mt",
    count: 2,
    color: "#ffffff",
    opacity: 0.35,
  });

  const vignette = vignetteBrick(p, { id: "ec-v-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ec-v-n", opacity: 0.03 });
  return mergeBricks([
    bg,
    sky,
    whisperCorona,
    eclipseBody,
    stars,
    meteors,
    hGlow,
    horizon,
    treeline,
    vignette,
    noise,
  ]);
}

/* ── Pulse: Eclipse over mountain ridge — crepuscular corona above peaks ───── */
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

  // Full corona above mountain ridge — offset right, high extent for drama
  const corona = solarCoronaBrick(p, {
    id: "ec-p-co",
    cx: 0.55,
    cy: 0.24,
    moonR: 0.052,
    color: colors.hueOrange,
    innerColor: colors.hueYellow,
    rayCount: 88,
    extent: 9,
    diamondAngleDeg: 58,
    diamondColor: "#fff5d0",
    turbulenceStrength: 0.32,
  });

  const eclipseBody = celestialBrick(p, {
    id: "ec-p-od",
    cx: 0.55,
    cy: 0.24,
    r: 0.051,
    color: "#050508",
    glowColor: colors.hueOrange,
    glowSize: 0,
  });

  const hGlow = horizonGlowBrick(p, {
    id: "ec-p-hg",
    y: 0.52,
    color: colors.hueOrange,
    opacity: 0.14,
    height: 0.09,
  });

  const ridge = terrainContourBrick(p, {
    id: "ec-p-rd",
    horizonY: 0.3,
    layers: [
      { color: colors.bgMid, opacity: 0.48, edgeBlur: 4 },
      { color: colors.bgSoft, opacity: 0.65 },
      { color: colors.bg, opacity: 0.85 },
      { color: colors.bg, opacity: 0.96 },
    ],
  });

  // No treeline on km-tall mountains — above treeline altitude

  const stars = starFieldBrick(p, {
    id: "ec-p-st",
    count: 300,
    brightCount: 14,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.6,
  });

  const mist = cloudBandBrick(p, {
    id: "ec-p-mi",
    cy: 0.58,
    bandHeight: 0.1,
    color: colors.bgSoft,
    opacity: 0.08,
    frequency: 0.005,
    seed: 13,
  });

  const meteors = shootingStarBrick(p, {
    id: "ec-p-mt",
    count: 3,
    color: "#ffffff",
    opacity: 0.5,
  });

  const vignette = vignetteBrick(p, { id: "ec-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ec-p-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    corona,
    eclipseBody,
    stars,
    meteors,
    hGlow,
    mist,
    ridge,
    vignette,
    noise,
  ]);
}
