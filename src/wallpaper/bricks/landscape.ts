/**
 * Landscape bricks — high-level scene components for wallpaper-grade night scenes.
 *
 * Quality reference: each brick produces multi-layer SVG with:
 * - Multiple distinct visual layers (3–5 per element)
 * - Proper SVG filter chains (feTurbulence, feGaussianBlur, feMerge)
 * - linearGradient / radialGradient fills with multiple stops
 * - Detail elements (crater circles, snow caps, ripple paths, tree trunks)
 * - Scale normalization via `Math.max(width, height) / 2160`
 *
 * All curves use cubic Bézier paths (Catmull-Rom interpolation) for organic shapes.
 * Uses seeded PRNG for deterministic procedural generation.
 */
import type { BrickOutput, BrickParams } from "../types.js";

// ─── Seeded PRNG ────────────────────────────────────────────────────────────────

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

type Pt = [number, number];

// ─── Catmull-Rom to Cubic Bezier Conversion ─────────────────────────────────────

function catmullRomToBezierPath(pts: Pt[], closed = false): string {
  if (pts.length < 2) return "";
  const n = pts.length;
  const segments: string[] = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(n - 1, i + 1)];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    segments.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
    );
  }
  if (closed) segments.push("Z");
  return segments.join(" ");
}

function fractalNoise(rng: () => number, count: number, amp: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const n1 = (rng() - 0.5) * 2 * amp;
    const n2 = (rng() - 0.5) * amp * 0.5;
    const n3 = (rng() - 0.5) * amp * 0.25;
    values.push(n1 + n2 + n3);
  }
  return values;
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.replace("#", ""), 16);
  const pb = Number.parseInt(b.replace("#", ""), 16);
  const ra = (pa >> 16) & 0xff,
    ga = (pa >> 8) & 0xff,
    ba2 = pa & 0xff;
  const rb = (pb >> 16) & 0xff,
    gb = (pb >> 8) & 0xff,
    bb = pb & 0xff;
  const r = Math.round(ra + (rb - ra) * t);
  const g = Math.round(ga + (gb - ga) * t);
  const bl = Math.round(ba2 + (bb - ba2) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

// ─── Terrain Brick ──────────────────────────────────────────────────────────────

export interface TerrainBrickOptions {
  id?: string;
  baseY: number;
  roughness?: number;
  points?: number;
  color: string;
  opacity?: number;
  edgeBlur?: number;
  seedSuffix?: string;
  gradient?: { topColor: string; bottomColor: string };
  snowCaps?: boolean;
  snowColor?: string;
  ridgeHighlight?: boolean;
  ridgeHighlightColor?: string;
}

export function terrainBrick(params: BrickParams, options: TerrainBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const sc = Math.max(width, height) / 2160;
  const {
    baseY,
    roughness = 0.08,
    points = 24,
    color,
    opacity = 0.9,
    edgeBlur = 0,
    seedSuffix = "terrain",
    id = "terrain",
    gradient,
    snowCaps = false,
    snowColor = "#e8eaf0",
    ridgeHighlight = false,
    ridgeHighlightColor = "#ffffff",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${seedSuffix}`));
  const amp = roughness * height;
  const by = baseY * height;

  const noise = fractalNoise(rng, points + 1, amp);
  const ridgePts: Pt[] = [];
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const y = Math.max(0, Math.min(height, by + noise[i]));
    ridgePts.push([x, y]);
  }

  const curvePath = catmullRomToBezierPath(ridgePts);
  const polygon = `${curvePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

  const defs: string[] = [];
  let fillAttr = `fill="${color}"`;

  if (gradient) {
    defs.push(`<linearGradient id="${id}-grd" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${gradient.topColor}"/>
  <stop offset="40%" stop-color="${lerpColor(gradient.topColor, gradient.bottomColor, 0.4)}"/>
  <stop offset="100%" stop-color="${gradient.bottomColor}"/>
</linearGradient>`);
    fillAttr = `fill="url(#${id}-grd)"`;
  }

  let filterAttr = "";
  if (edgeBlur > 0) {
    const blurId = `${id}-blur`;
    defs.push(
      `<filter id="${blurId}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${edgeBlur.toFixed(1)}"/></filter>`
    );
    filterAttr = ` filter="url(#${blurId})"`;
  }

  const elems: string[] = [];
  elems.push(`<path id="${id}" d="${polygon}" ${fillAttr} opacity="${opacity}"${filterAttr}/>`);

  if (ridgeHighlight) {
    const hlStroke = (1.0 + sc) * 0.8;
    defs.push(
      `<filter id="${id}-rhl" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${(2 * sc).toFixed(1)}"/></filter>`
    );
    elems.push(
      `<path d="${curvePath}" fill="none" stroke="${ridgeHighlightColor}" stroke-width="${(hlStroke * 3).toFixed(1)}" opacity="0.08" filter="url(#${id}-rhl)"/>`
    );
    elems.push(
      `<path d="${curvePath}" fill="none" stroke="${ridgeHighlightColor}" stroke-width="${hlStroke.toFixed(1)}" opacity="0.15"/>`
    );
  }

  if (snowCaps) {
    for (let i = 1; i < ridgePts.length - 1; i++) {
      const prev = ridgePts[i - 1][1];
      const curr = ridgePts[i][1];
      const next = ridgePts[i + 1][1];
      if (curr < prev && curr < next && curr < by - amp * 0.2) {
        const px = ridgePts[i][0];
        const py = curr;
        const capH = (8 + rng() * 12) * sc;
        const capW = (12 + rng() * 18) * sc;
        const snowD = `M ${(px - capW).toFixed(1)} ${py.toFixed(1)} L ${px.toFixed(1)} ${(py - capH).toFixed(1)} L ${(px + capW).toFixed(1)} ${py.toFixed(1)} Z`;
        elems.push(
          `<path d="${snowD}" fill="${snowColor}" opacity="${(0.25 + rng() * 0.2).toFixed(2)}"/>`
        );
      }
    }
  }

  return {
    defs: defs.length > 0 ? defs.join("\n") : undefined,
    elements: elems.join("\n"),
  };
}

// ─── Terrain Stack Brick ────────────────────────────────────────────────────────

export interface TerrainStackBrickOptions {
  id?: string;
  layers: Array<{
    baseY: number;
    roughness?: number;
    color: string;
    opacity?: number;
    edgeBlur?: number;
    gradient?: { topColor: string; bottomColor: string };
    snowCaps?: boolean;
    snowColor?: string;
    ridgeHighlight?: boolean;
    ridgeHighlightColor?: string;
  }>;
  points?: number;
}

export function terrainStackBrick(
  params: BrickParams,
  options: TerrainStackBrickOptions
): BrickOutput {
  const { layers, points = 28, id = "terrain-stack" } = options;
  const allDefs: string[] = [];
  const allElems: string[] = [];

  layers.forEach((layer, i) => {
    const t = terrainBrick(params, {
      id: `${id}-${i}`,
      baseY: layer.baseY,
      roughness: layer.roughness ?? 0.06,
      points,
      color: layer.color,
      opacity: layer.opacity ?? 0.5 + i * 0.15,
      edgeBlur: layer.edgeBlur ?? 0,
      seedSuffix: `stack-${i}`,
      gradient: layer.gradient,
      snowCaps: layer.snowCaps,
      snowColor: layer.snowColor,
      ridgeHighlight: layer.ridgeHighlight,
      ridgeHighlightColor: layer.ridgeHighlightColor,
    });
    if (t.defs) allDefs.push(t.defs);
    allElems.push(t.elements);
  });

  return {
    defs: allDefs.length > 0 ? allDefs.join("\n") : undefined,
    elements: allElems.join("\n"),
  };
}

// ─── Water Reflection Brick ─────────────────────────────────────────────────────

export interface WaterReflectionBrickOptions {
  id?: string;
  waterY: number;
  color: string;
  opacity?: number;
  rippleScale?: number;
  rippleFrequency?: number;
  rippleLines?: number;
  shimmerColor?: string;
  shimmerOpacity?: number;
  moonReflection?: { cx: number; color: string; opacity?: number };
  shoreEdge?: boolean;
  shoreColor?: string;
}

export function waterReflectionBrick(
  params: BrickParams,
  options: WaterReflectionBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    waterY,
    color,
    opacity = 0.25,
    rippleScale = 8,
    rippleFrequency = 0.015,
    rippleLines = 6,
    shimmerColor,
    shimmerOpacity = 0.06,
    moonReflection,
    shoreEdge = false,
    shoreColor = "#ffffff",
    id = "water",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-water-${id}`));
  const wy = waterY * height;
  const waterHeight = height - wy;
  const rs = rippleScale * sc;

  const defs: string[] = [];
  const elems: string[] = [];

  defs.push(`<filter id="${id}-ripple" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="${rippleFrequency} ${(rippleFrequency * 0.3).toFixed(4)}" numOctaves="3" seed="42" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="${rs.toFixed(0)}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`);

  defs.push(`<linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
  <stop offset="30%" stop-color="${color}" stop-opacity="${(opacity * 0.7).toFixed(3)}"/>
  <stop offset="60%" stop-color="${color}" stop-opacity="${(opacity * 0.5).toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="${(opacity * 0.15).toFixed(3)}"/>
</linearGradient>`);

  elems.push(
    `<rect id="${id}" x="0" y="${wy.toFixed(0)}" width="${width}" height="${waterHeight.toFixed(0)}" fill="url(#${id}-fade)" filter="url(#${id}-ripple)"/>`
  );

  if (rippleLines > 0) {
    for (let r = 0; r < rippleLines; r++) {
      const lineY = wy + (r + 1) * (waterHeight / (rippleLines + 1));
      const pts: Pt[] = [];
      const wavePts = 14 + Math.floor(rng() * 6);
      for (let j = 0; j <= wavePts; j++) {
        const x = (j / wavePts) * width;
        const wobble = (rng() - 0.5) * 8 * sc;
        pts.push([x, lineY + wobble]);
      }
      const d = catmullRomToBezierPath(pts);
      const lineOp = (0.03 + rng() * 0.05) * (1 - r / (rippleLines + 1));
      elems.push(
        `<path d="${d}" fill="none" stroke="${shoreColor}" stroke-width="${(0.5 * sc).toFixed(1)}" opacity="${lineOp.toFixed(3)}"/>`
      );
    }
  }

  if (shimmerColor) {
    const shimmerCount = 3 + Math.floor(rng() * 3);
    for (let s = 0; s < shimmerCount; s++) {
      const sx = (0.1 + rng() * 0.8) * width;
      const sy = wy + (0.1 + rng() * 0.4) * waterHeight;
      const srx = (30 + rng() * 80) * sc;
      const sry = (4 + rng() * 8) * sc;
      elems.push(
        `<ellipse cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" rx="${srx.toFixed(0)}" ry="${sry.toFixed(0)}" fill="${shimmerColor}" opacity="${shimmerOpacity.toFixed(3)}"/>`
      );
    }
  }

  if (moonReflection) {
    const mcx = moonReflection.cx * width;
    const mop = moonReflection.opacity ?? 0.1;
    const reflY = wy + waterHeight * 0.05;
    const reflH = waterHeight * 0.5;
    defs.push(`<linearGradient id="${id}-moonref" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${moonReflection.color}" stop-opacity="${mop}"/>
  <stop offset="50%" stop-color="${moonReflection.color}" stop-opacity="${(mop * 0.4).toFixed(3)}"/>
  <stop offset="100%" stop-color="${moonReflection.color}" stop-opacity="0"/>
</linearGradient>`);
    elems.push(
      `<ellipse cx="${mcx.toFixed(0)}" cy="${(reflY + reflH * 0.3).toFixed(0)}" rx="${(20 * sc).toFixed(0)}" ry="${(reflH * 0.5).toFixed(0)}" fill="url(#${id}-moonref)"/>`
    );
    for (let d = 0; d < 4; d++) {
      const dy = reflY + rng() * reflH;
      const dx = mcx + (rng() - 0.5) * 30 * sc;
      elems.push(
        `<ellipse cx="${dx.toFixed(0)}" cy="${dy.toFixed(0)}" rx="${(3 + rng() * 6).toFixed(0)}" ry="${(1 + rng() * 2).toFixed(0)}" fill="${moonReflection.color}" opacity="${(mop * 0.3).toFixed(3)}"/>`
      );
    }
  }

  if (shoreEdge) {
    const shorePts: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * width;
      const wobble = (rng() - 0.5) * 4 * sc;
      shorePts.push([x, wy + wobble]);
    }
    const shoreD = catmullRomToBezierPath(shorePts);
    elems.push(
      `<path d="${shoreD}" fill="none" stroke="${shoreColor}" stroke-width="${(0.6 * sc).toFixed(1)}" opacity="0.08"/>`
    );
  }

  return { defs: defs.join("\n"), elements: elems.join("\n") };
}

// ─── Celestial Brick ────────────────────────────────────────────────────────────

export interface CelestialBrickOptions {
  id?: string;
  cx: number;
  cy: number;
  r?: number;
  color: string;
  glowColor?: string;
  glowSize?: number;
  glowOpacity?: number;
  crescent?: { offsetX: number; offsetY: number; color: string };
  texture?: boolean;
  craterCount?: number;
}

export function celestialBrick(params: BrickParams, options: CelestialBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    cx,
    cy,
    r = 0.05,
    color,
    glowColor,
    glowSize = 2.5,
    glowOpacity = 0.2,
    crescent,
    texture = false,
    craterCount = 4,
    id = "celestial",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-celestial-${id}`));
  const px = cx * width;
  const py = cy * height;
  const pr = r * scale;
  const gc = glowColor ?? color;

  const defs: string[] = [];
  const elems: string[] = [];

  // Outer glow ring
  defs.push(`<radialGradient id="${id}-rg3" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.4).toFixed(3)}"/>
  <stop offset="40%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.15).toFixed(3)}"/>
  <stop offset="100%" stop-color="${gc}" stop-opacity="0"/>
</radialGradient>`);
  const outerGlowR = pr * glowSize * 1.8;
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${outerGlowR.toFixed(1)}" fill="url(#${id}-rg3)"/>`
  );

  // Mid glow ring
  defs.push(`<radialGradient id="${id}-rg2" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.7).toFixed(3)}"/>
  <stop offset="50%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.25).toFixed(3)}"/>
  <stop offset="100%" stop-color="${gc}" stop-opacity="0"/>
</radialGradient>`);
  const midGlowR = pr * glowSize * 1.2;
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${midGlowR.toFixed(1)}" fill="url(#${id}-rg2)"/>`
  );

  // Inner glow ring
  defs.push(`<radialGradient id="${id}-rg1" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${gc}" stop-opacity="${glowOpacity}"/>
  <stop offset="60%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.3).toFixed(3)}"/>
  <stop offset="100%" stop-color="${gc}" stop-opacity="0"/>
</radialGradient>`);
  const innerGlowR = pr * glowSize;
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${innerGlowR.toFixed(1)}" fill="url(#${id}-rg1)"/>`
  );

  // Moon disc with offset-center surface gradient
  defs.push(`<radialGradient id="${id}-surf" cx="40%" cy="35%" r="55%" fx="38%" fy="33%">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"/>
  <stop offset="40%" stop-color="${color}" stop-opacity="0.95"/>
  <stop offset="100%" stop-color="${lerpColor(color, "#000000", 0.3)}" stop-opacity="0.95"/>
</radialGradient>`);
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="url(#${id}-surf)"/>`
  );

  // Crater texture filter
  if (texture) {
    defs.push(`<filter id="${id}-tex" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="5" seed="7" result="n"/>
  <feColorMatrix type="saturate" values="0" in="n" result="grey"/>
  <feComposite in="grey" in2="SourceGraphic" operator="in" result="masked"/>
  <feBlend in="masked" in2="SourceGraphic" mode="soft-light"/>
