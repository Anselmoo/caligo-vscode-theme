/**
 * Celestial composition bricks — high-fidelity composed celestial elements.
 *
 * Each brick in this file is itself a multi-layer composition rather than
 * a single SVG primitive. The principle: every visible phenomenon in nature
 * is a composition of many overlapping, interacting structures.
 *
 * solarCoronaBrick — photorealistic solar eclipse corona:
 *   · 80-100 organic rays (variable length, width, opacity, curvature)
 *   · Turbulence-displaced inner corona halo (not a perfect circle)
 *   · 3-5 long asymmetric coronal streamers
 *   · Diamond ring flash (optional intense bright bead at limb)
 *   · No circle strokes — corona brightness emerges from ray density
 */

import type { BrickOutput, BrickParams } from "../types.js";

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

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

function fmt(n: number, d = 1): string {
  return n.toFixed(d);
}

// ── Solar Corona Brick ───────────────────────────────────────────────────────

export interface SolarCoronaBrickOptions {
  id?: string;
  /** Eclipse center (fractions of canvas) */
  cx?: number;
  cy?: number;
  /** Moon blocking-body radius as fraction of canvas max dimension */
  moonR?: number;
  /** Primary corona color — warm outer corona (e.g. colors.hueOrange) */
  color: string;
  /** Inner corona color — hotter, brighter (e.g. colors.hueYellow) */
  innerColor?: string;
  /** Number of corona ray filaments (default 90) */
  rayCount?: number;
  /** Max corona reach as multiple of moonR (default 7) */
  extent?: number;
  /**
   * Diamond ring bead angle in degrees (0=right, 90=down).
   * Pass null to disable. Represents the Baily's bead / first/last contact flash.
   */
  diamondAngleDeg?: number | null;
  /** Diamond ring color — near-white hot (default "#fff8e0") */
  diamondColor?: string;
  /**
   * Displacement scale for inner corona turbulence, as fraction of moonR pixel size.
   * Higher = more organic, less circular inner glow. (default 0.22)
   */
  turbulenceStrength?: number;
  seed?: number;
}

/**
 * Photorealistic solar eclipse corona — a full composition of:
 * - Multi-layer inner corona glow (turbulence-displaced, not a circle)
 * - 90 organic ray filaments (variable length/width/opacity/curvature)
 * - 4 long asymmetric coronal streamers
 * - Optional diamond ring bead with diffraction spikes
 *
 * Call this brick BEFORE drawing the moon disk (celestialBrick), so the moon
 * naturally occludes the inner corona.
 */
