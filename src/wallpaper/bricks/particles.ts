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

/** A field of small circles — stars, dust, or sparks */
export function particlesBrick(params: BrickParams, options: ParticlesBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
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
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-particles`));
  const circles: string[] = [];

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
      const spread = (rng() - 0.5) * 2 * ringSpread * Math.max(width, height);
      const r = ringR * Math.max(width, height) + spread;
      px = ringCx * width + Math.cos(angle) * r;
      py = ringCy * height + Math.sin(angle) * r;
    } else {
      px = rng() * width;
      py = rng() * height;
    }

    const r = minRadius + rng() * (maxRadius - minRadius);
    const alpha = (0.3 + rng() * 0.7) * opacity;
    circles.push(
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${alpha.toFixed(3)}"/>`
    );
  }

  return {
    elements: `<g id="${options.id ?? "particles"}">\n${circles.join("\n")}\n</g>`,
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
}

/** Rising or falling spark lines — for ember/volcanic effects */
export function sparksBrick(params: BrickParams, options: SparksBrickOptions): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const {
    count = 80,
    color,
    opacity = 0.6,
    direction = 1,
    sourceCx = 0.5,
    sourceSpread = 0.4,
  } = options;

  const rng = seedRng(hashStr(`${seedId}-${harmonyMode}-sparks`));
  const lines: string[] = [];
  const baseY = direction === 1 ? height * 0.85 : height * 0.15;

  for (let i = 0; i < count; i++) {
    const x = (sourceCx - sourceSpread / 2 + rng() * sourceSpread) * width;
    const y1 = baseY + (rng() - 0.5) * height * 0.3;
    const len = (5 + rng() * 25) * (height / 2160);
    const y2 = y1 - direction * len;
    const alpha = (0.3 + rng() * 0.7) * opacity;
    const sw = 0.5 + rng() * 1.5;
    lines.push(
      `<line x1="${x.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${sw.toFixed(2)}" opacity="${alpha.toFixed(3)}"/>`
    );
  }

  return {
    elements: `<g id="${options.id ?? "sparks"}">\n${lines.join("\n")}\n</g>`,
  };
}
