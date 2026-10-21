/**
 * Cinder — a burnt forest at night, lit only by what still smoulders.
 *
 * Concept: the fire has passed. Charred snags stand in thick smoke over a
 * forest floor of ash; three things still glow and are the only light: a
 * smouldering log right of centre, a scattered bed of coals far left and a
 * hollow stump on the right that glows at its foot. The smoke drifts left and
 * cools from rust (low, where the embers light it) to ash (high). No horizon:
 * the ground dissolves into the smoke.
 *
 * World (x right, y up, z away; metres): a gently undulating forest floor
 * (height field, ±0.3) from the frame bottom to z 70; ~100 snags as tapered,
 * leaning cylinders (r 0.12–0.35, h 1.5–14) in a clumped scatter over z 2–36;
 * the log lies diagonally from (0.25, 9.6) to (2.75, 8.55), the stump stands
 * at (4, 6), the coal bed spreads around (−6, 16). Smoke is a set of formless
 * world-space volumes (centre, radius) placed in the same depth order as
 * everything else, so the snags in front of the log's lit smoke belly stand
 * dark against it. Emitters (coals, cracks, sparks) are painted last, since
 * their light scatters in the air in front of the ground.
 *
 * Camera: eye 1.6. Monitor and tablet: horizon 0.55, focal 0.75·H (constant
 * vertical field, so the tablet sees the central 75 %). Mobile: horizon 0.52,
 * focal W/1.4 (≈70° across), panned (yawed) about the eye so the log sits
 * near 0.55 W. The world is identical on every platform; only the camera
 * changes. (A yaw, not `cam.cx`: terrainSlices offsets its samples by cx
 * twice, which leaves the right edge of a shifted view uncovered.)
 *
 * Light: nine point lights (three along the log, one in the stump's hollow,
 * five over the coal bed), each I/(1 + (d/r)²)·max(0, n·L) against the true
 * normal — ground pools take the terrain's shape, snags are shaded across
 * their width from sampled cylinder normals with a crisp terminator, strongest
 * low on the trunk. Sky light is a faint ash ambient on up-facing ground.
 *
 * Atmosphere: smoke air, visibility 10 (thick). Every colour is mixed toward
 * the opaque air colour at its own altitude (warm low smoke, darker high
 * smoke), never toward transparency; far snags stay readable at 80 %.
 *
 * Snags and log are shaded from their own normals (review 3D1-10: they read
 * as flat cut-outs): each trunk is cut into short strips along its axis, each
 * with a gradient across its local width from 9 cylinder normals, lit by the
 * embers, the lit smoke belly (an area light) and the smoke glowing behind
 * (a wrapped back light: a soft rim on both flanks that falls off around the
 * cylinder); a slow seeded char noise darkens the bark in patches and scales
 * the light it reflects. The log is a round section shaded per segment
 * (crown, dark middle, glowing underside) with knots, an uneven top and a
 * snapped branch. Both framing snags are snapped off inside the frame.
 *
 * Review round 3D2 (3D2-05, the left framing snag read as a flat stage
 * column; luminance profile across it: centre 05–07, edges 09–0A, smoke
 * behind 0D–15 in 8-bit grey): it stood ~7 m from the log, so the lit
 * smoke belly (half at 2.6 m) gave it ~5 %, and its back-rim target was the
 * air at its own altitude, barely brighter than bark. Now it is a burnt
 * trunk snapped at 3.4 m with a ragged top and two stubs inside the frame,
 * tapering and leaning a little outward, at x/z = −0.67 (tablet edge
 * −0.89, where it had been a full-height edge sliver; out of the panned
 * mobile frame entirely). Its shading adds a backdrop rim: toward the
 * silhouette the cylinder takes on the colour of the smoke behind it at
 * that screen height (as the sky gradient), strongest on the side turned
 * toward the log's plume, rolling off over two extra normals per side.
 * Same profile after: centre 06–07, glow-side edge ramps 08 → 0C → 10
 * into the smoke at 0F–16.
 *
 * Personal touch: the snags standing beside the log catch its light low on
 * their facing side, as if the forest were still warm inside.
 */
import { oklch } from "culori";
import { mergeBricks } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";
import {
  type Camera,
  hazeAt,
  norm3,
  project,
  type SliceProfile,
  terrainSlices,
  type V3,
  valueNoise2D,
} from "./scene3d.js";
import {
  fbm1D,
  grainBrick,
  keepLightness,
  lightness,
  mix,
  n,
  palest,
  rngFrom,
  shade,
  smoothPath,
  starField,
  tone,
} from "./shared.js";

// ─── Small helpers ───────────────────────────────────────────────────────────

/** Palette role whose OKLCH hue is nearest `target` (chroma >= minC). */
function byHue(cands: string[], target: number, minC: number): string {
  let best = cands[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const c of cands) {
    const o = oklch(c);
    if (!o || (o.c ?? 0) < minC) continue;
    const dh = Math.abs((((o.h ?? 0) - target + 540) % 360) - 180);
    if (dh < bestD) {
      bestD = dh;
      best = c;
    }
  }
  return best;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** Wrapped Lambert: light from a broad source still reaches faces turned sideways. */
const wrap = (nl: number, w: number) => Math.max(0, (nl + w) / (1 + w));
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Standard normal sample from a seeded uniform stream (Box-Muller). */
const gauss = (rng: () => number) =>
  Math.sqrt(-2 * Math.log(1 - rng() * 0.999)) * Math.cos(2 * Math.PI * rng());

interface Pt {
  x: number;
  y: number;
}

/**
 * A tapered, gently bent limb stub as a filled outline (no strokes) ending in
 * a blunt tip. Winding matches the trunk outline so the overlap never cuts a
 * hole.
 */
function stub(x: number, y: number, ang: number, len: number, w0: number, bend: number) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  let nx = -dy;
  let ny = dx;
  if (dx * ny - dy * nx > 0) {
    nx = -nx;
    ny = -ny;
  }
  const w1 = w0 * 0.3;
  const ex = x + dx * len + nx * bend * 0.5;
  const ey = y + dy * len + ny * bend * 0.5;
  const a = { x: x + (nx * w0) / 2, y: y + (ny * w0) / 2 };
  const b = { x: x - (nx * w0) / 2, y: y - (ny * w0) / 2 };
  const c = { x: ex + (nx * w1) / 2, y: ey + (ny * w1) / 2 };
  const d = { x: ex - (nx * w1) / 2, y: ey - (ny * w1) / 2 };
  const m1 = { x: a.x * 0.55 + c.x * 0.45 + nx * bend, y: a.y * 0.55 + c.y * 0.45 + ny * bend };
  const m2 = { x: b.x * 0.55 + d.x * 0.45 + nx * bend, y: b.y * 0.55 + d.y * 0.45 + ny * bend };
  return `M${n(a.x)},${n(a.y)}Q${n(m1.x)},${n(m1.y)} ${n(c.x)},${n(c.y)}Q${n(ex + dx * w1 * 0.7)},${n(ey + dy * w1 * 0.7)} ${n(d.x)},${n(d.y)}Q${n(m2.x)},${n(m2.y)} ${n(b.x)},${n(b.y)}Z`;
}

