/**
 * ObsidianGlow motif — 5 volcanic and mineral night scenes.
 *
 * Stillness : Obsidian volcanic plain under full moon
 * Drift     : Glacial ice strata reflecting cold moonlight
 * Break     : Geothermal vent erupting at night
 * Void      : Crystal cave — single distant light source
 * Pulse     : Mountain peak mirrored in obsidian lake
 */
import {
  atmosphereBrick,
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  horizonGlowBrick,
  nebulaGlowBrick,
  noiseBrick,
  ridgeHighlightBrick,
  shootingStarBrick,
  skyGradientBrick,
  sparksBrick,
  starFieldBrick,
  terrainContourBrick,
  terrainStackBrick,
  vignetteBrick,
  volcanoBrick,
  waterReflectionBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function obsidianGlow(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return obsidianDrift(params);
    case "split-complementary":
      return obsidianBreak(params);
    case "monochromatic":
      return obsidianVoid(params);
    case "triadic":
      return obsidianPulse(params);
    default:
      return obsidianStillness(params);
  }
}

/* ── Stillness: Obsidian plain under full moon ────────────────────────────── */
function obsidianStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "og-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "35%", color: colors.bgSoft },
      { offset: "60%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Gibbous moon — crescent shadow offset to give natural lit phase
  const moon = celestialBrick(p, {
    id: "og-s-mn",
    cx: 0.5,
    cy: 0.25,
    r: 0.028,
    color: "#c8d0e0",
    glowColor: colors.hueCyan,
    glowSize: 4.5,
    crescent: { offsetX: 0.6, offsetY: -0.25, color: colors.bg },
  });

  // Volcanic plain — natural contour terrain
  const terrain = terrainContourBrick(p, {
    id: "og-s-tr",
    horizonY: 0.29,
    layers: [
      { color: colors.bgMid, opacity: 0.62, edgeBlur: 3 },
      { color: colors.bgSoft, opacity: 0.72 },
      { color: colors.bg, opacity: 0.92 },
    ],
  });

  // Moonlight reflection on glassy obsidian floor
  const reflection = nebulaGlowBrick(p, {
    id: "og-s-ref",
    blur: 0.04,
    blobs: [{ cx: 0.5, cy: 0.85, rx: 0.15, ry: 0.06, color: colors.hueCyan, opacity: 0.08 }],
  });

  // Horizon glow from volcanic activity
  const hGlow = horizonGlowBrick(p, {
    id: "og-s-hg",
    y: 0.6,
    color: colors.hueOrange,
    opacity: 0.06,
    height: 0.05,
  });

  const stars = starFieldBrick(p, {
    id: "og-s-st",
    count: 260,
    brightCount: 10,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.5,
  });

  // Moonlight edge highlight on obsidian ridge
  const ridgeHL = ridgeHighlightBrick(p, {
    id: "og-s-rhl",
    baseY: 0.29,
    roughness: 0.05,
    points: 20,
    color: colors.hueCyan,
    opacity: 0.2,
    glowPx: 8,
  });

  const meteor = shootingStarBrick(p, {
    id: "og-s-mt",
    count: 1,
    color: "#ffffff",
    opacity: 0.4,
  });

  const vignette = vignetteBrick(p, { id: "og-s-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "og-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    stars,
    meteor,
    moon,
    hGlow,
    terrain,
    ridgeHL,
    reflection,
    vignette,
    noise,
  ]);
}

