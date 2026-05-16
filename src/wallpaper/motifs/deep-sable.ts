/**
 * DeepSable motif — 5 deep ocean night scenes.
 *
 * Stillness : Hydrothermal vent column rising from abyssal plain
 * Drift     : Deep current — pressure bands with bioluminescent trail
 * Break     : Surface burst — looking up from deep water at night sky
 * Void      : Total abyss — single distant bioluminescent point
 * Pulse     : Coral reef bioluminescence with rhythmic rings
 */
import {
  atmosphereBrick,
  backgroundBrick,
  cloudBandBrick,
  nebulaGlowBrick,
  noiseBrick,
  raysBrick,
  shootingStarBrick,
  skyGradientBrick,
  smokeRisingBrick,
  starFieldBrick,
  terrainStackBrick,
  vignetteBrick,
  waterCurrentBrick,
  waterReflectionBrick,
} from "../bricks/index.js";
import { mergeBricks } from "../composer.js";
import type { BrickParams, ComposedWallpaper } from "../types.js";

export function deepSable(params: BrickParams): ComposedWallpaper {
  switch (params.harmonyMode) {
    case "analogous":
      return deepDrift(params);
    case "split-complementary":
      return deepBreak(params);
    case "monochromatic":
      return deepVoid(params);
    case "triadic":
      return deepPulse(params);
    default:
      return deepStillness(params);
  }
}

