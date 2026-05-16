/**
 * Fire / smoke / lava bricks — recognizable scene-specific sub-components.
 *
 * smokeRisingBrick — vertical smoke plumes (NOT horizontal cloudBandBrick bands).
 *   Uses bottom-to-top linearGradient so smoke appears to rise from a source.
 *   Anisotropic feTurbulence (wide X columns, displaced laterally) creates the
 *   characteristic billowing columns of volcanic / forest-fire smoke.
 *
 * campfireFlameBrick — actual flame tongue shapes using bezier paths.
 *   Each flame is a pointed teardrop SVG path filled with a hot→warm gradient.
 *   4-7 overlapping flames at different heights and widths for realistic layering.
 *
 * lavaRiverBrick — sinuous lava river paths down a slope.
 *   Generates winding stroke paths with hot-core / glowing-edge layering.
 *   Looks like real pahoehoe lava channels, not just a radial gradient blob.
 */

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

// ── Smoke Rising Brick ───────────────────────────────────────────────────────

export interface SmokeRisingBrickOptions {
  id?: string;
  /** Source Y level — smoke rises FROM this Y upward (fraction of height) */
  sourceY?: number;
  /** How high the smoke reaches (fraction of height above sourceY) */
  riseHeight?: number;
  /** Horizontal spread around center (fraction of width) */
  spreadX?: number;
  color?: string;
  opacity?: number;
  /** Number of overlapping smoke column passes */
  columns?: number;
  seed?: number;
}

/**
 * Vertical rising smoke — columns emerge from sourceY and drift upward,
 * billowing wider and fading as they rise. Critically different from
 * cloudBandBrick: the gradient runs BOTTOM→TOP (source→dissipation)
 * and the turbulence creates wide, shifting VERTICAL plumes.
 */
export function smokeRisingBrick(
  params: BrickParams,
  options: SmokeRisingBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    sourceY = 0.6,
    riseHeight = 0.5,
    spreadX = 0.6,
    color = "#888888",
    opacity = 0.35,
    columns = 3,
    id = "smoke",
  } = options;
  const baseSeed = options.seed ?? (hashStr(`${seedId}-${harmonyMode}-smoke`) % 89) + 1;
  const rng = seedRng(baseSeed);

  const sourcePx = sourceY * height;
  const topPx = Math.max(0, (sourceY - riseHeight) * height);
  const riseH = sourcePx - topPx;
  const xCenter = width * 0.5;
  const xSpread = width * spreadX;

  const defs: string[] = [];
  const elems: string[] = [];

  const pp = (y: number) => `${((y / height) * 100).toFixed(2)}%`;

  for (let ci = 0; ci < columns; ci++) {
    const seed1 = Math.floor(rng() * 89) + 1;
    const seed2 = Math.floor(rng() * 89) + 1;
    const colOp = opacity * (0.5 + rng() * 0.5);
    // Each column drifts horizontally from center
    const drift = (rng() - 0.5) * xSpread * 0.7;
    const colCx = xCenter + drift;
    // Wider plumes with soft organic shapes (lower freqX → bigger swirls)
    const colFreqX = (0.0015 + rng() * 0.002).toFixed(4);
    const colFreqY = (0.0004 + rng() * 0.0005).toFixed(4);
    const dispScale = (scale * (0.022 + rng() * 0.015)).toFixed(0);
    const hBlur = (scale * (0.008 + rng() * 0.006)).toFixed(1);
    const vBlur = (scale * (0.016 + rng() * 0.012)).toFixed(1);

    const gId = `${id}-g${ci}`;
    const fId = `${id}-f${ci}`;
    const maskId = `${id}-m${ci}`;

    // Radial-gradient mask → soft horizontal fade (no hard rect edges)
    const colW = xSpread * (0.35 + rng() * 0.25);
    defs.push(
      `<mask id="${maskId}">
  <radialGradient id="${maskId}-rg" cx="${colCx.toFixed(1)}" cy="${((topPx + sourcePx) * 0.5).toFixed(1)}" rx="${(colW * 0.55).toFixed(1)}" ry="${(riseH * 0.55).toFixed(1)}" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="white" stop-opacity="1"/>
    <stop offset="65%" stop-color="white" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
  <rect width="${width}" height="${height}" fill="url(#${maskId}-rg)"/>
</mask>`
    );

    // Vertical opacity gradient (source bright, dissipation faded)
    defs.push(
      `<linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="${pp(topPx)}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="${pp(topPx + riseH * 0.2)}" stop-color="${color}" stop-opacity="${(colOp * 0.15).toFixed(2)}"/>
  <stop offset="${pp(topPx + riseH * 0.5)}" stop-color="${color}" stop-opacity="${(colOp * 0.55).toFixed(2)}"/>
  <stop offset="${pp(sourcePx - riseH * 0.05)}" stop-color="${color}" stop-opacity="${(colOp * 0.95).toFixed(2)}"/>
  <stop offset="${pp(sourcePx)}" stop-color="${color}" stop-opacity="${colOp.toFixed(2)}"/>
  <stop offset="${pp(Math.min(height, sourcePx + riseH * 0.05))}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>
<filter id="${fId}" x="-40%" y="-5%" width="180%" height="110%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${colFreqX} ${colFreqY}" numOctaves="5" seed="${seed1}" result="cols"/>
  <!-- Softer threshold for wispy organic shapes, not hard blocks -->
  <feColorMatrix in="cols" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  4.0 0 0 0 -1.2" result="colMask"/>
  <feGaussianBlur in="colMask" stdDeviation="${hBlur} ${vBlur}" result="softCols"/>
  <feComposite in="SourceGraphic" in2="softCols" operator="in" result="plume"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.003 0.0008" numOctaves="3" seed="${seed2}" result="drift"/>
  <feDisplacementMap in="plume" in2="drift" scale="${dispScale}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`
    );

    // Full-width rect with radial mask → organically shaped plume, no hard edges
    elems.push(
      `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${gId})" filter="url(#${fId})" mask="url(#${maskId})"/>`
    );
  }

  return { defs: defs.join("\n"), elements: elems.join("\n") };
}

