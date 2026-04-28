/**
 * Landscape bricks — high-level scene components for wallpaper-grade night scenes.
 * All curves use cubic Bézier paths (Catmull-Rom interpolation) for organic shapes.
 * Uses seeded PRNG + simplex noise for deterministic, spatially-coherent generation.
 * roughjs adds organic hand-drawn edges to terrain silhouettes (no DOM required —
 * loaded via the self-contained CJS bundle using createRequire).
 */
import { createRequire } from "node:module";
import { contours } from "d3-contour";
import { geoPath } from "d3-geo";
import { createNoise2D } from "simplex-noise";
import type { BrickOutput, BrickParams } from "../types.js";

// ─── roughjs (CJS bundle — DOM-free generator API) ──────────────────────────
const _req = createRequire(import.meta.url);
const _roughCJS = _req("roughjs/bundled/rough.cjs.js") as {
  default?: { generator(config?: Record<string, unknown>): RoughGen };
  generator?(config?: Record<string, unknown>): RoughGen;
};
type RoughGen = {
  path(d: string, opts: Record<string, unknown>): unknown;
  toPaths(
    drawable: unknown
  ): Array<{ d: string; fill: string; stroke: string; strokeWidth: number; opacity: number }>;
};
const _roughApi =
  _roughCJS.default ??
  (_roughCJS as unknown as {
    generator: RoughGen["path"] & { bind: (arg: unknown) => () => RoughGen };
  });
const _roughGenerator: () => RoughGen =
  typeof (_roughCJS as { generator?: () => RoughGen }).generator === "function"
    ? () => (_roughCJS as { generator: () => RoughGen }).generator()
    : () => (_roughCJS.default as { generator: () => RoughGen }).generator();

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function organicCentered(rng: () => number): number {
  return (rng() + rng() + rng()) / 3 - 0.5;
}

// ─── Catmull-Rom → Cubic Bézier Conversion ──────────────────────────────────────

/**
 * Convert an array of points to a smooth SVG cubic Bézier path using Catmull-Rom
 * interpolation. The resulting path passes through every input point with C1 continuity.
 */
function catmullRomToBezierPath(pts: Pt[], closed = false): string {
  if (pts.length < 2) return "";
  const n = pts.length;
  const segments: string[] = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(n - 1, i + 1)];
    const p3 = pts[Math.min(n - 1, i + 2)];
    // Catmull-Rom tangent → cubic Bézier control points
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

// ─── roughjs Terrain Path Sketching ────────────────────────────────────────

/**
 * Applies roughjs sketching to a terrain polygon SVG path string.
 * Produces organic, hand-drawn mountain ridgelines instead of smooth mathematical curves.
 *
 * @param d - SVG path data for the filled terrain polygon (Catmull-Rom output)
 * @param seed - deterministic seed for roughjs ( use hashStr output )
 * @param roughness - unscaled terrain roughness (0.04–0.18); mapped to roughjs pixel deviation
 * @returns SVG path data string with jagged, organic edges
 */
function roughifyTerrainPath(d: string, seed: number, roughness: number): string {
  try {
    const gen = _roughGenerator();
    const rjsRoughness = Math.max(5, roughness * 130);
    const drawable = gen.path(d, {
      roughness: rjsRoughness,
      fill: "#000",
      fillStyle: "solid",
      stroke: "none",
      seed: seed & 0xffff,
      disableMultiStroke: true,
    });
    const paths = gen.toPaths(drawable);
    return paths[0]?.d ?? d;
  } catch {
    return d; // fallback to smooth path on any error
  }
}

/**
 * Spatially-coherent fractal terrain noise using simplex-noise.
 * Returns `count` Y-offsets for evenly-spaced X positions in [0, width].
 * Uses 6-octave fBm: macro shape → secondary ridges → detail → high-freq micro crag.
 * Lacunarity 2.1, gain 0.52 — slightly more persistent than standard to preserve
 * mid-frequency ridge detail that makes mountains look convincing.
 */
