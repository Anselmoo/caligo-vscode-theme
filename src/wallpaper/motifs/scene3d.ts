/**
 * scene3d — perspective, lighting and depth for wallpaper scenes.
 *
 * Everything is placed in WORLD coordinates and projected through one camera,
 * so sizes, overlaps and haze are consistent across a scene instead of being
 * hand-placed per layer:
 *   · Camera — eye height, horizon line and focal length; a point (x, y, z)
 *     with z = distance ahead projects to screen with true perspective (far
 *     things are smaller and sit closer to the horizon).
 *   · Light — a directional light with Lambert shading per surface plus a
 *     sky ambient term: faces turned to the light take its colour, faces
 *     turned away fall into the shadow colour, with a crisp ridge between.
 *   · Atmosphere — aerial perspective: haze grows as 1 − exp(−z / visibility)
 *     with the true distance.
 *
 * World axes: x right, y up, z away from the viewer (camera at the origin,
 * looking along +z).
 */
import { converter } from "culori";
import { fbm1D, mix, n } from "./shared.js";

const toOklab = converter("oklab");

export type V3 = [number, number, number];
interface Pt {
  x: number;
  y: number;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ─── Camera (perspective) ────────────────────────────────────────────────────

export interface Camera {
  W: number;
  H: number;
  /** Horizon line as a fraction of H. */
  horizon: number;
  /** Eye height above the ground (world units). */
  eye: number;
  /** Focal length in px per world unit at distance 1. */
  focal: number;
  /** Horizontal centre of view, as a fraction of W. */
  cx?: number;
}

export function project(cam: Camera, q: V3): Pt {
  const z = Math.max(q[2], 1e-3);
  return {
    x: cam.W * (cam.cx ?? 0.5) + (cam.focal * q[0]) / z,
    y: cam.H * cam.horizon + (cam.focal * (cam.eye - q[1])) / z,
  };
}

/** Distance of the ground point that projects to screen row y (below the horizon). */
export function groundDistance(cam: Camera, y: number): number {
  const dy = y - cam.H * cam.horizon;
  return dy > 0 ? (cam.focal * cam.eye) / dy : Number.POSITIVE_INFINITY;
}

// ─── Light ───────────────────────────────────────────────────────────────────

export interface Light {
  /** Direction toward the light (normalised internally). */
  dir: V3;
  lit: string;
  shadow: string;
  /** Extra lift for faces that look up at the sky (0–1). */
  skyAmbient?: number;
}

/** Colour of a surface with outward normal `nrm` under `light`. */
export function shadeSurface(light: Light, nrm: V3): { col: string; lam: number } {
  const L = norm3(light.dir);
  const lam = Math.max(0, dot(norm3(nrm), L));
  const sky = (light.skyAmbient ?? 0.12) * Math.max(0, nrm[1]);
  return { col: mix(light.shadow, light.lit, Math.min(1, lam ** 0.85 + sky)), lam };
}

// ─── Atmosphere (depth) ──────────────────────────────────────────────────────

export interface Atmosphere {
  haze: string;
  /** Distance at which ~63 % of the view is haze. */
  visibility: number;
  /** Cap on the haze share (keeps far silhouettes readable). */
  max?: number;
}

export function hazeAt(atm: Atmosphere, z: number): number {
  return Math.min(atm.max ?? 0.85, 1 - Math.exp(-z / atm.visibility));
}

// ─── Faceted peaks ───────────────────────────────────────────────────────────

export interface Peak3 {
  /** Summit position (world x, z) and height; footprint radius. */
  x: number;
  z: number;
  h: number;
  r: number;
  ridges?: number;
}

export interface RangeOptions {
  id: string;
  cam: Camera;
  light: Light;
  atm: Atmosphere;
  peaks: Peak3[];
  rng: () => number;
  /** Ridge jaggedness as a fraction of the radius (default 0.07). */
  jag?: number;
}

/**
 * Faceted peaks in world space. Each peak has K ridges from the summit to its
 * foot; the planar face between two neighbouring ridges is shaded from its 3-D
 * normal (shadeSurface) and hazed by its true distance (hazeAt). Peaks are
 * drawn far to near, faces back to front; faces turned away are skipped.
 */
export function alpineRange(o: RangeOptions): { defs: string; elements: string } {
  const { cam, rng } = o;
  const jag = o.jag ?? 0.07;
  const defs: string[] = [];
  const els: string[] = [];
  const peaks = [...o.peaks].sort((a, b) => b.z - a.z);
  peaks.forEach((p, pi) => {
    const K = p.ridges ?? 5 + Math.floor(rng() * 3);
    const wob = fbm1D(rng, 3);
    const phase = rng() * Math.PI * 2;
    const apex: V3 = [p.x + p.r * 0.1 * (rng() - 0.5), p.h, p.z];
    const feet: V3[] = Array.from({ length: K }, (_, k) => {
      const th = phase + (k / K) * Math.PI * 2 + (rng() - 0.5) * (Math.PI / K) * 0.9;
      const rr = p.r * (0.7 + 0.6 * rng());
      return [p.x + rr * Math.cos(th), 0, p.z + rr * Math.sin(th)];
    });
    // Ridges in world space: steep near the summit, jagged sideways.
    const ridges = feet.map((f, k) => {
      const NR = 10;
      return Array.from({ length: NR + 1 }, (_, i) => {
        const t = i / NR;
        const s = t ** 0.85;
        const amp = jag * p.r * Math.sin(Math.PI * t) ** 0.7;
        const q: V3 = [
          apex[0] + (f[0] - apex[0]) * s + amp * wob(k * 3.1 + t * 4),
          apex[1] * (1 - t) ** 1.25 + amp * 0.35 * wob(k * 5.7 + t * 4 + 20),
          apex[2] + (f[2] - apex[2]) * s,
        ];
        return q;
      });
    });
    const faces = feet.map((f, k) => {
      const g = feet[(k + 1) % K];
      let nrm = norm3(cross(sub(f, apex), sub(g, apex)));
      if (nrm[1] < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
      const mid: V3 = [(apex[0] + f[0] + g[0]) / 3, apex[1] / 3, (apex[2] + f[2] + g[2]) / 3];
      // Toward the camera from the face centre.
      const toCam = norm3([-mid[0], cam.eye - mid[1], -mid[2]]);
      return { k, nrm, mid, facing: dot(nrm, toCam) };
    });
    faces.sort((a, b) => b.mid[2] - a.mid[2]); // far faces first
    for (const fc of faces) {
      if (fc.facing <= 0) continue;
      const { col: body, lam } = shadeSurface(o.light, fc.nrm);
      const hz = hazeAt(o.atm, fc.mid[2]);
      const col = mix(body, o.atm.haze, hz);
      const foot = mix(col, o.atm.haze, 0.3 + 0.4 * hz);
      const a = ridges[fc.k].map(q => project(cam, q));
      const b = ridges[(fc.k + 1) % K].map(q => project(cam, q));
      const path = [...a, ...[...b].reverse()];
      const d = `M${path.map(q => `${n(q.x)},${n(q.y)}`).join("L")}Z`;
      const gid = `${o.id}-${pi}-${fc.k}`;
      const top = a[0].y;
      const bot = Math.max(a[a.length - 1].y, b[b.length - 1].y);
      defs.push(`<linearGradient id="${gid}" x1="0" y1="${n(top)}" x2="0" y2="${n(bot)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${mix(col, o.light.lit, 0.08 * lam)}"/>
  <stop offset="0.55" stop-color="${col}"/>
  <stop offset="1" stop-color="${foot}"/>
</linearGradient>`);
      els.push(`<path d="${d}" fill="url(#${gid})"/>`);
    }
  });
  return { defs: defs.join("\n"), elements: `<g id="${o.id}">${els.join("")}</g>` };
}

// ─── Conifers (perspective-scaled) ───────────────────────────────────────────

export interface ForestOptions {
  cam: Camera;
  /** Ground line the trees stand on: screen y(x) in px. */
  groundAt: (x: number) => number;
  x0: number;
  x1: number;
  /** Tree height range in world units; screen size follows the distance. */
  hMin: number;
  hMax: number;
  colour: string;
  rng: () => number;
}

/**
 * A conifer stand as ONE path. Tree height and spacing are derived from the
 * distance of the ground under each tree (groundDistance), so far trees are
 * small and dense, near ones tall and spread: depth comes from the camera.
 */
export function conifers(o: ForestOptions): string {
  const parts: string[] = [];
  let x = o.x0;
  while (x < o.x1) {
    const y = o.groundAt(x);
    const z = groundDistance(o.cam, y);
    const hw = o.hMin + (o.hMax - o.hMin) * o.rng() ** 1.4;
    const h = Math.min(o.cam.H * 0.25, (o.cam.focal * hw) / z);
    const w = h * (0.26 + 0.08 * o.rng());
    const lean = (o.rng() - 0.5) * w * 0.12;
    const tiers = 4 + Math.floor(o.rng() * 2);
    const right: Pt[] = [];
    for (let t = 0; t < tiers; t++) {
      const u = (t + 1) / tiers;
      const outer = w * 0.5 * u ** 0.9;
      const yy = y - h * (1 - u) * 0.92;
      right.push({ x: x + lean * (1 - u) + outer, y: yy });
      if (t < tiers - 1) right.push({ x: x + lean * (1 - u) + outer * 0.45, y: yy - h * 0.035 });
    }
    const top = { x: x + lean, y: y - h };
    const left = right
      .map(q => ({ x: 2 * x - q.x + 2 * lean * ((y - q.y) / h), y: q.y }))
      .reverse();
    const pts = [top, ...right, { x: x + w * 0.07, y }, { x: x - w * 0.07, y }, ...left];
    parts.push(`M${pts.map(q => `${n(q.x)},${n(q.y)}`).join("L")}Z`);
    x += Math.max(2, w * (0.55 + 0.7 * o.rng()));
  }
  return `<path d="${parts.join("")}" fill="${o.colour}"/>`;
}

// ─── Ground features ─────────────────────────────────────────────────────────

/**
 * A river (or path) on the ground: a world-space centre line x(z) with a
 * constant world width, projected — so it narrows toward the horizon.
 */
export function groundRibbon(
  cam: Camera,
  centreX: (z: number) => number,
  width: number,
  z0: number,
  z1: number,
  steps = 40
): { left: Pt[]; right: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    // Sample evenly in 1/z so the near part gets enough points.
    const t = i / steps;
    const z = 1 / (1 / z0 + (1 / z1 - 1 / z0) * t);
    const xc = centreX(z);
    left.push(project(cam, [xc - width / 2, 0, z]));
    right.push(project(cam, [xc + width / 2, 0, z]));
  }
  return { left, right };
}

// ─── Terrain (height field rendered in perspective) ──────────────────────────

/** Smooth 2-D value noise in [-1, 1] on a seeded, wrapped lattice. */
export function valueNoise2D(rng: () => number, size = 64): (x: number, z: number) => number {
  const v = Array.from({ length: size * size }, () => rng() * 2 - 1);
  const at = (i: number, j: number) =>
    v[(((i % size) + size) % size) * size + (((j % size) + size) % size)];
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x: number, z: number) => {
    const i = Math.floor(x);
    const j = Math.floor(z);
    const fx = sm(x - i);
    const fz = sm(z - j);
    const a = at(i, j) * (1 - fx) + at(i + 1, j) * fx;
    const b = at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx;
    return a * (1 - fz) + b * fz;
  };
}

