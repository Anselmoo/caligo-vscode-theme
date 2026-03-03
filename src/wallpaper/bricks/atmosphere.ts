/**
 * Atmosphere bricks — advanced SVG filter chains for cinematic depth.
 *
 * These bricks use state-of-the-art SVG filter primitives:
 * - feDiffuseLighting / feSpecularLighting for 3D surface illumination
 * - feComponentTransfer with table-based tone curves
 * - feMerge for multi-layer filter compositing
 * - feComposite arithmetic for advanced blending
 * - Nested feTurbulence → feDisplacementMap chains
 *
 * All filters are self-contained (no external resources) and render
 * deterministically via seed-based feTurbulence seeds.
 */
import type { BrickOutput, BrickParams } from "../types.js";

// ─── Atmosphere Brick ───────────────────────────────────────────────────────────

export interface AtmosphereBrickOptions {
  id?: string;
  /** Primary atmosphere colour (e.g. the night sky tint) */
  color: string;
  /** Secondary colour for specular highlight tint */
  highlightColor?: string;
  /** Turbulence base frequency (lower = larger swirls) */
  turbulenceFreq?: number;
  /** Displacement intensity as fraction of scale */
  displacementScale?: number;
  /** Diffuse lighting elevation angle (degrees) */
  lightElevation?: number;
  /** Diffuse lighting azimuth angle (degrees) */
  lightAzimuth?: number;
  /** Surface scale for lighting relief */
  surfaceScale?: number;
  /** Overall opacity */
  opacity?: number;
  /** Turbulence seed for determinism */
  seed?: number;
}

/**
 * Full atmospheric depth layer using a multi-stage SVG filter chain:
 *   1. feTurbulence generates procedural noise
 *   2. feDisplacementMap distorts the source into organic swirls
 *   3. feDiffuseLighting adds 3D relief from the noise surface
 *   4. feSpecularLighting adds bright rim highlights
 *   5. feMerge composites diffuse + specular + displaced source
 *
 * Creates a rich, organic atmospheric haze with visible depth and light direction.
 */
export function atmosphereBrick(params: BrickParams, options: AtmosphereBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    color,
    highlightColor = "#ffffff",
    turbulenceFreq = 0.003,
    displacementScale = 0.015,
    lightElevation = 35,
    lightAzimuth = 225,
    surfaceScale = 1.5,
    opacity = 0.18,
    seed = 7,
    id = "atmo",
  } = options;

  const ds = (displacementScale * scale).toFixed(0);
  const ss = (surfaceScale * (scale / 2160)).toFixed(1);

  const defs = `<filter id="${id}-f" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${turbulenceFreq}" numOctaves="5" seed="${seed}" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="${ds}" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
  <feDiffuseLighting in="noise" surfaceScale="${ss}" diffuseConstant="0.8" lighting-color="${color}" result="diffuse">
    <feDistantLight azimuth="${lightAzimuth}" elevation="${lightElevation}"/>
  </feDiffuseLighting>
  <feSpecularLighting in="noise" surfaceScale="${(Number.parseFloat(ss) * 0.5).toFixed(1)}" specularConstant="0.6" specularExponent="15" lighting-color="${highlightColor}" result="specular">
    <feDistantLight azimuth="${lightAzimuth}" elevation="${(lightElevation + 15).toFixed(0)}"/>
  </feSpecularLighting>
  <feComposite in="specular" in2="displaced" operator="arithmetic" k1="0" k2="0.3" k3="0.7" k4="0" result="lit"/>
  <feMerge>
    <feMergeNode in="displaced"/>
    <feMergeNode in="diffuse"/>
    <feMergeNode in="lit"/>
  </feMerge>
</filter>`;

  const elements = `<rect id="${id}" width="${width}" height="${height}" fill="${color}" opacity="${opacity}" filter="url(#${id}-f)"/>`;

  return { defs, elements };
}

// ─── Tone Curve Brick ───────────────────────────────────────────────────────────

export interface ToneCurveBrickOptions {
  id?: string;
  /** Preset: "cinematic" (S-curve contrast), "film-fade" (lifted blacks), "night-vision" (green shift) */
  preset?: "cinematic" | "film-fade" | "night-vision" | "custom";
  /** Custom table values for R, G, B, A channels (only used when preset is "custom") */
  tableR?: string;
  tableG?: string;
  tableB?: string;
  tableA?: string;
  opacity?: number;
}

