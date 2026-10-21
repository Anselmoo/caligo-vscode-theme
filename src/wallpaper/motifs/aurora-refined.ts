/**
 * AuroraNoir — an aurora curtain folding over the arctic tundra, built in 3D.
 *
 * Concept: one green aurora curtain hangs over a dark, snow-patched tundra on
 * a clear arctic night. Its near leg comes in from the left across the sky, the
 * curtain turns edge-on just right of centre, and its far leg recedes to the
 * right toward a dark, backlit ridge on the horizon. Where the curtain turns
 * edge-on the light gathers into a bright fold that fades out over tens of px
 * on both sides; the near leg, seen face-on, stays thin and translucent, its
 * rays gathered in irregular bundles.
 *
 * World: x right, y up, z away (scene units; the eye stands 1.7 high). The
 * curtain is a vertical emissive sheet whose plan-view footprint is a smooth
 * S-curve (FOOTPRINT) that turns nearly radial over z ≈ 64–100 but never
 * doubles back on screen. The sheet has a thickness (bell-distributed ray
 * offsets, wider where it runs edge-on), and an edge-on ray is as wide as
 * that projected thickness. Its hem hangs at ≈18 with a per-ray ragged
 * offset, its ray tops at 27–49, so the hem drops toward the horizon with
 * distance and the fold reads in depth by itself. Ray spacing is clumped
 * (exponential gaps scaled by a slow density field, varied ray widths) where
 * rays are wide enough to tell apart, and even on the compressed far leg.
 * The ground is a low tundra height field (swells of about ±1, plus
 * band-limited hummocks of wavelength ≈ 2–5 near the viewer) with one dark
 * ridge at z ≈ 135–285 and a faint far range behind it, rendered as
 * adaptive depth slices.
 *
 * Camera: eye 1.7. Monitor horizon 0.80, focal 0.9·H; tablet 0.78, 0.9·H
 * (it sees the central 75 % of the monitor's field); mobile horizon 0.84 with
 * a portrait long lens, focal = W / (2 · 0.45), so the fold fills the frame
 * instead of shrinking into a strip.
 *
 * Light: the curtain is emissive. Its brightness per screen area follows the
 * path length of the view ray through the sheet, 1 / sin φ (φ between the view
 * ray and the sheet in plan), so the fold brightens from geometry. Its colour
 * follows altitude (green core just above the hem, violet tops), and airmass
 * extinction dims and greys the far leg toward the horizon. Below the hem
 * each ray continues as a skirt of varied length that starts at the ray's
 * own foot value with a flat slope (C1 at the hem), so the lower edge falls
 * off softly and no plateau sits under it (lesson 5, 3D1-06). The ground is
 * lit BY the curtain: a Lambert sum over light samples along the sheet,
 * weighted by their emission and 1/d², mapped by a response centred on flat
 * ground (not clamped at it), between a teal-black shadow and a faint green,
 * so hummock faces turned toward the curtain lift inside each snow patch
 * (3D1-07).
 *
 * Atmosphere: haze = a dark airglow, visibility 120, max 0.45 — far forms are
 * darker silhouettes against the brighter airglow sky (backlit).
 *
 * Personal touch: the snow patches on the near swells catch a green lift
 * exactly where their drifts face the brightest stretch of the curtain, as
 * real snow would; it comes from n·L, never from a painted sliver. Snow
 * edges follow the hollows of swells and hummocks through a wide,
 * noise-driven partial-cover band.
 */

import { converter } from "culori";
import { mergeBricks } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";
import { type Camera, project, relPath, type V3, valueNoise2D } from "./scene3d.js";
import { grainBrick, keepLightness, mix, n, rngFrom, shade, starField, tone } from "./shared.js";

// ─── Small numeric helpers ───────────────────────────────────────────────────

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Smooth 1-D value noise in [-1, 1], periodic over `size` lattice units (no seam at the wrap). */
function noise1D(rng: () => number, size = 256): (x: number) => number {
  const v = Array.from({ length: size }, () => rng() * 2 - 1);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    const a = v[((i % size) + size) % size];
    const b = v[(((i + 1) % size) + size) % size];
    return a + (b - a) * s;
  };
}

