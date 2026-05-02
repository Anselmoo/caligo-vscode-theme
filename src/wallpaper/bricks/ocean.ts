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
  const rng = seedRng(baseSeed);

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
    const topY = py - bellRy;

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

  const zoneTopPx = Math.max(0, cy - zoneHeight / 2) * height;
  const zoneBottomPx = Math.min(height, cy + zoneHeight / 2) * height;
  const zoneHPx = zoneBottomPx - zoneTopPx;
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
    const dispSeedId = `${id}-ds${li}`;

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