const TONE_PRESETS = {
  cinematic: {
    // S-curve: crush blacks, expand midtones, compress highlights
    r: "0 0.02 0.06 0.15 0.30 0.50 0.68 0.82 0.92 0.97 1",
    g: "0 0.02 0.06 0.15 0.30 0.50 0.68 0.82 0.92 0.97 1",
    b: "0 0.01 0.04 0.12 0.28 0.48 0.66 0.80 0.90 0.96 1",
    a: "1",
  },
  "film-fade": {
    // Lifted blacks + compressed highlights for vintage film look
    r: "0.06 0.10 0.18 0.28 0.40 0.52 0.64 0.75 0.84 0.91 0.95",
    g: "0.05 0.09 0.16 0.26 0.38 0.50 0.62 0.73 0.82 0.89 0.94",
    b: "0.07 0.11 0.19 0.29 0.41 0.53 0.65 0.76 0.85 0.92 0.96",
    a: "1",
  },
  "night-vision": {
    // Green-shifted, high contrast
    r: "0 0.01 0.03 0.08 0.15 0.22 0.30 0.38 0.45 0.50 0.55",
    g: "0 0.04 0.12 0.25 0.40 0.55 0.70 0.82 0.90 0.96 1.0",
    b: "0 0.01 0.04 0.10 0.18 0.26 0.34 0.42 0.48 0.53 0.58",
    a: "1",
  },
};

/**
 * Cinematic tone curve using feComponentTransfer with table values.
 * Applies look-up-table-style colour grading to the entire scene.
 *
 * Applied as a full-viewport overlay with the filter.
 */
export function toneCurveBrick(
  params: BrickParams,
  options: ToneCurveBrickOptions = {}
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { preset = "cinematic", opacity = 0.4, id = "tone" } = options;

  let r: string, g: string, b: string, a: string;
  if (preset === "custom") {
    r = options.tableR ?? "0 1";
    g = options.tableG ?? "0 1";
    b = options.tableB ?? "0 1";
    a = options.tableA ?? "1";
  } else {
    const p = TONE_PRESETS[preset];
    r = p.r;
    g = p.g;
    b = p.b;
    a = p.a;
  }

  const defs = `<filter id="${id}-f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feComponentTransfer>
    <feFuncR type="table" tableValues="${r}"/>
    <feFuncG type="table" tableValues="${g}"/>
    <feFuncB type="table" tableValues="${b}"/>
    <feFuncA type="table" tableValues="${a}"/>
  </feComponentTransfer>
</filter>`;

  const elements = `<rect id="${id}" width="${width}" height="${height}" fill="none" opacity="${opacity}" filter="url(#${id}-f)"/>`;
  return { defs, elements };
}

// ─── Blend Layer Brick ──────────────────────────────────────────────────────────

export interface BlendLayerBrickOptions {
  id?: string;
  /** SVG mix-blend-mode (applied as CSS style) */
  blendMode?: "screen" | "overlay" | "soft-light" | "multiply" | "color-dodge" | "lighten";
  /** Colour for the blend overlay */
  color: string;
  opacity?: number;
  /** Use a gradient fill instead of flat color */
  gradient?: {
    type: "radial" | "linear";
    cx?: number;
    cy?: number;
    r?: number;
    angle?: number;
    stops: Array<{ offset: string; color: string; opacity?: number }>;
  };
}

/**
 * Layer with SVG mix-blend-mode for advanced compositing.
 * Screen mode adds light without washing out; overlay adds contrast;
 * soft-light adds subtle colour tinting; color-dodge creates intense highlights.
 */