/** A polyline whose corners are rounded by `r` px: small, blunt, splintered edges. */
function roundedLine(pts: Pt[], r: number): string {
  let d = "";
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const la = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const lc = Math.hypot(c.x - b.x, c.y - b.y) || 1;
    const ra = Math.min(r, la * 0.45);
    const rc = Math.min(r, lc * 0.45);
    d += `L${n(b.x + ((a.x - b.x) * ra) / la)},${n(b.y + ((a.y - b.y) * ra) / la)}Q${n(b.x)},${n(b.y)} ${n(b.x + ((c.x - b.x) * rc) / lc)},${n(b.y + ((c.y - b.y) * rc) / lc)}`;
  }
  const last = pts[pts.length - 1];
  return `${d}L${n(last.x)},${n(last.y)}`;
}

/** A point light on or just above the forest floor. */
interface Lamp {
  p: V3;
  /** Intensity at the source (1 = the log at its hottest). */
  I: number;
  /** Distance at which the light has fallen to half. */
  r: number;
  /** Colour family: 0 log (orange), 1 stump (hot), 2 coal bed (deep red). */
  tint: 0 | 1 | 2;
}

interface Snag {
  x: number;
  z: number;
  r: number;
  h: number;
  /** Lean of the top in world metres (x, z). */
  lx: number;
  lz: number;
  taper: number;
  stubs: number;
  key: string;
  /**
   * Backdrop rim (review 3D2-05), for the near framing snag: its flanks
   * catch the light of what stands behind them, strongest on the side
   * turned toward the log's lit smoke, rolling off around the cylinder.
   */
  rim?: number;
}

/** Something painted at one distance, in the painter's order of the terrain. */
interface Item {
  z: number;
  draw: () => BrickOutput;
}