function terrainNoise(rng: () => number, count: number, amp: number): number[] {
  const noise2D = createNoise2D(rng);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    // 6-octave fBm with lacunarity 2.1, gain 0.52
    let n = 0;
    let freq = 1.8;
    let weight = 0.5;
    let yOff = 0;
    for (let oct = 0; oct < 6; oct++) {
      n += noise2D(t * freq, yOff) * weight;
      freq *= 2.1;
      weight *= 0.52;
      yOff += 3.7; // unique Y offset per octave to de-correlate
    }
    values.push(n * amp);
  }
  return values;
}

// ─── Terrain Brick ──────────────────────────────────────────────────────────────

export interface TerrainBrickOptions {
  id?: string;
  /** Fraction of height for the base Y level of the ridgeline (0–1) */
  baseY: number;
  /** How much vertical variation (0–1 fraction of height) */
  roughness?: number;
  /** Number of ridgeline control points */
  points?: number;
  color: string;
  opacity?: number;
  /** Blur the top edge for atmospheric haze */
  edgeBlur?: number;
  /** Seed suffix for this specific terrain layer */
  seedSuffix?: string;
  /** Optional gradient fill instead of flat color */
  gradient?: { topColor: string; bottomColor: string };
}

/**
 * Procedural terrain silhouette using cubic Bézier curves (Catmull-Rom).
 * Fills from organic ridgeline down to the bottom of the viewport.
 */
