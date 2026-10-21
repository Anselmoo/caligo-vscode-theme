/**
 * Shared primitives for scene motifs (spike).
 *
 * Every colour is derived from the theme palette — darks and highlights are
 * produced by mixing palette roles in OKLab, never by literal hex values.
 * Nothing here uses full-canvas filters: depth comes from gradients and
 * layered paths, and the only noise is a small stitched grain tile.
 */
import { clampChroma, converter, formatHex, oklch } from "culori";
import type { BrickOutput } from "../types.js";

// ─── Determinism ─────────────────────────────────────────────────────────────

export function hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** mulberry32 — same generator the bricks use. */
export function rngFrom(key: string): () => number {
  let s = hashStr(key);
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Smooth 1-D value noise in [-1, 1], sampled at arbitrary x (lattice spacing 1). */
export function valueNoise1D(rng: () => number, lattice = 64): (x: number) => number {
  const v = Array.from({ length: lattice + 1 }, () => rng() * 2 - 1);
  // Close the loop: the last lattice value must equal the first, or the
  // noise jumps at every multiple of `lattice` (a visible seam). The extra
  // draw is kept so the rng sequence — and every stream after it — is unchanged.
  v[lattice] = v[0];
  return (x: number) => {
    const xi = ((Math.floor(x) % lattice) + lattice) % lattice;
    const f = x - Math.floor(x);
    const s = f * f * (3 - 2 * f);
    return v[xi] * (1 - s) + v[xi + 1] * s;
  };
}

/** Fractal sum of value noise, normalised to roughly [-1, 1]. */
export function fbm1D(rng: () => number, octaves: number): (x: number) => number {
  const layers = Array.from({ length: octaves }, () => valueNoise1D(rng));
  return (x: number) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += layers[i](x * 2 ** i) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

// ─── Colour ──────────────────────────────────────────────────────────────────

type Lab = { l: number; a: number; b: number };
const toOklab = converter("oklab") as (c: string) => Lab | undefined;

// The 3D scenes call mix() millions of times per wallpaper (every visible
// sample of every depth slice). Parsing the hex strings and walking culori's
// converter graph each time dominated the compose time, so the OKLab value of
// each colour string is cached and the way back to hex is inlined below with
// culori's exact constants and rounding: the output is byte-identical.
const labCache = new Map<string, Lab | undefined>();
function labOf(c: string): Lab | undefined {
  let v = labCache.get(c);
  if (v === undefined && !labCache.has(c)) {
    v = toOklab(c);
    labCache.set(c, v);
  }
  return v;
}

/** sRGB gamma, as culori's convertLrgbToRgb. */
const gamma = (c: number) => {
  const abs = Math.abs(c);
  return abs > 0.0031308 ? (Math.sign(c) || 1) * (1.055 * abs ** (1 / 2.4) - 0.055) : c * 12.92;
};
/** 0–1 channel to two hex digits, as culori's formatHex (clamp, round). */
const hex2 = (v: number) =>
  Math.round(Math.max(0, Math.min(1, v || 0)) * 255)
    .toString(16)
    .padStart(2, "0");

/** OKLab → "#rrggbb", identical to culori's formatHex({ mode: "oklab", … }). */
function oklabHex(l: number, a: number, b: number): string {
  const L = (l + 0.3963377773761749 * a + 0.2158037573099136 * b) ** 3;
  const M = (l - 0.1055613458156586 * a - 0.0638541728258133 * b) ** 3;
  const S = (l - 0.0894841775298119 * a - 1.2914855480194092 * b) ** 3;
  const r = 4.0767416360759574 * L - 3.3077115392580616 * M + 0.2309699031821044 * S;
  const g = -1.2684379732850317 * L + 2.6097573492876887 * M - 0.3413193760026573 * S;
  const bl = -0.0041960761386756 * L - 0.7034186179359362 * M + 1.7076146940746117 * S;
  return `#${hex2(gamma(r))}${hex2(gamma(g))}${hex2(gamma(bl))}`;
}

/** Perceptual distance of two colours (Euclidean in OKLab, cached parse). */
export function colourDistance(a: string, b: string): number {
  const p = labOf(a);
  const q = labOf(b);
  if (!p || !q) return 0;
  return Math.hypot(p.l - q.l, p.a - q.a, p.b - q.b);
}

/** Mix two palette colours in OKLab; t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const p = labOf(a);
  const q = labOf(b);
  if (!p || !q) return a;
  const k = Math.min(1, Math.max(0, t));
  return oklabHex(p.l + (q.l - p.l) * k, p.a + (q.a - p.a) * k, p.b + (q.b - p.b) * k);
}

/** Scale a palette colour's OKLCH lightness (k < 1 darkens) — a palette-derived deep tone. */
export function shade(c: string, k: number): string {
  const o = oklch(c);
  if (!o) return c;
  return formatHex({ ...o, l: Math.min(1, o.l * k) });
}

/** OKLCH lightness of a palette colour (0–1). */
export function lightness(c: string): number {
  return oklch(c)?.l ?? 0;
}

/**
 * Value guard: hue and chroma follow the palette freely (a pink desert in
 * another harmony mode is intended), but lightness is clamped to the band the
 * role needs — a moon must stay brighter than the sky, sand must stay a
 * mid-tone — so the scene's value structure survives every mode.
 */
export function keepLightness(c: string, minL: number, maxL: number): string {
  const o = oklch(c);
  if (!o) return c;
  const l = Math.min(maxL, Math.max(minL, o.l));
  return formatHex(clampChroma({ ...o, l }, "oklch"));
}

/** Scale a palette colour's OKLCH chroma (0 = grey of the same lightness). */
export function tone(c: string, cScale: number): string {
  const o = oklch(c);
  if (!o) return c;
  return formatHex(clampChroma({ ...o, c: o.c * cScale }, "oklch"));
}

/** The lightest of the given palette colours. */
export function palest(cs: string[]): string {
  return cs.reduce((a, b) => (lightness(b) > lightness(a) ? b : a));
}

/** Number formatting that keeps the SVG compact and byte-stable. */
export const n = (v: number, d = 1) => Number(v.toFixed(d)).toString();

/**
 * Smooth open path through points (Catmull-Rom → cubic Bézier). Use this for
 * every organic outline: a polyline through noisy samples shows a hard kink at
 * each vertex, which is what makes procedural silhouettes look synthetic.
 */
export function smoothPath(pts: Array<{ x: number; y: number }>): string {
  let d = `M${n(pts[0].x)},${n(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${n(p1.x + (p2.x - p0.x) / 6)},${n(p1.y + (p2.y - p0.y) / 6)} ${n(p2.x - (p3.x - p1.x) / 6)},${n(p2.y - (p3.y - p1.y) / 6)} ${n(p2.x)},${n(p2.y)}`;
  }
  return d;
}

// ─── Shared layers ───────────────────────────────────────────────────────────

/**
 * Film grain on a small stitched tile — breaks 8-bit gradient banding on dark
 * skies. The turbulence runs once on a `tile`-sized region, never full canvas.
 */
export function grainBrick(
  id: string,
  width: number,
  height: number,
  ink: string,
  opacity: number,
  tile = 256
): BrickOutput {
  return {
    defs: `<filter id="${id}-f" filterUnits="userSpaceOnUse" x="0" y="0" width="${tile}" height="${tile}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" result="noise"/>
  <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.6" result="mask"/>
  <feComposite in="SourceGraphic" in2="mask" operator="in"/>
</filter>
<pattern id="${id}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">
  <rect width="${tile}" height="${tile}" fill="${ink}" filter="url(#${id}-f)"/>
</pattern>`,
    elements: `<rect width="${width}" height="${height}" fill="url(#${id})" opacity="${opacity}"/>`,
  };
}

export interface StarFieldOptions {
  id: string;
  width: number;
  /** Stars are placed above this y (px) with density fading toward it. */
  horizonY: number;
  count: number;
  /** Two or three palette colours; stars pick between them. */
  tints: string[];
  /** Optional exclusion disc (e.g. around the moon). */
  avoid?: { cx: number; cy: number; r: number };
  rng: () => number;
}

/**
 * Sparse, physically plausible star field: magnitude follows a power law (many
 * faint, very few bright), density thins toward the horizon (extinction), and
 * only the brightest dozen get a shared soft halo gradient.
 */
export function starField(o: StarFieldOptions): BrickOutput {
  const { id, width, horizonY, count, tints, avoid, rng } = o;
  const haloId = `${id}-halo`;
  const dots: string[] = [];
  const halos: string[] = [];
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 6) {
    const x = rng() * width;
    const yN = rng() ** 1.35; // bias toward the zenith
    const y = yN * horizonY * 0.97;
    // Extinction: reject stars near the horizon more often.
    if (rng() < yN ** 3 * 0.85) continue;
    if (avoid && Math.hypot(x - avoid.cx, y - avoid.cy) < avoid.r) continue;
    const mag = rng() ** 4; // power law: mostly faint
    const r = 0.7 + mag * 2.6;
    const a = 0.22 + mag * 0.7 - yN * 0.15;
    const tint = tints[Math.floor(rng() * tints.length)];
    if (mag > 0.55) {
      // Bright star: soft core + a halo whose falloff approximates a camera
      // PSF (~1/r²) — steep near the centre, no visible plateau or rim.
      dots.push(
        `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.7, 2)}" fill="url(#${id}-core)" opacity="${n(a, 2)}"/>`
      );
      halos.push(
        `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 6)}" fill="url(#${haloId})" opacity="${n(a, 2)}"/>`
      );
    } else {
      dots.push(
        `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r, 2)}" fill="${tint}" opacity="${n(a, 2)}"/>`
      );
    }
    placed++;
  }
  return {
    defs: `<radialGradient id="${haloId}">
  <stop offset="0" stop-color="${tints[0]}" stop-opacity="0.5"/>
  <stop offset="0.06" stop-color="${tints[0]}" stop-opacity="0.26"/>
  <stop offset="0.14" stop-color="${tints[0]}" stop-opacity="0.1"/>
  <stop offset="0.3" stop-color="${tints[0]}" stop-opacity="0.035"/>
  <stop offset="0.6" stop-color="${tints[0]}" stop-opacity="0.008"/>
  <stop offset="1" stop-color="${tints[0]}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="${id}-core">
  <stop offset="0" stop-color="${tints[0]}"/>
  <stop offset="0.45" stop-color="${tints[0]}" stop-opacity="0.85"/>
  <stop offset="1" stop-color="${tints[0]}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<g id="${id}">${halos.join("")}${dots.join("")}</g>`,
  };
}

