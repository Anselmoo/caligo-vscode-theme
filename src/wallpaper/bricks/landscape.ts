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
    const rjsRoughness = Math.max(2, roughness * 38);
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
 * Domain-warped fractal terrain noise using simplex-noise.
 * Returns `count` Y-offsets for evenly-spaced X positions in [0, width].
 *
 * Domain warping: before sampling the main fBm, the horizontal coordinate t
 * is displaced by a second independent noise field at lower frequency. This
 * prevents the characteristic regular periodicity of bare fBm that looks like
 * a sine wave — warped noise produces asymmetric peaks and irregular valleys
 * that read as real mountain silhouettes.
 *
 * Lacunarity 2.2, gain 0.54 — persistent mid-freq detail for convincing ridges.
 */
function terrainNoise(rng: () => number, count: number, amp: number): number[] {
  const noise2D = createNoise2D(rng);
  const warpNoise = createNoise2D(rng); // independent seed from next rng values
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    // Two-scale domain warp: large-scale warp (0.7×) + medium-scale warp (2.0×)
    // distorts the sampling coordinate so noise never repeats at regular intervals
    const warp = warpNoise(t * 0.7, 53.1) * 0.42 + warpNoise(t * 2.0, 91.4) * 0.16;
    const wt = t + warp;
    // 4-octave fBm on warped coordinates
    let n = 0;
    let freq = 2.0;
    let weight = 0.48;
    let yOff = 0;
    for (let oct = 0; oct < 4; oct++) {
      n += noise2D(wt * freq, yOff) * weight;
      freq *= 2.2;
      weight *= 0.54;
      yOff += 3.7;
    }
    values.push(n * amp);
  }
  // 3-tap Gaussian smooth — removes rapid direction reversals that roughjs amplifies into zig-zags
  for (let i = 1; i < values.length - 1; i++) {
    values[i] = 0.25 * values[i - 1] + 0.5 * values[i] + 0.25 * values[i + 1];
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
  gradient?: { topColor: string; bottomColor: string; topOpacity?: number; bottomOpacity?: number };
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
    points = 40,
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
    const tOp = (gradient.topOpacity ?? 1).toFixed(2);
    const bOp = (gradient.bottomOpacity ?? 1).toFixed(2);
    defs.push(`<linearGradient id="${id}-grd" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${gradient.topColor}" stop-opacity="${tOp}"/>
  <stop offset="35%" stop-color="${gradient.bottomColor}" stop-opacity="${bOp}"/>
  <stop offset="100%" stop-color="${gradient.bottomColor}" stop-opacity="${bOp}"/>
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

// ─── Ridge Highlight Brick ──────────────────────────────────────────────────────

export interface RidgeHighlightBrickOptions {
  id?: string;
  /** Must match baseY and seedSuffix of the terrain layer being highlighted */
  baseY: number;
  roughness?: number;
  points?: number;
  color: string;
  opacity?: number;
  /** Glow stroke width in pixels at 4K reference resolution */
  glowPx?: number;
  seedSuffix?: string;
}

/**
 * Glowing ridgeline that sits precisely on top of a matching terrainBrick layer.
 * Re-generates the same ridgeline using identical seedSuffix, then renders it as a
 * stroked path with anisotropic blur — aurora or moonlight catching the mountain tops.
 *
 * Pair with terrainBrick using the same baseY / roughness / seedSuffix values.
 */
export function ridgeHighlightBrick(
  params: BrickParams,
  options: RidgeHighlightBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    baseY,
    roughness = 0.08,
    points = 40,
    color,
    opacity = 0.2,
    glowPx = 18,
    seedSuffix = "terrain",
    id = "ridge-hl",
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

  const ridgePath = catmullRomToBezierPath(ridgePts);
  const gw = (glowPx * scale) / 2160;

  // Anisotropic blur — wide vertical spread mimics light spilling up and down from
  // the ridge; minimal horizontal spread keeps the glow tight to the peak shape.
  const defs = `<filter id="${id}-glow" x="-8%" y="-600%" width="116%" height="1300%">
  <feGaussianBlur stdDeviation="${(gw * 0.3).toFixed(1)} ${(gw * 3.0).toFixed(1)}"/>
</filter>`;

  const elements = [
    `<path d="${ridgePath}" fill="none" stroke="${color}" stroke-width="${(gw * 3.5).toFixed(1)}" opacity="${(opacity * 0.35).toFixed(2)}" filter="url(#${id}-glow)"/>`,
    `<path d="${ridgePath}" fill="none" stroke="${color}" stroke-width="${(gw * 0.6).toFixed(1)}" opacity="${opacity.toFixed(2)}" stroke-linecap="round"/>`,
  ].join("\n");

  return { defs, elements: `<g id="${id}">${elements}</g>` };
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
    opacity = 0.12,
    rippleScale = 8,
    rippleFrequency = 0.015,
    id = "water",
  } = options;

  const wy = waterY * height;
  const waterHeight = height - wy;
  const rs = rippleScale * (scale / 2160);

  // Soft top-edge fade prevents the hard horizontal stripe at the waterline.
  const defs = `<filter id="${id}-ripple" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="${rippleFrequency}" numOctaves="3" seed="42" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="${rs.toFixed(0)}" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="14%" stop-color="${color}" stop-opacity="${(opacity * 0.6).toFixed(2)}"/>
  <stop offset="38%" stop-color="${color}" stop-opacity="${opacity}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="${(opacity * 0.2).toFixed(2)}"/>
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

  // Crescent mask — SVG mask punches the shadow circle out of the moon disc
  if (crescent) {
    const sx = px + crescent.offsetX * pr;
    const sy = py + crescent.offsetY * pr;
    defs.push(`<mask id="${id}-msk">
  <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="white"/>
  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(pr * 0.92).toFixed(1)}" fill="black"/>
</mask>`);
  }

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

  // Disc — apply crescent mask when specified
  const maskAttr = crescent ? ` mask="url(#${id}-msk)"` : "";
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${color}" opacity="0.95"${maskAttr}/>`
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
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${color}" opacity="0.2" filter="url(#${id}-tex)"${maskAttr}/>`
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
  /** Number of overlapping curtain layers (2–5, default 4) */
  bands?: number;
  cy?: number;
  zoneHeight?: number;
  color: string;
  color2?: string;
  opacity?: number;
  /** Kept for API compatibility — displacement is always applied */
  displacement?: boolean;
}

/**
 * Photorealistic aurora curtain — a full composition of:
 * - Ambient radial glow spanning the aurora zone
 * - 2–4 overlapping curtain layers, each rendered as a FULL-CANVAS rect with
 *   userSpaceOnUse gradient so visibility is controlled purely by gradient stops
 *   (eliminates hard rect-boundary edges):
 *   · anisotropic feTurbulence (high X / low Y) → thin vertical column structure
 *   · feColorMatrix threshold → discrete column alpha
 *   · anisotropic feGaussianBlur (tight H, wide V) → each column = tall light ray
 *   · feComposite reveals gradient through column mask
 *   · feDisplacementMap → large-scale curtain fold
 *   · horizontal patch modulation (second low-X turbulence) → brightness variation
 *     across the aurora width for a 3D volumetric depth impression
 * - Fine shimmer (higher-frequency third pass)
 * - Diffuse base contact glow (radial, not a rect band)
 *
 * Each layer uses progressively narrower vertical blur to create a parallax depth
 * cue: hero curtain appears closest (tallest rays), background curtains are farther.
 */
export function auroraAdvancedBrick(
  params: BrickParams,
  options: AuroraAdvancedBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    bands: bandCount = 5,
    cy = 0.25,
    zoneHeight = 0.3,
    color,
    color2,
    opacity = 0.62,
    id = "aurora",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-aurora`));
  const c2 = color2 ?? color;

  // Aurora zone in canvas-space pixels (for userSpaceOnUse gradients)
  const zoneTopPx = Math.max(0, cy - zoneHeight / 2) * height;
  const zoneBottomPx = Math.min(height, cy + zoneHeight / 2) * height;
  const zoneHPx = zoneBottomPx - zoneTopPx;
  const zoneCyPx = cy * height;

  const defs: string[] = [];
  const elems: string[] = [];

  // ── 1. Ambient background glow ────────────────────────────────────────────
  const glowId = `${id}-glow`;
  defs.push(
    `<radialGradient id="${glowId}" cx="${(width * 0.5).toFixed(0)}" cy="${zoneCyPx.toFixed(0)}" r="${(scale * 0.55).toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${(opacity * 0.22).toFixed(2)}"/>
  <stop offset="45%" stop-color="${color}" stop-opacity="${(opacity * 0.05).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`
  );
  elems.push(`<rect width="${width}" height="${height}" fill="url(#${glowId})"/>`);

  // ── 2. Background diffuse aurora ─────────────────────────────────────────
  // Represents distant aurora behind the main active curtains — soft wide
  // columns with heavy blur. Creates the sense of depth: there is MORE aurora
  // behind the sharp foreground curtain. Wider column freq (0.007) + strong
  // vertical blur = the "sky glow" of a distant aurora field.
  const bgdSeed = Math.floor(rng() * 89) + 1;
  const bgdId = `${id}-bgd`;
  const bgdGId = `${id}-bgdg`;
  const bpp = (y: number) => `${((y / height) * 100).toFixed(2)}%`;
  defs.push(
    `<linearGradient id="${bgdGId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${c2}" stop-opacity="0"/>
  <stop offset="${bpp(zoneTopPx)}" stop-color="${c2}" stop-opacity="0"/>
  <stop offset="${bpp(zoneTopPx + zoneHPx * 0.12)}" stop-color="${c2}" stop-opacity="${(opacity * 0.28).toFixed(2)}"/>
  <stop offset="${bpp(zoneTopPx + zoneHPx * 0.58)}" stop-color="${color}" stop-opacity="${(opacity * 0.2).toFixed(2)}"/>
  <stop offset="${bpp(Math.min(height, zoneBottomPx + zoneHPx * 0.45))}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>
<filter id="${bgdId}" x="-10%" y="0%" width="120%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.0065 0.0007" numOctaves="4" seed="${bgdSeed}" result="bgc"/>
  <feColorMatrix in="bgc" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5.5 0 0 0 -2.8" result="bgMask"/>
  <feGaussianBlur in="bgMask" stdDeviation="${(scale * 0.006).toFixed(1)} ${(scale * 0.045).toFixed(1)}" result="bgSoft"/>
  <feComposite in="SourceGraphic" in2="bgSoft" operator="in"/>
</filter>`
  );
  elems.push(
    `<rect width="${width}" height="${height}" fill="url(#${bgdGId})" filter="url(#${bgdId})"/>`
  );

  // ── 3. Curtain layers ─────────────────────────────────────────────────────
  // Critical: all rects span the FULL canvas height. Visibility is driven
  // entirely by linearGradient stops as percentages — no hard rect boundary.
  //
  // 3D depth stack:
  //   · Background diffuse (above): far aurora, softly glowing, no fold detail
  //   · Hero curtain (ci=0): tallest rays, strongest displacement, fold shading
  //   · Subsequent curtains: shorter rays (farther = smaller apparent height),
  //     less sway, different color — creates parallax depth impression
  //
  // Fold brightness shading (key 3D cue): feBlend(multiply) of each curtain
  // against a slowly-varying horizontal grayscale (0.36–0.88) — lit folds
  // face the viewer, shadowed folds face away. feComposite(in) restores alpha.

  const curtainCount = Math.min(4, Math.max(2, Math.round(bandCount * 0.75)));

  for (let ci = 0; ci < curtainCount; ci++) {
    const isHero = ci === 0;
    const curtainColor = ci % 2 === 0 ? color : c2;
    const curtainOpacity = opacity * (isHero ? 1.0 : 0.38 + rng() * 0.38);

    const seed1 = Math.floor(rng() * 89) + 1;
    const seed2 = Math.floor(rng() * 89) + 1;
    const seed3 = Math.floor(rng() * 89) + 1;
    const seed4 = Math.floor(rng() * 89) + 1;

    // Column frequency — wider columns = clearly visible ray structure at all scales
    const colFreqX = (0.018 + rng() * 0.012).toFixed(4);
    const colFreqY = (0.0012 + rng() * 0.001).toFixed(4);

    // Depth factor: hero is 1.0, subsequent layers get progressively less blur
    const depthFactor = 1.0 / (1 + ci * 0.32);
    // hBlur: 4-8px at 1600 — visible column edges, not hairline or smeared
    const hBlur = (scale * (0.0025 + rng() * 0.0015)).toFixed(1);
    const vBlur = (scale * (0.02 + rng() * 0.012) * depthFactor).toFixed(1);

    // Fold displacement — closer curtains sway more
    const dispScale = (scale * (0.035 + rng() * 0.03) * (0.7 + depthFactor * 0.3)).toFixed(0);

    // Large-scale sway frequency for second displacement pass
    const hPatchFreq = (0.003 + rng() * 0.003).toFixed(4);

    // High threshold: only top ~20% of noise values form ray columns
    const boost = (10.0 + rng() * 4.0).toFixed(1);
    const bias = (-(Number(boost) * (0.78 + rng() * 0.04))).toFixed(2);

    // Fold brightness: horizontal light/shadow bands — each layer gets different
    // fold scale (0.004-0.007 X freq → 2-4 fold sections across aurora width)
    const foldFreqX = (0.004 + rng() * 0.003).toFixed(4);
    const foldBlurX = (scale * (0.025 + rng() * 0.015)).toFixed(1);

    const cfId = `${id}-cf${ci}`;
    const cgId = `${id}-cg${ci}`;

    // Gradient spans full canvas height — stops as percentages so visibility is
    // driven purely by gradient, not rect boundaries. Extended lower fade zone
    // (50% of zoneHeight past the bottom) prevents any hard horizontal edge.
    const p = (y: number) => `${((y / height) * 100).toFixed(2)}%`;
    const fadeInPct = p(zoneTopPx);
    const peakPct = p(zoneTopPx + zoneHPx * 0.08);
    const greenPct = p(zoneTopPx + zoneHPx * 0.35);
    const fadeOutStartPct = p(zoneBottomPx - zoneHPx * 0.08);
    const fadeOutEndPct = p(Math.min(height, zoneBottomPx + zoneHPx * 0.55));
    const topColor = isHero ? "#ff4848" : c2;
    defs.push(
      `<linearGradient id="${cgId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${topColor}" stop-opacity="0"/>
  <stop offset="${fadeInPct}" stop-color="${topColor}" stop-opacity="0"/>
  <stop offset="${peakPct}" stop-color="${topColor}" stop-opacity="${(curtainOpacity * 0.45).toFixed(2)}"/>
  <stop offset="${greenPct}" stop-color="${curtainColor}" stop-opacity="${(curtainOpacity * 0.92).toFixed(2)}"/>
  <stop offset="${fadeOutStartPct}" stop-color="${curtainColor}" stop-opacity="${(curtainOpacity * 0.55).toFixed(2)}"/>
  <stop offset="${fadeOutEndPct}" stop-color="${curtainColor}" stop-opacity="0"/>
  <stop offset="100%" stop-color="${curtainColor}" stop-opacity="0"/>
</linearGradient>`
    );

    // Filter chain (7 stages for 3D depth):
    //  1. Column mask: anisotropic turbulence → threshold → blur → alpha columns
    //  2. Reveal gradient through column mask (SourceGraphic = gradient rect)
    //  3. FOLD BRIGHTNESS: horizontal low-freq noise → grayscale 0.36-0.88
    //     → feBlend multiply darkens shadow-facing folds, brightens lit folds
    //     → feComposite "in" restores original column alpha (no color leak)
    //  4. Fine displacement: mid-freq flow turbulence → curtain sway detail
    //  5. Coarse sway: large-scale slow undulation for broad curtain depth
    defs.push(
      `<filter id="${cfId}" x="-20%" y="0%" width="140%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${colFreqX} ${colFreqY}" numOctaves="5" seed="${seed1}" result="cols"/>
  <feColorMatrix in="cols" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${boost} 0 0 0 ${bias}" result="colMask"/>
  <feGaussianBlur in="colMask" stdDeviation="${hBlur} ${vBlur}" result="softCols"/>
  <feComposite in="SourceGraphic" in2="softCols" operator="in" result="curtain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${foldFreqX} 0.00003" numOctaves="2" seed="${seed4}" result="foldNoise"/>
  <feColorMatrix in="foldNoise" type="matrix" values="0.52 0 0 0 0.36  0.52 0 0 0 0.36  0.52 0 0 0 0.36  0 0 0 1 0" result="foldGray"/>
  <feGaussianBlur in="foldGray" stdDeviation="${foldBlurX} 0" result="softFold"/>
  <feBlend in="curtain" in2="softFold" mode="multiply" result="shadedCurtain"/>
  <feComposite in="shadedCurtain" in2="curtain" operator="in" result="foldedCurtain"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.006 0.0008" numOctaves="3" seed="${seed2}" result="flow"/>
  <feDisplacementMap in="foldedCurtain" in2="flow" scale="${dispScale}" xChannelSelector="R" yChannelSelector="G" result="swayedCurtain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${hPatchFreq} 0.0003" numOctaves="2" seed="${seed3}" result="sway"/>
  <feDisplacementMap in="swayedCurtain" in2="sway" scale="${(Number(dispScale) * 0.55).toFixed(0)}" xChannelSelector="G" yChannelSelector="R"/>
</filter>`
    );

    // Full-canvas rect — gradient stops control all visibility, no hard edge
    elems.push(
      `<rect width="${width}" height="${height}" fill="url(#${cgId})" filter="url(#${cfId})"/>`
    );
  }

  // ── 3. Fine shimmer ───────────────────────────────────────────────────────
  // Higher-frequency pass — thin bright needle rays at full 4K resolution.
  // Also uses userSpaceOnUse with extended fade zone.
  const shimSeed = Math.floor(rng() * 89) + 1;
  const shimH = (scale * 0.0004).toFixed(1);
  const shimV = (scale * 0.006).toFixed(1);
  const shimId = `${id}-shim`;
  const shimGId = `${id}-sg`;
  const sp = (y: number) => `${((y / height) * 100).toFixed(2)}%`;

  defs.push(
    `<linearGradient id="${shimGId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="${sp(zoneTopPx)}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="${sp(zoneTopPx + zoneHPx * 0.12)}" stop-color="${color}" stop-opacity="${(opacity * 0.24).toFixed(2)}"/>
  <stop offset="${sp(zoneTopPx + zoneHPx * 0.55)}" stop-color="${color}" stop-opacity="${(opacity * 0.14).toFixed(2)}"/>
  <stop offset="${sp(Math.min(height, zoneBottomPx + zoneHPx * 0.4))}" stop-color="${color}" stop-opacity="0"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>
<filter id="${shimId}" x="-5%" y="0%" width="110%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.072 0.003" numOctaves="3" seed="${shimSeed}" result="shim"/>
  <feColorMatrix in="shim" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  7 0 0 0 -4.5" result="shimMask"/>
  <feGaussianBlur in="shimMask" stdDeviation="${shimH} ${shimV}" result="softShim"/>
  <feComposite in="SourceGraphic" in2="softShim" operator="in"/>
</filter>`
  );
  elems.push(
    `<rect width="${width}" height="${height}" fill="url(#${shimGId})" filter="url(#${shimId})"/>`
  );

  // ── 4. Base contact glow ──────────────────────────────────────────────────
  // Subtle radial gradient centered at the lower aurora zone —
  // kept intentionally dim so it doesn't overwhelm the curtain structure.
  // Real aurora background luminosity is ≤10–15% compared to the bright rays.
  const baseGlowId = `${id}-bg`;
  const baseCx = width * 0.5;
  const baseCy = zoneTopPx + zoneHPx * 0.72;
  // Narrower radius so the glow stays within the aurora band, not flooding the whole sky
  const baseRx = scale * 0.3;
  const baseRy = zoneHPx * 0.28;
  defs.push(
    `<radialGradient id="${baseGlowId}" cx="${baseCx.toFixed(0)}" cy="${baseCy.toFixed(0)}" rx="${baseRx.toFixed(0)}" ry="${baseRy.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${(opacity * 0.22).toFixed(2)}"/>
  <stop offset="45%" stop-color="${color}" stop-opacity="${(opacity * 0.1).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`
  );
  elems.push(`<rect width="${width}" height="${height}" fill="url(#${baseGlowId})"/>`);

  return {
    defs: defs.join("\n"),
    elements: elems.join("\n"),
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
  // sc=1.0 at 960px (gallery/HD), scales up for 4K — ensures stars are always ≥0.5px
  const sc = scale / 960;

  // Glow filter: moderate blur so halos don't overwhelm at any resolution
  const glowBlur = (2.5 * sc).toFixed(1);
  defs.push(
    `<filter id="${id}-glow" x="-400%" y="-400%" width="900%" height="900%"><feGaussianBlur stdDeviation="${glowBlur}"/></filter>`
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

  // Dim stars — crisp single-pixel dots with magnitude variation
  // r = 0.5–1.3px at 960px canvas, scales proportionally for 4K
  for (let i = 0; i < count; i++) {
    const { x, y } = pickPosition();
    const r = (0.5 + rng() * 0.8) * sc;
    // Atmospheric extinction: stars near the horizon scatter through more atmosphere
    const extinction =
      distribution === "upper" ? Math.max(0.2, 1 - (y / (height * 0.55)) ** 1.3 * 0.7) : 1.0;
    const a = (0.25 + rng() * 0.65) * opacity * extinction;
    elems.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${a.toFixed(2)}"/>`
    );
  }

  // Bright stars — sharp core + radial glow halo + cross-shaped diffraction spike
  // r = 1.2–2.5px core at 960px, glow 5–14px, arms 6–18px
  for (let i = 0; i < brightCount; i++) {
    const { x, y } = pickPosition();
    const r = (1.2 + rng() * 1.3) * sc;
    const extinctBright =
      distribution === "upper" ? Math.max(0.3, 1 - (y / (height * 0.55)) ** 1.3 * 0.6) : 1.0;
    const a = (0.8 + rng() * 0.2) * opacity * extinctBright;
    // Glow halo — soft blur, 4–12px radius
    const glowR = (4 + rng() * 8) * sc;
    elems.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${glowR.toFixed(1)}" fill="${color}" opacity="${(a * 0.22).toFixed(2)}" filter="url(#${id}-glow)"/>`
    );
    // Cross diffraction spike (4-pointed star shape)
    const armLen = (3 + rng() * 5) * sc;
    const armW = (r * 0.35).toFixed(2);
    elems.push(
      `<line x1="${(x - armLen).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + armLen).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="${armW}" opacity="${(a * 0.45).toFixed(2)}"/>`
    );
    elems.push(
      `<line x1="${x.toFixed(1)}" y1="${(y - armLen).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + armLen).toFixed(1)}" stroke="${color}" stroke-width="${armW}" opacity="${(a * 0.45).toFixed(2)}"/>`
    );
    // Bright core circle
    elems.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${a.toFixed(2)}"/>`
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
  // Padding must be ≥ 3× stdDeviation relative to the ellipse's bounding box;
  // insufficient padding clips the blur rectangle, producing square-edged glows.
  const defs = `<filter id="${id}-blur" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

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
  // sc=1.0 at 960px canvas, scales up for 4K
  const sc = scale / 960;

  const defs: string[] = [];
  const elems: string[] = [];

  // Soft outer glow filter for meteor trails
  defs.push(
    `<filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(1.5 * sc).toFixed(1)}"/></filter>`
  );

  for (let i = 0; i < count; i++) {
    // Meteors enter from upper portion of sky, travel at a downward angle
    const x1 = rng() * width * 0.7 + width * 0.05;
    const y1 = rng() * height * 0.35;
    // Angle: 25–55° below horizontal (realistic meteor entry angle)
    const angle = 0.44 + rng() * 0.52; // 25–55° in radians
    // Trail length: 8–18% of canvas width for prominent visibility
    const len = (0.08 + rng() * 0.1) * width;
    // Head is at (x1,y1), trail extends BACKWARDS (opposite direction of travel)
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const x2 = x1 - len * dx;
    const y2 = y1 - len * dy;

    const mOp = opacity * (0.65 + rng() * 0.35);
    const gradId = `${id}-g${i}`;
    const coreW = (1.5 + rng() * 1.5) * sc;
    const glowW = coreW * 4;

    // Linear gradient: bright at head (x1,y1), transparent at tail (x2,y2)
    defs.push(
      `<linearGradient id="${gradId}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${mOp.toFixed(2)}"/>
  <stop offset="15%" stop-color="${color}" stop-opacity="${(mOp * 0.85).toFixed(2)}"/>
  <stop offset="60%" stop-color="${color}" stop-opacity="${(mOp * 0.35).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`
    );

    // Outer glow pass (wide, blurred)
    elems.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${glowW.toFixed(1)}" stroke-linecap="round" opacity="${(mOp * 0.25).toFixed(2)}" filter="url(#${id}-glow)"/>`
    );
    // Core trail with gradient fade
    elems.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="url(#${gradId})" stroke-width="${coreW.toFixed(1)}" stroke-linecap="round"/>`
    );
    // Bright glowing head dot
    const headR = (coreW * 1.8).toFixed(1);
    elems.push(
      `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${headR}" fill="${color}" opacity="${mOp.toFixed(2)}" filter="url(#${id}-glow)"/>`
    );
    elems.push(
      `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${(parseFloat(headR) * 0.45).toFixed(1)}" fill="${color}" opacity="${mOp.toFixed(2)}"/>`
    );
  }

  return { defs: defs.join("\n"), elements: `<g id="${id}">${elems.join("\n")}</g>` };
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
  /** Strike origin (fraction of canvas) */
  startX: number;
  startY: number;
  /** Strike terminus (fraction). Defaults to near-ground directly below. */
  endX?: number;
  endY?: number;
  color?: string;
  opacity?: number;
  /** Kept for API compatibility — fractal depth is derived automatically */
  segments?: number;
  /** Number of primary branch forks (default 3) */
  branches?: number;
}

/**
 * Photorealistic lightning bolt — a full composition of:
 * - Sky flash: large soft radial glow illuminating the surrounding atmosphere
 * - Fractal bolt (midpoint displacement, depth 5 → 32 segments): angular jags,
 *   not smooth curves — the characteristic electrical discharge look
 * - 3–6 recursive branch forks (primary + tertiary), each at decreasing width/opacity
 * - Multi-layer channel rendering:
 *   · Outer atmospheric glow (thick stroke + heavy blur — ionized air column)
 *   · Inner plasma glow (medium stroke + medium blur)
 *   · Hot core channel (thin stroke, no blur — the actual arc)
 *   · White-hot center (1px pure white)
 * - Ground strike flash: intense radial burst at termination point
 */
export function lightningBrick(params: BrickParams, options: LightningBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    startX,
    startY,
    color = "#c8d8ff",
    opacity = 0.85,
    branches = 3,
    id = "lightning",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-bolt`));
  const sc = scale / 3840; // scale factor (1.0 at 4K)

  // Terminus defaults: ground strike near base, slightly offset from start
  const ex = (options.endX ?? startX + (rng() - 0.5) * 0.18) * width;
  const ey = (options.endY ?? 0.8 + rng() * 0.14) * height;
  const sx = startX * width;
  const sy = startY * height;

  // ── Midpoint displacement fractal bolt ────────────────────────────────────
  // Angular jags via recursive perpendicular midpoint perturbation.
  // Jitter scales with segment length → self-similar fractal structure.
  function fractalBolt(x1: number, y1: number, x2: number, y2: number, depth: number): Pt[] {
    if (depth === 0)
      return [
        [x1, y1],
        [x2, y2],
      ];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 2)
      return [
        [x1, y1],
        [x2, y2],
      ];
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const px = -(y2 - y1) / len; // perpendicular unit vector
    const py = (x2 - x1) / len;
    const jitter = (rng() - 0.5) * len * 0.55;
    const jx = mx + px * jitter;
    const jy = my + py * jitter;
    const left = fractalBolt(x1, y1, jx, jy, depth - 1);
    const right = fractalBolt(jx, jy, x2, y2, depth - 1);
    return [...left, ...right.slice(1)];
  }

  function ptsToPath(pts: Pt[]): string {
    return pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join(" ");
  }

  const defs: string[] = [];
  const elems: string[] = [];

  // ── 1. Sky flash — atmospheric cloud illumination ─────────────────────────
  // The cloud base and surrounding atmosphere "lights up" white before thunder.
  const flashCx = (sx + ex) / 2;
  const flashCy = sy + (ey - sy) * 0.22;
  const flashFId = `${id}-ff`;
  const flashGId = `${id}-fg`;
  defs.push(
    `<filter id="${flashFId}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${(scale * 0.038).toFixed(0)}"/></filter>
<radialGradient id="${flashGId}" cx="${flashCx.toFixed(0)}" cy="${flashCy.toFixed(0)}" r="${(scale * 0.2).toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${(opacity * 0.22).toFixed(2)}"/>
  <stop offset="50%" stop-color="${color}" stop-opacity="${(opacity * 0.05).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`
  );
  elems.push(
    `<ellipse cx="${flashCx.toFixed(0)}" cy="${flashCy.toFixed(0)}" rx="${(scale * 0.2).toFixed(0)}" ry="${(scale * 0.15).toFixed(0)}" fill="url(#${flashGId})" filter="url(#${flashFId})"/>`
  );

  // ── 2. Generate fractal bolt paths ────────────────────────────────────────
  const mainPts = fractalBolt(sx, sy, ex, ey, 5); // depth 5 → 32 angular segments
  const mainD = ptsToPath(mainPts);

  // Primary branches + tertiary sub-branches
  interface BranchPath {
    d: string;
    wf: number;
    of: number;
  }
  const branchPaths: BranchPath[] = [];
  const parentAngle = Math.atan2(ey - sy, ex - sx);

  for (let b = 0; b < Math.min(branches, 5); b++) {
    // Fork from upper 60% of trunk — real lightning branches early
    const bi = 2 + Math.floor(rng() * Math.floor(mainPts.length * 0.55));
    const [bx, by] = mainPts[bi];
    const deviate = (rng() > 0.5 ? 1 : -1) * (0.38 + rng() * 0.52);
    const bAngle = parentAngle + deviate;
    const remainLen = Math.hypot(ex - bx, ey - by);
    const bLen = remainLen * (0.22 + rng() * 0.32);
    const bPts = fractalBolt(bx, by, bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen, 4);
    const bwf = 0.5 + rng() * 0.28;
    const bof = 0.45 + rng() * 0.3;
    branchPaths.push({ d: ptsToPath(bPts), wf: bwf, of: bof });

    // Tertiary branch (~35% chance per primary branch)
    if (rng() < 0.35 && bPts.length > 4) {
      const ti = 1 + Math.floor(rng() * Math.floor(bPts.length * 0.55));
      const [tx, ty] = bPts[ti];
      const tAngle = bAngle + (rng() > 0.5 ? 1 : -1) * (0.4 + rng() * 0.45);
      const tLen = bLen * (0.25 + rng() * 0.2);
      const tPts = fractalBolt(
        tx,
        ty,
        tx + Math.cos(tAngle) * tLen,
        ty + Math.sin(tAngle) * tLen,
        3
      );
      branchPaths.push({ d: ptsToPath(tPts), wf: 0.28 + rng() * 0.18, of: 0.25 + rng() * 0.22 });
    }
  }

  // ── 3. Multi-layer channel rendering ──────────────────────────────────────
  // Three concentric glow layers simulate the ionized air column:
  //   · Outer atmospheric glow: wide + heavy blur — diffuse sky illumination
  //   · Inner plasma glow: medium + moderate blur — excited particle column
  //   · Hot core: thin, no blur — the actual conductive arc
  //   · White-hot center: 1px pure white — peak luminance

  const ogId = `${id}-og`;
  const igId = `${id}-ig`;
  defs.push(
    `<filter id="${ogId}" x="-40%" y="-10%" width="180%" height="120%"><feGaussianBlur stdDeviation="${(scale * 0.0048).toFixed(1)}"/></filter>
<filter id="${igId}" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="${(scale * 0.0016).toFixed(1)}"/></filter>`
  );

  const swOut = (24 * sc).toFixed(1);
  const swIn = (8 * sc).toFixed(1);
  const swCore = (2.8 * sc).toFixed(1);
  const swWhite = (1.3 * sc).toFixed(1);

  // Outer atmospheric glow (main + branches)
  elems.push(
    `<path d="${mainD}" fill="none" stroke="${color}" stroke-width="${swOut}" opacity="${(opacity * 0.16).toFixed(2)}" filter="url(#${ogId})" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  for (const bp of branchPaths) {
    elems.push(
      `<path d="${bp.d}" fill="none" stroke="${color}" stroke-width="${(parseFloat(swOut) * bp.wf).toFixed(1)}" opacity="${(opacity * 0.09 * bp.of).toFixed(2)}" filter="url(#${ogId})" stroke-linecap="round"/>`
    );
  }

  // Inner plasma glow
  elems.push(
    `<path d="${mainD}" fill="none" stroke="${color}" stroke-width="${swIn}" opacity="${(opacity * 0.58).toFixed(2)}" filter="url(#${igId})" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  for (const bp of branchPaths) {
    elems.push(
      `<path d="${bp.d}" fill="none" stroke="${color}" stroke-width="${(parseFloat(swIn) * bp.wf).toFixed(1)}" opacity="${(opacity * 0.38 * bp.of).toFixed(2)}" filter="url(#${igId})" stroke-linecap="round"/>`
    );
  }

  // Hot core channel
  elems.push(
    `<path d="${mainD}" fill="none" stroke="${color}" stroke-width="${swCore}" opacity="${(opacity * 0.92).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  for (const bp of branchPaths) {
    elems.push(
      `<path d="${bp.d}" fill="none" stroke="${color}" stroke-width="${(parseFloat(swCore) * bp.wf).toFixed(1)}" opacity="${(opacity * 0.72 * bp.of).toFixed(2)}" stroke-linecap="round"/>`
    );
  }

  // White-hot center
  elems.push(
    `<path d="${mainD}" fill="none" stroke="#ffffff" stroke-width="${swWhite}" opacity="${(opacity * 0.9).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
  );

  // ── 4. Ground strike flash ────────────────────────────────────────────────
  const gsFId = `${id}-gsf`;
  const gsGId = `${id}-gsg`;
  defs.push(
    `<filter id="${gsFId}" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="${(scale * 0.005).toFixed(0)}"/></filter>
<radialGradient id="${gsGId}" cx="${ex.toFixed(0)}" cy="${ey.toFixed(0)}" r="${(scale * 0.038).toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="${(opacity * 0.82).toFixed(2)}"/>
  <stop offset="30%" stop-color="${color}" stop-opacity="${(opacity * 0.48).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`
  );
  elems.push(
    `<circle cx="${ex.toFixed(0)}" cy="${ey.toFixed(0)}" r="${(scale * 0.038).toFixed(0)}" fill="url(#${gsGId})" filter="url(#${gsFId})"/>`
  );

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
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

  // Lava glow — tall narrow column rising from crater, hot at base, fades upward.
  if (lavaColor) {
    const glowH = peakHeight * height * 0.55;
    defs.push(`<radialGradient id="${id}-lava" cx="50%" cy="85%" r="55%">
  <stop offset="0%" stop-color="${lavaColor}" stop-opacity="0.75"/>
  <stop offset="60%" stop-color="${lavaColor}" stop-opacity="0.3"/>
  <stop offset="100%" stop-color="${lavaColor}" stop-opacity="0"/>
</radialGradient>`);
    elems.push(
      `<ellipse cx="${px.toFixed(0)}" cy="${(peakY - glowH * 0.35).toFixed(0)}" rx="${(cw * 1.8).toFixed(0)}" ry="${glowH.toFixed(0)}" fill="url(#${id}-lava)"/>`
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
    elemParts.push(
      `<path id="${layerId}" d="${svgD}" fill="${color}" opacity="${opacity}"${filterAttr}/>`
    );
  }

  const groupElem = `<g transform="scale(${scaleX} ${scaleY})">${elemParts.join("")}</g>`;

  return {
    defs: defParts.length > 0 ? defParts.join("\n") : undefined,
    elements: groupElem,
  };
}
