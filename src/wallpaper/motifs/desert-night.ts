/**
 * Moonlit dunes, built as a world and photographed.
 *
 * Theme: ships for **Mandarian** since the seed swap of 2026-10-21 (registry
 * in src/wallpaper/compose.ts): the Mandarian palette is a warm amber, which
 * suits sand under a low moon. The file keeps its historical name.
 *
 * Concept: a crescent moon hangs low ahead-left over a sea of dunes. One hero
 * seif owns the foreground: its sinuous crest climbs from the viewer's feet
 * over a lower horn to a rounded summit right of centre, the windward face
 * catches the moon, the slip face falls
 * into a cold shadow, and the crisp line between them is simply where the
 * surface normal turns away from the light. Behind it, rows of transverse dunes
 * recede to a dark skyline, softening into the indigo night air.
 *
 * World (x right, y up, z away; units ≈ metres at dune scale):
 *   · Dune field — transverse dunes as an asymmetric profile along the wind
 *     (convex windward ramp, ~30° slip face), phase and amplitude warped by
 *     noise so crests bend, merge and break instead of running as parallel
 *     stripes; plus large draa swells (two crossing wind sets) that carry the
 *     skyline. Small dunes fade out by z ≈ 80 and far brinks round off with
 *     distance (band limit), so the horizon never aliases into comb or teeth.
 *   · Hero dune — a sinuous seif (3D1-08: the earlier straight-flanked
 *     cone read as a pyramid). Plan x_c(z) and crest height h_c(z) are C1
 *     Hermite curves through a few knots: the crest climbs from z ≈ 2 (near,
 *     low) to a lower horn (z 9, h 2.75), dips through a saddle (z 10.9,
 *     h 2.5) and rises to a rounded summit (x +3.3, z 14, h 4.1), then sinks
 *     away to the right; in plan it wanders in a gentle S, so the terminator
 *     bends. Across the crest the height falls gently and convexly on the
 *     windward (left) side and on the slip (right) side along a concave
 *     ~35° face (steep at the brink, easing toward the foot) whose steepness
 *     and brink height wander along the crest. A smooth-abs crest radius
 *     gives a crisp brink, a rounder one over the summit and the horn, and a
 *     wind-worn crest near the viewer.
 *
 * Camera: eye 2.0 (standing on a low dune). Monitor horizon 0.62 / focal
 * 0.85·H; tablet 0.60 / 0.85·H; mobile (portrait) horizon 0.66 / focal
 * W / (2 · 0.75). The summit projects to ≈ 0.61 W / 0.49 H on monitor, the
 * horn just in front of it and lower.
 *
 * Light: one directional moon, azimuth taken from the moon's screen position
 * through the camera, elevation fixed at 25° on every platform (the moon disc
 * itself is placed at a deliberate long-lens size and position). Lambert
 * `max(0, n·L)`, times a soft cast-shadow term (a march toward the moon, so
 * every dune throws a shadow ~2× its height toward the viewer), mixes a cold
 * shadow (deep sand + sky bounce on open, up-facing sand) toward a warm,
 * chroma-limited moonlit taupe; faces turned fully to the moon glint.
 *
 * Rendering: a private copy of scene3d.terrainSlices (`duneSlices`) that steps
 * past fully hidden far candidates (the shared one paints nothing when the
 * zFar row is entirely occluded), 5000 candidates, maxBand 6 px near / 3 px
 * far at 3840 wide, halved to 3 px on the hero's slip face and just under its
 * brink (per sample, `heroSlip`). Gradient stops come from a piecewise-linear
 * fit (error ≤ 0.005 OKLab against what the sRGB gradient paints), not from
 * the greedy "drifted > tol from the last stop" rule. 3D2-04: that greedy
 * error, different in every slice, was the main cause of the diagonal hatch
 * on the slip face (mean |ΔL| at slice boundaries 5.4 → 1.1 ×10⁻³, p95
 * 13.5 → 3.8, measured by spike/wallpapers/desert-night-slip-diag.ts); the
 * 6 px band on that fast-changing dark face was the second. There are no
 * ripples to alias (they were dropped in round 1). Both fixes are worth
 * promoting to scene3d.ts.
 *
 * Atmosphere: cool indigo haze, visibility 60, capped at 0.6 so the far rows
 * stay darker silhouettes under a faint sky lift at the horizon.
 *
 * Personal touch: the hero's slip-face shadow edge sweeps toward the viewer and
 * ends in a soft, sand-blown fade — the crest rounds off and flattens near
 * z ≈ 3, so the terminator dissolves instead of being cut by the frame.
 *
 * Colours: palette only. Sand is the warm role nearest amber, chroma-limited
 * (never moss); the moon is the palest, least chromatic element.
 */

