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
  skyGradientBrick,
  solarCoronaBrick,
  starFieldBrick,
  terrainContourBrick,
  terrainStackBrick,
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

/* ── Stillness: Total solar eclipse — full corona at peak totality ────────── */
function eclipseStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "35%", color: colors.bgSoft },
      { offset: "65%", color: colors.bgMid },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Full corona composition — replaces nebulaGlowBrick + raysBrick + ringBrick
  const corona = solarCoronaBrick(p, {
    id: "ec-s-co",
    cx: 0.52,
    cy: 0.37,
    moonR: 0.065,
    color: colors.hueOrange,
    innerColor: colors.hueYellow,
    rayCount: 92,
    extent: 7,
    diamondAngleDeg: 48,
    diamondColor: "#fff3c0",
    turbulenceStrength: 0.24,
  });

  // Moon disk drawn ON TOP of corona — pure black occluding disk
  const moon = celestialBrick(p, {
    id: "ec-s-mn",
    cx: 0.52,
    cy: 0.37,
    r: 0.065,
    color: "#060608",
    glowColor: colors.hueOrange,
    glowSize: 0, // glow handled by solarCoronaBrick
  });

  const stars = starFieldBrick(p, {
    id: "ec-s-st",
    count: 180,
    brightCount: 10,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.55,
  });

  const hGlow = horizonGlowBrick(p, {
    id: "ec-s-hg",
    y: 0.92,
    color: colors.hueOrange,
    opacity: 0.1,
    height: 0.06,
  });

  // Distant mountain range silhouette
  const mountains = terrainContourBrick(p, {
    id: "ec-s-mt",
    horizonY: 0.42,
    layers: [
      { color: colors.bgMid, opacity: 0.4, edgeBlur: 4 },
      { color: colors.bgSoft, opacity: 0.58 },
      { color: colors.bg, opacity: 0.85 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ec-s-vig", opacity: 0.65 });
  const noise = noiseBrick(p, { id: "ec-s-n", opacity: 0.04 });
  return mergeBricks([bg, sky, corona, moon, stars, hGlow, mountains, vignette, noise]);
}

/* ── Drift: Diamond ring — partial eclipse with Baily's bead flash ────────── */
function eclipseDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "ec-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft },
      { offset: "100%", color: colors.bg },
    ],
  });

  // Partial corona — less extent, emphasize the diamond ring bead
  const corona = solarCoronaBrick(p, {
    id: "ec-d-co",
    cx: 0.5,
    cy: 0.4,
    moonR: 0.06,
    color: colors.hueOrange,
    innerColor: colors.hueYellow,
    rayCount: 76,
    extent: 5,
    diamondAngleDeg: 32, // ~2 o'clock — classic Baily's bead position
    diamondColor: "#ffffff",
    turbulenceStrength: 0.2,
  });

  const eclipseBody = celestialBrick(p, {
    id: "ec-d-eb",
    cx: 0.5,
    cy: 0.4,
    r: 0.06,
    color: "#050507",
    glowColor: colors.hueYellow,
    glowSize: 0,
  });

  const stars = starFieldBrick(p, {
    id: "ec-d-st",
    count: 150,
    brightCount: 8,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.5,
  });

  // Rolling hills beneath the eclipsed sky
  const hills = terrainStackBrick(p, {
    id: "ec-d-hl",
    layers: [
      { baseY: 0.8, roughness: 0.06, color: colors.bgMid, opacity: 0.35 },
      { baseY: 0.88, roughness: 0.05, color: colors.bgSoft, opacity: 0.55 },
      { baseY: 0.94, roughness: 0.04, color: colors.bg, opacity: 0.8 },
    ],
  });

  const vignette = vignetteBrick(p, { id: "ec-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ec-d-n", opacity: 0.04 });
  return mergeBricks([bg, sky, corona, eclipseBody, stars, hills, vignette, noise]);
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

  // Blood moon always uses deep red — palette hueRed can drift in split-comp modes
  const BLOOD_RED = "#8c1e1e";
  const BLOOD_GLOW = "#c43232";

  // Penumbral glow around the blood moon — Earth's shadow scatters red light
  const bloodCorona = solarCoronaBrick(p, {
    id: "ec-b-co",
    cx: 0.48,
    cy: 0.34,
    moonR: 0.072,
    color: BLOOD_GLOW,
    innerColor: "#e05020",
    rayCount: 64,
    extent: 4,
    diamondAngleDeg: null,
    turbulenceStrength: 0.28,
  });

  // Blood moon disk — deep crimson, not black (illuminated by scattered sunlight)
  const bloodMoon = celestialBrick(p, {
    id: "ec-b-bm",
    cx: 0.48,
    cy: 0.34,
    r: 0.072,
    color: BLOOD_RED,
    glowColor: BLOOD_GLOW,
    glowSize: 1.4,
    glowOpacity: 0.2,
  });

  const terrain = terrainStackBrick(p, {
    id: "ec-b-tr",
    points: 18,
    layers: [
      { baseY: 0.68, roughness: 0.08, color: colors.bgMid, opacity: 0.5 },
      { baseY: 0.75, roughness: 0.06, color: colors.bgSoft, opacity: 0.7 },
      { baseY: 0.82, roughness: 0.04, color: colors.bg, opacity: 0.9 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "ec-b-st",
    count: 200,
    brightCount: 12,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.5,
  });

  const atmo = atmosphereBrick(p, {
    id: "ec-b-atmo",
    color: BLOOD_GLOW,
    highlightColor: "#e06030",
    opacity: 0.06,
    lightAzimuth: 200,
    lightElevation: 30,
    seed: 7,
  });

  const vignette = vignetteBrick(p, { id: "ec-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "ec-b-n", opacity: 0.04 });
  return mergeBricks([bg, sky, bloodCorona, bloodMoon, stars, terrain, atmo, vignette, noise]);
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

  // Near-black corona — very low opacity, monochromatic tones, no diamond ring
  const whisperCorona = solarCoronaBrick(p, {
    id: "ec-v-co",
    cx: 0.5,
    cy: 0.44,
    moonR: 0.052,
    color: colors.accentMuted,
    innerColor: colors.accentSoft,
    rayCount: 58,
    extent: 5,
    diamondAngleDeg: null,
    turbulenceStrength: 0.18,
  });

  const eclipseBody = celestialBrick(p, {
    id: "ec-v-eb",
    cx: 0.5,
    cy: 0.44,
    r: 0.052,
    color: "#030305",
    glowColor: colors.accentSoft,
    glowSize: 0,
  });

  // Faint horizon terrain — barely visible landscape
  const horizon = terrainStackBrick(p, {
    id: "ec-v-hz",
    layers: [
      { baseY: 0.85, roughness: 0.04, color: colors.bgSoft, opacity: 0.18 },
      { baseY: 0.91, roughness: 0.03, color: colors.bgMid, opacity: 0.28 },
      { baseY: 0.97, roughness: 0.02, color: colors.bg, opacity: 0.5 },
    ],
  });

  const stars = starFieldBrick(p, {
    id: "ec-v-st",
    count: 120,
    brightCount: 6,
    color: "#e8e8f0",
    distribution: "full",
    opacity: 0.45,
  });

  const vignette = vignetteBrick(p, { id: "ec-v-vig", opacity: 0.6 });
  const noise = noiseBrick(p, { id: "ec-v-n", opacity: 0.03 });
  return mergeBricks([bg, sky, whisperCorona, eclipseBody, stars, horizon, vignette, noise]);
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

  // Full corona above the mountain ridge
  const corona = solarCoronaBrick(p, {
    id: "ec-p-co",
    cx: 0.51,
    cy: 0.27,
    moonR: 0.055,
    color: colors.hueOrange,
    innerColor: colors.hueYellow,
    rayCount: 84,
    extent: 8,
    diamondAngleDeg: 62,
    diamondColor: "#fff5d0",
    turbulenceStrength: 0.22,
  });

  const eclipseBody = celestialBrick(p, {
    id: "ec-p-eb",
    cx: 0.51,
    cy: 0.27,
    r: 0.055,
    color: "#050508",
    glowColor: colors.hueOrange,
    glowSize: 0,
  });

  const hGlow = horizonGlowBrick(p, {
    id: "ec-p-hg",
    y: 0.6,
    color: colors.hueOrange,
    opacity: 0.12,
    height: 0.08,
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

  const stars = starFieldBrick(p, {
    id: "ec-p-st",
    count: 160,
    brightCount: 10,
    color: "#ffffff",
    distribution: "full",
    opacity: 0.5,
  });

  const mist = cloudBandBrick(p, {
    id: "ec-p-mi",
    cy: 0.65,
    bandHeight: 0.1,
    color: colors.bgSoft,
    opacity: 0.07,
    frequency: 0.005,
    seed: 13,
  });

  const vignette = vignetteBrick(p, { id: "ec-p-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "ec-p-n", opacity: 0.04 });
  return mergeBricks([bg, sky, corona, eclipseBody, stars, hGlow, mist, ridge, vignette, noise]);
}