export function blendLayerBrick(params: BrickParams, options: BlendLayerBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const { color, blendMode = "screen", opacity = 0.2, id = "blend" } = options;

  const defs: string[] = [];
  let fillAttr = `fill="${color}"`;

  if (options.gradient) {
    const g = options.gradient;
    if (g.type === "radial") {
      const cx = ((g.cx ?? 0.5) * width).toFixed(0);
      const cy = ((g.cy ?? 0.5) * height).toFixed(0);
      const r = ((g.r ?? 0.5) * Math.max(width, height)).toFixed(0);
      const stops = g.stops
        .map(
          s =>
            `  <stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`
        )
        .join("\n");
      defs.push(
        `<radialGradient id="${id}-g" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">\n${stops}\n</radialGradient>`
      );
      fillAttr = `fill="url(#${id}-g)"`;
    } else {
      const angle = g.angle ?? 180;
      const rad = ((angle - 90) * Math.PI) / 180;
      const x1 = (50 - 50 * Math.cos(rad)).toFixed(2);
      const y1 = (50 - 50 * Math.sin(rad)).toFixed(2);
      const x2 = (50 + 50 * Math.cos(rad)).toFixed(2);
      const y2 = (50 + 50 * Math.sin(rad)).toFixed(2);
      const stops = g.stops
        .map(
          s =>
            `  <stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}"/>`
        )
        .join("\n");
      defs.push(
        `<linearGradient id="${id}-g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">\n${stops}\n</linearGradient>`
      );
      fillAttr = `fill="url(#${id}-g)"`;
    }
  }

  const elements = `<rect id="${id}" width="${width}" height="${height}" ${fillAttr} opacity="${opacity}" style="mix-blend-mode:${blendMode}"/>`;

  return { defs: defs.length > 0 ? defs.join("\n") : undefined, elements };
}

// ─── Clip Mask Brick ────────────────────────────────────────────────────────────

export interface ClipMaskBrickOptions {
  id?: string;
  /** SVG content to clip (will be wrapped in a <g clip-path="...">) */
  content: BrickOutput;
  /** Clip path shape — "terrain" generates a procedural ridgeline */
  clipShape:
    | { type: "terrain"; baseY: number; roughness?: number; points?: number; invert?: boolean }
    | { type: "circle"; cx: number; cy: number; r: number }
    | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number };
}

// Import the PRNG for terrain clips
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

/**
 * Clips content behind a terrain silhouette or geometric shape.
 * Enables effects like "stars visible only above the mountain ridgeline"
 * or "aurora clipped to sky region above terrain".
 */
export function clipMaskBrick(params: BrickParams, options: ClipMaskBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const { content, clipShape, id = "clip" } = options;

  let clipPathContent: string;

  if (clipShape.type === "terrain") {
    const { baseY, roughness = 0.08, points = 20, invert = false } = clipShape;
    const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-clip-${id}`));
    const by = baseY * height;
    const amp = roughness * height;

    const ridgePts: Pt[] = [];
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const noise = (rng() - 0.5) * 2 * amp + (rng() - 0.5) * amp * 0.5;
      const y = Math.max(0, Math.min(height, by + noise));
      ridgePts.push([x, y]);
    }

    const curvePath = catmullRomToBezierPath(ridgePts);

    if (invert) {
      // Clip to area BELOW the ridgeline (terrain surface)
      clipPathContent = `<path d="${curvePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z"/>`;
    } else {
      // Clip to area ABOVE the ridgeline (sky region) — default
      clipPathContent = `<path d="${curvePath} L ${width.toFixed(1)} 0 L 0 0 Z"/>`;
    }
  } else if (clipShape.type === "circle") {
    const cx = (clipShape.cx * width).toFixed(0);
    const cy = (clipShape.cy * height).toFixed(0);
    const r = (clipShape.r * Math.max(width, height)).toFixed(0);
    clipPathContent = `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  } else {
    const cx = (clipShape.cx * width).toFixed(0);
    const cy = (clipShape.cy * height).toFixed(0);
    const rx = (clipShape.rx * width).toFixed(0);
    const ry = (clipShape.ry * height).toFixed(0);
    clipPathContent = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
  }

  const defs = [`<clipPath id="${id}-cp">\n  ${clipPathContent}\n</clipPath>`, content.defs]
    .filter(Boolean)
    .join("\n");

  const elements = `<g clip-path="url(#${id}-cp)">\n${content.elements}\n</g>`;

  return { defs, elements };
}

// ─── Nebula Organic Brick ───────────────────────────────────────────────────────

export interface NebulaOrganicBrickOptions {
  id?: string;
  /** Nebula blobs with turbulence-driven organic shapes */
  blobs: Array<{
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    color: string;
    opacity?: number;
  }>;
  /** Blur amount as fraction of scale */
  blur?: number;
  /** Add turbulence distortion for organic edges */
  turbulence?: boolean;
  /** Turbulence frequency */
  turbulenceFreq?: number;
  /** Displacement amount for turbulence */
  displacement?: number;
}

/**
 * Enhanced nebula glow with turbulence-driven organic boundaries.
 * Instead of smooth gaussian ellipses, adds feTurbulence displacement
 * for cloud-like, organic edges that look like real nebulae.
 */