/**
 * Band-limited fbm along the curtain. Each octave fades out once its period
 * on screen (px per world unit / frequency) drops below ~30 px, so the far leg,
 * compressed by perspective, never aliases into a barcode (lesson 10); the
 * near leg keeps all its octaves.
 */
function bandFbm(rng: () => number, octaves: number, freq: number) {
  const layers = Array.from({ length: octaves }, () => noise1D(rng));
  return (u: number, pxPerUnit: number) => {
    let sum = 0;
    let norm = 0;
    let amp = 1;
    let f = freq;
    for (const layer of layers) {
      const w = smooth(26, 90, pxPerUnit / f);
      sum += w * amp * layer(u * f);
      norm += amp;
      amp *= 0.55;
      f *= 2.13;
    }
    return sum / norm;
  };
}

/**
 * Gradient stops sampled from a monotone C1 (PCHIP) curve through `anchors`
 * ([offset, opacity] pairs). A piecewise-linear ramp changes slope at each
 * stop, and those slope breaks line up across neighbouring rays into faint
 * horizontal ledges (Mach bands).
 */
function smoothStops(
  anchors: Array<[number, number]>,
  count: number,
  colorAt: (t: number) => string
): string {
  const k = anchors.length - 1;
  const h = anchors.slice(0, k).map((a, i) => anchors[i + 1][0] - a[0]);
  const d = anchors.slice(0, k).map((a, i) => (anchors[i + 1][1] - a[1]) / h[i]);
  const m = anchors.map((_, i) => {
    if (i === 0) return 0;
    if (i === k) return d[k - 1];
    if (d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * h[i] + h[i - 1];
    const w2 = h[i] + 2 * h[i - 1];
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  });
  const at = (t: number) => {
    const i = Math.min(
      k - 1,
      anchors.findIndex((_a, j) => j < k && t <= anchors[j + 1][0])
    );
    const u = (t - anchors[i][0]) / h[i];
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
    const h10 = u ** 3 - 2 * u ** 2 + u;
    const h01 = -2 * u ** 3 + 3 * u ** 2;
    const h11 = u ** 3 - u ** 2;
    return (
      h00 * anchors[i][1] + h10 * h[i] * m[i] + h01 * anchors[i + 1][1] + h11 * h[i] * m[i + 1]
    );
  };
  return Array.from({ length: count + 1 }, (_, j) => {
    const t = j / count;
    const o = Math.max(0, Math.min(1, at(t)));
    return `<stop offset="${n(t, 3)}" stop-color="${colorAt(t)}" stop-opacity="${n(o, 3)}"/>`;
  }).join("");
}

// ─── Camera per platform (direction-3d §2) ───────────────────────────────────

function cameraFor(p: BrickParams): Camera {
  const { width: W, height: H } = p.viewBox;
  const eye = 1.7;
  // Portrait: a long lens (half-width tangent 0.45, ≈48°) keeps the fold large.
  if (p.platform === "mobile" || H > W) return { W, H, horizon: 0.84, eye, focal: W / (2 * 0.45) };
  if (p.platform === "tablet") return { W, H, horizon: 0.78, eye, focal: 0.9 * H };
  return { W, H, horizon: 0.8, eye, focal: 0.9 * H };
}

// ─── The curtain's footprint in plan view (x, z) ─────────────────────────────

/**
 * Control points of the sheet's S-curve. The near leg starts off-frame left,
 * the tangent turns nearly radial (edge-on, sin φ down to ≈ 0.05) over
 * z ≈ 64–100 — the fold — and the far leg recedes right toward the ridge.
 * Screen x never runs backwards (min sin φ > 0): an earlier footprint doubled
 * back there, which stacked the rays into a vertical wall with a notch in
 * the hem (3D1-06).
 */
const FOOTPRINT: Array<[number, number]> = [
  [-150, 44],
  [-95, 46],
  [-52, 49],
  [-20, 53],
  [0, 60],
  [5, 70],
  [8.5, 84],
  [13, 102],
  [30, 132],
  [72, 180],
  [128, 232],
  [190, 282],
  [250, 330],
];

interface SheetPoint {
  x: number;
  z: number;
  /** Unit tangent in plan. */
  tx: number;
  tz: number;
}

/** Arc-length parametrised Catmull-Rom curve through FOOTPRINT. */
function sheetCurve(): { length: number; at: (u: number) => SheetPoint } {
  const P = FOOTPRINT;
  const pts: Array<[number, number]> = [];
  const SUB = 80;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    for (let j = 0; j < SUB; j++) {
      const t = j / SUB;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(P[P.length - 1]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const length = cum[cum.length - 1];
  const at = (u: number): SheetPoint => {
    const uu = Math.min(length, Math.max(0, u));
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= uu) lo = mid;
      else hi = mid;
    }
    const f = (uu - cum[lo]) / (cum[hi] - cum[lo] || 1);
    const a = pts[lo];
    const b = pts[hi];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    return { x: a[0] + dx * f, z: a[1] + dz * f, tx: dx / l, tz: dz / l };
  };
  return { length, at };
}

// ─── Depth slices (private copy of scene3d.terrainSlices with one fix) ──────

/**
 * Adapted from scene3d.terrainSlices (read-only there). Same painter's
 * algorithm and adaptive selection, with one fix worth promoting: the greedy
 * step measures the band only over the current slice's VISIBLE samples, so
 * when a kept slice is entirely hidden (here: every slice of the far range
 * behind the ridge on the narrow mobile view) the band stays 0 and the
 * selection jumped straight to the nearest candidate — the whole tundra
 * vanished. A fully hidden slice now advances by one candidate instead.
 */
function depthSlices(o: {
  id: string;
  cam: Camera;
  atm: { haze: string; visibility: number; max: number };
  height: (x: number, z: number) => number;
  surface: (x: number, z: number, h: number, nrm: V3) => string;
  zNear: number;
  zFar: number;
  candidates: number;
  maxBand: (z: number) => number;
  samples: number;
  tolerance: number;
}): { defs: string; elements: string } {
  const { cam } = o;
  const S = o.samples;
  const C = o.candidates;
  const eps = 0.02;
  const zs: number[] = [];
  const prof: Array<{ xs: number[]; hs: number[]; pts: Array<{ x: number; y: number }> }> = [];
  for (let i = 0; i <= C; i++) {
    const z = 1 / (1 / o.zFar + (1 / o.zNear - 1 / o.zFar) * (i / C));
    const half = ((cam.W * 0.54) / cam.focal) * z;
    const xc = ((cam.cx ?? 0.5) - 0.5) * (cam.W / cam.focal) * z;
    const xs: number[] = [];
    const hs: number[] = [];
    const pts: Array<{ x: number; y: number }> = [];
    for (let k = 0; k <= S; k++) {
      const x = xc - half + (2 * half * k) / S; // fixed screen x per sample
      const h = o.height(x, z);
      xs.push(x);
      hs.push(h);
      pts.push(project(cam, [x, h, z]));
    }
    zs.push(z);
    prof.push({ xs, hs, pts });
  }
  // env[i][k]: highest screen point (smallest y) of everything nearer than i.
  const env: number[][] = new Array(C + 1);
  env[C] = new Array(S + 1).fill(cam.H);
  for (let i = C - 1; i >= 0; i--)
    env[i] = env[i + 1].map((e, k) => Math.min(e, prof[i + 1].pts[k].y));

  const kept: number[] = [0];
  let cur = 0;
  while (cur < C) {
    const seen = prof[cur].pts.some((q, k) => q.y < env[cur][k] + 1);
    let next = cur + 1;
    if (seen) {
      const maxBand = o.maxBand(zs[cur]);
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
    }
    kept.push(next);
    cur = next;
  }

  const defs: string[] = [];
  const els: string[] = [];
  kept.forEach((ci, idx) => {
    const z = zs[ci];
    const { xs, hs, pts } = prof[ci];
    const nearer = idx + 1 < kept.length ? kept[idx + 1] : -1;
    const front = nearer < 0 ? new Array(S + 1).fill(cam.H) : env[ci];
    const visible = pts.map((q, k) => q.y < front[k] + 1);
    if (!visible.some(Boolean)) return;
    const hz = Math.min(o.atm.max, 1 - Math.exp(-z / o.atm.visibility));
    const colour = (k: number) => {
      const x = xs[k];
      const dx = (o.height(x + eps * z, z) - o.height(x - eps * z, z)) / (2 * eps * z);
      const dz = (o.height(x, z + eps * z) - o.height(x, z - eps * z)) / (2 * eps * z);
      const l = Math.hypot(dx, 1, dz);
      return mix(o.surface(x, z, hs[k], [-dx / l, 1 / l, -dz / l]), o.atm.haze, hz);
    };
    // Hidden runs keep every 4th sample, pushed below what covers them, so a
    // chord between sparse points never rises into view as a false facet.
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
    // Gradient stops only from visible samples, and only where colour changes.
    const stops: Array<{ sx: number; col: string }> = [];
    let prevK = -1;
    let prevCol = "";
    for (let k = 0; k <= S; k++) {
      if (!visible[k]) continue;
      const col = colour(k);
      const last = stops[stops.length - 1];
      if (!last) stops.push({ sx: pts[k].x, col });
      else if (labDist(col, last.col) > o.tolerance) {
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
            st =>
              `<stop offset="${n((st.sx - x0) / (x1 - x0), 3).replace(/^0\./, ".")}" stop-color="${st.col}"/>`
          )
          .join("")}</linearGradient>`
      );
      fill = `url(#${id})`;
    }
    els.push(`<path d="${relPath(outline)}V${cam.H}H${Math.round(x0)}Z" fill="${fill}"/>`);
  });
  return { defs: defs.join("\n"), elements: `<g id="${o.id}">${els.join("")}</g>` };
}

const toOklab = converter("oklab");
const labCache = new Map<string, V3>();
function lab(c: string): V3 {
  let v = labCache.get(c);
  if (!v) {
    const o = toOklab(c) as { l: number; a: number; b: number } | undefined;
    v = [o?.l ?? 0, o?.a ?? 0, o?.b ?? 0];
    labCache.set(c, v);
  }
  return v;
}
/** OKLab distance between two colours. */
function labDist(a: string, b: string): number {
  const A = lab(a);
  const B = lab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

// ─── The scene ───────────────────────────────────────────────────────────────

export function auroraRefinedMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-aurora-refined-${part}`);
  const cam = cameraFor(p);
  const horizonY = cam.horizon * H;
  const scale = Math.max(W, H) / 3840;

  // ── Value plan: hue follows the palette, lightness is guarded per role ────
  const night = shade(c.bg, 0.6);
  const airglow = mix(c.bg, c.accent, 0.24);
  const hem = keepLightness(mix(c.accent, c.variables, 0.3), 0.62, 0.9);
  const fringe = keepLightness(c.strings, 0.6, 0.88);
  const mid = mix(hem, fringe, 0.55);
  const groundShadow = keepLightness(shade(c.bg, 0.32), 0.05, 0.09);
  const groundLit = keepLightness(tone(mix(shade(c.bg, 0.5), hem, 0.3), 0.7), 0.12, 0.18);
  const frostShadow = keepLightness(mix(shade(c.bg, 0.55), airglow, 0.35), 0.1, 0.14);
  const frostLit = keepLightness(tone(mix(c.bg, hem, 0.45), 0.6), 0.24, 0.3);
  const hazeCol = keepLightness(mix(airglow, groundShadow, 0.5), 0.1, 0.15);
  const atm = { haze: hazeCol, visibility: 120, max: 0.45 };

  const layers: BrickOutput[] = [];

  // ── Sky: zenith night to bg, then a calm airglow toward the horizon ──────
  layers.push({
    defs: `<linearGradient id="ar-sky" x1="0" y1="0" x2="0" y2="${n(horizonY)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${night}"/>
  <stop offset="0.5" stop-color="${mix(night, c.bg, 0.55)}"/>
  <stop offset="0.8" stop-color="${c.bg}"/>
  <stop offset="0.94" stop-color="${mix(c.bg, airglow, 0.3)}"/>
  <stop offset="1" stop-color="${mix(c.bg, airglow, 0.46)}"/>
</linearGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#ar-sky)"/>`,
  });

  layers.push(
    starField({
      id: "ar-st",
      width: W,
      horizonY,
      count: Math.round(380 * Math.sqrt((W * H) / (3840 * 2160))),
      tints: [mix(c.strings, c.functions, 0.4), c.strings, mix(c.variables, c.strings, 0.5)].map(
        t => keepLightness(t, 0.78, 0.97)
      ),
      rng: key("stars"),
    })
  );

  // ── The curtain: an emissive sheet in world space ─────────────────────────
  const sheet = sheetCurve();
  const L = sheet.length;
  const bundles = bandFbm(key("bundles"), 2, 0.035);
  const tops = bandFbm(key("tops"), 3, 0.03);
  const hemWave = bandFbm(key("hem"), 4, 0.025);
  const skirtLen = bandFbm(key("skirt"), 2, 0.06);
  // Ray density along the sheet: rays gather in bundles with gaps between.
  const density = bandFbm(key("density"), 2, 0.09);
  const rayRng = key("rays");
  const thickRng = key("thick");
  const hemRng = key("hem-rag");
  const HEM = 18;
  const THICK = 0.9;
  const COVER = 3; // mean number of steps a ray spans
  const RAY_FOOT = 0.5; // ray opacity at the hem, where the skirt takes over

  /** Screen-space derivatives of the sheet at arc length u. */
  const local = (u: number) => {
    const q = sheet.at(u);
    const r = Math.hypot(q.x, q.z);
    const cross = q.tx * q.z - q.tz * q.x; // r · sin φ, signed
    const sinPhi = Math.abs(cross) / r;
    const dxdu = (cam.focal * cross) / (q.z * q.z); // px per world unit along the sheet
    // Px per unit used to band-limit noise: never below the vertical scale,
    // so the edge-on fold keeps its detail instead of losing every octave.
    const pxPer = Math.max(Math.abs(dxdu), (cam.focal * 0.35) / q.z);
    return { q, r, sinPhi, dxdu, pxPer };
  };
  const hemAlt = (u: number, pxPer: number) => HEM + 1.6 * hemWave(u, pxPer);
  // Airmass extinction: the curtain dims and greys as it nears the horizon.
  const extinction = (r: number, alt: number) => {
    const sinEl = Math.sin(Math.atan2(alt - cam.eye, r));
    const airmass = Math.min(22, 1 / Math.max(0.045, sinEl));
    return Math.exp(-0.075 * (airmass - 1));
  };
  // Long-exposure response: emission per screen area ∝ path length 1/sin φ.
  const pathGain = (sinPhi: number) => Math.min(2.8, 1 / Math.max(0.15, sinPhi)) ** 0.8;

  const BUCKETS = 4; // colour variants by extinction (greyer toward the horizon)
  const rayGroups: string[][] = Array.from({ length: BUCKETS }, () => []);
  const skirtGroups: string[][] = Array.from({ length: BUCKETS }, () => []);
  const lights: Array<{ x: number; y: number; z: number; w: number }> = [];
  const targetPx = 4.6 * scale;
  let u = 0;
  let lastLight = -1e9;
  while (u < L) {
    const a = local(u);
    // Clumped spacing (lesson 10, 3D1-06 "barcode"): gaps are exponential
    // (many small, a few wide) and scaled by a slow density field, so rays
    // gather in bundles instead of repeating at one pitch.
    // Only where rays are wide enough to be told apart: on the far leg,
    // compressed by perspective, clumps would turn into a row of blobs.
    const cl = smooth(10, 40, a.pxPer / scale);
    const dens = 0.5 + 0.5 * density(u, a.pxPer);
    const r = rayRng();
    const clumped = (0.15 + 0.85 * -Math.log(1 - 0.98 * r)) * (1.45 - 0.9 * dens);
    const gap = cl * clumped + (1 - cl) * (0.7 + 0.6 * r);
    const du = Math.max(0.04, (targetPx * gap) / Math.max(a.pxPer, Math.abs(a.dxdu)));
    // Each ray spans 1.5–5 steps (varied widths); neighbours overlap where
    // the rays crowd, and a bundle gap may stay dark.
    const cover = 1.5 + 3.5 * rayRng();
    const u1 = Math.min(L, u + cover * du);
    const b = local(u1);
    // The sheet has a thickness: each ray sits a little in front of or behind
    // the centre line, drawn from a bell (mean of three uniforms) so the
    // spread has no hard edge. Face-on this only shifts depth; edge-on (the
    // fold) it spreads the caustic into a band tens of px wide that fades
    // out on both sides, instead of one crisp vertical line.
    const thick = THICK + 2.6 * (1 - smooth(0.08, 0.42, a.sinPhi));
    const off = 1.4 * thick * ((thickRng() + thickRng() + thickRng()) / 3 - 0.5);
    const ax = a.q.x + off * a.q.tz;
    const az = a.q.z - off * a.q.tx;
    const bx = b.q.x + off * b.q.tz;
    const bz = b.q.z - off * b.q.tx;
    const t = u / L;
    const env = smooth(0, 0.05, t) * smooth(1, 0.8, t);
    const clump = (0.5 + 0.5 * bundles(u, a.pxPer)) ** 1.6;
    const fine = 0.55 + 0.9 * rayRng() ** 1.5;
    const ext = extinction(a.r, HEM);
    const emission = env * (0.22 + 0.78 * clump) * pathGain(a.sinPhi) * ext;
    const topJit = 0.85 + 0.3 * rayRng();
    if (env > 0.05 && u - lastLight > L / 40) {
      // Light samples for the ground, before the per-ray striation.
      lights.push({ x: a.q.x, y: HEM + 8, z: a.q.z, w: env * (0.3 + 0.7 * clump) });
      lastLight = u;
    }
    const op = Math.min(0.9, (0.85 / COVER) * emission * fine);
    // A ragged hem: each ray's lower end hangs a little lower or higher.
    const rag = -1.5 * hemRng() ** 2 + 0.3 * hemRng();
    const hA = hemAlt(u, a.pxPer) + rag;
    const hB = hemAlt(u1, b.pxPer) + rag;
    const top = HEM + (9 + 22 * (0.5 + 0.5 * tops(u, a.pxPer))) * topJit;
    const p0 = project(cam, [ax, hA, az]);
    const p1 = project(cam, [bx, hB, bz]);
    const p2 = project(cam, [bx, top, bz]);
    const p3 = project(cam, [ax, top, az]);
    // Edge-on, a ray is as wide as the sheet's projected thickness, never a
    // sliver: the fold's light then gathers into one soft band (pathGain
    // sets how bright) instead of thinning out where the rays crowd.
    const wMin = (0.6 * thick * cam.focal) / a.q.z;
    const w = p1.x - p0.x;
    if (Math.abs(w) < wMin) {
      const mid = (p0.x + p1.x) / 2;
      const half = (w < 0 ? -wMin : wMin) / 2;
      p0.x = p3.x = mid - half;
      p1.x = p2.x = mid + half;
    }
    const onScreen = Math.max(p0.x, p1.x) > -20 && Math.min(p0.x, p1.x) < W + 20;
    const bucket = Math.min(BUCKETS - 1, Math.floor((1 - ext) * BUCKETS * 1.25));
    if (onScreen && op > 0.012) {
      // The ray ramp is mapped to each ray's own box, so the true top is kept
      // even above the frame; the frame crops it.
      rayGroups[bucket].push(
        `<path d="M${n(p0.x)} ${n(p0.y)}L${n(p1.x)} ${n(p1.y)}L${n(p2.x)} ${n(p2.y)}L${n(p3.x)} ${n(p3.y)}Z" opacity="${n(op, 2)}"/>`
      );
      // The skirt continues each ray below the hem and fades into the sky, so
      // the hem has a soft falloff on both sides (lesson 5, 3D1-06). It starts
      // at the ray's own bottom value with a flat slope (both ramps are C1 at
      // the hem), and its length varies per ray, so no plateau with a crisp
      // upper edge sits under the hem. Damped (not cut) where the sheet runs
      // edge-on, so the fold does not grow a bright column below the hem.
      const skirtGate = 0.45 + 0.55 * smooth(0.1, 0.4, a.sinPhi);
      {
        const sk = (4 + 4 * (0.5 + 0.5 * skirtLen(u, a.pxPer))) * (0.7 + 0.6 * hemRng());
        const s0 = project(cam, [ax, hA - sk, az]);
        const s1 = project(cam, [bx, hB - sk, bz]);
        s0.x = p0.x; // same columns as the (possibly widened) ray
        s1.x = p1.x;
        const sop = Math.min(0.8, op * RAY_FOOT * skirtGate);
        if (sop > 0.012)
          skirtGroups[bucket].push(
            `<path d="M${n(p0.x)} ${n(p0.y)}L${n(p1.x)} ${n(p1.y)}L${n(s1.x)} ${n(s1.y)}L${n(s0.x)} ${n(s0.y)}Z" opacity="${n(sop, 2)}"/>`
          );
      }
    }
    u += du;
  }

  // Ray ramp from the hem (bottom of each ray's box) to its top: it starts at
  // RAY_FOOT with a flat slope (meeting the skirt), peaks just above the hem
  // in the green core, then violet, fading into the sky. Greyed per
  // extinction bucket.
  const rampDefs = Array.from({ length: BUCKETS }, (_, k) => {
    const grey = (col: string) => mix(col, airglow, 0.2 * k);
    return `<linearGradient id="ar-ray${k}" x1="0" y1="1" x2="0" y2="0">${smoothStops(
      [
        [0, RAY_FOOT],
        [0.05, 0.8],
        [0.09, 0.88],
        [0.22, 0.46],
        [0.42, 0.23],
        [0.7, 0.1],
        [1, 0],
      ],
      20,
      t =>
        grey(
          t <= 0.18
            ? hem
            : t <= 0.4
              ? mix(hem, mid, (t - 0.18) / 0.22)
              : t <= 0.7
                ? mix(mid, fringe, (t - 0.4) / 0.3)
                : fringe
        )
    )}</linearGradient>
<linearGradient id="ar-sk${k}" x1="0" y1="0" x2="0" y2="1">${smoothStops(
      [
        [0, 1],
        [0.16, 0.86],
        [0.4, 0.45],
        [0.68, 0.13],
        [1, 0],
      ],
      12,
      () => grey(hem)
    )}</linearGradient>`;
  }).join("\n");

  // A very faint wash of aurora light in the air around the fold — tight and
  // weak, never a broad glow cut by the ridge (lesson 4).
  const fold = project(cam, [5, HEM + 10, 70]);
  layers.push({
    defs: `${rampDefs}
<filter id="ar-soft" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${n(horizonY)}">
  <feGaussianBlur stdDeviation="${n(2.6 * scale, 2)} ${n(0.8 * scale, 2)}"/>
</filter>
<radialGradient id="ar-wash" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${n(fold.x)} ${n(fold.y)}) scale(${n(W * 0.42)} ${n(H * 0.3)})">
  <stop offset="0" stop-color="${hem}" stop-opacity="0.035"/>
  <stop offset="0.5" stop-color="${hem}" stop-opacity="0.012"/>
  <stop offset="1" stop-color="${hem}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#ar-wash)"/>
<g id="ar-curtain" filter="url(#ar-soft)">${skirtGroups.map((g, k) => (g.length ? `<g fill="url(#ar-sk${k})">${g.join("")}</g>` : "")).join("")}${rayGroups.map((g, k) => (g.length ? `<g fill="url(#ar-ray${k})">${g.join("")}</g>` : "")).join("")}</g>`,
  });

  // ── Tundra: low swells, snow in the hollows, one dark ridge, a far range ─
  const swellA = valueNoise2D(key("swell-a"), 64);
  const swellB = valueNoise2D(key("swell-b"), 64);
  const tussock = valueNoise2D(key("tussock"), 64);
  const crestA = valueNoise2D(key("crest-a"), 64);
  const crestB = valueNoise2D(key("crest-b"), 64);
  const frostN = valueNoise2D(key("frost"), 64);
  const frostFine = valueNoise2D(key("frost-fine"), 64);
  const hummockN = valueNoise2D(key("hummock"), 64);
  const swells = (x: number, z: number) =>
    0.62 * swellA(x * 0.055, z * 0.055) + 0.3 * swellB(x * 0.15, z * 0.15);
  // Mid-scale relief (wavelength ≈ 4–5): drifts and frost hummocks whose
  // faces turn toward or away from the curtain, so light changes inside a
  // snow patch (3D1-07). Band-limited: gone by z ≈ 45, where it would alias.
  const hummocks = (x: number, z: number) =>
    smooth(44, 12, z) *
    (0.42 * hummockN(x * 0.2, z * 0.2) + 0.3 * hummockN(x * 0.43 + 31, z * 0.43 + 17));
  const height = (x: number, z: number) => {
    const amp = 0.95 + 0.3 * smooth(10, 40, z);
    // Small tussock relief only where it spans enough pixels to be seen.
    const fineW = smooth(45, 14, z);
    const ground = amp * swells(x, z) + hummocks(x, z) + 0.07 * fineW * tussock(x * 0.8, z * 0.8);
    // The ridge: rises over z 135–205 and falls a little behind its crest.
    const crestH = 9 + 6 * crestA(x * 0.011, 3.3) + 2 * crestB(x * 0.05, 7.1);
    const ridge = crestH * (smooth(135, 205, z) - 0.45 * smooth(215, 285, z));
    // A faint far range on the skyline, peeking over the ridge in places.
    const farH = 15 + 9 * crestB(x * 0.008, 13.7) + 3 * crestA(x * 0.03, 21.2);
    const far = farH * smooth(300, 380, z);
    return ground + Math.max(ridge, far);
  };

  // The curtain lights the ground: Lambert over the light samples, with an
  // inverse-square falloff, normalised so open snow near the viewer is ≈ 1.
  const irradiance = (x: number, y: number, z: number, nrm: V3) => {
    let e = 0;
    for (const l of lights) {
      const dx = l.x - x;
      const dy = l.y - y;
      const dz = l.z - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const d = Math.sqrt(d2);
      const lam = Math.max(0, (nrm[0] * dx + nrm[1] * dy + nrm[2] * dz) / d);
      e += (l.w * lam) / d2;
    }
    return e;
  };
  const eRef = irradiance(0, 0, 10, [0, 1, 0]) || 1;

  const terrain = depthSlices({
    id: "ar-t",
    cam,
    atm,
    height,
    zNear: 4,
    zFar: 400,
    candidates: 3000,
    maxBand: z => (z < 25 ? 14 : 5) * scale,
    samples: 420,
    tolerance: 0.012,
    surface: (x, z, h, nrm) => {
      const e = irradiance(x, h, z, nrm) / eRef;
      // A response centred on flat ground instead of a clamp at e = 1: flat
      // snow sits at 0.62, faces turned toward the curtain (e ≈ 1.3) lift
      // to full light, faces turned away sink toward the shadow, so each
      // patch carries its own gradient (3D1-07) instead of one flat tone.
      // The curtain is low (≈ 30°), so ±10° of relief moves e by ≈ ±30 %.
      const lit = smooth(-0.1, 1.15, 0.62 + 1.15 * (e - 1));
      // Snow lies in the hollows of the swells and hummocks and on flat
      // ground; its edge wanders with its own noise (method rule 6) through
      // a wide partial-cover band, never one contour. The fine octave frays
      // the edge near the viewer and fades out with distance, where it would
      // only alias into stripes.
      const fray = 0.22 * smooth(45, 12, z) * frostFine(x * 0.4, z * 0.4);
      const hollow =
        -(swells(x, z) + 0.8 * hummocks(x, z)) * 0.9 + 0.55 * frostN(x * 0.09, z * 0.09) + fray;
      const snow =
        smooth(0.06, 0.42, hollow) * smooth(0.8, 0.96, nrm[1]) * (1 - smooth(140, 200, z));
      const tundra = mix(groundShadow, groundLit, (0.75 * lit) ** 1.3);
      const frost = mix(frostShadow, frostLit, lit);
      return mix(tundra, frost, snow);
    },
  });
  layers.push({ defs: terrain.defs, elements: terrain.elements });

  layers.push(grainBrick("ar-grain", W, H, mix(c.strings, c.accent, 0.3), 0.035));
  return mergeBricks(layers);
}

/** Motif + the stock mode composer, i.e. exactly what would ship. */
export function composeAuroraRefined(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(auroraRefinedMotif(p), p);
}
