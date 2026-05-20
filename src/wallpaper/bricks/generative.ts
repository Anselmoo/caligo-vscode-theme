/**
 * Generative bricks — geometric and procedural art primitives.
 * Grid, concentric rings, flow fields, moiré patterns, and more.
 */
import { Delaunay } from "d3-delaunay";
import { createNoise2D } from "simplex-noise";
import type { BrickOutput, BrickParams } from "../types.js";

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────

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

// ─── Grid Brick ──────────────────────────────────────────────────────────────

export interface GridBrickOptions {
  id?: string;
  /** Vanishing point X (0-1) */
  cx?: number;
  /** Vanishing point Y (0-1) */
  cy?: number;
  /** Number of horizontal lines */
  hLines?: number;
  /** Number of vertical lines */
  vLines?: number;
  color: string;
  opacity?: number;
  /** Perspective convergence strength (0 = flat grid, 1 = strong perspective) */
  perspectiveStrength?: number;
  strokeWidth?: number;
}

export function gridBrick(params: BrickParams, options: GridBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const {
    cx = 0.5,
    cy = 0.45,
    hLines = 20,
    vLines = 30,
    color,
    opacity = 0.08,
    perspectiveStrength = 0.6,
    strokeWidth = 0.8,
    id = "grid",
  } = options;

  const vcx = cx * width;
  const vcy = cy * height;
  const sw = ((strokeWidth * Math.max(width, height)) / 2160).toFixed(1);
  const lines: string[] = [];

  for (let i = 0; i < hLines; i++) {
    const t = i / (hLines - 1);
    const baseY = t * height;
    const y = baseY + (vcy - baseY) * perspectiveStrength * (1 - t) * 0.3;
    const shrink = 1 - perspectiveStrength * (1 - t) * 0.4;
    const x1 = vcx - vcx * shrink;
    const x2 = vcx + (width - vcx) * shrink;
    const a = (opacity * (0.3 + 0.7 * t)).toFixed(3);
    lines.push(
      `<line x1="${x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="${sw}" opacity="${a}"/>`
    );
  }

  for (let i = 0; i < vLines; i++) {
    const t = i / (vLines - 1);
    const baseX = t * width;
    const topX = vcx + (baseX - vcx) * (1 - perspectiveStrength * 0.7);
    const a = (opacity * (0.4 + 0.6 * (1 - Math.abs(t - 0.5) * 2))).toFixed(3);
    lines.push(
      `<line x1="${baseX.toFixed(1)}" y1="${height.toFixed(1)}" x2="${topX.toFixed(1)}" y2="0" stroke="${color}" stroke-width="${sw}" opacity="${a}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${lines.join("")}</g>`,
  };
}

// ─── Concentric Rings Brick ──────────────────────────────────────────────────

export interface ConcentricRingsBrickOptions {
  id?: string;
  cx?: number;
  cy?: number;
  /** Minimum radius (fraction of scale) */
  minRadius?: number;
  /** Maximum radius (fraction of scale) */
  maxRadius?: number;
  /** Number of rings */
  count?: number;
  color: string;
  maxOpacity?: number;
  strokeWidth?: number;
  /** Add slight radius jitter from PRNG */
  jitter?: number;
}

export function concentricRingsBrick(
  params: BrickParams,
  options: ConcentricRingsBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    cx = 0.5,
    cy = 0.5,
    minRadius = 0.03,
    maxRadius = 0.35,
    count = 12,
    color,
    maxOpacity = 0.15,
    strokeWidth = 1,
    jitter = 0.005,
    id = "rings",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const pcx = (cx * width).toFixed(1);
  const pcy = (cy * height).toFixed(1);
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const circles: string[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const baseR = minRadius + t * (maxRadius - minRadius);
    const r = (baseR + (rng() - 0.5) * jitter) * scale;
    const a = (maxOpacity * (1 - t * 0.7)).toFixed(3);
    circles.push(
      `<circle cx="${pcx}" cy="${pcy}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${a}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${circles.join("")}</g>`,
  };
}

// ─── Flow Field Brick ────────────────────────────────────────────────────────

export interface FlowFieldBrickOptions {
  id?: string;
  /** Grid columns */
  cols?: number;
  /** Grid rows */
  rows?: number;
  /** Segment length as fraction of scale */
  segmentLength?: number;
  /** Noise frequency */
  frequency?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  /** Region bounds (fractions 0-1) */
  region?: { x: number; y: number; w: number; h: number };
}

export function flowFieldBrick(params: BrickParams, options: FlowFieldBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    cols = 60,
    rows = 38,
    segmentLength = 0.012,
    frequency = 0.003,
    color,
    opacity = 0.1,
    strokeWidth = 0.8,
    region = { x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
    id = "flow",
  } = options;

  const noise = createNoise2D(() => {
    const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
    return rng();
  });

  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const len = segmentLength * scale;
  const lines: string[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (region.x + (c / (cols - 1)) * region.w) * width;
      const y = (region.y + (r / (rows - 1)) * region.h) * height;
      const angle = noise(x * frequency, y * frequency) * Math.PI * 2;
      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;
      lines.push(
        `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${lines.join("")}</g>`,
  };
}

// ─── Moiré Pattern Brick ─────────────────────────────────────────────────────

export interface MoirePatternBrickOptions {
  id?: string;
  /** First center (fractions 0-1) */
  cx1?: number;
  cy1?: number;
  /** Second center (fractions 0-1) */
  cx2?: number;
  cy2?: number;
  /** Rings per center */
  ringCount?: number;
  /** Spacing between rings as fraction of scale */
  spacing?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
}

export function moirePatternBrick(
  params: BrickParams,
  options: MoirePatternBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    cx1 = 0.4,
    cy1 = 0.45,
    cx2 = 0.6,
    cy2 = 0.55,
    ringCount = 40,
    spacing = 0.008,
    color,
    opacity = 0.08,
    strokeWidth = 0.6,
    id = "moire",
  } = options;

  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const circles: string[] = [];

  for (let i = 1; i <= ringCount; i++) {
    const r1 = (i * spacing * scale).toFixed(1);
    circles.push(
      `<circle cx="${(cx1 * width).toFixed(1)}" cy="${(cy1 * height).toFixed(1)}" r="${r1}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/>`
    );
  }

  const spacing2 = spacing * 1.05;
  for (let i = 1; i <= ringCount; i++) {
    const r2 = (i * spacing2 * scale).toFixed(1);
    circles.push(
      `<circle cx="${(cx2 * width).toFixed(1)}" cy="${(cy2 * height).toFixed(1)}" r="${r2}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${circles.join("")}</g>`,
  };
}

// ─── Fracture Brick ─────────────────────────────────────────────────────────

export interface FractureBrickOptions {
  id?: string;
  cx?: number;
  cy?: number;
  shardCount?: number;
  displacement?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  glowColor?: string;
  glowOpacity?: number;
}

export function fractureBrick(params: BrickParams, options: FractureBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const {
    cx = 0.5,
    cy = 0.5,
    shardCount = 40,
    displacement = 0.008,
    color,
    opacity = 0.08,
    strokeWidth = 0.8,
    glowColor,
    glowOpacity = 0.06,
    id = "fracture",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const scale = Math.max(width, height);
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);

  const pts = new Float64Array(shardCount * 2);
  for (let i = 0; i < shardCount; i++) {
    pts[i * 2] = rng() * width;
    pts[i * 2 + 1] = rng() * height;
  }

  const delaunay = new Delaunay(pts);
  const pathData = delaunay.render();
  const elems: string[] = [];
  const defs: string[] = [];

  if (glowColor) {
    const gfId = `${id}-gf`;
    defs.push(
      `<filter id="${gfId}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(scale * 0.002).toFixed(1)}"/></filter>`
    );
    if (pathData) {
      elems.push(
        `<path d="${pathData}" fill="none" stroke="${glowColor}" stroke-width="${((strokeWidth * 2 * scale) / 2160).toFixed(1)}" opacity="${glowOpacity}" filter="url(#${gfId})"/>`
      );
    }
  }

  if (pathData) {
    const disp = displacement * scale;
    const triangles = delaunay.triangles;
    for (let i = 0; i < triangles.length; i += 3) {
      const tx = (rng() - 0.5) * disp;
      const ty = (rng() - 0.5) * disp;
      const p0x = pts[triangles[i] * 2];
      const p0y = pts[triangles[i] * 2 + 1];
      const p1x = pts[triangles[i + 1] * 2];
      const p1y = pts[triangles[i + 1] * 2 + 1];
      const p2x = pts[triangles[i + 2] * 2];
      const p2y = pts[triangles[i + 2] * 2 + 1];
      const triCx = (p0x + p1x + p2x) / 3;
      const triCy = (p0y + p1y + p2y) / 3;
      const dist = Math.hypot(triCx - cx * width, triCy - cy * height) / scale;
      const localOp = (opacity * Math.max(0.2, 1 - dist * 2)).toFixed(3);
      elems.push(
        `<polygon points="${(p0x + tx).toFixed(1)},${(p0y + ty).toFixed(1)} ${(p1x + tx).toFixed(1)},${(p1y + ty).toFixed(1)} ${(p2x + tx).toFixed(1)},${(p2y + ty).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${localOp}"/>`
      );
    }
  }

  return {
    defs: defs.length ? defs.join("") : undefined,
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Penrose Brick ──────────────────────────────────────────────────────────

export interface PenroseBrickOptions {
  id?: string;
  cx?: number;
  cy?: number;
  radius?: number;
  depth?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  accentColor?: string;
  accentOpacity?: number;
}

export function penroseBrick(params: BrickParams, options: PenroseBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    cx = 0.5,
    cy = 0.5,
    radius = 0.35,
    depth = 4,
    color,
    opacity = 0.08,
    strokeWidth = 0.7,
    accentColor,
    accentOpacity = 0.12,
    id = "penrose",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const pcx = cx * width;
  const pcy = cy * height;
  const pr = radius * scale;
  const phi = (1 + Math.sqrt(5)) / 2;

  type Tri = {
    type: 0 | 1;
    ax: number;
    ay: number;
    bx: number;
    by: number;
    cx: number;
    cy: number;
  };

  let triangles: Tri[] = [];
  for (let i = 0; i < 10; i++) {
    const a1 = ((2 * i - 1) * Math.PI) / 10;
    const a2 = ((2 * i + 1) * Math.PI) / 10;
    triangles.push({
      type: 0,
      ax: pcx,
      ay: pcy,
      bx: pcx + Math.cos(a1) * pr,
      by: pcy + Math.sin(a1) * pr,
      cx: pcx + Math.cos(a2) * pr,
      cy: pcy + Math.sin(a2) * pr,
    });
  }

  for (let d = 0; d < depth; d++) {
    const next: Tri[] = [];
    for (const t of triangles) {
      if (t.type === 0) {
        const px = t.ax + (t.bx - t.ax) / phi;
        const py = t.ay + (t.by - t.ay) / phi;
        next.push({ type: 0, ax: t.cx, ay: t.cy, bx: px, by: py, cx: t.bx, cy: t.by });
        next.push({ type: 1, ax: px, ay: py, bx: t.cx, by: t.cy, cx: t.ax, cy: t.ay });
      } else {
        const qx = t.bx + (t.ax - t.bx) / phi;
        const qy = t.by + (t.ay - t.by) / phi;
        const rx = t.bx + (t.cx - t.bx) / phi;
        const ry = t.by + (t.cy - t.by) / phi;
        next.push({ type: 1, ax: rx, ay: ry, bx: t.cx, by: t.cy, cx: t.ax, cy: t.ay });
        next.push({ type: 1, ax: qx, ay: qy, bx: rx, by: ry, cx: t.bx, cy: t.by });
        next.push({ type: 0, ax: rx, ay: ry, bx: qx, by: qy, cx: t.ax, cy: t.ay });
      }
    }
    triangles = next;
  }

  const elems: string[] = [];
  for (const t of triangles) {
    const useAccent = accentColor && rng() < 0.15;
    const c = useAccent ? accentColor : color;
    const o = useAccent ? accentOpacity : opacity;
    elems.push(
      `<polygon points="${t.ax.toFixed(1)},${t.ay.toFixed(1)} ${t.bx.toFixed(1)},${t.by.toFixed(1)} ${t.cx.toFixed(1)},${t.cy.toFixed(1)}" fill="none" stroke="${c}" stroke-width="${sw}" opacity="${o}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Erosion Brick ──────────────────────────────────────────────────────────

export interface ErosionBrickOptions {
  id?: string;
  shape?: "circle" | "rect";
  cx?: number;
  cy?: number;
  size?: number;
  color: string;
  opacity?: number;
  /** Turbulence frequency for displacement texture */
  erosionFrequency?: number;
  octaves?: number;
  /** Displacement intensity (pixels at scale=2160) */
  displacementScale?: number;
  seed?: number;
}

export function erosionBrick(params: BrickParams, options: ErosionBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    shape = "circle",
    cx = 0.5,
    cy = 0.5,
    size = 0.25,
    color,
    opacity = 0.12,
    erosionFrequency = 0.004,
    octaves = 3,
    displacementScale = 12,
    seed: optSeed,
    id = "erosion",
  } = options;

  const s = optSeed ?? hashStr(`${seedId}-${harmonyMode}-${id}`) % 999;
  const filterId = `${id}-erode`;
  const pcx = (cx * width).toFixed(1);
  const pcy = (cy * height).toFixed(1);
  const ps = (size * scale).toFixed(1);
  const ds = ((displacementScale * scale) / 2160).toFixed(1);

  const defs = `<filter id="${filterId}" x="-15%" y="-15%" width="130%" height="130%">
  <feTurbulence type="fractalNoise" baseFrequency="${erosionFrequency}" numOctaves="${octaves}" seed="${s}" result="turb"/>
  <feDisplacementMap in="SourceGraphic" in2="turb" scale="${ds}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;

  let shapeEl: string;
  if (shape === "circle") {
    shapeEl = `<circle cx="${pcx}" cy="${pcy}" r="${ps}" fill="${color}" opacity="${opacity}" filter="url(#${filterId})"/>`;
  } else {
    const rx = (cx * width - size * scale).toFixed(1);
    const ry = (cy * height - size * scale).toFixed(1);
    const rw = (size * scale * 2).toFixed(1);
    const rh = (size * scale * 2).toFixed(1);
    shapeEl = `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${color}" opacity="${opacity}" filter="url(#${filterId})"/>`;
  }

  return {
    defs,
    elements: `<g id="${id}">${shapeEl}</g>`,
  };
}

// ─── Cipher Brick ───────────────────────────────────────────────────────────

export interface CipherBrickOptions {
  id?: string;
  columns?: number;
  rows?: number;
  cellSize?: number;
  color: string;
  accentColor?: string;
  opacity?: number;
  strokeWidth?: number;
  offsetX?: number;
  offsetY?: number;
}

export function cipherBrick(params: BrickParams, options: CipherBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    columns = 12,
    rows = 20,
    cellSize = 0.018,
    color,
    accentColor,
    opacity = 0.08,
    strokeWidth = 0.7,
    offsetX = 0.15,
    offsetY = 0.1,
    id = "cipher",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const cs = cellSize * scale;
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const swThin = ((strokeWidth * 0.5 * scale) / 2160).toFixed(1);
  const ox = offsetX * width;
  const oy = offsetY * height;
  const elems: string[] = [];

  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < rows; r++) {
      if (rng() > 0.55) continue;
      const x = ox + c * cs * 1.8;
      const y = oy + r * cs * 1.4;
      if (x > width * 0.9 || y > height * 0.9) continue;
      const glyph = Math.floor(rng() * 10);
      const a = (opacity * (0.4 + rng() * 0.6)).toFixed(3);
      const useAccent = accentColor && rng() < 0.12;
      const col = useAccent ? accentColor : color;
      const half = cs * 0.4;
      const quarter = cs * 0.2;
      const third = cs * 0.13;
      switch (glyph) {
        case 0:
          elems.push(
            `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${half.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${sw}" opacity="${a}"/>`
          );
          break;
        case 1:
          elems.push(
            `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${third.toFixed(1)}" fill="${col}" opacity="${a}"/>`
          );
          break;
        case 2:
          elems.push(
            `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${half.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${swThin}" opacity="${a}"/>`
          );
          elems.push(
            `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${quarter.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${swThin}" opacity="${a}"/>`
          );
          break;
        case 3: {
          const startAngle = rng() * Math.PI * 2;
          const sweep = Math.PI * (0.5 + rng());
          const x1 = x + Math.cos(startAngle) * half;
          const y1 = y + Math.sin(startAngle) * half;
          const x2 = x + Math.cos(startAngle + sweep) * half;
          const y2 = y + Math.sin(startAngle + sweep) * half;
          const large = sweep > Math.PI ? 1 : 0;
          elems.push(
            `<path d="M${x1.toFixed(1)},${y1.toFixed(1)}A${half.toFixed(1)},${half.toFixed(1)} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${sw}" opacity="${a}" stroke-linecap="round"/>`
          );
          break;
        }
        case 4:
          elems.push(
            `<polygon points="${x.toFixed(1)},${(y - half).toFixed(1)} ${(x + half).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + half).toFixed(1)} ${(x - half).toFixed(1)},${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${swThin}" opacity="${a}"/>`
          );
          break;
        case 5: {
          const sides = 3 + Math.floor(rng() * 4);
          const pts: string[] = [];
          for (let i = 0; i < sides; i++) {
            const ang = (Math.PI * 2 * i) / sides - Math.PI / 2;
            pts.push(
              `${(x + Math.cos(ang) * half).toFixed(1)},${(y + Math.sin(ang) * half).toFixed(1)}`
            );
          }
          elems.push(
            `<polygon points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="${swThin}" opacity="${a}"/>`
          );
          break;
        }
        case 6:
          elems.push(
            `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${half.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${swThin}" opacity="${a}"/>`
          );
          elems.push(
            `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${third.toFixed(1)}" fill="${col}" opacity="${a}"/>`
          );
          break;
        case 7: {
          const dotCount = 2 + Math.floor(rng() * 3);
          for (let d = 0; d < dotCount; d++) {
            const ang = (Math.PI * 2 * d) / dotCount;
            const dx = x + Math.cos(ang) * quarter;
            const dy = y + Math.sin(ang) * quarter;
            elems.push(
              `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${(third * 0.6).toFixed(1)}" fill="${col}" opacity="${a}"/>`
            );
          }
          break;
        }
        case 8: {
          const startAng = rng() * Math.PI * 2;
          const arcLen = Math.PI * (0.3 + rng() * 0.4);
          for (let ring = 0; ring < 2; ring++) {
            const rr = quarter + ring * quarter;
            const sx = x + Math.cos(startAng) * rr;
            const sy = y + Math.sin(startAng) * rr;
            const ex = x + Math.cos(startAng + arcLen) * rr;
            const ey = y + Math.sin(startAng + arcLen) * rr;
            elems.push(
              `<path d="M${sx.toFixed(1)},${sy.toFixed(1)}A${rr.toFixed(1)},${rr.toFixed(1)} 0 0 1 ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${swThin}" opacity="${a}" stroke-linecap="round"/>`
            );
          }
          break;
        }
        default:
          elems.push(
            `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(half * 0.8).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${swThin}" stroke-dasharray="${quarter.toFixed(1)} ${third.toFixed(1)}" opacity="${a}"/>`
          );
          break;
      }
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Attractor Brick ────────────────────────────────────────────────────────

export interface AttractorBrickOptions {
  id?: string;
  type?: "clifford" | "dejong";
  iterations?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  plotScale?: number;
  cx?: number;
  cy?: number;
}

export function attractorBrick(params: BrickParams, options: AttractorBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    type = "clifford",
    iterations = 8000,
    color,
    opacity = 0.06,
    strokeWidth = 0.5,
    plotScale = 0.12,
    cx = 0.5,
    cy = 0.5,
    id = "attractor",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const a = -1.5 + rng() * 3;
  const b = -1.5 + rng() * 3;
  const c = -1.5 + rng() * 3;
  const d = -1.5 + rng() * 3;
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const ps = plotScale * scale;
  const pcx = cx * width;
  const pcy = cy * height;

  let x = 0.1;
  let y = 0.1;
  const points: string[] = [];

  for (let i = 0; i < iterations; i++) {
    let nx: number;
    let ny: number;
    if (type === "clifford") {
      nx = Math.sin(a * y) + c * Math.cos(a * x);
      ny = Math.sin(b * x) + d * Math.cos(b * y);
    } else {
      nx = Math.sin(a * y) - Math.cos(b * x);
      ny = Math.sin(c * x) - Math.cos(d * y);
    }
    x = nx;
    y = ny;
    const px = pcx + x * ps;
    const py = pcy + y * ps;
    if (px >= 0 && px <= width && py >= 0 && py <= height) {
      points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
  }

  if (points.length < 2) {
    return { elements: `<g id="${id}"/>` };
  }

  const pathData = `M ${points[0]} ${points
    .slice(1)
    .map(p => `L ${p}`)
    .join(" ")}`;

  return {
    elements: `<g id="${id}"><path d="${pathData}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/></g>`,
  };
}

// ─── Convolution Brick ──────────────────────────────────────────────────────

export interface ConvolutionBrickOptions {
  id?: string;
  pointCount?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  maxDist?: number;
  nodeRadius?: number;
  nodeOpacity?: number;
}

export function convolutionBrick(
  params: BrickParams,
  options: ConvolutionBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    pointCount = 60,
    color,
    opacity = 0.06,
    strokeWidth = 0.6,
    maxDist = 0.06,
    nodeRadius = 0.002,
    nodeOpacity = 0.15,
    id = "convolution",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const md = maxDist * scale;
  const nr = (nodeRadius * scale).toFixed(1);

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < pointCount; i++) {
    pts.push({ x: rng() * width, y: rng() * height });
  }

  const elems: string[] = [];

  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < md) {
        const a = (opacity * (1 - dist / md)).toFixed(3);
        elems.push(
          `<line x1="${pts[i].x.toFixed(1)}" y1="${pts[i].y.toFixed(1)}" x2="${pts[j].x.toFixed(1)}" y2="${pts[j].y.toFixed(1)}" stroke="${color}" stroke-width="${sw}" opacity="${a}"/>`
        );
      }
    }
  }

  for (const p of pts) {
    elems.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${nr}" fill="${color}" opacity="${nodeOpacity}"/>`
    );
  }

  const filterId = `${id}-emboss`;
  const defs = `<filter id="${filterId}" x="-5%" y="-5%" width="110%" height="110%">
  <feConvolveMatrix order="3" kernelMatrix="-2 -1 0 -1 1 1 0 1 2" preserveAlpha="true"/>
</filter>`;

  return {
    defs,
    elements: `<g id="${id}" filter="url(#${filterId})">${elems.join("")}</g>`,
  };
}

// ─── Kaleidoscope Brick ─────────────────────────────────────────────────────

export interface KaleidoscopeBrickOptions {
  id?: string;
  cx?: number;
  cy?: number;
  folds?: number;
  radius?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  complexity?: number;
}

export function kaleidoscopeBrick(
  params: BrickParams,
  options: KaleidoscopeBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    cx = 0.5,
    cy = 0.5,
    folds = 6,
    radius = 0.2,
    color,
    opacity = 0.08,
    strokeWidth = 0.7,
    complexity = 8,
    id = "kaleidoscope",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const pcx = cx * width;
  const pcy = cy * height;
  const pr = radius * scale;
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);

  const baseLines: string[] = [];
  for (let i = 0; i < complexity; i++) {
    const angle = (rng() * Math.PI) / folds;
    const r1 = rng() * pr * 0.3;
    const r2 = rng() * pr;
    const x1 = Math.cos(angle) * r1;
    const y1 = Math.sin(angle) * r1;
    const x2 = Math.cos(angle) * r2;
    const y2 = Math.sin(angle) * r2;
    const a = (opacity * (0.4 + rng() * 0.6)).toFixed(3);
    baseLines.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${sw}" opacity="${a}"/>`
    );
  }

  const fragmentId = `${id}-frag`;
  const defs = `<g id="${fragmentId}">${baseLines.join("")}</g>`;

  const uses: string[] = [];
  for (let i = 0; i < folds; i++) {
    const angle = (360 / folds) * i;
    uses.push(`<use href="#${fragmentId}" transform="rotate(${angle})"/>`);
    uses.push(`<use href="#${fragmentId}" transform="rotate(${angle}) scale(1,-1)"/>`);
  }

  return {
    defs,
    elements: `<g id="${id}" transform="translate(${pcx.toFixed(1)},${pcy.toFixed(1)})">${uses.join("")}</g>`,
  };
}

// ─── Topology Brick ─────────────────────────────────────────────────────────

export interface TopologyBrickOptions {
  id?: string;
  levels?: number;
  frequency?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  resolution?: number;
  accentColor?: string;
  accentLevel?: number;
}

export function topologyBrick(params: BrickParams, options: TopologyBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    levels = 10,
    frequency = 0.002,
    color,
    opacity = 0.08,
    strokeWidth = 0.7,
    resolution = 120,
    accentColor,
    accentLevel = 6,
    id = "topology",
  } = options;

  const noise = createNoise2D(() => {
    const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
    return rng();
  });

  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const cols = resolution;
  const rows = Math.round(resolution * (height / width));
  const cellW = width / cols;
  const cellH = height / rows;

  const field: number[][] = [];
  for (let r = 0; r <= rows; r++) {
    const row: number[] = [];
    for (let c = 0; c <= cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      row.push(noise(x * frequency, y * frequency) * 0.5 + 0.5);
    }
    field.push(row);
  }

  const elems: string[] = [];

  for (let lvl = 1; lvl < levels; lvl++) {
    const threshold = lvl / levels;
    const isAccent = accentColor && lvl === accentLevel;
    const c = isAccent ? accentColor : color;
    const a = isAccent ? opacity * 1.5 : opacity;
    const segments: string[] = [];

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const v00 = field[r][col];
        const v10 = field[r][col + 1];
        const v01 = field[r + 1][col];
        const v11 = field[r + 1][col + 1];

        const idx =
          (v00 >= threshold ? 8 : 0) |
          (v10 >= threshold ? 4 : 0) |
          (v11 >= threshold ? 2 : 0) |
          (v01 >= threshold ? 1 : 0);
        if (idx === 0 || idx === 15) continue;

        const x = col * cellW;
        const y = r * cellH;

        const interp = (va: number, vb: number) => {
          const d = vb - va;
          return d === 0 ? 0.5 : (threshold - va) / d;
        };

        const top = { x: x + interp(v00, v10) * cellW, y };
        const right = { x: x + cellW, y: y + interp(v10, v11) * cellH };
        const bottom = { x: x + interp(v01, v11) * cellW, y: y + cellH };
        const left = { x, y: y + interp(v00, v01) * cellH };

        const addSeg = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
          segments.push(
            `M${p1.x.toFixed(1)},${p1.y.toFixed(1)}L${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
          );
        };

        switch (idx) {
          case 1:
          case 14:
            addSeg(left, bottom);
            break;
          case 2:
          case 13:
            addSeg(bottom, right);
            break;
          case 3:
          case 12:
            addSeg(left, right);
            break;
          case 4:
          case 11:
            addSeg(top, right);
            break;
          case 5:
            addSeg(top, left);
            addSeg(bottom, right);
            break;
          case 6:
          case 9:
            addSeg(top, bottom);
            break;
          case 7:
          case 8:
            addSeg(top, left);
            break;
          case 10:
            addSeg(top, right);
            addSeg(left, bottom);
            break;
        }
      }
    }

    if (segments.length) {
      elems.push(
        `<path d="${segments.join("")}" fill="none" stroke="${c}" stroke-width="${sw}" opacity="${a.toFixed(3)}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}