export function terrainBrick(params: BrickParams, options: TerrainBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
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
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${seedSuffix}`));
  const amp = roughness * height;
  const by = baseY * height;

  const noise = terrainNoise(rng, points + 1, amp);
  const ridgePts: Pt[] = [];
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const y = Math.max(0, Math.min(height, by + noise[i]));
    ridgePts.push([x, y]);
  }

  // Build smooth Bézier ridgeline then close polygon at bottom
  const curvePath = catmullRomToBezierPath(ridgePts);
  const polygon = `${curvePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

  // Roughify for organic mountain edges — makes silhouettes look like real terrain
  const roughSeed = hashStr(`${seedId}-${harmonyMode}-${seedSuffix}-rjs`);
  const sketchPath = roughifyTerrainPath(polygon, roughSeed, roughness);

  const defs: string[] = [];
  let fillAttr = `fill="${color}"`;

  if (gradient) {
    defs.push(`<linearGradient id="${id}-grd" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${gradient.topColor}"/>
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

  return {
    defs: defs.length > 0 ? defs.join("\n") : undefined,
    elements: `<path id="${id}" d="${sketchPath}" ${fillAttr} opacity="${opacity}"${filterAttr}/>`,
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
  }>;
  points?: number;
}

/**
 * Multiple layered terrain ridgelines with depth (atmospheric perspective).
 * Per-layer roughness scales with depth index when not explicitly set:
 *   far layers (i=0): smooth macro ridgelines (roughness 0.04)
 *   mid layers (i=1): moderate (0.08)
 *   close layers (i≥2): detailed crags (0.14+)
 */
export function terrainStackBrick(
  params: BrickParams,
  options: TerrainStackBrickOptions
): BrickOutput {
  // More control points for crisper ridgeline detail
  const { layers, points = 60, id = "terrain-stack" } = options;
  const allDefs: string[] = [];
  const allElems: string[] = [];

  layers.forEach((layer, i) => {
    // Default roughness increases from far (smooth silhouette) → near (rugged crags)
    const defaultRoughness = i === 0 ? 0.04 : i === 1 ? 0.08 : Math.min(0.06 + i * 0.04, 0.18);
    const t = terrainBrick(params, {
      id: `${id}-${i}`,
      baseY: layer.baseY,
      roughness: layer.roughness ?? defaultRoughness,
      points,
      color: layer.color,
      opacity: layer.opacity ?? 0.5 + i * 0.15,
      edgeBlur: layer.edgeBlur ?? 0,
      seedSuffix: `stack-${i}`,
      gradient: layer.gradient,
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
}

/**
 * Water body with turbulence-based ripple distortion and depth-fading gradient.
 */
export function waterReflectionBrick(
  params: BrickParams,
  options: WaterReflectionBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    waterY,
    color,
    opacity = 0.25,
    rippleScale = 8,
    rippleFrequency = 0.015,
    id = "water",
  } = options;

  const wy = waterY * height;
  const waterHeight = height - wy;
  const rs = rippleScale * (scale / 2160);

  const defs = `<filter id="${id}-ripple" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="${rippleFrequency}" numOctaves="3" seed="42" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="${rs.toFixed(0)}" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="${(opacity * 0.3).toFixed(2)}"/>
</linearGradient>`;

  const elements = `<rect id="${id}" x="0" y="${wy.toFixed(0)}" width="${width}" height="${waterHeight.toFixed(0)}" fill="url(#${id}-fade)" filter="url(#${id}-ripple)"/>`;

  return { defs, elements };
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
}

/**
 * Celestial body with radial glow, optional crater texture, and crescent shadow.
 */
export function celestialBrick(params: BrickParams, options: CelestialBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
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
    id = "celestial",
  } = options;

  const px = cx * width;
  const py = cy * height;
  const pr = r * scale;
  const gc = glowColor ?? color;

  const defs: string[] = [];
  const elems: string[] = [];

  // Radial glow
  defs.push(`<radialGradient id="${id}-rg" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${gc}" stop-opacity="${glowOpacity}"/>
  <stop offset="60%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.3).toFixed(2)}"/>
  <stop offset="100%" stop-color="${gc}" stop-opacity="0"/>
</radialGradient>`);
  const glowR = pr * glowSize;
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${glowR.toFixed(1)}" fill="url(#${id}-rg)"/>`
  );

  // Disc
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${color}" opacity="0.95"/>`
  );

  // Crater texture
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

/**
 * Multi-stop vertical sky gradient.
 */
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

/**
 * Organic cloud/mist/fog band using feTurbulence with soft edges.
 *
 * Uses a full-viewport rect as SourceGraphic to avoid the rect-boundary clipping artifact.
 * A gradient mask concentrates the visible band at the desired Y position with
 * smooth fade-in/out transitions above and below — no hard rectangular border.
 */
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

  const h = bandHeight * height;
  // Soft mask edges fade in/out over 1.5× band height above and below centre
  const fadeTop = Math.max(0, cy - bandHeight * 1.2);
  const bandTop = Math.max(0, cy - bandHeight * 0.45);
  const bandBot = Math.min(1, cy + bandHeight * 0.45);
  const fadeBot = Math.min(1, cy + bandHeight * 1.2);

  const defs = `<linearGradient id="${id}-vmask" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
  <stop offset="${(fadeTop * 100).toFixed(1)}%" stop-color="white" stop-opacity="0"/>
  <stop offset="${(bandTop * 100).toFixed(1)}%" stop-color="white" stop-opacity="1"/>
  <stop offset="${(bandBot * 100).toFixed(1)}%" stop-color="white" stop-opacity="1"/>
  <stop offset="${(fadeBot * 100).toFixed(1)}%" stop-color="white" stop-opacity="0"/>
</linearGradient>
<mask id="${id}-m">
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#${id}-vmask)"/>
</mask>
<filter id="${id}-turb" x="-10%" y="-100%" width="120%" height="300%">
  <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}" result="noise"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.7 0" in="noise" result="grey"/>
  <feGaussianBlur in="grey" stdDeviation="${(h * 0.14).toFixed(1)}" result="blurred"/>
  <feComposite in="blurred" in2="SourceGraphic" operator="in"/>
</filter>`;

  return {
    defs,
    elements: `<rect id="${id}" x="0" y="0" width="${width}" height="${height}" fill="${color}" opacity="${opacity}" filter="url(#${id}-turb)" mask="url(#${id}-m)"/>`,
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
  opacity?: number;
  displacement?: boolean;
}

/**
 * Multi-band aurora curtain using cubic Bézier curves for organic curtain shapes.
 * Each band flows with seeded random undulation instead of mathematical sine.
 */
export function auroraAdvancedBrick(
  params: BrickParams,
  options: AuroraAdvancedBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    bands = 5,
    cy = 0.25,
    zoneHeight = 0.3,
    color,
    color2,
    opacity = 0.62,
    displacement = true,
    id = "aurora",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-aurora`));
  const defs: string[] = [];
  const elems: string[] = [];
  const c2 = color2 ?? color;
  const heroBand = rng();
  const blurSd = Math.max(1.4, scale * 0.0018).toFixed(1);

  // One spatially-coherent noise field shared across all bands
  const auroraNoise = createNoise2D(rng);

  defs.push(`<filter id="${id}-soft" x="-12%" y="-20%" width="124%" height="140%">
  <feGaussianBlur stdDeviation="${blurSd}"/>
</filter>`);

  for (let i = 0; i < bands; i++) {
    const bandProgress = bands === 1 ? 0.5 : i / Math.max(1, bands - 1);
    const spread = bandProgress ** (1.05 + rng() * 0.22);
    const bandJitter = organicCentered(rng) * (zoneHeight / Math.max(4, bands * 1.8));
    const bandCy =
      clamp(cy - zoneHeight / 2 + spread * zoneHeight + bandJitter, 0.06, 0.92) * height;
    const focusWeight = Math.max(0.3, 1 - Math.abs(bandProgress - heroBand) * 1.45);
    const amp = (0.03 + rng() * 0.05 + focusWeight * 0.03) * height;
    const bandColor = i % 2 === 0 ? color : c2;
    const bandOpacity = opacity * Math.min(1, 0.42 + focusWeight * 0.38 + rng() * 0.14);
    const sw = (36 + rng() * 100 + focusWeight * 65) * (width / 3840);

    // Generate organic control points using spatially-coherent simplex noise
    const ctrlCount = 12 + Math.floor(rng() * 8);
    const curvePts: Pt[] = [];
    for (let j = 0; j <= ctrlCount; j++) {
      const t = j / ctrlCount;
      const x = t * width;
      // sample noise along t-axis; i/bands separates bands in noise space
      const ny =
        auroraNoise(t * 3.5, i * 0.8) * 0.65 +
        auroraNoise(t * 9.0, i * 0.8 + 5) * 0.25 +
        auroraNoise(t * 20.0, i * 0.8 + 10) * 0.1;
      const y = bandCy + ny * amp;
      curvePts.push([x, y]);
    }

    const d = catmullRomToBezierPath(curvePts);

    // Gradient along the aurora band for depth
    const gradId = `${id}-g${i}`;
    const leadEdge = (8 + rng() * 12).toFixed(1);
    const coreStart = (24 + rng() * 10).toFixed(1);
    const coreEnd = (68 + rng() * 10).toFixed(1);
    defs.push(`<linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="${bandColor}" stop-opacity="0"/>
  <stop offset="${leadEdge}%" stop-color="${bandColor}" stop-opacity="${(0.22 + focusWeight * 0.16).toFixed(2)}"/>
  <stop offset="${coreStart}%" stop-color="${bandColor}" stop-opacity="${(0.8 + focusWeight * 0.18).toFixed(2)}"/>
  <stop offset="${coreEnd}%" stop-color="${bandColor}" stop-opacity="${(0.72 + focusWeight * 0.14).toFixed(2)}"/>
  <stop offset="100%" stop-color="${bandColor}" stop-opacity="0"/>
</linearGradient>`);

    elems.push(
      `<path id="${id}-b${i}" d="${d}" fill="none" stroke="url(#${gradId})" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${bandOpacity.toFixed(2)}"/>`
    );
  }

  if (displacement) {
    const ds = (scale * 0.01).toFixed(0);
    defs.push(`<filter id="${id}-disp" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="3" seed="3" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="${ds}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`);
    return {
      defs: defs.join("\n"),
      elements: `<g filter="url(#${id}-soft)"><g filter="url(#${id}-disp)">${elems.join("\n")}</g></g>`,
    };
  }

  return {
    defs: defs.length > 0 ? defs.join("\n") : undefined,
    elements: `<g filter="url(#${id}-soft)">${elems.join("\n")}</g>`,
  };
}