</filter>`);
    elems.push(
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${color}" opacity="0.2" filter="url(#${id}-tex)"/>`
    );
  }

  // Actual crater circles
  if (craterCount > 0) {
    for (let c = 0; c < craterCount; c++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * pr * 0.65;
      const craterX = px + Math.cos(angle) * dist;
      const craterY = py + Math.sin(angle) * dist;
      const craterR = (1.5 + rng() * 3.5) * sc;
      const craterOp = 0.04 + rng() * 0.06;
      elems.push(
        `<circle cx="${craterX.toFixed(1)}" cy="${craterY.toFixed(1)}" r="${craterR.toFixed(1)}" fill="none" stroke="#000000" stroke-width="${(0.4 * sc).toFixed(1)}" opacity="${craterOp.toFixed(3)}"/>`
      );
      elems.push(
        `<circle cx="${craterX.toFixed(1)}" cy="${craterY.toFixed(1)}" r="${(craterR * 0.7).toFixed(1)}" fill="#000000" opacity="${(craterOp * 0.5).toFixed(3)}"/>`
      );
    }
  }

  // Crescent shadow
  if (crescent) {
    const sx = px + crescent.offsetX * pr;
    const sy = py + crescent.offsetY * pr;
    elems.push(
      `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(pr * 0.92).toFixed(1)}" fill="${crescent.color}" opacity="0.95"/>`
    );
  }

  return { defs: defs.join("\n"), elements: elems.join("\n") };
}

