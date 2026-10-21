/**
 * GraphiteFlux — ink-wash ranges in moonlit fog, seen from a high ridge.
 *
 * Concept: a neutral ink-and-paper night. Layered rolling ranges recede
 * toward the horizon with fog lying in their valleys; two tall, weathered far
 * peaks (and a lower shoulder) rise out of the fog as dark, moon-edged
 * silhouettes inside the moon's halo (shan shui verticality); a long low gap
 * of open fog lies in the middle distance; the darkest, broadest range
 * anchors the bottom-left corner under the text pill.
 *
 * World: one height field (x right, y up, z away). Rolling ranges at
 * irregular distances (z ≈ 9, 20, 40, 62, 96, 150, 235) are smooth,
 * low-octave crest lines with a cosine cross-section (broad crests, no ridged
 * noise), each wandering in depth. The nearest one's thickness drifts along x
 * at two scales: a slow one widens and narrows its crest curvature (and the
 * rim it catches), a finer one makes its front gentler and steeper by turns,
 * i.e. broad low folds running down the fall line. Its crest has a broad
 * saddle right of centre, where the fogged valley behind shows through, and a
 * higher knoll beyond; the z ≈ 20 crest rises on the left. So inside the
 * narrow portrait view the two near crests differ in height and never run as
 * two level lines one above the other (review 3D2-03). The z ≈ 62 range is a
 * submerged swell and the z ≈ 96 range is drowned along most of its length
 * (below the ground, so it leaves no crest line), rising only as a few
 * separated humps; the peaks' feet dissolve into the fog. Far crests are
 * kept clear of eye height: a crest at eye height projects onto the horizon
 * at any distance and flattens into one straight line.
 *
 * Rock: the peaks are convex masses (flanks steepening toward the foot, never
 * a cone or witch hat) with a leaning, off-centre summit and weathering that
 * is part of the height field (review 3D2-03; the old relief vanished at the
 * summit, so every outline top was the same smooth egg): fall-line spurs and
 * gullies from a ridged noise sampled around each peak's axis (≈ 3–4 across
 * the visible front, irregular, gone at the foot), a broken crest from a
 * ridged noise in plain (x, z) on the upper half (sub-summits and notches),
 * and ledges that change with height, so no outline is an ellipse arc. Forms
 * join through a smooth maximum whose width falls to 0 at the form's edge, so
 * no step appears where a form ends.
 *
 * Camera: a high eye (8 units) above the ranges, horizon 0.50 H. Monitor and
 * tablet use focal 0.9 H. The portrait phone frame uses a longer lens
 * (half-FOV tan 0.45) and turns the camera 8° toward the moon, so the scene
 * is not squeezed into a thin band and the moon stays in view; the world
 * itself is identical on every platform.
 *
 * Light: the moon, behind the ranges ≈ 18° right of the view axis and ≈ 15°
 * above the horizon. The light direction is fixed in the world and the moon
 * disc is placed by projecting that direction through the same camera, so the
 * drawn moon and every n·L agree on every platform. Faces turned to the
 * viewer are backlit and dark; crests and the gentle back slopes the high eye
 * can see catch a low-contrast ink-wash Lambert (weight 0.5) and a soft rim.
 * The rim follows forward scattering (strongest looking toward the moon,
 * fading away from it), its threshold drifts along the crest, and on the near
 * crests it comes and goes in pieces of irregular length, so it tapers and
 * breaks. Backlit relief is read from the same normal through two more
 * terms, since n·L cannot light a face turned to the viewer: on rock, the
 * horizontal facing (flanks turned right, toward the moon's azimuth, see the
 * bright sky around it, up to a grazing rim; flanks turned left stay ink) and
 * skylight (faces tilted up), so every spur shows a lit right flank and a dark
 * left one, split at its crest by the turn of the normal; on the near ranges a
 * faint skylight lift only (nearer forms catch more light; their folds and
 * flatter feet read as a soft lift toward the bottom of the portrait frame).
 *
 * Atmosphere: height fog integrated along each view ray from the eye — a
 * dense valley layer (scale height 1.2, its level swinging by about ±1 unit
 * with low-frequency noise, more and with a softer top far off, so its top
 * makes pools and gaps and never one full-width edge) plus a thin high layer
 * (scale height 6). Optical depth grows with distance, so the base of every
 * range dissolves in proportion to how far away it is, with no drawn mist
 * band; far crests stay darker than the nearer, mistier ranges (backlit). Fog
 * is brightest toward the moon (forward scattering). A light distance haze
 * toward a dark air colour adds the last step of depth.
 *
 * Rendering: depth slices (adapted below from scene3d with a gap-free
 * selection, error-bounded gradient stops and gradient reuse) in three passes
 * whose candidate density suits their depth, so the steep peak flanks never
 * comb. The visible band per slice is ≤ 5 px far and ≤ 4 px nearer than
 * z = 30 (9 px left stair-steps in the near rim). Normals in the two nearer
 * passes span ±0.0125 z (≈ 2.5 profile samples), fine enough to resolve the
 * spurs, never one sample wide. A slice reuses the previous gradient when it
 * matches its own colours within the same tolerance; gradient tolerances are
 * 1.3/255 near, 1.8–2/255 in the fogged far passes, which keeps every mode
 * under the element budget.
 *
 * Personal touch: one rock island breaks the fog surface right of centre,
 * toward the moon, where the fog glows brightest. It is an asymmetric outcrop
 * on the drowned z ≈ 40 range (it replaced a symmetric bell, review 3D2-03):
 * a short steep face away from the moon, a long spur tailing off toward it
 * with a lower knob, a weathered crest, and a faint rim of moonlight on its
 * far side, visible from the high eye.
 */