// ── Campfire Flame Brick ─────────────────────────────────────────────────────

export interface CampfireFlameBrickOptions {
  id?: string;
  /** Horizontal center of the fire (fraction of width) */
  cx?: number;
  /** Vertical position of the fire BASE (fraction of height, e.g. 0.8) */
  baseY?: number;
  /** Max flame height as fraction of canvas height */
  flameHeight?: number;
  /** Fire base width as fraction of width */
  baseWidth?: number;
  /** Hot core color (top of flame) */
  hotColor?: string;
  /** Warm base color */
  warmColor?: string;
  /** Overall opacity */
  opacity?: number;
  seed?: number;
}

/**
 * Campfire / bonfire flames — anatomically correct SVG flame shapes.
 *
 * Each flame tongue is a bezier path: wide at the base, narrowing to a pointed
 * tip. Overlapping flames at different heights and widths create a realistic
 * layered fire. Front-to-back depth via size: tallest/widest = central core,
 * shorter/narrower = outer flickers.
 *
 * Flame path structure:
 *  M(base-left) C(ctrl-left-rise)(ctrl-left-taper)(tip) C(ctrl-right-taper)(ctrl-right-rise)(base-right)
 */
export function campfireFlameBrick(
  params: BrickParams,
  options: CampfireFlameBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    cx = 0.5,
    baseY = 0.82,
    flameHeight = 0.12,
    baseWidth = 0.06,
    hotColor = "#fff8c0",
    warmColor = "#ff6a00",
    opacity = 0.85,
    id = "flame",
  } = options;

  const rng = seedRng(options.seed ?? hashStr(`${seedId}-${harmonyMode}-flame`));

  const px = cx * width;
  const py = baseY * height;
  const bw = baseWidth * width;
  const fh = flameHeight * height;

  const defs: string[] = [];
  const elems: string[] = [];

  // Glow filter behind the flames
  const glowId = `${id}-glow`;
  defs.push(
    `<filter id="${glowId}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${(scale * 0.008).toFixed(1)}"/></filter>`
  );

  // 5-7 overlapping flame tongues, from back (large, dark) to front (small, bright)
  const flameCount = 5 + Math.floor(rng() * 3);
  const flameShapes: string[] = [];
  const gradDefs: string[] = [];

  for (let fi = 0; fi < flameCount; fi++) {
    // Each flame varies in size, tilt, and heat level
    const isFront = fi >= flameCount - 2;
    const sizeScale = isFront ? 0.4 + rng() * 0.3 : 0.6 + rng() * 0.5;
    const fw = bw * sizeScale * (0.7 + rng() * 0.6); // flame width
    const fhLocal = fh * sizeScale * (0.6 + rng() * 0.7); // flame height
    const tilt = (rng() - 0.5) * fw * 0.5; // tip leans left/right
    const xOffset = (rng() - 0.5) * bw * 0.6;

    const bx = px + xOffset;
    const tipX = bx + tilt;
    const tipY = py - fhLocal;

    // Control points for organic flame shape
    // Left side: rise from base-left toward tip
    const cl1x = bx - fw / 2 + (rng() - 0.5) * fw * 0.2;
    const cl1y = py - fhLocal * 0.35;
    const cl2x = tipX - fw * 0.15 + (rng() - 0.3) * fw * 0.2;
    const cl2y = tipY + fhLocal * 0.15;
    // Right side: symmetric with asymmetric jitter
    const cr1x = tipX + fw * 0.15 + (rng() - 0.5) * fw * 0.2;
    const cr1y = tipY + fhLocal * 0.2;
    const cr2x = bx + fw / 2 + (rng() - 0.5) * fw * 0.2;
    const cr2y = py - fhLocal * 0.3;

    const d = `M ${fmt(bx - fw / 2)},${fmt(py)} C ${fmt(cl1x)},${fmt(cl1y)} ${fmt(cl2x)},${fmt(cl2y)} ${fmt(tipX)},${fmt(tipY)} C ${fmt(cr1x)},${fmt(cr1y)} ${fmt(cr2x)},${fmt(cr2y)} ${fmt(bx + fw / 2)},${fmt(py)} Z`;

    // Gradient for this flame: hot at tip, warm at base
    const fgId = `${id}-fg${fi}`;
    const flameOp = opacity * (isFront ? 0.9 : 0.55 + rng() * 0.3);
    const tipOpacity = isFront ? 0.95 : 0.7 + rng() * 0.2;
    gradDefs.push(
      `<linearGradient id="${fgId}" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
  <stop offset="0%" stop-color="${warmColor}" stop-opacity="${(flameOp * 0.85).toFixed(2)}"/>
  <stop offset="35%" stop-color="${isFront ? "#ffcc44" : warmColor}" stop-opacity="${(flameOp * 0.9).toFixed(2)}"/>
  <stop offset="75%" stop-color="${hotColor}" stop-opacity="${(flameOp * tipOpacity).toFixed(2)}"/>
  <stop offset="100%" stop-color="${hotColor}" stop-opacity="0"/>
</linearGradient>`
    );

    flameShapes.push(`<path d="${d}" fill="url(#${fgId})"/>`);
  }

  defs.push(gradDefs.join("\n"));

  // Soft outer glow (back layer)
  const glowGradId = `${id}-gg`;
  defs.push(
    `<radialGradient id="${glowGradId}" cx="${fmt(px)}" cy="${fmt(py - fh * 0.3)}" r="${fmt(bw * 2.5)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${warmColor}" stop-opacity="${(opacity * 0.55).toFixed(2)}"/>
  <stop offset="45%" stop-color="${warmColor}" stop-opacity="${(opacity * 0.15).toFixed(2)}"/>
  <stop offset="100%" stop-color="${warmColor}" stop-opacity="0"/>
</radialGradient>`
  );
  elems.push(
    `<ellipse cx="${fmt(px)}" cy="${fmt(py - fh * 0.3)}" rx="${fmt(bw * 2.5)}" ry="${fmt(fh * 1.2)}" fill="url(#${glowGradId})" filter="url(#${glowId})"/>`
  );

  // Render flames back-to-front
  elems.push(`<g id="${id}">${flameShapes.join("\n")}</g>`);

  // Hot bright core at flame base (the actual burning point)
  const coreId = `${id}-core`;
  defs.push(
    `<radialGradient id="${coreId}" cx="${fmt(px)}" cy="${fmt(py - fh * 0.08)}" r="${fmt(bw * 0.6)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="${(opacity * 0.9).toFixed(2)}"/>
  <stop offset="30%" stop-color="${hotColor}" stop-opacity="${(opacity * 0.7).toFixed(2)}"/>
  <stop offset="100%" stop-color="${warmColor}" stop-opacity="0"/>
</radialGradient>`
  );
  elems.push(
    `<ellipse cx="${fmt(px)}" cy="${fmt(py - fh * 0.08)}" rx="${fmt(bw * 0.6)}" ry="${fmt(fh * 0.18)}" fill="url(#${coreId})"/>`
  );

  return { defs: defs.join("\n"), elements: elems.join("\n") };
}

