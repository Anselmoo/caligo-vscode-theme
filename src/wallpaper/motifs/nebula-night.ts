/**
 * NebulaNight — the Milky Way over a dark plain, built on the celestial sphere.
 *
 * Concept: one broad river of light climbs out of the horizon. The galactic
 * core sits a few degrees up, right of the text pill, so the ground cuts its
 * lower lobes and it reads as a bulge of the band, not a closed oval. A few
 * short dust lanes (the Great Rift, a dark tongue reaching into the bulge, two
 * detached patches) break the band into uneven clouds; they never run abreast.
 * The quiet sky is the point: no moon, no meteor, no cabin.
 *
 * World: the sky is a sphere at infinity. The band is a galactic frame — the
 * core direction C, the band tangent T and the galactic pole P — placed in the
 * horizon frame, so every puff of light, every dust lane and every star has a
 * true direction (l, b). Brightness is a model on the sphere: a Gaussian disc
 * whose scale height and brightness wander slowly with l, a bulge around
 * l = 0, clumped star clouds from 2-D noise, and a dust transmission field.
 * The ground is a near-flat height field (swells 0.1–0.6, a very low far
 * ridge from z 180 to 400), rendered with `terrainSlices`.
 *
 * Camera: eye 1.7. The sky goes through a cylindrical (panorama) lens —
 * x ∝ azimuth, y Mercator in altitude (conformal) — which turns the great circle into the
 * gentle arc of a photographic panorama; the ground goes through the pinhole
 * `project` of scene3d. Both share the horizon line and the focal length,
 * and the ground is so flat that the two lenses cannot be told apart there.
 * Horizon 0.86 / 0.85 / 0.85 (monitor / tablet / mobile), focal 0.9 H on the
 * landscape frames and W / 1.5 on mobile. Per platform only the heading and
 * the time of night differ: the core always lands at 0.39–0.40 W, and the
 * band is steeper in the portrait frame, so it climbs up the phone.
 *
 * Light: no directional light in the sky. Band and stars are dimmed by the
 * airmass of their own ray, T = e^(−k(X−1)) with the Kasten–Young X(alt),
 * and warm slightly toward the horizon — the extinction is derived, not
 * painted. The sky background is airglow: van Rhijn brightening toward the
 * horizon times the same extinction, plus a few irregular pools. The plain is
 * lit only by the sky: faces turned toward the core take a little more light.
 *
 * Atmosphere: haze = airglow, visibility 300, max 0.3 — the far ridge stays a
 * darker silhouette than the sky behind it.
 *
 * Band raster (review 3D1-01): the band is ~2,100 soft gradient puffs, up to
 * ~98 deep at the core. Chromium dithers each gradient with the same
 * screen-aligned 2 px checker, so the stack summed into a regular half-tone
 * hatch (hf std 6.08 at 6x vs ~1 for the open sky). The whole puff group sits
 * under one feGaussianBlur of σ = 8 user units, region-restricted to the sky:
 * that is ≥ 1 device px even on the 1/6-scale thumbnails, which removes the
 * checker, and it leaves the colour means unchanged. Stars, star-dust and
 * dust lanes are separate layers and stay sharp. Cutting the puff count far
 * enough instead (≈8×) made the band blotchy, and low-alpha flat fills shifted
 * its hue in 8-bit, so the blur is the chosen fix. Renderers that drop
 * filters show the band unblurred (and, if they do not dither, unhatched).
 *
 * Personal touch: one faint emission knot inside the band near the core, and
 * the plain's swells catch the core's faint light on their facing side.
 */
import { mergeBricks } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";
import { type Camera, terrainSlices, type V3, valueNoise2D } from "./scene3d.js";
import {
  fbm1D,
  grainBrick,
  keepLightness,
  lightness,
  mix,
  n,
  rngFrom,
  shade,
  tone,
} from "./shared.js";

const DEG = Math.PI / 180;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a: V3): V3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Direction from azimuth (right of the view axis) and altitude, radians. */
const dirOf = (az: number, alt: number): V3 => [
  Math.cos(alt) * Math.sin(az),
  Math.sin(alt),
  Math.cos(alt) * Math.cos(az),
];

