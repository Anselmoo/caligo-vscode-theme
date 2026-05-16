/**
 * MidnightAtelier motif — 5 studio / material / art night scenes.
 *
 * Stillness : Moonlit studio window — view of rooftops and sky
 * Drift     : Ink wash — brushstroke sweeping across wet paper
 * Break     : Fractured canvas — angular shards of night light
 * Void      : Charcoal cave — single form barely emerging
 * Pulse     : Stained glass — moonlight through cathedral window
 */
import {
  atmosphereBrick,
  backgroundBrick,
  brushStrokeBrick,
  celestialBrick,
  cityscapeBrick,
  cloudBandBrick,
  horizonGlowBrick,
  nebulaGlowBrick,
  noiseBrick,
  raysBrick,
  shootingStarBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainStackBrick,
  toneCurveBrick,
  vignetteBrick,
  voronoiBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function midnightAtelier(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return midnightDrift(params);
    case "split-complementary":
      return midnightBreak(params);
    case "monochromatic":
      return midnightVoid(params);
    case "triadic":
      return midnightPulse(params);
    default:
      return midnightStillness(params);
  }
}

/* ── Stillness: Moonlit studio — rooftops through window ──────────────────── */
function midnightStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mi-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "35%", color: colors.bgSoft },
      { offset: "60%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Crescent moon in upper corner
  const moon = celestialBrick(p, {
    id: "mi-s-mn",
    cx: 0.72,
    cy: 0.18,
    r: 0.025,
    color: colors.bgSoft,
    glowColor: colors.hueYellow,
    glowSize: 3.5,
    crescent: { offsetX: 0.6, offsetY: -0.18, color: colors.bg },
  });

  // Warm interior glow — from a lamp
  const lampGlow = nebulaGlowBrick(p, {
    id: "mi-s-lg",
    blur: 0.06,
    blobs: [{ cx: 0.5, cy: 0.5, rx: 0.15, ry: 0.12, color: colors.hueOrange, opacity: 0.12 }],
  });

  // Rooftop silhouettes — grounded in lower third
  const rooftops = cityscapeBrick(p, {
    id: "mi-s-rt",
    baseY: 0.74,
    heightRange: [0.1, 0.28],
    density: 10,
    color: colors.bg,
    opacity: 0.85,
    hasWindows: true,
    windowProbability: 0.08,
    windowColor: p.colors.bgSoft,
  });

  // City light glow at horizon
  const hGlow = horizonGlowBrick(p, {
    id: "mi-s-hg",
    y: 0.76,
    color: colors.hueOrange,
    opacity: 0.08,
    height: 0.06,
  });

  const stars = starFieldBrick(p, {
    id: "mi-s-st",
    count: 230,
    brightCount: 7,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.4,
  });

  const meteors = shootingStarBrick(p, {
    id: "mi-s-mt",
    count: 1,
    color: "#ffffff",
    opacity: 0.35,
  });

  // Moonlight rays — diagonal beams from moon across sky
  const moonRays = raysBrick(p, {
    id: "mi-s-ray",
    cx: 0.72,
    cy: 0.18,
    count: 5,
    length: 0.4,
    color: colors.hueYellow,
    opacity: 0.04,
    spreadDeg: 100,
    startDeg: 200,
  });

  // Atmospheric haze above rooftops
  const atmo = atmosphereBrick(p, {
    id: "mi-s-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueYellow,
    opacity: 0.06,
    lightAzimuth: 220,
    lightElevation: 25,
    seed: 7,
  });

  const vignette = vignetteBrick(p, { id: "mi-s-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "mi-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    stars,
    meteors,
    moon,
    moonRays,
    lampGlow,
    hGlow,
    rooftops,
    atmo,
    vignette,
    noise,
  ]);
}

