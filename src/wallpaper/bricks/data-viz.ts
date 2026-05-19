/**
 * Data-visualization bricks — chart and graph primitives.
 * Network graphs, radar charts, contour density, stream graphs,
 * barcodes, waveforms, spectrum bars, and circuit traces.
 */
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

// ─── Network Graph Brick ────────────────────────────────────────────────────

export interface NetworkGraphBrickOptions {
  id?: string;
  /** Number of nodes in the network */
  nodeCount?: number;
  /** Maximum edge length as fraction of scale — nodes farther apart are not connected */
  maxEdgeLength?: number;
  color: string;
  /** Accent color for highlighted nodes */
  accentColor?: string;
  opacity?: number;
  strokeWidth?: number;
  /** Region bounds (fractions 0-1) */
  region?: { x: number; y: number; w: number; h: number };
}

export function networkGraphBrick(
  params: BrickParams,
  options: NetworkGraphBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "network-graph",
    nodeCount = 50,
    maxEdgeLength = 0.08,
    color,
    accentColor,
    opacity = 0.1,
    strokeWidth = 0.7,
    region = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 },
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const swThin = ((strokeWidth * 0.5 * scale) / 2160).toFixed(1);
  const maxDist = maxEdgeLength * scale;

  // Generate node positions
  const nodes: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const x = (region.x + rng() * region.w) * width;
    const y = (region.y + rng() * region.h) * height;
    const r = (0.001 + rng() * 0.004) * scale;
    nodes.push({ x, y, r });
  }

  const elems: string[] = [];

  // Draw edges between nearby nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const edgeOpacity = (opacity * (1 - dist / maxDist) * 0.8).toFixed(3);
        elems.push(
          `<line x1="${nodes[i].x.toFixed(1)}" y1="${nodes[i].y.toFixed(1)}" x2="${nodes[j].x.toFixed(1)}" y2="${nodes[j].y.toFixed(1)}" stroke="${color}" stroke-width="${swThin}" opacity="${edgeOpacity}"/>`
        );
      }
    }
  }

  // Draw nodes on top
  for (const node of nodes) {
    const useAccent = accentColor && rng() < 0.15;
    const c = useAccent ? accentColor : color;
    const nodeOpacity = (opacity * (0.6 + rng() * 0.4)).toFixed(3);
    elems.push(
      `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${node.r.toFixed(1)}" fill="${c}" opacity="${nodeOpacity}"/>`
    );
    // Add a ring around larger nodes
    if (node.r > 0.003 * scale) {
      elems.push(
        `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${(node.r * 1.8).toFixed(1)}" fill="none" stroke="${c}" stroke-width="${sw}" opacity="${(opacity * 0.4).toFixed(3)}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Radar Chart Brick ──────────────────────────────────────────────────────

export interface RadarChartBrickOptions {
  id?: string;
  /** Center X (fraction 0-1) */
  cx?: number;
  /** Center Y (fraction 0-1) */
  cy?: number;
  /** Outer radius as fraction of scale */
  radius?: number;
  /** Number of axes */
  axes?: number;
  /** Number of concentric guide rings */
  guideRings?: number;
  color: string;
  /** Fill color for the data polygon */
  fillColor?: string;
  opacity?: number;
  strokeWidth?: number;
}

export function radarChartBrick(params: BrickParams, options: RadarChartBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "radar-chart",
    cx = 0.5,
    cy = 0.5,
    radius = 0.15,
    axes = 6,
    guideRings = 4,
    color,
    fillColor,
    opacity = 0.1,
    strokeWidth = 0.8,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const pcx = cx * width;
  const pcy = cy * height;
  const pr = radius * scale;
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const swThin = ((strokeWidth * 0.5 * scale) / 2160).toFixed(1);

  const elems: string[] = [];

  // Draw concentric guide rings (polygonal)
  for (let ring = 1; ring <= guideRings; ring++) {
    const ringR = (ring / guideRings) * pr;
    const pts: string[] = [];
    for (let a = 0; a < axes; a++) {
      const angle = (Math.PI * 2 * a) / axes - Math.PI / 2;
      pts.push(
        `${(pcx + Math.cos(angle) * ringR).toFixed(1)},${(pcy + Math.sin(angle) * ringR).toFixed(1)}`
      );
    }
    const ringOpacity = (opacity * (0.3 + 0.2 * (ring / guideRings))).toFixed(3);
    elems.push(
      `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${swThin}" opacity="${ringOpacity}"/>`
    );
  }

  // Draw axis lines from center to outer edge
  for (let a = 0; a < axes; a++) {
    const angle = (Math.PI * 2 * a) / axes - Math.PI / 2;
    const ex = pcx + Math.cos(angle) * pr;
    const ey = pcy + Math.sin(angle) * pr;
    elems.push(
      `<line x1="${pcx.toFixed(1)}" y1="${pcy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${color}" stroke-width="${swThin}" opacity="${(opacity * 0.5).toFixed(3)}"/>`
    );
  }

  // Draw data polygon — random values along each axis
  const dataPts: string[] = [];
  for (let a = 0; a < axes; a++) {
    const angle = (Math.PI * 2 * a) / axes - Math.PI / 2;
    const value = 0.3 + rng() * 0.7; // 30-100% of radius
    const dx = pcx + Math.cos(angle) * pr * value;
    const dy = pcy + Math.sin(angle) * pr * value;
    dataPts.push(`${dx.toFixed(1)},${dy.toFixed(1)}`);
  }

  // Fill the data polygon
  const fc = fillColor ?? color;
  elems.push(
    `<polygon points="${dataPts.join(" ")}" fill="${fc}" fill-opacity="${(opacity * 0.3).toFixed(3)}" stroke="${fc}" stroke-width="${sw}" opacity="${opacity}"/>`
  );

  // Dots at data vertices
  for (const pt of dataPts) {
    const [px, py] = pt.split(",");
    const dotR = ((1.5 * scale) / 2160).toFixed(1);
    elems.push(
      `<circle cx="${px}" cy="${py}" r="${dotR}" fill="${fc}" opacity="${(opacity * 1.5).toFixed(3)}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Contour Density Brick ──────────────────────────────────────────────────

export interface ContourDensityBrickOptions {
  id?: string;
  /** Number of contour levels */
  levels?: number;
  /** Noise frequency — lower is smoother/larger shapes */
  frequency?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  /** Grid resolution for marching squares */
  resolution?: number;
}

export function contourDensityBrick(
  params: BrickParams,
  options: ContourDensityBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "contour-density",
    levels = 8,
    frequency = 0.0015,
    color,
    opacity = 0.08,
    strokeWidth = 0.6,
    resolution = 100,
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

  // Build a noise field with multiple octaves for organic density
  const field: number[][] = [];
  for (let r = 0; r <= rows; r++) {
    const row: number[] = [];
    for (let c = 0; c <= cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      // Multi-octave noise for organic density feel
      let v = noise(x * frequency, y * frequency) * 0.6;
      v += noise(x * frequency * 2.3, y * frequency * 2.3) * 0.25;
      v += noise(x * frequency * 5.1, y * frequency * 5.1) * 0.15;
      row.push(v * 0.5 + 0.5);
    }
    field.push(row);
  }

  const elems: string[] = [];

  // Marching squares with linear interpolation for smooth contours
  for (let lvl = 1; lvl < levels; lvl++) {
    const threshold = lvl / levels;
    const segments: string[] = [];
    const levelOpacity = opacity * (0.5 + 0.5 * (lvl / levels));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v00 = field[r][c];
        const v10 = field[r][c + 1];
        const v01 = field[r + 1][c];
        const v11 = field[r + 1][c + 1];

        const idx =
          (v00 >= threshold ? 8 : 0) |
          (v10 >= threshold ? 4 : 0) |
          (v11 >= threshold ? 2 : 0) |
          (v01 >= threshold ? 1 : 0);
        if (idx === 0 || idx === 15) continue;

        const x = c * cellW;
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
        `<path d="${segments.join("")}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${levelOpacity.toFixed(3)}" stroke-linejoin="round" stroke-linecap="round"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Stream Graph Brick ─────────────────────────────────────────────────────

export interface StreamGraphBrickOptions {
  id?: string;
  /** Number of stacked layers */
  layerCount?: number;
  /** Number of horizontal sample points per layer */
  samplePoints?: number;
  color: string;
  /** Accent color for alternating layers */
  accentColor?: string;
  opacity?: number;
  /** Vertical amplitude as fraction of height */
  amplitude?: number;
  /** Vertical region (fraction 0-1) */
  yCenter?: number;
}

export function streamGraphBrick(
  params: BrickParams,
  options: StreamGraphBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "stream-graph",
    layerCount = 5,
    samplePoints = 20,
    color,
    accentColor,
    opacity = 0.06,
    amplitude = 0.06,
    yCenter = 0.5,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));

  // Generate random thickness values for each layer at each sample point
  const layerData: number[][] = [];
  for (let l = 0; l < layerCount; l++) {
    const data: number[] = [];
    for (let s = 0; s < samplePoints; s++) {
      data.push(0.3 + rng() * 0.7);
    }
    layerData.push(data);
  }

  const amp = amplitude * height;
  const baseLine = yCenter * height;
  const step = width / (samplePoints - 1);

  const elems: string[] = [];

  // Compute cumulative upper/lower offsets for stacking
  const upperOffsets: number[][] = [];
  const lowerOffsets: number[][] = [];

  for (let s = 0; s < samplePoints; s++) {
    let totalThickness = 0;
    for (let l = 0; l < layerCount; l++) {
      totalThickness += layerData[l][s] * amp;
    }
    let cumUpper = -totalThickness / 2;
    const upper: number[] = [];
    const lower: number[] = [];
    for (let l = 0; l < layerCount; l++) {
      const thickness = layerData[l][s] * amp;
      upper.push(cumUpper);
      lower.push(cumUpper + thickness);
      cumUpper += thickness;
    }
    upperOffsets.push(upper);
    lowerOffsets.push(lower);
  }

  // Draw each layer as a closed bezier path
  for (let l = 0; l < layerCount; l++) {
    const useAccent = accentColor && l % 2 === 1;
    const c = useAccent ? accentColor : color;
    const layerOpacity = (opacity * (0.5 + 0.5 * rng())).toFixed(3);

    // Build top edge (left to right)
    let pathData = `M0,${(baseLine + upperOffsets[0][l]).toFixed(1)}`;
    for (let s = 1; s < samplePoints; s++) {
      const x = s * step;
      const y = baseLine + upperOffsets[s][l];
      const cpx = x - step * 0.5;
      const prevY = baseLine + upperOffsets[s - 1][l];
      pathData += ` C${cpx.toFixed(1)},${prevY.toFixed(1)} ${cpx.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    }

    // Build bottom edge (right to left)
    const lastIdx = samplePoints - 1;
    pathData += ` L${(lastIdx * step).toFixed(1)},${(baseLine + lowerOffsets[lastIdx][l]).toFixed(1)}`;
    for (let s = lastIdx - 1; s >= 0; s--) {
      const x = s * step;
      const y = baseLine + lowerOffsets[s][l];
      const cpx = x + step * 0.5;
      const prevY = baseLine + lowerOffsets[s + 1][l];
      pathData += ` C${cpx.toFixed(1)},${prevY.toFixed(1)} ${cpx.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    }

    pathData += " Z";

    elems.push(
      `<path d="${pathData}" fill="${c}" fill-opacity="${layerOpacity}" stroke="${c}" stroke-width="${((0.5 * scale) / 2160).toFixed(1)}" opacity="${layerOpacity}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Barcode Brick ──────────────────────────────────────────────────────────

export interface BarcodeBrickOptions {
  id?: string;
  color: string;
  opacity?: number;
  /** Minimum bar width as fraction of scale */
  minWidth?: number;
  /** Maximum bar width as fraction of scale */
  maxWidth?: number;
  /** Region bounds (fractions 0-1) */
  region?: { x: number; y: number; w: number; h: number };
  /** Gap-to-width ratio */
  gapRatio?: number;
}

export function barcodeBrick(params: BrickParams, options: BarcodeBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "barcode",
    color,
    opacity = 0.08,
    minWidth = 0.0005,
    maxWidth = 0.003,
    region = { x: 0.1, y: 0.3, w: 0.8, h: 0.4 },
    gapRatio = 0.6,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));

  const rx = region.x * width;
  const ry = region.y * height;
  const rw = region.w * width;
  const rh = region.h * height;
  const minW = minWidth * scale;
  const maxW = maxWidth * scale;

  const elems: string[] = [];
  let xPos = rx;

  while (xPos < rx + rw) {
    const barWidth = minW + rng() * (maxW - minW);
    const barHeight = rh * (0.6 + rng() * 0.4);
    const barY = ry + (rh - barHeight) * 0.5;
    const barOpacity = (opacity * (0.4 + rng() * 0.6)).toFixed(3);

    elems.push(
      `<rect x="${xPos.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${color}" opacity="${barOpacity}"/>`
    );

    const gap = barWidth * (0.3 + rng() * gapRatio);
    xPos += barWidth + gap;
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Waveform Brick ─────────────────────────────────────────────────────────

export interface WaveformBrickOptions {
  id?: string;
  /** Vertical center (fraction 0-1) */
  cy?: number;
  /** Amplitude as fraction of height */
  amplitude?: number;
  /** Frequency — number of complete oscillations across the width */
  frequency?: number;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  /** Number of sample points along the waveform */
  samples?: number;
}

export function waveformBrick(params: BrickParams, options: WaveformBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "waveform",
    cy = 0.5,
    amplitude = 0.08,
    frequency = 3,
    color,
    opacity = 0.1,
    strokeWidth = 0.8,
    samples = 200,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const baseY = cy * height;
  const amp = amplitude * height;

  // Generate amplitude envelope — varies the waveform's strength across its length
  const envelopePoints = 8;
  const envelope: number[] = [];
  for (let i = 0; i < envelopePoints; i++) {
    envelope.push(0.2 + rng() * 0.8);
  }

  const getEnvelope = (t: number): number => {
    const idx = t * (envelopePoints - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, envelopePoints - 1);
    const frac = idx - i0;
    return envelope[i0] * (1 - frac) + envelope[i1] * frac;
  };

  // Phase offset for visual variety
  const phaseOffset = rng() * Math.PI * 2;
  // Secondary frequency for complexity
  const freq2 = frequency * (1.5 + rng());
  const amp2 = 0.3 + rng() * 0.3;

  const points: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const x = t * width;
    const env = getEnvelope(t);
    const wave =
      Math.sin(t * frequency * Math.PI * 2 + phaseOffset) +
      amp2 * Math.sin(t * freq2 * Math.PI * 2 + phaseOffset * 0.7);
    const y = baseY + wave * amp * env;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const pathData = `M ${points[0]} ${points
    .slice(1)
    .map(p => `L ${p}`)
    .join(" ")}`;

  return {
    elements: `<g id="${id}"><path d="${pathData}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  };
}

// ─── Spectrum Brick ─────────────────────────────────────────────────────────

export interface SpectrumBrickOptions {
  id?: string;
  /** Number of frequency bars */
  barCount?: number;
  /** Maximum bar height as fraction of region height */
  maxHeight?: number;
  color: string;
  /** Accent color for peak bars */
  accentColor?: string;
  opacity?: number;
  /** Region bounds (fractions 0-1) */
  region?: { x: number; y: number; w: number; h: number };
  /** Bar corner radius as fraction of bar width */
  cornerRadius?: number;
}

export function spectrumBrick(params: BrickParams, options: SpectrumBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const _scale = Math.max(width, height);
  const {
    id = "spectrum",
    barCount = 32,
    maxHeight = 0.8,
    color,
    accentColor,
    opacity = 0.1,
    region = { x: 0.1, y: 0.4, w: 0.8, h: 0.3 },
    cornerRadius = 0.15,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));

  const rx = region.x * width;
  const ry = region.y * height;
  const rw = region.w * width;
  const rh = region.h * height;
  const barSpacing = rw / barCount;
  const barWidth = barSpacing * 0.7;
  const cr = barWidth * cornerRadius;

  const elems: string[] = [];

  // Generate a smooth spectrum shape with a peak in the lower-mid range
  for (let i = 0; i < barCount; i++) {
    const t = i / (barCount - 1);
    // Bell-curve-like shape with randomness — mimics real spectrum analyzers
    const bellBase = Math.exp(-(((t - 0.25) * 3) ** 2)) * 0.6;
    const noise = rng() * 0.4;
    const barFrac = Math.min(1, bellBase + noise) * maxHeight;
    const barH = barFrac * rh;
    const barX = rx + i * barSpacing + (barSpacing - barWidth) * 0.5;
    const barY = ry + rh - barH;

    const isPeak = barFrac > maxHeight * 0.75;
    const useAccent = accentColor && isPeak;
    const c = useAccent ? accentColor : color;
    const barOpacity = (opacity * (0.5 + 0.5 * barFrac)).toFixed(3);

    if (cr > 0.5) {
      elems.push(
        `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="${cr.toFixed(1)}" fill="${c}" opacity="${barOpacity}"/>`
      );
    } else {
      elems.push(
        `<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="${c}" opacity="${barOpacity}"/>`
      );
    }
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}

// ─── Circuit Trace Brick ────────────────────────────────────────────────────

export interface CircuitTraceBrickOptions {
  id?: string;
  /** Number of traces to route */
  traceCount?: number;
  color: string;
  /** Accent color for via/junction dots */
  accentColor?: string;
  opacity?: number;
  strokeWidth?: number;
  /** Region bounds (fractions 0-1) */
  region?: { x: number; y: number; w: number; h: number };
  /** Maximum number of turns per trace */
  maxTurns?: number;
}

export function circuitTraceBrick(
  params: BrickParams,
  options: CircuitTraceBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const {
    id = "circuit-trace",
    traceCount = 25,
    color,
    accentColor,
    opacity = 0.1,
    strokeWidth = 0.8,
    region = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 },
    maxTurns = 6,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-${id}`));
  const sw = ((strokeWidth * scale) / 2160).toFixed(1);
  const swWide = ((strokeWidth * 1.5 * scale) / 2160).toFixed(1);

  const rx = region.x * width;
  const ry = region.y * height;
  const rw = region.w * width;
  const rh = region.h * height;

  // Snap grid for PCB-like alignment
  const gridSize = 0.015 * scale;
  const snap = (v: number) => Math.round(v / gridSize) * gridSize;

  const elems: string[] = [];
  const vias: { x: number; y: number }[] = [];

  for (let t = 0; t < traceCount; t++) {
    // Random start and end points, snapped to grid
    let cx = snap(rx + rng() * rw);
    let cy = snap(ry + rng() * rh);
    const ex = snap(rx + rng() * rw);
    const ey = snap(ry + rng() * rh);

    const turns = 2 + Math.floor(rng() * (maxTurns - 1));
    const pathParts: string[] = [`M${cx.toFixed(1)},${cy.toFixed(1)}`];

    // Route with right-angle turns toward target
    for (let turn = 0; turn < turns; turn++) {
      const isLast = turn === turns - 1;
      const targetX = isLast ? ex : snap(cx + (rng() - 0.3) * rw * 0.4);
      const targetY = isLast ? ey : snap(cy + (rng() - 0.3) * rh * 0.4);

      // Clamp to region
      const nextX = Math.max(rx, Math.min(rx + rw, targetX));
      const nextY = Math.max(ry, Math.min(ry + rh, targetY));

      // Alternate horizontal-first or vertical-first for visual variety
      if (rng() < 0.5) {
        // Horizontal then vertical
        pathParts.push(`L${nextX.toFixed(1)},${cy.toFixed(1)}`);
        pathParts.push(`L${nextX.toFixed(1)},${nextY.toFixed(1)}`);
      } else {
        // Vertical then horizontal
        pathParts.push(`L${cx.toFixed(1)},${nextY.toFixed(1)}`);
        pathParts.push(`L${nextX.toFixed(1)},${nextY.toFixed(1)}`);
      }

      // Add a via at each turn junction
      if (!isLast && rng() < 0.5) {
        vias.push({ x: nextX, y: nextY });
      }

      cx = nextX;
      cy = nextY;
    }

    const traceOpacity = (opacity * (0.4 + rng() * 0.6)).toFixed(3);
    elems.push(
      `<path d="${pathParts.join(" ")}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${traceOpacity}" stroke-linecap="square" stroke-linejoin="miter"/>`
    );
  }

  // Draw vias (junction dots)
  const viaColor = accentColor ?? color;
  const viaR = ((1.5 * scale) / 2160).toFixed(1);
  const viaRingR = ((3 * scale) / 2160).toFixed(1);
  for (const via of vias) {
    elems.push(
      `<circle cx="${via.x.toFixed(1)}" cy="${via.y.toFixed(1)}" r="${viaRingR}" fill="none" stroke="${viaColor}" stroke-width="${swWide}" opacity="${(opacity * 0.5).toFixed(3)}"/>`
    );
    elems.push(
      `<circle cx="${via.x.toFixed(1)}" cy="${via.y.toFixed(1)}" r="${viaR}" fill="${viaColor}" opacity="${(opacity * 0.8).toFixed(3)}"/>`
    );
  }

  return {
    elements: `<g id="${id}">${elems.join("")}</g>`,
  };
}