// ─── Sky Gradient Brick ─────────────────────────────────────────────────────────

export interface SkyGradientBrickOptions {
  id?: string;
  stops: Array<{ offset: string; color: string; opacity?: number }>;
}

export function skyGradientBrick(
  params: BrickParams,
  options: SkyGradientBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { stops, id = "sky" } = options;

  const stopElems = stops
    .map(
      s => `<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`
    )
    .join("\n  ");

  return {
    defs: `<linearGradient id="${id}-grad" x1="0" y1="0" x2="0" y2="1">\n  ${stopElems}\n</linearGradient>`,
    elements: `<rect id="${id}" width="${width}" height="${height}" fill="url(#${id}-grad)"/>`,
  };
}

// ─── Cloud Band Brick ───────────────────────────────────────────────────────────

export interface CloudBandBrickOptions {
  id?: string;
  cy: number;
  bandHeight?: number;
  color: string;
  opacity?: number;
  frequency?: number;
  octaves?: number;
  seed?: number;
}

export function cloudBandBrick(params: BrickParams, options: CloudBandBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const {
    cy,
    bandHeight = 0.15,
    color,
    opacity = 0.2,
    frequency = 0.008,
    octaves = 4,
    seed = 13,
    id = "cloud",
  } = options;

  const y1 = (cy - bandHeight / 2) * height;
  const h = bandHeight * height;

  const defs = `<filter id="${id}-turb" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}" result="noise"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.7 0" in="noise" result="grey"/>
  <feGaussianBlur in="grey" stdDeviation="${(h * 0.12).toFixed(1)}" result="blurred"/>
  <feComposite in="blurred" in2="SourceGraphic" operator="in"/>
</filter>`;

  return {
    defs,
    elements: `<rect id="${id}" x="0" y="${y1.toFixed(0)}" width="${width}" height="${h.toFixed(0)}" fill="${color}" opacity="${opacity}" filter="url(#${id}-turb)"/>`,
  };
}

