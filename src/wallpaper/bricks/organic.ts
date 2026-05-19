/**
 * Organic bricks -- natural/biological SVG primitives.
 * Blobs, caustics, crystals, fibers, coral, marble, agate, mycelium,
 * petals, drift trails, smoke wisps, and ice cracks.
 *
 * All shapes are mathematically generated using a seeded PRNG for
 * determinism. Every brick is a pure function (BrickParams, options) -> BrickOutput.
 */
import type { BrickOutput, BrickParams } from "../types.js";

// ---- Seeded PRNG (mulberry32) ------------------------------------------------

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

// ---- Helpers -----------------------------------------------------------------

type Pt = [number, number];

function fmt(n: number, d = 1): string {
  return n.toFixed(d);
}

/**
 * Catmull-Rom to cubic Bezier path. Produces smooth C1-continuous curves
 * through every input point. Optionally closes the path.
 */
function catmullRomPath(pts: Pt[], closed = false): string {
  if (pts.length < 2) return "";
  const all = closed ? [...pts, pts[0], pts[1]] : pts;
  const n = all.length;
  const d: string[] = [`M ${fmt(all[0][0])} ${fmt(all[0][1])}`];
  const limit = closed ? pts.length : n - 1;
  for (let i = 0; i < limit; i++) {
    const p0 = all[Math.max(0, i - 1)];
    const p1 = all[i];
    const p2 = all[Math.min(n - 1, i + 1)];
    const p3 = all[Math.min(n - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${fmt(cp1x)} ${fmt(cp1y)} ${fmt(cp2x)} ${fmt(cp2y)} ${fmt(p2[0])} ${fmt(p2[1])}`);
  }
  if (closed) d.push("Z");
  return d.join(" ");
}

// =============================================================================
// 1. blobBrick
// =============================================================================

export interface BlobBrickOptions {
  id?: string;
  /** Centre X as fraction of width (0-1) */
  cx?: number;
  /** Centre Y as fraction of height (0-1) */
  cy?: number;
  /** Base radius as fraction of max(width, height) */
  size?: number;
  /** Number of blobs to generate (1-12) */
  blobCount?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
}

/**
 * Organic blob shapes using cubic bezier curves.
 * Generates 5-8 control points around a centre, then creates a smooth
 * closed path via Catmull-Rom interpolation.
 */
export function blobBrick(params: BrickParams, options: BlobBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "blob",
    cx = 0.5,
    cy = 0.5,
    size = 0.08,
    blobCount = 5,
    color,
    opacity = 0.6,
    strokeWidth = 1.5,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-blob-${id}`));
  const elems: string[] = [];
  const sw = strokeWidth * sc;

  for (let b = 0; b < blobCount; b++) {
    // Scatter blobs around the given centre
    const bx = cx * width + (rng() - 0.5) * width * 0.4;
    const by = cy * height + (rng() - 0.5) * height * 0.4;
    const blobR = size * scale * (0.5 + rng() * 0.8);
    const ptCount = 5 + Math.floor(rng() * 4); // 5-8 points
    const pts: Pt[] = [];

    for (let p = 0; p < ptCount; p++) {
      const angle = (p / ptCount) * Math.PI * 2;
      const jitter = 0.65 + rng() * 0.7; // 0.65-1.35x radius variation
      const px = bx + Math.cos(angle) * blobR * jitter;
      const py = by + Math.sin(angle) * blobR * jitter;
      pts.push([px, py]);
    }

    const pathD = catmullRomPath(pts, true);
    const bOp = opacity * (0.5 + rng() * 0.5);
    elems.push(
      `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${fmt(sw)}" opacity="${fmt(bOp, 3)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 2. causticBrick
// =============================================================================

export interface CausticBrickOptions {
  id?: string;
  /** Number of caustic curves */
  lineCount?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  /** Region: [x0, y0, x1, y1] as fractions (0-1). Defaults to full canvas. */
  region?: [number, number, number, number];
}

/**
 * Water caustic patterns -- bright overlapping curved lines simulating
 * light refraction through water. Generates intersecting bezier curves
 * with varying curvature and brightness.
 */
export function causticBrick(params: BrickParams, options: CausticBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "caustic",
    lineCount = 30,
    color,
    opacity = 0.4,
    strokeWidth = 1.2,
    region = [0, 0, 1, 1],
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-caustic-${id}`));
  const defs: string[] = [];
  const elems: string[] = [];
  const sw = strokeWidth * sc;

  // Soft glow filter for the caustic shimmer
  const glowId = `${id}-glow`;
  defs.push(
    `<filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${fmt(1.8 * sc)}"/></filter>`
  );

  const rx0 = region[0] * width;
  const ry0 = region[1] * height;
  const rw = (region[2] - region[0]) * width;
  const rh = (region[3] - region[1]) * height;

  for (let i = 0; i < lineCount; i++) {
    // Each caustic is a cubic bezier with 3-5 segments
    const segments = 3 + Math.floor(rng() * 3);
    const pts: Pt[] = [];
    let px = rx0 + rng() * rw;
    let py = ry0 + rng() * rh;
    pts.push([px, py]);

    for (let s = 0; s < segments; s++) {
      px += (rng() - 0.5) * rw * 0.4;
      py += (rng() - 0.5) * rh * 0.4;
      // Keep within region bounds
      px = Math.max(rx0, Math.min(rx0 + rw, px));
      py = Math.max(ry0, Math.min(ry0 + rh, py));
      pts.push([px, py]);
    }

    const pathD = catmullRomPath(pts);
    const lineOp = opacity * (0.3 + rng() * 0.7);
    const lineSw = sw * (0.5 + rng() * 1.0);

    // Outer glow pass
    elems.push(
      `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${fmt(lineSw * 3)}" opacity="${fmt(lineOp * 0.3, 3)}" stroke-linecap="round" filter="url(#${glowId})"/>`
    );
    // Core line
    elems.push(
      `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${fmt(lineSw)}" opacity="${fmt(lineOp, 3)}" stroke-linecap="round"/>`
    );
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 3. crystalBrick
// =============================================================================

export interface CrystalBrickOptions {
  id?: string;
  /** Centre X as fraction of width (0-1) */
  cx?: number;
  /** Centre Y as fraction of height (0-1) */
  cy?: number;
  /** Crystal size as fraction of max(width, height) */
  size?: number;
  /** Number of facets per crystal (4-10) */
  facetCount?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  /** Number of crystals to scatter */
  crystalCount?: number;
}

/**
 * Faceted crystal/gem shapes with sharp edges. Generates random convex
 * polygons with straight edges and internal facet lines for a gem-like look.
 */
export function crystalBrick(params: BrickParams, options: CrystalBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "crystal",
    cx = 0.5,
    cy = 0.5,
    size = 0.06,
    facetCount = 6,
    color,
    opacity = 0.5,
    strokeWidth = 1.0,
    crystalCount = 4,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-crystal-${id}`));
  const elems: string[] = [];
  const sw = strokeWidth * sc;

  for (let c = 0; c < crystalCount; c++) {
    const ccx = cx * width + (rng() - 0.5) * width * 0.5;
    const ccy = cy * height + (rng() - 0.5) * height * 0.5;
    const cSize = size * scale * (0.6 + rng() * 0.8);
    const nFacets = facetCount + Math.floor(rng() * 3) - 1;

    // Generate convex polygon vertices sorted by angle
    const angles: number[] = [];
    for (let f = 0; f < nFacets; f++) {
      angles.push(rng() * Math.PI * 2);
    }
    angles.sort((a, b) => a - b);

    const verts: Pt[] = angles.map(a => {
      const r = cSize * (0.6 + rng() * 0.4);
      return [ccx + Math.cos(a) * r, ccy + Math.sin(a) * r];
    });

    // Outline polygon
    const polyD =
      `M ${fmt(verts[0][0])} ${fmt(verts[0][1])} ` +
      verts
        .slice(1)
        .map(v => `L ${fmt(v[0])} ${fmt(v[1])}`)
        .join(" ") +
      " Z";

    const cOp = opacity * (0.5 + rng() * 0.5);
    elems.push(
      `<path d="${polyD}" fill="none" stroke="${color}" stroke-width="${fmt(sw)}" opacity="${fmt(cOp, 3)}" stroke-linejoin="miter"/>`
    );

    // Internal facet lines from centre to each vertex
    for (let f = 0; f < verts.length; f++) {
      if (rng() > 0.6) {
        elems.push(
          `<line x1="${fmt(ccx)}" y1="${fmt(ccy)}" x2="${fmt(verts[f][0])}" y2="${fmt(verts[f][1])}" stroke="${color}" stroke-width="${fmt(sw * 0.5)}" opacity="${fmt(cOp * 0.4, 3)}"/>`
        );
      }
    }

    // Cross-facet lines (vertex to opposite vertex) for internal reflections
    for (let f = 0; f < verts.length; f++) {
      const opposite = (f + Math.floor(verts.length / 2)) % verts.length;
      if (rng() > 0.55) {
        elems.push(
          `<line x1="${fmt(verts[f][0])}" y1="${fmt(verts[f][1])}" x2="${fmt(verts[opposite][0])}" y2="${fmt(verts[opposite][1])}" stroke="${color}" stroke-width="${fmt(sw * 0.35)}" opacity="${fmt(cOp * 0.25, 3)}"/>`
        );
      }
    }
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 4. fiberNetworkBrick
// =============================================================================

export interface FiberNetworkBrickOptions {
  id?: string;
  /** Number of anchor points in the network */
  pointCount?: number;
  /** Max connections per point */
  maxConnections?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
}

/**
 * Thread/fiber network. Random points connected by curved lines
 * (quadratic bezier) forming a web-like organic mesh.
 */
export function fiberNetworkBrick(
  params: BrickParams,
  options: FiberNetworkBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "fiber",
    pointCount = 40,
    maxConnections = 3,
    color,
    opacity = 0.35,
    strokeWidth = 0.8,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-fiber-${id}`));
  const elems: string[] = [];
  const sw = strokeWidth * sc;

  // Generate points
  const pts: Pt[] = [];
  for (let i = 0; i < pointCount; i++) {
    pts.push([rng() * width, rng() * height]);
  }

  // For each point, find nearest neighbours and connect with quadratic bezier
  for (let i = 0; i < pts.length; i++) {
    // Sort other points by distance
    const distances = pts
      .map((p, j) => ({
        idx: j,
        dist: Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]),
      }))
      .filter(d => d.idx !== i)
      .sort((a, b) => a.dist - b.dist);

    const connCount = 1 + Math.floor(rng() * maxConnections);
    for (let c = 0; c < Math.min(connCount, distances.length); c++) {
      const target = pts[distances[c].idx];
      // Skip very long connections to keep it looking like fibres
      if (distances[c].dist > scale * 0.3) continue;

      // Control point offset for curve
      const midX = (pts[i][0] + target[0]) / 2;
      const midY = (pts[i][1] + target[1]) / 2;
      const perpX = -(target[1] - pts[i][1]);
      const perpY = target[0] - pts[i][0];
      const perpLen = Math.hypot(perpX, perpY) || 1;
      const curveOffset = (rng() - 0.5) * distances[c].dist * 0.3;
      const cpx = midX + (perpX / perpLen) * curveOffset;
      const cpy = midY + (perpY / perpLen) * curveOffset;

      const fOp = opacity * (0.4 + rng() * 0.6);
      const fSw = sw * (0.5 + rng() * 1.0);

      elems.push(
        `<path d="M ${fmt(pts[i][0])} ${fmt(pts[i][1])} Q ${fmt(cpx)} ${fmt(cpy)} ${fmt(target[0])} ${fmt(target[1])}" fill="none" stroke="${color}" stroke-width="${fmt(fSw)}" opacity="${fmt(fOp, 3)}" stroke-linecap="round"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 5. coralBrick
// =============================================================================

export interface CoralBrickOptions {
  id?: string;
  /** Recursion depth for branching (2-6) */
  branchDepth?: number;
  /** Starting Y position as fraction of height (0-1) */
  startY?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  /** Number of coral stems */
  stemCount?: number;
}

/**
 * Branching coral structures using recursive L-system-like generation.
 * Starts from base points and branches upward with random angles,
 * producing tree-like structures reminiscent of sea coral.
 */
export function coralBrick(params: BrickParams, options: CoralBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "coral",
    branchDepth = 4,
    startY = 0.85,
    color,
    opacity = 0.45,
    strokeWidth = 1.5,
    stemCount = 5,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-coral-${id}`));
  const elems: string[] = [];

  function branch(
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
    sw: number,
    op: number
  ): void {
    if (depth <= 0 || length < 2 * sc) return;

    // End point with slight curve via bezier control point
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    const ctrlX = x + Math.cos(angle + (rng() - 0.5) * 0.6) * length * 0.6;
    const ctrlY = y + Math.sin(angle + (rng() - 0.5) * 0.6) * length * 0.6;

    elems.push(
      `<path d="M ${fmt(x)} ${fmt(y)} Q ${fmt(ctrlX)} ${fmt(ctrlY)} ${fmt(endX)} ${fmt(endY)}" fill="none" stroke="${color}" stroke-width="${fmt(sw)}" opacity="${fmt(op, 3)}" stroke-linecap="round"/>`
    );

    // Small node at branch point
    if (depth > 1 && rng() > 0.5) {
      elems.push(
        `<circle cx="${fmt(endX)}" cy="${fmt(endY)}" r="${fmt(sw * 1.2)}" fill="${color}" opacity="${fmt(op * 0.5, 3)}"/>`
      );
    }

    // Branch into 2-3 sub-branches
    const subBranches = 2 + (rng() > 0.6 ? 1 : 0);
    for (let b = 0; b < subBranches; b++) {
      const spread = (Math.PI / 4) * (0.5 + rng() * 1.0);
      const newAngle = angle + (b - (subBranches - 1) / 2) * spread + (rng() - 0.5) * 0.3;
      const newLen = length * (0.55 + rng() * 0.25);
      const newSw = sw * (0.6 + rng() * 0.2);
      const newOp = op * (0.75 + rng() * 0.2);
      branch(endX, endY, newAngle, newLen, depth - 1, newSw, newOp);
    }
  }

  const baseSw = strokeWidth * sc;
  for (let s = 0; s < stemCount; s++) {
    const sx = width * (0.1 + rng() * 0.8);
    const sy = startY * height;
    const baseAngle = -Math.PI / 2 + (rng() - 0.5) * 0.6; // roughly upward
    const baseLen = scale * (0.04 + rng() * 0.06);
    const stemOp = opacity * (0.6 + rng() * 0.4);
    branch(sx, sy, baseAngle, baseLen, branchDepth, baseSw, stemOp);
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 6. marbleBrick
// =============================================================================

export interface MarbleBrickOptions {
  id?: string;
  /** Number of marble veins */
  veinCount?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  /** Curviness factor (0.1 = straight, 1.0 = very wavy) */
  curviness?: number;
}

/**
 * Marble vein texture. Generates wandering curves (random walk with
 * Catmull-Rom smoothing) that look like the veins in natural marble stone.
 */
export function marbleBrick(params: BrickParams, options: MarbleBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "marble",
    veinCount = 8,
    color,
    opacity = 0.3,
    strokeWidth = 1.0,
    curviness = 0.5,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-marble-${id}`));
  const elems: string[] = [];
  const baseSw = strokeWidth * sc;

  for (let v = 0; v < veinCount; v++) {
    // Start from a random edge or interior point
    let px = rng() * width;
    let py = rng() * height;

    // Random walk direction with drift
    const driftAngle = rng() * Math.PI * 2;
    const driftX = Math.cos(driftAngle);
    const driftY = Math.sin(driftAngle);
    const stepLen = scale * 0.02;
    const steps = 12 + Math.floor(rng() * 18);
    const pts: Pt[] = [[px, py]];

    for (let s = 0; s < steps; s++) {
      // Random walk with directional bias
      const wanderAngle = (rng() - 0.5) * Math.PI * curviness * 2;
      const wx = Math.cos(driftAngle + wanderAngle);
      const wy = Math.sin(driftAngle + wanderAngle);
      px += (driftX * 0.6 + wx * 0.4) * stepLen * (0.7 + rng() * 0.6);
      py += (driftY * 0.6 + wy * 0.4) * stepLen * (0.7 + rng() * 0.6);
      pts.push([px, py]);
    }

    const pathD = catmullRomPath(pts);
    const vOp = opacity * (0.4 + rng() * 0.6);
    const vSw = baseSw * (0.5 + rng() * 1.2);

    // Main vein
    elems.push(
      `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${fmt(vSw)}" opacity="${fmt(vOp, 3)}" stroke-linecap="round"/>`
    );

    // Thinner parallel companion vein for depth (offset slightly)
    if (rng() > 0.4) {
      const offPts: Pt[] = pts.map(p => [
        p[0] + (rng() - 0.5) * stepLen * 0.4,
        p[1] + (rng() - 0.5) * stepLen * 0.4,
      ]);
      const offPathD = catmullRomPath(offPts);
      elems.push(
        `<path d="${offPathD}" fill="none" stroke="${color}" stroke-width="${fmt(vSw * 0.4)}" opacity="${fmt(vOp * 0.5, 3)}" stroke-linecap="round"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 7. agateBrick
// =============================================================================

export interface AgateBrickOptions {
  id?: string;
  /** Centre X as fraction of width (0-1) */
  cx?: number;
  /** Centre Y as fraction of height (0-1) */
  cy?: number;
  /** Number of concentric rings */
  ringCount?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
}

/**
 * Concentric organic ring patterns (like agate stone cross-sections).
 * Slightly irregular concentric closed paths with varying radius per angle,
 * each ring nudged outward with organic distortion.
 */
export function agateBrick(params: BrickParams, options: AgateBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "agate",
    cx = 0.5,
    cy = 0.5,
    ringCount = 8,
    color,
    opacity = 0.4,
    strokeWidth = 1.0,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-agate-${id}`));
  const elems: string[] = [];
  const baseSw = strokeWidth * sc;
  const centerX = cx * width;
  const centerY = cy * height;
  const maxR = scale * 0.12;

  // Pre-generate per-angle distortion offsets (shared across all rings for coherence)
  const angleSteps = 24;
  const baseDistortion: number[] = [];
  for (let a = 0; a < angleSteps; a++) {
    baseDistortion.push((rng() - 0.5) * 2);
  }

  for (let ring = 0; ring < ringCount; ring++) {
    const ringT = (ring + 1) / ringCount;
    const baseR = maxR * ringT;
    const distortionAmt = maxR * 0.08 * (1 + ring * 0.15);

    const pts: Pt[] = [];
    for (let a = 0; a < angleSteps; a++) {
      const angle = (a / angleSteps) * Math.PI * 2;
      // Combine base distortion with per-ring jitter
      const distortion = baseDistortion[a] * distortionAmt + (rng() - 0.5) * distortionAmt * 0.4;
      const r = baseR + distortion;
      pts.push([centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r]);
    }

    const pathD = catmullRomPath(pts, true);
    const ringOp = opacity * (0.4 + rng() * 0.6);
    const ringSw = baseSw * (0.6 + rng() * 0.8);

    elems.push(
      `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${fmt(ringSw)}" opacity="${fmt(ringOp, 3)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 8. myceliumBrick
// =============================================================================

export interface MyceliumBrickOptions {
  id?: string;
  /** Number of seed (origin) points for the network */
  seedPoints?: number;
  /** Average branch length as fraction of max(width, height) */
  branchLength?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
}

/**
 * Root/mycelium branching network growing from multiple seed points.
 * Each seed point generates branching paths that spread outward with
 * organic irregularity, forming a web of thin root-like lines.
 */
export function myceliumBrick(params: BrickParams, options: MyceliumBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "mycelium",
    seedPoints = 6,
    branchLength = 0.04,
    color,
    opacity = 0.35,
    strokeWidth = 0.6,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-mycelium-${id}`));
  const elems: string[] = [];
  const baseSw = strokeWidth * sc;
  const baseLen = branchLength * scale;

  function grow(
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
    sw: number,
    op: number
  ): void {
    if (depth <= 0 || length < 1.5 * sc) return;

    // Generate a wandering path for this segment (3-5 points)
    const segCount = 3 + Math.floor(rng() * 3);
    const pts: Pt[] = [[x, y]];
    let cx = x;
    let cy = y;

    for (let s = 0; s < segCount; s++) {
      const stepAngle = angle + (rng() - 0.5) * 1.2;
      const stepLen = (length / segCount) * (0.6 + rng() * 0.8);
      cx += Math.cos(stepAngle) * stepLen;
      cy += Math.sin(stepAngle) * stepLen;
      pts.push([cx, cy]);
    }

    const pathD = catmullRomPath(pts);
    elems.push(
      `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${fmt(sw)}" opacity="${fmt(op, 3)}" stroke-linecap="round"/>`
    );

    // Branch: 1-3 sub-branches from the tip
    const branchCount = 1 + Math.floor(rng() * 2.5);
    for (let b = 0; b < branchCount; b++) {
      const spread = (rng() - 0.5) * Math.PI * 0.8;
      const newAngle = angle + spread;
      const newLen = length * (0.5 + rng() * 0.3);
      const newSw = sw * (0.65 + rng() * 0.2);
      const newOp = op * (0.7 + rng() * 0.25);
      grow(cx, cy, newAngle, newLen, depth - 1, newSw, newOp);
    }
  }

  for (let s = 0; s < seedPoints; s++) {
    const sx = rng() * width;
    const sy = rng() * height;
    // Radiate in 2-4 directions from each seed
    const directions = 2 + Math.floor(rng() * 3);
    for (let d = 0; d < directions; d++) {
      const angle = (d / directions) * Math.PI * 2 + rng() * 0.5;
      const len = baseLen * (0.7 + rng() * 0.6);
      const sOp = opacity * (0.5 + rng() * 0.5);
      grow(sx, sy, angle, len, 4, baseSw, sOp);
    }
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 9. petalBrick
// =============================================================================

export interface PetalBrickOptions {
  id?: string;
  /** Centre X as fraction of width (0-1) */
  cx?: number;
  /** Centre Y as fraction of height (0-1) */
  cy?: number;
  /** Number of petals (3-12) */
  petalCount?: number;
  /** Petal length as fraction of max(width, height) */
  petalLength?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
}

/**
 * Flower petal radial arrangement. Generates petal shapes (elongated
 * bezier curves) around a centre point, creating a floral motif.
 */
export function petalBrick(params: BrickParams, options: PetalBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "petal",
    cx = 0.5,
    cy = 0.5,
    petalCount = 7,
    petalLength = 0.06,
    color,
    opacity = 0.5,
    strokeWidth = 1.0,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-petal-${id}`));
  const elems: string[] = [];
  const baseSw = strokeWidth * sc;
  const centerX = cx * width;
  const centerY = cy * height;
  const pLen = petalLength * scale;

  for (let p = 0; p < petalCount; p++) {
    const angle = (p / petalCount) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    const len = pLen * (0.7 + rng() * 0.6);
    const petalWidth = len * (0.2 + rng() * 0.2);

    // Petal tip
    const tipX = centerX + Math.cos(angle) * len;
    const tipY = centerY + Math.sin(angle) * len;

    // Perpendicular direction for petal width
    const perpAngle = angle + Math.PI / 2;
    const perpX = Math.cos(perpAngle) * petalWidth;
    const perpY = Math.sin(perpAngle) * petalWidth;

    // Control points for the two sides of the petal (cubic bezier)
    const midFactor = 0.4 + rng() * 0.2;
    const cp1x = centerX + Math.cos(angle) * len * midFactor + perpX;
    const cp1y = centerY + Math.sin(angle) * len * midFactor + perpY;
    const cp2x = centerX + Math.cos(angle) * len * midFactor - perpX;
    const cp2y = centerY + Math.sin(angle) * len * midFactor - perpY;

    // Path: centre -> curve to tip on one side -> curve back to centre on the other
    const petalD = [
      `M ${fmt(centerX)} ${fmt(centerY)}`,
      `C ${fmt(cp1x)} ${fmt(cp1y)} ${fmt(tipX + perpX * 0.3)} ${fmt(tipY + perpY * 0.3)} ${fmt(tipX)} ${fmt(tipY)}`,
      `C ${fmt(tipX - perpX * 0.3)} ${fmt(tipY - perpY * 0.3)} ${fmt(cp2x)} ${fmt(cp2y)} ${fmt(centerX)} ${fmt(centerY)}`,
    ].join(" ");

    const pOp = opacity * (0.5 + rng() * 0.5);

    elems.push(
      `<path d="${petalD}" fill="none" stroke="${color}" stroke-width="${fmt(baseSw)}" opacity="${fmt(pOp, 3)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );

    // Optional central vein line
    if (rng() > 0.3) {
      elems.push(
        `<line x1="${fmt(centerX)}" y1="${fmt(centerY)}" x2="${fmt(tipX)}" y2="${fmt(tipY)}" stroke="${color}" stroke-width="${fmt(baseSw * 0.35)}" opacity="${fmt(pOp * 0.4, 3)}" stroke-linecap="round"/>`
      );
    }
  }

  // Small centre circle
  elems.push(
    `<circle cx="${fmt(centerX)}" cy="${fmt(centerY)}" r="${fmt(pLen * 0.08)}" fill="${color}" opacity="${fmt(opacity * 0.6, 3)}"/>`
  );

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 10. driftTrailBrick
// =============================================================================

export interface DriftTrailBrickOptions {
  id?: string;
  /** Number of drift trails */
  trailCount?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
}

/**
 * Particle drift trails. Curved paths that fade in opacity along their
 * length, simulating particles drifting through space. Each trail uses
 * a per-path linear gradient for the fade effect.
 */
export function driftTrailBrick(params: BrickParams, options: DriftTrailBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const { id = "drift", trailCount = 20, color, opacity = 0.4, strokeWidth = 1.2 } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-drift-${id}`));
  const defs: string[] = [];
  const elems: string[] = [];
  const baseSw = strokeWidth * sc;

  for (let t = 0; t < trailCount; t++) {
    // Random start point
    let px = rng() * width;
    let py = rng() * height;
    const driftAngle = rng() * Math.PI * 2;
    const trailLen = scale * (0.03 + rng() * 0.06);
    const steps = 6 + Math.floor(rng() * 6);
    const pts: Pt[] = [[px, py]];

    for (let s = 0; s < steps; s++) {
      const stepAngle = driftAngle + (rng() - 0.5) * 1.5;
      const stepLen = (trailLen / steps) * (0.5 + rng() * 1.0);
      px += Math.cos(stepAngle) * stepLen;
      py += Math.sin(stepAngle) * stepLen;
      pts.push([px, py]);
    }

    const pathD = catmullRomPath(pts);
    const endX = pts[pts.length - 1][0];
    const endY = pts[pts.length - 1][1];
    const startX = pts[0][0];
    const startY = pts[0][1];
    const tOp = opacity * (0.4 + rng() * 0.6);
    const tSw = baseSw * (0.5 + rng() * 1.0);

    // Per-trail gradient: opaque at start -> transparent at end
    const gradId = `${id}-g${t}`;
    defs.push(
      `<linearGradient id="${gradId}" x1="${fmt(startX)}" y1="${fmt(startY)}" x2="${fmt(endX)}" y2="${fmt(endY)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${fmt(tOp, 3)}"/>
  <stop offset="60%" stop-color="${color}" stop-opacity="${fmt(tOp * 0.4, 3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`
    );

    elems.push(
      `<path d="${pathD}" fill="none" stroke="url(#${gradId})" stroke-width="${fmt(tSw)}" stroke-linecap="round"/>`
    );

    // Bright head dot at the start of the trail
    const headR = tSw * 1.5;
    elems.push(
      `<circle cx="${fmt(startX)}" cy="${fmt(startY)}" r="${fmt(headR)}" fill="${color}" opacity="${fmt(tOp * 0.7, 3)}"/>`
    );
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 11. smokeWispBrick
// =============================================================================

export interface SmokeWispBrickOptions {
  id?: string;
  /** Number of smoke wisps */
  wispCount?: number;
  color: string;
  opacity?: number;
  /** Maximum stroke width -- wisps vary from thin to this value */
  maxWidth?: number;
}

/**
 * Thin wisps of smoke. Multiple parallel bezier curves with varying
 * widths create the illusion of smoke tendrils curling upward.
 * Each wisp is a cluster of 2-4 closely-spaced paths.
 */
export function smokeWispBrick(params: BrickParams, options: SmokeWispBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const { id = "smoke", wispCount = 8, color, opacity = 0.25, maxWidth = 3.0 } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-smoke-${id}`));
  const defs: string[] = [];
  const elems: string[] = [];

  // Soft blur for smoke diffusion
  const blurId = `${id}-blur`;
  defs.push(
    `<filter id="${blurId}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${fmt(2.0 * sc)}"/></filter>`
  );

  for (let w = 0; w < wispCount; w++) {
    // Smoke base point (lower portion of canvas)
    const baseX = rng() * width;
    const baseY = height * (0.5 + rng() * 0.45);
    const riseHeight = scale * (0.08 + rng() * 0.12);
    const wispOp = opacity * (0.4 + rng() * 0.6);

    // Generate the core wisp path (rising + curling)
    const steps = 8 + Math.floor(rng() * 6);
    const corePts: Pt[] = [[baseX, baseY]];
    let cx = baseX;
    let cy = baseY;

    for (let s = 0; s < steps; s++) {
      const t = (s + 1) / steps;
      // Upward drift with increasing horizontal wander
      cx += (rng() - 0.5) * riseHeight * 0.15 * (1 + t);
      cy -= (riseHeight / steps) * (0.6 + rng() * 0.8);
      corePts.push([cx, cy]);
    }

    // Render 2-4 parallel paths per wisp for volume
    const strands = 2 + Math.floor(rng() * 3);
    for (let s = 0; s < strands; s++) {
      const offsetScale = (s - (strands - 1) / 2) * maxWidth * sc * 1.5;
      const strandPts: Pt[] = corePts.map((p, i) => {
        // Offset increases along the wisp (smoke expands as it rises)
        const expansion = (i / corePts.length) * 1.5 + 0.5;
        return [
          p[0] + offsetScale * expansion + (rng() - 0.5) * maxWidth * sc * 0.3,
          p[1] + (rng() - 0.5) * maxWidth * sc * 0.2,
        ] as Pt;
      });

      const pathD = catmullRomPath(strandPts);
      // Width varies: thin at base, thicker in the middle, thin at top
      const strandSw = maxWidth * sc * (0.3 + rng() * 0.5);
      const strandOp = wispOp * (0.4 + rng() * 0.6);

      // Blurred outer pass
      elems.push(
        `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${fmt(strandSw * 2.5)}" opacity="${fmt(strandOp * 0.35, 3)}" stroke-linecap="round" filter="url(#${blurId})"/>`
      );
      // Core strand
      elems.push(
        `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${fmt(strandSw)}" opacity="${fmt(strandOp, 3)}" stroke-linecap="round"/>`
      );
    }
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

// =============================================================================
// 12. icecrackBrick
// =============================================================================

export interface IcecrackBrickOptions {
  id?: string;
  /** Number of initial crack origins */
  crackCount?: number;
  /** Probability that a crack segment spawns a branch (0-1) */
  branchProbability?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
}

/**
 * Ice crack patterns. Starts from random points and generates irregular
 * fracture lines that branch, mimicking cracked ice or glass.
 * Cracks are straight segments with sharp angle changes (not smooth curves).
 */
export function icecrackBrick(params: BrickParams, options: IcecrackBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 2160;
  const {
    id = "icecrack",
    crackCount = 6,
    branchProbability = 0.35,
    color,
    opacity = 0.4,
    strokeWidth = 1.0,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-icecrack-${id}`));
  const elems: string[] = [];
  const baseSw = strokeWidth * sc;

  function fracture(
    x: number,
    y: number,
    angle: number,
    segLen: number,
    depth: number,
    sw: number,
    op: number
  ): void {
    if (depth <= 0 || segLen < 1.5 * sc) return;
    // Crack propagates as a series of straight segments with jitter
    const segments = 4 + Math.floor(rng() * 6);
    let cx = x;
    let cy = y;
    let currentAngle = angle;
    const pathParts: string[] = [`M ${fmt(cx)} ${fmt(cy)}`];

    for (let s = 0; s < segments; s++) {
      // Sharp angular deviation (ice fractures are jagged, not smooth)
      currentAngle += (rng() - 0.5) * Math.PI * 0.6;
      const len = segLen * (0.5 + rng() * 1.0);
      const nx = cx + Math.cos(currentAngle) * len;
      const ny = cy + Math.sin(currentAngle) * len;
      pathParts.push(`L ${fmt(nx)} ${fmt(ny)}`);

      // Possible branch at this segment
      if (rng() < branchProbability && depth > 1) {
        const branchAngle =
          currentAngle + (rng() > 0.5 ? 1 : -1) * (Math.PI * 0.2 + rng() * Math.PI * 0.4);
        const branchLen = segLen * (0.4 + rng() * 0.3);
        const branchSw = sw * (0.5 + rng() * 0.3);
        const branchOp = op * (0.6 + rng() * 0.3);
        fracture(nx, ny, branchAngle, branchLen, depth - 1, branchSw, branchOp);
      }

      cx = nx;
      cy = ny;
    }

    elems.push(
      `<path d="${pathParts.join(" ")}" fill="none" stroke="${color}" stroke-width="${fmt(sw)}" opacity="${fmt(op, 3)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  for (let c = 0; c < crackCount; c++) {
    const startX = rng() * width;
    const startY = rng() * height;
    const startAngle = rng() * Math.PI * 2;
    const segLen = scale * (0.015 + rng() * 0.015);
    const cOp = opacity * (0.5 + rng() * 0.5);
    fracture(startX, startY, startAngle, segLen, 3, baseSw, cOp);
  }

  return {
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}