/* ── Drift: Glacial ice strata ────────────────────────────────────────────── */
function obsidianDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "og-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "60%", color: colors.hueCyan, opacity: 0.08 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Glacial ice layers — terrain stacks at shallow angles
  const ice = terrainStackBrick(p, {
    id: "og-d-ice",
    points: 20,
    layers: [
      { baseY: 0.52, roughness: 0.03, color: colors.hueCyan, opacity: 0.1 },
      { baseY: 0.6, roughness: 0.025, color: colors.hueBlue, opacity: 0.08 },
      { baseY: 0.68, roughness: 0.03, color: colors.hueCyan, opacity: 0.06 },
      { baseY: 0.76, roughness: 0.02, color: colors.hueBlue, opacity: 0.05 },
    ],
  });

  // Crystal refraction texture
  const crystals = cloudBandBrick(p, {
    id: "og-d-cr",
    cy: 0.45,
    bandHeight: 0.2,
    color: colors.hueCyan,
    opacity: 0.06,
    frequency: 0.008,
    seed: 31,
  });

  // Dark moraine foreground
  const moraine = terrainStackBrick(p, {
    id: "og-d-mo",
    points: 14,
    layers: [{ baseY: 0.72, roughness: 0.04, color: colors.bg, opacity: 0.92 }],
  });

  const stars = starFieldBrick(p, {
    id: "og-d-st",
    count: 240,
    brightCount: 8,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.4,
  });

  // Cold blue ridge highlight on upper ice strata edge
  const iceHL = ridgeHighlightBrick(p, {
    id: "og-d-rhl",
    baseY: 0.52,
    roughness: 0.03,
    points: 20,
    color: colors.hueCyan,
    opacity: 0.22,
    glowPx: 6,
  });

  const vignette = vignetteBrick(p, { id: "og-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "og-d-n", opacity: 0.04 });
  return mergeBricks([bg, sky, crystals, ice, iceHL, stars, moraine, vignette, noise]);
}

/* ── Break: Geothermal vent erupting ──────────────────────────────────────── */
function obsidianBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "og-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "70%", color: colors.hueOrange, opacity: 0.1 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Volcanic cone
  const volcano = volcanoBrick(p, {
    id: "og-b-vc",
    cx: 0.5,
    baseY: 0.75,
    peakHeight: 0.35,
    craterWidth: 0.03,
    color: colors.bgMid,
    lavaColor: colors.hueOrange,
  });

  // Lava glow at vent
  const lavaGlow = nebulaGlowBrick(p, {
    id: "og-b-lg",
    blur: 0.05,
    blobs: [
      { cx: 0.5, cy: 0.42, rx: 0.05, ry: 0.04, color: colors.hueOrange, opacity: 0.4 },
      { cx: 0.5, cy: 0.42, rx: 0.12, ry: 0.08, color: colors.hueRed, opacity: 0.15 },
    ],
  });

  // Steam and ash cloud
  const steam = cloudBandBrick(p, {
    id: "og-b-st",
    cy: 0.2,
    bandHeight: 0.2,
    color: colors.bgSoft,
    opacity: 0.07,
    frequency: 0.006,
    seed: 13,
  });

  // Eruption embers — capped above volcano base (baseY: 0.75, peak at 0.40)
  const embers = starFieldBrick(p, {
    id: "og-b-em",
    count: 35,
    brightCount: 10,
    color: colors.hueOrange,
    distribution: "full",
    maxY: 0.38,
    opacity: 0.5,
  });

  const stars = starFieldBrick(p, {
    id: "og-b-stars",
    count: 230,
    brightCount: 8,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.35,
  });

  const volcanoSparks = sparksBrick(p, {
    id: "og-b-sp",
    count: 40,
    color: colors.hueOrange,
    opacity: 0.65,
    direction: 1,
    sourceCx: 0.5,
    sourceSpread: 0.08,
  });

  const vignette = vignetteBrick(p, { id: "og-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "og-b-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    stars,
    lavaGlow,
    steam,
    volcano,
    embers,
    volcanoSparks,
    vignette,
    noise,
  ]);
}