export interface MoonOptions {
  /** Id prefix — keeps several moons (or scenes) from colliding. */
  pre: string;
  cx: number;
  cy: number;
  r: number;
  /** Terminator crossing on the equator, in units of r: −0.38 ≈ 30 % crescent, +0.6 ≈ 80 % gibbous. */
  terminator: number;
  /** Degrees; the lit limb faces local −x before rotation. */
  rotate: number;
  light: string;
  warm: string;
  dark: string;
  earthshine?: number;
  /** A private stream, so the moon never shifts the rest of the scene. */
  rng: () => number;
}

/**
 * The Moon at "level 3": one albedo group (lit-colour disc, maria in the real
 * near-side layout, craters with shadowed sunward walls and bright far rims,
 * mottling via a turbulence filter restricted to the disc) drawn twice — once
 * through an alpha mask made of the terminator gradient (the lit side) and
 * once faintly as earthshine. The terminator is a circle through the horn
 * tips: outside it is lit for a crescent, inside it for a gibbous moon.
 */
export function moonBrick(o: MoonOptions): BrickOutput {
  const pre = o.pre;
  // Coordinates are fractions of R in the group's local frame (sun at -x).
  const R = o.r;
  const tx = o.terminator * R; // terminator crossing on the equator (< 0 crescent, > 0 gibbous)
  const hx = (tx * tx - R * R) / (2 * tx); // centre of the terminator circle
  const rho = Math.hypot(hx, R);
  const crescent = tx < 0;
  const rg = crescent ? hx + R : rho + R * 0.06; // gradient reach
  const mrng = o.rng;
  // Foreshortening toward the limb (exact on the axes, close enough between).
  const fore = (u: number) => Math.sqrt(Math.max(0.12, 1 - u * u));
  // Lit-band width at (x, y): distance inside the terminator, in units of R.
  const litDepth = (x: number, y: number) =>
    hx / R + (crescent ? -1 : 1) * Math.sqrt((rho / R) ** 2 - y * y) - x;
  const mareTone = mix(o.light, o.dark, 0.34);
  const craterShade = mix(o.light, o.dark, 0.6);
  const craterRim = shade(o.light, 1.12);
  const mottle = mix(o.light, o.dark, 0.45);

  // Maria of the near side (x east→west is −→+, north up): soft, rimless.
  const maria: Array<[number, number, number, number, number]> = [
    // x, y, rx, ry, strength — Procellarum is three lobes so it reads irregular
    [-0.62, -0.1, 0.25, 0.33, 0.9],
    [-0.52, 0.14, 0.2, 0.2, 0.8],
    [-0.74, -0.32, 0.13, 0.15, 0.75],
    [-0.86, 0.06, 0.06, 0.065, 1], // Grimaldi
    [-0.35, -0.35, 0.28, 0.25, 0.9], // Imbrium
    [-0.45, 0.4, 0.11, 0.11, 0.8], // Humorum
    [-0.15, 0.4, 0.18, 0.15, 0.75], // Nubium
    [-0.05, -0.64, 0.32, 0.07, 0.6], // Frigoris
    [0.15, -0.35, 0.17, 0.16, 0.9], // Serenitatis
    [0.3, -0.1, 0.2, 0.18, 0.85], // Tranquillitatis
    [0.5, 0.15, 0.13, 0.15, 0.75], // Fecunditatis
    [0.6, -0.25, 0.1, 0.09, 0.95], // Crisium
  ];
  const mariaEls = maria
    .map(
      ([x, y, rx, ry, s]) =>
        `<ellipse cx="${n(x * R)}" cy="${n(y * R)}" rx="${n(rx * fore(x) * R)}" ry="${n(ry * fore(y) * R)}" fill="url(#${pre}-mare)" opacity="${n(s, 2)}"/>`
    )
    .join("\n");

  // Craters: a few named landmarks plus a power-law scatter weighted toward
  // the lit band. One element each; the shared gradient puts the sunward
  // wall in shadow and a thin bright rim on the far wall.
  const craters: Array<[number, number, number]> = [
    [-0.33, -0.16, 0.055], // Copernicus
    [-0.53, -0.13, 0.034], // Kepler
    [-0.68, -0.4, 0.03], // Aristarchus
    [-0.14, 0.68, 0.05], // Tycho
  ];
  for (let k = 0; k < 16; k++) {
    for (;;) {
      const lit = k < 10;
      const x = lit ? -0.97 + mrng() * (1.03 + o.terminator) : mrng() * 2 - 1;
      const y = mrng() * 2 - 1;
      const r = Math.min(0.11, 0.032 * (1 - mrng()) ** (-1 / 1.7));
      if (Math.hypot(x, y) + r < 0.97) {
        craters.push([x, y, r]);
        break;
      }
    }
  }
  const craterEls = craters
    .map(([x, y, r]) => {
      // Strongest near the terminator (low sun, long shadows), flatter toward
      // the bright limb where the sun stands high.
      const k = Math.min(1, Math.max(0.4, 1 - litDepth(x, y) / 0.75));
      return `<ellipse cx="${n(x * R)}" cy="${n(y * R)}" rx="${n(r * fore(x) * R, 2)}" ry="${n(r * fore(y) * R, 2)}" fill="url(#${pre}-crater)" opacity="${n(k, 2)}"/>`;
    })
    .join("\n");
  // Young ray craters read as small bright splashes, not as holes.
  const rays = craters
    .slice(0, 4)
    .map(
      ([x, y, r]) =>
        `<ellipse cx="${n(x * R)}" cy="${n(y * R)}" rx="${n(r * 2.6 * fore(x) * R)}" ry="${n(r * 2.6 * fore(y) * R)}" fill="url(#${pre}-ray)"/>`
    )
    .join("\n");

  // Crescent: lit = outside the terminator circle (centre on the dark side).
  // Gibbous: lit = inside it (centre on the bright side), soft at its rim.
  const litDefs = crescent
    ? `<radialGradient id="${pre}-moon" cx="${n(hx, 2)}" cy="0" r="${n(rg, 2)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${o.light}" stop-opacity="0"/>
  <stop offset="${n((rho - R * 0.05) / rg, 3)}" stop-color="${o.light}" stop-opacity="0"/>
  <stop offset="${n((rho + R * 0.12) / rg, 3)}" stop-color="${o.light}" stop-opacity="0.9"/>
  <stop offset="1" stop-color="${mix(o.light, o.warm, 0.3)}"/>
</radialGradient>
<radialGradient id="${pre}-moonbase" cx="${n(hx, 2)}" cy="0" r="${n(rg, 2)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${o.light}"/>
  <stop offset="${n((rho + R * 0.12) / rg, 3)}" stop-color="${o.light}"/>
  <stop offset="1" stop-color="${mix(o.light, o.warm, 0.3)}"/>
</radialGradient>`
    : `<radialGradient id="${pre}-moon" cx="${n(hx, 2)}" cy="0" r="${n(rg, 2)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${o.light}"/>
  <stop offset="${n((rho - R * 0.14) / rg, 3)}" stop-color="${o.light}" stop-opacity="0.92"/>
  <stop offset="1" stop-color="${o.light}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="${pre}-moonbase" cx="${n(hx, 2)}" cy="0" r="${n(rg, 2)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${mix(o.light, o.warm, 0.2)}"/>
  <stop offset="1" stop-color="${o.light}"/>
</radialGradient>`;
  const box = `x="${n(-R)}" y="${n(-R)}" width="${n(2 * R)}" height="${n(2 * R)}"`;
  return {
    defs: `${litDefs}
<radialGradient id="${pre}-mare">
  <stop offset="0" stop-color="${mareTone}" stop-opacity="0.9"/>
  <stop offset="0.45" stop-color="${mareTone}" stop-opacity="0.75"/>
  <stop offset="0.75" stop-color="${mareTone}" stop-opacity="0.35"/>
  <stop offset="1" stop-color="${mareTone}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="${pre}-crater">
  <stop offset="0" stop-color="${craterShade}" stop-opacity="0.5"/>
  <stop offset="0.2" stop-color="${craterShade}" stop-opacity="0.45"/>
  <stop offset="0.45" stop-color="${craterShade}" stop-opacity="0.08"/>
  <stop offset="0.6" stop-color="${craterRim}" stop-opacity="0"/>
  <stop offset="0.82" stop-color="${craterRim}" stop-opacity="0.35"/>
  <stop offset="0.93" stop-color="${craterRim}" stop-opacity="0.55"/>
  <stop offset="1" stop-color="${craterRim}" stop-opacity="0.2"/>
</linearGradient>
<radialGradient id="${pre}-ray">
  <stop offset="0" stop-color="${craterRim}" stop-opacity="0.45"/>
  <stop offset="0.35" stop-color="${craterRim}" stop-opacity="0.15"/>
  <stop offset="1" stop-color="${craterRim}" stop-opacity="0"/>
</radialGradient>
<filter id="${pre}-moontex" filterUnits="userSpaceOnUse" ${box} color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="b"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="${Math.floor(mrng() * 1000)}" result="t"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 -0.42" result="a"/>
  <feFlood flood-color="${mottle}"/>
  <feComposite in2="a" operator="in" result="m"/>
  <feMerge><feMergeNode in="m"/><feMergeNode in="b"/></feMerge>
</filter>
<clipPath id="${pre}-moonclip"><circle r="${n(R)}"/></clipPath>
<mask id="${pre}-moonlit" maskUnits="userSpaceOnUse" ${box} style="mask-type:alpha"><circle r="${n(R)}" fill="url(#${pre}-moon)"/></mask>
<g id="${pre}-moon-albedo" filter="url(#${pre}-moontex)" clip-path="url(#${pre}-moonclip)">
<circle r="${n(R * 1.03)}" fill="url(#${pre}-moonbase)"/>
${mariaEls}
${rays}
${craterEls}
</g>`,
    elements: `<g transform="translate(${n(o.cx)} ${n(o.cy)}) rotate(${o.rotate})">
<use href="#${pre}-moon-albedo" opacity="${o.earthshine ?? 0.035}"/>
<use href="#${pre}-moon-albedo" mask="url(#${pre}-moonlit)"/>
</g>`,
  };
}