/* ── Stillness: Hydrothermal vent column — abyssal plain ─────────────────── */
function deepStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Deep ocean water column — dark blue gradient, lighter near surface
  const abyss = skyGradientBrick(p, {
    id: "ds-s-aby",
    stops: [
      { offset: "0%", color: colors.bgSoft, opacity: 0.6 },
      { offset: "25%", color: colors.bgMid, opacity: 0.4 },
      { offset: "60%", color: colors.bg },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Downwelling light rays from the surface — dim shafts of light in deep water
  const lightRays = raysBrick(p, {
    id: "ds-s-ray",
    cx: 0.45,
    cy: -0.1,
    color: colors.hueCyan,
    opacity: 0.06,
    count: 8,
    spreadDeg: 90,
  });

  // Marine snow — drifting micro-particles suspended in water column
  const marineSnow = starFieldBrick(p, {
    id: "ds-s-sn",
    count: 180,
    brightCount: 0,
    color: colors.hueCyan,
    distribution: "full",
    opacity: 0.35,
  });

  // Deep pressure currents — volumetric horizontal flow through mid-water
  const currents = waterCurrentBrick(p, {
    id: "ds-s-cu",
    cy: 0.45,
    zoneHeight: 0.55,
    color: colors.hueCyan,
    opacity: 0.20,
    layers: 3,
  });

  // Hydrothermal vent plumes — rising superheated mineral columns
  const ventPlume = smokeRisingBrick(p, {
    id: "ds-s-vp",
    sourceY: 0.82,
    riseHeight: 0.55,
    spreadX: 0.18,
    color: colors.bgSoft,
    opacity: 0.28,
    columns: 2,
  });

  // Vent heat shimmer — warm glow at vent base
  const ventGlow = nebulaGlowBrick(p, {
    id: "ds-s-vg",
    blur: 0.04,
    blobs: [
      { cx: 0.42, cy: 0.83, rx: 0.06, ry: 0.03, color: colors.accent, opacity: 0.35 },
      { cx: 0.56, cy: 0.85, rx: 0.04, ry: 0.02, color: colors.hueCyan, opacity: 0.25 },
    ],
  });

  // Bioluminescent patches in the water column — glowing minerals/plankton
  const bioPatches = nebulaGlowBrick(p, {
    id: "ds-s-bio",
    blur: 0.035,
    blobs: [
      { cx: 0.15, cy: 0.3, rx: 0.05, ry: 0.02, color: colors.hueCyan, opacity: 0.18 },
      { cx: 0.78, cy: 0.42, rx: 0.04, ry: 0.015, color: colors.accent, opacity: 0.15 },
      { cx: 0.35, cy: 0.58, rx: 0.03, ry: 0.012, color: colors.hueBlue, opacity: 0.12 },
    ],
  });

  // Abyssal plain — jagged volcanic rock formations at ocean floor
  const floor = terrainStackBrick(p, {
    id: "ds-s-fl",
    layers: [
      { baseY: 0.75, roughness: 0.08, color: colors.bgMid, opacity: 0.55 },
      { baseY: 0.82, roughness: 0.07, color: colors.bgSoft, opacity: 0.72 },
      { baseY: 0.89, roughness: 0.05, color: colors.bg, opacity: 0.90 },
      { baseY: 0.95, roughness: 0.03, color: colors.bg, opacity: 1.0 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ds-s-vig", opacity: 0.7 });
  const noise = noiseBrick(p, { id: "ds-s-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    abyss,
    lightRays,
    currents,
    marineSnow,
    ventPlume,
    ventGlow,
    bioPatches,
    floor,
    vignette,
    noise,
  ]);
}

/* ── Drift: Deep current — pressure bands ─────────────────────────────────── */
function deepDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const waterGrad = skyGradientBrick(p, {
    id: "ds-d-wg",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "30%", color: colors.bgSoft },
      { offset: "60%", color: colors.hueBlue, opacity: 0.15 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Deep pressure currents — volumetric horizontal flow filling the water column
  const currents = waterCurrentBrick(p, {
    id: "ds-d-cu",
    cy: 0.5,
    zoneHeight: 0.9,
    color: colors.hueCyan,
    opacity: 0.22,
    layers: 4,
  });

  // Bioluminescent drift trail — glowing particles in current
  const trail = nebulaGlowBrick(p, {
    id: "ds-d-tr",
    blur: 0.04,
    blobs: [
      { cx: 0.2, cy: 0.3, rx: 0.08, ry: 0.02, color: colors.hueCyan, opacity: 0.3 },
      { cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.025, color: colors.accent, opacity: 0.25 },
      { cx: 0.8, cy: 0.7, rx: 0.07, ry: 0.02, color: colors.hueCyan, opacity: 0.22 },
    ],
  });

  const particles = starFieldBrick(p, {
    id: "ds-d-p",
    count: 50,
    brightCount: 4,
    color: colors.hueCyan,
    distribution: "full",
    opacity: 0.45,
  });

  // Seafloor ridges at varying depths
  const ridges = terrainStackBrick(p, {
    id: "ds-d-rd",
    layers: [
      { baseY: 0.74, roughness: 0.06, color: colors.bgMid, opacity: 0.55 },
      { baseY: 0.82, roughness: 0.05, color: colors.bgSoft, opacity: 0.72 },
      { baseY: 0.9, roughness: 0.04, color: colors.bg, opacity: 0.88 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ds-d-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ds-d-n", opacity: 0.04 });
  return mergeBricks([bg, waterGrad, currents, trail, particles, ridges, vignette, noise]);
}

/* ── Break: Surface burst — looking up from deep water at moon above ──────── */
function deepBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Clear two-zone split: DARK deep water below, LIGHTER sky above surface line
  // The surface at ~40% creates a clear composition boundary
  const split = skyGradientBrick(p, {
    id: "ds-b-sp",
    stops: [
      { offset: "0%", color: colors.bgSoft, opacity: 0.5 },
      { offset: "35%", color: colors.bgMid, opacity: 0.3 },
      { offset: "40%", color: colors.hueBlue, opacity: 0.2 },
      { offset: "45%", color: colors.bg },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Stars visible in sky above water — the "night sky" portion
  const stars = starFieldBrick(p, {
    id: "ds-b-st",
    count: 250,
    brightCount: 10,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.5,
  });

  // Shooting star in sky above
  const meteor = shootingStarBrick(p, {
    id: "ds-b-mt",
    count: 2,
    color: "#ffffff",
    opacity: 0.35,
  });

  // Surface tension line — CLEAR visual boundary at waterline.
  // The waterReflectionBrick gives ripples that define "this is a surface"
  const surface = waterReflectionBrick(p, {
    id: "ds-b-sf",
    waterY: 0.4,
    color: colors.hueBlue,
    opacity: 0.12,
    rippleScale: 14,
    rippleFrequency: 0.018,
  });

  // Caustic light patterns just below surface — dappled sunlight/moonlight
  const caustics = cloudBandBrick(p, {
    id: "ds-b-ca",
    cy: 0.45,
    bandHeight: 0.1,
    color: colors.hueCyan,
    opacity: 0.1,
    frequency: 0.012,
    seed: 7,
  });

  // Light rays shafting down from surface — the FOCAL POINT
  // Diagonal beams penetrating into the deep = depth + perspective
  const lightShafts = raysBrick(p, {
    id: "ds-b-ray",
    cx: 0.45,
    cy: 0.4,
    count: 5,
    length: 0.45,
    color: colors.hueCyan,
    opacity: 0.06,
    spreadDeg: 70,
    startDeg: 250,
  });

  // Rising bubbles ascending toward surface — gives vertical movement
  const bubbles = nebulaGlowBrick(p, {
    id: "ds-b-bu",
    blur: 0.015,
    blobs: [
      { cx: 0.4, cy: 0.55, rx: 0.008, ry: 0.008, color: colors.accentSoft, opacity: 0.35 },
      { cx: 0.45, cy: 0.65, rx: 0.01, ry: 0.01, color: colors.hueCyan, opacity: 0.3 },
      { cx: 0.42, cy: 0.75, rx: 0.012, ry: 0.012, color: colors.hueCyan, opacity: 0.25 },
      { cx: 0.48, cy: 0.85, rx: 0.007, ry: 0.007, color: colors.accent, opacity: 0.2 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ds-b-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ds-b-n", opacity: 0.04 });
  return mergeBricks([
    bg,
    split,
    stars,
    meteor,
    caustics,
    surface,
    lightShafts,
    bubbles,
    vignette,
    noise,
  ]);
}

/* ── Void: Total abyss — single faint light ───────────────────────────────── */
function deepVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Deep gradient — barely perceptible
  const abyss = skyGradientBrick(p, {
    id: "ds-v-ab",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.3 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Single distant bioluminescent point — radial glow
  const light = nebulaGlowBrick(p, {
    id: "ds-v-li",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.5, rx: 0.02, ry: 0.02, color: colors.accent, opacity: 0.5 },
      { cx: 0.5, cy: 0.5, rx: 0.06, ry: 0.06, color: colors.accent, opacity: 0.1 },
    ],
  });

  // Faint current texture
  const current = cloudBandBrick(p, {
    id: "ds-v-cu",
    cy: 0.5,
    bandHeight: 0.3,
    color: colors.bgSoft,
    opacity: 0.04,
    frequency: 0.003,
    seed: 41,
  });

  // Distant trench walls — visible terrain silhouettes
  const trench = terrainStackBrick(p, {
    id: "ds-v-tr",
    layers: [
      { baseY: 0.8, roughness: 0.05, color: colors.bgMid, opacity: 0.45 },
      { baseY: 0.88, roughness: 0.04, color: colors.bgSoft, opacity: 0.65 },
      { baseY: 0.94, roughness: 0.03, color: colors.bg, opacity: 0.85 },
    ],
  });

  const deepAtmo = atmosphereBrick(p, {
    id: "ds-v-atmo",
    color: colors.bgSoft,
    highlightColor: colors.accent,
    opacity: 0.05,
    lightAzimuth: 180,
    lightElevation: 10,
    seed: 61,
  });

  const vignette = vignetteBrick(p, { id: "ds-v-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ds-v-n", opacity: 0.03 });
  return mergeBricks([bg, abyss, current, light, trench, deepAtmo, vignette, noise]);
}

/* ── Pulse: Coral reef bioluminescence — light rising from reef floor ─────── */
function deepPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  // Dark water above, slightly lighter near the reef (bioluminescence lifts the gloom)
  const ocean = skyGradientBrick(p, {
    id: "ds-p-oc",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "55%", color: colors.bg },
      { offset: "80%", color: colors.bgSoft, opacity: 0.3 },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Coral reef terrain — STRONG ground plane at bottom. This is the "earth."
  // The reef is the scene's anchor — everything emanates FROM it upward.
  const reef = terrainStackBrick(p, {
    id: "ds-p-rf",
    points: 20,
    layers: [
      { baseY: 0.7, roughness: 0.08, color: colors.bgMid, opacity: 0.55 },
      { baseY: 0.78, roughness: 0.06, color: colors.bgSoft, opacity: 0.7 },
      { baseY: 0.86, roughness: 0.04, color: colors.bg, opacity: 0.9 },
      { baseY: 0.94, roughness: 0.02, color: colors.bg, opacity: 1.0 },
    ],
  });

  // Bioluminescent glow — CONCENTRATED at the reef surface (not scattered randomly).
  // Glows sit ON the reef terrain, not floating in open water.
  const reefGlow = nebulaGlowBrick(p, {
    id: "ds-p-gl",
    blur: 0.025,
    blobs: [
      { cx: 0.2, cy: 0.72, rx: 0.04, ry: 0.02, color: colors.hueCyan, opacity: 0.3 },
      { cx: 0.45, cy: 0.74, rx: 0.05, ry: 0.025, color: colors.accent, opacity: 0.3 },
      { cx: 0.7, cy: 0.71, rx: 0.04, ry: 0.02, color: colors.hueGreen, opacity: 0.25 },
    ],
  });

  // Vertical bioluminescent columns rising FROM reef — like smoke rising from fire.
  // This is the key perspective element: things rise UP from the ground.
  const bioColumns = smokeRisingBrick(p, {
    id: "ds-p-sm",
    sourceY: 0.72,
    riseHeight: 0.5,
    spreadX: 0.5,
    color: colors.hueCyan,
    opacity: 0.08,
    columns: 3,
  });

  // A few particles rising = plankton released by the reef
  const particles = starFieldBrick(p, {
    id: "ds-p-bl",
    count: 30,
    brightCount: 4,
    color: colors.hueCyan,
    distribution: "full",
    opacity: 0.4,
  });

  const coralAtmo = atmosphereBrick(p, {
    id: "ds-p-atmo",
    color: colors.bgMid,
    highlightColor: colors.hueCyan,
    opacity: 0.06,
    lightAzimuth: 200,
    lightElevation: 20,
    seed: 43,
  });

  const vignette = vignetteBrick(p, { id: "ds-p-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ds-p-n", opacity: 0.04 });
  return mergeBricks([bg, ocean, reef, reefGlow, bioColumns, particles, coralAtmo, vignette, noise]);
}
