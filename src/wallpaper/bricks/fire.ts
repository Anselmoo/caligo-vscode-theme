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
    opacity = 0.2,
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
    // Smoke column width: starts narrower at source, widens as it rises
    // We control this via turbulence column frequency
    const colFreqX = (0.006 + rng() * 0.006).toFixed(4); // wide columns (0.006-0.012)
    const colFreqY = (0.0008 + rng() * 0.0006).toFixed(4); // tall vertical structure
    const dispScale = (scale * (0.012 + rng() * 0.01)).toFixed(0);
    const hBlur = (scale * (0.008 + rng() * 0.006)).toFixed(1); // wider than aurora
    const vBlur = (scale * (0.006 + rng() * 0.005)).toFixed(1); // vertical blur = rising

    // Gradient: smoke rises from sourceY to topPx
    // Opacity peaks just above source (dense base), fades to zero at top
    const gId = `${id}-g${ci}`;
    const fId = `${id}-f${ci}`;

    defs.push(
      `<linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="${pp(topPx)}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="${pp(topPx + riseH * 0.12)}" stop-color="${color}" stop-opacity="${(colOp * 0.25).toFixed(2)}"/>
  <stop offset="${pp(topPx + riseH * 0.45)}" stop-color="${color}" stop-opacity="${(colOp * 0.55).toFixed(2)}"/>
  <stop offset="${pp(sourcePx - riseH * 0.08)}" stop-color="${color}" stop-opacity="${(colOp * 0.8).toFixed(2)}"/>
  <stop offset="${pp(sourcePx)}" stop-color="${color}" stop-opacity="${(colOp * 0.95).toFixed(2)}"/>
  <stop offset="${pp(Math.min(height, sourcePx + riseH * 0.15))}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>
<filter id="${fId}" x="-30%" y="0%" width="160%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${colFreqX} ${colFreqY}" numOctaves="5" seed="${seed1}" result="cols"/>
  <feColorMatrix in="cols" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5.5 0 0 0 -2.2" result="colMask"/>
  <feGaussianBlur in="colMask" stdDeviation="${hBlur} ${vBlur}" result="softCols"/>
  <feComposite in="SourceGraphic" in2="softCols" operator="in" result="plume"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.004 0.001" numOctaves="3" seed="${seed2}" result="drift"/>
  <feDisplacementMap in="plume" in2="drift" scale="${dispScale}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`
    );

    // Constrain rect horizontally to the spread zone so smoke comes from the right source
    const rectX = Math.max(0, colCx - xSpread / 2);
    const rectW = Math.min(width - rectX, xSpread);
    elems.push(
      `<rect x="${fmt(rectX)}" y="0" width="${fmt(rectW)}" height="${height}" fill="url(#${gId})" filter="url(#${fId})"/>`
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
 * Sinuous lava river channels flowing down a volcanic slope.
 *
 * Each river is a 4-5 segment cubic bezier path, meandering from startY to endY.
 * Rendered in 3 passes:
 *  1. Wide blurred outer glow (heat signature)
 *  2. Medium stroke (lava channel body)
 *  3. Thin bright core (hottest, fresh lava center)
 *
 * Channels widen near the bottom (pooling) and narrow at the source.
 */
export function lavaRiverBrick(params: BrickParams, options: LavaRiverBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    startY = 0.45,
    endY = 0.85,
    cx = 0.5,
    spreadX = 0.6,
    rivers = 4,
    hotColor = "#ffdd44",
    glowColor = "#ff4400",
    opacity = 0.8,
    id = "lava",
  } = options;

  const rng = seedRng(options.seed ?? hashStr(`${seedId}-${harmonyMode}-lava`));

  const startPx = startY * height;
  const endPx = endY * height;
  const cxPx = cx * width;
  const spreadPx = spreadX * width;

  const defs: string[] = [];
  const elems: string[] = [];

  // Glow filter
  const glowFiltId = `${id}-gf`;
  defs.push(
    `<filter id="${glowFiltId}" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="${(scale * 0.006).toFixed(1)}"/></filter>`
  );

  const riverPaths: string[] = [];
  const glowPaths: string[] = [];
  const corePaths: string[] = [];

  for (let ri = 0; ri < rivers; ri++) {
    // Start position spread across the source zone
    const x0 = cxPx + (rng() - 0.5) * spreadPx * 0.5;

    // Build winding path with 4 segments from startY to endY
    const segCount = 4;
    const segH = (endPx - startPx) / segCount;
    const pts: [number, number][] = [[x0, startPx]];
    let xCurr = x0;

    for (let si = 1; si <= segCount; si++) {
      const y = startPx + si * segH;
      // Rivers meander left/right but generally follow the terrain
      // They widen toward the bottom (lava pool spreading)
      const wanderAmp = spreadPx * 0.12 * (1 + si * 0.15);
      xCurr += (rng() - 0.5) * wanderAmp;
      // Keep within canvas
      xCurr = Math.max(spreadPx * 0.05, Math.min(width - spreadPx * 0.05, xCurr));
      pts.push([xCurr, y]);
    }

    // Build smooth cubic bezier path through the points
    let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let pi = 1; pi < pts.length; pi++) {
      const [px1, py1] = pts[pi - 1];
      const [px2, py2] = pts[pi];
      const cpY = (py1 + py2) / 2;
      const wander = (rng() - 0.5) * spreadPx * 0.08;
      d += ` C ${(px1 + wander).toFixed(1)},${cpY.toFixed(1)} ${(px2 - wander).toFixed(1)},${cpY.toFixed(1)} ${px2.toFixed(1)},${py2.toFixed(1)}`;
    }

    // Stroke width increases toward bottom (pooling effect)
    const baseW = (scale * (0.002 + rng() * 0.002)).toFixed(1);
    const glowW = (scale * (0.008 + rng() * 0.004)).toFixed(1);
    const coreW = (scale * 0.001).toFixed(1);
    const rOp = (opacity * (0.55 + rng() * 0.35)).toFixed(2);

    glowPaths.push(
      `<path d="${d}" fill="none" stroke="${glowColor}" stroke-width="${glowW}" opacity="${rOp}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
    riverPaths.push(
      `<path d="${d}" fill="none" stroke="${glowColor}" stroke-width="${baseW}" opacity="${rOp}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
    corePaths.push(
      `<path d="${d}" fill="none" stroke="${hotColor}" stroke-width="${coreW}" opacity="${(opacity * 0.9).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  // Render: glow (blurred) → channel body → hot core
  elems.push(`<g id="${id}-glow" filter="url(#${glowFiltId})">${glowPaths.join("")}</g>`);
  elems.push(`<g id="${id}-body">${riverPaths.join("")}</g>`);
  elems.push(`<g id="${id}-core">${corePaths.join("")}</g>`);

  return { defs: defs.join("\n"), elements: elems.join("\n") };
}