export function cinderMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-cinder-${part}`);

  // ── Value plan: night ink darkest, smoke air a step up, embers the only heat
  const bgL = lightness(c.bg);
  const warmCands = [
    c.hueOrange,
    c.numbers,
    c.variables,
    c.strings,
    c.hueRed,
    c.accentSoft,
    c.types,
    c.constants,
  ];
  // Three ember temperatures: the log orange, the stump hotter, the bed deeper.
  const emberLog = keepLightness(byHue(warmCands, 38, 0.1), 0.6, 0.68);
  const yellowish = byHue([...warmCands, c.hueYellow, c.attributes], 72, 0.05);
  const emberHot = keepLightness(mix(emberLog, yellowish, 0.55), 0.8, 0.88);
  const emberDeep = keepLightness(byHue(warmCands, 22, 0.1), 0.5, 0.56);
  const tints = [emberLog, mix(emberLog, emberHot, 0.6), emberDeep];

  const coolSrc = palest([c.functions, c.types, c.hueBlue, c.hueCyan, c.tags, c.keywords]);
  const ash = tone(coolSrc, 0.16);
  // Air at three altitudes: warm low smoke, darker smoke aloft, night at the top.
  const hazeLow = keepLightness(mix(mix(c.bg, ash, 0.3), emberLog, 0.05), bgL + 0.07, bgL + 0.1);
  const hazeHigh = keepLightness(mix(c.bg, ash, 0.18), bgL + 0.025, bgL + 0.05);
  const night = shade(c.bg, 0.7);
  const air = (y: number) =>
    mix(mix(hazeLow, hazeHigh, smooth(1, 8, y)), night, 0.75 * smooth(8, 22, y));
  const soot = shade(c.bg, 0.6);
  const bark = shade(c.bg, 0.55);
  const barkAmb = keepLightness(mix(bark, ash, 0.1), bgL * 0.55, bgL * 0.75);
  const floorChar = keepLightness(mix(c.bg, ash, 0.05), bgL * 0.6, bgL * 0.8);
  const floorAsh = keepLightness(mix(c.bg, ash, 0.16), bgL - 0.01, bgL + 0.02);
  const smokeAsh = keepLightness(mix(c.bg, ash, 0.42), bgL + 0.14, bgL + 0.2);
  // What each ember's light looks like on each material (albedo-limited).
  const litOn = (base: string, lo: number, hi: number) =>
    tints.map(t => keepLightness(mix(t, base, 0.3), lo, hi));
  const groundLit = litOn(floorAsh, 0.4, 0.5);
  const barkLit = litOn(bark, 0.27, 0.35);
  const smokeLit = litOn(smokeAsh, 0.4, 0.48);

  // ── One camera per platform, same world ───────────────────────────────────
  const portrait = H > W;
  const cam: Camera = portrait
    ? { W, H, horizon: 0.52, eye: 1.6, focal: W / 1.4 }
    : { W, H, horizon: 0.55, eye: 1.6, focal: 0.75 * H };
  const f = cam.focal;
  // Mobile pans right (a yaw about the eye, not a shifted view centre) so the
  // log sits near 0.55 W; the eye stays at the origin, so what hides what is
  // the same world on every platform.
  const yaw = portrait ? Math.atan(1.5 / 9) - Math.atan((0.05 * W) / f) : 0;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  /** World → camera space. */
  const toCam = (q: V3): V3 => [q[0] * cy - q[2] * sy, q[1], q[0] * sy + q[2] * cy];
  /** Camera-space ground point → world (x, z). */
  const toWorld = (x: number, z: number) => [x * cy + z * sy, -x * sy + z * cy];
  const P = (q: V3) => project(cam, toCam(q));
  /** Distance along the view axis (what the painter's order and haze use). */
  const depth = (q: V3) => toCam(q)[2];
  const atm = { haze: hazeLow, visibility: 10, max: 0.8 };
  // The ground dissolves fully: its own cap is higher, so no horizon line shows.
  const groundAtm = { haze: hazeLow, visibility: 10, max: 0.95 };
  const hz = (z: number) => hazeAt(atm, z);
  /** Opaque aerial perspective at the point's own altitude. */
  const fog = (col: string, y: number, z: number) => mix(col, air(y), hz(z));

  // ── Ground: a gently undulating forest floor, calm in front ───────────────
  const g1 = valueNoise2D(key("ground"), 64);
  const g2 = valueNoise2D(key("ground2"), 64);
  const patchN = valueNoise2D(key("patch"), 64);
  const height = (x: number, z: number) =>
    smooth(1.4, 6, z) * (0.3 * g1(x * 0.16, z * 0.16) + 0.08 * g2(x * 0.5 + 7, z * 0.5 + 3));

  // ── Embers in world space ─────────────────────────────────────────────────
  const logA: V3 = [0.25, 0, 9.6];
  const logB: V3 = [2.75, 0, 8.55];
  const logR = 0.21;
  const logAt = (t: number): V3 => {
    const x = logA[0] + (logB[0] - logA[0]) * t;
    const z = logA[2] + (logB[2] - logA[2]) * t;
    return [x, height(x, z) + logR * 0.8, z];
  };
  const stumpP: V3 = [4, height(4, 6), 6];
  // The lit smoke belly over the log, as an area light for the snags' flanks.
  const belly: V3 = (() => {
    const lq = logAt(0.5);
    return [lq[0] - 0.3, lq[1] + 1.25, lq[2] + 0.25];
  })();
  const bedC = { x: -6, z: 16 };
  const lamps: Lamp[] = [];
  for (const [t, I] of [
    [0.3, 0.9],
    [0.52, 1.4],
    [0.72, 1.0],
  ] as const) {
    const q = logAt(t);
    // In front of and just under the log, where its glowing underside faces.
    lamps.push({ p: [q[0], q[1] - 0.05, q[2] - 0.35], I, r: 1, tint: 0 });
  }
  lamps.push({
    p: [stumpP[0] - 0.05, stumpP[1] + 0.3, stumpP[2] - 0.45],
    I: 0.55,
    r: 0.75,
    tint: 1,
  });
  {
    const rng = key("bedlamps");
    for (let i = 0; i < 5; i++) {
      const x = bedC.x + gauss(rng) * 1.1;
      const z = bedC.z + gauss(rng) * 0.8;
      lamps.push({ p: [x, height(x, z) + 0.3, z], I: 0.3 + 0.25 * rng(), r: 0.8, tint: 2 });
    }
  }

  /** Per-lamp light at q (with Lambert against `nrm` unless null). */
  const lightAt = (q: V3, nrm: V3 | null) =>
    lamps.map(l => {
      const v: V3 = [l.p[0] - q[0], l.p[1] - q[1], l.p[2] - q[2]];
      const d = Math.hypot(v[0], v[1], v[2]) || 1e-3;
      const k = l.I / (1 + (d / l.r) ** 2);
      return nrm ? k * Math.max(0, dot(nrm, [v[0] / d, v[1] / d, v[2] / d])) : k;
    });
  /** Light a base colour with the lamps' contributions on a material. */
  const lightUp = (base: string, ks: number[], litCols: string[], gain: number) => {
    let out = base;
    let sum = 0;
    let col = "";
    ks.forEach((k, i) => {
      if (k < 0.003) return;
      const lc = litCols[lamps[i].tint];
      col = sum === 0 ? lc : mix(col, lc, k / (sum + k));
      sum += k;
    });
    if (sum > 0) out = mix(base, col, Math.min(1, sum * gain) ** 0.85);
    return out;
  };

  // ── Snags: a clumped scatter over a fixed world region ────────────────────
  // Angular wedges (seen from the eye) kept clear in front of each ember.
  const wedge = (x: number, z: number, x0: number, x1: number, zMax: number) =>
    z < zMax && x / z > x0 / zMax - 0.02 && x / z < x1 / zMax + 0.02;
  const blocked = (x: number, z: number) =>
    wedge(x, z, logA[0] - 0.25, logB[0] + 0.25, 9.6) ||
    wedge(x, z, stumpP[0] - 0.6, stumpP[0] + 0.6, 6.6) ||
    wedge(x, z, bedC.x - 0.9, bedC.x + 0.9, 16.5) ||
    Math.hypot(x - 1.5, z - 9) < 1.4 ||
    Math.hypot(x - stumpP[0], z - stumpP[2]) < 0.9;
  const snags: Snag[] = [];
  {
    const rng = key("scatter");
    const z0 = 2.2;
    const z1 = 36;
    const halfW = (z: number) => 1.3 * z + 0.6;
    const centres = Array.from({ length: 10 }, () => {
      const z = Math.sqrt(z0 * z0 + rng() * (z1 * z1 - z0 * z0));
      return { x: (2 * rng() - 1) * halfW(z), z };
    });
    const pts: Array<{ x: number; z: number }> = [];
    // The personal touch: a few snags just beside and behind the log.
    for (const [x, z] of [
      [-0.75, 9.9],
      [3.55, 9.2],
      [1.15, 10.7],
    ] as const)
      pts.push({ x: x + (rng() - 0.5) * 0.3, z: z + (rng() - 0.5) * 0.3 });
    let guard = 0;
    while (pts.length < 96 && guard++ < 6000) {
      let x: number;
      let z: number;
      if (rng() < 0.84) {
        const cc = centres[Math.floor(rng() * centres.length)];
        x = cc.x + gauss(rng) * 1.5;
        z = cc.z + gauss(rng) * 1.5;
      } else {
        z = Math.sqrt(z0 * z0 + rng() * (z1 * z1 - z0 * z0));
        x = (2 * rng() - 1) * halfW(z);
      }
      if (z < z0 || z > z1 || Math.abs(x) > halfW(z) || blocked(x, z)) continue;
      if (pts.some(q => Math.hypot(q.x - x, q.z - z) < 1.15)) continue;
      pts.push({ x, z });
    }
    pts.forEach((q, i) => {
      const r2 = key(`snag-${i}`);
      const cls = r2();
      const tall = cls > 0.74;
      const stumpy = cls < 0.4;
      const h = stumpy ? 1.5 + 2 * r2() : tall ? 8 + 6 * r2() : 3.5 + 4.5 * r2();
      const r = clamp((tall ? 0.18 : 0.12) + 0.17 * r2(), 0.12, 0.35);
      const lean = (r2() * 6 * Math.PI) / 180; // ≤ 6°
      const dir = r2() * Math.PI * 2;
      snags.push({
        x: q.x,
        z: q.z,
        r,
        h,
        lx: Math.tan(lean) * h * Math.cos(dir),
        lz: Math.tan(lean) * h * Math.sin(dir) * 0.5,
        taper: tall ? 0.45 + 0.2 * r2() : 0.2 + 0.3 * r2(),
        stubs: tall ? 1 + Math.floor(r2() * 3) : !stumpy && r2() < 0.4 ? 1 : 0,
        key: `snag-${i}`,
      });
    });
    // Two near snags frame the view. The left one (3D2-05) is a burnt trunk
    // snapped at 3.4 m with a ragged top and two stubs inside the frame,
    // leaning a little outward, at x/z = -0.67: wholly inside the tablet
    // frame (edge at -0.89; at -0.8 it was a full-height edge sliver) and
    // wholly outside the panned mobile one; it carries the backdrop rim.
    // The right one stands a little deeper and is snapped off at ~4 m, so
    // its broken top sits inside the monitor frame.
    snags.push(
      {
        x: -2,
        z: 3,
        r: 0.17,
        h: 3.4,
        lx: -0.3,
        lz: 0,
        taper: 0.35,
        stubs: 2,
        key: "near-l",
        rim: 1,
      },
      { x: 4.45, z: 4.6, r: 0.2, h: 4.1, lx: -0.2, lz: 0, taper: 0.22, stubs: 1, key: "near-r" }
    );
  }

  // Contact shadow (ambient occlusion) on the ground round each snag's foot.
  const grid = new Map<string, Snag[]>();
  const cell = (x: number, z: number) => `${Math.floor(x / 2)},${Math.floor(z / 2)}`;
  for (const s of snags) {
    const k = cell(s.x, s.z);
    grid.set(k, [...(grid.get(k) ?? []), s]);
  }
  const occlusion = (x: number, z: number) => {
    let ao = 1;
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const s of grid.get(cell(x + i * 2, z + j * 2)) ?? []) {
          const d = Math.hypot(x - s.x, z - s.z);
          ao *= 1 - 0.6 * Math.exp(-((d / (s.r * 3.2)) ** 2));
        }
    return ao;
  };

  const layers: BrickOutput[] = [];
  let uid = 0;

  /** A formless soft volume: rotated elliptical radial gradient, no edge. */
  const volume = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rot: number,
    col: string,
    op: number
  ): BrickOutput => {
    const id = `cbv${uid++}`;
    return {
      defs: `<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientTransform="rotate(${n(rot)} ${n(cx)} ${n(cy)}) translate(0 ${n(cy * (1 - ry / rx))}) scale(1 ${n(ry / rx, 3)})" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col}" stop-opacity="${n(op, 3)}"/><stop offset=".35" stop-color="${col}" stop-opacity="${n(op * 0.62, 3)}"/><stop offset=".7" stop-color="${col}" stop-opacity="${n(op * 0.17, 3)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`,
      elements: `<rect x="${n(cx - rx * 1.05)}" y="${n(cy - rx * 1.05)}" width="${n(rx * 2.1)}" height="${n(rx * 2.1)}" fill="url(#${id})"/>`,
    };
  };
  /** An emitter: hot core, steep PSF-like falloff, no edge (tight, lesson 4). */
  const glow = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rot: number,
    core: string,
    col: string,
    op: number
  ): BrickOutput => {
    const id = `cbg${uid++}`;
    return {
      defs: `<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientTransform="rotate(${n(rot)} ${n(cx)} ${n(cy)}) translate(0 ${n(cy * (1 - ry / rx))}) scale(1 ${n(ry / rx, 3)})" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${core}" stop-opacity="${n(op, 3)}"/><stop offset=".12" stop-color="${mix(core, col, 0.5)}" stop-opacity="${n(op * 0.62, 3)}"/><stop offset=".35" stop-color="${col}" stop-opacity="${n(op * 0.22, 3)}"/><stop offset=".7" stop-color="${col}" stop-opacity="${n(op * 0.05, 3)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`,
      elements: `<rect x="${n(cx - rx * 1.05)}" y="${n(cy - rx * 1.05)}" width="${n(rx * 2.1)}" height="${n(rx * 2.1)}" fill="url(#${id})"/>`,
    };
  };

  // ── Sky: the air at the altitude a view ray reaches ~10 m out ─────────────
  {
    const hY = cam.horizon * H;
    const stops: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const s = (i / 8) * hY;
      const alt = cam.eye + ((hY - s) * 10) / f;
      stops.push(`<stop offset="${n(s / H, 3)}" stop-color="${air(alt)}"/>`);
    }
    stops.push(`<stop offset="1" stop-color="${hazeLow}"/>`);
    layers.push({
      defs: `<linearGradient id="cbk" x1="0" y1="0" x2="0" y2="1">${stops.join("")}</linearGradient>`,
      elements: `<rect width="${W}" height="${H}" fill="url(#cbk)"/>`,
    });
  }
  // A few stars where the smoke thins, high up only.
  layers.push(
    starField({
      id: "cbst",
      width: W,
      horizonY: H * (portrait ? 0.3 : 0.4),
      count: portrait ? 14 : 24,
      tints: [
        keepLightness(tone(coolSrc, 0.2), 0.74, 0.84),
        keepLightness(mix(coolSrc, emberLog, 0.3), 0.66, 0.78),
      ],
      rng: key("stars"),
    })
  );

  // ── Depth-ordered items: snags, smoke volumes, the three embers ───────────
  const items: Item[] = [];
  const onScreen = (x0: number, x1: number) => x1 > -40 && x0 < W + 40;

  /** One snag: opaque body shaded across its width, faded upward by altitude. */
  const snagItem = (s: Snag, opts: { hollow?: boolean } = {}): Item | null => {
    const rng = rngFrom(`${p.seedId}-${p.harmonyMode}-cinder-${s.key}-shape`);
    const gy = height(s.x, s.z);
    const sink = (2 * s.z) / f + s.r * 0.15; // a pixel or two, plus slope cover
    const base: V3 = [s.x, gy - sink, s.z];
    const zc = depth(base);
    const N = s.h > 6 ? 9 : 6;
    const swell = rng() * 6.28;
    const rAt = (t: number) =>
      s.r *
      (1 - s.taper * t ** 0.9) *
      (t < 0.06 ? 1 + 0.3 * (1 - t / 0.06) ** 2 : 1) *
      (1 + 0.05 * Math.sin(swell + t * 9));
    const axis = Array.from({ length: N + 1 }, (_, i) => {
      const t = (i / N) * 0.97;
      const q: V3 = [
        base[0] + s.lx * t ** 1.3,
        base[1] + (s.h + sink) * t,
        base[2] + s.lz * t ** 1.3,
      ];
      return { t, q, sp: P(q), w: (f * rAt(t)) / depth(q) };
    });
    const xs = axis.map(a => a.sp.x);
    const wMax = Math.max(...axis.map(a => a.w));
    if (!onScreen(Math.min(...xs) - wMax, Math.max(...xs) + wMax)) return null;
    if (axis[axis.length - 1].sp.y > H + 10 && axis[0].sp.y > H + 10) return null;
    const left: Pt[] = [];
    const right: Pt[] = [];
    axis.forEach((a, i) => {
      const b = axis[Math.min(i + 1, N)];
      const pa = axis[Math.max(i - 1, 0)];
      const dx = b.sp.x - pa.sp.x;
      const dy = b.sp.y - pa.sp.y;
      const l = Math.hypot(dx, dy) || 1;
      const px = -dy / l;
      const py = dx / l;
      const jit = i === 0 ? 0 : (rng() - 0.5) * 0.14;
      const jit2 = i === 0 ? 0 : (rng() - 0.5) * 0.14;
      left.push({ x: a.sp.x - px * a.w * (1 + jit), y: a.sp.y - py * a.w * (1 + jit) });
      right.push({ x: a.sp.x + px * a.w * (1 + jit2), y: a.sp.y + py * a.w * (1 + jit2) });
    });
    // Ragged break: an angled, stepped break with two or three blunt teeth.
    const topL = left[N];
    const topR = right[N];
    const wTop = Math.max(2, topR.x - topL.x);
    const hPx = axis[0].sp.y - axis[N].sp.y;
    const side = rng() < 0.5 ? -1 : 1;
    const drop = wTop * (0.15 + 0.75 * rng());
    const yL = topL.y - hPx * 0.03 + (side < 0 ? drop : 0);
    const yR = topR.y - hPx * 0.03 + (side > 0 ? drop : 0);
    const teeth = s.h < 3 || opts.hollow ? 3 : 2 + (rng() < 0.4 ? 1 : 0);
    const chain: Pt[] = [topL, { x: topL.x - wTop * 0.02, y: yL }];
    for (let k = 0; k < teeth; k++) {
      const fx = (k + 0.5) / teeth + (rng() - 0.5) * 0.18;
      const bx = topL.x + wTop * fx;
      const yb = yL + (yR - yL) * fx;
      const bw = (wTop / teeth) * (0.7 + 0.5 * rng());
      const th = bw * (0.25 + 0.65 * rng());
      chain.push({ x: bx - bw * 0.5, y: yb + bw * 0.12 * (rng() - 0.3) });
      chain.push({ x: bx + bw * (rng() - 0.5) * 0.2, y: yb - th });
      chain.push({ x: bx + bw * 0.5, y: yb + bw * 0.12 * (rng() - 0.3) });
    }
    chain.push({ x: topR.x + wTop * 0.02, y: yR }, topR);
    const rp = [...right].reverse();
    const top = roundedLine([left[N - 1], ...chain, rp[1]], Math.max(0.8, wTop * 0.09));
    let d = `${smoothPath(left.slice(0, N))}${top}${smoothPath(rp.slice(1)).replace(/^M[^C]*/, "")}Z`;
    for (let k = 0; k < s.stubs; k++) {
      const i = 2 + Math.floor(rng() * (N - 4));
      const a = axis[i];
      const sd = rng() < 0.5 ? -1 : 1;
      const ang = -Math.PI / 2 + sd * (0.7 + rng() * 0.6);
      const len = a.w * (2 + rng() * 3.5);
      d += stub(
        a.sp.x + sd * a.w * 0.3,
        a.sp.y,
        ang,
        len,
        a.w * (0.7 + 0.4 * rng()),
        sd * len * 0.06 * (rng() - 0.2)
      );
    }

    // Shading (3D1-10). Every snag is a cylinder shaded from its own normals:
    // the body is cut into short strips along the trunk, each with a gradient
    // across its local width from 9 cylinder normals at that height, so the
    // light follows taper and lean. Three terms, all from the normal:
    //   · the ember lamps (point lights, strongest low on the trunk);
    //   · the lit smoke belly over the log (an area light, wrapped);
    //   · the smoke glowing behind the trunk: a back light along the view
    //     ray, wrapped, so only the flanks turned sideways catch it — a soft
    //     rim on both sides that falls off around the cylinder.
    // Char: a slow seeded noise along the height darkens the bark in patches
    // and scales the light it reflects, strongest where lit (lesson 10).
    const id = `cbt${uid++}`;
    const b0 = axis[0].sp;
    const bT = axis[N].sp;
    let defs = "";
    let els = "";
    // Unlit body by altitude: hazed toward the air it stands in, top to foot.
    const hts = [0, 0.25, 0.5, 0.75, 1];
    defs += `<linearGradient id="${id}v" x1="${n(b0.x)}" y1="${n(b0.y)}" x2="${n(bT.x)}" y2="${n(bT.y)}" gradientUnits="userSpaceOnUse">${hts
      .map(t => `<stop offset="${t}" stop-color="${fog(barkAmb, gy + t * s.h, zc)}"/>`)
      .join("")}</linearGradient>`;
    els += `<path d="${d}" fill="url(#${id}v)"/>`;
    const wPx = axis[0].w * 2;
    if (wPx >= 2.5 && hPx > 4) {
      const char = fbm1D(rng, 3);
      const cOff = rng() * 50;
      const at = (t: number) => {
        const q: V3 = [
          base[0] + s.lx * t ** 1.3,
          base[1] + (s.h + sink) * t,
          base[2] + s.lz * t ** 1.3,
        ];
        return { q, sp: P(q), w: (f * rAt(t)) / depth(q) };
      };
      // Strips ~44 px tall; ~20 px on trunks an ember lights, where the light
      // changes fast with height and a coarser step showed as bands.
      const emberLit = lightAt([s.x, gy + 0.3, s.z], null).reduce((a, b) => a + b, 0) > 0.04;
      const M = clamp(Math.ceil(hPx / (((emberLit ? 20 : 44) * W) / 3840)), 1, 96);
      // Two extra normals near each silhouette where a backdrop rim rolls off.
      const us = s.rim
        ? [-1, -0.93, -0.8, -0.55, -0.25, 0, 0.25, 0.55, 0.8, 0.93, 1]
        : [-1, -0.8, -0.55, -0.25, 0, 0.25, 0.55, 0.8, 1];
      const ov = (1.5 * W) / 3840;
      const strips: string[] = [];
      for (let j = 0; j < M; j++) {
        const t0 = (j / M) * 0.97;
        const t1 = ((j + 1) / M) * 0.97;
        const a0 = at(t0);
        const a1 = at(t1);
        const am = at((t0 + t1) / 2);
        const ax = a1.sp.x - a0.sp.x;
        const ay = a1.sp.y - a0.sp.y;
        const al = Math.hypot(ax, ay) || 1;
        const px = -ay / al;
        const py = ax / al;
        // Quad a little wider than the trunk (the body clip trims it) and
        // overlapping the next strip by ~1.5 px, so no seam shows.
        const e = { x: (ax / al) * ov, y: (ay / al) * ov };
        const w0 = a0.w * 1.25 + ov;
        const w1 = a1.w * 1.25 + ov;
        const quad = [
          { x: a0.sp.x - px * w0, y: a0.sp.y - py * w0 },
          { x: a0.sp.x + px * w0, y: a0.sp.y + py * w0 },
          { x: a1.sp.x + e.x + px * w1, y: a1.sp.y + e.y + py * w1 },
          { x: a1.sp.x + e.x - px * w1, y: a1.sp.y + e.y - py * w1 },
        ];
        const q = am.q;
        const v = norm3([q[0], 0, q[2]]); // the view ray in plan (away from the eye)
        const hm = q[1] - gy; // height above the foot
        const ch = char(hm * 0.32 + cOff);
        const charK = clamp(1 + 0.8 * ch, 0.6, 1.3);
        const bodyCol = mix(barkAmb, soot, 0.3 * smooth(-0.15, -0.45, ch));
        const bv: V3 = [belly[0] - q[0], belly[1] - q[1], belly[2] - q[2]];
        const bd = Math.hypot(bv[0], bv[1], bv[2]) || 1;
        const kBelly = 0.5 / (1 + (bd / 2.6) ** 2);
        const rimCol = mix(air(q[1]), smokeAsh, 0.3);
        // What stands behind the trunk at this screen height: the smoke a
        // view ray reaches ~10 m out (as the sky gradient), plus a little of
        // the lit plume on the side that faces it.
        const backAlt = Math.max(0.4, cam.eye + ((cam.horizon * H - am.sp.y) * 10) / f);
        const gx = belly[0] - q[0];
        const gz = belly[2] - q[2];
        const gl = Math.hypot(gx, gz) || 1;
        const stops = us
          .map(u => {
            const sq = Math.sqrt(Math.max(0, 1 - u * u));
            const nrm: V3 = [u * v[2] - sq * v[0], 0, -u * v[0] - sq * v[2]];
            let col = lightUp(
              bodyCol,
              lightAt(q, nrm).map(k => k * charK),
              barkLit,
              1.2
            );
            const nb = (nrm[0] * bv[0] + nrm[1] * bv[1] + nrm[2] * bv[2]) / bd;
            col = mix(col, smokeLit[0], Math.min(0.45, kBelly * wrap(nb, 0.5) * charK));
            const nv = nrm[0] * v[0] + nrm[2] * v[2];
            col = mix(col, rimCol, Math.min(0.6, 0.7 * wrap(nv, 0.45) * (0.6 + 0.4 * charK)));
            if (s.rim) {
              // Backdrop rim: grows toward the silhouette (nv → 0) as the
              // cylinder turns away from the eye; weighted to the glow side.
              const gs = Math.max(0, (nrm[0] * gx + nrm[2] * gz) / gl);
              const edge = Math.max(0, 1 + nv) ** 0.75;
              const target = mix(air(backAlt), smokeLit[0], 0.18 * gs);
              const k = s.rim * edge * (0.4 + 0.55 * gs) * (0.7 + 0.3 * charK);
              col = mix(col, target, Math.min(0.92, k));
            }
            return `<stop offset="${n((u + 1) / 2, 3)}" stop-color="${fog(col, q[1], zc)}"/>`;
          })
          .join("");
        const g0 = { x: am.sp.x - px * am.w, y: am.sp.y - py * am.w };
        const g1 = { x: am.sp.x + px * am.w, y: am.sp.y + py * am.w };
        defs += `<linearGradient id="${id}s${j}" x1="${n(g0.x)}" y1="${n(g0.y)}" x2="${n(g1.x)}" y2="${n(g1.y)}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`;
        strips.push(
          `<path d="M${quad.map(c => `${n(c.x)},${n(c.y)}`).join("L")}Z" fill="url(#${id}s${j})"/>`
        );
      }
      defs += `<clipPath id="${id}c"><path d="${d}"/></clipPath>`;
      els += `<g clip-path="url(#${id}c)">${strips.join("")}</g>`;
    }
    return { z: zc, draw: () => ({ defs, elements: els }) };
  };
  for (const s of snags) {
    const it = snagItem(s);
    if (it) items.push(it);
  }

  // ── Smoke: formless volumes in world space, lit from below by distance ────
  /** A smoke volume at world centre q, radius R (m), vertical squash k. */
  const smoke = (q: V3, R: number, k: number, rot: number, op: number, dark = false) => {
    const sp = P(q);
    const zc = depth(q);
    const rx = (f * R) / zc;
    if (!onScreen(sp.x - rx, sp.x + rx) || sp.y - rx > H) return;
    // Underside lit: light measured at the volume's lower part.
    const under: V3 = [q[0], q[1] - R * k * 0.5, q[2]];
    const body = dark ? soot : lightUp(smokeAsh, lightAt(under, null), smokeLit, 1.4);
    // A volume is part of the medium: only the smoke in front of it veils it.
    const col = mix(body, air(q[1]), hz(zc) * 0.5);
    items.push({ z: zc, draw: () => volume(sp.x, sp.y, rx, rx * k, rot, col, op) });
  };
  {
    const rng = key("plumes");
    // Each ember's plume rises and drifts left (the wind), cooling as it climbs.
    const plume = (src: V3, count: number, scale: number) => {
      for (let i = 1; i <= count; i++) {
        const t = i / count;
        const q: V3 = [
          src[0] - 3.2 * scale * t ** 1.3 + (rng() - 0.5) * 0.5,
          src[1] + 0.9 + 6 * scale * t,
          src[2] + 0.6 * t + (rng() - 0.5) * 0.4,
        ];
        const R = (0.8 + 2.4 * t) * scale * (0.85 + 0.3 * rng());
        // Keep the volume's bottom above its own ground (no terrain-cut edge).
        const k = Math.min(0.65, (0.9 * (q[1] - height(q[0], q[2]))) / R);
        smoke(q, R, k, -6 - 12 * rng(), (0.4 * (1 - t) ** 1.1 + 0.08) * (0.6 + 0.4 * scale));
      }
    };
    plume(logAt(0.5), 6, 1);
    // The warm belly: smoke hanging low over the log, lit from below. It sits
    // at the log's distance, so the snags in front stand dark against it.
    const lq = logAt(0.5);
    smoke([lq[0] - 0.3, lq[1] + 1.25, lq[2] + 0.25], 2.3, 0.55, -6, 0.5);
    smoke([lq[0] - 1.1, lq[1] + 2.4, lq[2] + 0.6], 2.6, 0.5, -10, 0.3);
    smoke([bedC.x + 0.2, height(bedC.x, bedC.z) + 1.1, bedC.z + 0.3], 2.6, 0.42, -4, 0.32);
    plume([stumpP[0], stumpP[1] + 0.6, stumpP[2]], 3, 0.55);
    plume([bedC.x, height(bedC.x, bedC.z) + 0.4, bedC.z], 4, 0.8);
  }
  {
    // The high pall: big ash and soot masses, darker ones give depth.
    const rng = key("pall");
    for (let i = 0; i < 16; i++) {
      const z = 8 + 32 * rng();
      const x = (2 * rng() - 1) * 1.3 * z;
      const y = 3 + 12 * rng();
      const dark = rng() < 0.35;
      smoke(
        [x, y, z],
        3 + 6 * rng(),
        0.4 + 0.2 * rng(),
        -4 - 10 * rng(),
        dark ? 0.22 + 0.15 * rng() : 0.14 + 0.16 * rng(),
        dark
      );
    }
    // Low ground smoke drifting between the trunks.
    const lrng = key("lowsmoke");
    for (let i = 0; i < 10; i++) {
      const z = 5 + 28 * lrng();
      const x = (2 * lrng() - 1) * 1.2 * z;
      const R = 1.6 + 2.6 * lrng();
      const y = height(x, z) + 0.5 + 0.4 * lrng();
      const k = Math.min(0.35, (0.85 * (y - height(x, z))) / R);
      smoke([x, y, z], R, k, -3 + 6 * lrng(), 0.16 + 0.16 * lrng());
    }
  }

  // Emitters are painted after the terrain: their light scatters in the air
  // in front of the ground, so a nearer ground slice must never cut a halo
  // into a hard half-ellipse (lesson 5). Nothing stands in front of them.
  const emissive: BrickOutput[] = [];
  /** True if a snag nearer than q stands in front of it (seen from the eye). */
  const hidden = (q: V3, size: number) =>
    snags.some(
      s => s.z < q[2] - 0.3 && Math.abs(s.x / s.z - q[0] / q[2]) < s.r / s.z + size / q[2]
    );

  // ── Ember 1: the smouldering log ──────────────────────────────────────────
  {
    const rng = key("log");
    const M = 24;
    const topE: Pt[] = [];
    const botE: Pt[] = [];
    const mids: V3[] = [];
    // A round trunk section (3D1-10: it read as a flat bar): the radius
    // swells and thins along the length, two knots and burnt-out hollows
    // break the top line, and a snapped branch stub rises from it.
    const bumpN = fbm1D(rng, 3);
    const bOff = rng() * 40;
    const knots = [
      [0.2 + 0.06 * rng(), 0.45],
      [0.62 + 0.08 * rng(), 0.35],
    ];
    const rAt = (t: number) =>
      logR * (1.12 - 0.3 * t) * (1 + 0.07 * Math.sin(t * 9 + 1) + 0.05 * bumpN(t * 2.2 + bOff));
    const topBump = (t: number) =>
      0.22 * bumpN(t * 5 + bOff + 9) +
      knots.reduce((a, [kt, ka]) => a + ka * Math.exp(-(((t - kt) / 0.045) ** 2)), 0);
    for (let i = 0; i <= M; i++) {
      const t = i / M;
      const q = logAt(t);
      const r = rAt(t);
      const c: V3 = [q[0], q[1] - logR + r + 0.04 * Math.sin(Math.PI * t), q[2]];
      mids.push(c);
      topE.push(P([c[0], c[1] + r * (1 + topBump(t)), c[2]]));
      botE.push(P([c[0], c[1] - r * 0.95, c[2]]));
    }
    const hAt = (i: number) => botE[i].y - topE[i].y;
    const h0 = hAt(0);
    const hM = hAt(M);
    // Ends: a blunt sawn left end, a ragged snapped right end.
    const lEnd = [
      botE[0],
      { x: botE[0].x - h0 * 0.1, y: botE[0].y - h0 * 0.35 },
      { x: topE[0].x - h0 * 0.08, y: topE[0].y + h0 * 0.2 },
      topE[0],
    ];
    const rEnd = [
      topE[M],
      { x: topE[M].x + hM * 0.3, y: topE[M].y + hM * 0.12 },
      { x: topE[M].x + hM * 0.12, y: topE[M].y + hM * 0.42 },
      { x: topE[M].x + hM * 0.4, y: topE[M].y + hM * 0.62 },
      { x: botE[M].x + hM * 0.15, y: botE[M].y - hM * 0.1 },
      botE[M],
    ];
    let d = `${smoothPath(topE)}${roundedLine(rEnd, hM * 0.1)}${smoothPath([...botE].reverse()).replace(/^M[^C]*/, "")}${roundedLine(lEnd, h0 * 0.1)}Z`;
    // A snapped branch rising from the top, leaning back toward the left.
    {
      const i = Math.round((0.36 + 0.05 * rng()) * M);
      const hb = hAt(i);
      d += stub(
        topE[i].x,
        topE[i].y + hb * 0.2,
        -Math.PI / 2 - 0.5,
        hb * 1.5,
        hb * 0.42,
        -hb * 0.08
      );
    }
    // Around the circumference, top to bottom: normals from up, through facing
    // the viewer, to down — shaded per section so the bands follow the log's
    // uneven top. Three lights, each from the normal: the coals beneath (the
    // lower front), the lit smoke belly above (a dim warm crown) and the smoke
    // behind (a wrapped rim along the top silhouette). The underside itself
    // smoulders: emission strongest at the bottom.
    const q = mids[M >> 1];
    const zq = depth(q);
    const vs = [-1, -0.75, -0.45, -0.1, 0.25, 0.5, 0.68, 0.82, 0.92, 1];
    const view = norm3([q[0], q[1] - cam.eye, q[2]]);
    const sections: string[] = [];
    let defs = "";
    const ov = (1.5 * W) / 3840;
    for (let i = 0; i < M; i++) {
      const c = mids[i];
      const cn = mids[i + 1];
      const qc: V3 = [(c[0] + cn[0]) / 2, (c[1] + cn[1]) / 2, (c[2] + cn[2]) / 2];
      const under: V3 = [qc[0], qc[1] - logR * 1.4, qc[2] - logR * 1.2];
      const stops = vs
        .map(v => {
          const nrm: V3 = [0, -v, -Math.sqrt(Math.max(0, 1 - v * v))];
          const toL = norm3([under[0] - qc[0], under[1] - qc[1] + v * logR, under[2] - qc[2]]);
          const lam = Math.max(0, dot(nrm, toL));
          const emit = smooth(0.2, 1, v) ** 1.4;
          let body = mix(barkAmb, barkLit[0], Math.min(1, 1.2 * lam));
          const bv = norm3([belly[0] - qc[0], belly[1] - qc[1], belly[2] - qc[2]]);
          body = mix(body, smokeLit[0], 0.6 * wrap(dot(nrm, bv), 0.3));
          const rim = wrap(dot(nrm, view), 0.3);
          body = mix(body, mix(air(qc[1]), smokeAsh, 0.3), 0.55 * rim);
          body = mix(body, emberLog, 0.9 * emit);
          body = mix(body, emberHot, 0.5 * smooth(0.85, 1, v));
          // Emission reaches the eye attenuated less than reflected light.
          return `<stop offset="${n((v + 1) / 2, 3)}" stop-color="${mix(body, air(qc[1]), hz(zq) * (0.35 + 0.4 * (1 - emit)))}"/>`;
        })
        .join("");
      const t0 = { x: (topE[i].x + topE[i + 1].x) / 2, y: (topE[i].y + topE[i + 1].y) / 2 };
      const b0 = { x: (botE[i].x + botE[i + 1].x) / 2, y: (botE[i].y + botE[i + 1].y) / 2 };
      defs += `<linearGradient id="cbl${i}" x1="${n(t0.x)}" y1="${n(t0.y)}" x2="${n(b0.x)}" y2="${n(b0.y)}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`;
      // A quad over the section, reaching well past the outline (the clip
      // trims it) and overlapping its neighbour so no seam shows.
      const xa = i === 0 ? topE[0].x - h0 : topE[i].x - ov;
      const xb = i === M - 1 ? topE[M].x + hM : topE[i + 1].x + ov;
      const ya0 = topE[i].y - hAt(i) * 1.2;
      const ya1 = topE[i + 1].y - hAt(i + 1) * 1.2;
      const yb0 = botE[i].y + hAt(i) * 0.4;
      const yb1 = botE[i + 1].y + hAt(i + 1) * 0.4;
      sections.push(
        `<path d="M${n(xa)},${n(ya0)}L${n(xb)},${n(ya1)}L${n(xb)},${n(yb1)}L${n(xa)},${n(yb0)}Z" fill="url(#cbl${i})"/>`
      );
    }
    defs += `<clipPath id="cblc"><path d="${d}"/></clipPath>`;
    // The heat is in the middle: the ends are already cold, so a dark mask
    // along the log fades the glow out toward both of them.
    const cold = fog(barkAmb, q[1], zq);
    const along = [
      [0, 0.6],
      [0.18, 0.35],
      [0.4, 0.05],
      [0.6, 0],
      [0.8, 0.2],
      [1, 0.55],
    ]
      .map(([t, o]) => `<stop offset="${t}" stop-color="${cold}" stop-opacity="${o}"/>`)
      .join("");
    defs += `<linearGradient id="cblm" x1="${n(Math.min(topE[0].x, botE[0].x))}" y1="0" x2="${n(Math.max(topE[M].x, botE[M].x) + hM * 0.4)}" y2="0" gradientUnits="userSpaceOnUse">${along}</linearGradient>`;
    items.push({
      z: zq,
      draw: () => ({
        defs,
        elements: `<path d="${d}" fill="${cold}"/><g clip-path="url(#cblc)">${sections.join("")}</g><path d="${d}" fill="url(#cblm)"/>`,
      }),
    });
    // Coals glowing under the log's front edge: tight halos (lesson 4).
    const spanAll = Math.abs(botE[M].x - botE[0].x);
    for (const [t, len, op] of [
      [0.3, 0.1, 0.6],
      [0.52, 0.16, 0.9],
      [0.7, 0.09, 0.7],
    ] as const) {
      const i = Math.round(t * M);
      const b = botE[i];
      emissive.push(
        glow(
          b.x,
          b.y - hAt(i) * 0.08,
          spanAll * len * 1.3,
          hAt(i) * 0.42,
          0,
          emberHot,
          emberLog,
          Math.min(1, op * 1.15)
        )
      );
    }
    // A few cracks on the lower flank: short, tapered, glowing slivers.
    for (const [t, v, len, rot] of [
      [0.36, 0.5, 0.05, 10],
      [0.5, 0.3, 0.07, -5],
      [0.62, 0.55, 0.04, 16],
    ] as const) {
      const i = Math.round(t * M);
      const a = topE[i];
      const b = botE[i];
      const cx = a.x + (b.x - a.x) * ((v + 1) / 2);
      const cy = a.y + (b.y - a.y) * ((v + 1) / 2);
      emissive.push(
        glow(cx, cy, spanAll * len, hAt(i) * 0.06, rot, emberHot, emberLog, 0.6 + 0.25 * rng())
      );
    }
    // Sparks lifting off the log, drifting left with the smoke.
    const sr = key("sparks");
    for (let i = 0; i < 9; i++) {
      const lift = 0.4 + 3.2 * sr() ** 1.4;
      const sq: V3 = [
        q[0] - 0.3 + (sr() - 0.5) * 1.4 - lift * 0.45,
        q[1] + lift,
        q[2] + (sr() - 0.5) * 0.6,
      ];
      if (hidden(sq, 0.05)) continue; // behind a nearer snag
      const sp = P(sq);
      const rad = Math.max(1.1, (f * 0.01) / depth(sq)) * (1 - 0.45 * (lift / 3.6));
      emissive.push(
        glow(sp.x, sp.y, rad * 5, rad * 5, 0, emberHot, emberLog, 0.8 - 0.35 * (lift / 3.6))
      );
    }
  }

  // ── Ember 2: the coal bed, scattered, no single focus ─────────────────────
  {
    const rng = key("bed");
    for (let i = 0; i < 46; i++) {
      const cl = rng() < 0.65 ? -0.8 : 1.1;
      const x = bedC.x + cl + gauss(rng) * (cl < 0 ? 0.9 : 0.55);
      const z = bedC.z + gauss(rng) * (cl < 0 ? 0.7 : 0.45);
      const q: V3 = [x, height(x, z) + 0.02, z];
      const s = 0.03 + 0.09 * rng() ** 2;
      const hot = rng() < 0.2;
      if (hidden(q, s)) continue;
      const sp = P(q);
      const rx = Math.max(1.4, (f * s) / depth(q)) * 2.6;
      // Emitters punch through the smoke more than lit surfaces do.
      const core = mix(hot ? emberHot : emberLog, hazeLow, hz(z) * 0.3);
      const col = mix(emberDeep, hazeLow, hz(z) * 0.4);
      emissive.push(glow(sp.x, sp.y, rx, rx * 0.42, 0, core, col, hot ? 0.95 : 0.65));
    }
  }

  // ── Ember 3: the hollow stump, glowing at its foot ────────────────────────
  {
    const st: Snag = {
      x: stumpP[0],
      z: stumpP[2],
      r: 0.4,
      h: 1.25,
      lx: 0.05,
      lz: 0,
      taper: 0.25,
      stubs: 0,
      key: "stump",
    };
    const body = snagItem(st, { hollow: true });
    if (body) items.push(body);
    const rng = key("stumpglow");
    const foot = P([stumpP[0] - 0.04, stumpP[1] + 0.1, stumpP[2] - 0.38]);
    const wPx = (f * 0.4) / depth(stumpP);
    // The hollow: the fire has eaten a low arch into the foot. An extended
    // emitter (broad, flat-topped volume) with a small hot core in its mouth,
    // and a thin bloom along the ground where its light spills out.
    emissive.push(volume(foot.x, foot.y - wPx * 0.05, wPx * 0.5, wPx * 0.3, 0, tints[1], 0.75));
    emissive.push(
      glow(foot.x, foot.y + wPx * 0.02, wPx * 0.45, wPx * 0.2, 0, emberHot, tints[1], 0.85)
    );
    emissive.push(
      glow(
        foot.x,
        foot.y + wPx * 0.08,
        wPx * 1.2,
        wPx * 0.12,
        0,
        emberHot,
        tints[1],
        0.35 + 0.1 * rng()
      )
    );
  }

  // ── Terrain, with every item painted between the slices at its distance ───
  items.sort((a, b) => b.z - a.z);
  let cursor = 0;
  const flush = (zMin: number) => {
    let s = "";
    const parts: BrickOutput[] = [];
    while (cursor < items.length && items[cursor].z >= zMin) parts.push(items[cursor++].draw());
    if (!parts.length) return { defs: "", elements: s };
    const m = mergeBricks(parts);
    s = m.elements;
    return { defs: m.defs ?? "", elements: s };
  };
  const zFar = 70;
  const zNear = (0.85 * f * cam.eye) / ((1 - cam.horizon) * H);
  const before = flush(zFar);
  const itemDefs: string[] = [before.defs];
  const terrain = terrainSlices({
    id: "cbq",
    cam,
    atm: groundAtm,
    height: (x, z) => {
      const [wx, wz] = toWorld(x, z);
      return height(wx, wz);
    },
    // Up: lam is the sky ambient term; the embers are point lights below.
    light: [0, 1, 0],
    zNear,
    zFar,
    candidates: 3000,
    // 4 px wherever the floor is seen near; a taller band under the text
    // pill showed as faint horizontal streaks at 2x.
    maxBand: z => (z < 22 ? 4 : 5),
    samples: Math.max(160, Math.round((420 * W) / 3840)),
    tolerance: 0.025,
    surface: (lam, cxz, cz, h, nc) => {
      const [x, z] = toWorld(cxz, cz);
      const nrm: V3 = [nc[0] * cy + nc[2] * sy, nc[1], -nc[0] * sy + nc[2] * cy];
      const patch = smooth(-0.25, 0.45, patchN(x * 0.45, z * 0.45));
      let col = mix(floorChar, floorAsh, 0.35 + 0.5 * patch);
      col = mix(col, ash, 0.04 * lam);
      col = lightUp(col, lightAt([x, h, z], nrm), groundLit, 2.2);
      const ao = occlusion(x, z);
      return ao < 0.995 ? mix(soot, col, ao) : col;
    },
    after: (s: SliceProfile) => {
      const it = flush(s.zNext);
      if (it.defs) itemDefs.push(it.defs);
      return it.elements;
    },
  });
  const rest = flush(Number.NEGATIVE_INFINITY);
  layers.push({
    defs: `${terrain.defs}\n${itemDefs.join("\n")}\n${rest.defs}`,
    elements: `${before.elements}${terrain.elements}${rest.elements}`,
  });

  layers.push(mergeBricks(emissive));

  // In-scatter over the log: the warm belly of smoke it lights (faint wash).
  {
    const q = logAt(0.5);
    const sp = P([q[0] - 0.4, q[1] + 1.2, q[2]]);
    const rx = (f * 3.2) / depth(q);
    layers.push(
      volume(sp.x, sp.y, rx, rx * 0.6, -8, mix(smokeLit[0], air(1.2), hz(q[2]) * 0.5), 0.3)
    );
  }

  // Quiet vignette keeps the corners calm; grain breaks banding.
  layers.push({
    defs: `<radialGradient id="cbw" cx="0.55" cy="0.62" r="0.8"><stop offset="0.5" stop-color="${night}" stop-opacity="0"/><stop offset="1" stop-color="${night}" stop-opacity="0.32"/></radialGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#cbw)"/>`,
  });
  layers.push(grainBrick("cbn", W, H, smokeAsh, 0.04));
  return mergeBricks(layers);
}

export function composeCinder(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(cinderMotif(p), p);
}