/**
 * Ridged multifractal (0 … ~1): 1 − |noise| sharpens into crests; each octave
 * is weighted by the previous one, so ridges carry detail and valleys stay
 * smooth — the signature of eroded alpine terrain.
 */
export function ridged2D(rng: () => number, octaves = 6): (x: number, z: number) => number {
  const layers = Array.from({ length: octaves }, () => valueNoise2D(rng));
  return (x: number, z: number) => {
    let sum = 0;
    let amp = 0.5;
    let weight = 1;
    let freq = 1;
    for (const f of layers) {
      let s = 1 - Math.abs(f(x * freq, z * freq));
      s *= s;
      s *= weight;
      weight = Math.min(1, s * 2);
      sum += s * amp;
      freq *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };
}

export interface TerrainSample {
  /** Colour before haze. */
  colour: string;
}

export interface TerrainOptions {
  id: string;
  cam: Camera;
  atm: Atmosphere;
  /** World height at (x, z). */
  height: (x: number, z: number) => number;
  /**
   * Surface colour for a cell (before haze), given its centre, height and
   * outward normal. Return values should come from a small set so cells
   * group into few paths.
   */
  surface: (x: number, z: number, h: number, nrm: V3) => string;
  zNear: number;
  zFar: number;
  cols: number;
  rows: number;
  /** Haze is quantised to this many steps (default 10). */
  hazeSteps?: number;
}

/**
 * Renders a height field through the camera as a grid of quads, far rows
 * first (painter's algorithm). Rows are spaced evenly in 1/z so near and far
 * get similar on-screen density; quads hidden behind nearer terrain are
 * culled; quads of one colour within a row share one path, stroked in its own
 * colour so adjacent cells leave no hairline seams.
 */
export function terrain(o: TerrainOptions): { defs: string; elements: string } {
  const { cam } = o;
  const steps = o.hazeSteps ?? 10;
  const zs = Array.from({ length: o.rows + 1 }, (_, i) => {
    const t = i / o.rows;
    return 1 / (1 / o.zFar + (1 / o.zNear - 1 / o.zFar) * t);
  }); // far → near
  const halfSpan = (z: number) => ((cam.W * 0.56) / cam.focal) * z;
  const cx0 = ((cam.cx ?? 0.5) - 0.5) * (cam.W / cam.focal);
  const V: V3[][] = zs.map(z =>
    Array.from({ length: o.cols + 1 }, (_, j) => {
      const x = cx0 * z + (-1 + (2 * j) / o.cols) * halfSpan(z);
      return [x, o.height(x, z), z] as V3;
    })
  );
  const S = V.map(row => row.map(q => project(cam, q)));
  // Occlusion: walk near → far keeping, per column, the highest screen point
  // seen so far; a quad entirely below it is hidden.
  const visible: boolean[][] = zs.map(() => Array(o.cols).fill(true));
  const top = Array(o.cols + 1).fill(Number.POSITIVE_INFINITY);
  for (let i = o.rows; i >= 0; i--) {
    if (i < o.rows) {
      for (let j = 0; j < o.cols; j++) {
        const qTop = Math.min(S[i][j].y, S[i][j + 1].y, S[i + 1][j].y, S[i + 1][j + 1].y);
        visible[i][j] = qTop < Math.max(top[j], top[j + 1]);
      }
    }
    for (let j = 0; j <= o.cols; j++) top[j] = Math.min(top[j], S[i][j].y);
  }
  const els: string[] = [];
  for (let i = 0; i < o.rows; i++) {
    const groups = new Map<string, string[]>();
    for (let j = 0; j < o.cols; j++) {
      if (!visible[i][j]) continue;
      const a = V[i][j];
      const b = V[i][j + 1];
      const c = V[i + 1][j + 1];
      const d = V[i + 1][j];
      let nrm = norm3(cross(sub(c, a), sub(b, d)));
      if (nrm[1] < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
      const mx = (a[0] + c[0]) / 2;
      const mz = (a[2] + c[2]) / 2;
      const mh = (a[1] + b[1] + c[1] + d[1]) / 4;
      const base = o.surface(mx, mz, mh, nrm);
      const hz = Math.round(hazeAt(o.atm, mz) * steps) / steps;
      const col = mix(base, o.atm.haze, hz);
      const pts = [S[i][j], S[i][j + 1], S[i + 1][j + 1], S[i + 1][j]];
      const dPath = `M${pts.map(q => `${Math.round(q.x)},${Math.round(q.y)}`).join("L")}Z`;
      const list = groups.get(col);
      if (list) list.push(dPath);
      else groups.set(col, [dPath]);
    }
    for (const [col, list] of groups) {
      els.push(
        `<path d="${list.join("")}" fill="${col}" stroke="${col}" stroke-width="1.2" stroke-linejoin="round"/>`
      );
    }
  }
  return { defs: "", elements: `<g id="${o.id}">${els.join("")}</g>` };
}

// ─── Terrain as depth slices (smooth shading, crisp ridges) ──────────────────

export interface SliceOptions {
  id: string;
  cam: Camera;
  atm: Atmosphere;
  height: (x: number, z: number) => number;
  /** Surface colour (before haze) from the light term, height, distance and normal. */
  surface: (lam: number, x: number, z: number, h: number, nrm: V3) => string;
  light: V3;
  zNear: number;
  zFar: number;
  /** Candidate slices (evenly in 1/z) the adaptive selection picks from. */
  candidates: number;
  /** Largest visible band (px) one slice may show before a nearer one is kept. */
  maxBand: number | ((z: number) => number);
  /** Profile samples per slice. */
  samples: number;
  /** OKLab distance below which a colour change emits no new gradient stop. */
  tolerance?: number;
  /** Extra elements painted right after a slice (so nearer slices occlude them). */
  after?: (s: SliceProfile) => string;
}

export interface SliceProfile {
  index: number;
  z: number;
  /** Distance of the next nearer kept slice (zNear for the last). */
  zNext: number;
  /** World x, height, screen point and visibility per sample. */
  xs: number[];
  hs: number[];
  pts: Pt[];
  visible: boolean[];
}

/**
 * Douglas–Peucker: drop points that lie within `eps` (user units) of the
 * straight line through their kept neighbours. A slice outline samples the
 * terrain at a fixed spacing, and on smooth stretches most samples are
 * collinear to well under a pixel; removing them is invisible and roughly
 * halves the outline bytes.
 */
export function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3 || eps <= 0) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const ax = pts[a].x;
    const ay = pts[a].y;
    const dx = pts[b].x - ax;
    const dy = pts[b].y - ay;
    const len = Math.hypot(dx, dy) || 1e-9;
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i].x - ax) - dx * (pts[i].y - ay)) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > eps) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => keep[i] === 1);
}