// ─── Star Field Brick ───────────────────────────────────────────────────────────

export interface StarFieldBrickOptions {
  id?: string;
  count?: number;
  brightCount?: number;
  color?: string;
  distribution?: "full" | "upper" | "band";
  bandCy?: number;
  bandHeight?: number;
  opacity?: number;
}

/**
 * Sparse star field with bright glow halos and cross-shaped twinkles.
 */
export function starFieldBrick(params: BrickParams, options: StarFieldBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    count = 80,
    brightCount = 10,
    color = "#ffffff",
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

  // Fixed small stdDeviation — avoids scale-proportional blobs at high resolution
  defs.push(
    `<filter id="${id}-glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="3 3"/></filter>`
  );

  const getY = (): number => {
    if (distribution === "upper") return rng() * height * 0.55;
    if (distribution === "band") return (bandCy - bandHeight / 2 + rng() * bandHeight) * height;
    return rng() * height;
  };

  const clusterCount = distribution === "full" ? 2 : distribution === "band" ? 3 : 4;
  const clusters = Array.from({ length: clusterCount }, () => ({
    x: width * (0.12 + rng() * 0.76),
    y: getY(),
    rx: width * (0.05 + rng() * 0.12),
    ry:
      distribution === "band"
        ? height * Math.max(0.035, bandHeight * 0.18)
        : height * (0.03 + rng() * 0.09),
  }));

  const pickPosition = () => {
    if (rng() < 0.68) {
      const cluster = clusters[Math.floor(rng() * clusters.length)];
      return {
        x: clamp(cluster.x + organicCentered(rng) * cluster.rx * 2.4, 0, width),
        y: clamp(cluster.y + organicCentered(rng) * cluster.ry * 2.2, 0, height),
      };
    }

    return { x: rng() * width, y: getY() };
  };

  // Dim stars — sub-pixel to ~1px cores; no glow filter
  for (let i = 0; i < count; i++) {
    const { x, y } = pickPosition();
    const r = (0.15 + rng() * 0.55) * sc;
    const a = (0.2 + rng() * 0.55) * opacity;
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(2)}" fill="${color}" opacity="${a.toFixed(2)}"/>`
    );
  }

  // Bright stars — sharp core + larger glow halo + cross twinkle
  for (let i = 0; i < brightCount; i++) {
    const { x, y } = pickPosition();
    // Core radius: 0.8–1.5 device units (scale-relative but kept small)
    const r = (0.8 + rng() * 0.7) * sc;
    const a = (0.75 + rng() * 0.25) * opacity;
    // Glow circle: wider halo for visibility at thumbnail scale
    const glowR = (5.0 + rng() * 5.0) * sc;
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${glowR.toFixed(1)}" fill="${color}" opacity="${(a * 0.18).toFixed(2)}" filter="url(#${id}-glow)"/>`
    );
    // Cross twinkle arms — slightly longer for visibility at thumbnail
    const armLen = r * 7;
    elems.push(
      `<line x1="${(x - armLen).toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + armLen).toFixed(0)}" y2="${y.toFixed(0)}" stroke="${color}" stroke-width="${(r * 0.25).toFixed(1)}" opacity="${(a * 0.35).toFixed(2)}"/>`
    );
    elems.push(
      `<line x1="${x.toFixed(0)}" y1="${(y - armLen).toFixed(0)}" x2="${x.toFixed(0)}" y2="${(y + armLen).toFixed(0)}" stroke="${color}" stroke-width="${(r * 0.25).toFixed(1)}" opacity="${(a * 0.35).toFixed(2)}"/>`
    );
    elems.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(2)}" fill="${color}" opacity="${a.toFixed(2)}"/>`
    );
  }

  return { defs: defs.join("\n"), elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Nebula Glow Brick ──────────────────────────────────────────────────────────

export interface NebulaGlowBrickOptions {
  id?: string;
  /** Array of glow blobs: each has position, size, color */
  blobs: Array<{ cx: number; cy: number; rx: number; ry: number; color: string; opacity?: number }>;
  /** Blur amount as fraction of scale */
  blur?: number;
}

/**
 * Soft nebula/atmospheric glow regions using large blurred ellipses.
 */
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
  /** Y position of the tree bases as fraction */
  baseY: number;
  count?: number;
  color: string;
  opacity?: number;
  seedSuffix?: string;
  /** Max tree height as fraction of viewport height */
  maxHeight?: number;
}

