/**
 * VoidEmber — a lava planet at night (Mustafar-like), generated as a world
 * and photographed through one camera (the 3D method of mandarian.ts).
 *
 * Concept: weathered black volcanic towers stand in a smoky red night. A lava
 * river winds DIAGONALLY out of the far centre-left valley toward the near
 * right, and right of centre a lava fall pours over a rock ledge into a
 * plunge pool: the brightest thing in the frame. The lava is the light.
 *
 * World (x right, y up, z away; units ~ metres × 10):
 *   · A volcanic height field z 3–220: a low, rough basalt plain (calm and
 *     dark under the bottom-left text pill), clustered towers (convex flanks,
 *     height ∝ 1 − t^p, softly capped by a tilted plane so the tops are
 *     broken and blunt, never needles; domain-warped and notched outlines,
 *     a small ragged crest, a straight talus apron, a slight lean), a far
 *     range of varied heights across the whole view so the horizon is never
 *     ruler-straight or a row of teeth, a broad near-left monolith whose top
 *     sits inside the monitor frame (and wholly outside the portrait one),
 *     and a ledge ~7.7 high whose front
 *     face sits at z ≈ 30.6 (the fall's lip at 7.4).
 *   · Lava channels carved into it: the main river, a pool at the foot of
 *     the fall and a thin far-left tributary. The main river is painted per
 *     depth band as smooth pieces between the exact bank crossings (as
 *     Mandarian's water), its flow lines sheared along the river's smooth
 *     centre line, a gradient shared by neighbouring pieces while it still
 *     fits (fewer elements); the tributary uses the slice surface.
 *   · The falls are soft glowing sheets laid on the true rock face (found
 *     by bisection on the height field): a broad glow, a hot body and a
 *     narrow core whose widths wander with seeded low-frequency noise and
 *     whose brightness pulses slowly along the flow, softened sideways by
 *     one blur restricted to the fall's own box; the foot dissolves into a
 *     lit steam volume, with a steam plume and a few sparks above.
 *   · The sky: a wine-black void at the zenith, a low smoky glow behind the
 *     spires, and formless smoke volumes in world space, lit from below by
 *     their distance to the lava.
 *
 * Camera: eye 4 (on a ledge above the river), horizon 0.55; landscape focal
 * 0.7·H; portrait focal W/(2·0.75) with cx set so the fall sits at 0.55 W.
 *
 * Light, both derived from geometry:
 *   (a) backlight from the low smoky horizon behind the spires (Lambert on
 *       the true normal), so faces toward the viewer stay black and the
 *       silhouettes read crisp against the red sky;
 *   (b) emission from the lava: Σ I·e^(−d/r)·max(0, n·toLava) with d the
 *       distance to the nearest lava edge. Lower flanks facing a channel glow
 *       orange-red, upper flanks fall to black, with a crisp terminator.
 *
 * Atmosphere: opaque dark red-brown smoke, haze 1 − e^(−z/32), capped 0.72.
 * Lava is emissive, so its colour is pre-lifted inside `surface` to lose
 * only part of its contrast to the haze (emission is attenuated, not hidden).
 *
 * Rendering: a private copy of scene3d.terrainSlices (`slicesVE`) with eight
 * measured fixes, documented at its definition and worth promoting. maxBand
 * is 5 px over z 9–35 (river, banks, lit flanks), 5.5 px to z 90, 6.5 px on
 * the near plain and 7 px far; where one candidate step already exceeds it
 * on a lit face, extra candidates are inserted (fix 8). Gradient stops are
 * chosen by the error of the drawn ramp over the visible samples (fix 7),
 * tolerance 0.015 OKLab (x1.25 mid, x2 dark rock). Budget: the triadic
 * monitor render is the largest (~26.5k elements of 30k).
 *
 * Review round 3D1 (fixes, each traced to its cause by a crop):
 *   · river "comb hatching": a flat run of equal gradient stops lost its
 *     last stop, so a hot band ended early in one piece and not the next;
 *   · bank saw: stops only on the 8.6 px sample grid, so each slice ramped
 *     from lava to bank colour at a different point (fix 6: exact stops);
 *   · witch-hat spires and the off-frame curtain monolith: see World.
 *
 * Review round 3D2 (3D2-01; causes traced with elementsFromPoint on the
 * slice gradients and by evaluating the height field and the shading):
 *   · stacked contour lines and the dark "S" on the right flank: the old
 *     greedy stop rule dropped a narrow lit rim in one slice and kept it in
 *     the next, so neighbouring bands alternated at one x; fix 7 bounds the
 *     ramp error instead (and frees ~20 % of the elements, since run-end
 *     pins are no longer needed);
 *   · a lit loop left after that fix: domain-warp flutes on the steep front
 *     face of the near tower at (14.1, 13.0), rim-lit by the backlight and
 *     lit on their left sides by the river through the FINE normal; the
 *     lava light now uses the form normal (finite difference over ±0.7),
 *     the warp is calmer on the lower 40 % of each tower and the talus
 *     blends in over 0.15 h;
 *   · contour rings on the fall's ledge: adjacent candidates 16–26 px apart
 *     on the steep lit face (z ≈ 31), beyond any maxBand; fix 8;
 *   · the striped lava fall: seven constant-width hard-edged layers and two
 *     parallel core strands, rebuilt as the soft sheet above (also the far
 *     fall at x ≈ 700, which shares it).
 *
 * Lava revision (user, 2026-10-21: "bei void bitte Lava noch optimieren",
 * "hier zählt Qualität"). The river read as a smooth pink tube; now:
 *   · Temperature ramp like a black body — crust → deep red → warm ember →
 *     orange-yellow → pale yellow-white. The hot end leans to the palette's
 *     yellowest warm colour (warmYellowOf), so the core is never pink when
 *     the palette has a yellow; in modes without one the lava stays pink by
 *     design (hue is free per mode, lightness is guarded).
 *   · A hot thread down the flow, whose line, width and strength wander with
 *     slow noise, so it is not a tube of constant brightness.
 *   · Crust plates: irregular blotches of two warped noise octaves with a
 *     soft threshold (cellular plates read as tiles or honeycomb), more of
 *     them toward the banks and in cooler flow, each plate with its own
 *     temperature and faint glowing cracks (cellular borders, weak).
 *   · Resolution where the plates are: 48 samples across the wide river and
 *     2.5 px depth bands up to z 35, so an edge across the flow does not step
 *     between bands; stops are pruned by ramp error, not by equality.
 *   · Stronger emission onto the rock (river intensity 1.1, falloff 4.8).
 *   Cost: ~5.6 MB and ~63k elements on the monitor, ~2 s Chromium render,
 *   inside the raised budget (10 MB / 80k).
 *
 * Personal touch (the "last coal" of the earlier scene): sparks climbing from
 * the foot of the fall toward the glowing smoke, and one tiny far lava fall
 * deep in the left valley, almost lost in the haze.
 */
import { clampChroma, converter, formatHex, oklch } from "culori";
import { mergeBricks } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";
import {
  type Camera,
  hazeAt,
  norm3,
  project,
  relPath,
  simplify,
  type V3,
  valueNoise2D,
} from "./scene3d.js";
import {
  fbm1D,
  grainBrick,
  keepLightness,
  mix,
  n,
  palest,
  rngFrom,
  shade,
  smoothPath,
  starField,
  tone,
} from "./shared.js";

interface Pt {
  x: number;
  y: number;
}

// ─── Small private helpers ───────────────────────────────────────────────────

/**
 * Cellular (Worley) noise on a jittered grid: returns F2 − F1, the distance
 * between the nearest and second-nearest feature point. It is 0 on the
 * border between two cells and grows toward a cell's middle — crust plates
 * with seams between them. Deterministic from `seed`; no RNG stream used.
 */
function cellular(x: number, y: number, seed: number): { e: number; id: number } {
  const hash = (i: number, j: number, k: number) => {
    let h = (i * 374761393 + j * 668265263 + seed * 2147483647 + k * 1274126177) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i + 0.15 + 0.7 * hash(ix + i, iy + j, 1);
      const cy = iy + j + 0.15 + 0.7 * hash(ix + i, iy + j, 2);
      const d = Math.hypot(x - cx, y - cy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash(ix + i, iy + j, 3);
      } else if (d < f2) f2 = d;
    }
  return { e: f2 - f1, id };
}

/**
 * The palette colour closest to a warm yellow-orange (hue ≈ 75) with some
 * chroma: the hot end of the lava's temperature ramp. Falls back to the
 * first candidate if the palette has no warm hue at all.
 */
function warmYellowOf(cs: string[]): string {
  let best = cs[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const c of cs) {
    const o = oklch(c);
    if (!o || (o.c ?? 0) < 0.06) continue;
    const dh = Math.abs((((o.h ?? 0) - 75 + 540) % 360) - 180);
    const score = dh - (o.c ?? 0) * 40;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * Ember colour by value and role, not by slot name: the palette colour whose
 * hue sits closest to a warm red-orange with enough chroma to glow. In modes
 * without a red this lands on pink, which still reads as fire.
 */
function emberOf(cs: string[]): string {
  let best = cs[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const c of cs) {
    const o = oklch(c);
    if (!o || (o.c ?? 0) < 0.15) continue;
    const dh = Math.abs((((o.h ?? 0) - 30 + 540) % 360) - 180);
    const score = dh - (o.c ?? 0) * 60;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

const toLab = converter("oklab") as (c: string) => { l: number; a: number; b: number } | undefined;

/**
 * Push `col` away from `from` by factor f in OKLab (f > 1 extrapolates), with
 * lightness capped and chroma clamped to the display gamut. Used to pre-lift
 * emissive lava so the constant slice haze removes only part of its glow.
 */
function lift(col: string, from: string, f: number, maxL: number): string {
  const a = toLab(col);
  const b = toLab(from);
  if (!a || !b) return col;
  const l = Math.min(maxL, b.l + (a.l - b.l) * f);
  return formatHex(
    clampChroma({ mode: "oklab", l, a: b.a + (a.a - b.a) * f, b: b.b + (a.b - b.b) * f }, "oklch")
  );
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Polynomial smooth maximum: max(a, b) with a rounded joint of width k. */
const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + (h * h * k) / 4;
};
/** Polynomial smooth minimum (a rounded crease where a cap meets a flank). */
const smin = (a: number, b: number, k: number) => -smax(-a, -b, k);

/** Catmull-Rom (Hermite) curve through [z, x] keys sorted by z, evaluated at z. */
function curveAt(keys: Array<[number, number]>, z: number): number {
  const last = keys.length - 1;
  if (z <= keys[0][0]) return keys[0][1];
  if (z >= keys[last][0]) return keys[last][1];
  let i = 0;
  while (i < last - 1 && z > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)];
  const p1 = keys[i];
  const p2 = keys[i + 1];
  const p3 = keys[Math.min(last, i + 2)];
  const dz = p2[0] - p1[0];
  const t = (z - p1[0]) / dz;
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0])) * dz;
  const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0])) * dz;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * p1[1] +
    (t3 - 2 * t2 + t) * m1 +
    (-2 * t3 + 3 * t2) * p2[1] +
    (t3 - t2) * m2
  );
}

