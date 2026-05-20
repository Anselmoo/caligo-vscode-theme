/**
 * Particle bricks — deterministic dot fields for stars, sparks, and dust.
 * Uses a seeded pseudo-random generator so results are reproducible per seedId.
 */
import type { BrickOutput, BrickParams } from "../types.js";

/** Fast, deterministic hash-based PRNG (mulberry32). */
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

export interface ParticlesBrickOptions {
  id?: string;
  count?: number;
  color: string;
  minRadius?: number;
  maxRadius?: number;
  opacity?: number;
  /** "uniform" fills evenly; "upper" concentrates in top 60%; "ring" around cx/cy */
  distribution?: "uniform" | "upper" | "lower" | "ring";
  ringCx?: number;
  ringCy?: number;
  ringR?: number;
  ringSpread?: number;
}

/** A field of glowing dots — like stars, but with a configurable color (dust, embers, plankton) */
export function particlesBrick(params: BrickParams, options: ParticlesBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 960;
  const {
    count = 200,
    color,
    minRadius = 1,
    maxRadius = 3,
    opacity = 0.7,
    distribution = "uniform",
    ringCx = 0.5,
    ringCy = 0.5,
    ringR = 0.35,
    ringSpread = 0.08,
    id = "particles",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-particles`));
  const defs: string[] = [];
  const elems: string[] = [];

  // Glow halo gradient — one shared gradient, used by all particles
  const haloId = `${id}-halo`;
  defs.push(`<radialGradient id="${haloId}" cx="50%" cy="50%" r="50%">
  <stop offset="0%" stop-color="${color}" stop-opacity="0.85"/>
  <stop offset="35%" stop-color="${color}" stop-opacity="0.45"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</radialGradient>`);

  for (let i = 0; i < count; i++) {
    let px: number;
    let py: number;

    if (distribution === "upper") {
      px = rng() * width;
      py = rng() * height * 0.6;
    } else if (distribution === "lower") {
      px = rng() * width;
      py = height * 0.4 + rng() * height * 0.6;
    } else if (distribution === "ring") {
      const angle = rng() * Math.PI * 2;
      const spread = (rng() - 0.5) * 2 * ringSpread * scale;
      const r = ringR * scale + spread;
      px = ringCx * width + Math.cos(angle) * r;
      py = ringCy * height + Math.sin(angle) * r;
    } else {
      px = rng() * width;
      py = rng() * height;
    }

    // Scale particle size with canvas — minimum 1.2px so they're never sub-pixel
    const r = (minRadius + rng() * (maxRadius - minRadius)) * sc;
    const isLuminous = rng() < 0.35; // 35% have a halo (brighter "lit" particles)
    const alpha = (0.5 + rng() * 0.5) * opacity;

    if (isLuminous) {
      // Soft halo first, then crisp core
      const haloR = r * 3.2;
      elems.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${haloR.toFixed(1)}" fill="url(#${haloId})" opacity="${(alpha * 0.55).toFixed(3)}"/>`
      );
      elems.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${alpha.toFixed(3)}"/>`
      );
    } else {
      // Plain dim particle — adds count without overwhelming the scene
      elems.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${(alpha * 0.6).toFixed(3)}"/>`
      );
    }
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}

export interface SparksBrickOptions {
  id?: string;
  count?: number;
  color: string;
  opacity?: number;
  /** Rising direction: 1 = up, -1 = down */
  direction?: 1 | -1;
  /** Fraction of width for the source zone centre */
  sourceCx?: number;
  sourceSpread?: number;
  /** Y position of spark source as fraction of height (default: 0.85 rising / 0.15 falling) */
  sourceCy?: number;
  /** Multiplier for trail length — >1 makes sparks rise/fall farther across the canvas */
  lengthScale?: number;
}

/** Rising or falling spark trails — embers/cinders with curved trajectory + bright head */
export function sparksBrick(params: BrickParams, options: SparksBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);
  const sc = scale / 960;
  const {
    count = 80,
    color,
    opacity = 0.6,
    direction = 1,
    sourceCx = 0.5,
    sourceSpread = 0.4,
    sourceCy,
    lengthScale = 1.0,
    id = "sparks",
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-sparks`));
  const defs: string[] = [];
  const elems: string[] = [];

  // Soft glow filter — used by the head dot of each spark
  const headGlowId = `${id}-glow`;
  defs.push(
    `<filter id="${headGlowId}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${(1.6 * sc).toFixed(1)}"/></filter>`
  );

  // Per-spark gradient (head bright → tail transparent)
  const defaultSourceCy = direction === 1 ? 0.85 : 0.15;
  const baseY = (sourceCy ?? defaultSourceCy) * height;

  for (let i = 0; i < count; i++) {
    const x0 = (sourceCx - sourceSpread / 2 + rng() * sourceSpread) * width;
    const y0 = baseY + (rng() - 0.5) * height * 0.16;
    // Trajectory: longer for some sparks (high-energy ones rise farther)
    const len = (18 + rng() * 70) * sc * lengthScale;
    // Curved trajectory — quadratic Bezier with control point offset for arc
    const arcX = (rng() - 0.5) * 18 * sc;
    const driftX = (rng() - 0.5) * 14 * sc;
    const headX = x0 + driftX;
    const headY = y0 - direction * len;
    const ctrlX = x0 + arcX;
    const ctrlY = y0 - direction * len * 0.55;

    const sparkOp = (0.55 + rng() * 0.45) * opacity;
    const trailW = (0.8 + rng() * 1.2) * sc;
    const headR = (1.1 + rng() * 1.4) * sc;

    // Per-spark linear gradient — bright at head, fading to tail
    const gid = `${id}-g${i}`;
    defs.push(
      `<linearGradient id="${gid}" x1="${headX.toFixed(1)}" y1="${headY.toFixed(1)}" x2="${x0.toFixed(1)}" y2="${y0.toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${color}" stop-opacity="${sparkOp.toFixed(3)}"/>
  <stop offset="40%" stop-color="${color}" stop-opacity="${(sparkOp * 0.6).toFixed(3)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`
    );

    // Curved trail (quadratic Bezier) with gradient fade
    elems.push(
      `<path d="M ${x0.toFixed(1)},${y0.toFixed(1)} Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${headX.toFixed(1)},${headY.toFixed(1)}" fill="none" stroke="url(#${gid})" stroke-width="${trailW.toFixed(2)}" stroke-linecap="round"/>`
    );
    // Bright glowing head dot
    elems.push(
      `<circle cx="${headX.toFixed(1)}" cy="${headY.toFixed(1)}" r="${(headR * 1.6).toFixed(2)}" fill="${color}" opacity="${(sparkOp * 0.55).toFixed(3)}" filter="url(#${headGlowId})"/>`
    );
    elems.push(
      `<circle cx="${headX.toFixed(1)}" cy="${headY.toFixed(1)}" r="${headR.toFixed(2)}" fill="${color}" opacity="${sparkOp.toFixed(3)}"/>`
    );
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">\n${elems.join("\n")}\n</g>`,
  };
}
