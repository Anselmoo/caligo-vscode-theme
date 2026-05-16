/**
 * Ocean / deep-sea bricks — recognizable scene-specific sub-components.
 *
 * jellyfishBrick   — dome + trailing tentacles + bioluminescent rim glow.
 *                    Each jellyfish is an independent SVG sub-composition:
 *                    dome shape → tentacles → rim glow → inner fill gradient.
 *                    Call multiple times with different sizes/positions for depth.
 *
 * waterCurrentBrick — horizontal turbulence-based flow (NOT flat horizontal bands).
 *                     Uses anisotropic feTurbulence (very high X/Y ratio) to create
 *                     the characteristic streaming look of underwater pressure currents.
 */

import { createNoise2D } from "simplex-noise";
import type { BrickOutput, BrickParams } from "../types.js";

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

function fmt(n: number, d = 1): string {
  return n.toFixed(d);
}

// ── Jellyfish Brick ──────────────────────────────────────────────────────────

export interface JellyfishSpec {
  /** Fractional canvas position */
  cx: number;
  cy: number;
  /** Bell radius as fraction of canvas max dimension */
  r: number;
  /** Bioluminescent glow color */
  color: string;
  /** Tentacle color (usually slightly different from main color) */
  tentacleColor?: string;
  /** 0-1 opacity of the whole jellyfish */
  opacity?: number;
}

export interface JellyfishBrickOptions {
  id?: string;
  jellyfish: JellyfishSpec[];
  seed?: number;
}

/**
 * Bioluminescent jellyfish — each rendered as a proper anatomical composition:
 *
 * Anatomy (back-to-front):
 *  1. Outer glow — large blurred radial gradient behind the bell (scatter light)
 *  2. Bell (dome) — half-ellipse filled with radial gradient (dark outer → bright inner rim)
 *  3. Rim arc — thin bright stroke along the dome circumference (the bell's glowing edge)
 *  4. Oral arms — 4-6 thick wavy paths from bell center downward (main feeding arms)
 *  5. Tentacles — 8-14 thin wavy paths trailing below the bell
 *  6. Bell interior glow — central radial gradient inside the dome cap
 *
 * All paths use quadratic bezier curves with seeded random control points
 * so each jellyfish has unique tentacle shapes but is deterministic per seed.
 */
export function jellyfishBrick(params: BrickParams, options: JellyfishBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const { jellyfish, id = "jf" } = options;
  const baseSeed = options.seed ?? hashStr(`${seedId}-${harmonyMode}-jellyfish`);

  const defs: string[] = [];
  const elems: string[] = [];

  for (let ji = 0; ji < jellyfish.length; ji++) {
    const jf = jellyfish[ji];
    const { cx, cy, r, color } = jf;
    const tentacleColor = jf.tentacleColor ?? color;
    const op = jf.opacity ?? 0.75;
    const jrng = seedRng(baseSeed + ji * 1337);

    const px = cx * width;
    const py = cy * height;
    const pr = r * scale; // bell radius in px
    const bellRy = pr * 0.65; // bell is flatter than tall (oblate dome)
    const bellRx = pr;

    const jid = `${id}-${ji}`;

    // ── 1. Outer glow ──────────────────────────────────────────────────────
    const glowId = `${jid}-og`;
    defs.push(
      `<radialGradient id="${glowId}" cx="${fmt(px)}" cy="${fmt(py)}" r="${fmt(pr * 2.8)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${(op * 0.28).toFixed(2)}"/>
  <stop offset="40%" stop-color="${color}" stop-opacity="${(op * 0.1).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`
    );
    elems.push(
      `<ellipse cx="${fmt(px)}" cy="${fmt(py)}" rx="${fmt(pr * 2.8)}" ry="${fmt(bellRy * 3.5)}" fill="url(#${glowId})"/>`
    );

    // ── 2 & 6. Bell dome (SVG arc: half-ellipse from left to right, curved upward) ──
    // The bell is a dome — flat bottom at py, curved top at py-bellRy
    const bx0 = px - bellRx;
    const bx1 = px + bellRx;
    // SVG arc path: M(left) A(rx,ry,rotation,large-arc,sweep,right) Z would close at same Y
    // We want open bottom: M(left,py) A(...top...) L(right,py)
    const domeD = `M ${fmt(bx0)},${fmt(py)} A ${fmt(bellRx)},${fmt(bellRy)} 0 0 1 ${fmt(bx1)},${fmt(py)}`;

    // Inner fill — radial gradient: dark rim edge → bright core
    const fillId = `${jid}-bf`;
    defs.push(
      `<radialGradient id="${fillId}" cx="${fmt(px)}" cy="${fmt(py - bellRy * 0.3)}" r="${fmt(bellRx)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${(op * 0.55).toFixed(2)}"/>
  <stop offset="55%" stop-color="${color}" stop-opacity="${(op * 0.28).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="${(op * 0.06).toFixed(2)}"/>
</radialGradient>`
    );
    // Clip to bell shape so fill doesn't bleed outside dome
    const clipId = `${jid}-cl`;
    defs.push(
      `<clipPath id="${clipId}"><path d="${domeD} L ${fmt(bx1)},${fmt(py)} L ${fmt(bx0)},${fmt(py)} Z"/></clipPath>`
    );
    elems.push(
      `<ellipse cx="${fmt(px)}" cy="${fmt(py - bellRy * 0.5)}" rx="${fmt(bellRx * 0.95)}" ry="${fmt(bellRy * 0.95)}" fill="url(#${fillId})" clip-path="url(#${clipId})"/>`
    );

    // ── 3. Bell rim glow ──────────────────────────────────────────────────
    const rimGlowId = `${jid}-rg`;
    const rimBlur = fmt(pr * 0.05);
    defs.push(
      `<filter id="${rimGlowId}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${rimBlur}"/></filter>`
    );
    const rimSW = fmt((pr * 0.055 * Math.max(width, height)) / 2160);
    elems.push(
      `<path d="${domeD}" fill="none" stroke="${color}" stroke-width="${rimSW}" opacity="${(op * 0.9).toFixed(2)}" filter="url(#${rimGlowId})" stroke-linecap="round"/>`
    );
    // Hard rim line on top of glow
    const hardRimSW = fmt((pr * 0.022 * Math.max(width, height)) / 2160);
    elems.push(
      `<path d="${domeD}" fill="none" stroke="${color}" stroke-width="${hardRimSW}" opacity="${(op * 0.7).toFixed(2)}" stroke-linecap="round"/>`
    );

    // ── 4. Oral arms (4-5 thick wavy paths from bell center) ────────────
    const armCount = 4 + Math.floor(jrng() * 2);
    const armPaths: string[] = [];
    for (let ai = 0; ai < armCount; ai++) {
      const armAngle = Math.PI * 0.15 + (ai / (armCount - 1)) * (Math.PI * 0.7); // 15-165° (downward fan)
      const aLen = pr * (1.2 + jrng() * 0.8);
      const ax1 = px + Math.cos(armAngle) * aLen * 0.5 + (jrng() - 0.5) * pr * 0.4;
      const ay1 = py + Math.sin(armAngle) * aLen * 0.5;
      const ax2 = px + Math.cos(armAngle) * aLen + (jrng() - 0.5) * pr * 0.5;
      const ay2 = py + Math.sin(armAngle) * aLen;
      const aSW = fmt((pr * (0.06 + jrng() * 0.04) * scale) / 2160);
      armPaths.push(
        `<path d="M ${fmt(px)},${fmt(py)} Q ${fmt(ax1)},${fmt(ay1)} ${fmt(ax2)},${fmt(ay2)}" fill="none" stroke="${color}" stroke-width="${aSW}" opacity="${(op * 0.45).toFixed(2)}" stroke-linecap="round"/>`
      );
    }
    elems.push(`<g id="${jid}-arms">${armPaths.join("")}</g>`);

    // ── 5. Tentacles (8-14 thin wavy paths) ──────────────────────────────
    const tentCount = 8 + Math.floor(jrng() * 7);
    const tentPaths: string[] = [];
    for (let ti = 0; ti < tentCount; ti++) {
      // Spread across the bell width
      const tx0 = bx0 + (ti / (tentCount - 1)) * (bellRx * 2) + (jrng() - 0.5) * pr * 0.15;
      const tLen = pr * (1.8 + jrng() * 2.2);
      // Two control points for a wiggly path
      const tc1x = tx0 + (jrng() - 0.5) * pr * 0.7;
      const tc1y = py + tLen * 0.35;
      const tc2x = tx0 + (jrng() - 0.5) * pr * 0.9;
      const tc2y = py + tLen * 0.7;
      const tx1 = tx0 + (jrng() - 0.5) * pr * 0.6;
      const ty1 = py + tLen;
      const tSW = fmt(Math.max(0.5, (pr * 0.018 * scale) / 2160));
      const tOp = (op * (0.3 + jrng() * 0.4)).toFixed(2);
      tentPaths.push(
        `<path d="M ${fmt(tx0)},${fmt(py)} C ${fmt(tc1x)},${fmt(tc1y)} ${fmt(tc2x)},${fmt(tc2y)} ${fmt(tx1)},${fmt(ty1)}" fill="none" stroke="${tentacleColor}" stroke-width="${tSW}" opacity="${tOp}" stroke-linecap="round"/>`
      );
    }
    elems.push(`<g id="${jid}-tent">${tentPaths.join("")}</g>`);
  }

  return {
    defs: defs.join("\n"),
    elements: elems.join("\n"),
  };
}

