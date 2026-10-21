/**
 * MidnightAtelier — a full moon over a breezy lake, one lit studio window.
 *
 * Concept: a high full moon stands over a lake at midnight. The water carries
 * no second moon disc: a light breeze breaks its reflection into a broad
 * glitter path that widens toward the viewer and breaks into single glints
 * near it. Low, backlit hills close the far shore; a taller wooded ridge rises
 * on the right with a fine comb of conifers on its skyline, and a low wooded
 * spit leaves that shore toward the lake. Mist pools along the waterline.
 *
 * World: x right, y up, z away (world units, eye 1.2 above the water). The
 * lake is the plane y = 0; the shore is ONE height field clamped to the water
 * level: far range z ≈ 190 (lower under the moon), left hills z ≈ 96, right
 * ridge z ≈ 66, a spit tongue from z ≈ 50 (azimuth 0.22) to its tip at z ≈ 35
 * (azimuth 0.04), and a near bank at z < 1.1, h ≈ 0.12. The bank lies below
 * the landscape frames' bottom row (z ≈ 3) and only enters the portrait frame,
 * where it keeps the text pill calm. Rendered with depthSlices — a private
 * copy of scene3d's terrainSlices with two fixes (fully hidden slices,
 * slice centring; see there) — water rows included, so land and lake share
 * one painter's order.
 *
 * Camera: eye 1.2. Monitor horizon 0.60, focal 1.0·H; tablet the same focal
 * (it sees the central 75 %), shifted to cx 0.54 so the path's outer fringe
 * clears its text pill; mobile horizon 0.58, focal W/(2·0.75), re-centred so
 * the moon stands at 0.5 W. The moon is at infinity, placed on screen
 * (monitor 0.42 W / 0.25 H, mobile 0.36 H — at 0.25 H its mirror point would
 * fall on the mobile pill); its direction follows by inverse projection, and
 * that direction IS the light.
 *
 * Light:
 *   · Land: Lambert against the moon (backlit — faces toward us fall into
 *     shadow, only crests and gentle tops catch a little silver).
 *   · Water: Fresnel-weighted mirror of the world — the sky ramp, the moon
 *     halo and the shore, whose breeze-blurred image is analytic: the share of
 *     mirror rays that hit the shore is Φ((horizon slope − eye/z)/(2σ)). Plus
 *     the moon's glitter as a Cox–Munk field with Smith masking,
 *     radiance ∝ F·p(slope)·G/(4·cosθv·cos⁴β): the path's width, its widening
 *     toward the viewer and its fade all follow from that one formula. Near
 *     the viewer, where one facet is larger than a pixel, part of that energy
 *     is drawn as discrete soft glints, Poisson-sampled from the same field.
 *   · Breeze: slope rms 0.08 × gust (0.5–1.5, noise) × (0.4 + 0.6·lee), floor
 *     0.015, σx : σz = 1.1 : 0.9; calmer in the lee of the far shore, so the
 *     shore mirrors there.
 *
 * Atmosphere: aerial haze toward a dark violet-grey air (capped low, so the
 * backlit hills stay the darkest forms); low waterline mist as altitude fog,
 * density exp(−y/0.4) with a noisy scale height, integrated in closed form
 * along each line of sight — it pools along the shoreline, thins with
 * distance and is brighter toward the moon (forward scattering).
 *
 * Personal touch ("atelier", a studio at midnight): no house, only one warm
 * window where the spit meets the right-hand shore, placed by querying the
 * height field. Its reflection uses the same slope model with the window as
 * a near point source (solid angle ∝ 1/d²), which gives a short, narrow
 * vertical smear.
 */