/**
 * Silhouette treeline (conifer/pine shapes) along a horizon line.
 * Uses triangular Bézier paths for organic tree shapes.
 */
export function treelineBrick(params: BrickParams, options: TreelineBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const {
    baseY,
    count = 30,
    color,
    opacity = 0.9,
    seedSuffix = "trees",
    maxHeight = 0.12,
    id = "treeline",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${seedSuffix}`));
  const by = baseY * height;
  const elems: string[] = [];

  for (let i = 0; i < count; i++) {
    const x = (rng() * 1.1 - 0.05) * width;
    const treeH = (0.03 + rng() * maxHeight) * height;
    const treeW = treeH * (0.25 + rng() * 0.3);
    const tipY = by - treeH;
    // Organic conifer: Bézier triangle with slight asymmetry
    const lean = (rng() - 0.5) * treeW * 0.3;
    const d = `M ${x.toFixed(0)} ${by.toFixed(0)} C ${(x - treeW * 0.3).toFixed(0)} ${(by - treeH * 0.4).toFixed(0)} ${(x + lean - treeW * 0.15).toFixed(0)} ${(by - treeH * 0.7).toFixed(0)} ${(x + lean).toFixed(0)} ${tipY.toFixed(0)} C ${(x + lean + treeW * 0.15).toFixed(0)} ${(by - treeH * 0.7).toFixed(0)} ${(x + treeW * 0.3).toFixed(0)} ${(by - treeH * 0.4).toFixed(0)} ${x.toFixed(0)} ${by.toFixed(0)} Z`;
    elems.push(
      `<path d="${d}" fill="${color}" opacity="${(opacity * (0.7 + rng() * 0.3)).toFixed(2)}"/>`
    );
  }

  return { elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Horizon Glow Brick ─────────────────────────────────────────────────────────

export interface HorizonGlowBrickOptions {
  id?: string;
  /** Y position of the horizon as fraction */
  y: number;
  color: string;
  /** Height of the glow band as fraction */
  height?: number;
  opacity?: number;
}

/**
 * Subtle horizon glow — warm light where sky meets land.
 */
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
  opacity?: number;
}

/**
 * Shooting stars / meteors — short bright lines with glow tails.
 */
export function shootingStarBrick(
  params: BrickParams,
  options: ShootingStarBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const { count = 3, color = "#ffffff", opacity = 0.6, id = "meteor" } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-meteor`));
  const defs = `<filter id="${id}-trail" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(scale * 0.002).toFixed(1)}"/></filter>`;
  const elems: string[] = [];

  for (let i = 0; i < count; i++) {
    const x1 = rng() * width * 0.8 + width * 0.1;
    const y1 = rng() * height * 0.4;
    const len = (0.05 + rng() * 0.1) * width;
    const angle = 0.3 + rng() * 0.8;
    const x2 = x1 + len * Math.cos(angle);
    const y2 = y1 + len * Math.sin(angle);
    const sw = (1 + rng() * 2) * (scale / 2160);
    elems.push(
      `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${(opacity * (0.5 + rng() * 0.5)).toFixed(2)}" filter="url(#${id}-trail)"/>`
    );
  }

  return { defs, elements: `<g id="${id}">${elems.join("\n")}</g>` };
}