import { mergeBricks } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";
import {
  type Camera,
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
  palest,
  rngFrom,
  shade,
  tone,
} from "./shared.js";

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Polynomial smooth maximum: joins two forms with a rounded saddle, no crease. */
const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + (h * h * k) / 4;
};

/** Low-octave 2-D fbm in about [-1, 1] — smooth, never ridged. */
function fbm2(rng: () => number, octaves: number): (x: number, z: number) => number {
  const layers = Array.from({ length: octaves }, () => valueNoise2D(rng));
  return (x, z) => {
    let s = 0;
    let a = 1;
    let norm = 0;
    let f = 1;
    for (const l of layers) {
      s += a * l(x * f, z * f);
      norm += a;
      a *= 0.5;
      f *= 2.03;
    }
    return s / norm;
  };
}

/** A rolling range: a crest line along x at depth z, cosine cross-section in z. */
interface Range {
  z: number;
  /** Half-thickness in z of the cross-section. */
  depth: number;
  /** Optional slow change of that thickness along x (crest curvature). */
  depthAt?: (x: number) => number;
  /** Crest height along world x. */
  crest: (x: number) => number;
  /** How far the crest line wanders in z. */
  wander: number;
}

/** A domed shan-shui peak with straight-to-convex flanks and a rounded top. */
interface Peak {
  x: number;
  z: number;
  h: number;
  rx: number;
  rz: number;
  /** Right-hand width multiplier (asymmetric flanks). */
  skew: number;
  /** Summit offset along x, in units of rx (a leaning, off-centre top). */
  lean: number;
}

// ─── Depth slices with a gap-free selection (adapted from scene3d) ───────────
//
// Same painter's algorithm as scene3d's `terrainSlices`, with one fix in the
// adaptive selection. The original measures the band only in columns where
// the current slice is visible; when that slice is fully hidden (the far end
// of a pass behind a tall range), every band reads 0 and the selection jumps
// straight to the nearest candidate, and candidates visible only where the
// current slice is hidden are skipped (a peak lost half its body this way).
// Here each column tracks the highest outline of every candidate since the
// last kept slice, so nothing visible between two kept slices is lost.
// Gradient stops are also placed differently (see below).

const rgbCache = new Map<string, V3>();
/** sRGB components (0–1) of a #rrggbb colour, as SVG gradients interpolate them. */
function rgbOf(c: string): V3 {
  let v = rgbCache.get(c);
  if (!v) {
    const h = Number.parseInt(c.slice(1, 7), 16);
    v = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
    rgbCache.set(c, v);
  }
  return v;
}

/**
 * `eps(z)`: half-width of the central difference for the normal, as a
 * fraction of z. The default 0.02 z spans ≈ 4 world units at the peaks,
 * wider than their spurs, so it averaged the relief out of the shading; the
 * rock passes use a narrower one (still ≥ 2.5 profile samples, so the light
 * never varies at the scale of one sample and extrudes into a comb).
 */
interface GfSliceOptions extends SliceOptions {
  eps?: (z: number) => number;
}