export function nebulaOrganicBrick(
  params: BrickParams,
  options: NebulaOrganicBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    blobs,
    blur = 0.06,
    turbulence = true,
    turbulenceFreq = 0.004,
    displacement = 0.03,
    id = "nebOrg",
  } = options;

  const sd = (blur * scale).toFixed(0);
  const ds = (displacement * scale).toFixed(0);

  const defsArr: string[] = [];

  if (turbulence) {
    defsArr.push(`<filter id="${id}-f" x="-50%" y="-50%" width="200%" height="200%">
  <feTurbulence type="fractalNoise" baseFrequency="${turbulenceFreq}" numOctaves="4" seed="19" result="nebNoise"/>
  <feDisplacementMap in="SourceGraphic" in2="nebNoise" scale="${ds}" xChannelSelector="R" yChannelSelector="G" result="distorted"/>
  <feGaussianBlur in="distorted" stdDeviation="${sd}" result="blurred"/>
</filter>`);
  } else {
    defsArr.push(
      `<filter id="${id}-f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`
    );
  }

  const blobElems = blobs
    .map(
      (b, i) =>
        `<ellipse id="${id}-b${i}" cx="${(b.cx * width).toFixed(0)}" cy="${(b.cy * height).toFixed(0)}" rx="${(b.rx * scale).toFixed(0)}" ry="${(b.ry * scale).toFixed(0)}" fill="${b.color}" opacity="${b.opacity ?? 0.15}"/>`
    )
    .join("\n");

  const elements = `<g id="${id}" filter="url(#${id}-f)">\n${blobElems}\n</g>`;

  return { defs: defsArr.join("\n"), elements };
}

// ─── Milky Way Brick ────────────────────────────────────────────────────────────

export interface MilkyWayBrickOptions {
  id?: string;
  /** Center Y as fraction */
  cy?: number;
  /** Band height as fraction */
  bandHeight?: number;
  /** Rotation angle in degrees */
  angle?: number;
  /** Core colour */
  color: string;
  /** Edge colour */
  edgeColor?: string;
  opacity?: number;
}

/**
 * Milky Way band — a wide, turbulence-textured galactic band across the sky.
 * Uses nested filter chains for realistic cosmic dust appearance:
 * feTurbulence → feColorMatrix → feGaussianBlur → feComposite
 */
export function milkyWayBrick(params: BrickParams, options: MilkyWayBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    cy = 0.35,
    bandHeight = 0.2,
    angle = 15,
    color,
    edgeColor,
    opacity = 0.12,
    id = "mway",
  } = options;

  const bh = bandHeight * height;
  const y1 = (cy - bandHeight / 2) * height;
  const ec = edgeColor ?? color;

  const defs = `<linearGradient id="${id}-grd" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="${ec}" stop-opacity="0"/>
  <stop offset="25%" stop-color="${color}" stop-opacity="1"/>
  <stop offset="50%" stop-color="${color}" stop-opacity="1"/>
  <stop offset="75%" stop-color="${color}" stop-opacity="1"/>
  <stop offset="100%" stop-color="${ec}" stop-opacity="0"/>
</linearGradient>
<filter id="${id}-f" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.005 0.015" numOctaves="6" seed="42" result="dust"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0.8  0 0 0 0 0.75  0 0 0 0 0.6  0 0 0 3 -1.2" in="dust" result="shaped"/>
  <feGaussianBlur in="shaped" stdDeviation="${(scale * 0.005).toFixed(1)}" result="soft"/>
  <feComposite in="soft" in2="SourceGraphic" operator="in"/>
</filter>`;

  const cx = width / 2;
  const cyP = y1 + bh / 2;
  const elements = `<g id="${id}" transform="rotate(${angle} ${cx.toFixed(0)} ${cyP.toFixed(0)})" opacity="${opacity}">
  <rect x="${(-width * 0.15).toFixed(0)}" y="${y1.toFixed(0)}" width="${(width * 1.3).toFixed(0)}" height="${bh.toFixed(0)}" fill="url(#${id}-grd)" filter="url(#${id}-f)"/>
</g>`;

  return { defs, elements };
}

// ─── Constellation Brick ────────────────────────────────────────────────────────

export interface ConstellationBrickOptions {
  id?: string;
  /** Number of constellation patterns to generate */
  count?: number;
  color?: string;
  starRadius?: number;
  lineOpacity?: number;
  starOpacity?: number;
}