// ─── Dune Brick ─────────────────────────────────────────────────────────────────

export interface DuneBrickOptions {
  id?: string;
  baseY: number;
  /** Number of dune ridges */
  ridges?: number;
  color: string;
  opacity?: number;
  seedSuffix?: string;
}

/**
 * Rolling sand dune shapes using smooth Bézier curves — wider, flatter than mountains.
 */
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
      // Dunes have gentle, asymmetric undulation
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
  /** Start position as fraction */
  startX: number;
  startY: number;
  color?: string;
  opacity?: number;
  /** Number of bolt segments */
  segments?: number;
  /** Number of branches */
  branches?: number;
}

/**
 * Forked lightning bolt with Bézier jitter for organic electrical discharge.
 */
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

  // Main bolt
  const mainD = bolt(sx, sy, segments, 3 * sc);
  elems.push(
    `<path d="${mainD}" fill="none" stroke="${color}" stroke-width="${(4 * sc).toFixed(1)}" opacity="${opacity}" filter="url(#${id}-glow)"/>`
  );
  elems.push(
    `<path d="${mainD}" fill="none" stroke="#ffffff" stroke-width="${(1.5 * sc).toFixed(1)}" opacity="${(opacity * 0.9).toFixed(2)}"/>`
  );

  // Branch bolts
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