/** Path data with absolute start and relative integer steps (compact). */
export function relPath(pts: Pt[]): string {
  let px = Math.round(pts[0].x);
  let py = Math.round(pts[0].y);
  let d = `M${px} ${py}l`;
  for (let i = 1; i < pts.length; i++) {
    const x = Math.round(pts[i].x);
    const y = Math.round(pts[i].y);
    const dx = x - px;
    const dy = y - py;
    if (dx === 0 && dy === 0) continue;
    d += `${d.endsWith("l") || dx < 0 ? "" : " "}${dx}${dy >= 0 ? " " : ""}${dy}`;
    px = x;
    py = y;
  }
  return d;
}

/**
 * Renders a height field as cross-sections from far to near. Each slice is the
 * terrain profile at one distance, filled down to the frame's bottom (so it
 * covers everything behind it — painter's algorithm, no seams), coloured by a
 * horizontal gradient whose stops come from the true surface normal at each
 * point against the light, hazed by distance.
 *
 * A slice's colour is constant downward, so the band it shows above the next
 * nearer slice must stay thin or it reads as vertical streaks. Slices are
 * therefore chosen adaptively from a fine candidate set: the next nearer slice
 * is kept as soon as the band would exceed `maxBand`. Everything a slice
 * hides behind nearer terrain is dropped from its outline and its gradient, so
 * dense slicing costs bytes only where the slice is actually seen.
 */