/** A soft radial volume (formless: no outline, opacity falls to 0). */
function softBlob(
  id: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  col: string,
  op: number,
  mid = 0.45
): { def: string; el: string } {
  return {
    def: `<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientTransform="translate(0 ${n(cy * (1 - ry / rx))}) scale(1 ${n(ry / rx, 3)})" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}" stop-opacity="${n(op, 3)}"/><stop offset="${n(mid, 2)}" stop-color="${col}" stop-opacity="${n(op * 0.42, 3)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`,
    el: `<rect x="${n(cx - rx)}" y="${n(cy - ry)}" width="${n(rx * 2)}" height="${n(ry * 2)}" fill="url(#${id})"/>`,
  };
}

// ─── Depth slices: private copy of scene3d.terrainSlices with two fixes ─────
//
// Measured on this scene (pale spires and bright horizontal stripes on the
// plain; `elementsFromPoint` + the slice gradient showed a stop at x −154
// followed by a lava stop at x 2306): the shared version picks slices greedily
// and checks only the band between the current slice and the candidate, so a
// thin spire peak that lies BETWEEN two kept slices is dropped — and the
// envelope used to push hidden outline runs down still contains that peak,
// so the farther slice is cut away where nothing nearer paints. Fixes:
//   1. selection also breaks when any skipped candidate rises above both kept
//      neighbours by more than 1 px (peaks are kept, crests do not alias);
//   2. hidden-run push-down and visibility use the envelope of KEPT slices.
//   3. a visible run that ends at a hidden gap gets a closing stop (and the
//      first sample after a gap an opening one) — without them the gradient
//      interpolates across the gap and paints a ramp over whatever is
//      visible there (pale "plexiglass" spires, bright stripes on the plain).
// Worth promoting to scene3d.ts (it is read-only for scene builders).

interface SliceProfileVE {
  index: number;
  z: number;
  zNext: number;
  xs: number[];
  hs: number[];
  pts: Pt[];
  visible: boolean[];
}

const toLabC = converter("oklab") as (c: string) => { l: number; a: number; b: number } | undefined;
const labCache = new Map<string, [number, number, number]>();
function labOf(c: string): [number, number, number] {
  let v = labCache.get(c);
  if (!v) {
    const o = toLabC(c);
    v = [o?.l ?? 0, o?.a ?? 0, o?.b ?? 0];
    labCache.set(c, v);
  }
  return v;
}
const colourDist = (a: string, b: string) => {
  const A = labOf(a);
  const B = labOf(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
};

const PEAK = 2; // px a skipped candidate may rise above its kept neighbours
function slicesVE(o: {
  id: string;
  cam: Camera;
  atm: { haze: string; visibility: number; max?: number };
  height: (x: number, z: number) => number;
  surface: (lam: number, x: number, z: number, h: number, nrm: V3) => string;
  light: V3;
  zNear: number;
  zFar: number;
  candidates: number;
  maxBand: (z: number) => number;
  /**
   * Per world point, how much taller than maxBand a band may be there (≥ 1).
   * A band only shows where its colour differs from what lies below it; on
   * dark rock far from any light a tall band is invisible and only costs a
   * slice. Defaults to 1 everywhere.
   */
  bandScale?: (x: number, z: number) => number;
  samples: number;
  tolerance: number;
  /** Level of a flat liquid surface: its edge is located exactly (fix 4). */
  floor?: number;
  after?: (s: SliceProfileVE) => string;
}): { defs: string; elements: string } {
  const { cam } = o;
  const L = norm3(o.light);
  const S = o.samples;
  const eps = 0.02;
  const C0 = o.candidates;
  const profileAt = (z: number) => {
    // Fix 5: the world x under the frame centre is (0.5 − cx)·W/focal·z.
    // The shared version uses (cx − 0.5): with a re-centred portrait camera
    // (cx ≠ 0.5) the slices missed one edge of the frame (a bare strip).
    const half = ((cam.W * 0.54) / cam.focal) * z;
    const xc = (0.5 - (cam.cx ?? 0.5)) * (cam.W / cam.focal) * z;
    const xs: number[] = [];
    const hs: number[] = [];
    const pts: Pt[] = [];
    for (let k = 0; k <= S; k++) {
      const x = xc - half + (2 * half * k) / S;
      const h = o.height(x, z);
      xs.push(x);
      hs.push(h);
      pts.push(project(cam, [x, h, z]));
    }
    return { xs, hs, pts };
  };
  const invZ = (i: number) => 1 / o.zFar + (1 / o.zNear - 1 / o.zFar) * (i / C0);
  const base = Array.from({ length: C0 + 1 }, (_, i) => profileAt(1 / invZ(i)));
  // Fix 8 (review 3D2-01): candidates are refined where one candidate step
  // already exceeds maxBand. Uniform steps in 1/z suit ground, but on a
  // steep face turned toward the viewer the contour drops by
  // slope·z·f·Δ(1/z) per step: on the fall's ledge (z ≈ 31) adjacent
  // candidates lay 16–26 px apart at 3840 wide (probed: slices z 31.63,
  // 31.52, 31.41 …), so no choice of maxBand could keep the bands small and
  // the lit edge beside the fall stepped down the face as contour rings.
  // Between such neighbours up to SUB − 1 extra candidates are inserted
  // (uniform in 1/z); the selection below then keeps them only where they
  // are seen.
  const SUB = 4;
  const L0 = norm3(o.light);
  const shadeAt = (x: number, z: number, h: number) => {
    const e0 = 0.02 * z;
    const dx = (o.height(x + e0, z) - o.height(x - e0, z)) / (2 * e0);
    const dz = (o.height(x, z + e0) - o.height(x, z - e0)) / (2 * e0);
    const nrm = norm3([-dx, 1, -dz]);
    const lam = Math.max(0, nrm[0] * L0[0] + nrm[1] * L0[1] + nrm[2] * L0[2]);
    return mix(o.surface(lam, x, z, h, nrm), o.atm.haze, hazeAt(o.atm, z));
  };
  const zs: number[] = [];
  const prof: Array<{ xs: number[]; hs: number[]; pts: Pt[] }> = [];
  for (let i = 0; i <= C0; i++) {
    const zi = 1 / invZ(i);
    zs.push(zi);
    prof.push(base[i]);
    if (i === C0) break;
    // Only where the band is too tall AND the two colours that meet across
    // it differ: a dark backlit face tolerates tall bands (unseen), a face
    // lit by the lava does not. Most steep faces are dark, so this keeps the
    // element budget.
    const mb = o.maxBand(zi);
    let band = 0;
    for (let k = 0; k <= S; k++) {
      const a = base[i].pts[k];
      const d = base[i + 1].pts[k].y - a.y;
      if (d <= Math.max(mb, band) || a.y >= cam.H) continue;
      const zn = 1 / invZ(i + 1);
      const c1 = shadeAt(base[i].xs[k], zi, base[i].hs[k]);
      const c2 = shadeAt(base[i + 1].xs[k], zn, base[i + 1].hs[k]);
      if (colourDist(c1, c2) > 2 * o.tolerance * (labOf(c1)[0] < 0.15 ? 2 : 1)) band = d;
    }
    const m = Math.min(SUB, Math.ceil(band / mb));
    for (let j = 1; j < m; j++) {
      const z = 1 / (invZ(i) + ((invZ(i + 1) - invZ(i)) * j) / m);
      zs.push(z);
      prof.push(profileAt(z));
    }
  }
  const C = zs.length - 1;
  const env: number[][] = new Array(C + 1);
  env[C] = new Array(S + 1).fill(cam.H);
  for (let i = C - 1; i >= 0; i--)
    env[i] = env[i + 1].map((e, k) => Math.min(e, prof[i + 1].pts[k].y));

  // Greedy selection with the peak guard (fix 1), colour-aware (fix 9).
  // A band's colour is constant downward, so a tall band only shows where
  // the surface colour really changes across it. Where the geometric band is
  // too tall, the colours of the two slices meeting there are compared
  // (computed lazily, cached per candidate and sample); if they agree within
  // the tolerance the band is accepted. Large dark faces and the plain then
  // stop forcing a slice every few px, while lit rims and lava-lit flanks
  // keep their thin bands.
  // Just-noticeable step between two adjacent bands on a smooth face
  // (OKLab); 0.06 showed as contour lines on the dark plain.
  const BAND_JND = 0.025;
  const colCache = new Map<number, string>();
  const colOf = (ci: number, k: number) => {
    const key = ci * (S + 1) + k;
    let c = colCache.get(key);
    if (c === undefined) {
      c = shadeAt(prof[ci].xs[k], zs[ci], prof[ci].hs[k]);
      colCache.set(key, c);
    }
    return c;
  };
  const kept: number[] = [0];
  let cur = 0;
  const mid = new Array(S + 1);
  const ones = new Array(S + 1).fill(1);
  while (cur < C) {
    let next = cur + 1;
    const maxBand = o.maxBand(zs[cur]);
    const scale = o.bandScale
      ? prof[cur].xs.map(x => (o.bandScale as (x: number, z: number) => number)(x, zs[cur]))
      : ones;
    mid.fill(Number.POSITIVE_INFINITY);
    for (let j = cur + 1; j <= C; j++) {
      let band = 0;
      let peak = false;
      for (let k = 0; k <= S; k++) {
        const top = prof[cur].pts[k].y;
        const bottom = Math.min(prof[j].pts[k].y, env[j][k]);
        if (top < env[cur][k] + 1) {
          const b = (bottom - top) / scale[k];
          if (b > maxBand && b > band && colourDist(colOf(cur, k), colOf(j, k)) > BAND_JND)
            band = b;
        }
        // A skipped candidate standing above both neighbours and in view.
        // On dark rock (scale > 1) a skipped bump of a few px is as invisible
        // as a tall band: the rough near plain no longer forces a slice per
        // candidate.
        if (mid[k] < Math.min(top, bottom) - PEAK * scale[k] && mid[k] < env[j][k]) peak = true;
      }
      if (band > maxBand || peak) break;
      next = j;
      for (let k = 0; k <= S; k++) mid[k] = Math.min(mid[k], prof[j].pts[k].y);
    }
    kept.push(next);
    cur = next;
  }

  // Envelope of the kept slices only (fix 2).
  const envK: number[][] = new Array(kept.length);
  envK[kept.length - 1] = new Array(S + 1).fill(cam.H);
  for (let i = kept.length - 2; i >= 0; i--)
    envK[i] = envK[i + 1].map((e, k) => Math.min(e, prof[kept[i + 1]].pts[k].y));

  const defs: string[] = [];
  const els: string[] = [];
  kept.forEach((ci, idx) => {
    const z = zs[ci];
    const { xs, hs, pts } = prof[ci];
    const nearer = idx + 1 < kept.length ? kept[idx + 1] : -1;
    const front = envK[idx];
    const visible = pts.map((q, k) => q.y < front[k] + 1);
    if (!visible.some(Boolean)) return;
    const hz = hazeAt(o.atm, z);
    const colourAt = (x: number, h: number) => {
      const dx = (o.height(x + eps * z, z) - o.height(x - eps * z, z)) / (2 * eps * z);
      const dz = (o.height(x, z + eps * z) - o.height(x, z - eps * z)) / (2 * eps * z);
      const nrm = norm3([-dx, 1, -dz]);
      const lam = Math.max(0, nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]);
      return mix(o.surface(lam, x, z, h, nrm), o.atm.haze, hz);
    };
    const colour = (k: number) => colourAt(xs[k], hs[k]);
    // Fix 6 (round 3D1-02): exact liquid/bank crossings also get gradient
    // stops. With stops only at the 8.6 px sample grid, each slice ramped
    // from the liquid colour to the bank colour starting at a different grid
    // point, and the bank read as a saw (one tooth per slice band).
    const crossStops: Array<{ sx: number; col: string }> = [];
    const pinned = new Set<number>();
    const keep = pts.map(
      (_, k) => visible[k] || visible[k - 1] || visible[k + 1] || k % 4 === 0 || k === S
    );
    const ks = pts.map((_, k) => k).filter(k => keep[k]);
    const outline = ks.map((k, i) => {
      if (visible[k] || visible[k - 1] || visible[k + 1]) return pts[k];
      const from = ks[Math.max(0, i - 1)];
      const to = ks[Math.min(ks.length - 1, i + 1)];
      let low = pts[k].y;
      for (let j = from; j <= to; j++) low = Math.max(low, Math.min(front[j], cam.H) + 1);
      return { x: pts[k].x, y: low };
    });
    // Fix 4: where a liquid surface meets its bank between two samples, add
    // the exact crossing to the outline. Otherwise the chord from the last
    // liquid sample to the first bank sample cuts a triangle over the river
    // drawn behind it — one tooth per slice, a saw along every bank.
    const fl = o.floor;
    const path: Pt[] = [];
    ks.forEach((k, i) => {
      path.push(outline[i]);
      const k2 = ks[i + 1];
      if (fl === undefined || k2 !== k + 1 || !visible[k] || !visible[k2]) return;
      const wet = (h: number) => h <= fl + 1e-4;
      if (wet(hs[k]) === wet(hs[k2])) return;
      let a = xs[k];
      let b = xs[k2];
      const aWet = wet(hs[k]);
      for (let it = 0; it < 12; it++) {
        const m = (a + b) / 2;
        if (wet(o.height(m, z)) === aWet) a = m;
        else b = m;
      }
      const xc = (a + b) / 2;
      const q = project(cam, [xc, fl, z]);
      path.push(q);
      // Liquid colour up to the crossing, bank colour from it (fix 6).
      const xWet = aWet ? a : b;
      const xDry = aWet ? b : a;
      const side = Math.sign(xDry - xWet);
      const wetCol = colour(aWet ? k : k2);
      const dryCol = colourAt(xDry, o.height(xDry + side * 1e-3, z));
      const d = 0.3 * side;
      // Both stops, also under a painted river piece: without the wet one
      // the slice under the river ramped from bank rock to bank rock, and
      // where ~6 one-px pieces share a pixel (thumbnails, downscaled views)
      // that ramp leaked through their edges as dark rungs.
      crossStops.push({ sx: q.x - d, col: wetCol }, { sx: q.x + d, col: dryCol });
      pinned.add(k);
      pinned.add(k2);
    });
    // Fix 7 (review 3D2-01): stops by the error of the drawn ramp, not by
    // the step from the last stop. The old greedy rule kept a sample only
    // once it differed from the LAST STOP by more than the tolerance (x1.6
    // on dark rock), so a narrow lit rim within that tolerance was dropped
    // in one slice and kept in the next. Probing the right flank with
    // elementsFromPoint showed exactly that: neighbouring bands at one x
    // alternated between a lit stop (L ≈ 0.2) and a long dark ramp across
    // it, which read as stacked contour lines and a drawn dark "S".
    // Now the visible samples of a slice are simplified Douglas-Peucker
    // style: a sample is kept when the linear ramp between its kept
    // neighbours misses it by more than the tolerance (OKLab), so a rim is
    // kept wherever it shows, in every slice alike, and a long smooth ramp
    // costs two stops. Hidden samples are never painted, so they are left
    // out of the error and a ramp may run across a hidden gap; the visible
    // samples either side of it still hold the bound, which is what fix 3
    // pinned by hand (its pins were ~80 % of all stops). The samples either
    // side of a liquid crossing stay pinned (fix 6); their exact stops are
    // merged in below.
    const stops: Array<{ sx: number; col: string }> = [];
    const tolAt = (lab: [number, number, number]) =>
      o.tolerance * (lab[0] < 0.15 ? 2 : lab[0] < 0.3 ? 1.25 : 1);
    const vis: number[] = [];
    for (let k = 0; k <= S; k++) if (visible[k]) vis.push(k);
    if (vis.length) {
      const cols = vis.map(k => colour(k));
      const labs = cols.map(c => labOf(c));
      const keepV = vis.map((k, i) => i === 0 || i === vis.length - 1 || pinned.has(k));
      const pins = keepV.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
      const stack: Array<[number, number]> = [];
      for (let i = 1; i < pins.length; i++) stack.push([pins[i - 1], pins[i]]);
      while (stack.length) {
        const [a, b] = stack.pop() as [number, number];
        if (b - a < 2) continue;
        const xa = pts[vis[a]].x;
        const span = pts[vis[b]].x - xa || 1;
        const A = labs[a];
        const B = labs[b];
        let worst = -1;
        let worstErr = 0;
        for (let m = a + 1; m < b; m++) {
          const t = (pts[vis[m]].x - xa) / span;
          const M = labs[m];
          const err =
            Math.hypot(
              A[0] + (B[0] - A[0]) * t - M[0],
              A[1] + (B[1] - A[1]) * t - M[1],
              A[2] + (B[2] - A[2]) * t - M[2]
            ) / tolAt(M);
          if (err > worstErr) {
            worstErr = err;
            worst = m;
          }
        }
        if (worstErr > 1) {
          keepV[worst] = true;
          stack.push([a, worst], [worst, b]);
        }
      }
      keepV.forEach((v, i) => {
        if (!v) return;
        const last = stops[stops.length - 1];
        if (last && pts[vis[i]].x < last.sx + 0.5) return;
        stops.push({ sx: pts[vis[i]].x, col: cols[i] });
      });
    }
    if (crossStops.length) {
      stops.push(...crossStops);
      stops.sort((a, b) => a.sx - b.sx);
    }
    const x0 = pts[0].x;
    const x1 = pts[S].x;
    const id = `${o.id}${idx}`;
    let fill: string;
    if (stops.length === 1) fill = stops[0].col;
    else {
      defs.push(
        `<linearGradient id="${id}" x1="${Math.round(x0)}" x2="${Math.round(x1)}" y2="0" gradientUnits="userSpaceOnUse">${stops
          .map(
            c =>
              `<stop offset="${n((c.sx - x0) / (x1 - x0), 4).replace(/^0\./, ".")}" stop-color="${c.col}"/>`
          )
          .join("")}</linearGradient>`
      );
      fill = `url(#${id})`;
    }
    els.push(
      `<path d="${relPath(simplify(path, 0.6))}V${cam.H}H${Math.round(x0)}Z" fill="${fill}"/>`
    );
    if (o.after) {
      const zNext = nearer < 0 ? o.zNear : zs[nearer];
      els.push(o.after({ index: idx, z, zNext, xs, hs, pts, visible }));
    }
  });
  return { defs: defs.join("\n"), elements: `<g id="${o.id}">${els.join("")}</g>` };
}