/**
 * Volcanic cone silhouette with crater and optional lava glow.
 */
export function volcanoBrick(params: BrickParams, options: VolcanoBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const _scale = Math.max(width, height);
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

  // Volcano silhouette with Bézier slopes
  const d = `M ${(px - slopeW).toFixed(0)} ${by.toFixed(0)} C ${(px - slopeW * 0.6).toFixed(0)} ${(by - peakHeight * height * 0.3).toFixed(0)} ${(px - cw * 2).toFixed(0)} ${(peakY + peakHeight * height * 0.1).toFixed(0)} ${(px - cw).toFixed(0)} ${peakY.toFixed(0)} L ${(px + cw).toFixed(0)} ${peakY.toFixed(0)} C ${(px + cw * 2).toFixed(0)} ${(peakY + peakHeight * height * 0.1).toFixed(0)} ${(px + slopeW * 0.6).toFixed(0)} ${(by - peakHeight * height * 0.3).toFixed(0)} ${(px + slopeW).toFixed(0)} ${by.toFixed(0)} L ${(px + slopeW).toFixed(0)} ${height.toFixed(0)} L ${(px - slopeW).toFixed(0)} ${height.toFixed(0)} Z`;

  const defs: string[] = [];
  const elems: string[] = [];
  elems.push(`<path id="${id}" d="${d}" fill="${color}" opacity="${opacity}"/>`);

  // Lava glow at crater
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

// ─── Terrain Contour Brick (d3-contour topographic silhouettes) ──────────────

export interface TerrainContourBrickOptions {
  /** Element id prefix */
  id?: string;
  /** Noise grid width — lower = coarser terrain (default 64) */
  gridW?: number;
  /** Noise grid height — lower = coarser terrain (default 36) */
  gridH?: number;
  /** Normalized Y where terrain begins to emerge (0–1, default 0.32) */
  horizonY?: number;
  /** Override contour thresholds (one per layer, ascending). Auto-distributed if omitted. */
  thresholds?: number[];
  /** One entry per mountain layer, farthest (lowest threshold) → nearest (highest threshold) */
  layers: Array<{
    color: string;
    opacity?: number;
    edgeBlur?: number;
  }>;
}

/**
 * Generates realistic topographic mountain silhouettes via d3-contour marching squares.
 *
 * A 2D fBm noise heightfield is sampled at multiple elevation thresholds. Each threshold
 * produces a GeoJSON MultiPolygon (the region ≥ that threshold) which is converted to a
 * filled SVG path by d3.geoPath(). Layering farthest→nearest with lighter→darker colors
 * creates convincing atmospheric depth that flat polygon terrain cannot achieve.
 *
 * Usage example (3-layer mountain range):
 * ```ts
 * terrainContourBrick(p, {
 *   id: "mtn",
 *   horizonY: 0.28,
 *   layers: [
 *     { color: colors.bgMid,  opacity: 0.50, edgeBlur: 4 },  // far
 *     { color: colors.bgSoft, opacity: 0.72 },                // mid
 *     { color: colors.bg,     opacity: 0.92 },                // near
 *   ],
 * });
 * ```
 */
export function terrainContourBrick(
  params: BrickParams,
  options: TerrainContourBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const { id = "tc", gridW = 64, gridH = 36, horizonY = 0.32, layers } = options;

  const numLayers = layers.length;
  // Auto-distribute thresholds across [0.28, 0.90] unless caller provides them
  const thresholds: number[] =
    options.thresholds ??
    Array.from({ length: numLayers }, (_, i) => 0.28 + (i + 1) * (0.62 / (numLayers + 1)));

  // Seeded 2D fBm heightfield
  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-contour`));
  const noise2D = createNoise2D(rng);

  const values: number[] = new Array(gridW * gridH);
  const s = 2.8; // spatial frequency of macro features
  for (let j = 0; j < gridH; j++) {
    for (let i = 0; i < gridW; i++) {
      const nx = i / gridW;
      const ny = j / gridH;
      // Vertical gravity: 0 at the horizon line, 1 at the bottom edge
      const vertBias = Math.max(0, (ny - horizonY) / (1 - horizonY));
      // 4-octave fBm (lacunarity 2, gain 0.5)
      const n =
        0.5 * noise2D(nx * s, ny * s) +
        0.25 * noise2D(nx * s * 2, ny * s * 2) +
        0.125 * noise2D(nx * s * 4, ny * s * 4) +
        0.063 * noise2D(nx * s * 8, ny * s * 8);
      // Remap fBm ≈[-0.938, 0.938] → [0, 1]
      const normalized = (n / 0.938) * 0.5 + 0.5;
      // Vertical bias dominates (0.78), noise adds organic ridge variation (0.22)
      values[i + j * gridW] = Math.min(1, Math.max(0, vertBias * 0.78 + normalized * 0.22));
    }
  }

  // d3-contour: marching squares → GeoJSON MultiPolygon per threshold
  const contourGen = contours().size([gridW, gridH]).smooth(true);
  const pathGen = geoPath(); // identity projection: grid-space → SVG path

  const defParts: string[] = [];
  const elemParts: string[] = [];

  // Scale grid-space [0,gridW]×[0,gridH] → viewport [0,width]×[0,height]
  const scaleX = (width / gridW).toFixed(4);
  const scaleY = (height / gridH).toFixed(4);

  for (let li = 0; li < numLayers; li++) {
    const { color, opacity = 0.85, edgeBlur = 0 } = layers[li];
    const threshold = thresholds[li];

    const multiPoly = contourGen.contour(values, threshold);
    const svgD = pathGen(multiPoly);
    if (!svgD) continue;

    const layerId = `${id}-l${li}`;
    let filterAttr = "";
    if (edgeBlur > 0) {
      const blurId = `${layerId}-blur`;
      // Blur radius in grid units so visual size is consistent regardless of gridW/H
      const minScale = Math.min(width / gridW, height / gridH);
      const stdDev = (edgeBlur / minScale).toFixed(1);
      defParts.push(
        `<filter id="${blurId}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${stdDev}"/></filter>`
      );
      filterAttr = ` filter="url(#${blurId})"`;
    }
    elemParts.push(`<path d="${svgD}" fill="${color}" opacity="${opacity}"${filterAttr}/>`);
  }

  const groupElem = `<g transform="scale(${scaleX} ${scaleY})">${elemParts.join("")}</g>`;

  return {
    defs: defParts.length > 0 ? defParts.join("\n") : undefined,
    elements: groupElem,
  };
}