export function terrainSlices(o: SliceOptions): { defs: string; elements: string } {
  const { cam } = o;
  const L = norm3(o.light);
  const tol = o.tolerance ?? 0.02;
  const S = o.samples;
  const eps = 0.02;

  // 1 · All candidate profiles (far → near) and, per candidate, the envelope
  //     (smallest screen y) of everything nearer.
  const C = o.candidates;
  const zs: number[] = [];
  const prof: Array<{ xs: number[]; hs: number[]; pts: Pt[] }> = [];
  for (let i = 0; i <= C; i++) {
    const z = 1 / (1 / o.zFar + (1 / o.zNear - 1 / o.zFar) * (i / C));
    const half = ((cam.W * 0.54) / cam.focal) * z;
    const xc = ((cam.cx ?? 0.5) - 0.5) * (cam.W / cam.focal) * z;
    const xs: number[] = [];
    const hs: number[] = [];
    const pts: Pt[] = [];
    for (let k = 0; k <= S; k++) {
      // Samples at fixed screen x for every slice, so envelopes line up.
      const x = xc - half + (2 * half * k) / S;
      const h = o.height(x, z);
      xs.push(x);
      hs.push(h);
      pts.push(project(cam, [x, h, z]));
    }
    zs.push(z);
    prof.push({ xs, hs, pts });
  }
  const env: number[][] = new Array(C + 1);
  env[C] = new Array(S + 1).fill(cam.H);
  for (let i = C - 1; i >= 0; i--)
    env[i] = env[i + 1].map((e, k) => Math.min(e, prof[i + 1].pts[k].y));

  // 2 · Greedy selection: from the current slice, take the farthest nearer
  //     candidate whose visible band in front of it stays within maxBand.
  const kept: number[] = [0];
  let cur = 0;
  while (cur < C) {
    let next = cur + 1;
    const maxBand = typeof o.maxBand === "number" ? o.maxBand : o.maxBand(zs[cur]);
    for (let j = cur + 1; j <= C; j++) {
      let band = 0;
      for (let k = 0; k <= S; k++) {
        const top = prof[cur].pts[k].y;
        const bottom = Math.min(prof[j].pts[k].y, env[j][k]);
        if (top < env[cur][k] + 1) band = Math.max(band, bottom - top);
      }
      if (band > maxBand) break;
      next = j;
    }
    kept.push(next);
    cur = next;
  }

  // 3 · Paint the kept slices far → near.
  const defs: string[] = [];
  const els: string[] = [];
  kept.forEach((ci, idx) => {
    const z = zs[ci];
    const { xs, hs, pts } = prof[ci];
    const nearer = idx + 1 < kept.length ? kept[idx + 1] : -1;
    const front = nearer < 0 ? new Array(S + 1).fill(cam.H) : env[ci];
    const visible = pts.map((q, k) => q.y < front[k] + 1);
    if (!visible.some(Boolean)) return;
    const hz = hazeAt(o.atm, z);
    const colour = (k: number) => {
      const x = xs[k];
      const dx = (o.height(x + eps * z, z) - o.height(x - eps * z, z)) / (2 * eps * z);
      const dz = (o.height(x, z + eps * z) - o.height(x, z - eps * z)) / (2 * eps * z);
      const nrm = norm3([-dx, 1, -dz]);
      const lam = Math.max(0, nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]);
      return mix(o.surface(lam, x, z, hs[k], nrm), o.atm.haze, hz);
    };
    // Outline: every visible sample plus its neighbours; inside hidden runs
    // only every 4th sample, pushed down below the nearer terrain's lowest
    // point on its span — a straight chord between sparse points must never
    // rise above what covers it, or it shows as a flat, false facet.
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
    // Gradient: stops only from visible samples, where the colour changes.
    const stops: Array<{ sx: number; col: string }> = [];
    let prevK = -1;
    let prevCol = "";
    for (let k = 0; k <= S; k++) {
      if (!visible[k]) continue;
      const col = colour(k);
      const last = stops[stops.length - 1];
      if (!last) stops.push({ sx: pts[k].x, col });
      else if (colourDist(col, last.col) > tol) {
        if (prevK >= 0 && pts[prevK].x > last.sx + 0.5 && prevK === k - 1)
          stops.push({ sx: pts[prevK].x, col: prevCol });
        stops.push({ sx: pts[k].x, col });
      }
      prevK = k;
      prevCol = col;
    }
    if (prevK >= 0 && stops[stops.length - 1].sx < pts[prevK].x - 0.5)
      stops.push({ sx: pts[prevK].x, col: prevCol });
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
              `<stop offset="${n((c.sx - x0) / (x1 - x0), 3).replace(/^0\./, ".")}" stop-color="${c.col}"/>`
          )
          .join("")}</linearGradient>`
      );
      fill = `url(#${id})`;
    }
    els.push(
      `<path d="${relPath(simplify(outline, 0.6))}V${cam.H}H${Math.round(x0)}Z" fill="${fill}"/>`
    );
    if (o.after) {
      const zNext = nearer < 0 ? o.zNear : zs[nearer];
      els.push(o.after({ index: idx, z, zNext, xs, hs, pts, visible }));
    }
  });
  return { defs: defs.join("\n"), elements: `<g id="${o.id}">${els.join("")}</g>` };
}