import { converter, oklch } from "culori";
import { mergeBricks } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";
import {
  type Camera,
  hazeAt,
  norm3,
  project,
  relPath,
  type SliceOptions,
  type V3,
  valueNoise2D,
} from "./scene3d.js";
import {
  grainBrick,
  keepLightness,
  lightness,
  mix,
  moonBrick,
  n,
  rngFrom,
  shade,
  starField,
  tone,
} from "./shared.js";

/** Hue distance on the colour wheel, degrees. */
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Smooth |d| with radius r: a rounded crest of width ~r instead of a kink. */
const softAbs = (d: number, r: number) => Math.sqrt(d * d + r * r) - r;

/** Smooth maximum (polynomial), blends two height fields without a crease. */
const smax = (a: number, b: number, k: number) => {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (a - b)) / k));
  return b + (a - b) * h + k * h * (1 - h);
};

/** C1 cubic Hermite through [t, value, slope] knots; linear beyond the ends. */
function hermite(knots: Array<[number, number, number]>) {
  return (t: number) => {
    const first = knots[0];
    const last = knots[knots.length - 1];
    if (t <= first[0]) return first[1] + first[2] * (t - first[0]);
    if (t >= last[0]) return last[1] + last[2] * (t - last[0]);
    let i = 0;
    while (t > knots[i + 1][0]) i++;
    const [t0, y0, m0] = knots[i];
    const [t1, y1, m1] = knots[i + 1];
    const h = t1 - t0;
    const s = (t - t0) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * y0 +
      (s3 - 2 * s2 + s) * h * m0 +
      (-2 * s3 + 3 * s2) * y1 +
      (s3 - s2) * h * m1
    );
  };
}

// ─── Private copy of scene3d.terrainSlices, with one fix ─────────────────────
// The shared slicer's greedy selection measures a slice's visible band only
// over samples the slice itself shows. When the farthest candidate is hidden
// entirely (here: tall draa at mid distance cover the zFar row everywhere),
// the band stays 0, the loop never breaks, and it jumps straight to the
// nearest candidate — nothing is painted. This copy steps past fully hidden
// candidates one by one instead. Worth promoting to scene3d.ts.

