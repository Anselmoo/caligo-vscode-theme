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

  // ── 3D lighting overlay: subtle diagonal gradient cast over the ridge body
  // produces a sense of side-lighting (lit windward face → shadow leeward face).
  const lightId = `${id}-3d`;
  defs.push(`<linearGradient id="${lightId}" x1="0.05" y1="0" x2="0.95" y2="0.65">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="0.14"/>
  <stop offset="30%" stop-color="#ffffff" stop-opacity="0.03"/>
  <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="80%" stop-color="#0a1020" stop-opacity="0.20"/>
  <stop offset="100%" stop-color="#0a1020" stop-opacity="0.38"/>
</linearGradient>`);

  // ── PER-PEAK SHADING: each significant peak in the ridge gets a vertical light
  // gradient on its lit (left) face and a shadow on its leeward (right) face.
  // This is what gives mountains their "coming forward" 3D appearance.
  // Implemented via a clipPath of the terrain silhouette + radial gradients
  // positioned at each detected peak (local minimum in y values = highest point).
  const clipId = `${id}-clip`;
  defs.push(`<clipPath id="${clipId}"><path d="${sketchPath}"/></clipPath>`);

  // Detect peaks — points where the curve dips down (lower y = higher elevation)
  // relative to neighbours within a ~7-sample window.
  const peakOverlays: string[] = [];
  const window = Math.max(3, Math.floor(points / 8));
  for (let i = window; i < ridgePts.length - window; i++) {
    const [px, py] = ridgePts[i];
    let isPeak = true;
    let leftMin = Infinity;
    let rightMin = Infinity;
    for (let k = 1; k <= window; k++) {
      const ly = ridgePts[i - k][1];
      const ry = ridgePts[i + k][1];
      if (ly < py || ry < py) {
        isPeak = false;
        break;
      }
      leftMin = Math.min(leftMin, ly);
      rightMin = Math.min(rightMin, ry);
    }
    if (!isPeak) continue;
    // Skip peaks that are too shallow (less than 1.5% of canvas height prominence)
    const prominence = Math.min(leftMin, rightMin) - py;
    if (prominence < height * 0.015) continue;

    // Lit-side highlight (radial, off to the upper-left of the peak)
    const peakGradId = `${id}-peak-${i}`;
    const peakR = Math.max(prominence * 1.6, height * 0.05);
    defs.push(`<radialGradient id="${peakGradId}" cx="${(px - peakR * 0.22).toFixed(1)}" cy="${(py + peakR * 0.08).toFixed(1)}" r="${peakR.toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="0.28"/>
  <stop offset="40%" stop-color="#fff0d0" stop-opacity="0.10"/>
  <stop offset="75%" stop-color="#ffffff" stop-opacity="0.02"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>`);
    peakOverlays.push(
      `<rect x="${(px - peakR).toFixed(1)}" y="${(py).toFixed(1)}" width="${(peakR * 2).toFixed(1)}" height="${(peakR * 2).toFixed(1)}" fill="url(#${peakGradId})" clip-path="url(#${clipId})"/>`
    );

    // Shadow on the leeward face (right side, slightly below peak) — stronger
    const shadowGradId = `${id}-pkshd-${i}`;
    defs.push(`<radialGradient id="${shadowGradId}" cx="${(px + peakR * 0.45).toFixed(1)}" cy="${(py + peakR * 0.35).toFixed(1)}" r="${(peakR * 1.0).toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#0a1020" stop-opacity="0.30"/>
  <stop offset="45%" stop-color="#0a1020" stop-opacity="0.10"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
</radialGradient>`);
    peakOverlays.push(
      `<rect x="${(px - peakR * 0.5).toFixed(1)}" y="${(py).toFixed(1)}" width="${(peakR * 2).toFixed(1)}" height="${(peakR * 2).toFixed(1)}" fill="url(#${shadowGradId})" clip-path="url(#${clipId})"/>`
    );
  }

  // ── Surface texture: feDiffuseLighting for 3D earth/rock bump ──
  const surfTexId = `${id}-stex`;
  const surfSeed = (hashStr(`${seedId}-${harmonyMode}-${seedSuffix}-tex`) % 97) + 1;
  defs.push(`<filter id="${surfTexId}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.06" numOctaves="5" seed="${surfSeed}" result="tBump"/>
  <feDiffuseLighting in="tBump" surfaceScale="2.5" diffuseConstant="0.65" result="tLit" lighting-color="#706050">
    <feDistantLight azimuth="215" elevation="35"/>
  </feDiffuseLighting>
  <feComposite in="tLit" in2="SourceGraphic" operator="in"/>
</filter>`);

  // ── Rim highlight — bright stroke along the ridgeline for sun-facing edge ──
  const rimBlurId = `${id}-rimblur`;
  defs.push(`<filter id="${rimBlurId}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>`);

  const elems = [
    `<path id="${id}" d="${sketchPath}" ${fillAttr} opacity="${opacity}"${filterAttr}/>`,
    // Surface texture overlay (clipped to terrain)
    `<rect x="0" y="${(by - amp - 20).toFixed(0)}" width="${width}" height="${(height - by + amp + 20).toFixed(0)}" fill="${color}" opacity="${(opacity * 0.18).toFixed(3)}" filter="url(#${surfTexId})" clip-path="url(#${clipId})"/>`,
    // Global 3D lighting overlay clipped to the ridge silhouette
    `<path d="${sketchPath}" fill="url(#${lightId})" opacity="${opacity.toFixed(2)}"/>`,
    // Rim highlight — soft glow
    `<path d="${curvePath}" fill="none" stroke="#fff0d0" stroke-width="3.5" opacity="${(opacity * 0.12).toFixed(3)}" stroke-linecap="round" filter="url(#${rimBlurId})"/>`,
    // Rim highlight — crisp
    `<path d="${curvePath}" fill="none" stroke="#fff0d0" stroke-width="1.2" opacity="${(opacity * 0.18).toFixed(3)}" stroke-linecap="round"/>`,
    // Per-peak local light/shadow stacks (only present when peaks were detected)
    ...peakOverlays,
  ];

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

  const { height, width } = params.viewBox;

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

    // ── PILLAR 3: Atmospheric haze between depth layers ──
    // Insert a semi-transparent fog band AFTER each layer (except the last)
    // This creates the crucial sense of distance between mountain planes.
    if (i < layers.length - 1) {
      const hazeY = layer.baseY * height;
      const hazeH = height * 0.06;
      const hazeOp = 0.06 + i * 0.04; // stronger haze on closer layers
      const hazeBlurId = `${id}-haze-${i}`;
      allDefs.push(
        `<filter id="${hazeBlurId}" x="-5%" y="-80%" width="110%" height="260%"><feGaussianBlur stdDeviation="0 ${(hazeH * 0.6).toFixed(0)}"/></filter>`
      );
      allElems.push(
        `<rect x="0" y="${(hazeY - hazeH * 0.3).toFixed(0)}" width="${width}" height="${hazeH.toFixed(0)}" fill="${params.colors.bg}" opacity="${hazeOp.toFixed(3)}" filter="url(#${hazeBlurId})"/>`
      );
    }
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
 * Water body — photoreal night-water with multiple reflection layers:
 *
 *  1. Depth-fading water gradient (top alpha 0 → mid full → bottom dim)
 *  2. Broad turbulence displacement — non-flat surface
 *  3. Specular shimmer band — a horizontal band just below the waterline where
 *     the sky's light scatters most strongly (concentrated reflection)
 *  4. Perspective ripple lines — many short horizontal strokes, longer/closer
 *     near the foreground, shorter and more numerous near the horizon
 *  5. Optional vertical moonlight streak with shimmering dashes (configurable cx)
 *  6. Floating bright specks scattered across the surface (water-light highlights)
 */
export function waterReflectionBrick(
  params: BrickParams,
  options: WaterReflectionBrickOptions & {
    moonlightCx?: number;
    moonlightColor?: string;
    moonlightOpacity?: number;
  }
): BrickOutput {
  const { viewBox, seedId } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    waterY,
    color,
    opacity = 0.12,
    rippleScale = 8,
    rippleFrequency = 0.015,
    id = "water",
    moonlightCx,
    moonlightColor = "#e0eaff",
    moonlightOpacity = 0.18,
  } = options;

  const wy = waterY * height;
  const waterHeight = height - wy;
  const rs = rippleScale * (scale / 2160);
  const rSeed = (hashStr(`${seedId}-${id}-water`) % 89) + 1;

  const defs: string[] = [];
  const elems: string[] = [];

  // ── 1. Displacement filter for surface deformation
  defs.push(`<filter id="${id}-ripple" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="${rippleFrequency}" numOctaves="3" seed="${rSeed}" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="${rs.toFixed(0)}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`);

  // ── 2. Depth-fading water gradient
  defs.push(`<linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="14%" stop-color="${color}" stop-opacity="${(opacity * 0.6).toFixed(3)}"/>
  <stop offset="38%" stop-color="${color}" stop-opacity="${opacity.toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="${(opacity * 0.2).toFixed(3)}"/>
</linearGradient>`);

  elems.push(
    `<rect x="0" y="${wy.toFixed(0)}" width="${width}" height="${waterHeight.toFixed(0)}" fill="url(#${id}-fade)" filter="url(#${id}-ripple)"/>`
  );

  // ── 2b. Specular shimmer band — concentrated reflection just below the waterline
  // (where the sky's light hits the water at the most reflective angle)
  const specId = `${id}-spec`;
  defs.push(`<linearGradient id="${specId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="40%" stop-color="${color}" stop-opacity="${(opacity * 1.6).toFixed(3)}"/>
  <stop offset="80%" stop-color="${color}" stop-opacity="${(opacity * 0.8).toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`);
  const specH = waterHeight * 0.18;
  elems.push(
    `<rect x="0" y="${wy.toFixed(0)}" width="${width}" height="${specH.toFixed(0)}" fill="url(#${specId})" filter="url(#${id}-ripple)"/>`
  );

  // ── 3. Horizontal ripple lines — perspective-correct (shorter near horizon, longer near foreground)
  // Use deterministic RNG so ripples are stable per-render
  const rng = seedRng(hashStr(`${seedId}-${id}-ripple-lines`));
  const lineCount = Math.round(14 + (waterHeight / height) * 26);
  for (let i = 0; i < lineCount; i++) {
    // Quadratic distribution — more lines near horizon, fewer in foreground
    const tBase = rng();
    const t = tBase * tBase * 0.92 + 0.04; // 0..0.96, biased toward small (near horizon)
    const lineY = wy + t * waterHeight;
    // Length scales with perspective — short near horizon, longer near foreground
    const lengthFrac = 0.18 + t * 0.55 + rng() * 0.25;
    const lineW = lengthFrac * width;
    const lineX = (rng() * (1 - lengthFrac)) * width;
    const sw = (0.6 + rng() * 0.9) * (scale / 1080);
    const lineOpacity = (opacity * 1.6 * (0.4 + rng() * 0.5) * (1 - t * 0.4)).toFixed(3);
    elems.push(
      `<line x1="${lineX.toFixed(1)}" y1="${lineY.toFixed(1)}" x2="${(lineX + lineW).toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${lineOpacity}" stroke-linecap="round"/>`
    );
  }

  // ── 3b. Bright surface specks — point highlights scattered on the water (water-light specks)
  const speckCount = Math.round(20 + (waterHeight / height) * 40);
  for (let i = 0; i < speckCount; i++) {
    const tBase = rng();
    const t = tBase * tBase * 0.92 + 0.04;
    const sy = wy + t * waterHeight;
    const sx = rng() * width;
    const sr = (0.6 + rng() * 1.4) * (scale / 1080);
    const sOp = (opacity * 2.2 * (0.45 + rng() * 0.55) * (1 - t * 0.6)).toFixed(3);
    elems.push(
      `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(2)}" fill="${color}" opacity="${sOp}"/>`
    );
  }

  // ── Bob Ross: 3D water surface texture ──
  // feDiffuseLighting for actual wave depth on the water surface
  const waterLitId = `${id}-wlit`;
  defs.push(`<filter id="${waterLitId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.02 0.008" numOctaves="4" seed="${rSeed + 5}" result="waterBump"/>
  <feDiffuseLighting in="waterBump" surfaceScale="1.5" diffuseConstant="0.55" result="waterLit" lighting-color="#7088a8">
    <feDistantLight azimuth="215" elevation="35"/>
  </feDiffuseLighting>
  <feComposite in="waterLit" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(
    `<rect x="0" y="${wy.toFixed(0)}" width="${width}" height="${waterHeight.toFixed(0)}" fill="${color}" opacity="${(opacity * 0.10).toFixed(3)}" filter="url(#${waterLitId})"/>`
  );

  // ── Bob Ross: Directional warm→cool gradient on water ──
  const waterDirId = `${id}-wdir`;
  defs.push(`<linearGradient id="${waterDirId}" x1="5%" y1="0%" x2="95%" y2="60%">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="${(opacity * 0.06).toFixed(3)}"/>
  <stop offset="35%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#0a1020" stop-opacity="${(opacity * 0.08).toFixed(3)}"/>
</linearGradient>`);
  elems.push(
    `<rect x="0" y="${wy.toFixed(0)}" width="${width}" height="${waterHeight.toFixed(0)}" fill="url(#${waterDirId})"/>`
  );

  // ── 4. Moonlight streak — vertical bright column reflecting a sky source
  if (moonlightCx !== undefined && moonlightCx !== null) {
    const mx = moonlightCx * width;
    const streakId = `${id}-moonbeam`;
    // Vertical gradient: bright at top (waterline), fading toward bottom; horizontal falloff via radial
    defs.push(`<radialGradient id="${streakId}" cx="50%" cy="0%" r="100%" gradientUnits="objectBoundingBox">
  <stop offset="0%" stop-color="${moonlightColor}" stop-opacity="${moonlightOpacity}"/>
  <stop offset="35%" stop-color="${moonlightColor}" stop-opacity="${(moonlightOpacity * 0.45).toFixed(3)}"/>
  <stop offset="100%" stop-color="${moonlightColor}" stop-opacity="0"/>
</radialGradient>`);
    const streakW = scale * 0.18;
    elems.push(
      `<rect x="${(mx - streakW * 0.5).toFixed(1)}" y="${wy.toFixed(0)}" width="${streakW.toFixed(0)}" height="${waterHeight.toFixed(0)}" fill="url(#${streakId})" filter="url(#${id}-ripple)"/>`
    );
    // Bright shimmer dashes within the streak (like real moonlight on water)
    const shimmerCount = 6;
    for (let i = 0; i < shimmerCount; i++) {
      const ty = wy + (0.04 + (i / shimmerCount) * 0.7 + rng() * 0.05) * waterHeight;
      const tw = streakW * (0.4 + rng() * 0.5);
      const tx = mx - tw * 0.5 + (rng() - 0.5) * streakW * 0.35;
      const tOp = (moonlightOpacity * (1.2 - i / shimmerCount) * (0.5 + rng() * 0.5)).toFixed(3);
      const tSw = (0.8 + rng() * 1.2) * (scale / 1080);
      elems.push(
        `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${(tx + tw).toFixed(1)}" y2="${ty.toFixed(1)}" stroke="${moonlightColor}" stroke-width="${tSw.toFixed(1)}" opacity="${tOp}" stroke-linecap="round"/>`
      );
    }
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
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
  /** Show specular highlight on surface (default: true). Disable for eclipse moon disc. */
  specular?: boolean;
  /** Show crisp corona ring at ~1.8× radius (default: false).
   *  Only appropriate for solar eclipses where the sun's corona is visible
   *  behind the moon disc. Moons have a soft atmospheric halo, not a ring. */
  coronaRing?: boolean;
}

/**
 * Celestial body — photographic moon with:
 *  · Wide atmospheric halo (multi-stop scattering gradient, NOT a single fade)
 *  · Spherical body with off-center radial gradient (terminator shading)
 *  · Maria texture (dark patches via fractal noise) — always on, low opacity
 *  · Limb darkening — subtle outer ring darker than centre
 *  · Optional crescent mask (lunar phase shadow)
 */