// ─── World description ───────────────────────────────────────────────────────

interface Spire {
  x: number;
  z: number;
  h: number;
  r: number;
  /** Footprint asymmetry (reads as a lean) and its direction. */
  lean: number;
  leanDir: number;
  /** Rib harmonics: periodic in angle, so buttresses run down the flanks. */
  ribs: Array<[number, number, number]>;
  /** Lean: horizontal drift of the centre per unit of height. */
  lx: number;
  lz: number;
  /** Noise offset, so towers do not share one pattern. */
  seed: number;
  /** Flank convexity: height ∝ 1 − t^p (p > 1 is convex, a weathered tower). */
  p: number;
  /** Broken top: cap level (fraction of h), tilt across the top and its direction. */
  cap: number;
  tilt: number;
  tiltDir: number;
  /** Talus apron height (fraction of h); its flank is straight. */
  talus: number;
}

/** The lava fall: x of its centre line, lip height, widths at lip and foot. */
const FALL = { x: 4.3, z: 30, lip: 7.4, w0: 1.25, w1: 0.6 };
/** The tiny far fall deep in the left valley (personal touch). */
const FAR_FALL = { x: -39.5, lip: 9, w0: 0.9, w1: 0.5 };
const LAVA = 0; // lava level

// Main river centre line [z, x], far → near is read right to left: it leaves
// the far centre-left valley, hugs the ledge's left side, passes the plunge
// pool and sweeps to the near right. Never up the centre (that is Mandarian).
const RIVER: Array<[number, number]> = [
  [2, 4.1],
  [5, 4.4],
  [9, 4.85],
  [14, 5.05],
  [20, 4.7],
  [25, 4.0],
  [29.2, 3.15],
  [33, 1.4],
  [38, 0.6],
  [46, -0.6],
  [58, -2.8],
  [72, -5.2],
  [90, -8],
  [112, -11.5],
  [140, -15.5],
  [180, -21],
];
// The thin far-left tributary, from the far fall's foot to the river.
const SIDE: Array<[number, number]> = [
  [68, -4.6],
  [74, -9.5],
  [84, -17],
  [96, -25],
  [106, -32.5],
  [113.5, -39.5],
];
const POOL = { x: 4.3, z: 29.3, r: 1.75 };
export function voidEmberMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-void-ember-${part}`);
  const portrait = H > W;

  // ── Value plan: hue follows the palette, lightness is guarded per role ────
  const ember = keepLightness(
    emberOf([
      c.constants,
      c.numbers,
      c.attributes,
      c.variables,
      c.strings,
      c.keywords,
      c.hueYellow,
      c.hueOrange,
      c.hueRed,
      c.huePurple,
      c.accent,
    ]),
    0.6,
    0.72
  );
  // Lava glows along a temperature ramp, like a black body: dark crust →
  // deep red → ember → orange-yellow → pale yellow-white at the hottest.
  // The hot end leans toward the palette's yellowest warm colour (hue may
  // move per mode; lightness is guarded), so the core never reads as pink.
  const yellowish = warmYellowOf([
    c.hueYellow,
    c.constants,
    c.numbers,
    c.hueOrange,
    c.variables,
    c.strings,
    c.accent,
    c.accentSoft,
  ]);
  const core = keepLightness(mix(tone(yellowish, 0.55), ember, 0.12), 0.88, 0.94); // the hottest light in the frame
  const hot = keepLightness(mix(ember, yellowish, 0.5), 0.74, 0.8);
  // Open molten lava between the plates: orange rather than the pinkish
  // ember some palettes give (lightness kept).
  const emberWarm = keepLightness(mix(ember, yellowish, 0.3), 0.6, 0.7);
  const deepLava = keepLightness(shade(ember, 0.72), 0.42, 0.5);
  const rock = shade(c.bg, 0.4); // the darkest solid
  const crust = keepLightness(mix(rock, ember, 0.1), 0.1, 0.16);
  const crustWarm = keepLightness(mix(crust, deepLava, 0.15), 0.14, 0.2);
  const litRock = keepLightness(mix(rock, ember, 0.45), 0.34, 0.42);
  const glowRock = keepLightness(mix(litRock, ember, 0.35), 0.46, 0.52);
  const bankTone = mix(crustWarm, litRock, 0.55);
  const rimRock = keepLightness(mix(rock, ember, 0.32), 0.17, 0.21); // backlit rim
  // Smoke haze: a deep red-black. Backlit, far forms stay dark silhouettes
  // against the glow (the user's preference), only redder than near rock.
  const air = keepLightness(mix(shade(c.bg, 0.7), ember, 0.14), 0.12, 0.13);
  const voidTop = shade(c.bg, 0.42);
  const voidMid = shade(c.bg, 0.7);
  const skyGlow = keepLightness(mix(c.bg, ember, 0.32), 0.29, 0.33);
  const smokeDark = keepLightness(mix(shade(c.bg, 0.5), ember, 0.03), 0.07, 0.095);
  const smokeLit = keepLightness(mix(shade(c.bg, 0.5), ember, 0.3), 0.28, 0.36);
  const starTint = keepLightness(
    tone(palest([c.keywords, c.functions, c.strings, c.types, c.constants]), 0.2),
    0.8,
    0.95
  );

  // ── One camera, one light, one atmosphere ─────────────────────────────────
  const focal = portrait ? W / (2 * 0.75) : 0.7 * H;
  // Portrait: re-centre so the fall lands at 0.55 W.
  const cx = portrait ? 0.55 - (focal * FALL.x) / FALL.z / W : 0.5;
  const cam: Camera = { W, H, horizon: 0.55, eye: 4, focal, cx };
  const horizonY = cam.horizon * H;
  // Backlight: toward the bright low smoke behind the spires, ~8° up, a little right.
  const light: V3 = norm3([0.22, 0.14, 0.96]);
  const atm = { haze: air, visibility: 32, max: 0.72 };
  // Where the backlight comes from: the brightest smoke, low over the far valley.
  const GLOW: V3 = [-8, 9, 240];

  // Screen-space band limit: an octave of wavelength λ (world) at distance z
  // contributes only when it spans enough pixels to be sampled cleanly —
  // otherwise it aliases into saw-tooth crests and comb stacks.
  const octW = (lambda: number, z: number) => smooth(14, 32, (lambda * focal) / z);
  // Same for patterns lying on flat ground, whose vertical size is foreshortened.
  const flatW = (lambda: number, z: number) => smooth(10, 30, (lambda * focal * cam.eye) / (z * z));

  // ── Noise fields (each its own seeded stream) ─────────────────────────────
  const nPlain = valueNoise2D(key("plain"));
  const nPlain2 = valueNoise2D(key("plain2"));
  const nBank = valueNoise2D(key("bank"));
  const nLedge = valueNoise2D(key("ledge"));
  const nFront = valueNoise2D(key("front"));
  const crestN = [
    valueNoise2D(key("crest0")),
    valueNoise2D(key("crest1")),
    valueNoise2D(key("crest2")),
  ];
  const flowN = [valueNoise2D(key("flow0")), valueNoise2D(key("flow1"))];
  const wig = valueNoise2D(key("wiggle"));
  const nHeat = valueNoise2D(key("heat"));
  const crustSeed = Math.floor(key("crust")() * 100000);

  // ── Lava channels ─────────────────────────────────────────────────────────
  const riverX = (z: number) => curveAt(RIVER, z) + 0.35 * wig(z * 0.12, 3.7) * Math.min(1, z / 25);
  const riverHW = (z: number) => 1.05 + 0.005 * z;
  const sideX = (z: number) => curveAt(SIDE, z);
  /** Signed distance to the nearest lava edge (< 0 inside) and its heat (0–1). */
  const channel = (x: number, z: number) => {
    // Bank irregularity, band-limited: a bank that wobbles faster than the
    // slices can follow shows up as a comb of teeth along the lava edge.
    const bn = 0.32 * flatW(3.5, z) * nBank(x * 0.3, z * 0.3);
    const dR = Math.abs(x - riverX(z)) - riverHW(z) * (1 + bn);
    const dP = Math.hypot(x - POOL.x, (z - POOL.z) * 1.15) - POOL.r * (1 + bn * 0.6);
    let dS = Number.POSITIVE_INFINITY;
    if (z > SIDE[0][0] - 2 && z < SIDE[SIDE.length - 1][0] + 0.6) {
      const cap = smooth(SIDE[SIDE.length - 1][0] + 0.4, SIDE[SIDE.length - 1][0] - 1.5, z);
      dS = Math.abs(x - sideX(z)) * 0.8 - 0.55 * cap * (1 + bn);
    }
    const d = Math.min(dR, dP, dS);
    // Heat: hot at the pool and the river's centre, cooling toward the banks
    // and downstream (toward the viewer); the tributary is cooler.
    const centre = Math.max(0, -dR) / riverHW(z);
    const heatR = (0.42 + 0.45 * Math.min(1, centre * 1.3)) * (0.8 + 0.2 * smooth(6, 28, z));
    const heatP = 0.95 * smooth(0.4, -1.4, dP);
    const heatS = 0.32 * smooth(0, -0.4, dS);
    // Across-flow coordinate (−1…1 inside the river), for the flow texture.
    const u = (x - riverX(z)) / riverHW(z);
    // main: inside the main river or the pool (drawn as smooth pieces).
    return { d, heat: Math.max(heatR, heatP, heatS), bn, u, main: Math.min(dR, dP) < 0.05 };
  };

  // ── Spires: art-directed clusters in world space, seeded jitter ──────────
  // Each anchor is a main tower with a few lower sub-towers around it, so a
  // massif has several ragged peaks instead of one clean cone.
  const srng = key("spires");
  const warpN = [
    valueNoise2D(key("warp0")),
    valueNoise2D(key("warp1")),
    valueNoise2D(key("warp2")),
  ];
  const hRib = valueNoise2D(key("hrib"));
  const mkSpire = (x: number, z: number, h: number, r: number): Spire => ({
    x: x + (srng() - 0.5) * 0.12 * r,
    z: z + (srng() - 0.5) * 0.1 * r,
    h: h * (0.92 + 0.16 * srng()),
    r: r * (0.9 + 0.2 * srng()),
    lean: 0.08 + 0.14 * srng(),
    leanDir: srng() * Math.PI * 2,
    ribs: [3, 4, 5, 7].map(
      k =>
        [k, (0.05 + 0.07 * srng()) / Math.sqrt(k / 3), srng() * 6.283] as [number, number, number]
    ),
    lx: (srng() - 0.5) * 0.1,
    lz: (srng() - 0.5) * 0.05,
    seed: srng() * 200,
    p: 1.35 + 0.75 * srng(),
    cap: 0.8 + 0.14 * srng(),
    tilt: 0.06 + 0.1 * srng(),
    tiltDir: srng() * Math.PI * 2,
    talus: 0.12 + 0.08 * srng(),
  });
  const spires: Spire[] = [];
  const cluster = (x: number, z: number, h: number, r: number, subs: number): Spire => {
    const main = mkSpire(x, z, h, r);
    spires.push(main);
    for (let k = 0; k < subs; k++) {
      const a = srng() * Math.PI * 2;
      const d = r * (0.65 + 0.6 * srng());
      spires.push(
        mkSpire(
          x + Math.cos(a) * d,
          z + Math.sin(a) * d * 0.8,
          h * (0.4 + 0.35 * srng()),
          r * (0.5 + 0.25 * srng())
        )
      );
    }
    return main;
  };
  // Near left: the monolith, now a broad weathered tower whose broken top
  // sits inside the monitor frame (3D1-03), and a lower neighbour behind it.
  // Both lie wholly left of the portrait (mobile) frame, so no edge sliver.
  cluster(-23, 24, 17, 4.2, 0);
  cluster(-27.5, 29.5, 10.5, 3.6, 0);
  // Left-centre group beside the far valley.
  cluster(-9.5, 46, 22, 3.6, 2);
  cluster(-16, 57, 17, 3.4, 1);
  // Behind the ledge and the fall, and to its right.
  cluster(9.5, 53, 26, 4, 2);
  cluster(24, 40, 18, 3.6, 2);
  cluster(20, 21, 13, 2.8, 1);
  cluster(14, 13, 6, 2.2, 0);
  // Low outcrops on the plain left of the river, so the middle ground is
  // broken rock, not an empty table; they catch the lava light on one side.
  const orng = key("outcrops");
  for (let k = 0; k < 9; k++) {
    const z = 12 + orng() ** 0.8 * 55;
    cluster(
      -2 - orng() * 0.55 * z,
      z,
      1.6 + orng() * 3.2,
      0.9 + orng() * 1.1,
      orng() < 0.5 ? 1 : 0
    );
  }
  // Far centre behind the river's far end, and the far range.
  cluster(-1.5, 104, 30, 6, 2);
  const farSpire = cluster(-41, 121, 30, 6.5, 1);
  cluster(-62, 136, 34, 7.5, 2);
  cluster(-24, 152, 38, 8, 2);
  cluster(15, 130, 33, 6.5, 2);
  cluster(36, 113, 26, 6, 1);
  cluster(58, 142, 36, 7.5, 2);
  cluster(-88, 120, 28, 7, 1);
  cluster(86, 126, 30, 7, 1);
  // The farthest range, spread across the whole field of view (portrait and
  // landscape), so the horizon is never a ruler-straight line of plain.
  const frng = key("farrange");
  for (let k = 0; k < 14; k++) {
    const z = 170 + frng() * 45;
    const t = (k + 0.2 + 0.6 * frng()) / 14;
    cluster((t * 2 - 1) * 1.35 * z, z, 14 + frng() * 30, 8 + frng() * 6, frng() < 0.5 ? 1 : 2);
  }
  // Keep every spire clear of the river: push it sideways if its skirt would
  // fill the channel (the river must stay readable between them).
  for (const s of spires) {
    const rx = riverX(s.z);
    const clear = s.r * 1.25 + riverHW(s.z) + 0.6;
    if (Math.abs(s.x - rx) < clear) s.x = rx + Math.sign(s.x - rx || 1) * clear;
  }
  const ROUND = 0.09; // rounded, weathered tip (no needle point)
  const tipNorm = Math.sqrt(1 + ROUND * ROUND) - ROUND;
  /** Core profile 0–1 at (x, z) for a spire centred at (cx0, cz0). */
  const profile = (s: Spire, x: number, z: number, cx0: number, cz0: number, f0: number) => {
    let dx = x - cx0;
    let dz = z - cz0;
    // Domain warp: the contours wander, so the silhouette is ragged at every
    // height (weathered rock), band-limited so far towers do not alias.
    let lam = s.r * 1.1;
    // Calmer feet (review 3D2-01): below ~40 % of the height the warp is
    // reduced to 40 %. At full strength it folded the steep front faces of
    // the near towers into flutes whose crests, rim-lit by the backlight,
    // read as a drawn loop at the foot of the tower at (14.1, 13.0).
    let amp = 0.28 * s.r * (1 - 0.6 * smooth(0.6, 0.1, f0));
    for (const wn of warpN) {
      const w = octW(lam, z) * amp;
      if (w > 0.001) {
        dx += w * wn((x + s.seed) / lam, z / lam);
        dz += w * wn((z + s.seed) / lam + 17, x / lam);
      }
      lam *= 0.5;
      amp *= 0.5;
    }
    const ang = Math.atan2(dz, dx);
    let rib = 1 + s.lean * Math.cos(ang - s.leanDir);
    for (const [k, a, ph] of s.ribs) rib += a * Math.sin(k * ang + ph);
    // Shoulders and notches: the radius also wanders with height, so the
    // outline steps in and out on the way up instead of running straight.
    rib += 0.17 * octW(s.h / 4.5, z) * hRib(ang * 1.3 + s.seed, f0 * 4.5);
    const t = Math.hypot(dx, dz) / (s.r * Math.max(0.35, rib));
    return { t, f: Math.max(0, 1 - (Math.sqrt(t * t + ROUND * ROUND) - ROUND) / tipNorm) };
  };
  const spireH = (s: Spire, x: number, z: number) => {
    const reach = s.r * 2.9 + Math.abs(s.lx * s.h) + Math.abs(s.lz * s.h);
    const qx = x - s.x;
    const qz = z - s.z;
    if (qx * qx + qz * qz > reach * reach) return 0;
    // Lean: the centre drifts with height (one fixed-point step).
    // Weathered tower (3D1-03): the old cone on a concave skirt read as a
    // "witch-hat" needle (lesson 11). Height ∝ 1 − t^p gives convex flanks
    // that steepen toward the foot; a tilted plane softly caps it, so the top
    // is a broken, blunt shoulder instead of a point.
    const body = (tt: number) => Math.max(0, 1 - Math.min(1, tt) ** s.p);
    const t0 = profile(s, x, z, s.x, s.z, 0).t;
    const f0 = body(t0);
    const { t } = profile(s, x, z, s.x + s.lx * s.h * f0, s.z + s.lz * s.h * f0, f0);
    const f = body(t);
    const dx = (x - s.x) / s.r;
    const dz = (z - s.z) / s.r;
    const capH = s.h * (s.cap + s.tilt * (dx * Math.cos(s.tiltDir) + dz * Math.sin(s.tiltDir)));
    let hc = smin(s.h * f, capH, s.h * 0.08);
    // Ragged crest: band-limited ridged noise, strongest near the top, kept
    // small so it breaks the cap's edge without growing needles.
    if (f > 0.05) {
      const band = 0.2 + 0.8 * smooth(0.45, 0.85, hc / s.h);
      let rag = 0;
      let lam = 2.6;
      for (const nz of crestN) {
        rag +=
          octW(lam, z) *
          (1 - 2 * Math.abs(nz((x + s.seed) / lam, (z + s.seed) / lam))) *
          (lam / 2.6);
        lam *= 0.5;
      }
      hc += s.h * 0.06 * band * rag * Math.min(1, f * 4);
    }
    // Talus apron: low and wide with a straight flank (no concave brim).
    const skirt = s.h * s.talus * Math.max(0, 1 - t / 2.1);
    // A broad blend (0.15 h) between body and apron, so the foot flares into
    // its scree instead of meeting it along one crisp, wandering crease.
    return smax(hc, skirt, s.h * 0.15);
  };

  // ── The ledge carrying the fall (front face ~70°, weathered lip) ─────────
  const ledgeH = (x: number, z: number) => {
    if (x < 1.5 || x > 15 || z < 27 || z > 58) return 0;
    const edgeZ = 30.6 + 0.45 * nFront(x * 0.3, 1.3);
    const front = smooth(edgeZ - 1.1, edgeZ + 1.25, z);
    const sides = smooth(2.3, 3.5, x + 0.3 * nFront(z * 0.4, 9)) * smooth(10.5, 7.5, x);
    const back = smooth(56, 48, z);
    const notch = 0.45 * Math.exp(-(((x - FALL.x) / 0.9) ** 2)); // where the upper channel runs
    const top = FALL.lip + 0.35 + 0.9 * nLedge(x * 0.35, z * 0.35) * smooth(4.6, 6.5, x) - notch;
    return top * front * sides * back;
  };

  // ── The full height field ─────────────────────────────────────────────────
  // Spatial index: the height field is sampled ~2 million times, and each
  // sample used to test every spire. A grid of CELL-sized buckets lists, in
  // the original order (smax is order-sensitive), the spires whose reach
  // touches the cell; a sample only visits its own bucket. Same result.
  const CELL = 4;
  const buckets = new Map<number, Spire[]>();
  const cellKey = (i: number, j: number) => i * 100003 + j;
  for (const s of spires) {
    const reach = s.r * 2.9 + Math.abs(s.lx * s.h) + Math.abs(s.lz * s.h);
    for (let i = Math.floor((s.x - reach) / CELL); i <= Math.floor((s.x + reach) / CELL); i++)
      for (let j = Math.floor((s.z - reach) / CELL); j <= Math.floor((s.z + reach) / CELL); j++) {
        const k = cellKey(i, j);
        const list = buckets.get(k);
        if (list) list.push(s);
        else buckets.set(k, [s]);
      }
  }
  const NONE: Spire[] = [];
  const spiresNear = (x: number, z: number) =>
    buckets.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL))) ?? NONE;
  const rawHeight = (x: number, z: number) => {
    let g =
      0.4 + 0.2 * nPlain(x * 0.09, z * 0.09) + 0.08 * flatW(2.5, z) * nPlain2(x * 0.4, z * 0.4);
    // Rough aa-lava rubble near the viewer, band-limited so it fades out
    // with distance instead of stacking into ridges along the horizon.
    g += 0.1 * flatW(1.2, z) * nPlain2(x * 0.85 + 31, z * 0.85);
    g = Math.max(0.15, g); // the plain never dips to lava level by itself
    g = smax(g, ledgeH(x, z), 0.5);
    for (const s of spiresNear(x, z)) {
      const sh = spireH(s, x, z);
      if (sh > 0) g = smax(g, sh, 0.8);
    }
    const ch = channel(x, z);
    // A gentle bank: a steep levee seen along the diagonal river broke into a
    // comb of teeth (each slice cuts the ridge at a slightly different x).
    const bank = smooth(-0.1, 1.3, ch.d + 0.25 * ch.bn);
    return g * bank - 0.35 * (1 - bank);
  };
  const height = (x: number, z: number) => Math.max(LAVA, rawHeight(x, z));

  // ── Lava sources for the emissive light on the rock ───────────────────────
  interface Src {
    x: number;
    y: number;
    z: number;
    hw: number;
    I: number;
  }
  const STEP = 0.4;
  const riverPts: Src[] = [];
  for (let z = 2; z <= 178; z += STEP)
    riverPts.push({ x: riverX(z), y: LAVA, z, hw: riverHW(z), I: 1.1 });
  const sidePts: Src[] = [];
  for (let z = SIDE[0][0]; z <= SIDE[SIDE.length - 1][0]; z += STEP)
    sidePts.push({ x: sideX(z), y: LAVA, z, hw: 0.5, I: 0.45 });

  /** z on the visible rock face at (x, y): where the height field crosses y, near→far. */
  const faceZ = (x: number, y: number, zFront: number, zBack: number) => {
    let a = zFront;
    let b = zBack;
    for (let i = 0; i < 30; i++) {
      const m = (a + b) / 2;
      if (height(x, m) >= y) b = m;
      else a = m;
    }
    return (a + b) / 2;
  };
  // The falls lie on the true rock faces.
  const NF = 14;
  // A point is kept only where the face really crosses its height (rock at
  // the back, lower ground in front), so a fall never floats off the rock.
  const fallLine = (x0: number, lip: number, zFront: number, zBack: number, bend: number): V3[] => {
    const line: V3[] = [];
    for (let i = 0; i <= NF; i++) {
      const u = i / NF;
      const y = lip * (1 - u) + 0.05;
      const x = x0 + bend * Math.sin(u * 2.2);
      if (height(x, zFront) >= y || height(x, zBack) < y) continue;
      line.push([x, y, faceZ(x, y, zFront, zBack) - 0.06]);
    }
    return line;
  };
  const mainFall = fallLine(FALL.x, FALL.lip, 27.5, 34, 0.18);
  const farFall = fallLine(
    FAR_FALL.x,
    FAR_FALL.lip,
    SIDE[SIDE.length - 1][0] - 0.7,
    farSpire.z,
    -0.1
  );
  // Point groups: each fall is one source line; only its nearest point lights
  // a rock sample (summing all points would multiply the fall's intensity).
  const fallPts = mainFall.map(q => ({ x: q[0], y: q[1], z: q[2], hw: 0.35, I: 1.35 }));
  const farFallPts = farFall.map(q => ({ x: q[0], y: q[1], z: q[2], hw: 0.25, I: 0.6 }));
  const poolPts: Src[] = [{ x: POOL.x, y: LAVA, z: POOL.z, hw: POOL.r, I: 1.25 }];
  const R_EM = 4.8; // emission falloff length: the light hugs the rock nearest the lava
  const emitFrom = (s: Src, x: number, h: number, z: number, nrm: V3, wrap = 0) => {
    const dx = x - s.x;
    const dz = z - s.z;
    const dh = Math.hypot(dx, dz) || 1e-6;
    const k = 1 - Math.min(s.hw, dh) / dh; // vector to the nearest edge point
    const ux = -dx * k;
    const uy = s.y - h;
    const uz = -dz * k;
    const d = Math.hypot(ux, uy, uz) || 1e-6;
    // A fall lies ON its face: light grazing along the rock still reaches it
    // (wrap), otherwise the face beside a lava fall would stay black.
    const facing = Math.max(0, ((nrm[0] * ux + nrm[1] * uy + nrm[2] * uz) / d + wrap) / (1 + wrap));
    return { d, e: 1.6 * s.I * Math.exp(-d / R_EM) * facing };
  };
  const nearest = (
    group: Src[],
    from: number,
    to: number,
    x: number,
    h: number,
    z: number,
    nrm: V3,
    wrap = 0
  ) => {
    let best = { d: Number.POSITIVE_INFINITY, e: 0 };
    for (let i = Math.max(0, from); i <= Math.min(group.length - 1, to); i++) {
      const r = emitFrom(group[i], x, h, z, nrm, wrap);
      if (r.d < best.d) best = r;
    }
    return best.e;
  };
  /** Emissive light reaching a rock point: nearest source of each group, summed. */
  const emission = (x: number, h: number, z: number, nrm: V3) => {
    let total = 0;
    const span = Math.round(10 / STEP);
    for (const group of [riverPts, sidePts]) {
      if (!group.length) continue;
      const i0 = Math.round((z - group[0].z) / STEP);
      total += nearest(group, i0 - span, i0 + span, x, h, z, nrm);
    }
    for (const group of [fallPts, poolPts, farFallPts]) {
      if (!group.length) continue;
      const g = group[0];
      if (Math.abs(g.z - z) > 14 || Math.abs(g.x - x) > 14) continue;
      total += nearest(group, 0, group.length - 1, x, h, z, nrm, 0.5);
    }
    return total;
  };

  /** Lava surface colour (before haze): dark crust plates, glowing seams. */
  const lavaAt = (x: number, z: number) => {
    const ch = channel(x, z);
    // Hot streams wander through the flow (low-frequency, elongated along it).
    const heat = Math.min(1, Math.max(0, ch.heat + 0.18 * nHeat(x * 0.35, z * 0.12)));
    // A narrow hot thread runs down the middle of the flow, where it moves
    // fastest and stays open; the temperature ramp does the rest.
    // Its line, width and strength wander slowly along the flow.
    const tOff = 0.28 * flowN[0](z * 0.06 + 3, 1.7);
    const tW = 0.22 + 0.12 * (0.5 + 0.5 * flowN[1](z * 0.08 + 11, 4.2));
    const tI = 0.18 + 0.16 * (0.5 + 0.5 * nHeat(z * 0.09, 6.3));
    const thread = tI * Math.exp(-(((ch.u - tOff) / tW) ** 2)) * (ch.main ? 1 : 0);
    const t = Math.min(1, heat + thread);
    const molten =
      t > 0.78
        ? mix(hot, core, Math.min(1, (t - 0.78) / 0.2))
        : t > 0.4
          ? mix(emberWarm, hot, (t - 0.4) / 0.38)
          : mix(deepLava, emberWarm, t / 0.4);
    // Crust: cooled plates float on the flow with glowing seams between
    // them (cellular noise in flow coordinates: across the flow u, along it
    // z; plates are drawn out along the flow). Where the flow is hottest —
    // the thread down the middle — the crust is torn open; toward the banks
    // and in cooler water it closes up. Pieces are thin depth bands, so
    // plates several units long along z never step between neighbours.
    const fu = ch.u > -1.6 && ch.u < 1.6 ? ch.u : x * 0.8;
    const drift = 0.5 * flowN[1](z * 0.035 + 7, 3.1);
    // Domain-warped so the plates never line up into a grid of tiles, and
    // drawn out along the flow so most seams run with it (a seam across the
    // flow would step between the thin depth bands).
    const wu = (fu + drift) * 2.4 + 0.55 * flowN[0](z * 0.18 + 5, fu * 1.3);
    const wz = z * 0.3 + 0.7 * flowN[1](fu * 1.1 + 2, z * 0.13);
    const cell = cellular(wu, wz, crustSeed);
    const vis = flatW(2.4, z); // can a plate be resolved at this distance?
    const edge = smooth(0.45, 1.05, Math.abs(ch.u)); // crust gathers along the banks
    // How much of the surface has crusted: little on the hot thread, most
    // toward the banks and in cooler flow — never quite none.
    const closed = 0.08 + 0.62 * smooth(0.95, 0.45, t - 0.3 * edge);
    // Plates are irregular blotches (two octaves of warped noise, soft
    // threshold), not cells: a cellular pattern read as tiles or honeycomb.
    const blot = 0.65 * flowN[0](wu * 0.8 + 9, wz * 1.3) + 0.35 * flowN[1](wu * 1.9 + 4, wz * 2.6);
    const thr = 0.42 - 0.95 * closed;
    // A soft threshold: an edge across the flow is drawn by thin depth
    // bands, and a hard one steps between them.
    const cover = smooth(thr - 0.16, thr + 0.16, blot) * vis;
    // Where the plates are too fine to resolve, show their mean cover.
    const mean = 0.5 * closed * (1 - vis);
    // Thin cracks inside a plate glow faintly (cellular borders, weak).
    const crack = (1 - smooth(0.0, 0.12, cell.e)) * vis;
    // Each plate has its own slightly different temperature.
    const raftCol = mix(
      mix(crust, crustWarm, 0.3 + 0.7 * ((cell.id * 7.3) % 1) * (1 - edge * 0.5)),
      deepLava,
      0.22 * crack
    );
    return mix(molten, raftCol, Math.min(0.94, cover * 0.94 + mean));
  };

  const layers: BrickOutput[] = [];

  // ── Sky: void at the zenith, a low smoky glow behind the spires ───────────
  const pct = (y: number) => n((y / H) * 100, 2);
  layers.push({
    defs: `<linearGradient id="ve-sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${voidTop}"/>
  <stop offset="${pct(Math.max(H * 0.08, horizonY - H * 0.46))}%" stop-color="${voidTop}"/>
  <stop offset="${pct(horizonY - H * 0.28)}%" stop-color="${voidMid}"/>
  <stop offset="${pct(horizonY - H * 0.14)}%" stop-color="${mix(voidMid, skyGlow, 0.6)}"/>
  <stop offset="${pct(horizonY - H * 0.035)}%" stop-color="${skyGlow}"/>
  <stop offset="${pct(horizonY + H * 0.01)}%" stop-color="${mix(skyGlow, air, 0.55)}"/>
  <stop offset="1" stop-color="${mix(skyGlow, air, 0.55)}"/>
</linearGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#ve-sky)"/>`,
  });
  // A broad, faint wash where the far lava fields light the smoke: no dome.
  const wash = softBlob(
    "ve-wash",
    project(cam, [-6, 0, 90]).x,
    horizonY,
    W * 0.5,
    H * 0.13,
    mix(skyGlow, ember, 0.35),
    0.3,
    0.4
  );
  layers.push({ defs: wash.def, elements: wash.el });
  // A few stars, high, through gaps in the smoke.
  layers.push(
    starField({
      id: "ve-st",
      width: W,
      horizonY: horizonY * 0.5,
      count: 45,
      tints: [starTint, keepLightness(mix(starTint, ember, 0.15), 0.78, 0.92)],
      rng: key("stars"),
    })
  );

  // Smoke volumes in world space, far first. Each is a dark mass with a lit
  // belly below its centre; the belly's light falls with height and with the
  // distance to the lava, so only undersides near the lava glow. Low banks of
  // smoke over the far valley carry most of the red; the zenith stays void.
  const vrng = key("smoke");
  const vols = Array.from({ length: 30 }, () => {
    const z = 60 + vrng() * 190;
    return {
      x: (vrng() * 2 - 1) * 1.2 * z + ((0.5 - cx) * W * z) / focal,
      y: 4 + vrng() ** 1.6 * 70,
      z,
      R: 10 + vrng() * 28,
      flat: 0.35 + vrng() * 0.3,
    };
  }).sort((a, b) => b.z - a.z);
  const nearestLavaXZ = (x: number, z: number) => {
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < riverPts.length; i += 6)
      best = Math.min(best, Math.hypot(x - riverPts[i].x, z - riverPts[i].z));
    return best;
  };
  const smokeDefs: string[] = [];
  const smokeEls: string[] = [];
  vols.forEach((v, i) => {
    const q = project(cam, [v.x, v.y, v.z]);
    const r = (v.R * focal) / v.z;
    const near = Math.exp(-nearestLavaXZ(v.x, v.z) / 70);
    const lit = Math.min(1, Math.exp(-Math.max(0, v.y - 4) / 30) * (0.4 + 0.6 * near)) ** 0.7;
    const belly = softBlob(
      `ve-sb${i}`,
      q.x,
      q.y + r * v.flat * 0.4,
      r * 0.85,
      r * v.flat * 0.6,
      mix(smokeDark, smokeLit, lit),
      0.3 + 0.6 * lit
    );
    // The dark mass only shades the glow a little: a strong dark blob in
    // the lit band reads as a stain, not as smoke.
    const mass = softBlob(
      `ve-sm${i}`,
      q.x,
      q.y - r * v.flat * 0.25,
      r,
      r * v.flat,
      mix(smokeDark, voidMid, 0.35),
      0.45
    );
    // Mass first, belly over its lower part: the underside is what glows.
    smokeDefs.push(mass.def, belly.def);
    smokeEls.push(mass.el, belly.el);
  });
  layers.push({
    defs: smokeDefs.join("\n"),
    elements: `<g id="ve-smoke">${smokeEls.join("")}</g>`,
  });

  // ── Features painted at their own depth (inside the slice sequence) ───────
  const featDefs: string[] = [];
  interface Feature {
    z: number;
    draw: () => string;
  }
  const hzOf = (z: number) => hazeAt(atm, z);

  /**
   * A lava fall as a soft glowing sheet on its rock face (review 3D2-01).
   * The old ribbon was seven nested constant-width layers, each with a hard
   * side edge, plus two offset core strands: a hard vertical strip with
   * parallel bright stripes (lessons 1 and 10). Now: two sheets (a broad
   * glow and a narrower hot body) whose width wanders with low-frequency
   * seeded noise down the fall, a brightness that pulses slowly along the
   * flow (never across it), both softened sideways by one small blur
   * restricted to the fall's own box, and the foot dissolving into steam.
   */
  const fallSheet = (
    id: string,
    line: V3[],
    w0: number,
    w1: number,
    hzK: number,
    bright: number
  ) => {
    const zMid = line[Math.floor(line.length / 2)][2];
    const hz = hzOf(zMid) * hzK;
    const wN = fbm1D(key(`${id}-width`), 2);
    const cN = fbm1D(key(`${id}-wander`), 2);
    const bN = fbm1D(key(`${id}-pulse`), 2);
    const M = 24;
    const at = (u: number) => {
      const i = u * (line.length - 1);
      const i0 = Math.min(line.length - 2, Math.floor(i));
      const t = i - i0;
      const a = line[i0];
      const b = line[i0 + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as V3;
    };
    const wpx = (w0 * focal) / zMid;
    const sheet = (frac: number, col: string, op: number, tag: string) => {
      const L: Pt[] = [];
      const R: Pt[] = [];
      for (let i = 0; i <= M; i++) {
        const u = i / M;
        const q = at(u);
        // Width: tapering, wandering slowly, spreading again at the foot
        // where the lava hits the pool.
        const w =
          (w0 + (w1 - w0) * u) *
          frac *
          (1 + 0.28 * wN(u * 2.2 + 3)) *
          (1 + 0.55 * smooth(0.8, 1, u));
        const c = q[0] + 0.12 * w0 * cN(u * 1.8 + 11);
        L.push(project(cam, [c - w / 2, q[1], q[2]]));
        R.push(project(cam, [c + w / 2, q[1], q[2]]));
      }
      const top = L[0].y;
      const bot = L[M].y;
      const gid = `${id}${tag}`;
      const c0 = mix(col, air, hz);
      // Brightness along the flow: soft start at the lip, slow pulses, and
      // a fade into the steam at the foot.
      const stops = [0, 0.08, 0.25, 0.42, 0.6, 0.78, 0.9, 1]
        .map(u => {
          const env = smooth(0, 0.1, u) * (1 - 0.65 * smooth(0.82, 1, u));
          const pulse = 0.82 + 0.18 * bN(u * 2.6 + 5);
          return `<stop offset="${u}" stop-color="${c0}" stop-opacity="${n(op * env * pulse, 3)}"/>`;
        })
        .join("");
      featDefs.push(
        `<linearGradient id="${gid}" x1="0" y1="${n(top)}" x2="0" y2="${n(bot)}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`
      );
      return {
        d: `${smoothPath(L)}L${smoothPath([...R].reverse()).slice(1)}Z`,
        fill: `url(#${gid})`,
        box: [...L, ...R],
      };
    };
    const glowS = sheet(1.5, mix(ember, hot, 0.2), 0.55 * bright, "a");
    const bodyS = sheet(0.85, mix(hot, core, 0.35), 0.75 * bright, "b");
    const coreS = sheet(0.32, core, 0.7 * bright, "c");
    const xs = glowS.box.map(q => q.x);
    const ys = glowS.box.map(q => q.y);
    const pad = wpx * 1.2;
    const fx = Math.min(...xs) - pad;
    const fy = Math.min(...ys) - pad;
    featDefs.push(
      `<filter id="${id}-soft" filterUnits="userSpaceOnUse" x="${n(fx)}" y="${n(fy)}" width="${n(Math.max(...xs) + pad - fx)}" height="${n(Math.max(...ys) + pad - fy)}"><feGaussianBlur stdDeviation="${n(wpx * 0.16, 2)} ${n(wpx * 0.06, 2)}"/></filter>`
    );
    return `<g filter="url(#${id}-soft)">${[glowS, bodyS, coreS].map(s => `<path d="${s.d}" fill="${s.fill}"/>`).join("")}</g>`;
  };

  const features: Feature[] = [];
  // The main fall, its halo, the steam plume and the sparks.
  features.push({
    z: POOL.z - POOL.r * 0.3,
    draw: () => {
      const lip = project(cam, mainFall[0]);
      const foot = project(cam, mainFall[mainFall.length - 1]);
      const wpx = (FALL.w0 * focal) / FALL.z;
      const hzF = hzOf(FALL.z) * 0.35;
      let out = "";
      // Steam plume: formless volumes rising from the pool, drifting left and
      // back, lit from below — bright at the foot, dark at the top.
      const prng = key("plume");
      const NP = 11;
      for (let i = NP - 1; i >= 0; i--) {
        const t = i / (NP - 1);
        const y = 1.2 + 30 * t ** 1.25;
        const wx = FALL.x - 0.6 - 0.012 * y * y - (prng() - 0.5) * 1.2 * t;
        const wz = POOL.z + 0.2 * y;
        const q = project(cam, [wx, y, wz]);
        const R = ((1.4 + 0.3 * y) * focal) / wz;
        const lit = Math.exp(-y / 14);
        const col = mix(mix(smokeDark, smokeLit, 0.35 + 0.65 * lit), ember, 0.5 * lit ** 1.5);
        const b = softBlob(
          `ve-pl${i}`,
          q.x,
          q.y,
          R,
          R * (0.7 + 0.2 * prng()),
          col,
          0.3 + 0.45 * lit,
          0.4
        );
        featDefs.push(b.def);
        out += b.el;
      }
      // Tight halo around the fall (~5× its width), never a dome.
      const halo = softBlob(
        "ve-fh",
        (lip.x + foot.x) / 2,
        (lip.y + foot.y) / 2 + wpx * 0.6,
        wpx * 4.2,
        (foot.y - lip.y) * 0.5 + wpx * 3,
        mix(ember, air, hzF),
        0.42,
        0.3
      );
      featDefs.push(halo.def);
      out += halo.el;
      out += fallSheet("ve-fa", mainFall, FALL.w0, FALL.w1, 0.35, 1);
      // The lip: the upper channel's glow spilling over the edge, so the fall
      // starts from lava, not from a cut.
      const lg = softBlob(
        "ve-fl",
        lip.x,
        lip.y + wpx * 0.3,
        wpx * 0.55,
        wpx * 0.28,
        hot,
        0.4,
        0.35
      );
      featDefs.push(lg.def);
      out += lg.el;
      // Splash: the hottest spot where the fall meets the pool.
      const sp = softBlob("ve-fs", foot.x, foot.y, wpx * 1.6, wpx * 0.55, core, 0.85, 0.35);
      featDefs.push(sp.def);
      out += sp.el;
      // Steam at the foot (3D2-01): a broad, formless volume lit from the
      // splash below, so the fall dissolves into it instead of ending in a cut.
      const st = softBlob(
        "ve-fst",
        foot.x - wpx * 0.3,
        foot.y - wpx * 0.9,
        wpx * 3.2,
        wpx * 1.5,
        mix(smokeLit, hot, 0.3),
        0.42,
        0.42
      );
      featDefs.push(st.def);
      out += st.el;
      // Sparks climbing from the foot toward the lit smoke.
      const krng = key("sparks");
      featDefs.push(
        `<radialGradient id="ve-spark"><stop offset="0" stop-color="${core}"/><stop offset="0.18" stop-color="${core}" stop-opacity="0.8"/><stop offset="0.45" stop-color="${ember}" stop-opacity="0.2"/><stop offset="1" stop-color="${ember}" stop-opacity="0"/></radialGradient>`
      );
      for (let k = 0; k < 9; k++) {
        const t = (k + 0.2 + krng() * 0.6) / 9;
        const y = 0.8 + t * 13;
        const x = FALL.x + (krng() - 0.5) * 2.4 - 0.08 * y * y * 0.4;
        const z = POOL.z - 0.4 + (krng() - 0.5) * 1.5;
        const q = project(cam, [x, y, z]);
        const r = Math.max(1.3, (0.05 * focal) / z) * (0.8 + krng() * 0.8);
        out += `<circle cx="${n(q.x)}" cy="${n(q.y)}" r="${n(r * 3, 2)}" fill="url(#ve-spark)" opacity="${n(0.95 - t * 0.6, 2)}"/>`;
      }
      return out;
    },
  });
  // The tiny far fall, almost lost in the haze.
  features.push({
    z: farFall[farFall.length - 1][2] - 0.2,
    draw: () => {
      const mid = project(cam, farFall[Math.floor(farFall.length / 2)]);
      const wpx = (FAR_FALL.w0 * focal) / farFall[0][2];
      const halo = softBlob(
        "ve-ffh",
        mid.x,
        mid.y,
        wpx * 4,
        wpx * 7,
        mix(ember, air, hzOf(115) * 0.6),
        0.28,
        0.3
      );
      featDefs.push(halo.def);
      return halo.el + fallSheet("ve-ff", farFall, FAR_FALL.w0, FAR_FALL.w1, 0.62, 0.8);
    },
  });
  // Lit air low over the lava: steam pools glowing from below.
  for (const [z, op] of [
    [9, 0.2],
    [17, 0.22],
    [44, 0.2],
    [70, 0.16],
  ] as Array<[number, number]>) {
    features.push({
      z,
      draw: () => {
        const q = project(cam, [riverX(z), 0.7, z]);
        const b = softBlob(
          `ve-la${z}`,
          q.x,
          q.y,
          (3.2 * focal) / z,
          (1.1 * focal) / z,
          mix(ember, air, hzOf(z) * 0.5),
          op,
          0.35
        );
        featDefs.push(b.def);
        return b.el;
      },
    });
  }
  // Low smoke banks lying on the far plain: they soften the horizon line and
  // carry the lava glow sideways, irregular in size and spacing (no stripes).
  const brng = key("banks");
  for (let k = 0; k < 10; k++) {
    const z = 120 + brng() * 50;
    const x = (brng() * 2 - 1) * 1.45 * z + ((0.5 - cx) * W * z) / focal;
    const R = 9 + brng() * 16;
    const y = 1 + brng() * 3;
    features.push({
      z,
      draw: () => {
        const q = project(cam, [x, y, z]);
        const r = (R * focal) / z;
        const near = Math.exp(-nearestLavaXZ(x, z) / 60);
        const b = softBlob(
          `ve-bk${k}`,
          q.x,
          q.y,
          r,
          r * 0.22,
          mix(smokeLit, air, 0.4 - 0.3 * near),
          0.55,
          0.45
        );
        featDefs.push(b.def);
        return b.el;
      },
    });
  }
  features.sort((a, b) => b.z - a.z);
  const done = new Set<Feature>();

  // Emission loses only part of its contrast to the smoke: pre-lift the lava
  // so the slice haze (one constant per slice) leaves ~55 % of its glow.
  const lavaSurf = (x: number, z: number) => {
    const hz = hzOf(z);
    return lift(lavaAt(x, z), air, Math.min(2, (1 - 0.45 * hz) / (1 - hz)), 0.82);
  };

  // The near river is drawn per slice band as its own smooth piece between
  // the exact lava-line crossings of both banks (as Mandarian's water): the
  // slices alone would leave a staircase of teeth along the diagonal banks.
  // Its texture is the same lavaAt, sampled across the band's middle.
  const lavaBank = (z: number, side: -1 | 1) => {
    // March in small fixed steps to the FIRST rock: a growing step could
    // jump a bank and run on across a low spot of the plain.
    const step = 0.06 + 0.004 * z;
    const limit = 3 + 0.04 * z;
    let a = riverX(z);
    let b = a + side * step;
    while (rawHeight(b, z) <= LAVA && Math.abs(b - riverX(z)) < limit) {
      a = b;
      b += side * step;
    }
    for (let i = 0; i < 18; i++) {
      const m = (a + b) / 2;
      if (rawHeight(m, z) <= LAVA) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  let pieceId = 0;
  const PIECE_Z = 150; // beyond this the river is a sub-pixel thread
  // Gradient reuse (3D1-02): where the slices are dense the pieces are ~1 px
  // tall and ~870 of them each carried their own 12-stop gradient. A sheared
  // gradient stays valid along the river for a few px, so a piece reuses the
  // previous one while it lies within REUSE px of it and its colours agree.
  const REUSE = (8 * H) / 2160;
  let ref: { id: string; ym: number; cols: string[]; K: number } | null = null;
  // Screen slope of the river's centre line (dx/dy), measured over a fixed
  // ±4 % of the distance on the smooth centre line. Measured across a 1 px
  // piece from the noisy banks it jumped between 49° and 65°, and the overlap
  // tab of every piece painted its flow lines a few px off: light dashes
  // across the stream (the "comb hatching" of 3D1-02).
  const riverSlope = (z: number) => {
    const a = project(cam, [riverX(z * 1.04), LAVA, z * 1.04]);
    const b = project(cam, [riverX(z / 1.04), LAVA, z / 1.04]);
    return (b.x - a.x) / (b.y - a.y || 1);
  };
  const riverPiece = (z0: number, z1: number) => {
    if (z0 > PIECE_Z) return "";
    const zz = [z0, (z0 + z1) / 2, z1];
    const l = zz.map(z => project(cam, [lavaBank(z, -1), LAVA, z]));
    const r = zz.map(z => project(cam, [lavaBank(z, 1), LAVA, z]));
    if (r[0].x - l[0].x < 0.5 && r[2].x - l[2].x < 0.5) return "";
    const zm = zz[1];
    const xl = lavaBank(zm, -1);
    const xr = lavaBank(zm, 1);
    const hz = hzOf(zm);
    // A fixed set of fractions across the flow, so neighbouring pieces
    // sample the same streaks and no horizontal steps appear between them.
    const wpx = r[1].x - l[1].x;
    // (K changes only where the river is too thin for a step to show.)
    // 48 samples across the wide river resolve the crust plates and the
    // glowing seams between them; 12 averaged them into a smooth, plastic tube.
    const K = wpx > 220 ? 48 : wpx > 60 ? 28 : wpx > 12 ? 8 : 2;
    const cols: string[] = [];
    for (let k = 0; k <= K; k++) cols.push(mix(lavaSurf(xl + ((xr - xl) * k) / K, zm), air, hz));
    const ym = l[1].y;
    const reuse =
      ref &&
      ref.K === K &&
      Math.abs(ym - ref.ym) < REUSE &&
      cols.every((c0, k) => colourDist(c0, (ref as { cols: string[] }).cols[k]) < 0.012);
    if (!reuse) {
      // Keep a stop only where a straight ramp from the last kept stop to
      // the next sample would miss this one by more than RAMP (OKLab): smooth
      // molten ramps then cost two stops, crust edges keep theirs.
      const RAMP = 0.012;
      const kept = [0];
      for (let k = 1; k < K; k++) {
        const a0 = kept[kept.length - 1];
        const f = (k - a0) / (k + 1 - a0);
        if (colourDist(cols[k], mix(cols[a0], cols[k + 1], f)) > RAMP) kept.push(k);
      }
      kept.push(K);
      const stops = kept.map(k => `<stop offset="${n(k / K, 3)}" stop-color="${cols[k]}"/>`);
      const id = `ve-rv${pieceId++}`;
      // Shear the gradient along the river's screen direction: a plain
      // horizontal gradient would sit offset at a piece's top and bottom on
      // a diagonal river, and the flow lines would step.
      const slope = riverSlope(zm);
      const shear =
        Math.abs(slope) > 0.002
          ? ` gradientTransform="translate(${n(-slope * ym)} 0) skewX(${n((Math.atan(slope) * 180) / Math.PI, 2)})"`
          : "";
      featDefs.push(
        `<linearGradient id="${id}" x1="${Math.round(l[1].x)}" x2="${Math.round(r[1].x)}" y2="0" gradientUnits="userSpaceOnUse"${shear}>${stops.join("")}</linearGradient>`
      );
      ref = { id, ym, cols, K };
    }
    // The top edge overlaps the farther piece by 6 px (at 2160 px high) to
    // hide the seam, only away from the banks: overlapping at the corners
    // would paint over the nearer bank rock and cut a notch per piece (a
    // saw). Less than that, and where ~6 one-px pieces share a pixel
    // (thumbnails, downscaled views) the slices behind leaked through as
    // rungs; the shear along the smooth centre line keeps the overlap true.
    const zo = 1 / Math.max(1e-6, 1 / z0 - (6 * H) / 2160 / (focal * cam.eye));
    const tl = lavaBank(z0, -1);
    const tr = lavaBank(z0, 1);
    const inner = [0.8, 0.2].map(f => project(cam, [tl + (tr - tl) * f, LAVA, zo]));
    return `<path d="${relPath([...l, ...r.reverse(), ...inner])}Z" fill="url(#${(ref as { id: string }).id})"/>`;
  };
  // The terrain may keep tall bands on dark rock (bandScale), but the lava
  // carries crust edges across the flow: a river piece is split into
  // sub-pieces no taller than RIVER_BAND px, so those edges never step.
  const RIVER_BAND = (2.5 * H) / 2160;
  const riverPieces = (z0: number, z1: number) => {
    if (z0 > PIECE_Z) return "";
    const y0 = project(cam, [riverX(z0), LAVA, z0]).y;
    const y1 = project(cam, [riverX(z1), LAVA, z1]).y;
    const m = Math.max(1, Math.min(12, Math.ceil(Math.abs(y1 - y0) / RIVER_BAND)));
    let out = "";
    for (let i = 0; i < m; i++) {
      // Evenly in 1/z, i.e. evenly on screen.
      const za = 1 / (1 / z0 + ((1 / z1 - 1 / z0) * i) / m);
      const zb = 1 / (1 / z0 + ((1 / z1 - 1 / z0) * (i + 1)) / m);
      out += riverPiece(za, zb);
    }
    return out;
  };

  // ── Terrain: adaptive depth slices, far → near ───────────────────────────
  const terrain = slicesVE({
    id: "ve-t",
    cam,
    atm,
    height,
    light,
    zNear: 3,
    zFar: 220,
    candidates: 3000,
    // Thin bands over the river (z 3–35): crust edges across the flow are
    // drawn by them, and 5 px bands showed as steps along those edges.
    maxBand: z => (z < 35 ? 3 : z < 90 ? 8 : 14),
    // Far from every lava light the rock is near-black: bands there may be
    // up to 2× taller without showing (the lava light falls off over R_EM).
    bandScale: (x, z) => {
      const ch = channel(x, z);
      // Inside the main river the sub-divided river pieces paint over the
      // slices, so the slice bands there are never seen.
      if (ch.main && ch.d < 0 && z < PIECE_Z) return 6;
      const dLava = Math.min(
        ch.d,
        Math.hypot(x - FALL.x, z - FALL.z) - 1,
        Math.hypot(x - FAR_FALL.x, z - farSpire.z) - 1
      );
      return 1.25 + 0.75 * smooth(0.5 * R_EM, 2 * R_EM, dLava);
    },
    samples: 340,
    tolerance: 0.015,
    floor: LAVA,
    surface: (_lam, x, z, h, nrm) => {
      if (h <= LAVA + 1e-4) {
        // The main river and pool are painted as smooth pieces over the
        // slices; a constant here costs no gradient stops. It must match the
        // river's edge and the lit bank: the slice gradient blends from the
        // last lava sample to the first rock one just outside each piece, and
        // a dark value there showed as a staircase of teeth along the bank.
        if (z < PIECE_Z && channel(x, z).main) return bankTone;
        return lavaSurf(x, z);
      }
      // Backlight from the glowing smoke low over the far valley: a light
      // AREA, not a direction, so towers left of it catch it on their right
      // flanks and towers right of it on their left — the terminator follows
      // each form. Up-facing rock takes a little of the red sky as ambient.
      const gx = GLOW[0] - x;
      const gy = GLOW[1] - h;
      const gz = GLOW[2] - z;
      const gl = Math.hypot(gx, gy, gz);
      // Only steep faces catch it: lit tops of every ripple on the flat plain
      // stacked into stripes.
      // A slightly wrapped term: the glow is a broad area, so faces turned
      // fully sideways to it catch a thin rim at the silhouette — no more,
      // or whole flanks turn a pale, plastic grey.
      const back =
        Math.max(0, ((nrm[0] * gx + nrm[1] * gy + nrm[2] * gz) / gl + 0.12) / 1.12) *
        smooth(0.92, 0.55, nrm[1]);
      let col = mix(rock, rimRock, Math.min(1, back ** 1.3 * 1.1));
      const ch = channel(x, z);
      if (ch.d < 12 || Math.abs(z - FALL.z) < 12 || Math.abs(z - farSpire.z) < 14) {
        // The lava is a long, broad emitter: its light on rock follows the
        // FORM, not every flute of the weathered surface (review 3D2-01).
        // With the fine normal, the left sides of the domain-warp flutes on
        // the steep front faces caught the river's light as thin wandering
        // strips: the drawn-looking "S" on the right flank (traced with
        // elementsFromPoint to slice z 11.83 at the foot of the tower at
        // (14.1, 13.0), lit em 0.08–0.21 between unlit flute sides).
        // The broad normal (finite difference over ±0.7) keeps the flutes'
        // relief in the backlight rim and lets the lava light roll over them.
        const fd = 0.7;
        const nB = norm3([
          -(height(x + fd, z) - height(x - fd, z)) / (2 * fd),
          1,
          -(height(x, z + fd) - height(x, z - fd)) / (2 * fd),
        ]);
        const e = emission(x, h, z, nB);
        if (e > 0.002) {
          col = mix(col, litRock, Math.min(1, e * 1.3) ** 0.8);
          if (e > 0.75) col = mix(col, glowRock, Math.min(1, (e - 0.75) * 1.2));
          // Rock lit by lava is a secondary emitter seen through the smoke:
          // pre-lift it a little, as the lava itself, so the lit flanks
          // survive the haze and carry the Mustafar look.
          const hz = hzOf(z);
          col = lift(col, air, 1 + Math.min(1, e) * 0.5 * (hz / (1 - hz)), 0.5);
        }
        // The lava/rock boundary is a band: low bank rock takes cooled crust
        // with faint seams, driven by its own noise, never one contour.
        const cb = smooth(0.55, 0, ch.d + 0.3 * ch.bn) * smooth(1.2, 0.2, h);
        if (cb > 0) col = mix(col, lavaAt(x, z), cb * 0.6);
      }
      return col;
    },
    after: s => {
      let out = riverPieces(s.z, s.zNext);
      for (const f of features) {
        if (done.has(f)) continue;
        if (f.z <= s.z && f.z > s.zNext) {
          out += f.draw();
          done.add(f);
        }
      }
      return out;
    },
  });
  layers.push({ defs: `${terrain.defs}\n${featDefs.join("\n")}`, elements: terrain.elements });

  layers.push(grainBrick("ve-grain", W, H, starTint, 0.03));
  return mergeBricks(layers);
}

export function composeVoidEmber(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(voidEmberMotif(p), p);
}