// ── Lava River Brick ─────────────────────────────────────────────────────────

export interface LavaRiverBrickOptions {
  id?: string;
  /** Y level where lava rivers start (fraction of height) */
  startY?: number;
  /** Y level where lava rivers end at bottom (fraction of height) */
  endY?: number;
  /** Horizontal center zone (fraction of width) */
  cx?: number;
  /** Spread of rivers across canvas (fraction of width) */
  spreadX?: number;
  /** Number of lava channels */
  rivers?: number;
  hotColor?: string;
  glowColor?: string;
  opacity?: number;
  seed?: number;
}

/**
 * Lava river system — inverted rendering model for realistic volcanic flow:
 *
 *  1. HEAT GLOW AURA — shaped to follow the river path (not rectangular)
 *  2. BRIGHT LAVA FLOW BASE — single sinuous river as a filled closed polygon
 *  3. DARK ROCK CRUST OVERLAY — feTurbulence clipped to river shape (no rectangle)
 *  4. BRIGHT HOT CRACKS — secondary turbulence also clipped to river shape
 *  5. STEAM/HEAT SHIMMER wisps above the river
 *
 * Key: clipPath on crust/crack overlays eliminates visible rectangular boundaries.
 * Single wide sinuous river reads as a natural flow, not separate columns.
 */
