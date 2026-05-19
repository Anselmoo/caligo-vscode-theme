/**
 * Pattern bricks -- geometric / tiling SVG primitives.
 * Hex grids, dot matrices, cross-hatch, chevrons, spirals, lattices, and more.
 * Every function is a pure brick: (BrickParams, options) -> BrickOutput.
 */
import type { BrickOutput, BrickParams } from "../types.js";

// ─── Seeded PRNG (mirrors shapes.ts / particles.ts helpers) ─────────────────

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

// ─── 1. Hex Grid ─────────────────────────────────────────────────────────────

export interface HexGridBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Hex cell radius in design units (scaled to canvas). */
  cellSize?: number;
  strokeWidth?: number;
  /** Fractional region: [x, y, w, h] each 0-1. */
  region?: [number, number, number, number];
}

export function hexGridBrick(params: BrickParams, options: HexGridBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "hex-grid",
    color,
    opacity = 0.6,
    cellSize = 60,
    strokeWidth = 1,
    region = [0, 0, 1, 1],
  } = options;

  const r = (cellSize * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const rx = region[0] * width;
  const ry = region[1] * height;
  const rw = region[2] * width;
  const rh = region[3] * height;

  const elems: string[] = [];
  const dx = r * Math.sqrt(3);
  const dy = r * 1.5;

  for (let row = 0; row * dy <= rh + dy; row++) {
    const offsetX = row % 2 === 1 ? dx / 2 : 0;
    for (let col = 0; col * dx <= rw + dx; col++) {
      const cx = rx + col * dx + offsetX;
      const cy = ry + row * dy;
      // Build hexagon path
      const pts: string[] = [];
      for (let k = 0; k < 6; k++) {
        const angle = (Math.PI / 3) * k - Math.PI / 6;
        const hx = cx + r * Math.cos(angle);
        const hy = cy + r * Math.sin(angle);
        pts.push(`${hx.toFixed(1)},${hy.toFixed(1)}`);
      }
      elems.push(
        `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 2. Dot Matrix ───────────────────────────────────────────────────────────

export interface DotMatrixBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Spacing between dots in design units. */
  spacing?: number;
  dotRadius?: number;
  region?: [number, number, number, number];
}

export function dotMatrixBrick(params: BrickParams, options: DotMatrixBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "dot-matrix",
    color,
    opacity = 0.5,
    spacing = 40,
    dotRadius = 3,
    region = [0, 0, 1, 1],
  } = options;

  const sp = (spacing * scale) / 2160;
  const r = (dotRadius * scale) / 2160;
  const rx = region[0] * width;
  const ry = region[1] * height;
  const rw = region[2] * width;
  const rh = region[3] * height;

  const elems: string[] = [];
  for (let y = 0; y <= rh; y += sp) {
    for (let x = 0; x <= rw; x += sp) {
      elems.push(
        `<circle cx="${(rx + x).toFixed(1)}" cy="${(ry + y).toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 3. Cross-Hatch ──────────────────────────────────────────────────────────

export interface CrossHatchBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Angle of first set of lines (degrees). */
  angle1?: number;
  /** Angle of second set of lines (degrees). */
  angle2?: number;
  /** Spacing between lines in design units. */
  spacing?: number;
  strokeWidth?: number;
}

export function crossHatchBrick(params: BrickParams, options: CrossHatchBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "cross-hatch",
    color,
    opacity = 0.4,
    angle1 = 45,
    angle2 = -45,
    spacing = 30,
    strokeWidth = 0.5,
  } = options;

  const sp = (spacing * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const diag = Math.sqrt(width * width + height * height);
  const elems: string[] = [];

  for (const angle of [angle1, angle2]) {
    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const lineCount = Math.ceil(diag / sp) * 2;
    for (let i = -lineCount; i <= lineCount; i++) {
      const offsetX = i * sp * cosA;
      const offsetY = i * sp * sinA;
      const perpX = -sinA * diag;
      const perpY = cosA * diag;
      const cx = width / 2 + offsetX;
      const cy = height / 2 + offsetY;
      elems.push(
        `<line x1="${(cx - perpX).toFixed(1)}" y1="${(cy - perpY).toFixed(1)}" x2="${(cx + perpX).toFixed(1)}" y2="${(cy + perpY).toFixed(1)}" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 4. Chevron ──────────────────────────────────────────────────────────────

export interface ChevronBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Peak-to-trough amplitude in design units. */
  amplitude?: number;
  /** Width of one full zigzag cycle in design units. */
  wavelength?: number;
  /** Number of chevron rows. */
  rows?: number;
  strokeWidth?: number;
}

export function chevronBrick(params: BrickParams, options: ChevronBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "chevron",
    color,
    opacity = 0.5,
    amplitude = 30,
    wavelength = 80,
    rows = 8,
    strokeWidth = 1.5,
  } = options;

  const amp = (amplitude * scale) / 2160;
  const wl = (wavelength * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const rowSpacing = height / (rows + 1);

  const elems: string[] = [];
  for (let r = 1; r <= rows; r++) {
    const baseY = r * rowSpacing;
    const pts: string[] = [];
    for (let x = -wl; x <= width + wl; x += wl / 2) {
      const idx = Math.round((x + wl) / (wl / 2));
      const y = idx % 2 === 0 ? baseY - amp : baseY + amp;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    elems.push(
      `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}" stroke-linejoin="miter"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 5. Spiral ───────────────────────────────────────────────────────────────

export interface SpiralBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Centre X as fraction 0-1. */
  cx?: number;
  /** Centre Y as fraction 0-1. */
  cy?: number;
  /** Number of full turns. */
  turns?: number;
  /** Spacing between successive coils in design units. */
  spacing?: number;
  strokeWidth?: number;
}

export function spiralBrick(params: BrickParams, options: SpiralBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "spiral",
    color,
    opacity = 0.6,
    cx = 0.5,
    cy = 0.5,
    turns = 6,
    spacing = 20,
    strokeWidth = 1,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const sp = (spacing * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const steps = turns * 120;
  const pts: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * turns * Math.PI * 2;
    const r = t * turns * sp;
    const px = pcx + r * Math.cos(theta);
    const py = pcy + r * Math.sin(theta);
    pts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }

  return {
    elements: `<path id="${id}" d="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}" stroke-linecap="round"/>`,
  };
}

// ─── 6. Concentric Polygon ───────────────────────────────────────────────────

export interface ConcentricPolygonBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  cx?: number;
  cy?: number;
  /** Number of sides per polygon (3 = triangle, 5 = pentagon, 6 = hexagon, ...). */
  sides?: number;
  /** How many nested rings. */
  count?: number;
  /** Rotation increment per ring (degrees). */
  rotationStep?: number;
  strokeWidth?: number;
}

export function concentricPolygonBrick(
  params: BrickParams,
  options: ConcentricPolygonBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "concentric-poly",
    color,
    opacity = 0.5,
    cx = 0.5,
    cy = 0.5,
    sides = 6,
    count = 8,
    rotationStep = 7,
    strokeWidth = 1,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const sw = (strokeWidth * scale) / 2160;
  const maxR = scale * 0.35;

  const elems: string[] = [];
  for (let ring = 1; ring <= count; ring++) {
    const r = (ring / count) * maxR;
    const rot = (ring * rotationStep * Math.PI) / 180;
    const pts: string[] = [];
    for (let k = 0; k < sides; k++) {
      const angle = ((2 * Math.PI) / sides) * k + rot;
      const px = pcx + r * Math.cos(angle);
      const py = pcy + r * Math.sin(angle);
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    elems.push(
      `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 7. Parallel Lines ───────────────────────────────────────────────────────

export interface ParallelLinesBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Line angle in degrees. */
  angle?: number;
  /** Spacing in design units. */
  spacing?: number;
  strokeWidth?: number;
}

export function parallelLinesBrick(
  params: BrickParams,
  options: ParallelLinesBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "parallel-lines",
    color,
    opacity = 0.35,
    angle = 0,
    spacing = 25,
    strokeWidth = 0.5,
  } = options;

  const sp = (spacing * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const rad = (angle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const diag = Math.sqrt(width * width + height * height);
  const lineCount = Math.ceil(diag / sp) * 2;
  const elems: string[] = [];

  for (let i = -lineCount; i <= lineCount; i++) {
    const offsetX = i * sp * cosA;
    const offsetY = i * sp * sinA;
    const perpX = -sinA * diag;
    const perpY = cosA * diag;
    const cx = width / 2 + offsetX;
    const cy = height / 2 + offsetY;
    elems.push(
      `<line x1="${(cx - perpX).toFixed(1)}" y1="${(cy - perpY).toFixed(1)}" x2="${(cx + perpX).toFixed(1)}" y2="${(cy + perpY).toFixed(1)}" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 8. Diamond Lattice ──────────────────────────────────────────────────────

export interface DiamondLatticeBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Diamond width in design units. */
  cellWidth?: number;
  /** Diamond height in design units. */
  cellHeight?: number;
  strokeWidth?: number;
  region?: [number, number, number, number];
}

export function diamondLatticeBrick(
  params: BrickParams,
  options: DiamondLatticeBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "diamond-lattice",
    color,
    opacity = 0.45,
    cellWidth = 60,
    cellHeight = 80,
    strokeWidth = 1,
    region = [0, 0, 1, 1],
  } = options;

  const cw = (cellWidth * scale) / 2160;
  const ch = (cellHeight * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const rx = region[0] * width;
  const ry = region[1] * height;
  const rw = region[2] * width;
  const rh = region[3] * height;

  const elems: string[] = [];
  const halfW = cw / 2;
  const halfH = ch / 2;

  for (let row = -1; row * halfH <= rh + ch; row++) {
    const offsetX = row % 2 === 0 ? 0 : halfW;
    for (let col = -1; col * cw <= rw + cw; col++) {
      const cx = rx + col * cw + offsetX;
      const cy = ry + row * halfH;
      const pts = [
        `${cx.toFixed(1)},${(cy - halfH).toFixed(1)}`,
        `${(cx + halfW).toFixed(1)},${cy.toFixed(1)}`,
        `${cx.toFixed(1)},${(cy + halfH).toFixed(1)}`,
        `${(cx - halfW).toFixed(1)},${cy.toFixed(1)}`,
      ];
      elems.push(
        `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 9. Circle Pack ──────────────────────────────────────────────────────────

export interface CirclePackBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Number of circles to attempt placing. */
  count?: number;
  /** Minimum radius in design units. */
  minR?: number;
  /** Maximum radius in design units. */
  maxR?: number;
  strokeWidth?: number;
}

export function circlePackBrick(params: BrickParams, options: CirclePackBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "circle-pack",
    color,
    opacity = 0.5,
    count = 80,
    minR = 8,
    maxR = 50,
    strokeWidth = 1,
  } = options;

  const sw = (strokeWidth * scale) / 2160;
  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-circle-pack-${id}`));

  interface Circle {
    x: number;
    y: number;
    r: number;
  }
  const placed: Circle[] = [];
  const maxAttempts = count * 12;

  for (let attempt = 0; attempt < maxAttempts && placed.length < count; attempt++) {
    const r = ((minR + rng() * (maxR - minR)) * scale) / 2160;
    const x = r + rng() * (width - 2 * r);
    const y = r + rng() * (height - 2 * r);
    let overlaps = false;
    for (const c of placed) {
      const dx = x - c.x;
      const dy = y - c.y;
      if (dx * dx + dy * dy < (r + c.r + sw) * (r + c.r + sw)) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      placed.push({ x, y, r });
    }
  }

  const elems = placed.map(
    c =>
      `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
  );

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 10. Lissajous ───────────────────────────────────────────────────────────

export interface LissajousBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  cx?: number;
  cy?: number;
  /** Size as fraction of scale. */
  size?: number;
  /** Frequency ratio X. */
  a?: number;
  /** Frequency ratio Y. */
  b?: number;
  /** Phase offset in radians. */
  delta?: number;
  strokeWidth?: number;
}

export function lissajousBrick(params: BrickParams, options: LissajousBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "lissajous",
    color,
    opacity = 0.6,
    cx = 0.5,
    cy = 0.5,
    size = 0.3,
    a = 3,
    b = 2,
    delta = Math.PI / 2,
    strokeWidth = 1.5,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const amp = size * scale;
  const sw = (strokeWidth * scale) / 2160;
  const steps = 600;
  const pts: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const px = pcx + amp * Math.sin(a * t + delta);
    const py = pcy + amp * Math.sin(b * t);
    pts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }

  return {
    elements: `<path id="${id}" d="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}" stroke-linejoin="round"/>`,
  };
}

// ─── 11. Fibonacci Spiral ────────────────────────────────────────────────────

export interface FibonacciSpiralBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  cx?: number;
  cy?: number;
  /** Number of dots placed at Fibonacci-angle positions. */
  count?: number;
  dotRadius?: number;
}

export function fibonacciSpiralBrick(
  params: BrickParams,
  options: FibonacciSpiralBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "fib-spiral",
    color,
    opacity = 0.6,
    cx = 0.5,
    cy = 0.5,
    count = 200,
    dotRadius = 3,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const r = (dotRadius * scale) / 2160;
  // Golden angle in radians
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const maxR = scale * 0.4;

  const elems: string[] = [];
  for (let i = 0; i < count; i++) {
    const theta = i * goldenAngle;
    const dist = Math.sqrt(i / count) * maxR;
    const px = pcx + dist * Math.cos(theta);
    const py = pcy + dist * Math.sin(theta);
    elems.push(
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 12. Guilloche ───────────────────────────────────────────────────────────

export interface GuillocheBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Number of engraving lines. */
  lineCount?: number;
  /** Sine amplitude in design units. */
  amplitude?: number;
  /** Sine frequency (cycles across canvas width). */
  frequency?: number;
  strokeWidth?: number;
}

export function guillocheBrick(params: BrickParams, options: GuillocheBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "guilloche",
    color,
    opacity = 0.3,
    lineCount = 24,
    amplitude = 20,
    frequency = 8,
    strokeWidth = 0.5,
  } = options;

  const amp = (amplitude * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const ySpacing = height / (lineCount + 1);
  const steps = 200;

  const elems: string[] = [];
  for (let line = 1; line <= lineCount; line++) {
    const baseY = line * ySpacing;
    // Each line has a slightly different frequency offset to create moire
    const freqOffset = line * 0.15;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * width;
      const y =
        baseY +
        amp * Math.sin(t * frequency * Math.PI * 2 + freqOffset) +
        amp * 0.4 * Math.sin(t * frequency * 2.3 * Math.PI * 2 + freqOffset * 1.7);
      pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    elems.push(
      `<path d="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 13. Tangent Circles ─────────────────────────────────────────────────────

export interface TangentCirclesBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  cx?: number;
  cy?: number;
  /** Outer circle radius as fraction of scale. */
  radius?: number;
  /** Recursion depth (number of concentric rings of tangent circles). */
  depth?: number;
  strokeWidth?: number;
}

export function tangentCirclesBrick(
  params: BrickParams,
  options: TangentCirclesBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "tangent-circles",
    color,
    opacity = 0.5,
    cx = 0.5,
    cy = 0.5,
    radius = 0.3,
    depth = 3,
    strokeWidth = 1,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const outerR = radius * scale;
  const sw = (strokeWidth * scale) / 2160;

  const elems: string[] = [];

  // Outer bounding circle
  elems.push(
    `<circle cx="${pcx.toFixed(1)}" cy="${pcy.toFixed(1)}" r="${outerR.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
  );

  // Recursively pack circles inside
  function packCircles(px: number, py: number, r: number, level: number) {
    if (level <= 0 || r < sw * 3) return;
    // Pack n circles tangent to the inner wall
    const n = Math.max(3, 6 - level);
    const childR = r / (1 + 1 / Math.sin(Math.PI / n));
    for (let k = 0; k < n; k++) {
      const angle = ((2 * Math.PI) / n) * k;
      const childCx = px + (r - childR) * Math.cos(angle);
      const childCy = py + (r - childR) * Math.sin(angle);
      elems.push(
        `<circle cx="${childCx.toFixed(1)}" cy="${childCy.toFixed(1)}" r="${childR.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
      );
      packCircles(childCx, childCy, childR, level - 1);
    }
  }

  packCircles(pcx, pcy, outerR, depth);

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 14. Herringbone ─────────────────────────────────────────────────────────

export interface HerringboneBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Tile width in design units. */
  tileWidth?: number;
  /** Tile height in design units. */
  tileHeight?: number;
  strokeWidth?: number;
  region?: [number, number, number, number];
}

export function herringboneBrick(
  params: BrickParams,
  options: HerringboneBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "herringbone",
    color,
    opacity = 0.4,
    tileWidth = 40,
    tileHeight = 12,
    strokeWidth = 1,
    region = [0, 0, 1, 1],
  } = options;

  const tw = (tileWidth * scale) / 2160;
  const th = (tileHeight * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const rx = region[0] * width;
  const ry = region[1] * height;
  const rw = region[2] * width;
  const rh = region[3] * height;

  const elems: string[] = [];
  // Each row alternates between horizontal and vertical tile orientations
  const stepX = tw;
  const stepY = th;

  for (let row = -1; row * stepY <= rh + stepY * 2; row++) {
    for (let col = -1; col * stepX <= rw + stepX * 2; col++) {
      const isEven = (row + col) % 2 === 0;
      const bx = rx + col * stepX;
      const by = ry + row * stepY;

      if (isEven) {
        // Horizontal tile (wider along X)
        elems.push(
          `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${tw.toFixed(1)}" height="${th.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
        );
      } else {
        // Vertical tile (taller along Y)
        elems.push(
          `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${th.toFixed(1)}" height="${tw.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
        );
      }
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 15. Geodesic ────────────────────────────────────────────────────────────

export interface GeodesicBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  cx?: number;
  cy?: number;
  /** Radius as fraction of scale. */
  radius?: number;
  /** Number of subdivision levels (higher = more triangles). */
  subdivisions?: number;
  strokeWidth?: number;
}

export function geodesicBrick(params: BrickParams, options: GeodesicBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "geodesic",
    color,
    opacity = 0.5,
    cx = 0.5,
    cy = 0.5,
    radius = 0.3,
    subdivisions = 3,
    strokeWidth = 0.8,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const r = radius * scale;
  const sw = (strokeWidth * scale) / 2160;

  // Start with an icosahedron projected to 2D (front hemisphere)
  type V3 = [number, number, number];

  // Generate icosahedron vertices
  const phi = (1 + Math.sqrt(5)) / 2;
  const icoVerts: V3[] = [
    [-1, phi, 0],
    [1, phi, 0],
    [-1, -phi, 0],
    [1, -phi, 0],
    [0, -1, phi],
    [0, 1, phi],
    [0, -1, -phi],
    [0, 1, -phi],
    [phi, 0, -1],
    [phi, 0, 1],
    [-phi, 0, -1],
    [-phi, 0, 1],
  ];
  // Normalize to unit sphere
  for (const v of icoVerts) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    v[0] /= len;
    v[1] /= len;
    v[2] /= len;
  }

  const icoFaces: [number, number, number][] = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  // Subdivide triangles on the sphere
  const verts = [...icoVerts];
  let faces = [...icoFaces];
  const midCache = new Map<string, number>();

  function getMidpoint(i1: number, i2: number): number {
    const key = i1 < i2 ? `${i1}-${i2}` : `${i2}-${i1}`;
    if (midCache.has(key)) return midCache.get(key) as number;
    const v1 = verts[i1];
    const v2 = verts[i2];
    const mid: V3 = [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2, (v1[2] + v2[2]) / 2];
    const len = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]);
    mid[0] /= len;
    mid[1] /= len;
    mid[2] /= len;
    const idx = verts.length;
    verts.push(mid);
    midCache.set(key, idx);
    return idx;
  }

  for (let s = 0; s < subdivisions; s++) {
    const newFaces: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = getMidpoint(a, b);
      const bc = getMidpoint(b, c);
      const ca = getMidpoint(c, a);
      newFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = newFaces;
  }

  // Project front-facing triangles (z > 0 for all 3 vertices) via orthographic projection
  const elems: string[] = [];
  for (const [a, b, c] of faces) {
    const va = verts[a];
    const vb = verts[b];
    const vc = verts[c];
    if (va[2] < -0.1 || vb[2] < -0.1 || vc[2] < -0.1) continue;
    const ax = pcx + va[0] * r;
    const ay = pcy + va[1] * r;
    const bx = pcx + vb[0] * r;
    const by = pcy + vb[1] * r;
    const ccx = pcx + vc[0] * r;
    const ccy = pcy + vc[1] * r;
    elems.push(
      `<polygon points="${ax.toFixed(1)},${ay.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} ${ccx.toFixed(1)},${ccy.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 16. Stellate ────────────────────────────────────────────────────────────

export interface StellateBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  cx?: number;
  cy?: number;
  /** Outer radius as fraction of scale. */
  outerR?: number;
  /** Inner radius as fraction of scale. */
  innerR?: number;
  /** Number of star points. */
  points?: number;
  strokeWidth?: number;
}

export function stellateBrick(params: BrickParams, options: StellateBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "stellate",
    color,
    opacity = 0.6,
    cx = 0.5,
    cy = 0.5,
    outerR = 0.25,
    innerR = 0.1,
    points = 8,
    strokeWidth = 1.5,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const oR = outerR * scale;
  const iR = innerR * scale;
  const sw = (strokeWidth * scale) / 2160;

  const pts: string[] = [];
  for (let k = 0; k < points * 2; k++) {
    const angle = (Math.PI / points) * k - Math.PI / 2;
    const radius = k % 2 === 0 ? oR : iR;
    const px = pcx + radius * Math.cos(angle);
    const py = pcy + radius * Math.sin(angle);
    pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }

  return {
    elements: `<polygon id="${id}" points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`,
  };
}

// ─── 17. Wave Interference ───────────────────────────────────────────────────

export interface WaveInterferenceBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Number of overlapping wave lines. */
  waveCount?: number;
  /** Amplitude in design units. */
  amplitude?: number;
  /** Base frequency (cycles across canvas width). */
  frequency?: number;
  strokeWidth?: number;
}

export function waveInterferenceBrick(
  params: BrickParams,
  options: WaveInterferenceBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "wave-interference",
    color,
    opacity = 0.35,
    waveCount = 12,
    amplitude = 30,
    frequency = 4,
    strokeWidth = 0.8,
  } = options;

  const amp = (amplitude * scale) / 2160;
  const sw = (strokeWidth * scale) / 2160;
  const steps = 200;

  const elems: string[] = [];
  for (let w = 0; w < waveCount; w++) {
    const baseY = height * ((w + 1) / (waveCount + 1));
    // Each wave has a slightly shifted frequency and phase for interference
    const freqShift = 1 + w * 0.12;
    const phase = (w * Math.PI) / waveCount;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * width;
      const y =
        baseY +
        amp * Math.sin(t * frequency * freqShift * Math.PI * 2 + phase) +
        amp * 0.3 * Math.sin(t * frequency * freqShift * 3.1 * Math.PI * 2 + phase * 2.2);
      pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    elems.push(
      `<path d="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 18. Concentric Star ─────────────────────────────────────────────────────

export interface ConcentricStarBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  cx?: number;
  cy?: number;
  /** Number of nested star rings. */
  count?: number;
  /** Max outer radius as fraction of scale. */
  outerR?: number;
  /** Inner-to-outer ratio for star indentation. */
  innerR?: number;
  /** Number of star points. */
  points?: number;
  /** Rotation increment per ring (degrees). */
  rotationStep?: number;
  strokeWidth?: number;
}

export function concentricStarBrick(
  params: BrickParams,
  options: ConcentricStarBrickOptions
): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "concentric-star",
    color,
    opacity = 0.5,
    cx = 0.5,
    cy = 0.5,
    count = 6,
    outerR = 0.3,
    innerR = 0.5,
    points = 5,
    rotationStep = 10,
    strokeWidth = 1,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const maxOuter = outerR * scale;
  const sw = (strokeWidth * scale) / 2160;

  const elems: string[] = [];
  for (let ring = 1; ring <= count; ring++) {
    const oR = (ring / count) * maxOuter;
    const iR = oR * innerR;
    const rot = (ring * rotationStep * Math.PI) / 180;
    const pts: string[] = [];
    for (let k = 0; k < points * 2; k++) {
      const angle = (Math.PI / points) * k - Math.PI / 2 + rot;
      const radius = k % 2 === 0 ? oR : iR;
      const px = pcx + radius * Math.cos(angle);
      const py = pcy + radius * Math.sin(angle);
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    elems.push(
      `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 19. Grid Warp ───────────────────────────────────────────────────────────

export interface GridWarpBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Number of grid columns. */
  cols?: number;
  /** Number of grid rows. */
  rows?: number;
  /** Displacement strength as fraction of cell size. */
  warpAmount?: number;
  strokeWidth?: number;
}

export function gridWarpBrick(params: BrickParams, options: GridWarpBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "grid-warp",
    color,
    opacity = 0.4,
    cols = 20,
    rows = 14,
    warpAmount = 0.35,
    strokeWidth = 0.8,
  } = options;

  const sw = (strokeWidth * scale) / 2160;
  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-grid-warp-${id}`));

  // Build a grid of warped points
  const cellW = width / cols;
  const cellH = height / rows;
  const grid: Array<Array<[number, number]>> = [];

  for (let r = 0; r <= rows; r++) {
    const row: Array<[number, number]> = [];
    for (let c = 0; c <= cols; c++) {
      // Procedural displacement using a smooth function
      const baseX = c * cellW;
      const baseY = r * cellH;
      // Perlin-ish displacement from seeded sine combination
      const nx = c / cols;
      const ny = r / rows;
      const dx =
        Math.sin(nx * 6.28 * 2.3 + ny * 3.1) * 0.5 +
        Math.sin(nx * 6.28 * 5.1 + ny * 7.7) * 0.3 +
        (rng() - 0.5) * 0.2;
      const dy =
        Math.cos(ny * 6.28 * 2.7 + nx * 4.3) * 0.5 +
        Math.cos(ny * 6.28 * 4.9 + nx * 6.1) * 0.3 +
        (rng() - 0.5) * 0.2;
      row.push([baseX + dx * warpAmount * cellW, baseY + dy * warpAmount * cellH]);
    }
    grid.push(row);
  }

  const elems: string[] = [];

  // Draw horizontal lines
  for (let r = 0; r <= rows; r++) {
    const pts: string[] = [];
    for (let c = 0; c <= cols; c++) {
      const [x, y] = grid[r][c];
      pts.push(`${c === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    elems.push(
      `<path d="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
    );
  }

  // Draw vertical lines
  for (let c = 0; c <= cols; c++) {
    const pts: string[] = [];
    for (let r = 0; r <= rows; r++) {
      const [x, y] = grid[r][c];
      pts.push(`${r === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    elems.push(
      `<path d="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" opacity="${opacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── 20. Radial Dot ──────────────────────────────────────────────────────────

export interface RadialDotBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  cx?: number;
  cy?: number;
  /** Number of concentric rings. */
  rings?: number;
  /** Number of dots per ring (inner ring may have fewer -- scaled by ring index). */
  dotsPerRing?: number;
  dotRadius?: number;
}

export function radialDotBrick(params: BrickParams, options: RadialDotBrickOptions): BrickOutput {
  const { viewBox } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "radial-dot",
    color,
    opacity = 0.5,
    cx = 0.5,
    cy = 0.5,
    rings = 10,
    dotsPerRing = 16,
    dotRadius = 3,
  } = options;

  const pcx = cx * width;
  const pcy = cy * height;
  const r = (dotRadius * scale) / 2160;
  const maxR = scale * 0.38;

  const elems: string[] = [];
  for (let ring = 1; ring <= rings; ring++) {
    const ringR = (ring / rings) * maxR;
    // Scale dot count with ring radius so spacing stays roughly even
    const dotCount = Math.max(4, Math.round(dotsPerRing * (ring / rings)));
    for (let d = 0; d < dotCount; d++) {
      const angle = ((2 * Math.PI) / dotCount) * d;
      const px = pcx + ringR * Math.cos(angle);
      const py = pcy + ringR * Math.sin(angle);
      elems.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}