function depthSlices(o: GfSliceOptions): { defs: string; elements: string } {
  const { cam } = o;
  const L = norm3(o.light);
  const tol = o.tolerance ?? 1 / 255;
  const S = o.samples;
  const epsAt = o.eps ?? (() => 0.02);
  const C = o.candidates;
  const zs: number[] = [];
  const prof: Array<{ xs: number[]; hs: number[]; pts: Array<{ x: number; y: number }> }> = [];
  for (let i = 0; i <= C; i++) {
    const z = 1 / (1 / o.zFar + (1 / o.zNear - 1 / o.zFar) * (i / C));
    const half = ((cam.W * 0.54) / cam.focal) * z;
    const xs: number[] = [];
    const hs: number[] = [];
    const pts: Array<{ x: number; y: number }> = [];
    for (let k = 0; k <= S; k++) {
      const x = -half + (2 * half * k) / S; // fixed screen x for every slice
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

  // Greedy selection. colTop[k] is the highest outline among the candidates
  // from the last kept slice up to j − 1; the band a skipped stretch would
  // leave is the distance from there down to what covers it (slice j or
  // anything nearer). Hidden columns give a band ≤ 0 by construction.
  const kept: number[] = [0];
  let cur = 0;
  const colTop = new Array(S + 1);
  while (cur < C) {
    const maxBand = typeof o.maxBand === "number" ? o.maxBand : o.maxBand(zs[cur]);
    for (let k = 0; k <= S; k++) colTop[k] = prof[cur].pts[k].y;
    let next = cur + 1;
    for (let j = cur + 1; j <= C; j++) {
      let band = 0;
      for (let k = 0; k <= S; k++) {
        const cover = Math.min(prof[j].pts[k].y, env[j][k]);
        band = Math.max(band, cover - colTop[k]);
      }
      if (band > maxBand) break;
      next = j;
      for (let k = 0; k <= S; k++) colTop[k] = Math.min(colTop[k], prof[j].pts[k].y);
    }
    kept.push(next);
    cur = next;
  }

  const defs: string[] = [];
  const els: string[] = [];
  // The last fill emitted, kept with its stops so the next slice can reuse it.
  let last: { fill: string; stops: Array<{ sx: number; rgb: V3 }> } | null = null;
  kept.forEach((ci, idx) => {
    const z = zs[ci];
    const { xs, hs, pts } = prof[ci];
    const nearer = idx + 1 < kept.length ? kept[idx + 1] : -1;
    const front = nearer < 0 ? new Array(S + 1).fill(cam.H) : env[ci];
    const visible = pts.map((q, k) => q.y < front[k] + 1);
    if (!visible.some(Boolean)) return;
    const hz = Math.min(o.atm.max ?? 0.85, 1 - Math.exp(-z / o.atm.visibility));
    const eps = epsAt(z);
    const colour = (k: number) => {
      const x = xs[k];
      const dx = (o.height(x + eps * z, z) - o.height(x - eps * z, z)) / (2 * eps * z);
      const dz = (o.height(x, z + eps * z) - o.height(x, z - eps * z)) / (2 * eps * z);
      const nrm = norm3([-dx, 1, -dz]);
      const lam = Math.max(0, nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]);
      return mix(o.surface(lam, x, z, hs[k], nrm), o.atm.haze, hz);
    };
    // Outline: visible samples and their neighbours; inside hidden runs every
    // 4th sample, pushed below what covers it so no chord rises into view.
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
    // Gradient stops: Douglas–Peucker on the colour curve of the visible
    // samples, in sRGB (how SVG interpolates). A stop is kept only where
    // straight interpolation would miss the true colour by more than `tol`
    // (in 0–1 sRGB units), so a smooth ramp costs two stops, not one per step.
    const vis: Array<{ sx: number; col: string; rgb: V3 }> = [];
    for (let k = 0; k <= S; k++) {
      if (!visible[k]) continue;
      const col = colour(k);
      vis.push({ sx: pts[k].x, col, rgb: rgbOf(col) });
    }
    // Reuse: every slice spans the same screen x range, so when the previous
    // fill already matches this slice's colours within `tol` at every visible
    // sample, it is reused as is. The error bound is the same as for a fresh
    // fit (measured against this slice's own colours), but slowly changing
    // stretches (the fog sea, the broad near ranges) cost one gradient per
    // run of slices instead of one per slice.
    if (last && vis.length) {
      const ls = last.stops;
      let j = 0;
      let ok = true;
      for (const v of vis) {
        let rgb: V3;
        if (v.sx <= ls[0].sx) rgb = ls[0].rgb;
        else if (v.sx >= ls[ls.length - 1].sx) rgb = ls[ls.length - 1].rgb;
        else {
          while (ls[j + 1].sx < v.sx) j++;
          const t = (v.sx - ls[j].sx) / (ls[j + 1].sx - ls[j].sx || 1);
          rgb = [0, 1, 2].map(ch => ls[j].rgb[ch] + (ls[j + 1].rgb[ch] - ls[j].rgb[ch]) * t) as V3;
        }
        if (
          Math.abs(rgb[0] - v.rgb[0]) > tol ||
          Math.abs(rgb[1] - v.rgb[1]) > tol ||
          Math.abs(rgb[2] - v.rgb[2]) > tol
        ) {
          ok = false;
          break;
        }
      }
      if (ok) {
        els.push(
          `<path d="${relPath(outline)}V${cam.H}H${Math.round(pts[0].x)}Z" fill="${last.fill}"/>`
        );
        return;
      }
    }
    const keepStop = new Uint8Array(vis.length);
    keepStop[0] = 1;
    keepStop[vis.length - 1] = 1;
    const todo: Array<[number, number]> = [[0, vis.length - 1]];
    while (todo.length) {
      const [a, b] = todo.pop() as [number, number];
      let worst = 0;
      let wi = -1;
      const span = vis[b].sx - vis[a].sx || 1;
      for (let i = a + 1; i < b; i++) {
        const t = (vis[i].sx - vis[a].sx) / span;
        let err = 0;
        for (let ch = 0; ch < 3; ch++) {
          const lerp = vis[a].rgb[ch] + (vis[b].rgb[ch] - vis[a].rgb[ch]) * t;
          err = Math.max(err, Math.abs(lerp - vis[i].rgb[ch]));
        }
        if (err > worst) {
          worst = err;
          wi = i;
        }
      }
      if (wi >= 0 && worst > tol) {
        keepStop[wi] = 1;
        todo.push([a, wi], [wi, b]);
      }
    }
    const stops = vis.filter((_, i) => keepStop[i] === 1);
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
    last = { fill, stops };
    els.push(`<path d="${relPath(outline)}V${cam.H}H${Math.round(x0)}Z" fill="${fill}"/>`);
  });
  return { defs: defs.join("\n"), elements: `<g id="${o.id}">${els.join("")}</g>` };
}

export function graphiteFluxMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-graphite-flux-${part}`);
  const bgL = lightness(c.bg);
  const portrait = H > W;

  // ── Value plan: neutral ink and paper; lightness guarded per role. ─────────
  // Mist keeps only a trace of the palette's palest hue, so it stays grey in
  // every mode (monochromatic has C ≈ 0.12 in every slot).
  const mist = keepLightness(
    tone(palest([c.tags, c.strings, c.functions, c.constants, c.variables, c.attributes]), 0.12),
    0.82,
    0.92
  );
  const zenith = shade(c.bg, 0.76);
  const skyMid = keepLightness(mix(c.bg, mist, 0.1), bgL + 0.035, bgL + 0.06);
  const skyLow = keepLightness(mix(c.bg, mist, 0.2), bgL + 0.09, bgL + 0.12);
  // Air is a little darker than the glowing horizon sky: far ranges fade
  // toward it and stay dark silhouettes against the glow (backlit).
  const air = keepLightness(mix(c.bg, mist, 0.04), bgL - 0.01, bgL + 0.01);
  const inkShadow = shade(c.bg, 0.5); // viewer-facing, backlit faces
  const inkLit = keepLightness(mix(c.bg, mist, 0.2), bgL + 0.06, bgL + 0.12);
  const rimLit = keepLightness(mix(c.bg, mist, 0.45), bgL + 0.18, bgL + 0.26);
  const fogDim = keepLightness(mix(c.bg, mist, 0.18), bgL + 0.08, bgL + 0.11);
  const fogBright = keepLightness(mix(c.bg, mist, 0.55), bgL + 0.32, bgL + 0.38);

  // ── One camera, one light, one atmosphere. ─────────────────────────────────
  // Portrait: a longer lens (half-FOV tan 0.45) so the ranges are not
  // squeezed into a thin band, and the camera turned 8° toward the moon so
  // its azimuth stays in the narrower view. Landscape: no turn.
  const horizon = 0.5;
  const cam: Camera = { W, H, horizon, eye: 8, focal: portrait ? W / 0.9 : 0.9 * H };
  const horizonY = horizon * H;
  const yaw = portrait ? (8 * Math.PI) / 180 : 0;
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  /** Camera (x, z) → world (x, z): the world never moves, only the view turns. */
  const toWorld = (x: number, z: number): [number, number] => [
    x * cyaw + z * syaw,
    -x * syaw + z * cyaw,
  ];
  // Toward the moon (world): ≈ 18° right of north, ≈ 15° above the horizon,
  // low enough that the far peaks stand inside its halo; L is that direction
  // in camera space, used for the moon disc, n·L and the fog's scattering.
  const Lw = norm3([0.298, 0.259, 0.919]);
  const L: V3 = [Lw[0] * cyaw - Lw[2] * syaw, Lw[1], Lw[0] * syaw + Lw[2] * cyaw];
  const moon = {
    cx: W * 0.5 + (cam.focal * L[0]) / L[2],
    cy: horizonY - (cam.focal * L[1]) / L[2],
    r: 0.0215 * (W + H),
  };
  // Distance haze stays light: depth here comes mostly from the height fog.
  const atm = { haze: air, visibility: 260, max: 0.3 };

  const layers: BrickOutput[] = [];

  // ── Sky: anchored to the camera's horizon, a tight halo and a faint wash. ─
  const hz = (y: number) => n(Math.min(1, Math.max(0, y / H)), 3);
  layers.push({
    defs: `<linearGradient id="gf-sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${zenith}"/>
  <stop offset="${hz(horizonY * 0.55)}" stop-color="${mix(zenith, skyMid, 0.7)}"/>
  <stop offset="${hz(horizonY * 0.85)}" stop-color="${skyMid}"/>
  <stop offset="${hz(horizonY)}" stop-color="${skyLow}"/>
  <stop offset="1" stop-color="${skyLow}"/>
</linearGradient>
<radialGradient id="gf-halo" cx="${n(moon.cx)}" cy="${n(moon.cy)}" r="${n(moon.r * 5)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${mist}" stop-opacity="0.22"/>
  <stop offset="0.25" stop-color="${mist}" stop-opacity="0.08"/>
  <stop offset="0.6" stop-color="${mist}" stop-opacity="0.018"/>
  <stop offset="1" stop-color="${mist}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="gf-wash" cx="${n(moon.cx)}" cy="0" r="${n(W * 0.55)}" gradientTransform="translate(0 ${n(horizonY)}) scale(1 0.42)" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${mist}" stop-opacity="0.07"/>
  <stop offset="0.5" stop-color="${mist}" stop-opacity="0.025"/>
  <stop offset="1" stop-color="${mist}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#gf-sky)"/>
<rect width="${W}" height="${H}" fill="url(#gf-wash)"/>
<rect width="${W}" height="${H}" fill="url(#gf-halo)"/>`,
  });
  layers.push(
    moonBrick({
      pre: "gf",
      cx: moon.cx,
      cy: moon.cy,
      r: moon.r,
      terminator: 0.6,
      rotate: -24,
      light: keepLightness(mist, 0.86, 0.95),
      warm: tone(c.functions, 0.25),
      dark: c.bg,
      rng: key("moon"),
    })
  );

  // ── World: rolling ranges, a submerged swell, two far peaks. ───────────────
  const crestNoise = fbm2(key("crest"), 3);
  const wanderNoise = valueNoise2D(key("wander"));
  const groundNoise = fbm2(key("ground"), 2);
  const shoulder = valueNoise2D(key("shoulder"));
  const curv = valueNoise2D(key("curv"));
  const spurs = valueNoise2D(key("spurs"));
  const spurs2 = valueNoise2D(key("spurs2"));
  // Each range samples its own row of the crest noise (row index = id), at a
  // scale tied to its distance so every range shows a few broad humps on screen.
  const roll = (id: number, x: number, scale: number) => crestNoise(x / scale, id * 3.7);
  const ranges: Range[] = [
    // Darkest near range: broad, highest on the left (under the text pill),
    // lower toward the right, always above the fog.
    // Its cross-section thickness drifts slowly along x, so the crest's
    // curvature (and with it the band of normals that catches the rim)
    // widens and narrows instead of running at one width (review 3D1-09).
    // Its front also carries broad folds: a second, finer drift of the
    // thickness (cells ≈ 2 units) makes the slope gentler and steeper by
    // turns along x, i.e. low spurs and gullies running down the fall line,
    // which the skylight picks out in the lower third of the portrait frame
    // (review 3D2-03). A broad saddle right of centre lets the fogged valley
    // behind show through, and a knoll beyond it rises higher, so the crest
    // never runs level across the narrow portrait view.
    {
      z: 9,
      depth: 5,
      depthAt: x => 5 * (1 + 0.42 * curv(x * 0.11, 0.7) + 0.2 * curv(x * 0.45 + 7.3, 3.1)),
      wander: 0.8,
      crest: x =>
        4.1 +
        1.3 * smoothstep(4, -9, x) +
        0.5 * roll(1, x, 4.5) -
        0.85 * Math.exp(-(((x - 0.8) / 1.9) ** 2)) +
        0.75 * Math.exp(-(((x - 4.7) / 2.1) ** 2)),
    },
    // The rolling middle range in front of the gap, fog lying at its foot;
    // humps of unequal height so its crest is no level strip on mobile.
    {
      z: 20,
      depth: 7,
      wander: 1.8,
      crest: x => 3.2 + 1.6 * roll(2, x, 7) + 1.1 * Math.exp(-(((x + 2.5) / 3.6) ** 2)),
    },
    // Under the fog everywhere; the island right of centre is its own
    // outcrop (see `outcrop` below).
    { z: 40, depth: 10, wander: 2.5, crest: x => 0.6 + 0.3 * roll(3, x, 12) },
    // A submerged swell that only shapes the fog's brightness in the gap.
    { z: 62, depth: 14, wander: 4, crest: x => 0.9 + 0.4 * roll(4, x, 20) },
    // Far crests keep clear of eye height (8): a crest at eye height projects
    // onto the horizon at any distance and flattens into one straight line.
    // This one stays below it and is drowned along most of its length: it
    // surfaces only as a few separated humps of unequal height. A continuous
    // crest here was the full-width "fog shelf" edge at y ≈ 562–602 (review
    // 3D1-09); where it is drowned, the peaks' feet and the far range's
    // lower slopes dissolve gradually into the valley fog instead.
    {
      z: 96,
      depth: 22,
      wander: 15,
      // Drowned stretches sink below the ground (0.35 ± 0.3), so they leave
      // no crest at all: even a low crest inside the fog drew a faint
      // straight line across the peaks' feet.
      crest: x => 0.1 + 6.4 * smoothstep(0.08, 0.5, roll(5, x, 30)) * (0.7 + 0.3 * roll(8, x, 11)),
    },
    { z: 150, depth: 38, wander: 18, crest: x => 15.5 + 5 * roll(6, x, 40) },
    // The farthest range stays above eye height across the whole view.
    { z: 235, depth: 60, wander: 22, crest: x => 25 + 8 * roll(7, x, 62) },
  ];
  const peaks: Peak[] = [
    { x: 6, z: 92, h: 23, rx: 11, rz: 11, skew: 1.25, lean: 0.16 },
    // A lower shoulder on the main peak's left flank breaks its symmetry.
    { x: -3.5, z: 97, h: 13.5, rx: 7.5, rz: 7.5, skew: 1.1, lean: -0.12 },
    { x: 24, z: 106, h: 18, rx: 10.5, rz: 10.5, skew: 0.85, lean: -0.2 },
  ];
  const summitN = valueNoise2D(key("summit"));
  /** Ridged value (0–1, sharp crest at 1, rounded trough at 0) of a noise. */
  const ridgedAt = (nz: (a: number, b: number) => number, a: number, b: number) => {
    const v = 1 - Math.abs(nz(a, b));
    return v * v * (3 - 2 * v);
  };
  /**
   * One peak's height (or −1 outside it). A convex mass (flanks steepening
   * toward the foot, never a cone or witch hat) with weathered relief that is
   * part of the height field (review 3D2-03: the old relief was gone at the
   * summit, so every outline top was the same smooth egg):
   * - fall-line spurs and gullies from a ridged noise sampled on a circle
   *   around the axis (no angular seam), ≈ 3–4 across the visible front,
   *   each ≥ 10 profile samples wide; its coordinate drifts with the radius,
   *   so the spurs curve a little as they run down;
   * - a broken crest: a ridged noise in plain (x, z) on the upper half
   *   (cells ≈ 3 units, not angular, which would pinch at the axis), so the
   *   top splits into sub-summits and notches;
   * - ledges that change with height (a concentric term), so no outline is
   *   an ellipse arc. Relief dies at the foot, where the fog takes over.
   */
  // Blend width of the last form evaluated: it falls to 0 at the form's
  // edge, so the smooth-max saddle adds no step where the form ends.
  let blendK = 0;
  const join = (h: number, f: number) => (blendK > 1e-3 ? smax(h, f, blendK) : Math.max(h, f));
  const peakHeight = (pk: Peak, x: number, z: number) => {
    const dz = z - pk.z;
    // The summit leans off the axis: the offset fades toward the foot.
    const d0 = Math.hypot((x - pk.x) / pk.rx, dz / pk.rz);
    const dx = x - pk.x - pk.lean * pk.rx * Math.max(0, 1 - d0) ** 2;
    const ux = dx / (pk.rx * (dx > 0 ? pk.skew : 1));
    const uz = dz / pk.rz;
    const r0 = Math.hypot(ux, uz);
    if (r0 > 1.15) return -1;
    // Low-frequency shoulders on the flanks; the mass itself stays convex.
    const rr = r0 * (1 + 0.09 * shoulder(dx * 0.3 + pk.x, dz * 0.3));
    if (rr >= 1) return -1;
    const ca = ux / (r0 || 1);
    const sa = uz / (r0 || 1);
    const flank = smoothstep(0.12, 0.42, rr) * (1 - smoothstep(0.8, 1, rr));
    const spur = ridgedAt(spurs, 1.15 * ca + 0.8 * rr + pk.x * 1.7, 1.15 * sa + pk.z * 0.37) - 0.5;
    const fine = ridgedAt(spurs2, 2.6 * ca + 1.1 * rr + pk.x, 2.6 * sa + pk.z * 0.21) - 0.5;
    const ledge = shoulder(rr * 4.2 + pk.x, ca * 1.3 + sa * 0.7 + pk.z * 0.1);
    const crown = 1 - smoothstep(0.25, 0.6, rr);
    const knobs = ridgedAt(summitN, dx * 0.34 + pk.x * 0.9, dz * 0.34 + pk.z * 0.53) - 0.55;
    const relief =
      flank * (0.36 * spur + 0.07 * ledge) +
      smoothstep(0.35, 0.65, rr) * (1 - smoothstep(0.85, 1, rr)) * 0.09 * fine +
      crown * 0.16 * knobs;
    blendK = 1.5 * smoothstep(1, 0.85, rr);
    return pk.h * ((1 - rr ** 1.6) ** 0.9 + relief);
  };
  /**
   * The lone island (personal touch): an outcrop on the drowned z ≈ 40 range,
   * right of centre toward the moon. It replaces round 2's Gaussian bell
   * (review 3D2-03) with an asymmetric rock: its long axis runs obliquely
   * (back-left to front-right), the face away from the moon is short and
   * steep, a long spur tails off toward the moon with a second, lower knob on
   * it, and the same ridged weathering as the peaks breaks its crest.
   */
  const OC = { x: 11, z: 40, h: 5.3, rot: (-28 * Math.PI) / 180 };
  const ocCos = Math.cos(OC.rot);
  const ocSin = Math.sin(OC.rot);
  const outcrop = (x: number, z: number) => {
    const dx = x - OC.x;
    const dz = z - OC.z;
    const u = dx * ocCos + dz * ocSin; // along the spur, + toward the moon side
    const v = -dx * ocSin + dz * ocCos;
    const ru = u / (u < 0 ? 2.9 : 7.4);
    const rv = v / (v < 0 ? 3.6 : 5.6);
    const r0 = Math.hypot(ru, rv);
    if (r0 > 1.15) return -1;
    const rr = r0 * (1 + 0.12 * shoulder(dx * 0.5 + 40, dz * 0.5));
    if (rr >= 1) return -1;
    const ca = ru / (r0 || 1);
    const sa = rv / (r0 || 1);
    const flank = smoothstep(0.15, 0.45, rr) * (1 - smoothstep(0.75, 1, rr));
    const spur = ridgedAt(spurs, 1.3 * ca + 0.9 * rr + 31, 1.3 * sa + 7) - 0.5;
    const knob = 0.16 * Math.exp(-(((u - 4.4) / 1.3) ** 2 + (v / 1.6) ** 2));
    const crown = 1 - smoothstep(0.3, 0.7, rr);
    const knobs = ridgedAt(summitN, dx * 0.6 + 50, dz * 0.6 + 11) - 0.55;
    blendK = 0.9 * smoothstep(1, 0.85, rr);
    return OC.h * ((1 - rr ** 1.35) ** 1.15 + knob + flank * 0.3 * spur + crown * 0.14 * knobs);
  };
  /** 0–1: how much (x, z) belongs to rock (the peaks and the island). */
  const rockAt = (x: number, z: number) => {
    let m = 0;
    for (const pk of peaks) {
      const d = Math.hypot((x - pk.x) / (pk.rx * 1.2), (z - pk.z) / pk.rz);
      m = Math.max(m, 1 - smoothstep(0.95, 1.2, d));
    }
    const ou = (x - OC.x) / 7.4;
    const ov = (z - OC.z) / 5.6;
    return Math.max(m, 1 - smoothstep(0.95, 1.25, Math.hypot(ou, ov)));
  };
  const height = (x: number, z: number) => {
    let h = 0.35 + 0.3 * groundNoise(x * 0.08, z * 0.08);
    ranges.forEach((r, i) => {
      const zc = r.z + r.wander * wanderNoise(x / (r.z * 0.6), i * 5.3);
      const u = (z - zc) / (r.depthAt ? r.depthAt(x) : r.depth);
      if (u <= -1 || u >= 1) return;
      h = smax(h, r.crest(x) * (0.5 + 0.5 * Math.cos(Math.PI * u)), 0.8);
    });
    const oc = outcrop(x, z);
    if (oc > 0) h = join(h, oc);
    for (const pk of peaks) {
      const ph = peakHeight(pk, x, z);
      if (ph > 0) h = join(h, ph);
    }
    return h;
  };

  // ── Surface: ink-wash Lambert, rim light, then altitude fog. ───────────────
  const fogLevel = fbm2(key("fog"), 2);
  // Optical depth of an exponential layer (density rho·e^(−y/s)) along the
  // straight ray from the eye to a point at height h, distance dist.
  const rayDepth = (dist: number, h: number, rho: number, s: number) => {
    const a = Math.min(h, cam.eye);
    const b = Math.max(h, cam.eye);
    const f =
      b - a < 1e-3 ? Math.exp(-a / s) : (s * (Math.exp(-a / s) - Math.exp(-b / s))) / (b - a);
    return rho * dist * f;
  };
  const fogBody = valueNoise2D(key("fogbody"));
  const rimVar = valueNoise2D(key("rim"));
  const rimPieces = valueNoise2D(key("rimpieces"));
  const surface = (lam: number, x: number, z: number, h: number, nrm: V3) => {
    const [wx, wz] = toWorld(x, z);
    const lit = smoothstep(0.05, 0.6, lam);
    let col = mix(inkShadow, inkLit, 0.5 * lit);
    // Backlit relief. n·L cannot light the faces turned to the viewer (the
    // moon is behind), so their relief reads through two other terms of the
    // same normal: skylight (faces tilted up see more of the sky) and the
    // moon side (faces turned right, toward the moon's azimuth, see the
    // bright sky around it; faces turned left see only the dark sky). `hx`
    // is the horizontal facing (−1 left, 0 toward the viewer, +1 right). On
    // rock (the peaks and the island) the two model spurs, gullies and the
    // broken crest (review 3D2-03): each spur has a lit right flank and a
    // dark left one, which the crisp turn of the normal at the spur crest
    // separates. The near ranges, smooth and close, take a skylight lift
    // instead (nearer forms catch more light; their broad folds and the
    // flatter foot read as a soft lift toward the bottom of the portrait
    // frame) and only a trace of the moon side, so they stay calm (lesson 3).
    const rock = rockAt(wx, wz);
    const near = smoothstep(32, 22, z);
    const hx = nrm[0] / (Math.hypot(nrm[0], nrm[2]) || 1);
    const up = smoothstep(0.05, 0.85, nrm[1]);
    if (rock > 0) {
      // Faces turned toward the viewer or left stay ink-dark; the more a
      // flank turns right, the more of the moonward sky it sees, up to a
      // grazing rim of moonlight on the flanks turned furthest.
      const side = smoothstep(-0.1, 0.8, hx);
      const flank = mix(inkLit, rimLit, 0.7 * side);
      col = mix(col, flank, rock * (0.05 + 0.95 * side) * (0.6 + 0.4 * up));
    }
    if (near > 0) {
      const sky = smoothstep(0.45, 0.97, nrm[1]);
      col = mix(
        col,
        inkLit,
        near * (0.16 + 0.42 * sky) * (0.75 + 0.25 * smoothstep(-0.5, 0.5, hx))
      );
    }
    // Rim: only crest tops and the gentle back slopes the high eye can see
    // turn far enough toward the moon to pass this threshold. Its strength
    // follows the forward scattering of a backlit edge (strongest looking
    // toward the moon, fading away from it) and its threshold drifts slowly
    // along the crest. On the long near crests (z < 30) the rim also comes
    // and goes in pieces of irregular length along the crest (a noise that
    // reaches zero), so even where the view looks toward the moon (the whole
    // portrait frame) it tapers and breaks instead of running as one even
    // line (review 3D1-09, lesson 1). The lone island keeps its full rim.
    const vd = norm3([x, h - cam.eye, z]);
    const cosV = vd[0] * L[0] + vd[1] * L[1] + vd[2] * L[2];
    const fwd = Math.min(1, 1.35 * ((1 + cosV) / 2) ** 8);
    const drift = 0.1 * rimVar(wx * 0.16, wz * 0.16);
    const pieces = smoothstep(-0.15, 0.35, rimPieces(wx * 0.35, wz * 0.35));
    const along = 1 + (pieces - 1) * smoothstep(30, 20, z);
    col = mix(col, rimLit, 0.7 * fwd * along * smoothstep(0.3 + drift, 0.62 + drift, lam));
    // Height fog, integrated along the view ray from the eye: a dense valley
    // layer (scale height 1.2, its level wandering with low-frequency noise
    // so its edge is never one contour) and a thin high layer (scale height 6)
    // that dissolves the lower slopes of the far ranges with distance.
    const dist = Math.hypot(x, h - cam.eye, z);
    // The level swings by about ±1 unit at a broad scale: pools where the
    // fog lies deep, gaps where a hump or crest breaks through. Far off, the
    // swing grows (fog banks of different depth) and the top softens: seen at
    // a grazing angle, a flat, sharp-topped layer projects onto one
    // full-width line across the far ranges (review 3D1-09).
    const far = smoothstep(60, 170, dist);
    const t0 = rayDepth(
      dist,
      h - (1.7 + 2.2 * far) * fogLevel(wx * 0.03, wz * 0.03),
      0.5,
      1.2 * (1 + 0.7 * far)
    );
    const t1 = rayDepth(dist, h, 0.02, 6);
    const fog = 1 - Math.exp(-(t0 + t1));
    if (fog < 0.01) return col;
    // Forward scattering: fog toward the moon glows, fog away from it is dim.
    const v = norm3([x, h - cam.eye, z]);
    const cosA = v[0] * L[0] + v[1] * L[1] + v[2] * L[2];
    const phase = ((1 + cosA) / 2) ** 14;
    const body = 0.85 + 0.15 * fogBody(wx * 0.06, wz * 0.06);
    const low = mix(fogDim, fogBright, Math.min(1, phase * 1.1) * body);
    const high = mix(skyLow, fogBright, 0.4 * phase);
    const fogCol = mix(low, high, t1 / (t0 + t1));
    return mix(col, fogCol, fog);
  };

  // ── Terrain in three depth passes, far → near. ─────────────────────────────
  // Candidate slices are spaced in 1/z, so their spacing grows with z²; each
  // pass gets its own density, keeping the visible band between slices within
  // a few px even on the peaks' flanks and the far ranges' fronts.
  const samples = Math.max(220, Math.min(440, Math.round(W / 9)));
  const pass = (
    id: string,
    zNear: number,
    zFar: number,
    candidates: number,
    maxBand: number | ((z: number) => number),
    tolerance: number,
    eps?: (z: number) => number
  ) =>
    depthSlices({
      id,
      cam,
      atm,
      height: (x, z) => {
        const [wx, wz] = toWorld(x, z);
        return height(wx, wz);
      },
      light: L,
      zNear,
      zFar,
      candidates,
      maxBand,
      samples,
      // Largest interpolation error a gradient may make (sRGB). In flat dark
      // greys a coarse value lets neighbouring slices err with opposite
      // signs, which reads as stacked contour arcs.
      tolerance,
      eps,
      surface,
    });
  for (const t of [
    // Tolerances (sRGB, see depthSlices) are a touch looser in the fogged far
    // passes, where the colour curves are smooth, to stay within the element
    // budget in every mode; the near dark pass keeps a tight fit.
    pass("gf-a", 112, 300, 1500, 5, 2 / 255),
    // Rock passes: normals over ±0.0125 z (≈ 2.5 profile samples on every
    // platform), fine enough to resolve the spurs, never one sample wide.
    pass("gf-b", 62, 112, 2500, 5, 1.8 / 255, () => 0.0125),
    // ≤ 4 px nearer than z = 30 (9 px left visible stair-steps inside the
    // near rim), 5 px beyond. Known residual (round 2): the 3000 candidates
    // are spaced in 1/z, so beyond z ≈ 30 they are too sparse for the
    // island's steep front (each candidate step is ≈ 7 px there, above the
    // bound) and its lower body shows stacked contour arcs at 3×; a separate
    // 30–62 pass removes them but costs ≈ 4.5k elements (see the run notes).
    pass(
      "gf-c",
      3.5,
      62,
      3000,
      z => (z < 30 ? 4 : 5),
      1.3 / 255,
      () => 0.0125
    ),
  ])
    layers.push(t);

  layers.push(grainBrick("gf-grain", W, H, mist, 0.04));
  return mergeBricks(layers);
}

export function composeGraphiteFlux(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(graphiteFluxMotif(p), p);
}
