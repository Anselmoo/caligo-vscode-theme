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
  backgroundBrick,
  celestialBrick,
  cloudBandBrick,
  duneBrick,
  horizonGlowBrick,
  nebulaGlowBrick,
  noiseBrick,
  skyGradientBrick,
  starFieldBrick,
  terrainContourBrick,
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

/* ── Stillness: Desert dunes under warm half-moon ─────────────────────────── */
function mandarianStillness(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mn-s-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "70%", color: colors.hueOrange, opacity: 0.08 },
      { offset: "100%", color: colors.bg },
    ],
  });

  const moon = celestialBrick(p, {
    id: "mn-s-mn",
    cx: 0.65,
    cy: 0.22,
    r: 0.04,
    color: colors.hueYellow,
    glowColor: colors.hueOrange,
    glowSize: 2.5,
  });

  const dune1 = duneBrick(p, {
    id: "mn-s-d1",
    baseY: 0.6,
    ridges: 3,
    color: colors.bgMid,
    opacity: 0.5,
  });
  const dune2 = duneBrick(p, {
    id: "mn-s-d2",
    baseY: 0.7,
    ridges: 2,
    color: colors.bgSoft,
    opacity: 0.65,
  });
  const dune3 = duneBrick(p, {
    id: "mn-s-d3",
    baseY: 0.82,
    ridges: 2,
    color: colors.bg,
    opacity: 0.85,
  });

  const hGlow = horizonGlowBrick(p, {
    id: "mn-s-hg",
    y: 0.65,
    color: colors.hueOrange,
    opacity: 0.1,
    height: 0.08,
  });

  const stars = starFieldBrick(p, {
    id: "mn-s-st",
    count: 70,
    brightCount: 5,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.5,
  });

  const vignette = vignetteBrick(p, { id: "mn-s-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mn-s-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, moon, hGlow, dune1, dune2, dune3, vignette, noise]);
}

/* ── Drift: Dusk bleeding into night ──────────────────────────────────────── */
function mandarianDrift(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mn-d-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "35%", color: colors.bgSoft },
      { offset: "55%", color: colors.hueOrange, opacity: 0.15 },
      { offset: "70%", color: colors.hueRed, opacity: 0.1 },
      { offset: "85%", color: colors.hueOrange, opacity: 0.05 },
      { offset: "100%", color: colors.bg },
    ],
  });

  const dune1 = duneBrick(p, {
    id: "mn-d-d1",
    baseY: 0.55,
    ridges: 3,
    color: colors.bgMid,
    opacity: 0.4,
  });
  const dune2 = duneBrick(p, {
    id: "mn-d-d2",
    baseY: 0.65,
    ridges: 2,
    color: colors.bgSoft,
    opacity: 0.6,
  });
  const dune3 = duneBrick(p, {
    id: "mn-d-d3",
    baseY: 0.78,
    ridges: 2,
    color: colors.bg,
    opacity: 0.8,
  });

  const haze = cloudBandBrick(p, {
    id: "mn-d-hz",
    cy: 0.55,
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
    count: 35,
    brightCount: 3,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.3,
  });

  const vignette = vignetteBrick(p, { id: "mn-d-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mn-d-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, hGlow, haze, dune1, dune2, dune3, vignette, noise]);
}

/* ── Break: Wildfire ridge — fire glow behind mountain ────────────────────── */
function mandarianBreak(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mn-b-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "60%", color: colors.hueRed, opacity: 0.12 },
      { offset: "100%", color: colors.bg },
    ],
  });

  const fireGlow = horizonGlowBrick(p, {
    id: "mn-b-fg",
    y: 0.52,
    color: colors.hueOrange,
    opacity: 0.25,
    height: 0.12,
  });

  const ridge = terrainContourBrick(p, {
    id: "mn-b-rd",
    horizonY: 0.45,
    layers: [
      { color: colors.bgMid, opacity: 0.6 },
      { color: colors.bg, opacity: 0.85 },
    ],
  });

  const smoke = cloudBandBrick(p, {
    id: "mn-b-sm",
    cy: 0.35,
    bandHeight: 0.2,
    color: colors.hueRed,
    opacity: 0.06,
    frequency: 0.005,
    seed: 19,
  });

  const embers = starFieldBrick(p, {
    id: "mn-b-em",
    count: 30,
    brightCount: 8,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.5,
  });

  const stars = starFieldBrick(p, {
    id: "mn-b-st",
    count: 40,
    brightCount: 3,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.35,
  });

  const vignette = vignetteBrick(p, { id: "mn-b-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mn-b-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, smoke, fireGlow, ridge, embers, vignette, noise]);
}

/* ── Void: Empty dune sea — vast barely-lit sand ──────────────────────────── */
function mandarianVoid(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mn-v-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "50%", color: colors.bgSoft, opacity: 0.3 },
      { offset: "100%", color: colors.bg },
    ],
  });

  const dunes = duneBrick(p, {
    id: "mn-v-dn",
    baseY: 0.7,
    ridges: 2,
    color: colors.bgMid,
    opacity: 0.25,
  });

  const haze = cloudBandBrick(p, {
    id: "mn-v-hz",
    cy: 0.65,
    bandHeight: 0.15,
    color: colors.bgSoft,
    opacity: 0.05,
    frequency: 0.003,
    seed: 37,
  });

  const vignette = vignetteBrick(p, { id: "mn-v-vig", opacity: 0.5 });
  const noise = noiseBrick(p, { id: "mn-v-n", opacity: 0.03 });
  return mergeBricks([bg, sky, haze, dunes, vignette, noise]);
}