// ── Beach Brick ──────────────────────────────────────────────────────────────

export interface BeachBrickOptions {
  id?: string;
  /** Y position of the shoreline (waves meet sand) */
  shoreY?: number;
  /** Sand color */
  sandColor?: string;
  /** Wave/foam highlight color */
  foamColor?: string;
  /** Water/dark wave color */
  waterColor?: string;
  opacity?: number;
  /** Number of breaking wave lines */
  waves?: number;
  seed?: number;
  /** Bioluminescence — adds glowing turquoise plankton along wave crests
   *  (think Maldives / Vaadhoo bioluminescent tides) */
  bioluminescent?: boolean;
  bioluminescenceColor?: string;
  /** Optional reflection streak position (0..1 of width). Pass undefined or null
   *  to omit. The reflection is the vertical bright column on the water that
   *  appears under a sun/moon — it pairs with a celestial brick rendered above. */
  reflectionCx?: number;
  /** Reflection colour (defaults to white-warm) */
  reflectionColor?: string;
  /** Reflection brightness 0..1 (defaults to 0.45) */
  reflectionOpacity?: number;
  /** Rocky shore — replaces sand foreground with rocks/boulders (rugged coastline) */
  rocky?: boolean;
  /** Rock color (defaults to dark gray) */
  rockColor?: string;
}

/**
 * Beach — coastal foreground only. NO sky/stars/moon/sun here. Compose with
 * skyGradientBrick + starFieldBrick + celestialBrick separately for the upper
 * scene.
 *
 * Renders:
 *   1. Distant ocean band (water gradient between horizon and shore)
 *   2. Far-water shimmer (perspective horizontal foam-tip lines)
 *   3. Optional reflection streak — vertical bright column on water under
 *      a sky source (moonlightCx specifies position; pass `null` to omit)
 *   4. Multiple breaking-wave foam crests (perspective rows)
 *   5. Closest foam tongues licking up onto wet sand
 *   6. Wet-sand specular band (bright reflective stripe just below the shoreline)
 *   7. Sand foreground with light wet sand → darker dry sand gradient
 *   8. Sand-grain texture overlay
 *   9. Scattered shells/pebbles
 *  10. Optional bioluminescence (cyan glowing wave crests + plankton specks)
 */