export function solarCoronaBrick(
  params: BrickParams,
  options: SolarCoronaBrickOptions
): BrickOutput {
  const { viewBox, seedId, harmonyMode } = params;
  const { width, height } = viewBox;
  const scale = Math.max(width, height);

  const {
    cx = 0.5,
    cy = 0.38,
    moonR = 0.065,
    color,
    innerColor,
    rayCount = 90,
    extent = 7,
    diamondAngleDeg = 50,
    diamondColor = "#fff8e0",
    turbulenceStrength = 0.22,
    seed,
  } = options;

  const id = options.id ?? "solar-corona";
  const ic = innerColor ?? color;
  const px = cx * width;
  const py = cy * height;
  const pr = moonR * scale; // moon radius in px
  const rng = seedRng(seed ?? (hashStr(`${seedId}-${harmonyMode}-corona`) % 997) + 1);

  const defs: string[] = [];
  const elems: string[] = [];

  // ── 1. Inner corona halo — turbulence-displaced radial gradient ───────────
  //
  // Three overlapping halos at slightly offset centers, each with a radial
  // gradient transitioning from hot inner color outward. Combined through a
  // feDisplacementMap driven by fractalNoise → breaks circular symmetry.

  const haloOffsets = [
    { dx: pr * 0.04, dy: -pr * 0.06, r: pr * 2.8, op: 0.55, color: ic },
    { dx: -pr * 0.08, dy: pr * 0.03, r: pr * 3.4, op: 0.38, color: color },
    { dx: pr * 0.02, dy: pr * 0.05, r: pr * 4.2, op: 0.22, color: color },
  ];

  const turbSeed = Math.floor(rng() * 89) + 1;
  const turbScale = fmt(pr * turbulenceStrength);

  for (let hi = 0; hi < haloOffsets.length; hi++) {
    const h = haloOffsets[hi];
    const hcx = px + h.dx;
    const hcy = py + h.dy;
    const hid = `${id}-h${hi}`;
    const hfid = `${id}-hf${hi}`;

    defs.push(
      `<radialGradient id="${hid}" cx="${fmt(hcx)}" cy="${fmt(hcy)}" r="${fmt(h.r)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${h.color}" stop-opacity="${h.op.toFixed(2)}"/>
  <stop offset="30%" stop-color="${h.color}" stop-opacity="${(h.op * 0.55).toFixed(2)}"/>
  <stop offset="65%" stop-color="${h.color}" stop-opacity="${(h.op * 0.18).toFixed(2)}"/>
  <stop offset="100%" stop-color="${h.color}" stop-opacity="0"/>
</radialGradient>
<filter id="${hfid}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="linearRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${(0.018 + hi * 0.005).toFixed(3)}" numOctaves="4" seed="${turbSeed + hi}" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="${turbScale}" xChannelSelector="R" yChannelSelector="G"/>
</filter>`
    );
    elems.push(
      `<circle cx="${fmt(hcx)}" cy="${fmt(hcy)}" r="${fmt(h.r)}" fill="url(#${hid})" filter="url(#${hfid})"/>`
    );
  }

  // ── 2. Organic corona ray filaments ──────────────────────────────────────
  //
  // ~90 rays with:
  //   - Angle jitter: ±18° so rays clump naturally
  //   - Bimodal length: 15% are "streamers" (3-8×), rest are "filaments" (0.4-2×)
  //   - Width: thin for filaments (0.8-3px scaled), broad for streamers (4-18px)
  //   - Opacity: inversely proportional to length
  //   - Curvature: slight quadratic bezier bend (±15°)
  //   - Start: just outside moonR × 1.015 to avoid visible gap

  const rayPaths: string[] = [];
  for (let i = 0; i < rayCount; i++) {
    const baseAngle = (i / rayCount) * Math.PI * 2;
    const jitter = (rng() - 0.5) * 0.62; // ±~18°
    const angle = baseAngle + jitter;

    const isStreamer = rng() < 0.13;
    const lengthFactor = isStreamer ? 3.0 + rng() * 5.0 : 0.4 + rng() * 1.6;
    const rayLen = pr * lengthFactor;
    const sw = isStreamer
      ? ((4 + rng() * 14) * scale) / 3840
      : ((0.8 + rng() * 2.2) * scale) / 3840;
    const baseOp = isStreamer ? 0.025 + rng() * 0.055 : 0.08 + rng() * 0.17;
    const op = Math.min(0.38, baseOp / (1 + lengthFactor * 0.12));

    const startR = pr * 1.015;
    const x1 = px + Math.cos(angle) * startR;
    const y1 = py + Math.sin(angle) * startR;

    // Slight quadratic curve — control point bent ±10°
    const bendAngle = angle + (rng() - 0.5) * 0.34;
    const midR = startR + rayLen * 0.5;
    const qx = px + Math.cos(bendAngle) * midR;
    const qy = py + Math.sin(bendAngle) * midR;

    const x2 = px + Math.cos(angle) * (startR + rayLen);
    const y2 = py + Math.sin(angle) * (startR + rayLen);

    rayPaths.push(
      `<path d="M${fmt(x1)},${fmt(y1)} Q${fmt(qx)},${fmt(qy)} ${fmt(x2)},${fmt(y2)}" stroke="${isStreamer ? color : ic}" stroke-width="${sw.toFixed(2)}" opacity="${op.toFixed(3)}" fill="none" stroke-linecap="round"/>`
    );
  }

  // ── 3. Long coronal streamers (helmet streamer belt) ─────────────────────
  //
  // 3-4 prominent long streams extending 6-10 solar radii. Wider at base,
  // tapering to near-zero width. Asymmetrically placed — real corona has a
  // "streamer belt" concentrated along the ecliptic.

  const streamerAngles = [
    rng() * Math.PI * 0.4 - 0.2, // ~0° ± 11°
    Math.PI * 0.5 + rng() * 0.5 - 0.25, // ~90° band
    Math.PI + rng() * 0.4 - 0.2, // ~180° ± 11°
    Math.PI * 1.5 + rng() * 0.5 - 0.25, // ~270° band
  ];

  const streamerFiltId = `${id}-sf`;
  defs.push(
    `<filter id="${streamerFiltId}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${fmt(pr * 0.04)}"/></filter>`
  );

  for (let si = 0; si < 3; si++) {
    const sa = streamerAngles[si];
    const sLen = pr * (extent * 0.8 + rng() * pr * 0.5);
    const baseWidth = ((6 + rng() * 14) * scale) / 3840;
    const sOp = 0.04 + rng() * 0.06;
    const sx1 = px + Math.cos(sa) * pr * 1.2;
    const sy1 = py + Math.sin(sa) * pr * 1.2;
    const sx2 = px + Math.cos(sa) * sLen;
    const sy2 = py + Math.sin(sa) * sLen;
    elems.push(
      `<line x1="${fmt(sx1)}" y1="${fmt(sy1)}" x2="${fmt(sx2)}" y2="${fmt(sy2)}" stroke="${color}" stroke-width="${baseWidth.toFixed(2)}" opacity="${sOp.toFixed(3)}" stroke-linecap="round" filter="url(#${streamerFiltId})"/>`
    );
  }

  // Add all ray filaments as a group
  elems.push(`<g id="${id}-rays">\n${rayPaths.join("\n")}\n</g>`);

  // ── 4. Diamond ring bead (Baily's bead / first contact flash) ────────────
  //
  // An intense bright point where the last sliver of solar photosphere
  // peeks past a lunar valley. Creates a star-burst spike pattern and
  // an extremely bright local glow.

  if (diamondAngleDeg !== null && diamondAngleDeg !== undefined) {
    const da = (diamondAngleDeg * Math.PI) / 180;
    const dbx = px + Math.cos(da) * pr;
    const dby = py + Math.sin(da) * pr;
    const dbid = `${id}-db`;
    const dspike = `${id}-dsp`;
    const dglow = `${id}-dg`;

    // Soft glow behind the bead
    defs.push(
      `<radialGradient id="${dglow}" cx="${fmt(dbx)}" cy="${fmt(dby)}" r="${fmt(pr * 0.45)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="${diamondColor}" stop-opacity="0.95"/>
  <stop offset="35%" stop-color="${diamondColor}" stop-opacity="0.45"/>
  <stop offset="100%" stop-color="${diamondColor}" stop-opacity="0"/>
</radialGradient>`
    );
    elems.push(
      `<circle cx="${fmt(dbx)}" cy="${fmt(dby)}" r="${fmt(pr * 0.45)}" fill="url(#${dglow})"/>`
    );

    // White-hot core bead
    elems.push(
      `<circle id="${dbid}" cx="${fmt(dbx)}" cy="${fmt(dby)}" r="${fmt(pr * 0.05)}" fill="${diamondColor}" opacity="0.98"/>`
    );

    // Diffraction spikes — 6 spike lines from the bead
    const spikeCount = 6;
    const spikePaths: string[] = [];
    for (let si = 0; si < spikeCount; si++) {
      const sa = (si / spikeCount) * Math.PI * 2 + da;
      const sLen = pr * (0.3 + rng() * 0.5);
      const sw = ((1.5 + rng() * 2) * scale) / 3840;
      const sOp = 0.55 + rng() * 0.35;
      const sx2 = dbx + Math.cos(sa) * sLen;
      const sy2 = dby + Math.sin(sa) * sLen;
      spikePaths.push(
        `<line x1="${fmt(dbx)}" y1="${fmt(dby)}" x2="${fmt(sx2)}" y2="${fmt(sy2)}" stroke="${diamondColor}" stroke-width="${sw.toFixed(2)}" opacity="${sOp.toFixed(2)}" stroke-linecap="round"/>`
      );
    }
    const spikeFiltId = `${dspike}-f`;
    defs.push(
      `<filter id="${spikeFiltId}"><feGaussianBlur stdDeviation="${fmt(pr * 0.006)}"/></filter>`
    );
    elems.push(`<g id="${dspike}" filter="url(#${spikeFiltId})">\n${spikePaths.join("\n")}\n</g>`);
  }

  return {
    defs: defs.join("\n"),
    elements: elems.join("\n"),
  };
}