/* ── Pulse: Fire dance — sparks rising from desert ────────────────────────── */
function mandarianPulse(p: BrickParams): ComposedWallpaper {
  const { colors } = p;
  const bg = backgroundBrick(p);

  const sky = skyGradientBrick(p, {
    id: "mn-p-sky",
    stops: [
      { offset: "0%", color: colors.bg },
      { offset: "40%", color: colors.bgSoft },
      { offset: "75%", color: colors.hueOrange, opacity: 0.06 },
      { offset: "100%", color: colors.bg },
    ],
  });

  const dune1 = duneBrick(p, {
    id: "mn-p-d1",
    baseY: 0.65,
    ridges: 3,
    color: colors.bgMid,
    opacity: 0.5,
  });
  const dune2 = duneBrick(p, {
    id: "mn-p-d2",
    baseY: 0.75,
    ridges: 2,
    color: colors.bgSoft,
    opacity: 0.65,
  });
  const dune3 = duneBrick(p, {
    id: "mn-p-d3",
    baseY: 0.85,
    ridges: 2,
    color: colors.bg,
    opacity: 0.85,
  });

  const fireGlow = nebulaGlowBrick(p, {
    id: "mn-p-fg",
    blur: 0.04,
    blobs: [
      { cx: 0.5, cy: 0.78, rx: 0.06, ry: 0.04, color: colors.hueOrange, opacity: 0.35 },
      { cx: 0.5, cy: 0.78, rx: 0.12, ry: 0.08, color: colors.hueRed, opacity: 0.12 },
    ],
  });

  const embers = starFieldBrick(p, {
    id: "mn-p-em",
    count: 45,
    brightCount: 10,
    color: colors.hueOrange,
    distribution: "full",
    opacity: 0.55,
  });

  const stars = starFieldBrick(p, {
    id: "mn-p-st",
    count: 60,
    brightCount: 4,
    color: "#ffffff",
    distribution: "upper",
    opacity: 0.45,
  });

  const vignette = vignetteBrick(p, { id: "mn-p-vig", opacity: 0.55 });
  const noise = noiseBrick(p, { id: "mn-p-n", opacity: 0.04 });
  return mergeBricks([bg, sky, stars, fireGlow, dune1, dune2, dune3, embers, vignette, noise]);
}