export function beachBrick(params: BrickParams, options: BeachBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 960;
  const {
    shoreY = 0.55,
    sandColor = "#4a4035",
    foamColor = "#d8d0c0",
    waterColor = "#1a1820",
    opacity = 0.95,
    waves = 6,
    id = "beach",
    bioluminescent = false,
    bioluminescenceColor = "#4ddbff",
    reflectionCx,
    reflectionColor = "#fff5d8",
    reflectionOpacity = 0.45,
    rocky = false,
    rockColor = "#2a2e32",
  } = options;

  const baseSeed = options.seed ?? (hashStr(`${seedId}-${harmonyMode}-beach`) % 89) + 1;
  const rng = seedRng(baseSeed);
  const noise2D = createNoise2D(rng);
  const shorePx = shoreY * height;
  // Much larger ocean zone — 30% of height for realistic depth
  const horizonPx = shorePx - height * 0.30;

  const defs: string[] = [];
  const elems: string[] = [];

  // ── Helper: generate a smooth noise-based wave curve across the width ──
  // Uses LOW-frequency noise for broad sweeping arcs (not fine ripples).
  // Optional tilt parameter rotates the wave front so waves approach at angles.
  function waveContour(
    baseY: number, amplitude: number, phaseOff: number,
    steps = 80, tilt = 0 // tilt: y-offset per unit width (diagonal wave front)
  ): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = t * width;
      // 4-octave noise: dominant broad swell + medium curve + fine + micro
      // Low primary frequency (1.2) creates wide sweeping arcs, not flat lines
      const n =
        noise2D(t * 1.2 + phaseOff, phaseOff * 5) * 0.45 +
        noise2D(t * 3.5 + phaseOff, phaseOff * 5 + 8) * 0.30 +
        noise2D(t * 8.0 + phaseOff, phaseOff * 5 + 16) * 0.16 +
        noise2D(t * 18.0 + phaseOff, phaseOff * 5 + 24) * 0.09;
      // Apply tilt so wave front is diagonal
      const tiltY = tilt * (t - 0.5);
      pts.push({ x, y: baseY + n * amplitude + tiltY });
    }
    return pts;
  }

  // Build a smooth SVG path from points using Catmull-Rom → cubic Bézier
  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return "";
    const d: string[] = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      // Catmull-Rom → Bézier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    }
    return d.join(" ");
  }

  // ── 1. OCEAN BAND — water from the horizon line down to the shoreline.
  const oceanH = shorePx - horizonPx;
  defs.push(`<linearGradient id="${id}-water" x1="0" y1="${horizonPx.toFixed(0)}" x2="0" y2="${shorePx.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${waterColor}" stop-opacity="${(opacity * 0.7).toFixed(2)}"/>
  <stop offset="30%" stop-color="${waterColor}" stop-opacity="${(opacity * 0.9).toFixed(2)}"/>
  <stop offset="100%" stop-color="${waterColor}" stop-opacity="${opacity.toFixed(2)}"/>
</linearGradient>`);
  elems.push(
    `<rect x="0" y="${horizonPx.toFixed(0)}" width="${width}" height="${oceanH.toFixed(0)}" fill="url(#${id}-water)"/>`
  );

  // ── 1b. Horizon glow — faint bright line at horizon for sky-ocean boundary
  const hGlowH = 4 * sc;
  defs.push(`<linearGradient id="${id}-hglow" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${reflectionColor}" stop-opacity="0"/>
  <stop offset="50%" stop-color="${reflectionColor}" stop-opacity="${(opacity * 0.12).toFixed(2)}"/>
  <stop offset="100%" stop-color="${reflectionColor}" stop-opacity="0"/>
</linearGradient>`);
  elems.push(
    `<rect x="0" y="${(horizonPx - hGlowH).toFixed(0)}" width="${width}" height="${(hGlowH * 2).toFixed(0)}" fill="url(#${id}-hglow)"/>`
  );

  // ── 1c. 3D ocean surface — feDiffuseLighting for real water depth/chop
  const oceanLitId = `${id}-olit`;
  defs.push(`<filter id="${oceanLitId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.025 0.006" numOctaves="5" seed="${baseSeed + 99}" result="waterBump"/>
  <feDiffuseLighting in="waterBump" surfaceScale="1.5" diffuseConstant="0.6" result="waterLit" lighting-color="#8899bb">
    <feDistantLight azimuth="190" elevation="30"/>
  </feDiffuseLighting>
  <feComposite in="waterLit" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(
    `<rect x="0" y="${horizonPx.toFixed(0)}" width="${width}" height="${oceanH.toFixed(0)}" fill="${waterColor}" opacity="${(opacity * 0.12).toFixed(2)}" filter="url(#${oceanLitId})"/>`
  );

  // ── 1d. Specular highlight on ocean — moonlight/starlight glints on wave facets
  const oceanSpecId = `${id}-ospec`;
  defs.push(`<filter id="${oceanSpecId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.05 0.012" numOctaves="3" seed="${baseSeed + 101}" result="specWater"/>
  <feSpecularLighting in="specWater" surfaceScale="2.5" specularConstant="0.4" specularExponent="18" result="waterGlint" lighting-color="#c0d0e0">
    <feDistantLight azimuth="200" elevation="35"/>
  </feSpecularLighting>
  <feComposite in="waterGlint" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(
    `<rect x="0" y="${horizonPx.toFixed(0)}" width="${width}" height="${oceanH.toFixed(0)}" fill="#ffffff" opacity="${(opacity * 0.03).toFixed(3)}" filter="url(#${oceanSpecId})"/>`
  );

  // ── 1e. Fine horizontal shimmer streaks (perspective ocean texture)
  const oceanTexId = `${id}-otex`;
  defs.push(`<filter id="${oceanTexId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.015 0.003" numOctaves="3" seed="${baseSeed + 103}" result="shimmer"/>
  <feColorMatrix in="shimmer" type="matrix" values="0 0 0 0 0.7  0 0 0 0 0.75  0 0 0 0 0.8  3 0 0 0 -2.2" result="shimmerA"/>
  <feGaussianBlur in="shimmerA" stdDeviation="1 0.5" result="softShim"/>
  <feComposite in="softShim" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(
    `<rect x="0" y="${horizonPx.toFixed(0)}" width="${width}" height="${oceanH.toFixed(0)}" fill="#8899aa" opacity="${(opacity * 0.06).toFixed(2)}" filter="url(#${oceanTexId})"/>`
  );

  // ── 2. Reflection streak on water (vertical bright column under a celestial source)
  if (reflectionCx != null) {
    const reflCenterPx = reflectionCx * width;
    const reflOp = reflectionOpacity;
    const reflGradId = `${id}-refl`;
    defs.push(`<linearGradient id="${reflGradId}" x1="0" y1="${horizonPx.toFixed(0)}" x2="0" y2="${shorePx.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${reflectionColor}" stop-opacity="${(reflOp * 0.55).toFixed(2)}"/>
  <stop offset="40%" stop-color="${reflectionColor}" stop-opacity="${(reflOp * 0.28).toFixed(2)}"/>
  <stop offset="100%" stop-color="${reflectionColor}" stop-opacity="0"/>
</linearGradient>`);
    const reflW = width * 0.06;
    elems.push(
      `<rect x="${(reflCenterPx - reflW * 0.5).toFixed(1)}" y="${horizonPx.toFixed(0)}" width="${reflW.toFixed(1)}" height="${oceanH.toFixed(0)}" fill="url(#${reflGradId})" style="mix-blend-mode:screen"/>`
    );
    // Bright shimmer dashes within the reflection
    for (let i = 0; i < 8; i++) {
      const dy = horizonPx + (0.08 + (i / 8) * 0.8 + rng() * 0.04) * oceanH;
      const dw = reflW * (0.3 + rng() * 0.5);
      const dx = reflCenterPx - dw * 0.5 + (rng() - 0.5) * reflW * 0.3;
      const dOp = (0.5 - i * 0.04 + rng() * 0.15).toFixed(2);
      const dSw = (0.7 + rng() * 0.8) * sc;
      elems.push(
        `<line x1="${dx.toFixed(1)}" y1="${dy.toFixed(1)}" x2="${(dx + dw).toFixed(1)}" y2="${dy.toFixed(1)}" stroke="${reflectionColor}" stroke-width="${dSw.toFixed(1)}" opacity="${dOp}" stroke-linecap="round"/>`
      );
    }
  }

  // ── 3. BREAKING WAVES — organic, chaotic foam with segmented crests.
  // Real ocean waves are NOT uniform parallel lines. They:
  //  - Break in segments (not full-width)
  //  - Have irregular spacing and amplitude
  //  - Produce foam patches of random size
  //  - Show interference patterns between wave sets

  // Shared filters
  const crestGlowId = `${id}-cglow`;
  defs.push(`<filter id="${crestGlowId}" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="${(1.5 * sc).toFixed(1)} ${(0.8 * sc).toFixed(1)}"/></filter>`);

  // General foam turbulence filter (shared across wave segments)
  const foamFiltId = `${id}-wfoam`;
  defs.push(`<filter id="${foamFiltId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.014 0.05" numOctaves="5" seed="${baseSeed + 20}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.88  0 0 0 0 0.84  0 0 0 0 0.76  5.0 0 0 0 -2.2" result="foam"/>
  <feGaussianBlur in="foam" stdDeviation="${(1.0 * sc).toFixed(1)} ${(0.5 * sc).toFixed(1)}" result="softFoam"/>
  <feComposite in="softFoam" in2="SourceGraphic" operator="in"/>
</filter>`);

  const breakRows = waves + 3; // more rows for denser wave field
  for (let row = 0; row < breakRows; row++) {
    const rowT = row / Math.max(1, breakRows - 1); // 0=farthest, 1=closest
    // Irregular spacing — waves cluster near shore with random gaps
    const rowJitter = (rng() - 0.5) * 0.12;
    const baseY = horizonPx + (0.12 + rowT * 0.80 + rowJitter) * oceanH;
    // MUCH bigger amplitude — waves need to curve dramatically, not be flat lines
    // Close waves: up to 30px of sweep; distant: 5-10px
    const waveAmp = (4 + rowT * 25 + rng() * 12) * sc;
    const foamThickness = (4 + rowT * 18 + rng() * 8) * sc;
    const phaseOff = row * 2.7 + rng() * 5;
    // Each wave approaches at a slightly different angle (diagonal wave fronts)
    const waveTilt = (rng() - 0.5) * oceanH * 0.15;

    // Generate the full wave contour with diagonal tilt
    const fullCrest = waveContour(baseY, waveAmp, phaseOff, 100, waveTilt);

    // ── Break the wave into 2-5 segments (not full width) ──
    // Real waves don't break uniformly — they peak and collapse in sections
    const segCount = 2 + Math.floor(rng() * 4);
    const segBoundaries: Array<{start: number; end: number}> = [];
    for (let s = 0; s < segCount; s++) {
      const center = rng();
      const halfWidth = 0.08 + rng() * 0.25; // segment spans 16-66% of width
      segBoundaries.push({
        start: Math.max(0, center - halfWidth),
        end: Math.min(1, center + halfWidth),
      });
    }
    // Merge overlapping segments
    segBoundaries.sort((a, b) => a.start - b.start);
    const merged: Array<{start: number; end: number}> = [segBoundaries[0]];
    for (let s = 1; s < segBoundaries.length; s++) {
      const last = merged[merged.length - 1];
      if (segBoundaries[s].start <= last.end + 0.02) {
        last.end = Math.max(last.end, segBoundaries[s].end);
      } else {
        merged.push(segBoundaries[s]);
      }
    }

    for (const seg of merged) {
      const startIdx = Math.floor(seg.start * fullCrest.length);
      const endIdx = Math.min(fullCrest.length - 1, Math.ceil(seg.end * fullCrest.length));
      if (endIdx - startIdx < 3) continue;
      const segPts = fullCrest.slice(startIdx, endIdx + 1);
      const crestPath = smoothPath(segPts);

      // Closed shape for this wave segment
      const bottomY = baseY + foamThickness;
      const segLeft = segPts[0].x;
      const segRight = segPts[segPts.length - 1].x;
      const filledD = `${crestPath} L ${segRight.toFixed(1)} ${bottomY.toFixed(1)} L ${segLeft.toFixed(1)} ${bottomY.toFixed(1)} Z`;

      const clipId = `${id}-wc${row}-${merged.indexOf(seg)}`;
      defs.push(`<clipPath id="${clipId}"><path d="${filledD}"/></clipPath>`);

      // Foam fade gradient
      const foamFadeId = `${id}-ff${row}-${merged.indexOf(seg)}`;
      defs.push(`<linearGradient id="${foamFadeId}" x1="0" y1="${(baseY - waveAmp).toFixed(0)}" x2="0" y2="${bottomY.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${foamColor}" stop-opacity="1"/>
  <stop offset="35%" stop-color="${foamColor}" stop-opacity="0.65"/>
  <stop offset="100%" stop-color="${foamColor}" stop-opacity="0.05"/>
</linearGradient>`);

      const rowOp = (0.10 + rowT * 0.38 + rng() * 0.08).toFixed(2);

      // Dark wave body
      elems.push(
        `<path d="${filledD}" fill="${waterColor}" opacity="${(0.10 + rowT * 0.20).toFixed(2)}"/>`
      );
      // Foam texture clipped to segment
      elems.push(
        `<rect x="${segLeft.toFixed(0)}" y="${(baseY - waveAmp * 1.5).toFixed(0)}" width="${(segRight - segLeft).toFixed(0)}" height="${(foamThickness + waveAmp * 3).toFixed(0)}" fill="url(#${foamFadeId})" opacity="${rowOp}" filter="url(#${foamFiltId})" clip-path="url(#${clipId})"/>`
      );
      // Soft crest glow (blurred)
      const crestSw = (0.6 + rowT * 2.2) * sc;
      const crestOp = (0.12 + rowT * 0.28).toFixed(2);
      elems.push(
        `<path d="${crestPath}" fill="none" stroke="${foamColor}" stroke-width="${(crestSw * 2.8).toFixed(1)}" opacity="${(parseFloat(crestOp) * 0.4).toFixed(3)}" stroke-linecap="round" filter="url(#${crestGlowId})"/>`
      );
      // Crisp crest line — thicker for closer waves
      elems.push(
        `<path d="${crestPath}" fill="none" stroke="${foamColor}" stroke-width="${(crestSw * 0.5).toFixed(1)}" opacity="${crestOp}" stroke-linecap="round"/>`
      );
    }
  }

  // ── 3b. Scattered foam patches — organic drifting foam between waves ──
  const foamPatchCount = 25 + Math.floor(rng() * 15);
  for (let fp = 0; fp < foamPatchCount; fp++) {
    const fpx = rng() * width;
    const fpRowT = rng();
    const fpy = horizonPx + (0.20 + fpRowT * 0.75) * oceanH;
    const fprx = (4 + rng() * 18 + fpRowT * 10) * sc;
    // Varied aspect ratio — some round, some elongated
    const fpry = fprx * (0.15 + rng() * 0.35);
    const fpOp = (0.03 + fpRowT * 0.14 + rng() * 0.06).toFixed(3);
    // Rotate some patches for non-horizontal orientation
    const fpAngle = (rng() - 0.5) * 25;
    elems.push(
      `<ellipse cx="${fpx.toFixed(1)}" cy="${fpy.toFixed(1)}" rx="${fprx.toFixed(1)}" ry="${fpry.toFixed(1)}" fill="${foamColor}" opacity="${fpOp}" transform="rotate(${fpAngle.toFixed(0)} ${fpx.toFixed(0)} ${fpy.toFixed(0)})"/>`
    );
  }

  // ── 4. Shore break — the dramatic foam band where waves crash onto sand ──
  // Multiple overlapping tongues at slightly different Y positions for chaos
  for (let t = 0; t < 3; t++) {
    const tongueAmp = (8 + rng() * 12) * sc;
    const tongueThick = (12 + rng() * 14) * sc;
    const tongueY = shorePx - tongueThick * (0.10 + rng() * 0.20);
    const tongueTilt = (rng() - 0.5) * oceanH * 0.10;
    const tongueCrest = waveContour(tongueY, tongueAmp, 8.5 + t * 4.2 + rng() * 3, 80, tongueTilt);

    // Break tongue into 1-3 segments
    const tSegCount = 1 + Math.floor(rng() * 3);
    for (let ts = 0; ts < tSegCount; ts++) {
      const tStart = Math.floor(rng() * (tongueCrest.length * 0.4));
      const tLen = Math.floor(tongueCrest.length * (0.3 + rng() * 0.5));
      const tEnd = Math.min(tongueCrest.length - 1, tStart + tLen);
      if (tEnd - tStart < 4) continue;
      const segPts = tongueCrest.slice(tStart, tEnd + 1);
      const tonguePath = smoothPath(segPts);
      const segLeft = segPts[0].x;
      const segRight = segPts[segPts.length - 1].x;
      const tongueBottom = shorePx + tongueThick * 0.3;
      const tongueFilledD = `${tonguePath} L ${segRight.toFixed(1)} ${tongueBottom.toFixed(1)} L ${segLeft.toFixed(1)} ${tongueBottom.toFixed(1)} Z`;

      const tongueClipId = `${id}-tc${t}-${ts}`;
      defs.push(`<clipPath id="${tongueClipId}"><path d="${tongueFilledD}"/></clipPath>`);

      const tongueFadeId = `${id}-tf${t}-${ts}`;
      defs.push(`<linearGradient id="${tongueFadeId}" x1="0" y1="${(tongueY - tongueAmp).toFixed(0)}" x2="0" y2="${tongueBottom.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${foamColor}" stop-opacity="1"/>
  <stop offset="45%" stop-color="${foamColor}" stop-opacity="0.55"/>
  <stop offset="100%" stop-color="${foamColor}" stop-opacity="0"/>
</linearGradient>`);

      // Dark water under tongue
      elems.push(`<path d="${tongueFilledD}" fill="${waterColor}" opacity="0.18"/>`);
      // Foam texture
      elems.push(
        `<rect x="${segLeft.toFixed(0)}" y="${(tongueY - tongueAmp).toFixed(0)}" width="${(segRight - segLeft).toFixed(0)}" height="${(tongueThick * 2).toFixed(0)}" fill="url(#${tongueFadeId})" opacity="0.35" filter="url(#${foamFiltId})" clip-path="url(#${tongueClipId})"/>`
      );
      // Soft crest glow
      elems.push(
        `<path d="${tonguePath}" fill="none" stroke="${foamColor}" stroke-width="${(2.5 * sc).toFixed(1)}" opacity="0.15" stroke-linecap="round" filter="url(#${crestGlowId})"/>`
      );
      // Crisp crest
      elems.push(
        `<path d="${tonguePath}" fill="none" stroke="${foamColor}" stroke-width="${(0.8 * sc).toFixed(1)}" opacity="0.20" stroke-linecap="round"/>`
      );
    }
  }

  // ── 4b. Wash foam on sand — irregular bright patches where water met sand ──
  for (let w = 0; w < 8; w++) {
    const wy = shorePx + (rng() * 0.06) * (height - shorePx);
    const wx = rng() * width;
    const wrx = (10 + rng() * 30) * sc;
    const wry = (1.5 + rng() * 3) * sc;
    const wOp = (0.06 + rng() * 0.10).toFixed(3);
    elems.push(
      `<ellipse cx="${wx.toFixed(1)}" cy="${wy.toFixed(1)}" rx="${wrx.toFixed(1)}" ry="${wry.toFixed(1)}" fill="${foamColor}" opacity="${wOp}"/>`
    );
  }

  if (rocky) {
    // ── 5R. ROCKY SHORE — rugged coastline with boulders, rock texture, tide pools
    const shoreH = height - shorePx;

    // Base rock color
    defs.push(`<linearGradient id="${id}-rock" x1="0" y1="${shorePx.toFixed(0)}" x2="0" y2="${height}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${rockColor}" stop-opacity="${(opacity * 0.85).toFixed(2)}"/>
  <stop offset="30%" stop-color="${rockColor}" stop-opacity="${opacity.toFixed(2)}"/>
  <stop offset="100%" stop-color="${rockColor}" stop-opacity="${(opacity * 0.95).toFixed(2)}"/>
</linearGradient>`);
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${shoreH.toFixed(0)}" fill="url(#${id}-rock)"/>`
    );

    // 3D Rock texture — feDiffuseLighting for actual surface depth on the rock face
    const rockTexId = `${id}-rlit`;
    const rockTexSeed = baseSeed + 7;
    defs.push(`<filter id="${rockTexId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.06" numOctaves="6" seed="${rockTexSeed}" result="rockBump"/>
  <feDiffuseLighting in="rockBump" surfaceScale="3.5" diffuseConstant="0.7" result="rockLit" lighting-color="#8090a0">
    <feDistantLight azimuth="210" elevation="32"/>
  </feDiffuseLighting>
  <feComposite in="rockLit" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${shoreH.toFixed(0)}" fill="${rockColor}" opacity="${(opacity * 0.25).toFixed(2)}" filter="url(#${rockTexId})"/>`
    );

    // Fine rock grain — high-frequency overlay for micro-texture
    const rockGrainId = `${id}-rgrain`;
    defs.push(`<filter id="${rockGrainId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.8 0.5" numOctaves="3" seed="${rockTexSeed + 2}" result="rg"/>
  <feColorMatrix in="rg" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0" result="rga"/>
  <feComposite in="rga" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${shoreH.toFixed(0)}" fill="#1a1e22" opacity="${(opacity * 0.25).toFixed(2)}" filter="url(#${rockGrainId})"/>`
    );

    // Wet rock specular — feDiffuseLighting-based specular near waterline
    const rockSpecId = `${id}-rspec3d`;
    defs.push(`<filter id="${rockSpecId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.06 0.04" numOctaves="4" seed="${rockTexSeed + 4}" result="wetBump"/>
  <feSpecularLighting in="wetBump" surfaceScale="4" specularConstant="0.6" specularExponent="20" result="wetGlint" lighting-color="#a0b0c0">
    <feDistantLight azimuth="200" elevation="40"/>
  </feSpecularLighting>
  <feComposite in="wetGlint" in2="SourceGraphic" operator="in"/>
</filter>`);
    const wetZoneH = shoreH * 0.25;
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${wetZoneH.toFixed(0)}" fill="#ffffff" opacity="${(opacity * 0.04).toFixed(3)}" filter="url(#${rockSpecId})"/>`
    );

    // Boulders — irregular rounded shapes with 3D volume
    const boulderCount = 15 + Math.floor(rng() * 8);
    for (let i = 0; i < boulderCount; i++) {
      const bx = rng() * width;
      const bt = rng(); // 0=near shore, 1=far down
      const bby = shorePx + bt * shoreH * 0.85;
      // Perspective: closer boulders larger
      const bScale = (1 + bt * 0.8);
      const brx = (8 + rng() * 22) * sc * bScale;
      const bry = brx * (0.45 + rng() * 0.3);
      const bOp = (opacity * (0.45 + rng() * 0.35)).toFixed(2);
      const bColor = rng() > 0.5 ? "#1a1d22" : "#252a30";
      // Boulder shadow (cast shadow below-right)
      elems.push(
        `<ellipse cx="${(bx + brx * 0.2).toFixed(1)}" cy="${(bby + bry * 0.35).toFixed(1)}" rx="${(brx * 1.05).toFixed(1)}" ry="${(bry * 0.55).toFixed(1)}" fill="#000000" opacity="${(parseFloat(bOp) * 0.2).toFixed(3)}"/>`
      );
      // Main boulder body
      elems.push(
        `<ellipse cx="${bx.toFixed(1)}" cy="${bby.toFixed(1)}" rx="${brx.toFixed(1)}" ry="${bry.toFixed(1)}" fill="${bColor}" opacity="${bOp}"/>`
      );
      // 3D lit highlight on top-left (light-catching wet surface)
      const hlOp = (opacity * (0.10 + rng() * 0.15)).toFixed(2);
      elems.push(
        `<ellipse cx="${(bx - brx * 0.1).toFixed(1)}" cy="${(bby - bry * 0.35).toFixed(1)}" rx="${(brx * 0.7).toFixed(1)}" ry="${(bry * 0.35).toFixed(1)}" fill="#6a7888" opacity="${hlOp}"/>`
      );
      // Subtle specular glint on very top
      if (rng() > 0.4) {
        const glintOp = (opacity * 0.06 * (1 + bt)).toFixed(3);
        elems.push(
          `<ellipse cx="${(bx - brx * 0.15).toFixed(1)}" cy="${(bby - bry * 0.45).toFixed(1)}" rx="${(brx * 0.3).toFixed(1)}" ry="${(bry * 0.15).toFixed(1)}" fill="#99aabb" opacity="${glintOp}"/>`
        );
      }
    }

    // Tide pools — with 3D water glint inside
    for (let i = 0; i < 8; i++) {
      const tpx = rng() * width;
      const tpy = shorePx + (0.08 + rng() * 0.55) * shoreH;
      const tprx = (5 + rng() * 14) * sc;
      const tpry = tprx * (0.3 + rng() * 0.2);
      const tpOp = (opacity * (0.22 + rng() * 0.18)).toFixed(2);
      // Dark water fill
      elems.push(
        `<ellipse cx="${tpx.toFixed(1)}" cy="${tpy.toFixed(1)}" rx="${tprx.toFixed(1)}" ry="${tpry.toFixed(1)}" fill="#0a1828" opacity="${tpOp}"/>`
      );
      // Highlight reflection in pool
      elems.push(
        `<ellipse cx="${(tpx - tprx * 0.15).toFixed(1)}" cy="${(tpy - tpry * 0.2).toFixed(1)}" rx="${(tprx * 0.5).toFixed(1)}" ry="${(tpry * 0.35).toFixed(1)}" fill="#334455" opacity="${(parseFloat(tpOp) * 0.4).toFixed(3)}"/>`
      );
    }

    // Wet rock specular band — gradient sheen near the waterline
    defs.push(`<linearGradient id="${id}-rspec" x1="0" y1="${shorePx.toFixed(0)}" x2="0" y2="${(shorePx + shoreH * 0.18).toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#667788" stop-opacity="${(opacity * 0.22).toFixed(2)}"/>
  <stop offset="50%" stop-color="#667788" stop-opacity="${(opacity * 0.10).toFixed(2)}"/>
  <stop offset="100%" stop-color="#667788" stop-opacity="0"/>
</linearGradient>`);
    const specH = shoreH * 0.18;
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${specH.toFixed(0)}" fill="url(#${id}-rspec)"/>`
    );
  } else {
    // ── 5. Sand below the shoreline — gradient from light wet sand → darker dry sand
    defs.push(`<linearGradient id="${id}-sand" x1="0" y1="${shorePx.toFixed(0)}" x2="0" y2="${height}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${foamColor}" stop-opacity="${(opacity * 0.35).toFixed(2)}"/>
  <stop offset="8%" stop-color="${sandColor}" stop-opacity="${opacity.toFixed(2)}"/>
  <stop offset="100%" stop-color="${sandColor}" stop-opacity="${(opacity * 0.88).toFixed(2)}"/>
</linearGradient>`);
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${(height - shorePx).toFixed(0)}" fill="url(#${id}-sand)"/>`
    );

    // ── 5b. 3D lit sand surface — feDiffuseLighting for actual depth on sand grains
    const sandLitId = `${id}-sandlit`;
    const texSeed = baseSeed + 7;
    defs.push(`<filter id="${sandLitId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.25 0.18" numOctaves="5" seed="${texSeed}" result="sandBump"/>
  <feDiffuseLighting in="sandBump" surfaceScale="2.0" diffuseConstant="0.75" result="sandLit" lighting-color="#d8c098">
    <feDistantLight azimuth="220" elevation="35"/>
  </feDiffuseLighting>
  <feComposite in="sandLit" in2="SourceGraphic" operator="in"/>
</filter>`);
    const sandH = height - shorePx;
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${sandH.toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.22).toFixed(2)}" filter="url(#${sandLitId})"/>`
    );

    // ── 5c. Fine sand grain overlay (high-frequency alpha texture)
    const fineGrainId = `${id}-fgrain`;
    defs.push(`<filter id="${fineGrainId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="1.5 0.8" numOctaves="2" seed="${texSeed + 1}" result="fg"/>
  <feColorMatrix in="fg" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.14 0" result="fga"/>
  <feComposite in="fga" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${sandH.toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.30).toFixed(2)}" filter="url(#${fineGrainId})"/>`
    );

    // ── 5d. Wind ripple texture on dry sand — anisotropic feDiffuseLighting
    const sandRippleId = `${id}-srip`;
    defs.push(`<filter id="${sandRippleId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.12 0.009" numOctaves="4" seed="${texSeed + 3}" result="rip"/>
  <feDiffuseLighting in="rip" surfaceScale="1.5" diffuseConstant="0.6" result="litRip" lighting-color="#c8b088">
    <feDistantLight azimuth="230" elevation="28"/>
  </feDiffuseLighting>
  <feComposite in="litRip" in2="SourceGraphic" operator="in"/>
</filter>`);
    // Only on the lower dry sand portion
    const drySandY = shorePx + sandH * 0.25;
    const drySandH = sandH * 0.75;
    elems.push(
      `<rect x="0" y="${drySandY.toFixed(0)}" width="${width}" height="${drySandH.toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.12).toFixed(2)}" filter="url(#${sandRippleId})"/>`
    );

    // ── 5e. Specular highlights — sand grains catching moonlight/starlight
    const sandSpecId = `${id}-sspec`;
    defs.push(`<filter id="${sandSpecId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.5 0.35" numOctaves="3" seed="${texSeed + 5}" result="specB"/>
  <feSpecularLighting in="specB" surfaceScale="3" specularConstant="0.5" specularExponent="22" result="sandGlint" lighting-color="#e0d8c8">
    <feDistantLight azimuth="220" elevation="50"/>
  </feSpecularLighting>
  <feComposite in="sandGlint" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${sandH.toFixed(0)}" fill="#ffffff" opacity="${(opacity * 0.025).toFixed(3)}" filter="url(#${sandSpecId})"/>`
    );

    // ── 5f. Wet-sand tidal lines — faint horizontal wave marks on the sand
    for (let i = 0; i < 7; i++) {
      const tidY = shorePx + (0.02 + i * 0.035 + rng() * 0.012) * sandH;
      const tidAmp = (1.2 + rng() * 2.5) * sc;
      const tidPts = waveContour(tidY, tidAmp, 15 + i * 3.3);
      const tidPath = smoothPath(tidPts);
      const tidOp = (0.06 + rng() * 0.07).toFixed(2);
      // Dark tidal line
      elems.push(
        `<path d="${tidPath}" fill="none" stroke="${waterColor}" stroke-width="${(0.6 * sc).toFixed(1)}" opacity="${(parseFloat(tidOp) * 0.5).toFixed(3)}" stroke-linecap="round"/>`
      );
      // Light edge on the upper side (dried salt/foam residue)
      elems.push(
        `<path d="${tidPath}" fill="none" stroke="${foamColor}" stroke-width="${(0.4 * sc).toFixed(1)}" opacity="${tidOp}" stroke-linecap="round"/>`
      );
    }

    // ── 5g. Coarse colour variation patches — larger tonal shifts in sand colour
    const sandPatchId = `${id}-spatch`;
    defs.push(`<filter id="${sandPatchId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.008 0.005" numOctaves="3" seed="${texSeed + 8}" result="p"/>
  <feColorMatrix in="p" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.5 0 0 0 -1.0" result="pm"/>
  <feGaussianBlur in="pm" stdDeviation="3" result="sp"/>
  <feComposite in="sp" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${sandH.toFixed(0)}" fill="#6a5540" opacity="${(opacity * 0.06).toFixed(3)}" filter="url(#${sandPatchId})"/>`
    );

    // ── 6. Wet-sand specular streak (sky reflection on freshly-wet sand)
    defs.push(`<linearGradient id="${id}-spec" x1="0" y1="${shorePx.toFixed(0)}" x2="0" y2="${(shorePx + sandH * 0.12).toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${foamColor}" stop-opacity="${(opacity * 0.32).toFixed(2)}"/>
  <stop offset="50%" stop-color="${foamColor}" stop-opacity="${(opacity * 0.18).toFixed(2)}"/>
  <stop offset="100%" stop-color="${foamColor}" stop-opacity="0"/>
</linearGradient>`);
    const specH = sandH * 0.12;
    elems.push(
      `<rect x="0" y="${shorePx.toFixed(0)}" width="${width}" height="${specH.toFixed(0)}" fill="url(#${id}-spec)"/>`
    );
  }

  // ── 7. BIOLUMINESCENCE — glowing turquoise plankton along wave crests
  if (bioluminescent) {
    const bioGlowId = `${id}-bioglow`;
    defs.push(
      `<filter id="${bioGlowId}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(2.5 * sc).toFixed(1)}"/></filter>`
    );
    // Bio-luminescent wave crests — follow the natural wave contours
    for (let w = 0; w < waves; w++) {
      const wT = w / Math.max(1, waves - 1);
      const bBaseY = horizonPx + (0.25 + wT * 0.72) * oceanH;
      const bAmp = (3 + wT * 6) * sc;
      const bPhase = w * 2.7 + rng() * 5;
      const bioCrest = waveContour(bBaseY, bAmp, bPhase, 50);
      // Take random segments of the crest for organic broken glow
      const segCount = 3 + Math.floor(rng() * 3);
      for (let seg = 0; seg < segCount; seg++) {
        const segStart = Math.floor(rng() * (bioCrest.length - 10));
        const segLen = 6 + Math.floor(rng() * 15);
        const segPts = bioCrest.slice(segStart, segStart + segLen);
        if (segPts.length < 3) continue;
        const segPath = smoothPath(segPts);
        const bsw = (1.5 + rng() * 2.5) * sc;
        const bOp = (0.30 + rng() * 0.45).toFixed(2);
        // Outer glow pass
        elems.push(
          `<path d="${segPath}" fill="none" stroke="${bioluminescenceColor}" stroke-width="${(bsw * 4).toFixed(1)}" opacity="${(parseFloat(bOp) * 0.35).toFixed(3)}" stroke-linecap="round" filter="url(#${bioGlowId})"/>`
        );
        // Crisp core
        elems.push(
          `<path d="${segPath}" fill="none" stroke="${bioluminescenceColor}" stroke-width="${bsw.toFixed(1)}" opacity="${bOp}" stroke-linecap="round"/>`
        );
      }
    }
    // Bioluminescent specks scattered in the wave zone
    for (let i = 0; i < 60; i++) {
      const sy = horizonPx + (0.15 + rng() * 0.85) * oceanH;
      const sx = rng() * width;
      const sr = (0.7 + rng() * 1.8) * sc;
      const sOp = (0.20 + rng() * 0.55).toFixed(2);
      elems.push(
        `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(sr * 3).toFixed(2)}" fill="${bioluminescenceColor}" opacity="${(parseFloat(sOp) * 0.3).toFixed(2)}" filter="url(#${bioGlowId})"/>`
      );
      elems.push(
        `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(2)}" fill="${bioluminescenceColor}" opacity="${sOp}"/>`
      );
    }
  }

  // ── 8. Pebbles / shells — small dark dots scattered on the sand
  const debrisCount = 20;
  for (let i = 0; i < debrisCount; i++) {
    const dY = shorePx + (0.06 + rng() * 0.85) * (height - shorePx);
    const dX = rng() * width;
    const dr = (0.5 + rng() * 1.2) * sc;
    const dOp = (opacity * (0.4 + rng() * 0.35)).toFixed(2);
    elems.push(
      `<circle cx="${dX.toFixed(1)}" cy="${dY.toFixed(1)}" r="${dr.toFixed(2)}" fill="${waterColor}" opacity="${dOp}"/>`
    );
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ── Water Current Brick ──────────────────────────────────────────────────────

export interface WaterCurrentBrickOptions {
  id?: string;
  /** Vertical center of the current zone (fraction of canvas height) */
  cy?: number;
  /** Vertical extent of the current zone (fraction of height) */
  zoneHeight?: number;
  /** Current color */
  color: string;
  /** Overall opacity */
  opacity?: number;
  /** Number of distinct current layers */
  layers?: number;
  seed?: number;
}

/**
 * Volumetric water current — uses anisotropic feTurbulence (very high X, very low Y)
 * to create horizontal streaming flow patterns rather than flat horizontal bands.
 *
 * Unlike cloudBandBrick (which creates a single masked rect that looks like a sine wave),
 * waterCurrentBrick creates:
 *  - Multiple overlapping turbulence passes at different scales
 *  - feDisplacementMap for the characteristic streaming, swirling current motion
 *  - Varying opacity across the zone (bright core, fading edges)
 *  - Subtle color variation between layers (warm/cool pressure differentials)
 */
export function waterCurrentBrick(
  params: BrickParams,
  options: WaterCurrentBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const { cy = 0.5, zoneHeight = 0.25, color, opacity = 0.25, layers = 3, id = "wcurr" } = options;

  const baseSeed = options.seed ?? (hashStr(`${seedId}-${harmonyMode}-wcurr`) % 89) + 1;
  const rng = seedRng(baseSeed);

  const defs: string[] = [];
  const elems: string[] = [];

  const pct = (y: number) => `${((y / height) * 100).toFixed(2)}%`;

  for (let li = 0; li < layers; li++) {
    const seed1 = Math.floor(rng() * 89) + 1;
    const seed2 = Math.floor(rng() * 89) + 1;
    const layerOp = opacity * (0.5 + rng() * 0.5) * (1 - li * 0.2);
    // Offset each layer's vertical center slightly for depth stacking
    const lCy = cy + (rng() - 0.5) * zoneHeight * 0.4;
    const lZoneTop = Math.max(0, lCy - zoneHeight * 0.55) * height;
    const lZoneBot = Math.min(height, lCy + zoneHeight * 0.55) * height;
    const lZoneH = lZoneBot - lZoneTop;

    // Very anisotropic: high X freq (streaming columns), very low Y freq (horizontal flow)
    const freqX = (0.008 + rng() * 0.006).toFixed(4); // ~0.008-0.014 → 70-125px streams
    const freqY = (0.0005 + rng() * 0.0005).toFixed(4); // ~0.0005-0.001 → nearly horizontal
    const dispScale = (scale * (0.008 + rng() * 0.006)).toFixed(0);
    const blur = (scale * 0.003).toFixed(1);

    const lgId = `${id}-lg${li}`;
    const fId = `${id}-f${li}`;

    defs.push(
      `<linearGradient id="${lgId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="${pct(lZoneTop)}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="${pct(lZoneTop + lZoneH * 0.15)}" stop-color="${color}" stop-opacity="${(layerOp * 0.6).toFixed(2)}"/>
  <stop offset="${pct(lZoneTop + lZoneH * 0.5)}" stop-color="${color}" stop-opacity="${layerOp.toFixed(2)}"/>
  <stop offset="${pct(lZoneBot - lZoneH * 0.15)}" stop-color="${color}" stop-opacity="${(layerOp * 0.6).toFixed(2)}"/>
  <stop offset="${pct(Math.min(height, lZoneBot + lZoneH * 0.3))}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>
<filter id="${fId}" x="-5%" y="0%" width="110%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${freqX} ${freqY}" numOctaves="4" seed="${seed1}" result="flow"/>
  <feColorMatrix in="flow" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.5 0 0 0 -1.2" result="flowMask"/>
  <feGaussianBlur in="flowMask" stdDeviation="${blur} ${(Number(blur) * 4).toFixed(1)}" result="softFlow"/>
  <feComposite in="SourceGraphic" in2="softFlow" operator="in" result="currentLayer"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.003 0.0002" numOctaves="2" seed="${seed2}" result="drift"/>
  <feDisplacementMap in="currentLayer" in2="drift" scale="${dispScale}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`
    );
    elems.push(
      `<rect width="${width}" height="${height}" fill="url(#${lgId})" filter="url(#${fId})"/>`
    );
  }

  return {
    defs: defs.join("\n"),
    elements: elems.join("\n"),
  };
}