import { converter, oklch } from "culori";
import { mergeBricks } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";
import {
  type Camera,
  coniferRow,
  hazeAt,
  project,
  relPath,
  type SliceOptions,
  type SliceProfile,
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

/** The least saturated of the light palette roles — a moon, not a lime. */
function quietestLight(cs: string[]): string {
  const light = cs.filter(x => lightness(x) > 0.82);
  const pool = light.length ? light : cs;
  return pool.reduce((a, b) => ((oklch(b)?.c ?? 0) < (oklch(a)?.c ?? 0) ? b : a));
}

/** The palette role closest to lamplight (hue ≈ 70°) with real chroma. */
function warmest(cs: string[]): string {
  const score = (x: string) => {
    const o = oklch(x);
    if (!o) return 999;
    const dh = Math.abs((((o.h ?? 0) - 70 + 540) % 360) - 180);
    return dh + ((o.c ?? 0) < 0.05 ? 120 : 0);
  };
  return cs.reduce((a, b) => (score(b) < score(a) ? b : a));
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Schlick's Fresnel reflectance of water (F0 ≈ 0.02) at incidence cosine `c`. */
const fresnel = (c: number) => 0.02 + 0.98 * (1 - clamp01(c)) ** 5;

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 erf, |error| < 1.5e-7). */
function phi(x: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/**
 * Smith masking for a Gaussian slope field: the share of facets a ray at
 * incidence cosine `c` actually sees. At grazing angles the wave crests hide
 * the troughs, which keeps the glitter from blowing up toward the horizon.
 */
function smithG(c: number, sigma: number): number {
  const cot = c / Math.sqrt(Math.max(1e-6, 1 - c * c));
  const mu = cot / (Math.SQRT2 * sigma);
  if (mu > 4) return 1;
  const lambda =
    (Math.exp(-mu * mu) / (mu * Math.sqrt(Math.PI)) - 2 * (1 - phi(mu * Math.SQRT2))) / 2;
  return 1 / (1 + Math.max(0, lambda));
}

// ─── Depth slices with a corrected selection (private adaptation) ───────────
// Adapted from scene3d's terrainSlices. There, the band test looks only at
// columns where the current slice is itself visible, so a slice that is fully
// hidden (here: the water behind the far range) measures a band of 0 and the
// selection jumps straight to the nearest candidate — the whole scene in
// front of an opaque far range vanished. Here the band is measured in EVERY
// column: where the current slice is hidden, its fill starts at the nearer
// envelope (that is where its outline is pushed), so the band is the area
// that would take its colour before the next kept slice covers it. Colour
// stops come from every column where that band is non-empty.
const toOklab = converter("oklab");
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
function colourDist(a: string, b: string): number {
  const A = okl(a);
  const B = okl(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

function depthSlices(o: SliceOptions): { defs: string; elements: string } {
  const { cam } = o;
  const L = norm(o.light);
  const tol = o.tolerance ?? 0.02;
  const S = o.samples;
  const eps = 0.02;
  const C = o.candidates;
  const zs: number[] = [];
  const prof: Array<{
    xs: number[];
    hs: number[];
    ys: number[];
    pts: Array<{ x: number; y: number }>;
  }> = [];
  for (let i = 0; i <= C; i++) {
    const z = 1 / (1 / o.zFar + (1 / o.zNear - 1 / o.zFar) * (i / C));
    const half = ((cam.W * 0.54) / cam.focal) * z;
    // World x of the screen centre at this depth. (scene3d has the sign
    // flipped, which only shows when cx ≠ 0.5 — e.g. the re-centred portrait
    // camera — and leaves a strip of the frame unpainted.)
    const xc = (0.5 - (cam.cx ?? 0.5)) * (cam.W / cam.focal) * z;
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
    prof.push({ xs, hs, pts, ys: pts.map(q => q.y) });
  }
  // env[i][k]: highest screen point (smallest y) of everything nearer than i.
  const env: number[][] = new Array(C + 1);
  env[C] = new Array(S + 1).fill(cam.H);
  for (let i = C - 1; i >= 0; i--)
    env[i] = env[i + 1].map((e, k) => Math.min(e, prof[i + 1].ys[k]));
  // Top of the area a slice paints in column k (own profile, or the nearer
  // envelope where it is hidden), clipped to the frame.
  const paintTop = (i: number, k: number) => {
    const y = prof[i].ys[k];
    return Math.max(0, y < env[i][k] + 1 ? y : env[i][k]);
  };
  const kept: number[] = [0];
  let cur = 0;
  while (cur < C) {
    let next = cur + 1;
    const maxBand = typeof o.maxBand === "number" ? o.maxBand : o.maxBand(zs[cur]);
    for (let j = cur + 1; j <= C; j++) {
      let band = 0;
      for (let k = 0; k <= S; k++) {
        const bottom = Math.min(prof[j].ys[k], env[j][k], cam.H);
        band = Math.max(band, bottom - paintTop(cur, k));
      }
      if (band > maxBand) break;
      next = j;
    }
    kept.push(next);
    cur = next;
  }
  const defs: string[] = [];
  const els: string[] = [];
  kept.forEach((ci, idx) => {
    const z = zs[ci];
    const { xs, hs, pts, ys } = prof[ci];
    const nearer = idx + 1 < kept.length ? kept[idx + 1] : -1;
    const front = env[ci];
    const visible = ys.map((y, k) => y < front[k] + 1);
    // Columns where this slice shows at all before the next kept slice.
    const cover =
      nearer < 0
        ? new Array(S + 1).fill(cam.H)
        : prof[nearer].ys.map((y, k) => Math.min(y, env[nearer][k], cam.H));
    const shows = ys.map((_, k) => cover[k] - paintTop(ci, k) > 0.25);
    if (!shows.some(Boolean)) return;
    const hz = hazeAt(o.atm, z);
    const colour = (k: number) => {
      const x = xs[k];
      const dx = (o.height(x + eps * z, z) - o.height(x - eps * z, z)) / (2 * eps * z);
      const dz = (o.height(x, z + eps * z) - o.height(x, z - eps * z)) / (2 * eps * z);
      const nrm = norm([-dx, 1, -dz]);
      const lam = Math.max(0, nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]);
      return mix(o.surface(lam, x, z, hs[k], nrm), o.atm.haze, hz);
    };
    // Outline: visible samples (and neighbours) exactly; hidden runs sparse
    // and pushed just below the nearer envelope over their span.
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
    const stops: Array<{ sx: number; col: string }> = [];
    let prevK = -1;
    let prevCol = "";
    for (let k = 0; k <= S; k++) {
      if (!shows[k]) continue;
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
    els.push(`<path d="${relPath(outline)}V${cam.H}H${Math.round(x0)}Z" fill="${fill}"/>`);
    if (o.after) {
      const zNext = nearer < 0 ? o.zNear : zs[nearer];
      const prof2: SliceProfile = { index: idx, z, zNext, xs, hs, pts, visible };
      els.push(o.after(prof2));
    }
  });
  return { defs: defs.join("\n"), elements: `<g id="${o.id}">${els.join("")}</g>` };
}

export function midnightAtelierMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-midnight-atelier-${part}`);
  const portrait = H > W;

  // ── Value plan (palette-derived, lightness guarded per role) ─────────────
  const bgL = lightness(c.bg);
  const night = shade(c.bg, 0.6);
  // Chroma is capped hard: in a one-hue mode a saturated moon turns pink.
  const moonLight = keepLightness(
    tone(
      quietestLight([
        c.huePurple,
        c.attributes,
        c.variables,
        c.hueGreen,
        c.tags,
        c.keywords,
        c.functions,
      ]),
      0.14
    ),
    0.88,
    0.96
  );
  const haloTint = mix(moonLight, c.accent, 0.08);
  const haze = keepLightness(mix(c.bg, moonLight, 0.16), bgL + 0.05, bgL + 0.12);
  const lamp = keepLightness(
    tone(warmest([c.hueGreen, c.strings, c.variables, c.accent, c.hueOrange, c.hueRed]), 0.85),
    0.8,
    0.9
  );
  // Backlit land: shadow ink, a restrained silver for faces toward the moon.
  const inkShadow = shade(c.bg, 0.46);
  const inkLit = mix(inkShadow, moonLight, 0.16);
  const forestInk = shade(c.bg, 0.4);
  // Air between the shores: a touch darker than the horizon sky, so distance
  // softens a silhouette without ever lifting it above the sky behind it.
  const air = mix(haze, inkShadow, 0.35);
  const mistBase = keepLightness(mix(haze, moonLight, 0.1), bgL + 0.06, bgL + 0.13);
  const waterBody = shade(c.bg, 0.42);

  // ── Camera (per platform) and the moon's direction ───────────────────────
  // Landscape: focal = 1.0·H, so the tablet sees the central 75 % of the
  // monitor's field. Portrait: a 74° horizontal field (tan-half 0.75).
  const horizon = portrait ? 0.58 : 0.6;
  const focal = portrait ? W / (2 * 0.75) : 1.0 * H;
  const eye = 1.2;
  // World azimuth of the moon (tan); on landscape it lands at 0.42 W, so the
  // outer fringe of the derived glitter path stays right of the text pill
  // (monitor pill ≤ 0.33 W).
  const moonAz = (-0.08 * 3840) / 2160;
  // Portrait re-centres on the moon; the tablet (which sees only the central
  // 75 % of the monitor's field) shifts slightly, so the path's outer fringe
  // also clears its text pill (≤ 0.33 W).
  const cx = portrait ? 0.5 - (focal * moonAz) / W : p.platform === "tablet" ? 0.54 : 0.5;
  const cam: Camera = { W, H, horizon, eye, focal, cx };
  const horY = horizon * H;
  const moonR = 0.07 * Math.min(W, H); // diameter 0.14·min(W, H)
  const moonScr = { x: cx * W + focal * moonAz, y: (portrait ? 0.36 : 0.25) * H };
  // Inverse projection of a point at infinity: (dx/dz, dy/dz) from its screen
  // position. That direction is the light for land, water and mist alike.
  const moonDir = norm([moonAz, (horY - moonScr.y) / focal, 1]);

  // ── Sky as a function of direction (shared by the sky and its reflection) ─
  // The ramp is keyed on s = tan(elevation along z) = (horY − y)/focal, so the
  // SVG gradient and the mirrored sky on the water are the same function.
  const skyStops: Array<[number, string]> = [
    [0, haze],
    [0.035, mix(c.bg, haze, 0.62)],
    [0.16, mix(c.bg, haze, 0.25)],
    [0.42, c.bg],
    [1.1, night],
  ];
  const skyRamp = (s: number) => {
    if (s <= 0) return skyStops[0][1];
    for (let i = 1; i < skyStops.length; i++) {
      const [s1, c1] = skyStops[i];
      if (s <= s1) {
        const [s0, c0] = skyStops[i - 1];
        return mix(c0, c1, (s - s0) / (s1 - s0));
      }
    }
    return skyStops[skyStops.length - 1][1];
  };
  // Tight halo (≈4.5 R) plus a faint wash, as opacity of the halo tint.
  const moonAng = moonR / focal; // angular radius (small-angle)
  const haloAlpha = (ang: number) => {
    const u = ang / (moonAng * 4.5);
    const tight =
      u < 0.32
        ? 0.2 - ((Math.max(0.2, u) - 0.2) / 0.12) * 0.1
        : u < 0.55
          ? 0.1 - ((u - 0.32) / 0.23) * 0.07
          : u < 1
            ? 0.03 * (1 - (u - 0.55) / 0.45)
            : 0;
    const w = ang / ((W * 0.36) / focal);
    const wash = w < 0.4 ? 0.05 - (w / 0.4) * 0.032 : w < 1 ? 0.018 * (1 - (w - 0.4) / 0.6) : 0;
    return tight + wash;
  };
  const skyAt = (d: V3) => {
    const base = skyRamp(d[1] / Math.max(1e-3, d[2]));
    const ang = Math.acos(Math.min(1, dot(norm(d), moonDir)));
    return mix(base, haloTint, haloAlpha(ang));
  };

  const layers: BrickOutput[] = [];
  const skyGrad = Array.from({ length: 13 }, (_, i) => {
    const y = (i / 12) * H;
    return `<stop offset="${n(i / 12, 3)}" stop-color="${skyRamp((horY - y) / focal)}"/>`;
  }).join("");
  layers.push({
    defs: `<linearGradient id="ma-sky" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">${skyGrad}</linearGradient>
<radialGradient id="ma-wash" cx="${n(moonScr.x)}" cy="${n(moonScr.y)}" r="${n(W * 0.36)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${haloTint}" stop-opacity="0.05"/>
  <stop offset="0.4" stop-color="${haloTint}" stop-opacity="0.018"/>
  <stop offset="1" stop-color="${haloTint}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ma-halo" cx="${n(moonScr.x)}" cy="${n(moonScr.y)}" r="${n(moonR * 4.5)}" gradientUnits="userSpaceOnUse">
  <stop offset="0.2" stop-color="${haloTint}" stop-opacity="0.2"/>
  <stop offset="0.32" stop-color="${haloTint}" stop-opacity="0.1"/>
  <stop offset="0.55" stop-color="${haloTint}" stop-opacity="0.03"/>
  <stop offset="1" stop-color="${haloTint}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#ma-sky)"/>
<rect width="${W}" height="${n(horY + 2)}" fill="url(#ma-wash)"/>
<rect width="${W}" height="${n(horY + 2)}" fill="url(#ma-halo)"/>`,
  });

  // ── Stars: sparse (a bright moon washes most out), none near the disc ────
  layers.push(
    starField({
      id: "ma-st",
      width: W,
      horizonY: horY - H * 0.04,
      count: portrait ? 200 : 230,
      tints: [moonLight, c.attributes, c.huePurple].map(t => keepLightness(t, 0.8, 0.96)),
      avoid: { cx: moonScr.x, cy: moonScr.y, r: moonR * 6 },
      rng: key("stars"),
    })
  );

  // ── The moon (hero): full, lit all over, soft limb ───────────────────────
  // moonBrick supplies the albedo group (maria, craters, mottling); the disc is
  // drawn straight from that group without the terminator mask (full moon).
  // The regolith noise is a filter restricted to the disc's own box.
  const moonB = moonBrick({
    pre: "ma",
    cx: moonScr.x,
    cy: moonScr.y,
    r: moonR,
    terminator: 0.76,
    rotate: -22,
    light: moonLight,
    warm: tone(lamp, 0.4),
    dark: c.bg,
    rng: key("moon"),
  });
  const md = key("moon-detail");
  const R = moonR;
  const fore = (u: number) => Math.sqrt(Math.max(0.12, 1 - u * u));
  const small: string[] = [];
  for (let k = 0; k < 56; k++) {
    const x = md() * 2 - 1;
    const y = md() * 2 - 1;
    const r = Math.min(0.05, 0.009 * (1 - md()) ** (-1 / 1.6));
    if (Math.hypot(x, y) + r > 0.96) continue;
    const op = 0.35 + 0.55 * clamp01((x + 0.3) / 1.0);
    small.push(
      `<ellipse cx="${n(x * R)}" cy="${n(y * R)}" rx="${n(r * fore(x) * R, 2)}" ry="${n(r * fore(y) * R, 2)}" opacity="${n(op, 2)}"/>`
    );
  }
  const box = `x="${n(-R * 1.3)}" y="${n(-R * 1.3)}" width="${n(2.6 * R)}" height="${n(2.6 * R)}"`;
  const regolith = mix(moonLight, c.bg, 0.5);
  const highland = shade(moonLight, 1.06);
  const limbInk = mix(moonLight, c.bg, 0.72);
  layers.push({
    defs: `${moonB.defs}
<filter id="ma-regolith" filterUnits="userSpaceOnUse" ${box} color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${n(0.22 * (180 / R), 3)}" numOctaves="2" seed="${Math.floor(md() * 1000)}" result="t"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.4 0 0 0 -0.62" result="a"/>
  <feFlood flood-color="${regolith}"/>
  <feComposite in2="a" operator="in"/>
</filter>
<filter id="ma-limbsoft" filterUnits="userSpaceOnUse" ${box} color-interpolation-filters="sRGB">
  <feGaussianBlur stdDeviation="${n(0.9 * (R / 180), 2)}"/>
</filter>
<radialGradient id="ma-highland">
  <stop offset="0" stop-color="${highland}" stop-opacity="0.35"/>
  <stop offset="1" stop-color="${highland}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ma-limb" cx="${n(-0.1 * R)}" cy="${n(-0.06 * R)}" r="${n(1.12 * R)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${limbInk}" stop-opacity="0"/>
  <stop offset="0.62" stop-color="${limbInk}" stop-opacity="0"/>
  <stop offset="0.9" stop-color="${limbInk}" stop-opacity="0.22"/>
  <stop offset="1" stop-color="${limbInk}" stop-opacity="0.46"/>
</radialGradient>
<g id="ma-moondetail" clip-path="url(#ma-moonclip)">
<ellipse cx="${n(-0.05 * R)}" cy="${n(0.62 * R)}" rx="${n(0.6 * R)}" ry="${n(0.3 * R)}" fill="url(#ma-highland)"/>
<ellipse cx="${n(0.45 * R)}" cy="${n(0.42 * R)}" rx="${n(0.3 * R)}" ry="${n(0.22 * R)}" fill="url(#ma-highland)"/>
<rect ${box} fill="${regolith}" filter="url(#ma-regolith)" opacity="0.2"/>
<g fill="url(#ma-crater)">${small.join("")}</g>
</g>`,
    elements: `<g transform="translate(${n(moonScr.x)} ${n(moonScr.y)})" filter="url(#ma-limbsoft)">
<g transform="rotate(-22)"><use href="#ma-moon-albedo"/><use href="#ma-moondetail"/></g>
<circle r="${n(R)}" fill="url(#ma-limb)"/>
</g>`,
  });

  // ── The shore: one height field in world space ───────────────────────────
  // Each landform is a ridge with a crest line at depth zc(a) and a height
  // h(a), parametrised by the azimuth a = x/z (so it is easy to compose), with
  // a short front flank down to the lake and a long back slope. The lake bed
  // sits at −0.3, so where no ridge rises the field clamps to the water plane.
  const nz = valueNoise2D(key("shore"), 64);
  const nz2 = valueNoise2D(key("shore-2"), 64);
  const bump = (t: number) => (t < 0 ? Math.exp(-t * t) : Math.exp(-((t / 2.6) ** 2)));
  const gauss = (x: number, m: number, s: number) => Math.exp(-(((x - m) / s) ** 2));
  const ridgeFar = (x: number, z: number) => {
    const a = x / z;
    const zc = 190 + 22 * nz(a * 3, 1.5);
    // A shallow dip under the moon, a little rise either side of it.
    const h = (4.6 + 1.6 * nz(a * 4 + 7, 3.1)) * (1 - 0.55 * gauss(a, moonAz, 0.16));
    return h * bump((z - zc) / 16);
  };
  const ridgeLeft = (x: number, z: number) => {
    const a = x / z;
    const zc = 96 + 10 * nz(a * 2.5 + 3, 5.3);
    // Broad rounded hills from the left edge, tapering out before the moon.
    const h = 5.6 * smooth01((-0.26 - a) / 0.38) * (0.8 + 0.3 * nz(a * 3 + 11, 8.2));
    return h * bump((z - zc) / 13);
  };
  const ridgeRight = (x: number, z: number) => {
    const a = x / z;
    const zc = 66 + 12 * nz(a * 2 + 5, 9.9);
    // Rises from a low saddle right of the moon to a long wooded ridge.
    const h = (1.2 + 4.4 * smooth01((a - 0.05) / 0.55)) * (0.9 + 0.2 * nz(a * 5 + 2, 12.7));
    return h * bump((z - zc) / 11) * smooth01((a + 0.02) / 0.1);
  };
  const ridgeSpit = (x: number, z: number) => {
    const a = x / z;
    // A low tongue of land leaving the right shore near the window and
    // reaching toward the viewer-left: its centre line runs from z ≈ 50 at
    // a = 0.22 to its tip at z ≈ 35, a = 0.04; it is lowest at the tip.
    const t = clamp01((a - 0.04) / 0.18);
    const zc = 35 + 15 * t;
    const h = 0.6 * smooth01((a - 0.025) / 0.07);
    return h * Math.exp(-(((z - zc) / 2.2) ** 2));
  };
  // The bank at the viewer's feet (z < ≈1.1): below the frame on landscape
  // (the frame's bottom row is at z ≈ 3), it rises into the bottom of the
  // portrait frame and keeps the water — and the glitter — out of the text
  // area there. A low, softly undulating edge.
  const bankN = valueNoise2D(key("bank"), 64);
  const nearBank = (x: number, z: number) => {
    // Projected top edge y = horY + f·(eye − h)/z: h ≈ 0.12 at z ≈ 1.0 lands
    // at ≈ 0.9 H on the portrait frame, just above the text pill.
    const edge = 1.08 + 0.07 * bankN(x * 0.9, 3.3) + 0.025 * bankN(x * 3.1, 7.7);
    // Low everywhere: a nearer part that rose higher would project ABOVE the
    // far edge (y grows as (eye − h)/z) and read as a hill, not a bank.
    return 0.14 * smooth01((edge - z) / 0.08) * (1 + 0.3 * bankN(x * 2.3, z * 2.3)) - 0.02;
  };
  const lakeBed = -0.3;
  // Ground texture, band-limited by distance: an octave is used only where its
  // wavelength spans ≥ 3 profile samples (sample spacing grows with z).
  const sampleSpacing = (z: number) => ((W * 1.08) / focal / 520) * z;
  const texture = (x: number, z: number) => {
    let s = 0;
    let amp = 0.18;
    let f = 0.16;
    for (let o = 0; o < 4; o++) {
      const wl = 1 / f;
      const w = smooth01((wl / sampleSpacing(z) - 3) / 2);
      if (w <= 0) break;
      s += amp * w * (o % 2 ? nz2(x * f, z * f) : nz(x * f + 40, z * f + 40));
      amp *= 0.5;
      f *= 2.1;
    }
    return s;
  };
  const rawHeight = (x: number, z: number) => {
    const r = Math.max(ridgeFar(x, z), ridgeLeft(x, z), ridgeRight(x, z), ridgeSpit(x, z));
    if (z < 1.3) return Math.max(nearBank(x, z), lakeBed);
    // Texture scales with the landform, so the lake bed stays flat.
    return lakeBed + r * (1 + texture(x, z)) + 0.3 * smooth01(r / 0.4);
  };
  const water = 0;
  const height = (x: number, z: number) => Math.max(water, rawHeight(x, z));
  const forestAmount = (x: number, z: number, h: number) => {
    if (z < 1.6) return 1; // the near bank: dark grass, never a lit dune
    // The right ridge is wooded above its foot; the edge wanders with noise.
    // The spit is wooded too, so it reads as a dark tongue, not a lit mound.
    const ar = Math.max(ridgeRight(x, z), ridgeSpit(x, z) * 3);
    const others = Math.max(ridgeFar(x, z), ridgeLeft(x, z));
    const foot = z < 45 ? 0.15 : 0.7; // the spit is low: wooded down to its shore
    const w =
      smooth01((ar - others) / 0.8) * smooth01((h - foot - 0.5 * nz2(x * 0.4, z * 0.4)) / 0.6);
    return w;
  };

  // Shoreline distance per azimuth (first land met marching away), memoised.
  const shoreCache = new Map<number, number>();
  const shoreZ = (a: number) => {
    const k = Math.round(a * 400);
    const hit = shoreCache.get(k);
    if (hit !== undefined) return hit;
    const aa = k / 400;
    let z = 20;
    while (z < 260 && rawHeight(aa * z, z) <= water) z *= 1.02;
    shoreCache.set(k, z);
    return z;
  };

  // Shelter is a broad effect: the shore distance averaged over ±0.08 in
  // azimuth, so the lee never ends along a vertical line in the water.
  const shoreSmooth = (a: number) => {
    let s = 0;
    for (let i = -4; i <= 4; i++) s += Math.min(230, shoreZ(a + i * 0.02));
    return s / 9;
  };

  // ── Breeze: slope rms per water point ────────────────────────────────────
  // Open water 0.05–0.07 with cat's-paw gusts; the lee of the far shore is
  // calmer, so the shore mirrors there. Anisotropic: the breeze runs toward
  // the viewer, so slopes along z are larger than across.
  const gustN = valueNoise2D(key("gust"), 64);
  const sigmaAt = (x: number, z: number) => {
    // Gusts scale the roughness by 0.5–1.5 (never to zero: a slope rms of 0
    // would turn the mirror's smooth blur into a hard step).
    const gust = 1 + 0.5 * gustN(x * 0.14, z * 0.14);
    const lee = smooth01((shoreSmooth(x / z) - z) / 45);
    const s = Math.max(0.015, 0.08 * gust * (0.4 + 0.6 * lee));
    return { sx: s * 1.1, sz: s * 0.9 };
  };

  // Cox–Munk glitter radiance (unnormalised) toward the eye from water point
  // P = (x, 0, z) for a source in direction `s` (unit, from P).
  const glitter = (x: number, z: number, s: V3, sg: { sx: number; sz: number }) => {
    const v = norm([-x, eye, -z]);
    const h = norm([v[0] + s[0], v[1] + s[1], v[2] + s[2]]);
    if (h[1] <= 0.05) return 0;
    const zx = -h[0] / h[1];
    const zz = -h[2] / h[1];
    const pdf =
      Math.exp(-0.5 * ((zx / sg.sx) ** 2 + (zz / sg.sz) ** 2)) / (2 * Math.PI * sg.sx * sg.sz);
    const mask = smithG(v[1], sg.sz) * smithG(Math.max(0.01, s[1]), sg.sz);
    return (fresnel(dot(v, h)) * pdf * mask) / (4 * Math.max(0.02, v[1]) * h[1] ** 4);
  };

  // Normalise the moon's glitter to its brightest visible value (scan the
  // visible water on a coarse screen grid).
  let gMax = 1e-9;
  for (let j = 1; j <= 60; j++) {
    const y = horY + ((H - horY) * j) / 60;
    const z = (focal * eye) / (y - horY);
    for (let i = 0; i <= 60; i++) {
      const x = (((i / 60) * W - cx * W) * z) / focal;
      gMax = Math.max(gMax, glitter(x, z, moonDir, sigmaAt(x, z)));
    }
  }

  // ── Mist: altitude fog integrated along the line of sight ────────────────
  // Density ρ(x,z)·exp(−y/H0) with a noisy scale height; for a straight ray
  // from the eye (height eye) to a point at height h over distance D the
  // optical depth is ρ·D·H0·(e^(−h/H0) − e^(−eye/H0))/(eye − h).
  const fogN = valueNoise2D(key("mist"), 64);
  const fogAt = (x: number, z: number, h: number) => {
    const H0 = 0.4 * (0.75 + 0.5 * fogN(x * 0.05 + 9, z * 0.05));
    // Pools: noise-placed, densest along the shoreline (cold air drains off
    // the land and settles there), thinning with distance so the far shore
    // never turns into one thin bright line.
    const zs = shoreSmooth(x / z);
    const atShore = Math.exp(-(((z - zs) / 16) ** 2)) + 0.25 * smooth01((z - zs) / 10);
    const rho =
      (0.05 * smooth01(0.5 + 0.9 * fogN(x * 0.035, z * 0.035 + 17)) ** 1.5 * atShore) /
      (1 + (z / 110) ** 2);
    const D = Math.hypot(x, z, eye - h);
    const dh = eye - h;
    const path =
      Math.abs(dh) < 1e-3
        ? D * Math.exp(-h / H0)
        : (D * H0 * (Math.exp(-h / H0) - Math.exp(-eye / H0))) / dh;
    return Math.min(0.55, 1 - Math.exp(-rho * path));
  };
  // Forward scattering: mist toward the moon's azimuth glows a little more.
  const mistColour = (x: number, z: number) => {
    const v = norm([x, 0, z]);
    const g = Math.max(0, dot(v, norm([moonDir[0], 0, moonDir[2]])));
    return mix(mistBase, moonLight, 0.04 + 0.16 * g ** 24);
  };

  // ── Land colour (before aerial haze) ─────────────────────────────────────
  const landColour = (lam: number, x: number, z: number, h: number, ny: number) => {
    const sky = 0.1 * Math.max(0, ny);
    const open = mix(inkShadow, inkLit, Math.min(1, lam ** 1.3 + sky));
    const woods = mix(forestInk, inkLit, 0.4 * lam ** 1.4);
    const body = mix(open, woods, forestAmount(x, z, h));
    return mix(body, mistColour(x, z), fogAt(x, z, h));
  };

  // ── Water colour: Fresnel mirror of the world + glitter + mist ───────────
  // The reflected ray from P keeps P's azimuth and climbs at slope eye/z
  // (tilted by 2α for a facet tilt α); the shore is found by marching it
  // through the height field, the sky otherwise. Five stratified slope
  // samples give the breeze blur of the mirror image.
  const reflectAt = (x: number, z: number, sz: number) => {
    // The shore's horizon seen from P along its azimuth: the steepest
    // land elevation slope h/(zz − z) and the land colour there.
    const a = x / z;
    const zs = shoreZ(a);
    const base = eye / z; // slope of the mirror ray for a level facet
    let top = 0;
    let topCol = "";
    if (zs < 255) {
      for (let zz = Math.max(z + 0.01, zs); zz < 260; zz += Math.max(0.35, 0.01 * zz)) {
        if (9 / (zz - z) < top) break; // nothing farther can rise above it
        const hh = rawHeight(a * zz, zz);
        const sl = hh / (zz - z);
        if (sl > top) {
          top = sl;
          // The mirror sees the shadowed, viewer-facing side of the land.
          const lc = mix(inkShadow, forestInk, forestAmount(a * zz, zz, hh));
          const hz = Math.min(0.42, 1 - Math.exp(-(zz - z * 0.5) / 120));
          topCol = mix(mix(lc, mistColour(a * zz, zz), fogAt(a * zz, zz, hh)), air, hz);
        }
      }
    }
    // A facet tilt α turns the mirror ray by 2α; with Gaussian slopes the
    // share of rays that hit the shore is Φ((top − base)/(2σ)) — the
    // breeze-blurred mirror image, smooth by construction.
    const sky = skyAt([a, Math.max(base, top) + sz, 1]);
    // Rougher water mirrors a steeper, darker stretch of sky: gusts show as
    // faint tonal patches on the open lake.
    if (top <= 0) return skyAt([a, base + 0.8 * sz, 1]);
    return mix(sky, topCol, phi((top - base) / (2 * sz)));
  };
  // Share of the glitter drawn as a smooth field (the rest as discrete glints
  // near the viewer, where one facet spans more than a pixel).
  const glintLz = 0.07; // typical facet depth, world units
  const glintPx = (z: number) => (focal * eye * glintLz) / (z * z);
  const sparkFrac = (z: number) => 0.6 * smooth01((glintPx(z) - 1.2) / 4);
  // Soft shoulder: bright glitter compresses instead of clipping to a flat blob.
  const glow = (b: number) => 0.7 * (1 - Math.exp(-1.6 * b));
  const waterColour = (x: number, z: number) => {
    const v = norm([-x, eye, -z]);
    const sg = sigmaAt(x, z);
    const F = fresnel(v[1]);
    const refl = reflectAt(x, z, sg.sz);
    // Reflectance with a floor: the night lake still shows the sky faintly.
    let col = mix(waterBody, refl, Math.min(0.92, 0.18 + 1.15 * F));
    const b = glitter(x, z, moonDir, sg) / gMax;
    col = mix(col, moonLight, glow(b) * (1 - 0.45 * sparkFrac(z)));
    return mix(col, mistColour(x, z), fogAt(x, z, 0));
  };

  // ── The studio window, placed on the height field ────────────────────────
  // At azimuth aw, the first dry land past the waterline; the window stands
  // just above the ground there. Projected, it sits at the right shore's foot.
  const aw = 0.2;
  let zw = shoreZ(aw);
  while (rawHeight(aw * zw, zw) < 0.12 && zw < 200) zw += 0.25;
  const win: V3 = [aw * zw, rawHeight(aw * zw, zw) + 0.22, zw];
  const winS = project(cam, win);
  const winW = (focal * 0.25) / zw;
  const winH = (focal * 0.16) / zw;

  // ── Discrete glints near the viewer, sampled from the glitter field ──────
  // Jittered screen strata; accepted with probability ∝ the field. Size from
  // a world facet (Lx across, Lz along) projected: width ∝ 1/z, height ∝ 1/z².
  type Glint = { x: number; y: number; rx: number; ry: number; op: number; zb: number };
  const glints: Glint[] = [];
  const gr = key("glints");
  {
    // Poisson trials over the near water (no rows, no grid): a trial at a
    // random screen point becomes a glint with probability coverage × trial
    // area / glint area, so near glints are few and large, farther ones
    // many and small, and the density follows the glitter field exactly.
    const y0 = horY + (focal * eye) / 26;
    const trials = 160000;
    const cell = (W * (H - y0)) / trials;
    for (let t = 0; t < trials; t++) {
      const jx = gr() * W;
      const jy = y0 + gr() * (H - y0);
      const roll = gr();
      const z = (focal * eye) / (jy - horY);
      const sf = sparkFrac(z);
      if (sf < 0.01) continue;
      const x = ((jx - cx * W) * z) / focal;
      const b = glitter(x, z, moonDir, sigmaAt(x, z)) / gMax;
      if (b < 0.01) continue;
      const len = 0.05 + 0.17 * gr() ** 2; // facet length across, world units
      // Capped so the nearest facets stay slivers, never blobs.
      const rx = Math.min((focal * len) / z / 2, 0.03 * Math.min(W, H));
      const ry = Math.min((glintPx(z) * (0.4 + 0.5 * gr())) / 2, rx * 0.2);
      const area = Math.PI * rx * ry;
      if (roll > Math.min(1, (1.1 * sf * Math.min(1, b) * cell) / area)) continue;
      const flick = gr();
      glints.push({
        x: jx,
        y: jy,
        rx,
        ry,
        op: Math.min(0.9, (0.35 + 0.6 * Math.min(1, b) ** 0.5) * (0.5 + 0.5 * flick)),
        zb: (focal * eye) / (jy + ry - horY),
      });
    }
  }

  // ── Terrain + water through one camera ───────────────────────────────────
  // Water rows are slices too: their colour comes from waterColour(), so the
  // shore occludes the lake and the lake's mirror lines up with the shore.
  const zNear = (0.95 * (focal * eye)) / ((1 - horizon) * H);
  const skyTop: number[] = [];
  const trees = key("trees");
  let windowDone = false;
  const glintEls = (z0: number, z1: number) => {
    const els = glints
      .filter(g => g.zb < z0 && g.zb >= z1)
      .map(
        g =>
          `<ellipse cx="${n(g.x)}" cy="${n(g.y)}" rx="${n(g.rx)}" ry="${n(g.ry, 2)}" opacity="${n(g.op, 2)}"/>`
      );
    return els.length ? `<g fill="url(#ma-gl)">${els.join("")}</g>` : "";
  };
  const terrain = depthSlices({
    id: "ma-t",
    cam,
    atm: { haze: air, visibility: 140, max: 0.4 },
    height,
    light: moonDir,
    zNear,
    zFar: 250,
    candidates: 3000,
    maxBand: z => (z < 12 ? 7 : 4),
    samples: 520,
    tolerance: 0.012,
    surface: (lam, x, z, h, nrm) =>
      h <= water + 1e-4 ? waterColour(x, z) : landColour(lam, x, z, h, nrm[1]),
    after: s => {
      let out = "";
      // Skyline conifers on the wooded ridge only: a tree stands where this
      // slice's point is higher on screen than everything painted so far
      // (i.e. against the sky), never inside the dark mass.
      const against: boolean[] = [];
      s.pts.forEach((q, k) => {
        const prev = skyTop[k] ?? Number.POSITIVE_INFINITY;
        against[k] = s.visible[k] && q.y < prev + 0.5;
        skyTop[k] = Math.min(prev, q.y);
      });
      if (s.z > 40 && s.z < 110)
        out += coniferRow(cam, s, {
          hMin: 0.14,
          hMax: 0.32,
          colour: mix(forestInk, air, 0.25),
          rng: trees,
          where: (x, h, k) => against[k] === true && h > 1.1 && forestAmount(x, s.z, h) > 0.55,
        });
      // The window belongs between the slice behind it and the one in front.
      if (!windowDone && s.z >= win[2] && s.zNext < win[2]) {
        windowDone = true;
        out += `<circle cx="${n(winS.x)}" cy="${n(winS.y)}" r="${n(winW * 5)}" fill="url(#ma-lampglow)"/>
<rect x="${n(winS.x - winW / 2)}" y="${n(winS.y - winH)}" width="${n(winW)}" height="${n(winH)}" rx="${n(winW * 0.18, 2)}" fill="${lamp}"/>`;
      }
      out += glintEls(s.z, s.zNext);
      return out;
    },
  });

  // Window smear: the same slope model with the window as a near point
  // source. Per row below the window's mirror point, the field is sampled
  // across a few px; a soft lens is drawn where it carries energy. The
  // source's solid angle (∝ 1/d²) is part of the radiance, so the smear
  // fades quickly toward the viewer.
  const lampSmear: string[] = [];
  {
    const lr = key("lamp");
    const g0 = (x: number, z: number) => {
      const d = Math.hypot(win[0] - x, win[1], win[2] - z);
      const s = norm([win[0] - x, win[1], win[2] - z]);
      return (glitter(x, z, s, sigmaAt(x, z)) * (zw * zw)) / (d * d);
    };
    let lMax = 1e-9;
    const rows: Array<{ y: number; x: number; hw: number; b: number }> = [];
    for (let y = winS.y + winH; y < Math.min(H, winS.y + H * 0.2); y += 2) {
      const z = (focal * eye) / (y - horY);
      if (z > shoreZ(aw)) continue;
      let best = 0;
      let bx = winS.x;
      let wsum = 0;
      let w2 = 0;
      for (let dx = -40; dx <= 40; dx += 2) {
        const sx = winS.x + dx;
        const b = g0(((sx - cx * W) * z) / focal, z);
        wsum += b;
        w2 += b * dx * dx;
        if (b > best) {
          best = b;
          bx = sx;
        }
      }
      lMax = Math.max(lMax, best);
      rows.push({ y, x: bx, hw: Math.sqrt(w2 / Math.max(1e-12, wsum)), b: best });
    }
    for (const r of rows) {
      const t = r.b / lMax;
      const op = Math.min(0.9, 0.95 * t ** 0.7) * (0.55 + 0.45 * lr());
      if (op < 0.04) continue;
      lampSmear.push(
        `<ellipse cx="${n(r.x)}" cy="${n(r.y)}" rx="${n(Math.max(winW * 0.55, r.hw * 1.6))}" ry="${n((H / 2160) * (2 + 1.2 * lr()), 2)}" opacity="${n(op, 2)}"/>`
      );
    }
  }

  layers.push({
    defs: `${terrain.defs}
<radialGradient id="ma-gl">
  <stop offset="0" stop-color="${moonLight}" stop-opacity="0.95"/>
  <stop offset="0.45" stop-color="${moonLight}" stop-opacity="0.45"/>
  <stop offset="1" stop-color="${moonLight}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ma-gl-lamp">
  <stop offset="0" stop-color="${lamp}"/>
  <stop offset="1" stop-color="${lamp}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ma-lampglow">
  <stop offset="0" stop-color="${lamp}" stop-opacity="0.45"/>
  <stop offset="0.2" stop-color="${lamp}" stop-opacity="0.12"/>
  <stop offset="0.55" stop-color="${lamp}" stop-opacity="0.025"/>
  <stop offset="1" stop-color="${lamp}" stop-opacity="0"/>
</radialGradient>`,
    elements: `${terrain.elements}
<g fill="url(#ma-gl-lamp)">${lampSmear.join("")}</g>`,
  });

  layers.push(grainBrick("ma-grain", W, H, moonLight, 0.035));
  return mergeBricks(layers);
}

export function composeMidnightAtelier(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(midnightAtelierMotif(p), p);
}