export function celestialBrick(params: BrickParams, options: CelestialBrickOptions): BrickOutput {
  const { viewBox, seedId } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    cx,
    cy,
    r = 0.05,
    color,
    glowColor,
    glowSize = 2.5,
    glowOpacity = 0.35,
    crescent,
    texture = true, // texture is now always on for realism
    specular = true,
    coronaRing = false,
    id = "celestial",
  } = options;

  const px = cx * width;
  const py = cy * height;
  const pr = r * scale;
  const gc = glowColor ?? color;

  // Deterministic per-instance seed for maria pattern
  const tSeed = (hashStr(`${seedId}-${id}-celestial`) % 89) + 1;

  const defs: string[] = [];
  const elems: string[] = [];

  // ── 1. ATMOSPHERIC HALO ────────────────────────────────────────────────────
  // Wide multi-stop gradient — bright corona near disc, fading to atmospheric blue,
  // then to transparent. Stops chosen to match real lunar halo photographs.
  const haloId = `${id}-halo`;
  defs.push(`<radialGradient id="${haloId}" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${gc}" stop-opacity="${(glowOpacity * 1.2).toFixed(3)}"/>
  <stop offset="18%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.65).toFixed(3)}"/>
  <stop offset="42%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.22).toFixed(3)}"/>
  <stop offset="78%" stop-color="${gc}" stop-opacity="${(glowOpacity * 0.05).toFixed(3)}"/>
  <stop offset="100%" stop-color="${gc}" stop-opacity="0"/>
</radialGradient>`);
  const haloR = pr * glowSize;
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${haloR.toFixed(1)}" fill="url(#${haloId})"/>`
  );

  // ── 1b. CORONA RING — only for solar eclipses where the sun's corona peeks
  // around the dark moon disc. Moons have soft halos, not crisp rings.
  if (coronaRing) {
    const coronaR = pr * 1.8;
    const coronaSW = Math.max(2.0, pr * 0.08);
    const coronaBlurId = `${id}-cbr`;
    defs.push(`<filter id="${coronaBlurId}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(coronaSW * 1.8).toFixed(1)}"/></filter>`);
    // Outer soft ring (blurred)
    elems.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${coronaR.toFixed(1)}" fill="none" stroke="${gc}" stroke-width="${(coronaSW * 4).toFixed(1)}" opacity="${Math.min(0.45, glowOpacity * 1.2).toFixed(3)}" filter="url(#${coronaBlurId})"/>`);
    // Inner crisp ring
    elems.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${coronaR.toFixed(1)}" fill="none" stroke="${gc}" stroke-width="${(coronaSW * 1.2).toFixed(1)}" opacity="${Math.min(0.3, glowOpacity * 0.7).toFixed(3)}"/>`);
  }

  // Tight inner corona — sharper warm/cool edge close to the disc
  const innerHaloId = `${id}-ihalo`;
  defs.push(`<radialGradient id="${innerHaloId}" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
  <stop offset="50%" stop-color="${gc}" stop-opacity="0.18"/>
  <stop offset="100%" stop-color="${gc}" stop-opacity="0"/>
</radialGradient>`);
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(pr * 1.6).toFixed(1)}" fill="url(#${innerHaloId})"/>`
  );

  // ── 2. CRESCENT MASK (lunar phase shadow) ──────────────────────────────────
  if (crescent) {
    const sx = px + crescent.offsetX * pr;
    const sy = py + crescent.offsetY * pr;
    defs.push(`<mask id="${id}-msk">
  <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="white"/>
  <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(pr * 0.92).toFixed(1)}" fill="black"/>
</mask>`);
  }
  const maskAttr = crescent ? ` mask="url(#${id}-msk)"` : "";

  // ── 3. SPHERICAL BODY with TERMINATOR shading ──────────────────────────────
  // Off-center radial gradient: brightest at upper-left, fading to slightly darker
  // at lower-right — this is the photographic key to making a flat circle read as
  // a sphere illuminated from the side.
  const bodyId = `${id}-body`;
  // Light source offset: upper-left by default (35% from centre)
  defs.push(`<radialGradient id="${bodyId}" cx="35%" cy="32%" r="78%">
  <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
  <stop offset="55%" stop-color="${color}" stop-opacity="0.95"/>
  <stop offset="92%" stop-color="${color}" stop-opacity="0.78"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0.55"/>
</radialGradient>`);
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="url(#${bodyId})"${maskAttr}/>`
  );

  // ── 4. MARIA TEXTURE (dark surface patches) ────────────────────────────────
  // Always rendered for realism — subtle dark patches on the lit side break up
  // the uniform colour. feTurbulence threshold + soft-light blend.
  if (texture) {
    const texId = `${id}-tex`;
    defs.push(`<filter id="${texId}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="${tSeed}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -1.4" result="dark"/>
  <feGaussianBlur in="dark" stdDeviation="${(pr * 0.05).toFixed(1)}" result="softDark"/>
  <feComposite in="softDark" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${color}" opacity="0.22" filter="url(#${texId})"${maskAttr}/>`
    );
  }

  // ── 5. LIMB DARKENING (subtle dark outer ring) ─────────────────────────────
  // Real spheres have darker edges due to the angle of light. A thin radial
  // gradient ring at 88-100% creates this micro-effect.
  const limbId = `${id}-limb`;
  defs.push(`<radialGradient id="${limbId}" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="80%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0.15"/>
</radialGradient>`);
  elems.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="url(#${limbId})"${maskAttr}/>`
  );

  // ── 6. BRIGHT TERMINATOR HIGHLIGHT (specular point) ────────────────────────
  // Tiny bright spot at the brightest illumination point — sells the spherical look.
  // Disabled for eclipse moon discs where the surface must be completely dark.
  if (specular) {
    const hlX = px - pr * 0.34;
    const hlY = py - pr * 0.4;
    const hlR = pr * 0.32;
    const hlId = `${id}-hl`;
    defs.push(`<radialGradient id="${hlId}" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32"/>
  <stop offset="60%" stop-color="#ffffff" stop-opacity="0.08"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>`);
    elems.push(
      `<circle cx="${hlX.toFixed(1)}" cy="${hlY.toFixed(1)}" r="${hlR.toFixed(1)}" fill="url(#${hlId})"${maskAttr}/>`
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
 * Multi-stop vertical sky gradient with Bob Ross atmospheric depth.
 *
 * Bob Ross 3D drama additions:
 *  - Directional warm→cool overlay (sun-side warmth bleeds across)
 *  - Subtle atmospheric noise texture (sky is never perfectly smooth)
 *  - Horizon warmth band (scattering effect where sky meets earth)
 */
export function skyGradientBrick(
  params: BrickParams,
  options: SkyGradientBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const { stops, id = "sky" } = options;

  const stopElems = stops
    .map(
      s => `<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`
    )
    .join("\n  ");

  const defs: string[] = [];
  const elems: string[] = [];

  // Base sky gradient
  defs.push(`<linearGradient id="${id}-grad" x1="0" y1="0" x2="0" y2="1">\n  ${stopElems}\n</linearGradient>`);
  elems.push(`<rect id="${id}" width="${width}" height="${height}" fill="url(#${id}-grad)"/>`);

  // ── Bob Ross: Directional warm overlay from sun direction ──
  // Sun from upper-left → warm tint bleeds from that corner
  const warmOverId = `${id}-warm`;
  const sunRad = ((215 - 180) * Math.PI) / 180; // SUN_AZIMUTH = 215
  const sx1 = (50 + Math.cos(sunRad) * 50).toFixed(0);
  const sy1 = (50 + Math.sin(sunRad) * 50).toFixed(0);
  const sx2 = (50 - Math.cos(sunRad) * 50).toFixed(0);
  const sy2 = (50 - Math.sin(sunRad) * 50).toFixed(0);
  defs.push(`<linearGradient id="${warmOverId}" x1="${sx1}%" y1="${sy1}%" x2="${sx2}%" y2="${sy2}%">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="0.04"/>
  <stop offset="40%" stop-color="#fff0d0" stop-opacity="0"/>
  <stop offset="100%" stop-color="#0a1020" stop-opacity="0.04"/>
</linearGradient>`);
  elems.push(`<rect width="${width}" height="${height}" fill="url(#${warmOverId})"/>`);

  // ── Bob Ross: Horizon warmth band (atmospheric scattering) ──
  const horizWarmId = `${id}-hband`;
  defs.push(`<linearGradient id="${horizWarmId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="60%" stop-color="#fff8e0" stop-opacity="0"/>
  <stop offset="88%" stop-color="#fff8e0" stop-opacity="0.035"/>
  <stop offset="98%" stop-color="#ffe8c0" stop-opacity="0.05"/>
  <stop offset="100%" stop-color="#ffe8c0" stop-opacity="0.02"/>