export function lavaRiverBrick(params: BrickParams, options: LavaRiverBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 960;
  const {
    startY = 0.32,
    endY = 0.92,
    cx = 0.5,
    spreadX = 0.7,
    hotColor = "#fff0a0",
    glowColor = "#ff3a00",
    opacity = 0.85,
    id = "lava",
  } = options;

  const rng = seedRng(options.seed ?? hashStr(`${seedId}-${harmonyMode}-lava`));
  const startPx = startY * height;
  const endPx = endY * height;
  const cxPx = cx * width;
  const spreadPx = spreadX * width;
  const lavaH = endPx - startPx;

  const defs: string[] = [];
  const elems: string[] = [];

  // ── Build SINGLE sinuous river shape ──────────────────────────────────────
  // One main river with variable width, meandering across the scene.
  const segments = 14;
  const segH = lavaH / segments;
  const leftPts: [number, number][] = [];
  const rightPts: [number, number][] = [];
  let xCenter = cxPx + (rng() - 0.5) * spreadPx * 0.2;

  for (let s = 0; s <= segments; s++) {
    const y = startPx + s * segH;
    const t = s / segments;
    // Width: narrow at source (top), widens to middle, stays wide to bottom
    const widthMul = Math.min(1, t * 2.5) * 0.7 + 0.3;
    const halfW = (25 + rng() * 40) * sc * widthMul;
    // Stronger meander — river snakes across the scene
    xCenter += (rng() - 0.5) * 35 * sc;
    xCenter = Math.max(cxPx - spreadPx * 0.35, Math.min(cxPx + spreadPx * 0.35, xCenter));
    const lj = (rng() - 0.5) * halfW * 0.4;
    const rj = (rng() - 0.5) * halfW * 0.4;
    leftPts.push([xCenter - halfW + lj, y]);
    rightPts.push([xCenter + halfW + rj, y]);
  }

  // Build closed path: left edge down, right edge back up
  let riverD = `M ${leftPts[0][0].toFixed(1)},${leftPts[0][1].toFixed(1)}`;
  for (let i = 1; i < leftPts.length; i++) {
    const prev = leftPts[i - 1];
    const curr = leftPts[i];
    const cpY = (prev[1] + curr[1]) / 2;
    riverD += ` C ${prev[0].toFixed(1)},${cpY.toFixed(1)} ${curr[0].toFixed(1)},${cpY.toFixed(1)} ${curr[0].toFixed(1)},${curr[1].toFixed(1)}`;
  }
  riverD += ` L ${rightPts[rightPts.length - 1][0].toFixed(1)},${rightPts[rightPts.length - 1][1].toFixed(1)}`;
  for (let i = rightPts.length - 2; i >= 0; i--) {
    const prev = rightPts[i + 1];
    const curr = rightPts[i];
    const cpY = (prev[1] + curr[1]) / 2;
    riverD += ` C ${prev[0].toFixed(1)},${cpY.toFixed(1)} ${curr[0].toFixed(1)},${cpY.toFixed(1)} ${curr[0].toFixed(1)},${curr[1].toFixed(1)}`;
  }
  riverD += " Z";

  // ── ClipPath for overlays to match river shape ────────────────────────────
  const clipId = `${id}-clip`;
  defs.push(`<clipPath id="${clipId}"><path d="${riverD}"/></clipPath>`);

  // ── 1. HEAT GLOW AURA — follows river shape (blurred version of the path)
  const auraBlurId = `${id}-ab`;
  defs.push(`<filter id="${auraBlurId}" x="-40%" y="-20%" width="180%" height="140%"><feGaussianBlur stdDeviation="${(25 * sc).toFixed(1)}"/></filter>`);
  elems.push(`<path d="${riverD}" fill="${glowColor}" opacity="${(opacity * 0.3).toFixed(2)}" filter="url(#${auraBlurId})"/>`);

  // ── 2. BRIGHT LAVA FLOW BASE — filled river shape with hot gradient
  const flowGradId = `${id}-fg`;
  defs.push(`<linearGradient id="${flowGradId}" x1="0" y1="${startPx.toFixed(0)}" x2="0" y2="${endPx.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${hotColor}" stop-opacity="${opacity.toFixed(2)}"/>
  <stop offset="20%" stop-color="#ffa030" stop-opacity="${(opacity * 0.95).toFixed(2)}"/>
  <stop offset="50%" stop-color="${glowColor}" stop-opacity="${(opacity * 0.88).toFixed(2)}"/>
  <stop offset="75%" stop-color="#aa2000" stop-opacity="${(opacity * 0.75).toFixed(2)}"/>
  <stop offset="100%" stop-color="#5a0a00" stop-opacity="${(opacity * 0.55).toFixed(2)}"/>
</linearGradient>`);
  // Soft outer glow
  const flowBlurId = `${id}-fb`;
  defs.push(`<filter id="${flowBlurId}" x="-15%" y="-5%" width="130%" height="110%"><feGaussianBlur stdDeviation="${(4 * sc).toFixed(1)}"/></filter>`);
  elems.push(`<path d="${riverD}" fill="url(#${flowGradId})" opacity="${(opacity * 0.5).toFixed(2)}" filter="url(#${flowBlurId})"/>`);
  // Main flow body
  elems.push(`<path d="${riverD}" fill="url(#${flowGradId})" opacity="${(opacity * 0.9).toFixed(2)}"/>`);

  // ── 3. DARK CRUST OVERLAY — clipped to river shape (no rectangular boundary!)
  const crustSeed = Math.floor(rng() * 89) + 1;
  const crustId = `${id}-crust`;
  defs.push(`<filter id="${crustId}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.025 0.015" numOctaves="5" seed="${crustSeed}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 0 0.01  5.0 0 0 0 -1.8" result="crust"/>
  <feGaussianBlur in="crust" stdDeviation="0.8" result="softCrust"/>
  <feComposite in="softCrust" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(`<rect x="0" y="${startPx.toFixed(0)}" width="${width}" height="${lavaH.toFixed(0)}" fill="#0a0204" opacity="${(opacity * 0.75).toFixed(2)}" filter="url(#${crustId})" clip-path="url(#${clipId})"/>`);

  // ── 4. BRIGHT HOT CRACKS — also clipped to river shape
  const crackSeed = crustSeed + 13;
  const crackId = `${id}-crack`;
  defs.push(`<filter id="${crackId}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.035 0.018" numOctaves="4" seed="${crackSeed}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  8.0 0 0 0 -3.5" result="cracks"/>
  <feGaussianBlur in="cracks" stdDeviation="0.5"/>
  <feComposite operator="in" in2="SourceGraphic"/>
</filter>`);
  elems.push(`<rect x="0" y="${startPx.toFixed(0)}" width="${width}" height="${lavaH.toFixed(0)}" fill="${hotColor}" opacity="${(opacity * 0.5).toFixed(2)}" filter="url(#${crackId})" clip-path="url(#${clipId})"/>`);

  // ── 5. STEAM/HEAT SHIMMER wisps above the river source
  for (let s = 0; s < 4; s++) {
    const sx = leftPts[0][0] + rng() * (rightPts[0][0] - leftPts[0][0]);
    const sy = startPx - (5 + rng() * 25) * sc;
    const sr = (12 + rng() * 20) * sc;
    elems.push(`<ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="${sr.toFixed(1)}" ry="${(sr * 0.6).toFixed(1)}" fill="#bfb0a0" opacity="${(0.06 + rng() * 0.06).toFixed(3)}"/>`);
  }

  return { defs: defs.join("\n"), elements: elems.join("\n") };
}