/** Rough perceptual distance between two colours (OKLab, via mix endpoints). */
function colourDist(a: string, b: string): number {
  const A = okl(a);
  const B = okl(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

const okCache = new Map<string, V3>();
function okl(c: string): V3 {
  let v = okCache.get(c);
  if (!v) {
    const o = toOklab(c) as { l: number; a: number; b: number } | undefined;
    v = [o?.l ?? 0, o?.a ?? 0, o?.b ?? 0];
    okCache.set(c, v);
  }
  return v;
}

// ─── Conifers along a terrain profile ────────────────────────────────────────

/**
 * Conifers standing on one slice profile at distance z: height in world units,
 * projected with that z, so trees on every slice shrink with distance. `where`
 * decides per sample whether a tree may stand there.
 */
export function coniferRow(
  cam: Camera,
  s: SliceProfile,
  o: {
    hMin: number;
    hMax: number;
    colour: string;
    rng: () => number;
    where: (x: number, h: number, k: number) => boolean;
  }
): string {
  const parts: string[] = [];
  const at = (sx: number) => {
    // Interpolate the profile's screen y at screen x.
    const p = s.pts;
    let k = 0;
    while (k < p.length - 2 && p[k + 1].x < sx) k++;
    const f = Math.min(1, Math.max(0, (sx - p[k].x) / (p[k + 1].x - p[k].x || 1)));
    return { y: p[k].y + (p[k + 1].y - p[k].y) * f, k: f < 0.5 ? k : k + 1 };
  };
  let sx = s.pts[0].x + o.rng() * 8;
  const end = s.pts[s.pts.length - 1].x;
  while (sx < end) {
    const { y, k } = at(sx);
    const hw = o.hMin + (o.hMax - o.hMin) * o.rng() ** 1.3;
    const h = (cam.focal * hw) / s.z;
    const w = h * (0.28 + 0.08 * o.rng());
    if (s.visible[k] && o.where(s.xs[k], s.hs[k], k) && h > 1.5) {
      const lean = (o.rng() - 0.5) * w * 0.1;
      const tiers = h > 30 ? 3 : 2;
      const right: Pt[] = [];
      for (let t = 0; t < tiers; t++) {
        const u = (t + 1) / tiers;
        const outer = w * 0.5 * u ** 0.9;
        const yy = y + h * 0.1 - h * (1 - u) * 0.95;
        right.push({ x: sx + lean * (1 - u) + outer, y: yy });
        if (t < tiers - 1) right.push({ x: sx + lean * (1 - u) + outer * 0.45, y: yy - h * 0.04 });
      }
      const top = { x: sx + lean, y: y + h * 0.1 - h };
      const left = right
        .map(q => ({ x: 2 * sx - q.x + 2 * lean * ((y - q.y) / h), y: q.y }))
        .reverse();
      parts.push(`${relPath([top, ...right, ...left])}Z`);
    }
    sx += Math.max(1.5, w * (0.45 + 0.6 * o.rng()));
  }
  return parts.length ? `<path d="${parts.join("")}" fill="${o.colour}"/>` : "";
}