/* ── Void: Crystal cave — single distant light ────────────────────────────── */
function obsidianVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const dark = skyGradientBrick(p, {
    id: "og-v-dk",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.15 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Cave walls — converging terrain layers from sides
  const wallL = terrainStackBrick(p, {
    id: "og-v-wl",
    points: 12,
    layers: [{ baseY: 0.2, roughness: 0.08, color: colors.bgMid, opacity: 0.4 }],
  });
  const wallR = terrainStackBrick(p, {
    id: "og-v-wr",
    points: 12,
    layers: [{ baseY: 0.3, roughness: 0.06, color: colors.bgMid, opacity: 0.35 }],
  });

  // Distant light at tunnel end + scattered bioluminescent spots on cave walls
  const light = nebulaGlowBrick(p, {
    id: "og-v-li",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.48, rx: 0.025, ry: 0.025, color: colors.hueCyan, opacity: 0.6 },
      { cx: 0.5, cy: 0.48, rx: 0.08, ry: 0.07, color: colors.accent, opacity: 0.12 },
      { cx: 0.5, cy: 0.48, rx: 0.18, ry: 0.14, color: colors.accentSoft, opacity: 0.05 },
      { cx: 0.22, cy: 0.55, rx: 0.015, ry: 0.015, color: colors.hueCyan, opacity: 0.25 },
      { cx: 0.35, cy: 0.38, rx: 0.012, ry: 0.012, color: colors.hueCyan, opacity: 0.2 },
      { cx: 0.65, cy: 0.42, rx: 0.012, ry: 0.012, color: colors.accent, opacity: 0.2 },
      { cx: 0.78, cy: 0.58, rx: 0.015, ry: 0.015, color: colors.hueCyan, opacity: 0.18 },
      { cx: 0.15, cy: 0.7, rx: 0.01, ry: 0.01, color: colors.accentSoft, opacity: 0.15 },
      { cx: 0.6, cy: 0.65, rx: 0.01, ry: 0.01, color: colors.hueCyan, opacity: 0.12 },
      { cx: 0.88, cy: 0.45, rx: 0.012, ry: 0.012, color: colors.accentMuted, opacity: 0.1 },
    ],
  });

  const caveAtmo = atmosphereBrick(p, {
    id: "og-v-atmo",
    color: colors.bgSoft,
    highlightColor: colors.hueCyan,
    opacity: 0.07,
    lightAzimuth: 180,
    lightElevation: 15,
    seed: 53,
  });

  const vignette = vignetteBrick(p, { id: "og-v-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "og-v-n", opacity: 0.04 });
  return mergeBricks([bg, dark, wallL, wallR, light, caveAtmo, vignette, noise]);
}

/* ── Pulse: Mountain peak mirrored in obsidian lake ───────────────────────── */
function obsidianPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "og-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "48%", color: colors.bgMid },
      { offset: "52%", color: colors.bgMid },
      { offset: "70%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Mountain peaks above waterline
  const peaks = terrainContourBrick(p, {
    id: "og-p-tc-pk",
    horizonY: 0.04,
    layers: [
      { color: colors.bgMid, opacity: 0.52, edgeBlur: 3 },
      { color: colors.bgSoft, opacity: 0.68 },
      { color: colors.bg, opacity: 0.88 },
    ],
  });

  // Crescent moon above peaks
  const moon = celestialBrick(p, {
    id: "og-p-mn",
    cx: 0.5,
    cy: 0.15,
    r: 0.028,
    color: "#c8d0e0",
    glowColor: colors.hueCyan,
    glowSize: 4.0,
    crescent: { offsetX: 0.58, offsetY: -0.2, color: colors.bg },
  });

  // Lake reflection — water surface with ripple
  const lake = waterReflectionBrick(p, {
    id: "og-p-lk",
    waterY: 0.5,
    color: colors.bgSoft,
    opacity: 0.08,
    rippleScale: 6,
    rippleFrequency: 0.02,
  });

  // Moon reflection in water
  const moonRefl = nebulaGlowBrick(p, {
    id: "og-p-mr",
    blur: 0.03,
    blobs: [{ cx: 0.5, cy: 0.85, rx: 0.04, ry: 0.02, color: colors.bgSoft, opacity: 0.2 }],
  });

  const stars = starFieldBrick(p, {
    id: "og-p-st",
    count: 250,
    brightCount: 9,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.45,
  });

  // Moonlit ridge glow on peak edges
  const peakHL = ridgeHighlightBrick(p, {
    id: "og-p-rhl",
    baseY: 0.04,
    roughness: 0.05,
    points: 20,
    color: colors.hueCyan,
    opacity: 0.18,
    glowPx: 10,
  });

  const pulseMetor = shootingStarBrick(p, {
    id: "og-p-mt",
    count: 1,
    color: "#ffffff",
    opacity: 0.35,
  });

  const vignette = vignetteBrick(p, { id: "og-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "og-p-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    sky,
    stars,
    pulseMetor,
    moon,
    peaks,
    peakHL,
    lake,
    moonRefl,
    vignette,
    noise,
  ]);
}