// ─── Aurora Advanced Brick ──────────────────────────────────────────────────────

export interface AuroraAdvancedBrickOptions {
  id?: string;
  bands?: number;
  cy?: number;
  zoneHeight?: number;
  color: string;
  color2?: string;
  color3?: string;
  opacity?: number;
  displacement?: boolean;
  verticalRays?: number;
  sharpCurtains?: boolean;
}

export function auroraAdvancedBrick(
  params: BrickParams,
  options: AuroraAdvancedBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    bands = 5,
    cy = 0.25,
    zoneHeight = 0.3,
    color,
    color2,
    color3,
    opacity = 0.4,
    displacement = true,
    verticalRays = 16,
    sharpCurtains = true,
    id = "aurora",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-aurora`));
  const defs: string[] = [];
  const elems: string[] = [];
  const c2 = color2 ?? color;
  const c3 = color3 ?? lerpColor(color, c2, 0.5);

  // Three blur filters at different levels for depth
  defs.push(
    `<filter id="${id}-blur1" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="${(12 * sc).toFixed(1)}"/></filter>`
  );
  defs.push(
    `<filter id="${id}-blur2" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="${(20 * sc).toFixed(1)}"/></filter>`
  );
  defs.push(
    `<filter id="${id}-blur3" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="${(35 * sc).toFixed(1)}"/></filter>`
  );

  // Filled curtain paths
  const curtainColors = [color, c2, c3];
  const blurIds = [`${id}-blur3`, `${id}-blur2`, `${id}-blur1`];

  for (let i = 0; i < Math.min(bands, 3); i++) {
    const bandTopY = (cy - zoneHeight / 2 + (i / Math.max(1, 2)) * zoneHeight * 0.5) * height;
    const bandBottomY = bandTopY + (0.08 + rng() * 0.12) * height;
    const bandColor = curtainColors[i % curtainColors.length];
    const bandOpacity = opacity * (0.15 + i * 0.08);

    const topPts: Pt[] = [];
    const ctrlCount = 16 + Math.floor(rng() * 8);
    for (let j = 0; j <= ctrlCount; j++) {
      const t = j / ctrlCount;
      const x = t * width;
      const amp = (0.02 + rng() * 0.04) * height;
      const y = bandTopY + (rng() - 0.5) * 2 * amp;
      topPts.push([x, y]);
    }

    const topCurve = catmullRomToBezierPath(topPts);
    const filledD = `${topCurve} L ${width.toFixed(1)} ${bandBottomY.toFixed(1)} L 0 ${bandBottomY.toFixed(1)} Z`;

    const grdId = `${id}-fg${i}`;
    defs.push(`<linearGradient id="${grdId}" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="${bandColor}" stop-opacity="0"/>
  <stop offset="15%" stop-color="${bandColor}" stop-opacity="0.8"/>
  <stop offset="50%" stop-color="${bandColor}" stop-opacity="1"/>
  <stop offset="85%" stop-color="${bandColor}" stop-opacity="0.8"/>
  <stop offset="100%" stop-color="${bandColor}" stop-opacity="0"/>
</linearGradient>`);

    elems.push(
      `<path d="${filledD}" fill="url(#${grdId})" opacity="${bandOpacity.toFixed(3)}" filter="url(#${blurIds[i % blurIds.length]})"/>`
    );
  }

  // Stroke-based aurora bands
  for (let i = 0; i < bands; i++) {
    const bandCy = (cy - zoneHeight / 2 + (i / Math.max(1, bands - 1)) * zoneHeight) * height;
    const amp = (0.02 + rng() * 0.06) * height;
    const bandColor = i % 2 === 0 ? color : c2;
    const bandOpacity = opacity * (0.6 + rng() * 0.4);
    const sw = (40 + rng() * 80) * (width / 3840);

    const ctrlCount = 12 + Math.floor(rng() * 8);
    const curvePts: Pt[] = [];
    for (let j = 0; j <= ctrlCount; j++) {
      const t = j / ctrlCount;
      const x = t * width;
      const y = bandCy + (rng() - 0.5) * 2 * amp;
      curvePts.push([x, y]);
    }

    const d = catmullRomToBezierPath(curvePts);

    const gradId = `${id}-g${i}`;
    defs.push(`<linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="${bandColor}" stop-opacity="0"/>
  <stop offset="20%" stop-color="${bandColor}" stop-opacity="1"/>
  <stop offset="80%" stop-color="${bandColor}" stop-opacity="1"/>
  <stop offset="100%" stop-color="${bandColor}" stop-opacity="0"/>
</linearGradient>`);

    elems.push(
      `<path id="${id}-b${i}" d="${d}" fill="none" stroke="url(#${gradId})" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${bandOpacity.toFixed(2)}"/>`
    );
  }

  // Sharp curtain detail strokes
  if (sharpCurtains) {
    for (let i = 0; i < 3; i++) {
      const sharCy = (cy - zoneHeight * 0.3 + (i / 2) * zoneHeight * 0.4) * height;
      const pts: Pt[] = [];
      const nPts = 20 + Math.floor(rng() * 10);
      for (let j = 0; j <= nPts; j++) {
        const t = j / nPts;
        pts.push([t * width, sharCy + (rng() - 0.5) * height * 0.03]);
      }
      const sharpD = catmullRomToBezierPath(pts);
      const sharpColor = i === 0 ? color : i === 1 ? c2 : c3;
      elems.push(
        `<path d="${sharpD}" fill="none" stroke="${sharpColor}" stroke-width="${(1.5 * sc).toFixed(1)}" opacity="${(0.15 + rng() * 0.1).toFixed(3)}"/>`
      );
    }
  }

  // Vertical rays
  if (verticalRays > 0) {
    const rayGroup: string[] = [];
    for (let r = 0; r < verticalRays; r++) {
      const rx = (0.05 + rng() * 0.9) * width;
      const rayTop = (cy - zoneHeight / 2 - 0.02) * height;
      const rayH = (0.05 + rng() * 0.15) * height;
      const rayW = (1 + rng() * 3) * sc;
      const rayColor = rng() > 0.5 ? color : c2;
      const rayOp = 0.03 + rng() * 0.06;
      rayGroup.push(
        `<rect x="${rx.toFixed(0)}" y="${rayTop.toFixed(0)}" width="${rayW.toFixed(1)}" height="${rayH.toFixed(0)}" fill="${rayColor}" opacity="${rayOp.toFixed(3)}"/>`
      );
    }
    elems.push(`<g id="${id}-rays" filter="url(#${id}-blur1)">${rayGroup.join("\n")}</g>`);
  }

  if (displacement) {
    const ds = (scale * 0.01).toFixed(0);
    defs.push(`<filter id="${id}-disp" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="3" seed="3" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="${ds}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`);
    return {
      defs: defs.join("\n"),
      elements: `<g filter="url(#${id}-disp)">${elems.join("\n")}</g>`,
    };
  }

  return { defs: defs.length > 0 ? defs.join("\n") : undefined, elements: elems.join("\n") };
}