/**
 * Procedural constellation patterns — stars connected by faint lines.
 * Creates recognizable star-pattern shapes for visual interest beyond scattered dots.
 */
export function constellationBrick(
  params: BrickParams,
  options: ConstellationBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    count = 4,
    color = "#ffffff",
    starRadius = 2,
    lineOpacity = 0.15,
    starOpacity = 0.6,
    id = "const",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-constellation`));
  const elems: string[] = [];

  for (let c = 0; c < count; c++) {
    // Each constellation is 4-7 stars in the upper 55% of the viewport
    const starCount = 4 + Math.floor(rng() * 4);
    const baseCx = (0.1 + rng() * 0.8) * width;
    const baseCy = (0.05 + rng() * 0.45) * height;
    const spread = (0.05 + rng() * 0.1) * scale;

    const stars: Array<{ x: number; y: number }> = [];
    for (let s = 0; s < starCount; s++) {
      const x = baseCx + (rng() - 0.5) * 2 * spread;
      const y = baseCy + (rng() - 0.5) * 2 * spread * 0.6;
      stars.push({ x, y });
    }

    // Connect stars with lines (nearest-neighbor chain, not full graph)
    for (let s = 0; s < stars.length - 1; s++) {
      const a = stars[s];
      const b = stars[s + 1];
      elems.push(
        `<line x1="${a.x.toFixed(0)}" y1="${a.y.toFixed(0)}" x2="${b.x.toFixed(0)}" y2="${b.y.toFixed(0)}" stroke="${color}" stroke-width="${(0.5 * sc).toFixed(1)}" opacity="${lineOpacity}"/>`
      );
    }
    // Sometimes add a cross-connection for variety
    if (stars.length >= 4 && rng() > 0.4) {
      const a = stars[0];
      const b = stars[Math.floor(stars.length / 2)];
      elems.push(
        `<line x1="${a.x.toFixed(0)}" y1="${a.y.toFixed(0)}" x2="${b.x.toFixed(0)}" y2="${b.y.toFixed(0)}" stroke="${color}" stroke-width="${(0.4 * sc).toFixed(1)}" opacity="${(lineOpacity * 0.6).toFixed(2)}"/>`
      );
    }

    // Star dots at each vertex (slightly brighter than scattered stars)
    for (const s of stars) {
      const r = (starRadius + rng() * 1.5) * sc;
      elems.push(
        `<circle cx="${s.x.toFixed(0)}" cy="${s.y.toFixed(0)}" r="${r.toFixed(1)}" fill="${color}" opacity="${(starOpacity * (0.7 + rng() * 0.3)).toFixed(2)}"/>`
      );
    }
  }

  return { elements: `<g id="${id}">\n${elems.join("\n")}\n</g>` };
}

// ─── Terrain Rim Light Brick ────────────────────────────────────────────────────

export interface TerrainRimLightBrickOptions {
  id?: string;
  /** The terrain path data (must be a closed polygon path) — reuse the terrain path from terrainBrick output */
  terrainPathD: string;
  /** Rim light colour */
  color: string;
  /** How thick the rim highlight is */
  rimWidth?: number;
  /** Glow blur around the rim */
  glowBlur?: number;
  opacity?: number;
}

/**
 * Adds a specular rim-light edge to a terrain silhouette.
 * Uses feMorphology (erode) + feComposite (out) to extract the edge,
 * then applies feGaussianBlur for a soft glow.
 * Creates the iconic "backlit mountain ridge" effect.
 */
export function terrainRimLightBrick(
  _params: BrickParams,
  options: TerrainRimLightBrickOptions
): BrickOutput {
  const { terrainPathD, color, rimWidth = 2, glowBlur = 4, opacity = 0.6, id = "trl" } = options;

  const defs = `<filter id="${id}-f" x="-5%" y="-5%" width="110%" height="110%">
  <feMorphology in="SourceGraphic" operator="erode" radius="${rimWidth}" result="eroded"/>
  <feComposite in="SourceGraphic" in2="eroded" operator="out" result="edge"/>
  <feGaussianBlur in="edge" stdDeviation="${glowBlur}" result="glow"/>
  <feMerge>
    <feMergeNode in="glow"/>
    <feMergeNode in="edge"/>
  </feMerge>
</filter>`;

  const elements = `<path id="${id}" d="${terrainPathD}" fill="${color}" opacity="${opacity}" filter="url(#${id}-f)"/>`;

  return { defs, elements };
}