</linearGradient>`);
  elems.push(`<rect width="${width}" height="${height}" fill="url(#${horizWarmId})"/>`);

  // ── Bob Ross: Subtle sky texture — atmosphere is never perfectly smooth ──
  const skyTexSeed = hashStr(`${seedId}-${harmonyMode}-sky`) % 89 + 1;
  const skyTexId = `${id}-skytex`;
  defs.push(`<filter id="${skyTexId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.004 0.003" numOctaves="3" seed="${skyTexSeed}" result="skyN"/>
  <feColorMatrix in="skyN" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.55  0 0 0 0 0.6  2.5 0 0 0 -1.2" result="skyMask"/>
  <feGaussianBlur in="skyMask" stdDeviation="4" result="softSky"/>
  <feComposite in="softSky" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(`<rect width="${width}" height="${height}" fill="#6070a0" opacity="0.025" filter="url(#${skyTexId})"/>`);

  return {
    defs: defs.join("\n"),
    elements: elems.join("\n"),
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
  const scale = Math.max(width, height);
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
  const fadeTop = Math.max(0, cy - bandHeight * 1.2);
  const bandTop = Math.max(0, cy - bandHeight * 0.45);
  const bandBot = Math.min(1, cy + bandHeight * 0.45);
  const fadeBot = Math.min(1, cy + bandHeight * 1.2);

  // Anisotropic frequency — clouds are wider than tall, so X freq lower than Y.
  // Lower frequency overall (×0.5) → larger, more recognisable cloud structures.
  const fx = (frequency * 0.4).toFixed(4);
  const fy = (frequency * 1.2).toFixed(4);
  const fxDetail = (frequency * 1.8).toFixed(4);
  const fyDetail = (frequency * 3.2).toFixed(4);

  // Threshold gives cloud-like clumps. Stronger boost & higher bias →
  // sharper cloud edges + thicker visible clumps.
  const defs = `<linearGradient id="${id}-vmask" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
  <stop offset="${(fadeTop * 100).toFixed(1)}%" stop-color="white" stop-opacity="0"/>
  <stop offset="${(bandTop * 100).toFixed(1)}%" stop-color="white" stop-opacity="1"/>
  <stop offset="${(bandBot * 100).toFixed(1)}%" stop-color="white" stop-opacity="1"/>
  <stop offset="${(fadeBot * 100).toFixed(1)}%" stop-color="white" stop-opacity="0"/>
</linearGradient>
<mask id="${id}-m">
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#${id}-vmask)"/>
</mask>
<filter id="${id}-turb" x="-10%" y="-100%" width="120%" height="300%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${fx} ${fy}" numOctaves="${octaves}" seed="${seed}" result="macro"/>
  <feTurbulence type="fractalNoise" baseFrequency="${fxDetail} ${fyDetail}" numOctaves="2" seed="${seed + 11}" result="detail"/>
  <feBlend in="macro" in2="detail" mode="multiply" result="combined"/>
  <!-- Threshold: extract dense ~55% of noise — visible cloud clumps with thick alpha -->
  <feColorMatrix in="combined" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  8 0 0 0 -3.2" result="alpha"/>
  <feGaussianBlur in="alpha" stdDeviation="${(h * 0.05).toFixed(1)}" result="softAlpha"/>
  <feComposite in="softAlpha" in2="SourceGraphic" operator="in" result="cloud"/>
  <!-- Brighten cloud body — multiplies alpha so the darkest parts become brighter -->
  <feComponentTransfer in="cloud">
    <feFuncA type="linear" slope="1.4" intercept="0"/>
  </feComponentTransfer>
</filter>`;

  // ── Bob Ross: Directional lighting on cloud band ──
  // Warm highlight on top (sun-lit) edge, cool shadow on bottom edge
  const cloudLitId = `${id}-lit`;
  const cloudShadowId = `${id}-shd`;
  const litDefs = `<linearGradient id="${cloudLitId}" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="0"/>
  <stop offset="${(bandTop * 100).toFixed(1)}%" stop-color="#fff0d0" stop-opacity="0"/>
  <stop offset="${((bandTop + (bandBot - bandTop) * 0.15) * 100).toFixed(1)}%" stop-color="#fff0d0" stop-opacity="0.08"/>
  <stop offset="${((bandTop + (bandBot - bandTop) * 0.4) * 100).toFixed(1)}%" stop-color="#fff0d0" stop-opacity="0"/>
  <stop offset="100%" stop-color="#fff0d0" stop-opacity="0"/>
</linearGradient>
<linearGradient id="${cloudShadowId}" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
  <stop offset="0%" stop-color="#0a1020" stop-opacity="0"/>
  <stop offset="${((bandTop + (bandBot - bandTop) * 0.6) * 100).toFixed(1)}%" stop-color="#0a1020" stop-opacity="0"/>
  <stop offset="${((bandTop + (bandBot - bandTop) * 0.85) * 100).toFixed(1)}%" stop-color="#0a1020" stop-opacity="0.10"/>
  <stop offset="${(fadeBot * 100).toFixed(1)}%" stop-color="#0a1020" stop-opacity="0"/>
  <stop offset="100%" stop-color="#0a1020" stop-opacity="0"/>
</linearGradient>`;

  return {
    defs: defs + "\n" + litDefs,
    elements: [
      `<rect id="${id}" x="0" y="0" width="${width}" height="${height}" fill="${color}" opacity="${opacity}" filter="url(#${id}-turb)" mask="url(#${id}-m)"/>`,
      // Warm highlight on top edge of cloud band
      `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${cloudLitId})" mask="url(#${id}-m)"/>`,
      // Cool shadow on bottom edge
      `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${cloudShadowId})" mask="url(#${id}-m)"/>`,
    ].join("\n"),
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

    // Column frequency — VARY widely between curtains so we get thin needle rays
    // (high freq) AND wide soft columns (low freq) in the same scene.
    // ci=0 (hero): mid-range, ci=1: thin/needle, ci=2: wide/soft, ci=3: extra detail
    const freqProfile = ci === 0 ? 0.022 : ci === 1 ? 0.040 : ci === 2 ? 0.012 : 0.030;
    const colFreqX = (freqProfile + rng() * 0.008).toFixed(4);
    const colFreqY = (0.0008 + rng() * 0.0014).toFixed(4);

    // Depth factor: hero is 1.0, subsequent layers get progressively less blur
    const depthFactor = 1.0 / (1 + ci * 0.32);
    // Variable horizontal blur per curtain — thin needles vs wide soft rays
    const hBlur = (scale * (0.0015 + rng() * 0.003) * (ci === 1 ? 0.5 : 1.0)).toFixed(1);
    const vBlur = (scale * (0.022 + rng() * 0.018) * depthFactor).toFixed(1);

    // Fold displacement — closer curtains sway more, hero curtain has biggest folds
    const dispScale = (scale * (0.04 + rng() * 0.04) * (0.7 + depthFactor * 0.4)).toFixed(0);

    // Large-scale sway frequency for second displacement pass
    const hPatchFreq = (0.003 + rng() * 0.003).toFixed(4);

    // Threshold per layer — LOWER threshold (more permissive) so aurora reads as
    // a dense flowing curtain rather than sparse vertical scratches. Hero curtain
    // gets the most coverage (~55% visible), background curtains slightly less.
    const boost = (5.5 + rng() * 2.5).toFixed(1);
    const bias = (-(Number(boost) * (0.42 + rng() * 0.08))).toFixed(2);

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
    // Top "ribbon" colour — real aurora curtains have a magenta/pink top edge
    // (high-altitude oxygen + nitrogen emission at 100+ km). Hero curtain shows
    // this most strongly.
    const topColor = isHero ? "#ff4d8a" : c2;
    // Bright top-edge band — the hallmark of aurora photos: a defined bright ribbon
    // from which the green curtain "hangs" down.
    const ribbonPct = p(zoneTopPx + zoneHPx * 0.03);
    const ribbonPeakPct = p(zoneTopPx + zoneHPx * 0.05);
    defs.push(
      `<linearGradient id="${cgId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${topColor}" stop-opacity="0"/>
  <stop offset="${fadeInPct}" stop-color="${topColor}" stop-opacity="0"/>
  <stop offset="${ribbonPct}" stop-color="${topColor}" stop-opacity="${(curtainOpacity * 0.4).toFixed(2)}"/>
  <stop offset="${ribbonPeakPct}" stop-color="${topColor}" stop-opacity="${(curtainOpacity * 0.85).toFixed(2)}"/>
  <stop offset="${peakPct}" stop-color="${curtainColor}" stop-opacity="${(curtainOpacity * 0.95).toFixed(2)}"/>
  <stop offset="${greenPct}" stop-color="${curtainColor}" stop-opacity="${curtainOpacity.toFixed(2)}"/>
  <stop offset="${fadeOutStartPct}" stop-color="${curtainColor}" stop-opacity="${(curtainOpacity * 0.7).toFixed(2)}"/>
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

  const defs: string[] = [];
  const elems: string[] = [];

  // Optional blur filter for additional softness on top of gradient falloff
  const sd = (blur * scale * 0.5).toFixed(0);
  defs.push(
    `<filter id="${id}-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${sd}"/></filter>`
  );

  // Each blob gets its OWN radial gradient — bright core fading to transparent edge.
  // This produces the soft "gas cloud" look real nebulae have, instead of flat-coloured
  // discs with a uniform blur (which read as fuzzy tinted ovals).
  blobs.forEach((b, i) => {
    const gradId = `${id}-g${i}`;
    const op = b.opacity ?? 0.15;
    defs.push(`<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${b.color}" stop-opacity="${op.toFixed(3)}"/>
  <stop offset="35%" stop-color="${b.color}" stop-opacity="${(op * 0.7).toFixed(3)}"/>
  <stop offset="65%" stop-color="${b.color}" stop-opacity="${(op * 0.4).toFixed(3)}"/>
  <stop offset="100%" stop-color="${b.color}" stop-opacity="0"/>
</radialGradient>`);
    elems.push(
      `<ellipse cx="${(b.cx * width).toFixed(0)}" cy="${(b.cy * height).toFixed(0)}" rx="${(b.rx * scale).toFixed(0)}" ry="${(b.ry * scale).toFixed(0)}" fill="url(#${gradId})" filter="url(#${id}-blur)"/>`
    );
  });

  return { defs: defs.join("\n"), elements: `<g id="${id}">${elems.join("\n")}</g>` };
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
 * Silhouette treeline — mixed conifer + broadleaf forest along a horizon.
 *
 * Tree anatomy (per individual tree, deterministic by index):
 *   · ~70% conifers — narrow triangular crown with notched branch tiers
 *     (3–5 step-outs creating the characteristic Christmas-tree silhouette)
 *   · ~30% broadleaves — wider rounded canopy (Bézier dome) with implied trunk
 *     extending to ground via short dark line
 *
 * Depth via opacity ramp — distant trees lighter, foreground trees opaque.
 * Subtle width variation + asymmetric lean gives the row natural irregularity.
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
    const lean = (rng() - 0.5) * treeW * 0.3;
    const trunkX = x + lean;
    const treeOp = opacity * (0.65 + rng() * 0.35);

    // Slight depth-darkening — trees from the back of the row a touch lighter
    const depthFactor = 0.85 + rng() * 0.15;
    const treeOpacity = (treeOp * depthFactor).toFixed(2);

    // 70% conifer / 30% broadleaf
    const isConifer = rng() < 0.7;

    if (isConifer) {
      // ── CONIFER: organic pine silhouette with curved branch tiers ─────────
      // Uses quadratic Bézier (Q) curves instead of straight L for each branch
      // edge, with asymmetric left/right widths and slight droop.
      const tiers = 3 + Math.floor(rng() * 3);
      const pts: string[] = [];

      // Pre-generate asymmetric widths for left and right sides per tier
      const leftWidths: number[] = [];
      const rightWidths: number[] = [];
      const notchDepths: number[] = [];
      const tierYJitter: number[] = [];
      for (let t = 0; t <= tiers; t++) {
        leftWidths.push(0.80 + rng() * 0.40);   // 0.80-1.20 asymmetry
        rightWidths.push(0.80 + rng() * 0.40);
        notchDepths.push(0.35 + rng() * 0.35);   // how deep the notch cuts
        tierYJitter.push((rng() - 0.5) * treeH * 0.06); // slight Y variation
      }

      // Build left outline: base → tip using Q curves
      pts.push(`M ${x.toFixed(1)} ${by.toFixed(1)}`);
      for (let t = 0; t < tiers; t++) {
        const tT = (t + 1) / tiers;
        const tT0 = t / tiers;
        const wBase = treeW * (1 - tT0) * leftWidths[t];
        const wNext = treeW * (1 - tT) * leftWidths[t + 1] * (0.6 + rng() * 0.25);
        const yMid = by - treeH * (tT0 + (tT - tT0) * (0.40 + rng() * 0.15)) + tierYJitter[t];
        const yNext = by - treeH * tT + tierYJitter[t + 1];
        const notchW = wBase * notchDepths[t];
        // Notch in (droopy branch curve inward)
        const droopY = yMid + treeH * 0.02 * rng(); // slight downward droop
        pts.push(`Q ${(trunkX - notchW * 0.8).toFixed(1)} ${droopY.toFixed(1)} ${(trunkX - notchW).toFixed(1)} ${yMid.toFixed(1)}`);
        // Branch out (sweep to next tier width with upward curve)
        pts.push(`Q ${(trunkX - wNext * 1.1).toFixed(1)} ${(yNext + treeH * 0.03).toFixed(1)} ${(trunkX - wNext).toFixed(1)} ${yNext.toFixed(1)}`);
      }
      // Tip — slightly off-center
      const tipOffX = (rng() - 0.5) * treeW * 0.15;
      pts.push(`L ${(trunkX + tipOffX).toFixed(1)} ${tipY.toFixed(1)}`);
      // Mirror down right side with DIFFERENT widths (asymmetric)
      for (let t = tiers - 1; t >= 0; t--) {
        const tT = (t + 1) / tiers;
        const tT0 = t / tiers;
        const wBase = treeW * (1 - tT0) * rightWidths[t];
        const wNext = treeW * (1 - tT) * rightWidths[t + 1] * (0.6 + rng() * 0.25);
        const yMid = by - treeH * (tT0 + (tT - tT0) * (0.40 + rng() * 0.15)) + tierYJitter[t];
        const yNext = by - treeH * tT + tierYJitter[t + 1];
        const notchW = wBase * notchDepths[t];
        pts.push(`Q ${(trunkX + wNext * 1.1).toFixed(1)} ${(yNext + treeH * 0.03).toFixed(1)} ${(trunkX + wNext).toFixed(1)} ${yNext.toFixed(1)}`);
        pts.push(`Q ${(trunkX + notchW * 0.8).toFixed(1)} ${(yMid + treeH * 0.02 * rng()).toFixed(1)} ${(trunkX + notchW).toFixed(1)} ${yMid.toFixed(1)}`);
      }
      pts.push(`L ${(x + treeW * 0.5).toFixed(1)} ${by.toFixed(1)}`);
      pts.push("Z");

      elems.push(
        `<path d="${pts.join(" ")}" fill="${color}" opacity="${treeOpacity}"/>`
      );
    } else {
      // ── BROADLEAF: bumpy canopy with noise-perturbed contour ─────────────
      const canopyH = treeH * (0.72 + rng() * 0.12);
      const canopyW = treeW * (1.5 + rng() * 0.5);
      const trunkH = treeH - canopyH;
      const trunkW = Math.max(0.7, treeW * 0.18);

      // Multi-point bumpy canopy outline (12-16 points around the dome)
      const canopyPts = 12 + Math.floor(rng() * 5);
      const canopyPoints: { x: number; y: number }[] = [];
      for (let ci = 0; ci <= canopyPts; ci++) {
        const angle = Math.PI + (ci / canopyPts) * Math.PI; // bottom-left → bottom-right (semicircle)
        const rx = canopyW * 0.5;
        const ry = canopyH;
        // Base ellipse position
        let cpx = trunkX + Math.cos(angle) * rx;
        let cpy = by + Math.sin(angle) * ry * 0.85; // squish vertically
        // Noise bumps: larger at top, smaller at sides
        const bumpMag = canopyH * (0.06 + rng() * 0.10);
        const bumpAngle = (rng() - 0.5) * 2;
        cpx += Math.cos(angle + bumpAngle) * bumpMag * (0.5 + rng());
        cpy += Math.sin(angle + bumpAngle) * bumpMag * (0.5 + rng());
        canopyPoints.push({ x: cpx, y: cpy });
      }
      // Ensure endpoints are at baseY
      canopyPoints[0].y = by;
      canopyPoints[canopyPoints.length - 1].y = by;

      // Build path with Q curves through the bumpy points
      const dParts: string[] = [`M ${canopyPoints[0].x.toFixed(1)} ${canopyPoints[0].y.toFixed(1)}`];
      for (let ci = 1; ci < canopyPoints.length; ci++) {
        const prev = canopyPoints[ci - 1];
        const cur = canopyPoints[ci];
        // Control point: midpoint pulled outward
        const mx = (prev.x + cur.x) / 2;
        const my = (prev.y + cur.y) / 2 - canopyH * 0.04 * rng();
        dParts.push(`Q ${mx.toFixed(1)} ${my.toFixed(1)} ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`);
      }
      dParts.push("Z");
      elems.push(
        `<path d="${dParts.join(" ")}" fill="${color}" opacity="${treeOpacity}"/>`
      );
      // Implied trunk
      if (trunkH > 1) {
        elems.push(
          `<rect x="${(trunkX - trunkW * 0.5).toFixed(1)}" y="${by.toFixed(1)}" width="${trunkW.toFixed(1)}" height="${(trunkH * 0.6).toFixed(1)}" fill="${color}" opacity="${treeOpacity}"/>`
        );
      }
    }
  }

  // ── Bob Ross 3D drama: directional lighting + rim highlights on the tree mass ──
  const treeDefs: string[] = [];

  // Directional gradient overlay — warm left (lit) to cool right (shadow)
  const treeGrpId = `${id}-grp`;
  const treeLitId = `${id}-lit`;
  treeDefs.push(`<linearGradient id="${treeLitId}" x1="0.05" y1="0" x2="0.95" y2="0.5">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="0.10"/>
  <stop offset="30%" stop-color="#ffffff" stop-opacity="0.02"/>
  <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#0a1020" stop-opacity="0.28"/>
</linearGradient>`);

  // Surface texture — feDiffuseLighting for bark/foliage 3D depth
  const treeSurfId = `${id}-surf`;
  const treeSurfSeed = (hashStr(`${seedId}-${harmonyMode}-${seedSuffix}-surf`) % 97) + 1;
  treeDefs.push(`<filter id="${treeSurfId}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.06 0.08" numOctaves="5" seed="${treeSurfSeed}" result="fBump"/>
  <feDiffuseLighting in="fBump" surfaceScale="2.0" diffuseConstant="0.6" result="fLit" lighting-color="#506040">
    <feDistantLight azimuth="215" elevation="40"/>
  </feDiffuseLighting>
  <feComposite in="fLit" in2="SourceGraphic" operator="in"/>
</filter>`);

  // Clip the entire tree group
  const treeClipId = `${id}-tclip`;

  // Build the group with overlays
  const treeGroupContent = elems.join("\n");
  const finalElems = [
    `<g id="${treeGrpId}">`,
    treeGroupContent,
    // Directional lit/shadow overlay on the entire treeline
    `<rect x="0" y="${(by - maxHeight * height - 20).toFixed(0)}" width="${width}" height="${(maxHeight * height + 40).toFixed(0)}" fill="url(#${treeLitId})" opacity="1"/>`,
    // Surface texture overlay
    `<rect x="0" y="${(by - maxHeight * height - 20).toFixed(0)}" width="${width}" height="${(maxHeight * height + 40).toFixed(0)}" fill="${color}" opacity="0.12" filter="url(#${treeSurfId})"/>`,
    `</g>`,
  ];

  return {
    defs: treeDefs.length > 0 ? treeDefs.join("\n") : undefined,
    elements: finalElems.join("\n"),
  };
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
 * Atmospheric horizon glow — sunset-style warm band like the inspiration photo.
 *
 * Three stacked layers (back to front):
 *   1. Wide outer halo — atmospheric scattering, vertical-asymmetric (more spread above)
 *   2. Sharp horizon line — a thin BRIGHT band right at the horizon (the warm strip)
 *   3. Tight bright core — small white-hot peak at the horizon centre
 *
 * The thin horizon line is the key element — it's what makes a sunset look like a
 * SUNSET (bright warm strip) rather than a foggy halo.
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

  const defs: string[] = [];
  const elems: string[] = [];

  // ── 1. Wide outer halo — atmospheric scattering
  const outerId = `${id}-outer`;
  defs.push(`<radialGradient id="${outerId}" cx="50%" cy="50%" rx="50%" ry="50%">
  <stop offset="0%" stop-color="${color}" stop-opacity="${(opacity * 1.0).toFixed(3)}"/>
  <stop offset="20%" stop-color="${color}" stop-opacity="${(opacity * 0.6).toFixed(3)}"/>
  <stop offset="55%" stop-color="${color}" stop-opacity="${(opacity * 0.18).toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`);
  elems.push(
    `<ellipse cx="${(width / 2).toFixed(0)}" cy="${py.toFixed(0)}" rx="${(width * 0.85).toFixed(0)}" ry="${(h * 1.5).toFixed(0)}" fill="url(#${outerId})"/>`
  );

  // ── 2. SHARP HORIZON STRIP — thin bright band at the horizon line itself.
  // This is the photo-defining element: a narrow warm strip that reads as the
  // sunset/sunrise terminator rather than a fuzzy fog.
  const stripId = `${id}-strip`;
  const stripH = Math.max(2, h * 0.18);
  defs.push(`<linearGradient id="${stripId}" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
  <stop offset="20%" stop-color="${color}" stop-opacity="${(opacity * 0.65).toFixed(3)}"/>
  <stop offset="50%" stop-color="${color}" stop-opacity="${(opacity * 1.4).toFixed(3)}"/>
  <stop offset="80%" stop-color="${color}" stop-opacity="${(opacity * 0.65).toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`);
  // Vertical fade for the strip — soft top + bottom edges
  const stripFadeId = `${id}-stripfade`;
  defs.push(`<linearGradient id="${stripFadeId}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="white" stop-opacity="0"/>
  <stop offset="40%" stop-color="white" stop-opacity="1"/>
  <stop offset="60%" stop-color="white" stop-opacity="1"/>
  <stop offset="100%" stop-color="white" stop-opacity="0"/>
</linearGradient>
<mask id="${id}-stripmask">
  <rect x="0" y="${(py - stripH).toFixed(1)}" width="${width}" height="${(stripH * 2).toFixed(1)}" fill="url(#${stripFadeId})"/>
</mask>`);
  elems.push(
    `<rect x="0" y="${(py - stripH).toFixed(1)}" width="${width}" height="${(stripH * 2).toFixed(1)}" fill="url(#${stripId})" mask="url(#${id}-stripmask)"/>`
  );

  // ── 3. Tight bright core — small white-hot focal point
  const innerId = `${id}-inner`;
  defs.push(`<radialGradient id="${innerId}" cx="50%" cy="50%" rx="50%" ry="50%">
  <stop offset="0%" stop-color="${color}" stop-opacity="${Math.min(1, opacity * 1.6).toFixed(3)}"/>
  <stop offset="60%" stop-color="${color}" stop-opacity="${(opacity * 0.3).toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`);
  elems.push(
    `<ellipse cx="${(width / 2).toFixed(0)}" cy="${py.toFixed(0)}" rx="${(width * 0.32).toFixed(0)}" ry="${(h * 0.32).toFixed(0)}" fill="url(#${innerId})"/>`
  );

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
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
 * Shooting stars / meteors — intense atmospheric entry with anatomical detail:
 *   · Wide ionisation halo (atmospheric plasma shell, heavy blur)
 *   · Plasma trail (gradient stroke, subtle blur)
 *   · Crisp white-hot core line
 *   · Bright glowing head with diffraction starburst (along + perpendicular cross arms)
 *   · White-hot inner head dot
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
  const sc = scale / 960;

  const defs: string[] = [];
  const elems: string[] = [];

  // Wide ionisation halo blur
  defs.push(
    `<filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(2.4 * sc).toFixed(1)}"/></filter>`
  );
  // Trail blur (lighter)
  defs.push(
    `<filter id="${id}-glow2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(0.9 * sc).toFixed(1)}"/></filter>`
  );

  // Divide sky into equal horizontal zones so meteors spread across the canvas
  // instead of clustering from pure-random placement.
  const zoneW = (width * 0.85) / Math.max(1, count);
  const zoneXStart = width * 0.075;

  for (let i = 0; i < count; i++) {
    // Place each meteor in its own horizontal zone with jitter
    const x1 = zoneXStart + zoneW * i + rng() * zoneW;
    const y1 = rng() * height * 0.5 + height * 0.02;
    const angle = 0.3 + rng() * 0.8;
    const len = (0.10 + rng() * 0.13) * width;
    const goRight = rng() < 0.5;
    const dx = goRight ? -Math.cos(angle) : Math.cos(angle);
    const dy = Math.sin(angle);
    const x2 = x1 - len * dx;
    const y2 = y1 - len * dy;

    const mOp = opacity * (0.78 + rng() * 0.25);
    const gradId = `${id}-g${i}`;
    const coreW = (1.8 + rng() * 1.8) * sc;
    const glowW = coreW * 5.5;

    // Variable-brightness gradient — irregular stops mimic real meteor trail luminosity
    // (NOT a laser — the plasma flickers along the trail length).
    const f1 = (0.55 + rng() * 0.25).toFixed(3); // first dim "node"
    const f2 = (0.75 + rng() * 0.15).toFixed(3); // second dim "node"
    defs.push(
      `<linearGradient id="${gradId}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${mOp.toFixed(3)}"/>
  <stop offset="8%" stop-color="${color}" stop-opacity="${(mOp * 0.92).toFixed(3)}"/>
  <stop offset="28%" stop-color="${color}" stop-opacity="${(mOp * 0.7).toFixed(3)}"/>
  <stop offset="${(parseFloat(f1) * 100).toFixed(0)}%" stop-color="${color}" stop-opacity="${(mOp * 0.32).toFixed(3)}"/>
  <stop offset="${(parseFloat(f2) * 100).toFixed(0)}%" stop-color="${color}" stop-opacity="${(mOp * 0.18).toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`
    );

    // Trail variable-width: SHORTER trail tapers naturally — use 3 overlapping segments
    // instead of one full-length line. This makes the trail thicker near head, thinner
    // near tail (eliminating the uniform "laser" thickness).
    const tx_25 = x1 + (x2 - x1) * 0.25;
    const ty_25 = y1 + (y2 - y1) * 0.25;
    const tx_50 = x1 + (x2 - x1) * 0.5;
    const ty_50 = y1 + (y2 - y1) * 0.5;
    const tx_75 = x1 + (x2 - x1) * 0.75;
    const ty_75 = y1 + (y2 - y1) * 0.75;

    // 1. Wide ionisation halo (full length)
    elems.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${glowW.toFixed(1)}" stroke-linecap="round" opacity="${(mOp * 0.22).toFixed(3)}" filter="url(#${id}-glow)"/>`
    );
    // 2. Plasma trail with variable width — three tapering segments
    // Near head (wider, brighter)
    elems.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${tx_50.toFixed(1)}" y2="${ty_50.toFixed(1)}" stroke="url(#${gradId})" stroke-width="${(coreW * 2.6).toFixed(1)}" stroke-linecap="round" filter="url(#${id}-glow2)"/>`
    );
    // Middle (medium)
    elems.push(
      `<line x1="${tx_25.toFixed(1)}" y1="${ty_25.toFixed(1)}" x2="${tx_75.toFixed(1)}" y2="${ty_75.toFixed(1)}" stroke="url(#${gradId})" stroke-width="${(coreW * 1.6).toFixed(1)}" stroke-linecap="round" filter="url(#${id}-glow2)"/>`
    );
    // Tail (thin)
    elems.push(
      `<line x1="${tx_50.toFixed(1)}" y1="${ty_50.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="url(#${gradId})" stroke-width="${(coreW * 0.9).toFixed(1)}" stroke-linecap="round"/>`
    );
    // 3. Crisp core stroke ONLY on the brighter half (head→middle), NOT the full length
    elems.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${tx_50.toFixed(1)}" y2="${ty_50.toFixed(1)}" stroke="${color}" stroke-width="${coreW.toFixed(1)}" stroke-linecap="round" opacity="${mOp.toFixed(3)}"/>`
    );

    // 4. Bright head — NO cross spikes (real meteors don't have compass-needle shapes)
    // Just a compact bright head with a soft glow
    const headR = coreW * 1.4;
    // Soft head glow
    elems.push(
      `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${(headR * 2.5).toFixed(1)}" fill="${color}" opacity="${(mOp * 0.3).toFixed(3)}" filter="url(#${id}-glow)"/>`
    );
    // Bright core dot
    elems.push(
      `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${headR.toFixed(1)}" fill="${color}" opacity="${mOp.toFixed(3)}"/>`
    );
    // White-hot inner dot
    elems.push(
      `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${(headR * 0.5).toFixed(1)}" fill="#ffffff" opacity="${Math.min(1, mOp * 1.2).toFixed(3)}"/>`
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
 * Sand dune system — looks like real dunes, not stacked layers:
 *
 * Per dune:
 *  · Asymmetric profile: GENTLE windward slope (left), SHARP slip face (right)
 *  · Curved crescent ridgeline (sinuous, not flat) — the windward edge bows outward
 *  · Three colour zones via gradient: highlight stripe along sunlit windward face,
 *    cool mid-tone for the dune body, deep shadow for the slip face
 *  · Sand texture (turbulence noise) composited at low alpha
 *  · Crisp ridge highlight stroke catching the spine of the lit edge
 *
 * Multiple dunes are placed at increasing baseY (perspective receding) but each
 * has its own characteristic dune shape — NOT just stacked horizontal bands.
 */
export function duneBrick(params: BrickParams, options: DuneBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 960;
  const { baseY, ridges = 3, color, opacity = 0.8, seedSuffix = "dune", id = "dune" } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${seedSuffix}`));
  const by = baseY * height;
  const defs: string[] = [];
  const elems: string[] = [];

  // Sand grain texture filter
  const texSeed = (hashStr(`${seedId}-${id}-sand`) % 89) + 1;
  const texId = `${id}-sand`;
  defs.push(`<filter id="${texId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="1.2 0.6" numOctaves="2" seed="${texSeed}" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" result="grainAlpha"/>
  <feComposite in="grainAlpha" in2="SourceGraphic" operator="in"/>
</filter>`);

  for (let r = 0; r < ridges; r++) {
    // Each dune sits slightly lower (closer to viewer)
    const dy = by + r * height * 0.06;
    const amp = (0.045 + rng() * 0.04) * height; // dune height
    const ridgeOpacity = opacity * (0.62 + r * 0.13);

    // ── SMOOTH dune profile via dense sinusoidal sampling
    // We sample the ridgeline at 80 evenly-spaced X positions using a sum of
    // 2 sine waves at different frequencies. This guarantees smooth curvature
    // (no corner kinks) AND organic asymmetry (no perfect sine wave).
    const peakX = (0.45 + (rng() - 0.5) * 0.3) * width; // primary crest position
    const f1 = 0.7 + rng() * 0.5; // slow undulation count across canvas
    const f2 = 1.6 + rng() * 0.8; // faster secondary undulation
    const phase1 = rng() * Math.PI * 2;
    const phase2 = rng() * Math.PI * 2;
    const ratio = 0.32 + rng() * 0.18; // secondary contribution (0.3-0.5)

    const sampleCount = 80;
    const pts: Pt[] = [];
    let actualPeakX = peakX;
    let actualPeakY = dy;
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const x = t * width;
      // Smooth combined sine — no abrupt direction changes
      const w1 = Math.sin(t * Math.PI * f1 * 2 + phase1);
      const w2 = Math.sin(t * Math.PI * f2 * 2 + phase2) * ratio;
      // Bias toward asymmetric crescent: stronger on the windward side
      const asymmetry = Math.sin(Math.PI * (0.5 + (t - 0.5) * 0.7));
      const heightT = (w1 + w2) * 0.5 * asymmetry;
      const y = dy - amp * Math.max(0, heightT + 0.4);
      pts.push([x, y]);
      if (y < actualPeakY) {
        actualPeakY = y;
        actualPeakX = x;
      }
    }

    const d = catmullRomToBezierPath(pts);
    const polyD = `${d} L ${width.toFixed(0)} ${height.toFixed(0)} L 0 ${height.toFixed(0)} Z`;

    // ── PILLAR 1: Directional lit/shadow gradient — warm windward, cool leeward
    const gradId = `${id}-grd-${r}`;
    defs.push(`<linearGradient id="${gradId}" x1="0.05" y1="0" x2="0.95" y2="0.5">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="${(ridgeOpacity * 0.12).toFixed(3)}"/>
  <stop offset="20%" stop-color="${color}" stop-opacity="${(ridgeOpacity * 1.0).toFixed(3)}"/>
  <stop offset="60%" stop-color="${color}" stop-opacity="${(ridgeOpacity * 0.95).toFixed(3)}"/>
  <stop offset="100%" stop-color="#0a0804" stop-opacity="${(ridgeOpacity * 0.85).toFixed(3)}"/>
</linearGradient>`);
    elems.push(`<path d="${polyD}" fill="url(#${gradId})"/>`);

    // ── PILLAR 4: Sand surface texture — feDiffuseLighting for 3D rippled sand
    const duneTexId = `${id}-dtex-${r}`;
    const duneSurfSeed = (hashStr(`${seedId}-${id}-dsurf-${r}`) % 97) + 1;
    defs.push(`<filter id="${duneTexId}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.08 0.04" numOctaves="4" seed="${duneSurfSeed}" result="dBump"/>
  <feDiffuseLighting in="dBump" surfaceScale="2.0" diffuseConstant="0.6" result="dLit" lighting-color="#c0a060">
    <feDistantLight azimuth="215" elevation="38"/>
  </feDiffuseLighting>
  <feComposite in="dLit" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<path d="${polyD}" fill="${color}" opacity="${(ridgeOpacity * 0.22).toFixed(2)}" filter="url(#${duneTexId})"/>`
    );

    // Sand grain texture overlay
    elems.push(
      `<path d="${polyD}" fill="${color}" opacity="${(ridgeOpacity * 0.28).toFixed(2)}" filter="url(#${texId})"/>`
    );

    // ── PILLAR 2: Ridge spine highlight — bright warm knife-edge catching the crest
    const hlBlurId = `${id}-hlblur-${r}`;
    defs.push(`<filter id="${hlBlurId}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(2.5 * sc).toFixed(1)}"/></filter>`);
    // Soft glow
    elems.push(
      `<path d="${d}" fill="none" stroke="#fff0d0" stroke-width="${(4 * sc).toFixed(1)}" opacity="${(ridgeOpacity * 0.15).toFixed(3)}" stroke-linecap="round" filter="url(#${hlBlurId})"/>`
    );
    // Crisp bright crest
    elems.push(
      `<path d="${d}" fill="none" stroke="#fff0d0" stroke-width="${(1.2 * sc).toFixed(1)}" opacity="${(ridgeOpacity * 0.28).toFixed(3)}" stroke-linecap="round"/>`
    );

    // ── Slip-face shadow — stronger, more dramatic
    const shadowGradId = `${id}-shadowgrd-${r}`;
    defs.push(`<radialGradient id="${shadowGradId}" cx="${actualPeakX.toFixed(1)}" cy="${actualPeakY.toFixed(1)}" r="${(amp * 4).toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="30%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="70%" stop-color="#0a0804" stop-opacity="${(ridgeOpacity * 0.18).toFixed(3)}"/>
  <stop offset="100%" stop-color="#0a0804" stop-opacity="${(ridgeOpacity * 0.35).toFixed(3)}"/>
</radialGradient>`);
    elems.push(
      `<path d="${polyD}" fill="url(#${shadowGradId})"/>`
    );

    // ── PILLAR 3: Atmospheric haze between ridges
    if (r < ridges - 1) {
      const hazeBlurId = `${id}-dhaze-${r}`;
      defs.push(`<filter id="${hazeBlurId}" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="0 ${(8 * sc).toFixed(0)}"/></filter>`);
      elems.push(
        `<rect x="0" y="${(dy - amp * 0.2).toFixed(0)}" width="${width}" height="${(amp * 0.5).toFixed(0)}" fill="#1a1610" opacity="0.08" filter="url(#${hazeBlurId})"/>`
      );
    }
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── Desert Brick (cacti + flat sand) ───────────────────────────────────────────

export interface DesertBrickOptions {
  id?: string;
  /** Y position of the desert floor */
  baseY: number;
  /** Sand floor color */
  sandColor: string;
  /** Silhouette color for cacti / pyramids / salt-flat cracks */
  cactusColor?: string;
  /** Number of cacti (for "cacti" variant) */
  cactusCount?: number;
  opacity?: number;
  seedSuffix?: string;
  /** Variant — "dunes" (default), "cacti", "pyramids", "saltflat" */
  variant?: "dunes" | "cacti" | "pyramids" | "saltflat";
  /** Number of pyramids (for "pyramids" variant) */
  pyramidCount?: number;
}

/**
 * Desert biome — flat sand plain + cacti silhouettes (saguaro + barrel shapes).
 *
 * Anatomy:
 *  1. Sand plain — gradient from light at horizon to darker at foreground
 *  2. Sand-grain texture (turbulence overlay)
 *  3. Cacti silhouettes — variety:
 *     · 60% saguaro (tall main column with 0–2 side arms branching upward)
 *     · 30% barrel (short rounded squat shape)
 *     · 10% prickly pear (cluster of small rounded pads)
 *  4. Cactus needle highlights (subtle vertical hatching on lit side)
 *  5. Scattered small rocks/pebbles on the sand
 */
export function desertBrick(params: BrickParams, options: DesertBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 960;
  const {
    baseY,
    sandColor,
    cactusColor = "#0a0d12",
    cactusCount = 7,
    opacity = 0.95,
    seedSuffix = "desert",
    id = "desert",
    variant = "dunes",
    pyramidCount = 3,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${seedSuffix}`));
  const by = baseY * height;

  const defs: string[] = [];
  const elems: string[] = [];

  // ── 1. Sand plain gradient
  defs.push(`<linearGradient id="${id}-sand" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${sandColor}" stop-opacity="${(opacity * 0.65).toFixed(2)}"/>
  <stop offset="40%" stop-color="${sandColor}" stop-opacity="${opacity.toFixed(2)}"/>
  <stop offset="100%" stop-color="${sandColor}" stop-opacity="${(opacity * 0.85).toFixed(2)}"/>
</linearGradient>`);
  elems.push(
    `<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${(height - by).toFixed(0)}" fill="url(#${id}-sand)"/>`
  );

  // ── 2. Sand grain texture
  const texSeed = (hashStr(`${seedId}-${id}-grain`) % 89) + 1;
  const texId = `${id}-tex`;
  defs.push(`<filter id="${texId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="1.1 0.55" numOctaves="2" seed="${texSeed}" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" result="grainAlpha"/>
  <feComposite in="grainAlpha" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(
    `<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${(height - by).toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.4).toFixed(2)}" filter="url(#${texId})"/>`
  );

  // ── 3. Variant-specific foreground content
  if (variant === "pyramids") {
    // ─ PYRAMIDS — Giza-style with stone texture, atmospheric perspective,
    // and proper lit/shadow faces using sandy stone colors (not flat black).

    // 3D stone texture — feDiffuseLighting for actual depth on stone blocks
    const stoneTexId = `${id}-stone`;
    const stoneSeed = (hashStr(`${seedId}-${id}-stone`) % 89) + 1;
    defs.push(`<filter id="${stoneTexId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="5" seed="${stoneSeed}" result="bump"/>
  <feDiffuseLighting in="bump" surfaceScale="3" diffuseConstant="0.9" result="lit" lighting-color="#d8c8a0">
    <feDistantLight azimuth="200" elevation="40"/>
  </feDiffuseLighting>
  <feComposite in="lit" in2="SourceGraphic" operator="in"/>
</filter>`);

    // 3D sand surface for the desert floor
    const floorTexId = `${id}-floor3d`;
    defs.push(`<filter id="${floorTexId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.3 0.2" numOctaves="4" seed="${stoneSeed + 3}" result="floorBump"/>
  <feDiffuseLighting in="floorBump" surfaceScale="2" diffuseConstant="0.75" result="floorLit" lighting-color="#e8d0a0">
    <feDistantLight azimuth="225" elevation="35"/>
  </feDiffuseLighting>
  <feComposite in="floorLit" in2="SourceGraphic" operator="in"/>
</filter>`);

    // Heat shimmer on the horizon — very subtle atmospheric haze (NOT a visible band)
    const hazeH = height * 0.04;
    defs.push(`<linearGradient id="${id}-haze" x1="0" y1="${(by - hazeH).toFixed(0)}" x2="0" y2="${by.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${sandColor}" stop-opacity="0"/>
  <stop offset="50%" stop-color="${sandColor}" stop-opacity="${(opacity * 0.08).toFixed(3)}"/>
  <stop offset="100%" stop-color="${sandColor}" stop-opacity="0"/>
</linearGradient>`);
    elems.push(
      `<rect x="0" y="${(by - hazeH).toFixed(0)}" width="${width}" height="${hazeH.toFixed(0)}" fill="url(#${id}-haze)"/>`
    );

    const pyramids: Array<{ cx: number; size: number; depth: number }> = [];
    for (let i = 0; i < pyramidCount; i++) {
      const cx = (0.15 + (i / Math.max(1, pyramidCount - 1)) * 0.7) * width
        + (rng() - 0.5) * width * 0.08;
      const depth = rng(); // 0=far, 1=close
      const size = (50 + depth * 110 + rng() * 30) * sc;
      pyramids.push({ cx, size, depth });
    }
    pyramids.sort((a, b) => a.depth - b.depth); // back-to-front render order

    for (let pi = 0; pi < pyramids.length; pi++) {
      const p = pyramids[pi];
      const pBase = by - p.depth * 6 * sc;
      const pTop = pBase - p.size;
      const pLeft = p.cx - p.size * 0.85;
      const pRight = p.cx + p.size * 0.85;
      const pMidX = p.cx + p.size * 0.05; // apex slightly off-center for perspective

      // Atmospheric perspective — distant pyramids desaturated toward sky color
      const distFade = 1 - p.depth * 0.25; // 0.75–1.0

      // Lit face (left) — warm stone color, brighter
      const litColor = sandColor; // use same warm sand tone
      const litGradId = `${id}-pyr-lit-${pi}`;
      defs.push(`<linearGradient id="${litGradId}" x1="0" y1="0" x2="1" y2="0.5">
  <stop offset="0%" stop-color="${litColor}" stop-opacity="${(opacity * 0.65 * distFade).toFixed(2)}"/>
  <stop offset="100%" stop-color="${litColor}" stop-opacity="${(opacity * 0.45 * distFade).toFixed(2)}"/>
</linearGradient>`);
      const litD = `M ${pLeft.toFixed(1)} ${pBase.toFixed(1)} L ${pMidX.toFixed(1)} ${pTop.toFixed(1)} L ${pMidX.toFixed(1)} ${pBase.toFixed(1)} Z`;
      elems.push(`<path d="${litD}" fill="url(#${litGradId})"/>`);

      // Shadow face (right) — darker, cooler tone
      const shadowGradId = `${id}-pyr-shd-${pi}`;
      defs.push(`<linearGradient id="${shadowGradId}" x1="0" y1="0" x2="1" y2="0.5">
  <stop offset="0%" stop-color="${cactusColor}" stop-opacity="${(opacity * 0.60 * distFade).toFixed(2)}"/>
  <stop offset="100%" stop-color="${cactusColor}" stop-opacity="${(opacity * 0.80 * distFade).toFixed(2)}"/>
</linearGradient>`);
      const shadowD = `M ${pMidX.toFixed(1)} ${pTop.toFixed(1)} L ${pRight.toFixed(1)} ${pBase.toFixed(1)} L ${pMidX.toFixed(1)} ${pBase.toFixed(1)} Z`;
      elems.push(`<path d="${shadowD}" fill="url(#${shadowGradId})"/>`);

      // Stone block texture on both faces
      const fullD = `M ${pLeft.toFixed(1)} ${pBase.toFixed(1)} L ${pMidX.toFixed(1)} ${pTop.toFixed(1)} L ${pRight.toFixed(1)} ${pBase.toFixed(1)} Z`;
      const clipId = `${id}-pyr-clip-${pi}`;
      defs.push(`<clipPath id="${clipId}"><path d="${fullD}"/></clipPath>`);
      elems.push(
        `<rect x="${pLeft.toFixed(0)}" y="${pTop.toFixed(0)}" width="${(pRight - pLeft).toFixed(0)}" height="${(pBase - pTop).toFixed(0)}" fill="${sandColor}" opacity="${(0.22 * distFade).toFixed(2)}" filter="url(#${stoneTexId})" clip-path="url(#${clipId})"/>`
      );

      // ── Horizontal coursing lines — stone block edges visible on pyramid face ──
      // Real pyramids show horizontal course lines where limestone blocks meet.
      // The spacing narrows toward the apex (perspective foreshortening).
      const pyrHeight = pBase - pTop;
      const courseSpacing = (6 + p.size * 0.045) * sc;  // proportional to pyramid size
      const courseCount = Math.floor(pyrHeight / courseSpacing);
      for (let ci = 1; ci < courseCount; ci++) {
        const courseY = pTop + ci * courseSpacing;
        const courseT = ci / courseCount; // 0=top, 1=bottom
        // Width of the pyramid at this height (linear interpolation between apex and base)
        const leftAtY = pMidX - (pMidX - pLeft) * courseT;
        const rightAtY = pMidX + (pRight - pMidX) * courseT;
        // Subtle jitter for hand-hewn look
        const jx = (rng() - 0.5) * 0.5 * sc;
        const jy = (rng() - 0.5) * 0.3 * sc;
        // Thinner/fainter at top (distance), thicker at bottom (closer)
        const courseSw = ((0.25 + courseT * 0.5) * sc).toFixed(1);
        const courseOp = (opacity * (0.06 + courseT * 0.14) * distFade).toFixed(3);
        elems.push(
          `<line x1="${(leftAtY + 0.5 * sc).toFixed(1)}" y1="${(courseY + jy).toFixed(1)}" x2="${(rightAtY - 0.5 * sc).toFixed(1)}" y2="${(courseY + jy + jx).toFixed(1)}" stroke="${cactusColor}" stroke-width="${courseSw}" opacity="${courseOp}" stroke-linecap="round"/>`
        );
        // Subtle light catch on the ledge (stone highlight just below each course line)
        if (courseT > 0.2) {
          const hlOp = (opacity * 0.04 * courseT * distFade).toFixed(3);
          elems.push(
            `<line x1="${(leftAtY + 1 * sc).toFixed(1)}" y1="${(courseY + jy + 0.6 * sc).toFixed(1)}" x2="${(rightAtY - 1 * sc).toFixed(1)}" y2="${(courseY + jy + jx + 0.6 * sc).toFixed(1)}" stroke="#e8d8b8" stroke-width="${((0.2 + courseT * 0.3) * sc).toFixed(1)}" opacity="${hlOp}" stroke-linecap="round"/>`
          );
        }
      }

      // ── Vertical block seams — occasional vertical joints visible on shadow face ──
      const vSeamCount = 2 + Math.floor(rng() * 3);
      for (let vi = 0; vi < vSeamCount; vi++) {
        const seamT = 0.15 + rng() * 0.7; // position along base width
        const seamTopT = 0.3 + rng() * 0.4;
        const seamBaseX = pMidX + (pRight - pMidX) * seamT;
        const seamTopY = pTop + pyrHeight * seamTopT;
        const seamBotY = seamTopY + pyrHeight * (0.08 + rng() * 0.12);
        const seamOp = (opacity * 0.06 * distFade).toFixed(3);
        elems.push(
          `<line x1="${seamBaseX.toFixed(1)}" y1="${seamTopY.toFixed(1)}" x2="${(seamBaseX + (rng() - 0.5) * sc).toFixed(1)}" y2="${seamBotY.toFixed(1)}" stroke="${cactusColor}" stroke-width="${(0.3 * sc).toFixed(1)}" opacity="${seamOp}"/>`
        );
      }

      // Atmospheric haze on distant pyramids
      if (p.depth < 0.4) {
        const hazeOp = (0.20 * (1 - p.depth * 2.5)).toFixed(3);
        elems.push(`<path d="${fullD}" fill="${sandColor}" opacity="${hazeOp}"/>`);
      }

      // Ground shadow — cast shadow at the base of the pyramid
      const shadowLen = p.size * 0.6;
      const shadowGD = `M ${pRight.toFixed(1)} ${pBase.toFixed(1)} L ${(pRight + shadowLen).toFixed(1)} ${pBase.toFixed(1)} L ${pRight.toFixed(1)} ${(pBase - 2 * sc).toFixed(1)} Z`;
      elems.push(`<path d="${shadowGD}" fill="#0a0500" opacity="${(opacity * 0.15 * distFade).toFixed(3)}"/>`);
    }

    // ── 3D lit desert floor — feDiffuseLighting for actual sand surface depth ──
    const floorH = height - by;
    elems.push(
      `<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${floorH.toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.18).toFixed(2)}" filter="url(#${floorTexId})"/>`
    );

    // Wind ripple texture on desert floor
    const pyrRippleId = `${id}-pyrripple`;
    const pyrRippleSeed = (hashStr(`${seedId}-${id}-pyrripple`) % 89) + 1;
    defs.push(`<filter id="${pyrRippleId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.06 0.015" numOctaves="3" seed="${pyrRippleSeed}" result="rip"/>
  <feColorMatrix in="rip" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -1.5" result="ripMask"/>
  <feGaussianBlur in="ripMask" stdDeviation="1" result="softRip"/>
  <feComposite in="softRip" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(`<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${floorH.toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.10).toFixed(2)}" filter="url(#${pyrRippleId})"/>`);

    // Specular sparkle on desert floor — sun catching sand grains
    const pyrSpecId = `${id}-pyrspec`;
    defs.push(`<filter id="${pyrSpecId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.5 0.35" numOctaves="3" seed="${stoneSeed + 10}" result="specB"/>
  <feSpecularLighting in="specB" surfaceScale="3" specularConstant="0.5" specularExponent="20" result="spec" lighting-color="#ffffff">
    <feDistantLight azimuth="225" elevation="45"/>
  </feSpecularLighting>
  <feComposite in="spec" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(`<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${floorH.toFixed(0)}" fill="#ffffff" opacity="${(opacity * 0.03).toFixed(3)}" filter="url(#${pyrSpecId})"/>`);

    // Scattered small rocks/pebbles with tiny ground shadows
    for (let i = 0; i < 18; i++) {
      const ry = by + (0.1 + rng() * 0.85) * (height - by);
      const rx = rng() * width;
      const rsize = (0.6 + rng() * 1.8) * sc;
      const rockOp = (opacity * (0.25 + rng() * 0.35)).toFixed(2);
      // Rock body
      elems.push(
        `<ellipse cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" rx="${(rsize * 1.1).toFixed(1)}" ry="${(rsize * 0.5).toFixed(1)}" fill="${cactusColor}" opacity="${rockOp}"/>`
      );
      // Rock shadow
      elems.push(
        `<ellipse cx="${(rx + rsize * 0.4).toFixed(1)}" cy="${(ry + rsize * 0.3).toFixed(1)}" rx="${rsize.toFixed(1)}" ry="${(rsize * 0.22).toFixed(1)}" fill="#000000" opacity="${(parseFloat(rockOp) * 0.25).toFixed(3)}"/>`
      );
    }
  } else if (variant === "saltflat") {
    // ─ SALT FLAT — Bonneville / Salar de Uyuni style:
    // Bright reflective salt crust with polygonal crack patterns.

    // 1. Reflective salt crust — bright overlay with perspective gradient
    const crustGradId = `${id}-crust`;
    defs.push(`<linearGradient id="${crustGradId}" x1="0" y1="${by.toFixed(0)}" x2="0" y2="${height}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#e8e4e0" stop-opacity="${(opacity * 0.35).toFixed(3)}"/>
  <stop offset="30%" stop-color="#d8d4d0" stop-opacity="${(opacity * 0.22).toFixed(3)}"/>
  <stop offset="70%" stop-color="#c0bab2" stop-opacity="${(opacity * 0.12).toFixed(3)}"/>
  <stop offset="100%" stop-color="#b0a898" stop-opacity="${(opacity * 0.06).toFixed(3)}"/>
</linearGradient>`);
    elems.push(
      `<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${(height - by).toFixed(0)}" fill="url(#${crustGradId})"/>`
    );

    // 2. 3D lit salt surface — feDiffuseLighting for depth on the salt crust
    const saltLitId = `${id}-saltlit`;
    const saltTexSeed = (hashStr(`${seedId}-${id}-salttex`) % 89) + 1;
    defs.push(`<filter id="${saltLitId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.12 0.08" numOctaves="5" seed="${saltTexSeed}" result="saltBump"/>
  <feDiffuseLighting in="saltBump" surfaceScale="1.8" diffuseConstant="0.85" result="saltLit" lighting-color="#e8e0d8">
    <feDistantLight azimuth="200" elevation="55"/>
  </feDiffuseLighting>
  <feComposite in="saltLit" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${(height - by).toFixed(0)}" fill="#d8d0c8" opacity="${(opacity * 0.18).toFixed(2)}" filter="url(#${saltLitId})"/>`
    );

    // 2b. Salt crystal shimmer — fine-grained specular sparkle
    const saltSpecId = `${id}-saltspec`;
    defs.push(`<filter id="${saltSpecId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.9 0.5" numOctaves="3" seed="${saltTexSeed + 2}" result="specSalt"/>
  <feSpecularLighting in="specSalt" surfaceScale="3" specularConstant="0.7" specularExponent="30" result="saltGlint" lighting-color="#ffffff">
    <feDistantLight azimuth="210" elevation="60"/>
  </feSpecularLighting>
  <feComposite in="saltGlint" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${(height - by).toFixed(0)}" fill="#ffffff" opacity="${(opacity * 0.04).toFixed(3)}" filter="url(#${saltSpecId})"/>`
    );

    // 2c. Fine crystal texture — alpha-only grain overlay for micro detail
    const saltGrainId = `${id}-saltgrain`;
    defs.push(`<filter id="${saltGrainId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="1.5 0.8" numOctaves="2" seed="${saltTexSeed + 4}" result="sg"/>
  <feColorMatrix in="sg" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.12 0" result="sga"/>
  <feComposite in="sga" in2="SourceGraphic" operator="in"/>
</filter>`);
    elems.push(
      `<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${(height - by).toFixed(0)}" fill="#ffffff" opacity="${(opacity * 0.10).toFixed(2)}" filter="url(#${saltGrainId})"/>`
    );

    // 3. Multi-scale polygonal crack network — the chaotic beauty of real salt flats.
    // Two overlapping grids: coarse primary cracks + dense secondary cracks.
    // Both use heavy jitter and multi-point Bézier curves for irregular, natural feel.
    const floorH = height - by;
    const saltNoise = createNoise2D(seedRng(hashStr(`${seedId}-${id}-saltcrack`)));

    // ── Primary cracks (large polygons — the dominant structural pattern) ──
    const pCellsX = 12;
    const pCellsY = 8;
    const pCellW = width / pCellsX;
    const pCellH = floorH / pCellsY;

    const pCenters: Array<{ x: number; y: number; t: number }> = [];
    for (let gy = 0; gy < pCellsY; gy++) {
      for (let gx = 0; gx < pCellsX; gx++) {
        // Heavy jitter — 60% of cell size — for truly irregular polygons
        const cx = (gx + 0.5) * pCellW + (rng() - 0.5) * pCellW * 0.6;
        const cy = by + (gy + 0.5) * pCellH + (rng() - 0.5) * pCellH * 0.5;
        const t = gy / pCellsY;
        pCenters.push({ x: cx, y: cy, t });
      }
    }

    // Connect primary centers — 3-5 neighbors each for denser web
    const drawnEdges = new Set<string>();
    for (let i = 0; i < pCenters.length; i++) {
      const c = pCenters[i];
      const dists = pCenters
        .map((n, ni) => ({ ni, d: Math.hypot(n.x - c.x, n.y - c.y) }))
        .filter(d => d.ni !== i)
        .sort((a, b) => a.d - b.d);

      const neighborCount = 3 + Math.floor(rng() * 3);
      for (let j = 0; j < Math.min(neighborCount, dists.length); j++) {
        const ni = dists[j].ni;
        const edgeKey = Math.min(i, ni) + '-' + Math.max(i, ni);
        if (drawnEdges.has(edgeKey)) continue;
        drawnEdges.add(edgeKey);
        const n = pCenters[ni];

        // Multi-point crack with 2 intermediate control points for organic S-curves
        const t13 = 1 / 3;
        const t23 = 2 / 3;
        const cpx1 = c.x + (n.x - c.x) * t13 + (rng() - 0.5) * pCellW * 0.25;
        const cpy1 = c.y + (n.y - c.y) * t13 + (rng() - 0.5) * pCellH * 0.25;
        const cpx2 = c.x + (n.x - c.x) * t23 + (rng() - 0.5) * pCellW * 0.25;
        const cpy2 = c.y + (n.y - c.y) * t23 + (rng() - 0.5) * pCellH * 0.25;
        const perspT = (c.t + n.t) / 2;
        // Perspective: foreground cracks thicker, more opaque
        const sw = ((0.3 + perspT * 1.2) * sc).toFixed(1);
        const cOp = (opacity * (0.12 + perspT * 0.40 + rng() * 0.08)).toFixed(3);
        elems.push(
          `<path d="M ${c.x.toFixed(1)} ${c.y.toFixed(1)} C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)} ${cpx2.toFixed(1)} ${cpy2.toFixed(1)} ${n.x.toFixed(1)} ${n.y.toFixed(1)}" fill="none" stroke="${cactusColor}" stroke-width="${sw}" opacity="${cOp}" stroke-linecap="round"/>`
        );
      }
    }

    // ── Secondary cracks (fine detail — smaller sub-polygons, especially in foreground) ──
    const sCellsX = 22;
    const sCellsY = 14;
    const sCellW = width / sCellsX;
    const sCellH = floorH / sCellsY;

    const sCenters: Array<{ x: number; y: number; t: number }> = [];
    for (let gy = 0; gy < sCellsY; gy++) {
      for (let gx = 0; gx < sCellsX; gx++) {
        // Only place secondary cracks in the foreground half (perspective density)
        const t = gy / sCellsY;
        if (t < 0.3 && rng() > 0.3) continue; // sparse near horizon
        const cx = (gx + 0.5) * sCellW + (rng() - 0.5) * sCellW * 0.55;
        const cy = by + (gy + 0.5) * sCellH + (rng() - 0.5) * sCellH * 0.45;
        sCenters.push({ x: cx, y: cy, t });
      }
    }

    const drawnEdges2 = new Set<string>();
    for (let i = 0; i < sCenters.length; i++) {
      const c = sCenters[i];
      const dists = sCenters
        .map((n, ni) => ({ ni, d: Math.hypot(n.x - c.x, n.y - c.y) }))
        .filter(d => d.ni !== i && d.d < sCellW * 2.0)
        .sort((a, b) => a.d - b.d);

      const neighborCount = 2 + Math.floor(rng() * 2);
      for (let j = 0; j < Math.min(neighborCount, dists.length); j++) {
        const ni = dists[j].ni;
        const edgeKey = Math.min(i, ni) + '-' + Math.max(i, ni);
        if (drawnEdges2.has(edgeKey)) continue;
        drawnEdges2.add(edgeKey);
        const n = sCenters[ni];
        const perspT = (c.t + n.t) / 2;
        // Thinner lines for secondary cracks
        const mx = (c.x + n.x) / 2 + (rng() - 0.5) * sCellW * 0.2;
        const my = (c.y + n.y) / 2 + (rng() - 0.5) * sCellH * 0.2;
        const sw = ((0.15 + perspT * 0.5) * sc).toFixed(1);
        const cOp = (opacity * (0.06 + perspT * 0.22 + rng() * 0.06)).toFixed(3);
        elems.push(
          `<path d="M ${c.x.toFixed(1)} ${c.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${n.x.toFixed(1)} ${n.y.toFixed(1)}" fill="none" stroke="${cactusColor}" stroke-width="${sw}" opacity="${cOp}" stroke-linecap="round"/>`
        );
      }
    }

    // ── Crack edge highlights — light catching the raised edge of each crack ──
    // Use noise to add subtle bright lines alongside some primary cracks
    const crackHighlightId = `${id}-crackhl`;
    defs.push(`<filter id="${crackHighlightId}" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="${(0.4 * sc).toFixed(1)}"/></filter>`);

    for (let i = 0; i < pCenters.length; i++) {
      if (rng() > 0.3) continue; // only some cracks get highlights
      const c = pCenters[i];
      const dists = pCenters
        .map((n, ni) => ({ ni, d: Math.hypot(n.x - c.x, n.y - c.y) }))
        .filter(d => d.ni !== i)
        .sort((a, b) => a.d - b.d);
      if (dists.length < 1) continue;
      const n = pCenters[dists[0].ni];
      const perspT = (c.t + n.t) / 2;
      if (perspT < 0.3) continue;
      const hlOp = (opacity * 0.05 * perspT).toFixed(3);
      // Offset the highlight line slightly from the crack
      const dx = (n.y - c.y) * 0.03;
      const dy2 = -(n.x - c.x) * 0.03;
      elems.push(
        `<line x1="${(c.x + dx).toFixed(1)}" y1="${(c.y + dy2).toFixed(1)}" x2="${(n.x + dx).toFixed(1)}" y2="${(n.y + dy2).toFixed(1)}" stroke="#e0d8d0" stroke-width="${(0.3 * sc).toFixed(1)}" opacity="${hlOp}" filter="url(#${crackHighlightId})"/>`
      );
    }

    // 4. Sky reflection on distant salt surface — horizon mirror effect
    const reflId = `${id}-saltrefl`;
    defs.push(`<linearGradient id="${reflId}" x1="0" y1="${by.toFixed(0)}" x2="0" y2="${(by + floorH * 0.4).toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#6688aa" stop-opacity="${(opacity * 0.10).toFixed(3)}"/>
  <stop offset="100%" stop-color="#6688aa" stop-opacity="0"/>
</linearGradient>`);
    elems.push(
      `<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${(floorH * 0.4).toFixed(0)}" fill="url(#${reflId})"/>`
    );
  } else if (variant === "dunes") {
    // ─ DUNES — photographic sand dune field using noise-based organic profiles.
    // The key insight: real dunes are shaped by wind, not sine waves.
    // Simplex noise creates the irregular, flowing contours that make dunes beautiful.

    const duneRidges = 10; // more ridges = more depth layers
    const floorH = height - by;
    const duneNoise = createNoise2D(seedRng(hashStr(`${seedId}-${id}-dune-shape`)));

    // ── Shared texture filters ──

    // 3D sand surface — feDiffuseLighting on noise bump map
    const grainSeed = (hashStr(`${seedId}-${id}-grain`) % 89) + 1;
    const sandLitId = `${id}-sandlit`;
    defs.push(`<filter id="${sandLitId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.35 0.25" numOctaves="5" seed="${grainSeed}" result="bump"/>
  <feDiffuseLighting in="bump" surfaceScale="2.5" diffuseConstant="0.8" result="lit" lighting-color="#f0d8a8">
    <feDistantLight azimuth="225" elevation="35"/>
  </feDiffuseLighting>
  <feComposite in="lit" in2="SourceGraphic" operator="in"/>
</filter>`);

    // Fine grain overlay
    const fineGrainId = `${id}-fgrain`;
    defs.push(`<filter id="${fineGrainId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="1.8 0.9" numOctaves="2" seed="${grainSeed + 1}" result="fg"/>
  <feColorMatrix in="fg" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0" result="fga"/>
  <feComposite in="fga" in2="SourceGraphic" operator="in"/>
</filter>`);

    // 3D wind ripple — anisotropic lit streaks
    const rippleSeed = (hashStr(`${seedId}-${id}-ripple`) % 89) + 1;
    const rippleId = `${id}-ripple`;
    defs.push(`<filter id="${rippleId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.15 0.012" numOctaves="4" seed="${rippleSeed}" result="rip"/>
  <feDiffuseLighting in="rip" surfaceScale="1.8" diffuseConstant="0.7" result="litRip" lighting-color="#e8c898">
    <feDistantLight azimuth="240" elevation="30"/>
  </feDiffuseLighting>
  <feComposite in="litRip" in2="SourceGraphic" operator="in"/>
</filter>`);

    // Specular sparkle
    const specSandId = `${id}-specsan`;
    defs.push(`<filter id="${specSandId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.6 0.4" numOctaves="3" seed="${grainSeed + 5}" result="specBump"/>
  <feSpecularLighting in="specBump" surfaceScale="4" specularConstant="0.6" specularExponent="25" result="spec" lighting-color="#ffffff">
    <feDistantLight azimuth="225" elevation="50"/>
  </feSpecularLighting>
  <feComposite in="spec" in2="SourceGraphic" operator="in"/>
</filter>`);

    // Coarse colour variation patches
    const patchSeed = (hashStr(`${seedId}-${id}-patch`) % 89) + 1;
    const patchId = `${id}-patch`;
    defs.push(`<filter id="${patchId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.007 0.004" numOctaves="3" seed="${patchSeed}" result="p"/>
  <feColorMatrix in="p" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.5 0 0 0 -1.0" result="pm"/>
  <feGaussianBlur in="pm" stdDeviation="3" result="sp"/>
  <feComposite in="sp" in2="SourceGraphic" operator="in"/>
</filter>`);

    // ── Build dune ridges back-to-front ──
    // Each ridge uses 4-octave simplex noise for organic, wind-sculpted contour.
    for (let r = 0; r < duneRidges; r++) {
      const depthT = r / Math.max(1, duneRidges - 1); // 0=furthest, 1=closest
      // Vertical position: quadratic spacing → more compressed near horizon
      const dy = by + (depthT * depthT) * floorH * 0.75;
      // DRAMATIC amplitude — towering dunes like in Dune movie: massive height variation
      const amp = (0.03 + depthT * 0.18 + rng() * 0.06) * height;
      const ridgeOp = opacity * (0.35 + depthT * 0.60);

      // ── Dune profile: 4-octave simplex noise for organic wind-sculpted shape ──
      // KEY: primary frequency must be LOW (0.8-1.2) for one or two broad sweeping
      // humps across the width. Higher frequencies add detail ON TOP of that.
      const ridgePhase = r * 3.7 + rng() * 10.0;
      // Each ridge tilts — dune crests are diagonal, not perfectly horizontal
      const ridgeTilt = (rng() - 0.5) * floorH * 0.10;
      const sampleCount = 120;
      const pts: Pt[] = [];
      for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        const x = t * width;
        // 4-octave noise: one big sweeping arc + medium shape + fine + micro
        const n =
          duneNoise(t * 0.9 + ridgePhase, r * 4.3) * 0.45 +
          duneNoise(t * 2.5 + ridgePhase, r * 4.3 + 10) * 0.30 +
          duneNoise(t * 7.0 + ridgePhase, r * 4.3 + 20) * 0.16 +
          duneNoise(t * 16.0 + ridgePhase, r * 4.3 + 30) * 0.09;
        // Gentle edge taper
        const edgeTaper = Math.min(1, t * 4, (1 - t) * 4);
        // Ridge tilt creates diagonal crest lines
        const tiltY = ridgeTilt * (t - 0.5);
        const y = dy - amp * Math.max(0, (n * 0.5 + 0.45) * edgeTaper) + tiltY;
        pts.push([x, y]);
      }

      const d = catmullRomToBezierPath(pts);
      const polyD = `${d} L ${width.toFixed(0)} ${height.toFixed(0)} L 0 ${height.toFixed(0)} Z`;
      const clipId = `${id}-dc${r}`;
      defs.push(`<clipPath id="${clipId}"><path d="${polyD}"/></clipPath>`);

      // Color: warm foreground → cool/hazier distance
      const warmR = 0.68 + depthT * 0.14;
      const warmG = 0.52 + depthT * 0.12;
      const warmB = 0.32 + (1 - depthT) * 0.14;
      const duneColor = `rgb(${Math.round(warmR * 255)},${Math.round(warmG * 255)},${Math.round(warmB * 255)})`;

      // ── Layer 1: Base dune fill — directional light/shadow gradient ──
      // Wind-light from upper-left → the right/leeward side falls into shadow
      const gradId = `${id}-dg${r}`;
      const gradAngle = 0.15 + rng() * 0.08; // slight angle variation per ridge
      defs.push(`<linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="${gradAngle.toFixed(2)}">
  <stop offset="0%" stop-color="${duneColor}" stop-opacity="${(ridgeOp * 1.0).toFixed(3)}"/>
  <stop offset="35%" stop-color="${duneColor}" stop-opacity="${(ridgeOp * 0.90).toFixed(3)}"/>
  <stop offset="100%" stop-color="${duneColor}" stop-opacity="${(ridgeOp * 0.55).toFixed(3)}"/>
</linearGradient>`);
      elems.push(`<path d="${polyD}" fill="url(#${gradId})"/>`);

      // ── Layer 2: Slip-face shadow — the dramatic dark leeward side ──
      const shId = `${id}-ds${r}`;
      const shadowStr = ridgeOp * (0.18 + depthT * 0.35);
      // Shadow direction varies slightly per ridge for realism
      const shX1 = (0.15 + rng() * 0.1).toFixed(2);
      defs.push(`<linearGradient id="${shId}" x1="${shX1}" y1="0" x2="0.92" y2="0.5">
  <stop offset="0%" stop-color="#0a0400" stop-opacity="0"/>
  <stop offset="40%" stop-color="#0a0400" stop-opacity="${(shadowStr * 0.35).toFixed(3)}"/>
  <stop offset="100%" stop-color="#0a0400" stop-opacity="${shadowStr.toFixed(3)}"/>
</linearGradient>`);
      elems.push(`<path d="${polyD}" fill="url(#${shId})"/>`);

      // ── Layer 3: Atmospheric haze on distant ridges ──
      if (depthT < 0.5) {
        const hazeOp = (0.22 * (1 - depthT * 2.0)).toFixed(3);
        elems.push(`<path d="${polyD}" fill="#b8a890" opacity="${hazeOp}"/>`);
      }

      // ── Layer 4: 3D lit sand surface (feDiffuseLighting) ──
      const texY = (dy - amp * 1.5).toFixed(0);
      const texH = (floorH + amp * 1.5).toFixed(0);
      elems.push(
        `<rect x="0" y="${texY}" width="${width}" height="${texH}" fill="${duneColor}" opacity="${(ridgeOp * 0.30).toFixed(2)}" filter="url(#${sandLitId})" clip-path="url(#${clipId})"/>`
      );

      // ── Layer 5: Fine sand grain overlay ──
      elems.push(
        `<rect x="0" y="${texY}" width="${width}" height="${texH}" fill="${duneColor}" opacity="${(ridgeOp * 0.18).toFixed(2)}" filter="url(#${fineGrainId})" clip-path="url(#${clipId})"/>`
      );

      // ── Layer 6: 3D wind ripple (stronger on closer ridges) ──
      if (depthT > 0.15) {
        elems.push(
          `<rect x="0" y="${texY}" width="${width}" height="${texH}" fill="${duneColor}" opacity="${(ridgeOp * 0.14 * depthT).toFixed(3)}" filter="url(#${rippleId})" clip-path="url(#${clipId})"/>`
        );
      }

      // ── Layer 7: Specular sparkle (sand grains catching sun) ──
      if (depthT > 0.30) {
        elems.push(
          `<rect x="0" y="${texY}" width="${width}" height="${texH}" fill="#ffffff" opacity="${(ridgeOp * 0.035 * depthT).toFixed(3)}" filter="url(#${specSandId})" clip-path="url(#${clipId})"/>`
        );
      }

      // ── Layer 8: Coarse colour variation patches ──
      if (depthT > 0.25) {
        elems.push(
          `<rect x="0" y="${texY}" width="${width}" height="${texH}" fill="#8a6a45" opacity="${(ridgeOp * 0.05 * depthT).toFixed(3)}" filter="url(#${patchId})" clip-path="url(#${clipId})"/>`
        );
      }

      // ── Layer 9: Crest highlight — subtle bright edge along the ridgeline ──
      // Real dunes have a sharp bright crest where sunlight catches the knife-edge
      if (depthT > 0.2) {
        const crestOp = (ridgeOp * 0.08 * depthT).toFixed(3);
        elems.push(
          `<path d="${d}" fill="none" stroke="#f8e8c0" stroke-width="${(0.6 * sc * (0.5 + depthT)).toFixed(1)}" opacity="${crestOp}" stroke-linecap="round"/>`
        );
      }
    }

    // ── Global wind ripple texture on entire desert floor ──
    elems.push(`<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${floorH.toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.08).toFixed(2)}" filter="url(#${rippleId})"/>`);

    // ── Scattered rocks — irregular shapes with ground shadows ──
    for (let i = 0; i < 10; i++) {
      const rx = rng() * width;
      const ry = by + (0.35 + rng() * 0.55) * floorH;
      const rr = (0.8 + rng() * 1.5) * sc;
      const rOp = (opacity * (0.20 + rng() * 0.25)).toFixed(2);
      // Rock shadow
      elems.push(`<ellipse cx="${(rx + rr * 0.4).toFixed(1)}" cy="${(ry + rr * 0.3).toFixed(1)}" rx="${(rr * 1.0).toFixed(1)}" ry="${(rr * 0.25).toFixed(1)}" fill="#000000" opacity="${(parseFloat(rOp) * 0.25).toFixed(3)}"/>`);
      // Rock body — irregular via different rx/ry
      elems.push(`<ellipse cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" rx="${(rr * (0.8 + rng() * 0.6)).toFixed(1)}" ry="${(rr * (0.3 + rng() * 0.3)).toFixed(1)}" fill="${cactusColor}" opacity="${rOp}"/>`);
    }
  } else {
    // ─ CACTI with Bob Ross 3D drama ─
    // Cacti are silhouettes against the bright desert, but we add:
    //  · Directional lit/shadow gradient on each shape (warm left edge, dark right)
    //  · Rim highlight on the sun-facing edge
    //  · Base shadow for grounding
    //  · 3D lit sand floor surface texture

    // 3D sand surface for the desert floor
    const cactiFloorTexId = `${id}-cfloor3d`;
    const cactiFloorSeed = (hashStr(`${seedId}-${id}-cactifloor`) % 89) + 1;
    defs.push(`<filter id="${cactiFloorTexId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.20 0.15" numOctaves="4" seed="${cactiFloorSeed}" result="floorBump"/>
  <feDiffuseLighting in="floorBump" surfaceScale="2.2" diffuseConstant="0.75" result="floorLit" lighting-color="#d8c098">
    <feDistantLight azimuth="225" elevation="35"/>
  </feDiffuseLighting>
  <feComposite in="floorLit" in2="SourceGraphic" operator="in"/>
</filter>`);
    // Wind ripple on sand
    const cactiRippleId = `${id}-cripple`;
    defs.push(`<filter id="${cactiRippleId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.10 0.008" numOctaves="3" seed="${cactiFloorSeed + 3}" result="rip"/>
  <feDiffuseLighting in="rip" surfaceScale="1.5" diffuseConstant="0.65" result="litRip" lighting-color="#d0b080">
    <feDistantLight azimuth="230" elevation="28"/>
  </feDiffuseLighting>
  <feComposite in="litRip" in2="SourceGraphic" operator="in"/>
</filter>`);

    // Directional lit gradient for cactus silhouettes (warm left → dark right)
    const cactusLitId = `${id}-clit`;
    defs.push(`<linearGradient id="${cactusLitId}" x1="0" y1="0" x2="1" y2="0.3">
  <stop offset="0%" stop-color="#1a2030" stop-opacity="${(opacity * 0.90).toFixed(3)}"/>
  <stop offset="25%" stop-color="${cactusColor}" stop-opacity="${(opacity * 0.95).toFixed(3)}"/>
  <stop offset="100%" stop-color="#040608" stop-opacity="${(opacity * 1.0).toFixed(3)}"/>
</linearGradient>`);

    // Rim glow filter for cactus edge highlights
    const cactusRimId = `${id}-crimglow`;
    defs.push(`<filter id="${cactusRimId}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(1.5 * sc).toFixed(1)}"/></filter>`);

    for (let i = 0; i < cactusCount; i++) {
    const cx = rng() * width;
    const cType = rng();
    const cBaseOp = (opacity * (0.78 + rng() * 0.22)).toFixed(2);

    if (cType < 0.6) {
      // ── SAGUARO — tall main column + 0..2 arms
      const cH = (60 + rng() * 90) * sc;
      const cW = (10 + rng() * 6) * sc;
      const trunkX = cx - cW / 2;
      const trunkY = by - cH;
      const trunkR = cW * 0.5;
      const d = `M ${trunkX.toFixed(1)} ${by.toFixed(1)} L ${trunkX.toFixed(1)} ${(trunkY + trunkR).toFixed(1)} A ${trunkR.toFixed(1)} ${trunkR.toFixed(1)} 0 0 1 ${(trunkX + cW).toFixed(1)} ${(trunkY + trunkR).toFixed(1)} L ${(trunkX + cW).toFixed(1)} ${by.toFixed(1)} Z`;

      // Bob Ross: Base shadow
      elems.push(`<ellipse cx="${cx.toFixed(1)}" cy="${(by + 1.5 * sc).toFixed(1)}" rx="${(cW * 1.2).toFixed(1)}" ry="${(3 * sc).toFixed(1)}" fill="#000000" opacity="${(parseFloat(cBaseOp) * 0.15).toFixed(3)}"/>`);

      // Main body with directional gradient
      elems.push(`<path d="${d}" fill="url(#${cactusLitId})" opacity="${cBaseOp}"/>`);

      // Bob Ross: Rim highlight on left (sun-facing) edge
      elems.push(`<line x1="${trunkX.toFixed(1)}" y1="${(trunkY + trunkR).toFixed(1)}" x2="${trunkX.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#fff0d0" stroke-width="${(1.5 * sc).toFixed(1)}" opacity="${(parseFloat(cBaseOp) * 0.10).toFixed(3)}" filter="url(#${cactusRimId})"/>`);
      elems.push(`<line x1="${trunkX.toFixed(1)}" y1="${(trunkY + trunkR).toFixed(1)}" x2="${trunkX.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#fff0d0" stroke-width="${(0.5 * sc).toFixed(1)}" opacity="${(parseFloat(cBaseOp) * 0.15).toFixed(3)}"/>`);

      // 0–2 side arms
      const armCount = Math.floor(rng() * 3);
      for (let a = 0; a < armCount; a++) {
        const armSide = rng() < 0.5 ? -1 : 1;
        const armStartY = by - cH * (0.35 + rng() * 0.25);
        const armW = cW * 0.65;
        const armH = cH * (0.3 + rng() * 0.2);
        const armReach = (10 + rng() * 14) * sc;
        const ax = armSide < 0 ? trunkX : trunkX + cW;
        const ay = armStartY;
        const ax2 = ax + armSide * armReach;
        const ay2 = ay - armH;
        const armR = armW * 0.5;
        const armEndY = ay2;
        const armD = `M ${ax.toFixed(1)} ${(ay - armW * 0.3).toFixed(1)} L ${ax2.toFixed(1)} ${(ay - armW * 0.3).toFixed(1)} L ${ax2.toFixed(1)} ${(armEndY + armR).toFixed(1)} A ${armR.toFixed(1)} ${armR.toFixed(1)} 0 0 ${armSide < 0 ? 0 : 1} ${(ax2 + armSide * armW).toFixed(1)} ${(armEndY + armR).toFixed(1)} L ${(ax2 + armSide * armW).toFixed(1)} ${(ay + armW * 0.3).toFixed(1)} L ${ax.toFixed(1)} ${(ay + armW * 0.3).toFixed(1)} Z`;
        elems.push(`<path d="${armD}" fill="url(#${cactusLitId})" opacity="${cBaseOp}"/>`);
      }

      // Vertical rib highlights on the lit (left) side
      const ribCount = 3;
      for (let rib = 0; rib < ribCount; rib++) {
        const ribX = trunkX + cW * (0.15 + rib * 0.18);
        elems.push(
          `<line x1="${ribX.toFixed(1)}" y1="${(trunkY + trunkR * 1.5).toFixed(1)}" x2="${ribX.toFixed(1)}" y2="${(by - 4).toFixed(1)}" stroke="${cactusColor}" stroke-width="${(0.5 * sc).toFixed(1)}" opacity="${(parseFloat(cBaseOp) * 0.5).toFixed(2)}"/>`
        );
      }
    } else if (cType < 0.9) {
      // ── BARREL — short squat rounded
      const bW = (24 + rng() * 18) * sc;
      const bH = (18 + rng() * 16) * sc;
      const bx = cx - bW / 2;
      const bY = by - bH;
      const d = `M ${bx.toFixed(1)} ${by.toFixed(1)} A ${(bW / 2).toFixed(1)} ${bH.toFixed(1)} 0 0 1 ${(bx + bW).toFixed(1)} ${by.toFixed(1)} Z`;

      // Base shadow
      elems.push(`<ellipse cx="${cx.toFixed(1)}" cy="${(by + 1 * sc).toFixed(1)}" rx="${(bW * 0.6).toFixed(1)}" ry="${(2 * sc).toFixed(1)}" fill="#000000" opacity="${(parseFloat(cBaseOp) * 0.12).toFixed(3)}"/>`);

      elems.push(`<path d="${d}" fill="url(#${cactusLitId})" opacity="${cBaseOp}"/>`);
      // Vertical ridges
      for (let r = 0; r < 4; r++) {
        const rx = bx + bW * (0.18 + r * 0.22);
        elems.push(
          `<line x1="${rx.toFixed(1)}" y1="${(bY + bH * 0.4).toFixed(1)}" x2="${rx.toFixed(1)}" y2="${(by - 2).toFixed(1)}" stroke="${cactusColor}" stroke-width="${(0.4 * sc).toFixed(1)}" opacity="${(parseFloat(cBaseOp) * 0.4).toFixed(2)}"/>`
        );
      }
      // Rim highlight on left edge
      elems.push(`<line x1="${bx.toFixed(1)}" y1="${(bY + bH * 0.3).toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#fff0d0" stroke-width="${(0.5 * sc).toFixed(1)}" opacity="${(parseFloat(cBaseOp) * 0.10).toFixed(3)}"/>`);
    } else {
      // ── PRICKLY PEAR — cluster of overlapping pads (2–4 oval shapes)
      const pads = 2 + Math.floor(rng() * 3);
      // Base shadow for whole cluster
      elems.push(`<ellipse cx="${cx.toFixed(1)}" cy="${(by + 1 * sc).toFixed(1)}" rx="${(14 * sc).toFixed(1)}" ry="${(2 * sc).toFixed(1)}" fill="#000000" opacity="${(parseFloat(cBaseOp) * 0.10).toFixed(3)}"/>`);
      for (let p = 0; p < pads; p++) {
        const pW = (16 + rng() * 12) * sc;
        const pH = (22 + rng() * 14) * sc;
        const px = cx + (rng() - 0.5) * 18 * sc;
        const py = by - pH / 2 - p * 8 * sc;
        elems.push(
          `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(pW / 2).toFixed(1)}" ry="${(pH / 2).toFixed(1)}" fill="url(#${cactusLitId})" opacity="${cBaseOp}"/>`
        );
        // Rim highlight on left edge of each pad
        elems.push(
          `<ellipse cx="${(px - pW * 0.35).toFixed(1)}" cy="${py.toFixed(1)}" rx="${(1 * sc).toFixed(1)}" ry="${(pH * 0.35).toFixed(1)}" fill="#fff0d0" opacity="${(parseFloat(cBaseOp) * 0.06).toFixed(3)}"/>`
        );
      }
    }
    } // end cacti for-loop

    // 3D lit sand floor
    const cactiFloorH = height - by;
    elems.push(`<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${cactiFloorH.toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.18).toFixed(2)}" filter="url(#${cactiFloorTexId})"/>`);
    // Wind ripple on floor
    elems.push(`<rect x="0" y="${by.toFixed(0)}" width="${width}" height="${cactiFloorH.toFixed(0)}" fill="${sandColor}" opacity="${(opacity * 0.08).toFixed(2)}" filter="url(#${cactiRippleId})"/>`);
  } // end cacti variant else-branch

  // ── 4. Scattered pebbles (skipped on saltflat — would break the smooth crust)
  if (variant !== "saltflat") {
    const rockCount = 22;
    for (let i = 0; i < rockCount; i++) {
      const ry = by + (0.04 + rng() * 0.9) * (height - by);
      const rx = rng() * width;
      const rsize = (0.7 + rng() * 1.5) * sc;
      elems.push(
        `<ellipse cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" rx="${rsize.toFixed(1)}" ry="${(rsize * 0.6).toFixed(1)}" fill="${cactusColor}" opacity="${(opacity * (0.4 + rng() * 0.4)).toFixed(2)}"/>`
      );
    }
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
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
    if (pts.length < 2) return "";
    if (pts.length === 2) {
      return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`;
    }
    // Smooth via quadratic Bezier through midpoints — eliminates the
    // angular kinks from raw fractal vertices while preserving the jagged
    // overall path shape (zigzag character is in the vertex positions).
    const segments: string[] = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i];
      const [nx, ny] = pts[i + 1];
      const mx = (px + nx) / 2;
      const my = (py + ny) / 2;
      // Quadratic: control point = current vertex, end = midpoint to next vertex
      segments.push(`Q${px.toFixed(1)},${py.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`);
    }
    // Final segment: line to the last vertex
    const last = pts[pts.length - 1];
    segments.push(`L${last[0].toFixed(1)},${last[1].toFixed(1)}`);
    return segments.join(" ");
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

    // Tertiary branch (~60% chance per primary branch — more visible detail)
    if (rng() < 0.6 && bPts.length > 4) {
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
  /** Add 3D rock texture and scattered boulders (default false) */
  rocky?: boolean;
  /** Rock color for texture (default "#2a1a12") */
  rockColor?: string;
}

/**
 * Volcanic cone with crater, optional lava glow, and optional 3D rock texture.
 * When `rocky: true`, adds:
 *  - feDiffuseLighting rock surface texture on the cone
 *  - Scattered boulders/rocks on the slopes
 *  - Lava flow streaks from crater down the flanks
 *  - Volcanic debris field at the base
 */
export function volcanoBrick(params: BrickParams, options: VolcanoBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 960;
  const {
    cx,
    baseY,
    peakHeight = 0.25,
    craterWidth = 0.03,
    color,
    lavaColor,
    opacity = 0.95,
    id = "volcano",
    rocky = false,
    rockColor = "#2a1a12",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-volcano-${id}`));
  const volcNoise = createNoise2D(seedRng(hashStr(`${seedId}-${id}-volc-shape`)));
  const px = cx * width;
  const by = baseY * height;
  const peakY = by - peakHeight * height;
  const cw = craterWidth * width;
  const slopeW = (0.15 + peakHeight * 0.4) * width;

  // ── Organic volcano silhouette — noise-perturbed multi-point contour ──
  // Asymmetric slopes: left flank slightly different from right
  const leftBias = 0.85 + rng() * 0.30;  // 0.85–1.15 asymmetry
  const rightBias = 0.85 + rng() * 0.30;
  const leftSlopeW = slopeW * leftBias;
  const rightSlopeW = slopeW * rightBias;
  const contourSteps = 48; // per side
  const volcH = by - peakY;

  // Build left slope: base → crater-left
  const leftPts: { x: number; y: number }[] = [];
  for (let i = 0; i <= contourSteps; i++) {
    const t = i / contourSteps; // 0=base, 1=crater
    const baseX = px - leftSlopeW * (1 - t);
    // Concave volcanic profile: steeper cone shape (0.72 power = conical, not dome)
    const profile = Math.pow(t, 0.72);
    const baseYAtT = by - profile * volcH;
    // Multi-octave noise for rocky irregularity — stronger amplitude
    const noiseAmp = volcH * 0.06 * (1 - Math.pow(Math.abs(t - 0.5) * 2, 3)); // max noise in middle, smooth at base & peak
    const n =
      volcNoise(t * 4.0, 0.3) * 0.45 +
      volcNoise(t * 10.0, 0.3 + 5) * 0.30 +
      volcNoise(t * 22.0, 0.3 + 10) * 0.25;
    const nx = leftSlopeW * 0.018 * volcNoise(t * 7.0, 3.5); // slight x jitter
    leftPts.push({ x: baseX + nx, y: baseYAtT + n * noiseAmp });
  }

  // Build right slope: crater-right → base
  const rightPts: { x: number; y: number }[] = [];
  for (let i = 0; i <= contourSteps; i++) {
    const t = i / contourSteps; // 0=crater, 1=base
    const baseX = px + rightSlopeW * t;
    const profile = Math.pow(1 - t, 0.72);
    const baseYAtT = by - profile * volcH;
    const noiseAmp = volcH * 0.06 * (1 - Math.pow(Math.abs(t - 0.5) * 2, 3));
    const n =
      volcNoise(t * 4.0 + 20, 1.7) * 0.45 +
      volcNoise(t * 10.0 + 20, 1.7 + 5) * 0.30 +
      volcNoise(t * 22.0 + 20, 1.7 + 10) * 0.25;
    const nx = rightSlopeW * 0.018 * volcNoise(t * 7.0 + 20, 4.5);
    rightPts.push({ x: baseX + nx, y: baseYAtT + n * noiseAmp });
  }

  // Irregular crater rim — not a flat line, slight dip in the middle
  const craterDip = volcH * (0.01 + rng() * 0.015);
  const craterSteps = 8;
  const craterPts: { x: number; y: number }[] = [];
  for (let i = 0; i <= craterSteps; i++) {
    const t = i / craterSteps;
    const craterX = (px - cw) + t * (cw * 2);
    // Slight W-shape: higher at edges, lower in center
    const rimProfile = Math.sin(t * Math.PI) * craterDip;
    const rimNoise = volcNoise(t * 6.0 + 40, 5.0) * craterDip * 0.4;
    craterPts.push({ x: craterX, y: peakY + rimProfile + rimNoise });
  }

  // Assemble path using Catmull-Rom → cubic Bézier for smooth but irregular outline
  function catmullToBezier(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return "";
    const segs: string[] = [];
    segs.push(`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      segs.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    }
    return segs.join(" ");
  }

  // Full contour: left slope → crater rim → right slope → base close
  const leftPath = catmullToBezier(leftPts);
  const craterPath = craterPts.slice(1).map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const rightPath = rightPts.slice(1).map((p, i) => {
    if (i === 0) return `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = rightPts[i];
    const cur = rightPts[i + 1];
    return `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(" ");
  // Build right slope as Catmull-Rom too
  const rightSmooth = catmullToBezier(rightPts);
  // Extract just the curve commands (skip the M)
  const rightCurveOnly = rightSmooth.replace(/^M\s+[\d.-]+\s+[\d.-]+\s*/, "");

  const d = `${leftPath} ${craterPath} ${rightCurveOnly} L ${(px + rightSlopeW).toFixed(0)} ${height.toFixed(0)} L ${(px - leftSlopeW).toFixed(0)} ${height.toFixed(0)} Z`;

  const defs: string[] = [];
  const elems: string[] = [];
  const maxSlopeW = Math.max(leftSlopeW, rightSlopeW);
  const rockSeed = (hashStr(`${seedId}-${id}-rock`) % 89) + 1;

  // Clip path for the volcano shape
  const clipId = `${id}-clip`;
  defs.push(`<clipPath id="${clipId}"><path d="${d}"/></clipPath>`);

  // ════════════════════════════════════════════════════════════════════════════
  // PILLAR 1: Directional lit/shadow gradient — warm left, cool right
  // ════════════════════════════════════════════════════════════════════════════
  const baseFillId = `${id}-dirfill`;
  defs.push(`<linearGradient id="${baseFillId}" x1="${(px - maxSlopeW).toFixed(0)}" y1="${peakY.toFixed(0)}" x2="${(px + maxSlopeW).toFixed(0)}" y2="${by.toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#3d2a18" stop-opacity="1"/>
  <stop offset="25%" stop-color="${color}" stop-opacity="1"/>
  <stop offset="55%" stop-color="${color}" stop-opacity="1"/>
  <stop offset="100%" stop-color="#080408" stop-opacity="1"/>
</linearGradient>`);
  elems.push(`<path id="${id}" d="${d}" fill="url(#${baseFillId})" opacity="${opacity}"/>`);

  // Strong directional overlay — bright warm on sun-side, deep cool shadow
  const litShadowId = `${id}-litsh`;
  defs.push(`<linearGradient id="${litShadowId}" x1="${(px - maxSlopeW * 0.8).toFixed(0)}" y1="${peakY.toFixed(0)}" x2="${(px + maxSlopeW * 0.9).toFixed(0)}" y2="${(by + volcH * 0.3).toFixed(0)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#fff0d0" stop-opacity="0.18"/>
  <stop offset="30%" stop-color="#fff0d0" stop-opacity="0.06"/>
  <stop offset="50%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="75%" stop-color="#0a1020" stop-opacity="0.25"/>
  <stop offset="100%" stop-color="#0a1020" stop-opacity="0.45"/>
</linearGradient>`);
  elems.push(`<path d="${d}" fill="url(#${litShadowId})"/>`);

  // ════════════════════════════════════════════════════════════════════════════
  // PILLAR 4: Surface texture — feDiffuseLighting + feSpecularLighting
  // ════════════════════════════════════════════════════════════════════════════
  const rockTexId = `${id}-rtex`;
  defs.push(`<filter id="${rockTexId}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.03 0.045" numOctaves="7" seed="${rockSeed}" result="rockBump"/>
  <feDiffuseLighting in="rockBump" surfaceScale="5" diffuseConstant="0.75" result="rockLit" lighting-color="#907060">
    <feDistantLight azimuth="215" elevation="35"/>
  </feDiffuseLighting>
  <feComposite in="rockLit" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(
    `<rect x="${(px - maxSlopeW - 10).toFixed(0)}" y="${(peakY - 10).toFixed(0)}" width="${(maxSlopeW * 2 + 20).toFixed(0)}" height="${(height - peakY + 20).toFixed(0)}" fill="${rockColor}" opacity="${(opacity * 0.40).toFixed(2)}" filter="url(#${rockTexId})" clip-path="url(#${clipId})"/>`
  );

  // Specular highlight layer — wet/glossy rock facets catching sun
  const specTexId = `${id}-spec`;
  defs.push(`<filter id="${specTexId}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.06" numOctaves="5" seed="${rockSeed + 1}" result="specBump"/>
  <feSpecularLighting in="specBump" surfaceScale="3.5" specularConstant="0.35" specularExponent="14" result="specLit" lighting-color="#c0a080">
    <feDistantLight azimuth="215" elevation="35"/>
  </feSpecularLighting>
  <feComposite in="specLit" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(
    `<rect x="${(px - maxSlopeW - 10).toFixed(0)}" y="${(peakY - 10).toFixed(0)}" width="${(maxSlopeW * 2 + 20).toFixed(0)}" height="${(height - peakY + 20).toFixed(0)}" fill="#ffffff" opacity="0.12" filter="url(#${specTexId})" clip-path="url(#${clipId})"/>`
  );

  // Fine grain texture overlay
  const grainId = `${id}-grain`;
  defs.push(`<filter id="${grainId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.5 0.35" numOctaves="3" seed="${rockSeed + 2}" result="g"/>
  <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0" result="ga"/>
  <feComposite in="ga" in2="SourceGraphic" operator="in"/>
</filter>`);
  elems.push(
    `<rect x="${(px - maxSlopeW).toFixed(0)}" y="${peakY.toFixed(0)}" width="${(maxSlopeW * 2).toFixed(0)}" height="${(height - peakY).toFixed(0)}" fill="#1a0e08" opacity="${(opacity * 0.22).toFixed(2)}" filter="url(#${grainId})" clip-path="url(#${clipId})"/>`
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PILLAR 2: Rim highlight — bright edge along the sun-facing (left) slope
  // ════════════════════════════════════════════════════════════════════════════
  const rimPath = catmullToBezier(leftPts);
  const rimGlowId = `${id}-rimglow`;
  defs.push(`<filter id="${rimGlowId}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(4 * sc).toFixed(1)}"/></filter>`);
  // Outer soft glow
  elems.push(
    `<path d="${rimPath}" fill="none" stroke="#fff0d0" stroke-width="${(5 * sc).toFixed(1)}" opacity="0.12" stroke-linecap="round" filter="url(#${rimGlowId})"/>`
  );
  // Crisp bright rim
  elems.push(
    `<path d="${rimPath}" fill="none" stroke="#fff0d0" stroke-width="${(1.5 * sc).toFixed(1)}" opacity="0.22" stroke-linecap="round"/>`
  );

  // ════════════════════════════════════════════════════════════════════════════
  // Scattered boulders with lit/shadow faces
  // ════════════════════════════════════════════════════════════════════════════
  const boulderCount = 20 + Math.floor(rng() * 10);
  for (let i = 0; i < boulderCount; i++) {
    const slopeT = 0.15 + rng() * 0.80;
    const sideT = (rng() - 0.5) * 2;
    const boulderY = peakY + slopeT * (by - peakY);
    const widthAtY = maxSlopeW * slopeT;
    const boulderX = px + sideT * widthAtY * 0.8;
    const bSize = (1.5 + slopeT * 4 + rng() * 3) * sc;
    const bOp = (opacity * (0.18 + rng() * 0.30 + slopeT * 0.15)).toFixed(2);
    // Cast shadow
    elems.push(
      `<ellipse cx="${(boulderX + bSize * 0.4).toFixed(1)}" cy="${(boulderY + bSize * 0.25).toFixed(1)}" rx="${(bSize * 1.0).toFixed(1)}" ry="${(bSize * 0.3).toFixed(1)}" fill="#000000" opacity="${(parseFloat(bOp) * 0.35).toFixed(3)}" clip-path="url(#${clipId})"/>`
    );
    // Boulder body — directional fill (left = lit, right = dark)
    const bGradId = `${id}-b${i}`;
    defs.push(`<linearGradient id="${bGradId}" x1="0" y1="0" x2="1" y2="0.5">
  <stop offset="0%" stop-color="${rng() > 0.5 ? '#3a2818' : '#2a1a10'}" stop-opacity="1"/>
  <stop offset="100%" stop-color="#0a0608" stop-opacity="1"/>
</linearGradient>`);
    elems.push(
      `<ellipse cx="${boulderX.toFixed(1)}" cy="${boulderY.toFixed(1)}" rx="${(bSize * (0.5 + rng() * 0.5)).toFixed(1)}" ry="${(bSize * (0.3 + rng() * 0.25)).toFixed(1)}" fill="url(#${bGradId})" opacity="${bOp}" clip-path="url(#${clipId})"/>`
    );
    // Tiny highlight on sun-facing edge
    if (rng() > 0.5) {
      elems.push(
        `<ellipse cx="${(boulderX - bSize * 0.2).toFixed(1)}" cy="${(boulderY - bSize * 0.1).toFixed(1)}" rx="${(bSize * 0.15).toFixed(1)}" ry="${(bSize * 0.08).toFixed(1)}" fill="#fff0d0" opacity="${(parseFloat(bOp) * 0.15).toFixed(3)}" clip-path="url(#${clipId})"/>`
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Lava flow streaks — brighter, wider, more dramatic
  // ════════════════════════════════════════════════════════════════════════════
  if (lavaColor) {
    const flowCount = 4 + Math.floor(rng() * 4);
    for (let f = 0; f < flowCount; f++) {
      const flowSide = (rng() - 0.5) * 0.8;
      const flowX1 = px + flowSide * cw;
      const flowX2 = px + flowSide * maxSlopeW * (0.25 + rng() * 0.5);
      const flowEndY = peakY + (0.3 + rng() * 0.55) * (by - peakY);
      const flowMidX = (flowX1 + flowX2) / 2 + (rng() - 0.5) * maxSlopeW * 0.12;
      const flowMidY = (peakY + flowEndY) / 2;
      const flowSw = (0.8 + rng() * 2.0) * sc;
      const flowOp = (0.20 + rng() * 0.35).toFixed(2);
      // Wide diffuse glow
      elems.push(
        `<path d="M ${flowX1.toFixed(1)} ${peakY.toFixed(1)} Q ${flowMidX.toFixed(1)} ${flowMidY.toFixed(1)} ${flowX2.toFixed(1)} ${flowEndY.toFixed(1)}" fill="none" stroke="${lavaColor}" stroke-width="${(flowSw * 6).toFixed(1)}" opacity="${(parseFloat(flowOp) * 0.18).toFixed(3)}" stroke-linecap="round" clip-path="url(#${clipId})"/>`
      );
      // Mid glow
      elems.push(
        `<path d="M ${flowX1.toFixed(1)} ${peakY.toFixed(1)} Q ${flowMidX.toFixed(1)} ${flowMidY.toFixed(1)} ${flowX2.toFixed(1)} ${flowEndY.toFixed(1)}" fill="none" stroke="${lavaColor}" stroke-width="${(flowSw * 3).toFixed(1)}" opacity="${(parseFloat(flowOp) * 0.35).toFixed(3)}" stroke-linecap="round" clip-path="url(#${clipId})"/>`
      );
      // Bright core
      elems.push(
        `<path d="M ${flowX1.toFixed(1)} ${peakY.toFixed(1)} Q ${flowMidX.toFixed(1)} ${flowMidY.toFixed(1)} ${flowX2.toFixed(1)} ${flowEndY.toFixed(1)}" fill="none" stroke="#ffcc44" stroke-width="${flowSw.toFixed(1)}" opacity="${flowOp}" stroke-linecap="round" clip-path="url(#${clipId})"/>`
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PILLAR 3: Atmospheric haze — smoke/mist at the base of the volcano
  // ════════════════════════════════════════════════════════════════════════════
  const hazeFilterId = `${id}-haze`;
  defs.push(`<filter id="${hazeFilterId}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(18 * sc).toFixed(0)} ${(12 * sc).toFixed(0)}"/></filter>`);
  // Atmospheric mist at the lower slopes
  elems.push(
    `<ellipse cx="${px.toFixed(0)}" cy="${(by + volcH * 0.05).toFixed(0)}" rx="${(maxSlopeW * 0.9).toFixed(0)}" ry="${(volcH * 0.25).toFixed(0)}" fill="#1a2030" opacity="0.18" filter="url(#${hazeFilterId})"/>`
  );
  // Warm smoke near lava flows
  if (lavaColor) {
    elems.push(
      `<ellipse cx="${px.toFixed(0)}" cy="${(peakY + volcH * 0.2).toFixed(0)}" rx="${(maxSlopeW * 0.35).toFixed(0)}" ry="${(volcH * 0.20).toFixed(0)}" fill="${lavaColor}" opacity="0.06" filter="url(#${hazeFilterId})"/>`
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PILLAR 5: Base shadow — grounding the volcano on the surface
  // ════════════════════════════════════════════════════════════════════════════
  const baseShadId = `${id}-bshad`;
  defs.push(`<radialGradient id="${baseShadId}" cx="50%" cy="20%" r="55%">
  <stop offset="0%" stop-color="#000000" stop-opacity="0.30"/>
  <stop offset="70%" stop-color="#000000" stop-opacity="0.10"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
</radialGradient>`);
  elems.push(
    `<ellipse cx="${px.toFixed(0)}" cy="${(by + volcH * 0.04).toFixed(0)}" rx="${(maxSlopeW * 1.1).toFixed(0)}" ry="${(volcH * 0.08).toFixed(0)}" fill="url(#${baseShadId})"/>`
  );

  // ════════════════════════════════════════════════════════════════════════════
  // Dramatic lava glow — much larger and more intense
  // ════════════════════════════════════════════════════════════════════════════
  if (lavaColor) {
    const glowH = peakHeight * height * 0.7;
    // Wide ambient lava glow illuminating the whole upper cone
    const ambLavaId = `${id}-amblava`;
    defs.push(`<radialGradient id="${ambLavaId}" cx="50%" cy="90%" r="60%">
  <stop offset="0%" stop-color="${lavaColor}" stop-opacity="0.50"/>
  <stop offset="40%" stop-color="${lavaColor}" stop-opacity="0.15"/>
  <stop offset="100%" stop-color="${lavaColor}" stop-opacity="0"/>
</radialGradient>`);
    elems.push(
      `<ellipse cx="${px.toFixed(0)}" cy="${(peakY - glowH * 0.15).toFixed(0)}" rx="${(cw * 5).toFixed(0)}" ry="${(glowH * 0.8).toFixed(0)}" fill="url(#${ambLavaId})"/>`
    );
    // Concentrated vertical plume
    defs.push(`<radialGradient id="${id}-lava" cx="50%" cy="85%" r="50%">
  <stop offset="0%" stop-color="#ffcc44" stop-opacity="0.85"/>
  <stop offset="30%" stop-color="${lavaColor}" stop-opacity="0.55"/>
  <stop offset="70%" stop-color="${lavaColor}" stop-opacity="0.15"/>
  <stop offset="100%" stop-color="${lavaColor}" stop-opacity="0"/>
</radialGradient>`);
    elems.push(
      `<ellipse cx="${px.toFixed(0)}" cy="${(peakY - glowH * 0.3).toFixed(0)}" rx="${(cw * 2.2).toFixed(0)}" ry="${glowH.toFixed(0)}" fill="url(#${id}-lava)"/>`
    );
    // Crater glow — bright hot spot at the rim
    defs.push(`<radialGradient id="${id}-crater" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="#ffee88" stop-opacity="0.70"/>
  <stop offset="40%" stop-color="${lavaColor}" stop-opacity="0.45"/>
  <stop offset="100%" stop-color="${lavaColor}" stop-opacity="0"/>
</radialGradient>`);
    elems.push(
      `<ellipse cx="${px.toFixed(0)}" cy="${peakY.toFixed(0)}" rx="${(cw * 2.0).toFixed(0)}" ry="${(cw * 0.8).toFixed(0)}" fill="url(#${id}-crater)"/>`
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