/** Box–Muller normal sample from a private stream. */
function gauss(rng: () => number): number {
  const u = Math.max(1e-6, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Kasten–Young relative airmass for an altitude in degrees (clamped at the horizon). */
function airmass(altDeg: number): number {
  const a = Math.max(0, altDeg);
  return 1 / (Math.sin(a * DEG) + 0.50572 * (a + 6.07995) ** -1.6364);
}

/** A unit-circle puff gradient: soft Gaussian-like falloff, no rim. */
function puffGrad(id: string, color: string): string {
  return `<radialGradient id="${id}g">
  <stop offset="0" stop-color="${color}"/>
  <stop offset=".25" stop-color="${color}" stop-opacity=".78"/>
  <stop offset=".5" stop-color="${color}" stop-opacity=".37"/>
  <stop offset=".75" stop-color="${color}" stop-opacity=".1"/>
  <stop offset="1" stop-color="${color}" stop-opacity="0"/>
</radialGradient>
<circle id="${id}" r="1" fill="url(#${id}g)"/>`;
}

/** Per-platform camera: horizon, focal, core position and band ascent at the core. */
function cameraFor(p: BrickParams) {
  const { width: W, height: H } = p.viewBox;
  const portrait = H > W;
  if (portrait) return { horizon: 0.85, focal: W / 1.5, coreX: 0.4, ascent: 86 };
  if (W / H < 1.5) return { horizon: 0.85, focal: 0.9 * H, coreX: 0.4, ascent: 50 };
  return { horizon: 0.86, focal: 0.9 * H, coreX: 0.39, ascent: 48 };
}

export function nebulaNightMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-nebula-night-${part}`);
  // Point sizes (px) follow the frame's long edge, so a star is a point on
  // every platform.
  const px = Math.max(W, H) / 3840;

  // ── Value plan. Hue follows the palette; lightness is guarded per role so
  //    the core stays the brightest diffuse light and the plain stays black.
  const bgL = lightness(c.bg);
  const night = shade(c.bg, 0.7); // zenith
  const bandCool = keepLightness(tone(mix(c.variables, c.accent, 0.45), 0.4), 0.76, 0.86);
  const core = keepLightness(tone(c.types, 0.38), 0.8, 0.88);
  const nebula = keepLightness(tone(c.constants, 0.5), 0.6, 0.72); // the emission knot
  const starTint = keepLightness(mix(bandCool, core, 0.25), 0.88, 0.97);
  const airglow = keepLightness(mix(c.bg, bandCool, 0.12), bgL + 0.035, bgL + 0.07);
  const glowTint = keepLightness(mix(airglow, bandCool, 0.35), bgL + 0.05, bgL + 0.11);
  // Band colour ramp, cool disc (0) → warm core (1).
  const ramp = [0, 0.25, 0.5, 0.75, 1].map(t => mix(bandCool, core, t));
  // Ground: sky-lit only; far ground fades into the airglow, never past it.
  const groundShadow = keepLightness(shade(c.bg, 0.55), bgL * 0.45, bgL * 0.6);
  const groundLit = keepLightness(mix(c.bg, ramp[2], 0.14), bgL * 0.85, bgL * 1.05);
  const groundHaze = keepLightness(mix(c.bg, airglow, 0.5), bgL * 0.95, bgL + 0.025);

  // ── Camera and sky lens ─────────────────────────────────────────────────────
  const cf = cameraFor(p);
  const f = cf.focal;
  const horizonY = cf.horizon * H;
  const cam: Camera = { W, H, horizon: cf.horizon, eye: 1.7, focal: f };
  /** Cylindrical panorama lens: x ∝ azimuth, y ∝ tan(altitude). */
  const sky = (d: V3) => {
    const az = Math.atan2(d[0], d[2]);
    const alt = Math.asin(Math.max(-1, Math.min(1, d[1])));
    return {
      x: W * 0.5 + f * az,
      // Mercator in altitude: conformal, so a small sky disc stays round
      // (only scaled by sec(alt)) instead of smearing into vertical streaks.
      y: horizonY - f * Math.asinh(Math.tan(Math.min(alt, 84 * DEG))),
      alt: alt / DEG,
    };
  };
  /** Altitude (deg) of the ray through screen row y. */
  const altAtY = (y: number) => Math.atan(Math.sinh((horizonY - y) / f)) / DEG;
  const yAtAlt = (altDeg: number) => horizonY - f * Math.asinh(Math.tan(altDeg * DEG));
  const azMin = -W / 2 / f;
  const azMax = W / 2 / f;
  const altTop = altAtY(0);

  // ── Airmass extinction (stars and band) and the airglow profile (sky) ───────
  const K_EXT = 0.1;
  const tAir = (altDeg: number) => (altDeg < -1 ? 0 : Math.exp(-K_EXT * (airmass(altDeg) - 1)));
  // van Rhijn: a thin emitting shell at 90 km is seen through a longer path
  // near the horizon; the scattering loss is smaller than for point sources.
  const vanRhijn = (altDeg: number) => {
    const r = 6371 / (6371 + 90);
    const ca = Math.cos(Math.max(0, altDeg) * DEG);
    return 1 / Math.sqrt(1 - r * r * ca * ca);
  };
  const glowRaw = (altDeg: number) => vanRhijn(altDeg) * Math.exp(-0.012 * (airmass(altDeg) - 1));
  let glowMax = 0;
  for (let a = 0; a <= 40; a += 0.5) glowMax = Math.max(glowMax, glowRaw(a));
  const glowAt = (altDeg: number) => (glowRaw(altDeg) - 1) / (glowMax - 1); // 0 zenith … 1 peak
  const skyAt = (altDeg: number) => {
    const g = clamp01(glowAt(altDeg));
    return mix(mix(night, c.bg, clamp01(g * 0.9)), airglow, g ** 2.6);
  };

  // ── Galactic frame on the sphere ────────────────────────────────────────────
  const azC = (cf.coreX - 0.5) * (W / f);
  const altC = 5 * DEG;
  const C = dirOf(azC, altC);
  const east: V3 = [Math.cos(azC), 0, -Math.sin(azC)];
  const up: V3 = [-Math.sin(altC) * Math.sin(azC), Math.cos(altC), -Math.sin(altC) * Math.cos(azC)];
  const T = unit(add(scale(east, Math.cos(cf.ascent * DEG)), up, Math.sin(cf.ascent * DEG)));
  const P = unit(cross(C, T));
  /** Direction of galactic (l, b) in degrees. */
  const galDir = (l: number, b: number): V3 => {
    const cl = Math.cos(l * DEG);
    const sl = Math.sin(l * DEG);
    const cb = Math.cos(b * DEG);
    return unit(add(scale(add(scale(C, cl), T, sl), cb), P, Math.sin(b * DEG)));
  };

  // ── Band model in (l, b), degrees ──────────────────────────────────────────
  const bandRng = key("band");
  const warp = fbm1D(bandRng, 3);
  const heightN = fbm1D(bandRng, 3);
  const brightN = fbm1D(bandRng, 3);
  const cloudN = valueNoise2D(bandRng, 64);
  const cloudN2 = valueNoise2D(bandRng, 64);
  /** Centre line: a slow warp of a degree or so, so the band is never ruler-straight. */
  const b0 = (l: number) => 1.1 * warp(l / 24 + 3) + 0.6 * smooth(-10, 10, l);
  const sigma = (l: number) =>
    (4.4 + 1.3 * heightN(l / 20 + 7)) * (1 + 0.3 * Math.exp(-((l / 20) ** 2)));
  const clumps = (l: number, b: number) => {
    const v = 0.5 + 0.35 * cloudN(l / 7 + 11, b / 3.5 + 5) + 0.15 * cloudN2(l / 2.6, b / 1.6);
    return clamp01(v) ** 1.5;
  };
  const disc = (l: number, b: number) => {
    const d = (b - b0(l)) / sigma(l);
    const amp = (0.55 + 0.45 * Math.exp(-((l / 38) ** 2))) * (0.8 + 0.3 * brightN(l / 15 + 2));
    // Gaussian body plus a faint exponential wing (the unresolved outer glow).
    return amp * (Math.exp(-0.5 * d * d) + 0.18 * Math.exp(-Math.abs(d) / 1.6));
  };
  const bulge = (l: number, b: number) =>
    2.3 * Math.exp(-0.5 * ((l / 7.5) ** 2 + ((b - b0(0) + 0.6) / 5.2) ** 2));

  // Dust: a few short lanes, each on its own course across the band, plus a
  // fine mottling. Lanes are interrupted by their own 1-D gate noise and their
  // edges are roughened by 2-D noise, so none reads as a drawn line.
  interface Lane {
    l0: number;
    l1: number;
    bA: number; // offset from the centre line at l0, in degrees
    bB: number; // … and at l1
    w: number; // half-thickness, degrees
    k: number; // strength
    ph: number;
  }
  const lanes: Lane[] = [
    // The Great Rift: leaves the bulge above the centre line and crosses the
    // band slowly, so it never runs parallel to the band's edges.
    { l0: -2, l1: 52, bA: 1.6, bB: -1.4, w: 1.5, k: 0.92, ph: 3 },
    // A dark tongue reaching into the bulge from above, at an angle.
    { l0: -9, l1: -1, bA: 7, bB: 2.4, w: 0.85, k: 0.7, ph: 17 },
    // Detached patches further up, on alternating sides.
    { l0: 60, l1: 71, bA: -2.6, bB: -1.2, w: 0.9, k: 0.6, ph: 29 },
    { l0: 80, l1: 92, bA: 2.2, bB: 0.8, w: 0.8, k: 0.5, ph: 41 },
  ];
  const dRng = key("dust");
  const gate = fbm1D(dRng, 3);
  const girth = fbm1D(dRng, 3);
  const rough = valueNoise2D(dRng, 64);
  const mottle = valueNoise2D(dRng, 64);
  const dustAt = (l: number, b: number) => {
    let d = 0;
    const bc = b - b0(l);
    for (const ln of lanes) {
      if (l < ln.l0 - 3 || l > ln.l1 + 3) continue;
      const t = (l - ln.l0) / (ln.l1 - ln.l0);
      const taper = smooth(-0.05, 0.25, t) * smooth(1.05, 0.7, t);
      const centre = ln.bA + (ln.bB - ln.bA) * t + 0.5 * gate(l / 6 + ln.ph);
      const w = ln.w * (0.6 + 0.8 * (0.5 + 0.5 * girth(l / 5 + ln.ph))) * (0.5 + 0.5 * taper);
      const open = smooth(0.15, 0.45, 0.5 + 0.5 * gate(l / 3.2 + ln.ph * 2));
      const edge = 0.75 + 0.5 * rough(l / 1.4 + ln.ph, b / 1.1);
      const dd = (bc - centre) / w;
      d = Math.max(d, ln.k * taper * open * clamp01(Math.exp(-0.5 * dd * dd) * edge));
    }
    // Fine mottling inside the band body only.
    const m = smooth(0.58, 0.8, 0.5 + 0.5 * mottle(l / 2.2 + 9, b / 1.5 + 4));
    d = Math.max(d, 0.4 * m * Math.exp(-0.5 * (bc / (1.4 * sigma(l))) ** 2));
    return clamp01(d);
  };
  const tDust = (l: number, b: number) => 1 - 0.88 * dustAt(l, b);
  /** Band emission before the atmosphere (dust included) and its warm share. */
  const emission = (l: number, b: number) => {
    const dc = disc(l, b) * (0.45 + 1.1 * clumps(l, b));
    const bu = bulge(l, b);
    return { I: (dc + bu) * tDust(l, b), raw: dc + bu, warm: bu / (dc + bu + 1e-6) };
  };

  // Local screen frame of a direction: the projected centre and the screen
  // vectors (px per radian) along l and along b. A unit circle mapped through
  // this affine frame is the true projected shape of a small sky disc.
  const frameAt = (l: number, b: number) => {
    const d = galDir(l, b);
    const q = sky(d);
    const eps = 0.002;
    const ql = sky(galDir(l + eps / DEG, b));
    const qb = sky(galDir(l, b + eps / DEG));
    return {
      q,
      ul: { x: (ql.x - q.x) / eps, y: (ql.y - q.y) / eps },
      ub: { x: (qb.x - q.x) / eps, y: (qb.y - q.y) / eps },
    };
  };
  /** `<use>` of a unit puff as an ellipse on the sphere (radii in degrees). */
  const puff = (
    ref: string,
    l: number,
    b: number,
    rl: number,
    rb: number,
    rot: number,
    op: number
  ): string => {
    const { q, ul, ub } = frameAt(l, b);
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const A = { x: (ul.x * cr + ub.x * sr) * rl * DEG, y: (ul.y * cr + ub.y * sr) * rl * DEG };
    const B = { x: (-ul.x * sr + ub.x * cr) * rb * DEG, y: (-ul.y * sr + ub.y * cr) * rb * DEG };
    const R = Math.max(Math.hypot(A.x, A.y), Math.hypot(B.x, B.y));
    if (q.x < -R || q.x > W + R || q.y < -R || q.y > horizonY + R) return "";
    return `<use href="#${ref}" transform="matrix(${n(A.x)} ${n(A.y)} ${n(B.x)} ${n(B.y)} ${n(q.x)} ${n(q.y)})" opacity="${n(Math.min(1, op), 3)}"/>`;
  };

  // Sky window in galactic longitude: sample a margin around what the frame sees.
  const L_MIN = -40;
  const L_MAX = 115;

  const layers: BrickOutput[] = [];

  // ── Sky: airglow profile from the formula, sampled at fixed altitudes ───────
  const alts = [0, 0.5, 1, 2, 3, 4.5, 6, 8, 11, 15, 20, 27, 35, 45, 58, 72, 80].filter(
    a => a <= altTop + 8
  );
  const stops = alts
    .map(a => ({ off: clamp01(yAtAlt(a) / H), col: skyAt(a) }))
    .sort((a, b) => a.off - b.off);
  layers.push({
    defs: `<linearGradient id="na-sky" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
${stops.map(s => `  <stop offset="${n(s.off, 4)}" stop-color="${s.col}"/>`).join("\n")}
  <stop offset="1" stop-color="${skyAt(0)}"/>
</linearGradient>
<radialGradient id="na-pool">
  <stop offset="0" stop-color="${glowTint}" stop-opacity="1"/>
  <stop offset=".45" stop-color="${glowTint}" stop-opacity=".45"/>
  <stop offset=".78" stop-color="${glowTint}" stop-opacity=".1"/>
  <stop offset="1" stop-color="${glowTint}" stop-opacity="0"/>
</radialGradient>
${ramp.map((col, i) => puffGrad(`na-b${i}`, col)).join("\n")}
${puffGrad("na-e", nebula)}`,
    elements: `<rect width="${W}" height="${H}" fill="url(#na-sky)"/>`,
  });

  // Airglow pools: three irregular, edge-free pools on the horizon, unequal in
  // reach and strength (azimuth-fixed, so they belong to the sky, not the frame).
  const agRng = key("airglow");
  const pools = [
    [-0.55, 26, 3.2, 0.42],
    [0.05, 18, 2.2, 0.22],
    [0.6, 22, 2.8, 0.32],
  ].map(([az, rx, ry, op]) => {
    const x = W * 0.5 + f * (az + (agRng() - 0.5) * 0.12);
    const rxp = f * rx * DEG * (0.85 + 0.3 * agRng());
    const ryp = f * ry * DEG * (0.85 + 0.3 * agRng());
    return `<ellipse cx="${n(x)}" cy="${n(horizonY)}" rx="${n(rxp)}" ry="${n(ryp)}" fill="url(#na-pool)" opacity="${n(op * (0.9 + 0.2 * agRng()), 3)}"/>`;
  });
  layers.push({ elements: `<g>${pools.join("")}</g>` });

  // ── Band light: puffs on the sphere at four scales ─────────────────────────
  // Each level places its puffs with a probability ∝ the model's emission (so
  // density carries the brightness and the clumps), and dims each by the
  // airmass of its own ray. Colour comes from the warm share: the bulge, and
  // the reddening of a long path near the horizon.
  const rampRef = (warm: number, alt: number) =>
    `na-b${Math.round(4 * clamp01(Math.max(warm * 1.3, 0.75 * (1 - tAir(alt)))))}`;
  const IMAX = 2.6;
  const levels = [
    // count, radius (deg), elongation along l, base opacity, emission exponent, b spread (σ)
    { tag: "halo", count: 260, r: 10, el: 1.6, op: 0.022, ex: 0.7, spread: 2.2 },
    { tag: "body", count: 1600, r: 4.2, el: 1.7, op: 0.028, ex: 1, spread: 1.7 },
    { tag: "cloud", count: 6000, r: 1.7, el: 1.5, op: 0.04, ex: 1.25, spread: 1.4 },
    { tag: "grain", count: 16000, r: 0.6, el: 1.3, op: 0.055, ex: 1.6, spread: 1.2 },
  ];
  const band: string[] = [];
  for (const lv of levels) {
    const rng = key(`puffs-${lv.tag}`);
    for (let i = 0; i < lv.count; i++) {
      const l = L_MIN + rng() * (L_MAX - L_MIN);
      const b = b0(l) + gauss(rng) * sigma(l) * lv.spread * 0.6;
      const e = emission(l, b);
      const accept = clamp01((lv.tag === "halo" ? e.raw : e.I) / IMAX) ** lv.ex;
      const roll = rng();
      // Log-uniform size (×0.55 … ×1.8), so no single puff size dominates.
      const size = 0.55 * 3.3 ** rng();
      const rot = (rng() - 0.5) * 0.7;
      if (roll > accept) continue;
      const alt = sky(galDir(l, b)).alt;
      const op = lv.op * tAir(alt);
      if (op < 0.004) continue;
      const r = lv.r * size;
      band.push(puff(rampRef(e.warm, alt), l, b, r * lv.el, r, rot, op));
    }
  }
  // The emission knot: a small, faint tinted nebula just off the core.
  const kRng = key("knot");
  const kl = 5.5 + kRng() * 3;
  const kb = b0(kl) - 1.2 - kRng();
  for (let i = 0; i < 6; i++) {
    const l = kl + gauss(kRng) * 0.5;
    const b = kb + gauss(kRng) * 0.35;
    const alt = sky(galDir(l, b)).alt;
    band.push(
      puff("na-e", l, b, 0.7 + 0.5 * kRng(), 0.5 + 0.4 * kRng(), kRng() * 3, 0.16 * tAir(alt))
    );
  }
  // One region-restricted blur over the whole puff stack (review 3D1-01).
  // Chromium dithers every radial gradient with a screen-aligned 2 px
  // checker; up to ~98 puffs overlap at the core, so the dither adds up
  // coherently into a visible half-tone hatch. A Gaussian of ≥ 1 device px
  // removes that checker; below ~1 px Chromium leaves it untouched. The
  // smallest shipped raster is the 1/6-scale thumbnail, so σ = 8 user units
  // (1.3 px there, 4 px on the 1x PNGs, 8 px at native 4K) — invisible on
  // puffs whose smallest radius is ~19 units. The region overhangs the
  // frame by 4σ so the band's exits at the frame edges are not darkened.
  const SOFT = 8;
  layers.push({
    defs: `<filter id="na-soft" filterUnits="userSpaceOnUse" x="${-4 * SOFT}" y="${-4 * SOFT}" width="${W + 8 * SOFT}" height="${n(horizonY + 8 * SOFT)}" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${SOFT}"/></filter>`,
    elements: `<g id="na-band" filter="url(#na-soft)">${band.join("")}</g>`,
  });

  // ── Unresolved star-dust: tiny dots ∝ emission, thinned by dust ────────────
  const sdRng = key("star-dust");
  const dustDots: string[] = [];
  for (let i = 0; i < 60000 && dustDots.length < 7000; i++) {
    const l = L_MIN + sdRng() * (L_MAX - L_MIN);
    const b = b0(l) + gauss(sdRng) * sigma(l) * 1.1;
    const e = emission(l, b);
    const roll = sdRng();
    const m = sdRng();
    if (roll > clamp01(e.I / 1.4)) continue;
    const q = sky(galDir(l, b));
    if (q.x < 0 || q.x > W || q.y < 0 || q.y > horizonY) continue;
    const a = (0.16 + 0.24 * m) * tAir(q.alt);
    if (a < 0.03) continue;
    dustDots.push(
      `<circle cx="${n(q.x)}" cy="${n(q.y)}" r="${n((0.55 + 0.45 * m) * px * 1.15, 2)}" opacity="${n(a, 2)}"/>`
    );
  }
  layers.push({ elements: `<g fill="${starTint}">${dustDots.join("")}</g>` });

  // ── Dust on top: sky-coloured puffs where a lane crosses band light ────────
  // A dust puff takes the colour of the sky at its altitude, so it only ever
  // removes band light; it is drawn only where there is light behind it.
  const dustBins = [2, 6, 12, 22, 40];
  const dustRef = (alt: number) => {
    let i = 0;
    while (i < dustBins.length - 1 && alt > (dustBins[i] + dustBins[i + 1]) / 2) i++;
    return i;
  };
  const dustDefs = dustBins.map((a, i) => {
    const col = mix(skyAt(a), night, 0.25);
    return `<radialGradient id="na-d${i}g">
  <stop offset="0" stop-color="${col}"/>
  <stop offset=".3" stop-color="${col}" stop-opacity=".7"/>
  <stop offset=".6" stop-color="${col}" stop-opacity=".25"/>
  <stop offset="1" stop-color="${col}" stop-opacity="0"/>
</radialGradient>
<circle id="na-d${i}" r="1" fill="url(#na-d${i}g)"/>`;
  });
  const dkRng = key("dust-puffs");
  const dark: string[] = [];
  for (let i = 0; i < 50000 && dark.length < 4200; i++) {
    const l = L_MIN + dkRng() * (L_MAX - L_MIN);
    const b = b0(l) + gauss(dkRng) * sigma(l) * 0.9;
    const d = dustAt(l, b);
    const roll = dkRng();
    const size = 0.25 + 0.45 * dkRng();
    // Dust filaments lie along the galactic plane: elongated along l, tilted a little.
    const rot = (dkRng() - 0.5) * 0.5;
    if (roll > d) continue;
    const behind = clamp01(emission(l, b).raw / 1.6);
    const alt = sky(galDir(l, b)).alt;
    const op = 0.36 * d * behind * (0.35 + 0.65 * tAir(alt));
    if (op < 0.01) continue;
    dark.push(puff(`na-d${dustRef(alt)}`, l, b, size * 2.3, size, rot, op));
  }
  layers.push({ defs: dustDefs.join("\n"), elements: `<g id="na-dust">${dark.join("")}</g>` });

  // ── Stars: uniform on the visible sphere cap, plus a share ∝ band emission ─
  // Brightness follows a power law and the airmass of the star's own ray;
  // dust thins the band stars it covers.
  const tints = [starTint, mix(bandCool, c.variables, 0.3), mix(core, starTint, 0.5)].map(t =>
    keepLightness(t, 0.8, 0.97)
  );
  const stRng = key("stars");
  const dots: string[] = [];
  const halos: string[] = [];
  const emit = (q: { x: number; y: number; alt: number }, mag: number, dim: number) => {
    if (q.x < 0 || q.x > W || q.y < 0 || q.y > horizonY + 2) return;
    const a = (0.22 + 0.72 * mag) * tAir(q.alt) * dim;
    if (a < 0.06) return;
    const r = (0.7 + mag * 2.4) * px * 1.1;
    if (mag > 0.6) {
      dots.push(
        `<circle cx="${n(q.x)}" cy="${n(q.y)}" r="${n(r * 1.7, 2)}" fill="url(#na-sc)" opacity="${n(a, 2)}"/>`
      );
      halos.push(
        `<circle cx="${n(q.x)}" cy="${n(q.y)}" r="${n(r * 6)}" fill="url(#na-sh)" opacity="${n(a, 2)}"/>`
      );
    } else {
      const tint = tints[Math.floor(stRng() * tints.length)];
      dots.push(
        `<circle cx="${n(q.x)}" cy="${n(q.y)}" r="${n(r, 2)}" fill="${tint}" opacity="${n(a, 2)}"/>`
      );
    }
  };
  // Field stars: density per steradian, so the count follows the solid angle.
  const sinTop = Math.sin(Math.min(85, altTop + 2) * DEG);
  const solid = (azMax - azMin) * sinTop;
  const nField = Math.round(700 * solid);
  for (let i = 0; i < nField; i++) {
    const az = azMin + stRng() * (azMax - azMin);
    const alt = Math.asin(stRng() * sinTop);
    const mag = stRng() ** 4.2;
    emit(sky(dirOf(az, alt)), mag, 1);
  }
  // Band stars: accepted ∝ emission, thinned by dust.
  for (let i = 0, placed = 0; i < 12000 && placed < 1100; i++) {
    const l = L_MIN + stRng() * (L_MAX - L_MIN);
    const b = b0(l) + gauss(stRng) * sigma(l) * 0.9;
    const e = emission(l, b);
    const roll = stRng();
    const mag = stRng() ** 4.6;
    if (roll > clamp01(e.raw / IMAX)) continue;
    placed++;
    emit(sky(galDir(l, b)), mag, 0.25 + 0.75 * tDust(l, b));
  }
  layers.push({
    defs: `<radialGradient id="na-sh">
  <stop offset="0" stop-color="${tints[0]}" stop-opacity=".5"/>
  <stop offset=".06" stop-color="${tints[0]}" stop-opacity=".26"/>
  <stop offset=".14" stop-color="${tints[0]}" stop-opacity=".1"/>
  <stop offset=".3" stop-color="${tints[0]}" stop-opacity=".035"/>
  <stop offset=".6" stop-color="${tints[0]}" stop-opacity=".008"/>
  <stop offset="1" stop-color="${tints[0]}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="na-sc">
  <stop offset="0" stop-color="${tints[0]}"/>
  <stop offset=".45" stop-color="${tints[0]}" stop-opacity=".85"/>
  <stop offset="1" stop-color="${tints[0]}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<g id="na-st">${halos.join("")}${dots.join("")}</g>`,
  });

  // ── The plain: one near-flat height field, swells near, a low ridge far ────
  const gRng = key("plain");
  const swellA = valueNoise2D(gRng, 64);
  const swellB = valueNoise2D(gRng, 64);
  const ridgeN = valueNoise2D(gRng, 64);
  const ridgeN2 = valueNoise2D(gRng, 64);
  const height = (x: number, z: number) => {
    // The fine octave fades out with distance: beyond z ≈ 40 its wavelength is
    // shorter than a slice band and would alias into horizontal streaks.
    const near =
      0.55 * swellA(x * 0.03 + 7, z * 0.03) +
      0.12 * smooth(45, 15, z) * swellB(x * 0.11, z * 0.11 + 3);
    // The far ridge rises over z 180–400: two or three broad, unequal hills
    // along x, never below a low base, so the sky never shows under it.
    const rise = smooth(170, 400, z);
    const hills = 0.5 + 0.5 * ridgeN(x * 0.0045 + 3, z * 0.004);
    const ridge = rise * (3 + 9 * hills ** 1.6 + 1.6 * ridgeN2(x * 0.02, z * 0.02));
    return near * (1 - 0.6 * rise) + ridge;
  };
  // Sky ambient only: the light vector points at the core's part of the sky,
  // low and to the left, so a swell facing the band takes a little more light.
  const coreLight: V3 = dirOf(azC, 14 * DEG);
  const zBottom = (f * cam.eye) / (H - horizonY);
  const terrain = terrainSlices({
    id: "na-t",
    cam,
    atm: { haze: groundHaze, visibility: 300, max: 0.3 },
    height,
    light: coreLight,
    zNear: zBottom * 0.8,
    zFar: 400,
    candidates: 2400,
    maxBand: z => (z < 40 ? 6 : 3),
    samples: 320,
    tolerance: 0.012,
    surface: lam => mix(groundShadow, groundLit, smooth(0.2, 0.29, lam)),
  });
  layers.push(terrain);

  // ── Grain: breaks banding in the very dark sky ───────────────────────────
  layers.push(grainBrick("na-grain", W, H, bandCool, 0.02));

  return mergeBricks(layers);
}

export function composeNebulaNight(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(nebulaNightMotif(p), p);
}