// ─── Star Field Brick ───────────────────────────────────────────────────────────

export interface StarFieldBrickOptions {
  id?: string;
  count?: number;
  brightCount?: number;
  featureCount?: number;
  /** How feature stars render: glow-only (natural) or cross spikes (stylized). */
  featureStyle?: "glow" | "cross";
  color?: string;
  color2?: string;
  color3?: string;
  distribution?: "full" | "upper" | "band";
  bandCy?: number;
  bandHeight?: number;
  opacity?: number;
}

export function starFieldBrick(params: BrickParams, options: StarFieldBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    count = 90,
    brightCount = 17,
    featureCount = 5,
    featureStyle = "glow",
    color = "#ffffff",
    color2 = "#ddeeff",
    color3 = "#cce0ff",
    distribution = "upper",
    bandCy = 0.3,
    bandHeight = 0.5,
    opacity = 0.8,
    id = "stars",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-starfield`));
  const defs: string[] = [];
  const elems: string[] = [];
  const sc = scale / 2160;

  // Double-glow filter for bright stars
  defs.push(`<filter id="${id}-glow" x="-300%" y="-300%" width="700%" height="700%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${(2 * sc).toFixed(1)}" result="blur1"/>
  <feGaussianBlur in="SourceGraphic" stdDeviation="${(6 * sc).toFixed(1)}" result="blur2"/>
  <feMerge>
    <feMergeNode in="blur2"/>
    <feMergeNode in="blur1"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`);

  // Feature star glow
  defs.push(`<filter id="${id}-fglow" x="-400%" y="-400%" width="900%" height="900%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${(3 * sc).toFixed(1)}" result="fb1"/>
  <feGaussianBlur in="SourceGraphic" stdDeviation="${(10 * sc).toFixed(1)}" result="fb2"/>
  <feMerge>
    <feMergeNode in="fb2"/>
    <feMergeNode in="fb1"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`);

  const starColors = [color, color2, color3];

  const getY = (): number => {
    if (distribution === "upper") return rng() * height * 0.55;
    if (distribution === "band") return (bandCy - bandHeight / 2 + rng() * bandHeight) * height;
    return rng() * height;
  };

  // Layer 1: Tiny distant stars
  for (let i = 0; i < count; i++) {
    const x = rng() * width;
    const y = getY();
    const r = (0.3 + rng() * 0.4) * sc;
    const a = (0.08 + rng() * 0.25) * opacity;
    const c = starColors[Math.floor(rng() * starColors.length)];
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${c}" opacity="${a.toFixed(3)}"/>`
    );
  }

  // Layer 2: Medium stars
  const mediumCount = Math.floor(count * 0.35);
  for (let i = 0; i < mediumCount; i++) {
    const x = rng() * width;
    const y = getY();
    const r = (0.8 + rng() * 0.5) * sc;
    const a = (0.2 + rng() * 0.35) * opacity;
    const c = starColors[Math.floor(rng() * starColors.length)];
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${c}" opacity="${a.toFixed(3)}"/>`
    );
  }

  // Layer 3: Bright stars with double-glow
  for (let i = 0; i < brightCount; i++) {
    const x = rng() * width;
    const y = getY();
    const r = (1.3 + rng() * 1.0) * sc;
    const a = (0.5 + rng() * 0.4) * opacity;
    const c = starColors[Math.floor(rng() * starColors.length)];
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r * 2.5).toFixed(1)}" fill="${c}" opacity="${(a * 0.15).toFixed(3)}" filter="url(#${id}-glow)"/>`
    );
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${c}" opacity="${a.toFixed(3)}"/>`
    );
  }

  // Layer 4: Feature stars (glow-only by default to avoid synthetic glyph look)
  for (let i = 0; i < featureCount; i++) {
    const x = rng() * width;
    const y = getY();
    const r = (1.8 + rng() * 1.5) * sc;
    const a = (0.7 + rng() * 0.3) * opacity;
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r * 4).toFixed(1)}" fill="${color}" opacity="${(a * 0.08).toFixed(3)}" filter="url(#${id}-fglow)"/>`
    );
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#ffffff" opacity="${a.toFixed(3)}"/>`
    );
    if (featureStyle === "cross") {
      const armLen = r * 7;
      const armW = r * 0.25;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as Pt[]) {
        const x2 = x + dx * armLen;
        const y2 = y + dy * armLen;
        elems.push(
          `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${color}" stroke-width="${armW.toFixed(1)}" opacity="${(a * 0.25).toFixed(3)}"/>`
        );
      }
    }
  }

  return { defs: defs.join("\n"), elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Nebula Glow Brick ──────────────────────────────────────────────────────────

export interface NebulaGlowBrickOptions {
  id?: string;
  blobs: Array<{ cx: number; cy: number; rx: number; ry: number; color: string; opacity?: number }>;
  blur?: number;
}

export function nebulaGlowBrick(params: BrickParams, options: NebulaGlowBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const { blobs, blur = 0.06, id = "nebula" } = options;

  const sd = (blur * scale).toFixed(0);
  const defs = `<filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

  const elems = blobs
    .map(
      (b, _i) =>
        `<ellipse cx="${(b.cx * width).toFixed(0)}" cy="${(b.cy * height).toFixed(0)}" rx="${(b.rx * scale).toFixed(0)}" ry="${(b.ry * scale).toFixed(0)}" fill="${b.color}" opacity="${b.opacity ?? 0.15}" filter="url(#${id}-blur)"/>`
    )
    .join("\n");

  return { defs, elements: `<g id="${id}">${elems}</g>` };
}

// ─── Treeline Brick ─────────────────────────────────────────────────────────────

export interface TreelineBrickOptions {
  id?: string;
  baseY: number;
  count?: number;
  color: string;
  opacity?: number;
  seedSuffix?: string;
  /** Minimum tree height as fraction of viewBox (default 0.03). */
  minHeight?: number;
  maxHeight?: number;
  minTiers?: number;
  maxTiers?: number;
}

export function treelineBrick(params: BrickParams, options: TreelineBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const {
    baseY,
    count = 30,
    color,
    opacity = 0.9,
    seedSuffix = "trees",
    minHeight = 0.03,
    maxHeight = 0.12,
    minTiers = 2,
    maxTiers = 3,
    id = "treeline",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${seedSuffix}`));
  const by = baseY * height;
  const elems: string[] = [];

  for (let i = 0; i < count; i++) {
    const x = (rng() * 1.1 - 0.05) * width;
    const treeH = (minHeight + rng() * (maxHeight - minHeight)) * height;
    const treeW = treeH * (0.2 + rng() * 0.2);
    const treeOp = opacity * (0.7 + rng() * 0.3);
    const tiers = minTiers + Math.floor(rng() * (maxTiers - minTiers + 1));

    // Trunk
    const trunkW = treeW * 0.12;
    const trunkH = treeH * 0.2;
    elems.push(
      `<rect x="${(x - trunkW / 2).toFixed(1)}" y="${(by - trunkH).toFixed(1)}" width="${trunkW.toFixed(1)}" height="${trunkH.toFixed(1)}" fill="${color}" opacity="${treeOp.toFixed(2)}"/>`
    );

    // Stacked triangle tiers
    const foliageH = treeH - trunkH;
    for (let t = 0; t < tiers; t++) {
      const tierFraction = t / tiers;
      const nextFraction = (t + 1) / tiers;
      const tierTop = by - trunkH - foliageH * (1 - tierFraction * 0.85);
      const tierBottom = by - trunkH - foliageH * (1 - nextFraction * 0.85) + foliageH * 0.15;
      const tierW = treeW * (0.3 + nextFraction * 0.7);
      const lean = (rng() - 0.5) * tierW * 0.1;

      const d = `M ${(x + lean).toFixed(1)} ${tierTop.toFixed(1)} L ${(x - tierW / 2).toFixed(1)} ${tierBottom.toFixed(1)} L ${(x + tierW / 2).toFixed(1)} ${tierBottom.toFixed(1)} Z`;
      elems.push(`<path d="${d}" fill="${color}" opacity="${treeOp.toFixed(2)}"/>`);
    }
  }

  return { elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Fog Wisp Brick ─────────────────────────────────────────────────────────────

export interface FogWispBrickOptions {
  id?: string;
  cy: number;
  spread?: number;
  hazeCount?: number;
  wispCount?: number;
  color: string;
  opacity?: number;
  /** Override opacity for broad haze ellipses (defaults to `opacity`). */
  hazeOpacity?: number;
  /** Override opacity for thin wisp paths (defaults to `opacity * 0.4`). */
  wispOpacity?: number;
}

export function fogWispBrick(params: BrickParams, options: FogWispBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    cy,
    spread = 0.08,
    hazeCount = 4,
    wispCount = 5,
    color,
    opacity = 0.1,
    hazeOpacity: _hazeOp,
    wispOpacity: _wispOp,
    id = "fog",
  } = options;
  const hazeOp = _hazeOp ?? opacity;
  const wispOp = _wispOp ?? opacity * 0.4;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-fog-${id}`));
  const defs: string[] = [];
  const elems: string[] = [];

  defs.push(
    `<filter id="${id}-haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(40 * sc).toFixed(0)}"/></filter>`
  );
  defs.push(
    `<filter id="${id}-wisp" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(8 * sc).toFixed(0)}"/></filter>`
  );

  for (let i = 0; i < hazeCount; i++) {
    const ex = (0.1 + rng() * 0.8) * width;
    const ey = (cy - spread / 2 + rng() * spread) * height;
    const erx = (80 + rng() * 200) * sc;
    const ery = (15 + rng() * 25) * sc;
    elems.push(
      `<ellipse cx="${ex.toFixed(0)}" cy="${ey.toFixed(0)}" rx="${erx.toFixed(0)}" ry="${ery.toFixed(0)}" fill="${color}" opacity="${(hazeOp * (0.5 + rng() * 0.5)).toFixed(3)}" filter="url(#${id}-haze)"/>`
    );
  }

  for (let i = 0; i < wispCount; i++) {
    const pts: Pt[] = [];
    const nPts = 6 + Math.floor(rng() * 4);
    const startX = rng() * width * 0.3;
    const wispY = (cy - spread / 2 + rng() * spread) * height;
    for (let j = 0; j <= nPts; j++) {
      const t = j / nPts;
      const x = startX + t * width * (0.5 + rng() * 0.5);
      const y = wispY + (rng() - 0.5) * spread * height * 0.5;
      pts.push([x, y]);
    }
    const d = catmullRomToBezierPath(pts);
    const sw = (2 + rng() * 6) * sc;
    elems.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${(wispOp * (0.5 + rng() * 0.5)).toFixed(3)}" filter="url(#${id}-wisp)"/>`
    );
  }

  return { defs: defs.join("\n"), elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Horizon Glow Brick ─────────────────────────────────────────────────────────

export interface HorizonGlowBrickOptions {
  id?: string;
  y: number;
  color: string;
  height?: number;
  opacity?: number;
}

export function horizonGlowBrick(
  params: BrickParams,
  options: HorizonGlowBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height: vh } = viewBox;
  const { y, color, height: glowH = 0.15, opacity = 0.3, id = "hglow" } = options;
  const py = y * vh;
  const h = glowH * vh;

  const defs = `<radialGradient id="${id}-rg" cx="50%" cy="50%" rx="50%" ry="50%">
  <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`;

  return {
    defs,
    elements: `<ellipse cx="${(width / 2).toFixed(0)}" cy="${py.toFixed(0)}" rx="${(width * 0.6).toFixed(0)}" ry="${h.toFixed(0)}" fill="url(#${id}-rg)"/>`,
  };
}