/* ── Drift: Ink wash — sweeping brushstroke on wet paper ──────────────────── */
function midnightDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Paper texture — warm subtle gradient
  const paper = skyGradientBrick(p, {
    id: "mi-d-pap",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.3 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Ink wash — using terrain-like Bézier shapes as brush strokes
  const stroke = terrainStackBrick(p, {
    id: "mi-d-str",
    points: 20,
    layers: [
      { baseY: 0.35, roughness: 0.15, color: colors.accent, opacity: 0.3 },
      { baseY: 0.45, roughness: 0.12, color: colors.accentSoft, opacity: 0.2 },
      { baseY: 0.55, roughness: 0.1, color: colors.accentMuted, opacity: 0.12 },
    ],
  });

  // Ink bloom — radial glow where brush lands
  const bloom = nebulaGlowBrick(p, {
    id: "mi-d-bl",
    blur: 0.05,
    blobs: [{ cx: 0.7, cy: 0.5, rx: 0.12, ry: 0.08, color: colors.accent, opacity: 0.15 }],
  });

  // Ink splatters — sparse dots
  const splatters = starFieldBrick(p, {
    id: "mi-d-sp",
    count: 25,
    brightCount: 5,
    color: colors.accentMuted,
    distribution: "full",
    opacity: 0.3,
  });

  // Paper grain
  const grain = cloudBandBrick(p, {
    id: "mi-d-gr",
    cy: 0.5,
    bandHeight: 0.8,
    color: colors.bgSoft,
    opacity: 0.04,
    frequency: 0.02,
    seed: 23,
  });

  // Additional brush strokes for layered ink wash depth
  const brushA = brushStrokeBrick(p, {
    id: "mi-d-bsa",
    color: colors.accent,
    opacity: 0.18,
    x1: 0.05,
    y1: 0.42,
    x2: 0.65,
    y2: 0.38,
    strokeWidth: 60,
    roughness: 0.12,
  });
  const brushB = brushStrokeBrick(p, {
    id: "mi-d-bsb",
    color: colors.accentMuted,
    opacity: 0.1,
    x1: 0.3,
    y1: 0.55,
    x2: 0.95,
    y2: 0.52,
    strokeWidth: 45,
    roughness: 0.08,
  });

  const vignette = vignetteBrick(p, { id: "mi-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mi-d-n", baseFrequency: 0.85, opacity: 0.05 });
  return mergeBricks([bg, paper, grain, bloom, stroke, brushA, brushB, splatters, vignette, noise]);
}

/* ── Break: Fractured canvas — angular night light ────────────────────────── */
function midnightBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Multi-layer angular terrain creating shard-like shapes
  const sky = skyGradientBrick(p, {
    id: "mi-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Shard layers — sharp angular terrain at different heights
  const shards = voronoiBrick(p, {
    id: "mi-b-shards",
    points: 15,
    color: colors.bgSoft,
    opacity: 0.25,
    fillOpacity: 0.02,
    mode: "voronoi",
    relaxIterations: 1,
  });

  const crackLight = nebulaGlowBrick(p, {
    id: "mi-b-cl",
    blur: 0.03,
    blobs: [
      { cx: 0.3, cy: 0.35, rx: 0.02, ry: 0.08, color: colors.accent, opacity: 0.3 },
      { cx: 0.55, cy: 0.5, rx: 0.015, ry: 0.1, color: colors.accentSoft, opacity: 0.25 },
      { cx: 0.75, cy: 0.3, rx: 0.02, ry: 0.06, color: colors.accent, opacity: 0.2 },
    ],
  });

  // Scattered fragments of light visible through the fractures
  const fragments = starFieldBrick(p, {
    id: "mi-b-fr",
    count: 18,
    brightCount: 3,
    color: colors.accentSoft,
    distribution: "full",
    opacity: 0.25,
  });

  // Light rays piercing through fracture lines
  const crackRays = raysBrick(p, {
    id: "mi-b-cr",
    cx: 0.3,
    cy: 0.35,
    count: 5,
    spreadDeg: 60,
    startDeg: 60,
    length: 0.4,
    color: colors.accent,
    opacity: 0.08,
  });
  const crackRays2 = raysBrick(p, {
    id: "mi-b-cr2",
    cx: 0.75,
    cy: 0.3,
    count: 4,
    spreadDeg: 50,
    startDeg: 80,
    length: 0.35,
    color: colors.accentSoft,
    opacity: 0.06,
  });

  const vignette = vignetteBrick(p, { id: "mi-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mi-b-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    shards,
    crackLight,
    crackRays,
    crackRays2,
    fragments,
    vignette,
    noise,
  ]);
}

/* ── Void: Charcoal cave — single form in darkness ────────────────────────── */
function midnightVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const dark = skyGradientBrick(p, {
    id: "mi-v-dk",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.2 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Single emerging form — charcoal ridge visible in darkness (lower half)
  const form = terrainStackBrick(p, {
    id: "mi-v-fm",
    points: 14,
    layers: [
      { baseY: 0.62, roughness: 0.07, color: colors.bgSoft, opacity: 0.18 },
      { baseY: 0.7, roughness: 0.05, color: colors.bgMid, opacity: 0.32 },
    ],
  });

  // Faint haze pooling over the ridge
  const haze = cloudBandBrick(p, {
    id: "mi-v-hz",
    cy: 0.55,
    bandHeight: 0.2,
    color: colors.bgSoft,
    opacity: 0.07,
    frequency: 0.003,
    seed: 47,
  });

  // Ambient glow — single distant light source visible through darkness
  const glow = nebulaGlowBrick(p, {
    id: "mi-v-gl",
    blur: 0.05,
    blobs: [
      { cx: 0.5, cy: 0.38, rx: 0.08, ry: 0.08, color: colors.accentSoft, opacity: 0.1 },
      { cx: 0.5, cy: 0.38, rx: 0.2, ry: 0.12, color: colors.bgSoft, opacity: 0.06 },
      { cx: 0.3, cy: 0.45, rx: 0.04, ry: 0.04, color: colors.accentMuted, opacity: 0.07 },
      { cx: 0.7, cy: 0.42, rx: 0.04, ry: 0.04, color: colors.accentMuted, opacity: 0.06 },
      { cx: 0.18, cy: 0.3, rx: 0.03, ry: 0.03, color: colors.accentSoft, opacity: 0.05 },
      { cx: 0.82, cy: 0.35, rx: 0.03, ry: 0.03, color: colors.accentSoft, opacity: 0.05 },
      { cx: 0.45, cy: 0.62, rx: 0.05, ry: 0.04, color: colors.accentMuted, opacity: 0.05 },
      { cx: 0.62, cy: 0.6, rx: 0.04, ry: 0.04, color: colors.accentMuted, opacity: 0.04 },
      { cx: 0.25, cy: 0.7, rx: 0.03, ry: 0.03, color: colors.bgMid, opacity: 0.08 },
      { cx: 0.75, cy: 0.68, rx: 0.03, ry: 0.03, color: colors.bgMid, opacity: 0.07 },
    ],
  });

  const charcoalAtmo = atmosphereBrick(p, {
    id: "mi-v-atmo",
    color: colors.bgSoft,
    highlightColor: colors.accentMuted,
    opacity: 0.06,
    lightAzimuth: 220,
    lightElevation: 20,
    seed: 31,
  });

  const tone = toneCurveBrick(p, { id: "mi-v-tone", preset: "cinematic", opacity: 0.25 });
  const vignette = vignetteBrick(p, { id: "mi-v-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "mi-v-n", opacity: 0.04 });
  return mergeBricks([bg, dark, glow, haze, form, charcoalAtmo, tone, vignette, noise]);
}

/* ── Pulse: Stained glass — moonlight through cathedral ───────────────────── */
function midnightPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mi-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "45%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Colored light panels — nebula glows simulating stained glass light
  const glass = nebulaGlowBrick(p, {
    id: "mi-p-gl",
    blur: 0.04,
    blobs: [
      { cx: 0.15, cy: 0.2, rx: 0.1, ry: 0.15, color: colors.accent, opacity: 0.22 },
      { cx: 0.4, cy: 0.3, rx: 0.12, ry: 0.18, color: colors.hueBlue, opacity: 0.16 },
      { cx: 0.65, cy: 0.2, rx: 0.1, ry: 0.15, color: colors.huePurple, opacity: 0.18 },
      { cx: 0.85, cy: 0.35, rx: 0.08, ry: 0.12, color: colors.hueGreen, opacity: 0.14 },
      { cx: 0.3, cy: 0.6, rx: 0.12, ry: 0.15, color: colors.hueCyan, opacity: 0.16 },
      { cx: 0.55, cy: 0.55, rx: 0.1, ry: 0.15, color: colors.accent, opacity: 0.18 },
      { cx: 0.78, cy: 0.6, rx: 0.08, ry: 0.12, color: colors.hueBlue, opacity: 0.14 },
      { cx: 0.22, cy: 0.48, rx: 0.06, ry: 0.08, color: colors.hueOrange, opacity: 0.1 },
      { cx: 0.72, cy: 0.42, rx: 0.06, ry: 0.08, color: colors.hueCyan, opacity: 0.1 },
      { cx: 0.5, cy: 0.12, rx: 0.18, ry: 0.12, color: colors.bgSoft, opacity: 0.08 },
    ],
  });

  // Moonlight beam — top-down soft glow
  const moonbeam = nebulaGlowBrick(p, {
    id: "mi-p-mb",
    blur: 0.06,
    blobs: [{ cx: 0.5, cy: 0.0, rx: 0.3, ry: 0.5, color: "#ffffff", opacity: 0.06 }],
  });

  // Floor silhouette
  const floor = terrainStackBrick(p, {
    id: "mi-p-fl",
    points: 10,
    layers: [{ baseY: 0.82, roughness: 0.02, color: colors.bg, opacity: 0.9 }],
  });

  // Cathedral light beams descending from window
  const cathedralBeams = raysBrick(p, {
    id: "mi-p-cb",
    cx: 0.5,
    cy: 0.0,
    count: 8,
    spreadDeg: 60,
    startDeg: 60,
    length: 0.9,
    color: "#ffffff",
    opacity: 0.03,
  });

  const vignette = vignetteBrick(p, { id: "mi-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "mi-p-n", opacity: 0.04 });
  return mergeBricks([bg, sky, moonbeam, cathedralBeams, glass, floor, vignette, noise]);
}
