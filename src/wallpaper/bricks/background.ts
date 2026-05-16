/**
 * Background brick — solid fill + soft atmospheric radial gradient.
 * Every wallpaper starts here.
 */
import type { BrickOutput, BrickParams } from "../types.js";
import { nebulaDustBrick } from "./noise.js";

function seedRng(seed: number) {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function backgroundBrick(params: BrickParams, id = "bg-atm"): BrickOutput {
  const { viewBox, colors, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-bg`));
  const cx = (0.3 + rng() * 0.4) * width;
  const cy = (0.2 + rng() * 0.25) * height;
  const r = Math.max(width, height) * 0.65;

  const dustId = `${id}-ng`;
  const dustSeed = (hashStr(`${seedId}-${harmonyMode}-dust`) % 89) + 1;
  const dust = nebulaDustBrick(params, {
    id: dustId,
    tintColor: colors.accentMuted,
    opacity: 0.18,
    baseFrequency: 0.012,
    seed: dustSeed,
  });

  // ── Bob Ross: Directional warm→cool atmospheric overlay ──
  // Sun from upper-left creates subtle warm bias on that side,
  // and cool deep-blue bias on the shadow side.
  const sunRad = ((215 - 180) * Math.PI) / 180; // SUN_AZIMUTH
  const dx1 = (50 + Math.cos(sunRad) * 50).toFixed(0);
  const dy1 = (50 + Math.sin(sunRad) * 50).toFixed(0);
  const dx2 = (50 - Math.cos(sunRad) * 50).toFixed(0);
  const dy2 = (50 - Math.sin(sunRad) * 50).toFixed(0);

  return {
    defs: `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${colors.bgSoft}" stop-opacity="0.75"/>
  <stop offset="100%" stop-color="${colors.bg}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="${id}-dir" x1="${dx1}%" y1="${dy1}%" x2="${dx2}%" y2="${dy2}%">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="0.025"/>
  <stop offset="40%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#0a1020" stop-opacity="0.03"/>
</linearGradient>
${dust.defs ?? ""}`,
    elements: `<rect width="${width}" height="${height}" fill="${colors.bg}"/>
<rect width="${width}" height="${height}" fill="url(#${id})"/>
<rect width="${width}" height="${height}" fill="url(#${id}-dir)"/>
${dust.elements}`,
  };
}