const toOklab = converter("oklab");
const okCache = new Map<string, V3>();
function okl(col: string): V3 {
  let v = okCache.get(col);
  if (!v) {
    const o = toOklab(col) as { l: number; a: number; b: number } | undefined;
    v = [o?.l ?? 0, o?.a ?? 0, o?.b ?? 0];
    okCache.set(col, v);
  }
  return v;
}
function colourDist(a: string, b: string): number {
  const A = okl(a);
  const B = okl(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/** "#rrggbb" → gamma-encoded sRGB in [0,1] (what an SVG gradient interpolates). */
function hexRgb(col: string): V3 {
  const v = Number.parseInt(col.slice(1, 7), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
/** Gamma-encoded sRGB → OKLab (Björn Ottosson's matrices), allocation-light. */
function rgbOklab(c: V3): V3 {
  const lin = (u: number) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  const r = lin(c[0]);
  const g = lin(c[1]);
  const b = lin(c[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function duneSlices(
  o: SliceOptions & {
    /** Per-sample factor on maxBand (x, z world): < 1 tightens the band where
     *  the colour changes fast with depth (the hero's slip face). */
    bandScale?: (x: number, z: number) => number;
  }
): { defs: string; elements: string } {
  const { cam } = o;
  const L = norm3(o.light);
  const tol = o.tolerance ?? 0.02;
  const S = o.samples;
  const eps = 0.02;
  const C = o.candidates;
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

  const kept: number[] = [0];
  let cur = 0;
  while (cur < C) {
    const shows = prof[cur].pts.some((q, k) => q.y < env[cur][k] + 1);
    let next = cur + 1;
    if (shows) {
      const maxBand = typeof o.maxBand === "number" ? o.maxBand : o.maxBand(zs[cur]);
      const lim = prof[cur].xs.map(x => maxBand * (o.bandScale ? o.bandScale(x, zs[cur]) : 1));
      for (let j = cur + 1; j <= C; j++) {
        let over = false;
        for (let k = 0; k <= S && !over; k++) {
          const top = prof[cur].pts[k].y;
          const bottom = Math.min(prof[j].pts[k].y, env[j][k]);
          if (top < env[cur][k] + 1 && bottom - top > lim[k]) over = true;
        }
        if (over) break;
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
    const hz = hazeAt(o.atm, z);
    const colour = (k: number) => {
      const x = xs[k];
      const dx = (o.height(x + eps * z, z) - o.height(x - eps * z, z)) / (2 * eps * z);
      const dz = (o.height(x, z + eps * z) - o.height(x, z - eps * z)) / (2 * eps * z);
      const nrm = norm3([-dx, 1, -dz]);
      const lam = Math.max(0, nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]);
      return mix(o.surface(lam, x, z, hs[k], nrm), o.atm.haze, hz);
    };
    // Hidden runs: every 4th sample, pushed below what covers it (as upstream).
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
    // Gradient stops by piecewise-linear fit (3D2-04): a segment from the
    // last stop is extended while every visible sample inside it stays within
    // `tol` (OKLab) of what the gradient will actually paint there (sRGB
    // interpolation, as SVG does). The earlier greedy rule (new stop once a
    // sample drifts > tol from the last stop) left errors of up to ~tol that
    // differed from slice to slice, and those mismatches stacked down the
    // dark slip face as diagonal hatching at every slice boundary.
    const vis = pts.map((_, k) => k).filter(k => visible[k]);
    const cols = vis.map(colour);
    const rgbs = cols.map(hexRgb);
    const labs = rgbs.map(rgbOklab);
    const sxs = vis.map(k => pts[k].x);
    const keepIdx = [0];
    let a = 0;
    for (let b = 2; b < vis.length; b++) {
      const span = sxs[b] - sxs[a];
      let ok = true;
      for (let j = a + 1; j < b && ok; j++) {
        const t = span > 1e-6 ? (sxs[j] - sxs[a]) / span : 0;
        const A = rgbs[a];
        const B = rgbs[b];
        const q = rgbOklab([
          A[0] + (B[0] - A[0]) * t,
          A[1] + (B[1] - A[1]) * t,
          A[2] + (B[2] - A[2]) * t,
        ]);
        const e = labs[j];
        if (Math.hypot(q[0] - e[0], q[1] - e[1], q[2] - e[2]) > tol) ok = false;
      }
      if (!ok) {
        keepIdx.push(b - 1);
        a = b - 1;
      }
    }
    if (vis.length > 1) keepIdx.push(vis.length - 1);
    const stops: Array<{ sx: number; col: string }> = [];
    for (const i of keepIdx) {
      const last = stops[stops.length - 1];
      if (last && sxs[i] < last.sx + 0.5 && colourDist(cols[i], last.col) < 1e-3) continue;
      stops.push({ sx: sxs[i], col: cols[i] });
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
              `<stop offset="${n((c.sx - x0) / (x1 - x0), 3).replace(/^0\./, ".")}" stop-color="${c.col}"/>`
          )
          .join("")}</linearGradient>`
      );
      fill = `url(#${id})`;
    }
    els.push(`<path d="${relPath(outline)}V${cam.H}H${Math.round(x0)}Z" fill="${fill}"/>`);
    if (o.after) {
      const zNext = nearer < 0 ? o.zNear : zs[nearer];
      els.push(o.after({ index: idx, z, zNext, xs, hs, pts, visible }));
    }
  });
  return { defs: defs.join("\n"), elements: `<g id="${o.id}">${els.join("")}</g>` };
}

/** Per-platform camera and moon placement (fractions of the frame). */
function framing(p: BrickParams) {
  const { width: W, height: H } = p.viewBox;
  const portrait = p.platform === "mobile" || H > W;
  if (portrait)
    return {
      cam: { W, H, horizon: 0.66, eye: 2, focal: W / (2 * 0.75) } as Camera,
      moon: { x: 0.3, y: 0.22 },
    };
  const tablet = p.platform === "tablet";
  return {
    cam: { W, H, horizon: tablet ? 0.6 : 0.62, eye: 2, focal: 0.85 * H } as Camera,
    moon: { x: 0.3, y: 0.22 },
  };
}

export function desertNightMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-desert-night-${part}`);

  // ── Value plan (all palette-derived; lightness guarded per role) ───────────
  const night = shade(c.bg, 0.62);
  const bgL = lightness(c.bg);
  // Moon: palest role, chroma-limited so no mode can tint it cyan or mint.
  const pale = Object.values(c)
    .filter(v => lightness(v) >= 0.85)
    .reduce((a, b) => ((oklch(b)?.c ?? 1) < (oklch(a)?.c ?? 1) ? b : a), c.strings);
  const moonLight = keepLightness(tone(mix(pale, c.functions, 0.15), 0.45), 0.88, 0.96);
  // Night air: a cool indigo just above the background.
  // Chroma is capped near the background's own, so a mode whose `strings`
  // role is green (split-complementary) cannot turn the air teal.
  const hazeRaw = keepLightness(mix(c.bg, tone(c.strings, 0.55), 0.2), bgL + 0.04, bgL + 0.11);
  const haze = tone(hazeRaw, Math.min(1, 0.035 / Math.max(0.001, oklch(hazeRaw)?.c ?? 0)));
  // Sand: the role nearest warm amber (hue ~70) with real chroma; if the mode
  // has none (monochromatic), it follows the palette's own hue.
  const warm = Object.values(c)
    .filter(v => {
      const o = oklch(v);
      return o && o.c >= 0.06 && o.l >= 0.55 && o.l <= 0.9;
    })
    .reduce(
      (a, b) => (hueGap(oklch(b)?.h ?? 0, 70) < hueGap(oklch(a)?.h ?? 0, 70) ? b : a),
      c.accentMuted
    );
  const sand = tone(warm, 0.5);
  const deep = shade(c.bg, 0.5);
  const moonSand = mix(sand, moonLight, 0.25);
  // Lit sand: warm taupe, never brighter than bg + 0.17 (the moon stays king).
  const sandLit = keepLightness(mix(mix(deep, sand, 0.42), moonSand, 0.12), bgL + 0.08, bgL + 0.17);
  // Glint: the brightest sand, still well below the moon.
  const sandGlint = keepLightness(mix(sandLit, moonSand, 0.4), bgL + 0.15, bgL + 0.21);
  // Shadow sand and its sky bounce: a cool, low-chroma lift, never black.
  const sandShadow = keepLightness(mix(deep, haze, 0.18), bgL - 0.06, bgL - 0.01);
  const bounce = keepLightness(mix(c.bg, haze, 0.8), bgL + 0.02, bgL + 0.08);
  // Sky just above the horizon: a faint lift, a touch lighter than the haze,
  // so the far rows read as darker silhouettes against it (backlit).
  const skyLift = keepLightness(mix(haze, moonLight, 0.05), bgL + 0.08, bgL + 0.14);

  const { cam, moon: mf } = framing(p);
  const horizonY = cam.horizon * H;
  const moon = { cx: W * mf.x, cy: H * mf.y, r: 0.06 * Math.min(W, H) };

  // ── Light: azimuth from the moon's screen position, elevation 25° ─────────
  const az = Math.atan((moon.cx - W * (cam.cx ?? 0.5)) / cam.focal);
  const el = (25 * Math.PI) / 180;
  const light: V3 = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
  const atm = { haze, visibility: 60, max: 0.6 };

  const layers: BrickOutput[] = [];

  // ── Sky ────────────────────────────────────────────────────────────────────
  const hp = (y: number) => n((y / H) * 100, 2);
  layers.push({
    defs: `<linearGradient id="dn-sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${night}"/>
  <stop offset="0.36" stop-color="${c.bg}"/>
  <stop offset="${hp(horizonY - H * 0.12)}%" stop-color="${mix(c.bg, skyLift, 0.45)}"/>
  <stop offset="${hp(horizonY)}%" stop-color="${skyLift}"/>
  <stop offset="1" stop-color="${skyLift}"/>
</linearGradient>
<radialGradient id="dn-halo" cx="${n(moon.cx)}" cy="${n(moon.cy)}" r="${n(moon.r * 5)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${moonLight}" stop-opacity="0.14"/>
  <stop offset="0.2" stop-color="${moonLight}" stop-opacity="0.06"/>
  <stop offset="0.55" stop-color="${moonLight}" stop-opacity="0.018"/>
  <stop offset="1" stop-color="${moonLight}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="dn-wash" cx="${n(moon.cx)}" cy="${n(moon.cy)}" r="${n(Math.max(W, H) * 0.34)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${moonLight}" stop-opacity="0.028"/>
  <stop offset="1" stop-color="${moonLight}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#dn-sky)"/>
<rect width="${W}" height="${H}" fill="url(#dn-wash)"/>
<rect width="${W}" height="${H}" fill="url(#dn-halo)"/>`,
  });

  layers.push(
    starField({
      id: "dn-st",
      width: W,
      horizonY,
      count: Math.round(380 * ((W * H) / (3840 * 2160)) ** 0.5),
      tints: [moonLight, c.strings, mix(c.strings, c.variables, 0.4)].map(t =>
        keepLightness(tone(t, 0.7), 0.78, 0.97)
      ),
      avoid: { cx: moon.cx, cy: moon.cy, r: moon.r * 4.5 },
      rng: key("stars"),
    })
  );

  // ── Crescent moon (level 3) ────────────────────────────────────────────────
  layers.push(
    moonBrick({
      pre: "dn",
      cx: moon.cx,
      cy: moon.cy,
      r: moon.r,
      terminator: -0.38,
      rotate: -28,
      light: moonLight,
      warm: tone(c.functions, 0.5),
      dark: c.bg,
      earthshine: 0.007,
      rng: key("moon"),
    })
  );

  // ── Dune field: transverse dunes across the wind ──────────────────────────
  // Wind blows toward +x and slightly toward the viewer; crests run across it,
  // so slip faces face right/toward us (shadow), windward ramps face the moon.
  const wx = 0.82;
  const wz = -0.57;
  const warpN = valueNoise2D(key("warp"), 64);
  const ampN = valueNoise2D(key("amp"), 64);
  const draaN = valueNoise2D(key("draa"), 64);
  const lumpN = valueNoise2D(key("lump"), 64);
  const WINDWARD = 0.76; // share of a wavelength spent on the gentle ramp
  /**
   * One dune cross-section, t ∈ [0,1): a convex stoss ramp (steeper at the
   * foot, easing toward the brink) meeting a straight slip face. The brink is
   * a smooth minimum of the two with radius `k` (in wavelengths): crisp up
   * close, rounded where it would be sub-pixel — otherwise the brink sample's
   * mixed normal is carried down each slice band and stacks into hatching.
   */
  const duneProfile = (t: number, k: number) => {
    const r = t / WINDWARD;
    const rise = r * (1.5 - 0.5 * r);
    const slip = ((1 - t) / (1 - WINDWARD)) ** 1.12;
    return -smax(-rise, -slip, k);
  };
  /**
   * Brink rounding (in units of the dune's height) at distance z. Oblique
   * crests are sampled by depth slices one peak per slice, so a sharp far
   * brink turns the skyline into saw-teeth; a rounded one keeps the envelope
   * of neighbouring slices smooth. Up close the brink stays crisp.
   */
  const brink = (lambda: number, z: number) => Math.min(0.55, 0.015 + (z * 2.6) / (lambda * 30));
  const crestN = valueNoise2D(key("crest"), 64);
  // Second, oblique draa set (wind rotated ~40°): where it crosses the first,
  // crests link and break, so rows never run as parallel bars.
  const ox = 0.97;
  const oz = 0.26;
  const field = (x: number, z: number) => {
    const u = x * wx + z * wz; // along the wind
    const v = -x * wz + z * wx; // along the crests
    // Small dunes: phase warped so crests bend and branch, amplitude varies,
    // and they fade out by z ≈ 80 (band limit: a 7 m dune there is a few px,
    // and kept further it aliases into hatching on the far slopes).
    const near = 1 - smooth(30, 80, z);
    let small = 0;
    if (near > 0) {
      const ph = u / 7 + 0.9 * warpN(v * 0.045, u * 0.03) + 0.35 * warpN(v * 0.11 + 17, u * 0.09);
      const amp = 0.75 * (0.45 + 0.55 * ampN(x * 0.05, z * 0.05)) * near;
      small = amp * duneProfile(ph - Math.floor(ph), brink(7, z));
    }
    // Draa: large swells (wavelength ~26) with the same asymmetry. Their
    // height rises and falls along each crest, so skyline crests break into
    // separate dunes; they stay below eye height near the viewer.
    const reach = 0.5 + 3.1 * smooth(8, 70, z);
    // Phase warp at two scales bends the rows within the visible span, and
    // varies fast across the wind so neighbouring rows bend differently; the
    // along-crest height can drop almost to nothing, so rows break into
    // separate segments instead of running as evenly spaced bands.
    const pd = u / 26 + 0.9 * draaN(v * 0.035, u * 0.07) + 0.45 * draaN(v * 0.09 + 31, u * 0.13);
    const along = 0.12 + 0.88 * Math.max(0, crestN(v * 0.075, u * 0.09) * 0.75 + 0.5);
    const big = reach * Math.min(1, along) * duneProfile(pd - Math.floor(pd), brink(26, z));
    const uo = x * ox + z * oz;
    const vo = -x * oz + z * ox;
    const po = uo / 34 + 0.9 * draaN(vo * 0.018 + 50, uo * 0.012 + 50);
    const cross =
      0.7 *
      reach *
      (0.5 + 0.5 * crestN(vo * 0.03 + 70, uo * 0.02)) *
      duneProfile(po - Math.floor(po), brink(34, z));
    return smax(big, cross, 0.5) + small;
  };

  // ── Hero dune: a sinuous seif with a horn, a saddle and a summit ───────
  // The crest comes toward the viewer from the summit and ends low near the
  // bottom left, so the windward flank (left, facing the moon's azimuth) is
  // seen broadly and the slip face is a wedge on the right. Along the near
  // crest the seif rises to a lower horn, dips through a saddle and climbs to
  // a rounded summit; in plan the crest wanders in a gentle S, so the
  // terminator bends instead of running as one ruled diagonal. Plan and
  // height along the crest are C1 Hermite curves through a few knots, so the
  // outline is a sequence of rounded humps, never the meeting point of two
  // straight lines (3D1-08: "pyramid").
  const crestX = hermite([
    [1, -2.6, 0.38],
    [4.5, -1.0, 0.62],
    [8, 1.05, 0.22],
    [11, 2.0, 0.42],
    [14, 3.3, 0.5],
    [20, 5.9, 0.38],
    [30, 8.6, 0.24],
    [44, 10.4, 0.08],
    [70, 11, 0],
  ]);
  const crestH = hermite([
    [2.2, 0.35, 0.3],
    [6.5, 1.95, 0.4],
    [9, 2.75, 0],
    [10.9, 2.5, 0],
    [14, 4.1, 0],
    [19.5, 3.35, -0.2],
    [30, 1.55, -0.14],
    [46, 0.35, -0.04],
    [60, 0, 0],
  ]);
  const heroN = valueNoise2D(key("hero"), 64);
  const SW = 0.34; // windward gradient at the flank's foot (~19°)
  /** Windward drop at distance u from the crest: convex — nearly flat just
   *  below the brink, steepening down the flank — so the band under the
   *  crest faces the sky and catches the most moonlight. */
  const windDrop = (u: number) => SW * u * (0.38 + 0.62 * smooth(0, 5, u));
  /** Slip drop: ~33° at the brink easing toward the foot (concave), with
   *  its steepness wandering along the crest so the face is not one plane. */
  const slipDrop = (u: number, z: number) => {
    const sl = 0.7 + 0.07 * heroN(z * 0.22, 3.7);
    return sl * 22 * (1 - Math.exp(-u / 22));
  };
  /** Signed distance from the crest across it (positive = slip side). */
  const heroSide = (x: number, z: number) => {
    const slope = (crestX(z + 0.05) - crestX(z - 0.05)) / 0.1;
    return (x - crestX(z)) / Math.sqrt(1 + slope * slope);
  };
  const hero = (x: number, z: number) => {
    const d = heroSide(x, z);
    // Crest radius: a crisp brink along the crest, a little rounder over the
    // summit and the horn, and wind-worn near the viewer so the terminator
    // dissolves into a soft, sand-blown fade instead of being cut by the frame.
    const rc =
      0.09 +
      0.22 * Math.exp(-(((z - 14) / 3) ** 2)) +
      0.12 * Math.exp(-(((z - 9) / 1.4) ** 2)) +
      1.7 * (1 - smooth(2.6, 6.5, z));
    const u = softAbs(d, rc);
    const slipSide = smooth(-rc, rc, d);
    // The brink's height wanders a little along the crest (uneven, not ruled).
    const top = Math.max(0, crestH(z) + 0.14 * heroN(z * 0.3, 9.1) * smooth(3, 8, z));
    const base = top - (1 - slipSide) * windDrop(u) - slipSide * slipDrop(u, z);
    // Gentle undulation of the windward flank so it is not a plane.
    const lump = 0.25 * lumpN(x * 0.1, z * 0.1) * smooth(0, -3, d);
    return base + lump;
  };

  // Wind ripples were tried (z 3.5–9, windward only) and dropped: lit, they
  // were too faint to read; in shadow they modulated the sky bounce into
  // faint hatching (lesson 10). The near field stays calm.
  const height = (x: number, z: number) => smax(field(x, z), hero(x, z), 0.45);

  // ── Shading from the normal, with cast shadows ────────────────────────────
  // Soft cast shadows: march from the surface point toward the moon; the
  // closest miss (height clearance over distance) sets the penumbra, so a
  // shadow edge is crisp right behind its crest and widens farther from it,
  // as moon shadows do. With the moon at 25°, a dune throws a shadow about
  // twice its height long, toward the viewer and to the right.
  const Ln = norm3(light);
  const shadowAt = (x: number, z: number, h: number) => {
    let res = 1;
    let t = 0.15;
    for (let i = 0; i < 28 && t < 26; i++) {
      const py = h + Ln[1] * t;
      const clear = py - height(x + Ln[0] * t, z + Ln[2] * t);
      if (clear <= 0) return 0;
      res = Math.min(res, (7 * clear) / t);
      t += Math.max(0.12, t * 0.16);
    }
    return Math.min(1, res) ** 1.5;
  };
  const surface = (lam: number, x: number, z: number, h: number, nrm: V3) => {
    // Faces looking up at the sky take a little cool bounce; faces turned to
    // the moon move toward the moonlit taupe, and the few turned fully to it
    // (the band just behind a brink) glint toward moon-sand.
    // Open flats see the whole sky, a slip face facing us sees half of it:
    // the bounce keeps cast-shadowed floors apart from the slip faces.
    const shadowCol = mix(sandShadow, bounce, 0.1 + 0.75 * Math.max(0, nrm[1]) ** 8);
    const direct = lam > 0.03 ? lam * shadowAt(x, z, h) : 0;
    // With the moon ahead, flat sand gets n·L ≈ 0.42, flanks turned to the
    // moon ≈ 0.55, slip faces facing us ≈ 0: map that range onto the ramp.
    const base = mix(shadowCol, sandLit, smooth(0.04, 0.46, direct));
    return mix(base, sandGlint, smooth(0.46, 0.62, direct));
  };

  /** 1 on the hero's own slip face and just under its brink, 0 elsewhere. */
  const heroSlip = (x: number, z: number) => {
    if (z > 34) return 0;
    const slip = smooth(-0.8, 0.6, heroSide(x, z));
    if (slip === 0) return 0;
    return slip * smooth(-0.6, 0.2, hero(x, z) - field(x, z));
  };
  const terrain = duneSlices({
    id: "dn-t",
    cam,
    atm,
    height,
    light,
    zNear: 2.2,
    zFar: 220,
    // Dense candidates: near the horizon 1/z spacing is sparse, and an oblique
    // far crest then shows as scalloped teeth on the skyline.
    candidates: 5000,
    // 3D2-04: the slip-face hatch had two causes, measured with
    // spike/wallpapers/desert-night-slip-diag.ts (|ΔL| at slice boundaries):
    // gradient-stop error (fixed by the piecewise-linear fit in duneSlices)
    // and the band itself, since the dark slip face changes colour fast with
    // depth. So the band halves (6 → 3 px) on the hero's slip side and just
    // under its brink, and stays 6 px on the calm windward flank and field.
    maxBand: z => (z < 30 ? 6 : 3) * (W / 3840),
    bandScale: (x, z) => 1 - 0.5 * heroSlip(x, z),
    samples: Math.round(520 * Math.min(1, W / 3840) + 120),
    // Fit tolerance in OKLab: 0.005 is about one 8-bit level in this dark
    // sand (≈ 0.0046 L); the grain covers the rest. Halving it on the slip
    // face cost ~8k elements (split-complementary 32k > 30k budget), so no.
    tolerance: 0.005,
    surface,
  });
  layers.push(terrain);

  // ── Grain: kills banding in the dark gradients ────────────────────────────
  layers.push(grainBrick("dn-grain", W, H, moonLight, 0.035));

  return mergeBricks(layers);
}

/** Motif + the stock balanced-mode vignette, i.e. exactly what would ship. */
export function composeDesertNight(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(desertNightMotif(p), p);
}