// ─── Shooting Star Brick ────────────────────────────────────────────────────────

export interface ShootingStarBrickOptions {
  id?: string;
  count?: number;
  color?: string;
  trailColor?: string;
  opacity?: number;
}

export function shootingStarBrick(
  params: BrickParams,
  options: ShootingStarBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    count = 3,
    color = "#ffffff",
    trailColor = "#88bbff",
    opacity = 0.6,
    id = "meteor",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-meteor`));
  const defs: string[] = [];
  const elems: string[] = [];

  defs.push(
    `<filter id="${id}-tglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(2 * sc).toFixed(1)}"/></filter>`
  );

  for (let i = 0; i < count; i++) {
    const x1 = rng() * width * 0.8 + width * 0.1;
    const y1 = rng() * height * 0.35;
    const len = (0.08 + rng() * 0.15) * width;
    const angle = 0.3 + rng() * 0.8;
    const x2 = x1 + len * Math.cos(angle);
    const y2 = y1 + len * Math.sin(angle);
    const sw = (1.5 + rng() * 2.5) * sc;
    const meteorOp = opacity * (0.5 + rng() * 0.5);

    const grdId = `${id}-tg${i}`;
    defs.push(`<linearGradient id="${grdId}" x1="${x2.toFixed(0)}" y1="${y2.toFixed(0)}" x2="${x1.toFixed(0)}" y2="${y1.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
  <stop offset="30%" stop-color="${trailColor}" stop-opacity="0.6"/>
  <stop offset="100%" stop-color="${trailColor}" stop-opacity="0"/>
</linearGradient>`);

    elems.push(
      `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="url(#${grdId})" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${meteorOp.toFixed(3)}"/>`
    );
    elems.push(
      `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${color}" stroke-width="${(sw * 3).toFixed(1)}" stroke-linecap="round" opacity="${(meteorOp * 0.15).toFixed(3)}" filter="url(#${id}-tglow)"/>`
    );
    const headR = (1.5 + rng() * 1.5) * sc;
    elems.push(
      `<circle cx="${x2.toFixed(0)}" cy="${y2.toFixed(0)}" r="${headR.toFixed(1)}" fill="${color}" opacity="${meteorOp.toFixed(3)}"/>`
    );
  }

  return { defs: defs.join("\n"), elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Dune Brick ─────────────────────────────────────────────────────────────────

export interface DuneBrickOptions {
  id?: string;
  baseY: number;
  ridges?: number;
  color: string;
  opacity?: number;
  seedSuffix?: string;
}

export function duneBrick(params: BrickParams, options: DuneBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const { baseY, ridges = 3, color, opacity = 0.8, seedSuffix = "dune", id = "dune" } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${seedSuffix}`));
  const by = baseY * height;
  const elems: string[] = [];

  for (let r = 0; r < ridges; r++) {
    const amp = (0.02 + rng() * 0.06) * height;
    const pts: Pt[] = [];
    const count = 8 + Math.floor(rng() * 6);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = t * width;
      const y = by + r * height * 0.04 + (rng() - 0.3) * amp;
      pts.push([x, y]);
    }
    const d = catmullRomToBezierPath(pts);
    const ridgeOpacity = opacity * (0.6 + r * 0.15);
    elems.push(
      `<path id="${id}-r${r}" d="${d} L ${width.toFixed(0)} ${height.toFixed(0)} L 0 ${height.toFixed(0)} Z" fill="${color}" opacity="${ridgeOpacity.toFixed(2)}"/>`
    );
  }

  return { elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Lightning Brick ────────────────────────────────────────────────────────────

export interface LightningBrickOptions {
  id?: string;
  startX: number;
  startY: number;
  color?: string;
  opacity?: number;
  segments?: number;
  branches?: number;
}

export function lightningBrick(params: BrickParams, options: LightningBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    startX,
    startY,
    color = "#e8e0ff",
    opacity = 0.8,
    segments = 8,
    branches = 2,
    id = "lightning",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-bolt`));
  const sc = scale / 2160;
  const defs = `<filter id="${id}-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(8 * sc).toFixed(1)}"/></filter>`;

  function bolt(sx: number, sy: number, segs: number, _sw: number): string {
    const pts: Pt[] = [[sx, sy]];
    let x = sx,
      y = sy;
    for (let i = 0; i < segs; i++) {
      x += (rng() - 0.5) * width * 0.1;
      y += (0.04 + rng() * 0.08) * height;
      pts.push([x, Math.min(height, y)]);
    }
    return catmullRomToBezierPath(pts);
  }

  const elems: string[] = [];
  const sx = startX * width;
  const sy = startY * height;

  const mainD = bolt(sx, sy, segments, 3 * sc);
  elems.push(
    `<path d="${mainD}" fill="none" stroke="${color}" stroke-width="${(4 * sc).toFixed(1)}" opacity="${opacity}" filter="url(#${id}-glow)"/>`
  );
  elems.push(
    `<path d="${mainD}" fill="none" stroke="#ffffff" stroke-width="${(1.5 * sc).toFixed(1)}" opacity="${(opacity * 0.9).toFixed(2)}"/>`
  );

  for (let b = 0; b < branches; b++) {
    const branchStart = 2 + Math.floor(rng() * (segments - 3));
    const bx = sx + (rng() - 0.5) * width * 0.05 * branchStart;
    const by2 = sy + branchStart * height * 0.06;
    const bD = bolt(bx, by2, 3 + Math.floor(rng() * 3), 1.5 * sc);
    elems.push(
      `<path d="${bD}" fill="none" stroke="${color}" stroke-width="${(2 * sc).toFixed(1)}" opacity="${(opacity * 0.5).toFixed(2)}" filter="url(#${id}-glow)"/>`
    );
  }

  return { defs, elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Volcano Brick ──────────────────────────────────────────────────────────────

export interface VolcanoBrickOptions {
  id?: string;
  cx: number;
  baseY: number;
  peakHeight?: number;
  craterWidth?: number;
  color: string;
  lavaColor?: string;
  opacity?: number;
}

export function volcanoBrick(params: BrickParams, options: VolcanoBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const {
    cx,
    baseY,
    peakHeight = 0.25,
    craterWidth = 0.03,
    color,
    lavaColor,
    opacity = 0.95,
    id = "volcano",
  } = options;

  const px = cx * width;
  const by = baseY * height;
  const peakY = by - peakHeight * height;
  const cw = craterWidth * width;
  const slopeW = (0.15 + peakHeight * 0.4) * width;

  const d = `M ${(px - slopeW).toFixed(0)} ${by.toFixed(0)} C ${(px - slopeW * 0.6).toFixed(0)} ${(by - peakHeight * height * 0.3).toFixed(0)} ${(px - cw * 2).toFixed(0)} ${(peakY + peakHeight * height * 0.1).toFixed(0)} ${(px - cw).toFixed(0)} ${peakY.toFixed(0)} L ${(px + cw).toFixed(0)} ${peakY.toFixed(0)} C ${(px + cw * 2).toFixed(0)} ${(peakY + peakHeight * height * 0.1).toFixed(0)} ${(px + slopeW * 0.6).toFixed(0)} ${(by - peakHeight * height * 0.3).toFixed(0)} ${(px + slopeW).toFixed(0)} ${by.toFixed(0)} L ${(px + slopeW).toFixed(0)} ${height.toFixed(0)} L ${(px - slopeW).toFixed(0)} ${height.toFixed(0)} Z`;

  const defs: string[] = [];
  const elems: string[] = [];
  elems.push(`<path id="${id}" d="${d}" fill="${color}" opacity="${opacity}"/>`);

  if (lavaColor) {
    defs.push(`<radialGradient id="${id}-lava" cx="50%" cy="0%" r="80%">
  <stop offset="0%" stop-color="${lavaColor}" stop-opacity="0.6"/>
  <stop offset="100%" stop-color="${lavaColor}" stop-opacity="0"/>
</radialGradient>`);
    elems.push(
      `<ellipse cx="${px.toFixed(0)}" cy="${peakY.toFixed(0)}" rx="${(cw * 3).toFixed(0)}" ry="${(peakHeight * height * 0.15).toFixed(0)}" fill="url(#${id}-lava)"/>`
    );
  }

  return { defs: defs.length > 0 ? defs.join("\n") : undefined, elements: elems.join("\n") };
}
