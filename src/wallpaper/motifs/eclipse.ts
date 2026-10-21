/**
 * Eclipse — totality seen from a quiet plain, built as a world and photographed.
 *
 * Concept: the Moon's black disc hangs in a navy sky. The pearly corona around
 * it is the only light above. Low all around the horizon the air beyond the
 * Moon's shadow still lies in sunlight, so it glows as one continuous 360°
 * ring. The ring is brightest where the shadow's edge lies nearest.
 *
 * World: x right, y up, z away, in metres for the land and kilometres for the
 * umbra. The umbra is an ellipse on the ground (about 110 × 90 km) whose centre
 * lies left-behind the observer. Along each azimuth, the afterglow brightness is
 * a smooth decreasing function of the eye-to-edge distance, so the ring has
 * exactly one maximum, low and right of centre, and no stripes or hot points
 * along the ridge. The land is one height field (depth slices): a near swell
 * (z 6–20), a plain of shallow oblique swales (≈ 32° across the line of
 * sight, amplitude wandering) that the ring light rakes across, scattered low
 * hills, and a low, rounded far range (z 120–300) that stands as a hazed
 * silhouette against the glow. The plain and hills are band-limited by their
 * foreshortened height on screen (focal·λ·eye/z²), so no octave thin enough
 * to alias into horizontal streaks survives.
 *
 * Camera: eye 2 m. Monitor horizon 0.80, focal 1.0·H; tablet 0.78, focal 1.0·H
 * (it sees the central 75 % of the monitor's field); mobile 0.82, focal
 * W/(2·0.8). The sky objects (corona, Venus) are at infinity and placed at
 * fixed screen positions per platform. The disc has the same size on every
 * platform: 0.105·min(W,H) across.
 *
 * Light: the land takes Lambert light from a low source (2° up) at the ring's
 * peak azimuth. Faces turned toward the glow take a faint warm lift (L ≤ 0.3);
 * everything else is near-black ink, with a trace of navy skylight on faces
 * turned up. The normal for this is taken over a footprint of ±4.5 % of the
 * distance (a coarser surface than the silhouette), so the raking light never
 * picks out detail a slice would extrude into a rule. The corona is emissive.
 *
 * Rendering: depth slices with Douglas–Peucker gradient stops (tolerance
 * 1.2/255 sRGB, copied from graphite-flux) and ≤ 3 px of constant colour per
 * strip everywhere; scene3d's fixed OKLab stop step (0.02, ≈ 5/255 here) and
 * 14 px near strips were the "wood grain" of review 3D1-11.
 *
 * Atmosphere: aerial haze 1 − e^(−z/80), capped at 0.55, toward an air colour
 * that depends on the azimuth. Where the ring is bright the air is lit warm;
 * elsewhere it is navy. Haze is always darker than the afterglow behind it, so
 * the far range stays a backlit silhouette.
 *
 * Personal touch: a short chromosphere sliver and one small prominence at the
 * lower-west limb, both drawn behind the disc so the limb itself shapes them.
 */
import { clampChroma, formatHex, oklch } from "culori";
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

interface Pt {
  x: number;
  y: number;
}

const chroma = (c: string) => oklch(c)?.c ?? 0;
const hue = (c: string) => oklch(c)?.h ?? 0;
/** Angular distance between two hues, 0–180°. */
const hueDist = (a: number, b: number) => {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
};
/** Pick the palette colour with the best score among those passing `ok`. */
function pick(cands: string[], ok: (c: string) => boolean, score: (c: string) => number): string {
  const pool = cands.filter(ok);
  const list = pool.length ? pool : cands;
  return list.reduce((a, b) => (score(b) > score(a) ? b : a));
}
/** Chroma weighted toward a target hue — the warmest strong colour, by value and role. */
const warmScore = (target: number) => (c: string) =>
  chroma(c) * (0.15 + 0.85 * Math.cos((hueDist(hue(c), target) * Math.PI) / 360) ** 4);
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * A streamer as a closed lens in its own polar frame: u runs outward from the
 * disc centre along angle `a`, v across it. `w(u)` is the half-width profile,
 * `bend(u)` a lateral drift; the base sits inside the disc, which hides it.
 */
function streamerPath(
  cx: number,
  cy: number,
  a: number,
  us: number[],
  w: (u: number) => number,
  bend: (u: number) => number
): string {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const at = (u: number, v: number): Pt => ({ x: cx + u * ca - v * sa, y: cy + u * sa + v * ca });
  const left = us.map(u => at(u, bend(u) + w(u)));
  const right = us
    .slice(0, -1)
    .reverse()
    .map(u => at(u, bend(u) - w(u)));
  return `${smoothPath([...left, ...right])}Z`;
}

/**
 * The umbra as a ground ellipse (km): centre `c` relative to the observer,
 * semi-axes `a` × `b`, rotated by `rot`. Returns the afterglow brightness
 * (0 … 1) along an azimuth (radians, 0 = straight ahead, + = right). The
 * brightness is a smooth decreasing function of the eye-to-edge distance, so
 * the 360° ring has exactly one maximum, where the edge is nearest.
 */
function umbraRing(c: [number, number], a: number, b: number, rot: number, scale: number) {
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const toLocal = (v: [number, number]): [number, number] => [
    v[0] * cr + v[1] * sr,
    -v[0] * sr + v[1] * cr,
  ];
  const o = toLocal([-c[0], -c[1]]); // the observer in the ellipse's frame
  const edge = (az: number) => {
    // Ray from the observer (inside the ellipse) to the shadow's edge.
    const d = toLocal([Math.sin(az), Math.cos(az)]);
    const A = d[0] ** 2 / a ** 2 + d[1] ** 2 / b ** 2;
    const B = 2 * ((o[0] * d[0]) / a ** 2 + (o[1] * d[1]) / b ** 2);
    const C = o[0] ** 2 / a ** 2 + o[1] ** 2 / b ** 2 - 1;
    return (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
  };
  let nearest = Number.POSITIVE_INFINITY;
  let peak = 0;
  for (let i = 0; i < 720; i++) {
    const az = ((i - 360) / 360) * Math.PI;
    const e = edge(az);
    if (e < nearest) {
      nearest = e;
      peak = az;
    }
  }
  return { at: (az: number) => Math.exp(-(edge(az) - nearest) / scale), peak };
}

// ─── Depth slices with error-bounded gradients (copied from graphite-flux) ────
//
// scene3d's terrainSlices emits a gradient stop only after the colour has
// moved by a fixed OKLab step (0.02). On this near-black plain that step is
// ~5/255, so every slice's gradient is a staircase and neighbouring slices
// err with different signs: stacked horizontal "wood grain" (review 3D1-11).
// This copy (graphite-flux's depthSlices) fits the stops by Douglas–Peucker
// on the sRGB colour curve, so `tolerance` here is in sRGB 0–1 units, and its
// selection tracks every candidate's outline, so no visible strip is skipped.
// Worth promoting into scene3d (one shared copy for graphite-flux and eclipse).

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

function slicesDP(o: SliceOptions): { defs: string; elements: string } {
  const { cam } = o;
  const L = norm3(o.light);
  const tol = o.tolerance ?? 1 / 255;
  const S = o.samples;
  const eps = 0.02;
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
  kept.forEach((ci, idx) => {
    const z = zs[ci];
    const { xs, hs, pts } = prof[ci];
    const nearer = idx + 1 < kept.length ? kept[idx + 1] : -1;
    const front = nearer < 0 ? new Array(S + 1).fill(cam.H) : env[ci];
    const visible = pts.map((q, k) => q.y < front[k] + 1);
    if (!visible.some(Boolean)) return;
    const hz = Math.min(o.atm.max ?? 0.85, 1 - Math.exp(-z / o.atm.visibility));
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
    els.push(`<path d="${relPath(outline)}V${cam.H}H${Math.round(x0)}Z" fill="${fill}"/>`);
  });
  return { defs: defs.join("\n"), elements: `<g id="${o.id}">${els.join("")}</g>` };
}

export function eclipseMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = `${p.seedId}-${p.harmonyMode}-eclipse`;
  const platform = p.platform ?? (H > W ? "mobile" : "monitor");
  const portrait = platform === "mobile";

  // ── Value plan: pick roles by value, guard lightness ──────────────────────
  const hues = [
    c.hueRed,
    c.hueOrange,
    c.hueYellow,
    c.hueGreen,
    c.hueCyan,
    c.hueBlue,
    c.huePurple,
    c.strings,
    c.keywords,
    c.functions,
    c.types,
    c.variables,
    c.constants,
    c.numbers,
    c.tags,
    c.attributes,
  ];
  const bgL = lightness(c.bg);
  // Corona: pearly — the palest, least chromatic colour, toned nearly white.
  // The accent is deliberately not a candidate: a gold ring reads as annular.
  const coronaSrc = pick(
    hues,
    x => lightness(x) > 0.85,
    x => -chroma(x)
  );
  const corona = keepLightness(tone(coronaSrc, 0.22), 0.9, 0.97);
  const coronaOuter = keepLightness(mix(corona, c.bg, 0.12), 0.82, 0.92);
  // Twilight: the strongest warm mid-tone (accent allowed — it never touches the corona).
  const bandSrc = pick(
    [...hues, c.accent, c.accentSoft],
    x => lightness(x) > 0.55 && lightness(x) < 0.87,
    warmScore(50)
  );
  // Warm fallback: when a harmony mode has rotated every candidate away from
  // orange, pull the twilight back toward a warm hue of the same value/chroma.
  const bandOk = Math.min(1, Math.max(0, (hueDist(hue(bandSrc), 50) - 35) / 45));
  const warmRef = formatHex(
    clampChroma(
      {
        mode: "oklch",
        l: lightness(bandSrc),
        c: Math.max(0.09, Math.min(0.14, chroma(bandSrc))),
        h: 52,
      },
      "oklch"
    )
  );
  const band = tone(mix(bandSrc, warmRef, bandOk * 0.9), 0.75);
  const bandPeak = keepLightness(band, 0.46, 0.56);
  const bandGlow = keepLightness(mix(band, corona, 0.25), 0.54, 0.62);
  // The upper afterglow cools toward the navy: rose-grey, never orange.
  const bandHigh = keepLightness(mix(tone(band, 0.45), shade(c.bg, 0.6), 0.45), 0.3, 0.38);
  // Hydrogen-alpha pink-red for the chromosphere and the prominence.
  const haSrc = pick(hues, x => lightness(x) > 0.55 && lightness(x) < 0.87, warmScore(20));
  const halpha = keepLightness(tone(mix(haSrc, corona, 0.3), 0.8), 0.68, 0.8);
  const zenith = shade(c.bg, 0.55);
  const disc = shade(c.bg, 0.38);
  const discCentre = shade(c.bg, 0.5); // faint earthshine
  const starTint = palest([c.types, c.hueGreen, c.functions, corona]);

  // Land: near-black ink, a trace of navy skylight, a faint warm lift (L ≤ 0.3).
  const ink = keepLightness(mix(shade(c.bg, 0.4), band, 0.03), bgL * 0.28, bgL * 0.45);
  const inkSky = keepLightness(mix(shade(c.bg, 0.25), zenith, 0.3), bgL * 0.45, bgL * 0.7);
  const landLit = keepLightness(mix(bandPeak, ink, 0.35), 0.24, 0.3);
  // Air colours: navy where the ring is dim, warm-lit where it is bright.
  const airNavy = keepLightness(mix(c.bg, zenith, 0.3), bgL * 0.85, bgL * 1.05);
  const airWarm = keepLightness(tone(mix(bandPeak, c.bg, 0.55), 0.7), 0.22, 0.27);

  // ── Camera: one per platform, the land is photographed through it ─────────
  const camSpec = {
    monitor: { horizon: 0.8, focal: 1.0 * H },
    tablet: { horizon: 0.78, focal: 1.0 * H },
    mobile: { horizon: 0.82, focal: W / (2 * 0.8) },
  }[platform];
  const cam: Camera = { W, H, horizon: camSpec.horizon, eye: 2, focal: camSpec.focal };
  const hY = cam.horizon * H;
  /** Azimuth (radians) of screen column x. */
  const azOf = (x: number) => Math.atan((x - W * 0.5) / cam.focal);

  // ── Sky objects at infinity ────────────────────────────────────────────────
  // Landscape: the Sun's direction (tan az 0.142, tan el 0.40) through the
  // camera; portrait places it artistically at 0.5 W, 0.35 H.
  const S = Math.min(W, H);
  const R = S * 0.0525; // disc 0.105·min(W,H) across, on every platform
  const cx = portrait ? W * 0.5 : W * 0.5 + cam.focal * 0.142;
  const cy = portrait ? H * 0.35 : hY - cam.focal * 0.4;
  const eq = (-19 * Math.PI) / 180; // solar equator, tilted — never level

  // ── The ring: brightness per azimuth from the umbra's geometry ────────────
  // Umbra centre ~35 km left-behind; the nearest edge lies ~24° right.
  const ring = umbraRing([-12, -33], 56, 44, (-30 * Math.PI) / 180, 5);
  const RING_FLOOR = 0.1; // the whole horizon glows a little (it is a ring)
  const glowAt = (az: number) => RING_FLOOR + (1 - RING_FLOOR) * ring.at(az);
  const L: V3 = [Math.sin(ring.peak), Math.tan((2 * Math.PI) / 180), Math.cos(ring.peak)];

  const layers: BrickOutput[] = [];

  // ── Sky: navy at the zenith, a faint lift toward the horizon ──────────────
  const hp = (y: number) => n((y / H) * 100, 2);
  layers.push({
    defs: `<linearGradient id="ea-sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${zenith}"/>
  <stop offset="${hp(cy)}%" stop-color="${mix(zenith, c.bg, 0.7)}"/>
  <stop offset="${hp(hY - H * 0.2)}%" stop-color="${c.bg}"/>
  <stop offset="${hp(hY - H * 0.05)}%" stop-color="${mix(c.bg, bandHigh, 0.1)}"/>
  <stop offset="${hp(hY)}%" stop-color="${mix(c.bg, bandHigh, 0.18)}"/>
  <stop offset="1" stop-color="${mix(c.bg, bandHigh, 0.18)}"/>
</linearGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#ea-sky)"/>`,
  });

  // ── Afterglow: three soft layers, each = vertical falloff × ring envelope ──
  // A layer's envelope is glowAt(az)^k sampled across the screen. The low hot
  // layer uses a steep power (it lives only near the peak), the tall faint one
  // a gentle power (it reaches round the ring). Their sum makes the glow both
  // brighter and taller toward the peak, with one maximum and no edges.
  // Warmth stays below 0.15·H above the horizon.
  const envStops = (k: number) =>
    Array.from({ length: 33 }, (_, i) => {
      const t = i / 32;
      const v = glowAt(azOf(t * W)) ** k;
      return `<stop offset="${n(t, 3)}" stop-color="white" stop-opacity="${n(v, 3)}"/>`;
    }).join("");
  const glowLayer = (id: string, reach: number, colour: string, op: number, k: number) => {
    const y0 = hY - H * reach;
    const y1 = hY + H * 0.012; // under the farthest slice's top, so no gap shows
    const fall = [0, 0.25, 0.5, 0.75, 0.9, 1]
      .map(t => {
        // Exponential-like rise toward the horizon: soft on both ends.
        const v = op * Math.exp(-3.2 * (1 - t) ** 1.4);
        return `<stop offset="${t}" stop-color="${colour}" stop-opacity="${n(t === 0 ? 0 : v, 3)}"/>`;
      })
      .join("");
    return {
      defs: `<linearGradient id="${id}v" x1="0" y1="${n(y0)}" x2="0" y2="${n(hY)}" gradientUnits="userSpaceOnUse">${fall}</linearGradient>
<linearGradient id="${id}h" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">${envStops(k)}</linearGradient>
<mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="${n(y0)}" width="${W}" height="${n(y1 - y0)}"><rect y="${n(y0)}" width="${W}" height="${n(y1 - y0)}" fill="url(#${id}h)"/></mask>`,
      elements: `<rect y="${n(y0)}" width="${W}" height="${n(y1 - y0)}" fill="url(#${id}v)" mask="url(#${id}m)"/>`,
    };
  };
  layers.push(glowLayer("ea-g3", 0.15, bandHigh, 0.32, 0.8));
  layers.push(glowLayer("ea-g2", 0.08, bandPeak, 0.55, 1.6));
  layers.push(glowLayer("ea-g1", 0.03, bandGlow, 0.85, 2.6));

  // ── Stars and one planet: only the brightest show during totality ─────────
  layers.push(
    starField({
      id: "ea-st",
      width: W,
      horizonY: hY - H * 0.2,
      count: 34,
      tints: [starTint, corona].map(t => keepLightness(t, 0.8, 0.97)),
      avoid: { cx, cy, r: R * 6.5 },
      rng: rngFrom(`${key}-stars`),
    })
  );
  {
    // Venus, low beside the Sun — a steep PSF, no plateau.
    const vx = portrait ? W * 0.24 : cx - W * 0.24;
    const vy = portrait ? cy + H * 0.11 : cy + H * 0.1;
    const vc = keepLightness(mix(corona, band, 0.12), 0.9, 0.98);
    const vr = S * 0.0026;
    layers.push({
      defs: `<radialGradient id="ea-pl">
  <stop offset="0" stop-color="${vc}" stop-opacity="1"/>
  <stop offset="0.02" stop-color="${vc}" stop-opacity="0.85"/>
  <stop offset="0.05" stop-color="${vc}" stop-opacity="0.32"/>
  <stop offset="0.12" stop-color="${vc}" stop-opacity="0.1"/>
  <stop offset="0.3" stop-color="${vc}" stop-opacity="0.03"/>
  <stop offset="0.6" stop-color="${vc}" stop-opacity="0.008"/>
  <stop offset="1" stop-color="${vc}" stop-opacity="0"/>
</radialGradient>`,
      elements: `<circle cx="${n(vx)}" cy="${n(vy)}" r="${n(vr * 22)}" fill="url(#ea-pl)"/>`,
    });
  }

  // ── Corona (emissive, kept from the 2-D scene) ─────────────────────────────
  // Three fade gradients of different reach, all centred on the disc; each
  // starts at the limb, so geometry decides where a streamer ends.
  const fade = (id: string, reach: number, colour: string, k: number) => {
    const rr = R * reach;
    const stops = [1, 1.15, 1.4, 1.8, 2.5, 3.5, 5, 7]
      .filter(f => f < reach)
      .map(f => {
        const t = (f - 1) / (reach - 1);
        const op = (1 / f) ** k * (1 - t) ** 1.2;
        return `<stop offset="${n(f / reach, 3)}" stop-color="${colour}" stop-opacity="${n(op, 3)}"/>`;
      })
      .join("");
    return `<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(rr)}" gradientUnits="userSpaceOnUse">${stops}<stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient>`;
  };
  const eqDeg = n((eq * 180) / Math.PI, 1);
  // Inner corona: one continuous power-law falloff (no plateau, no rim). The
  // ellipse stretches it along the equator, so the poles stay dim and the
  // glow can never close into an even ring.
  const innerStops = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.45, 1.7, 2]
    .map(
      f =>
        `<stop offset="${n(f / 2.3, 3)}" stop-color="${f < 1.3 ? corona : coronaOuter}" stop-opacity="${n(0.54 * (0.7 / f) ** 4.0, 3)}"/>`
    )
    .concat(`<stop offset="1" stop-color="${coronaOuter}" stop-opacity="0"/>`)
    .join("\n");
  const coronaDefs = `${fade("ea-fs", 2.3, corona, 1.6)}
${fade("ea-fm", 4.2, corona, 1.3)}
${fade("ea-fl", 7.5, coronaOuter, 1.05)}
<radialGradient id="ea-inner" cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 2.3)}" gradientUnits="userSpaceOnUse" gradientTransform="translate(${n(cx)} ${n(cy)}) rotate(${eqDeg}) scale(1.32 0.94) rotate(${n(-eqDeg)}) translate(${n(-cx)} ${n(-cy)})">
${innerStops}
</radialGradient>
<radialGradient id="ea-limb" cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 1.3)}" gradientUnits="userSpaceOnUse">
  <stop offset="${n(1 / 1.3, 3)}" stop-color="${corona}" stop-opacity="0.3"/>
  <stop offset="${n(1.03 / 1.3, 3)}" stop-color="${corona}" stop-opacity="0.15"/>
  <stop offset="${n(1.08 / 1.3, 3)}" stop-color="${corona}" stop-opacity="0.06"/>
  <stop offset="${n(1.16 / 1.3, 3)}" stop-color="${corona}" stop-opacity="0.016"/>
  <stop offset="1" stop-color="${corona}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ea-wash" cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 6)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${coronaOuter}" stop-opacity="0.1"/>
  <stop offset="0.3" stop-color="${coronaOuter}" stop-opacity="0.04"/>
  <stop offset="0.65" stop-color="${coronaOuter}" stop-opacity="0.008"/>
  <stop offset="1" stop-color="${coronaOuter}" stop-opacity="0"/>
</radialGradient>
<filter id="ea-soft" filterUnits="userSpaceOnUse" x="${n(cx - R * 8)}" y="${n(cy - R * 8)}" width="${n(R * 16)}" height="${n(R * 16)}">
  <feGaussianBlur stdDeviation="${n(R * 0.07, 2)}"/>
</filter>
<filter id="ea-hair" filterUnits="userSpaceOnUse" x="${n(cx - R * 4)}" y="${n(cy - R * 4)}" width="${n(R * 8)}" height="${n(R * 8)}">
  <feGaussianBlur stdDeviation="${n(R * 0.018, 2)}"/>
</filter>`;

  // Helmet streamers: a broad bulb over the limb pinching into a long stalk.
  // Clustered near the equator, east and west deliberately unequal.
  const hs = rngFrom(`${key}-helmets`);
  const helmets: string[] = [];
  const helmetSpecs: Array<[number, number, number, number]> = [
    // angle offset from the equator (deg), length (R), cone half-angle (deg), opacity
    [3, 3.4, 10, 0.26], // equatorial wings are the longest (solar minimum)
    [-9, 2.3, 8, 0.17],
    [15, 2.0, 7, 0.15],
    [180 - 5, 3.0, 11, 0.24],
    [180 + 10, 2.4, 8, 0.17],
    [180 - 18, 1.9, 7, 0.14],
    [90 - 5, 1.45, 6, 0.1], // short polar brushes
    [90 + 14, 1.25, 6, 0.08],
    [-90 + 3, 1.45, 6, 0.1],
    [-90 - 13, 1.25, 6, 0.08],
  ];
  for (const [off, len, half, op] of helmetSpecs) {
    const a = eq + ((off + (hs() - 0.5) * 4) * Math.PI) / 180;
    const uT = R * len * (0.92 + 0.16 * hs());
    const wb = R * Math.sin((half * Math.PI) / 180);
    const lean = (hs() < 0.5 ? -1 : 1) * (0.03 + 0.03 * hs());
    const us = [0.55, 0.85, 1.0, 1.2, 1.45, 1.75, 2.0, 2.4, 2.9, 3.4]
      .map(f => f * R)
      .filter(u => u < uT * 0.97);
    us.push(uT);
    // A straight cone: widest at the limb, tapering to a point (soft because
    // the radial fade and the blur take the tip away before the geometry ends).
    const w = (u: number) => {
      if (u <= R) return wb * (0.75 + 0.25 * (u / R));
      return wb * Math.max(0, 1 - (u - R) / (uT - R)) ** 1.15 * (1 - 0.35 * ((u - R) / (uT - R)));
    };
    // The long wings fade with the far-reaching gradient, the rest sooner.
    const grad = len > 2.6 ? "ea-fl" : "ea-fm";
    // Radial and straight: a gentle lean, no S-curves, no curls.
    const bend = (u: number) => (lean * Math.max(0, u - R) ** 2) / (uT || 1);
    helmets.push(
      `<path d="${streamerPath(cx, cy, a, us, w, bend)}" fill="url(#${grad})" opacity="${n(op, 2)}"/>`
    );
    // A narrower, brighter core inside each helmet — overlapping, never one edge.
    const wi = (u: number) => w(u) * 0.48;
    helmets.push(
      `<path d="${streamerPath(cx, cy, a + (hs() - 0.5) * 0.03, us, wi, bend)}" fill="url(#${grad})" opacity="${n(op * 0.9, 2)}"/>`
    );
  }

  // Fine filaments: thin tapered rays everywhere, densest in the streamer
  // belts, sparse at the poles where plumes take over. Unblurred.
  const fr = rngFrom(`${key}-filaments`);
  const lenNoise = fbm1D(fr, 3);
  const filaments: string[] = [];
  const lens = (
    a: number,
    base: number,
    length: number,
    spread: number,
    grad: string,
    op: number
  ) => {
    const uT = R + length;
    const us = [0.8, 1.0, 1 + (length / R) * 0.35, 1 + (length / R) * 0.7].map(f => f * R);
    us.push(uT);
    const w = (u: number) => base * Math.max(0, 1 - Math.max(0, u - R) / length) ** 0.8;
    // Super-radial fanning: away from the pole the field line bends outward.
    const curl = (fr() - 0.5) * 0.25;
    const bend = (u: number) =>
      (spread * Math.max(0, u - R) ** 2) / length +
      (curl * Math.max(0, u - R) ** 2) / (length * 1.5);
    filaments.push(
      `<path d="${streamerPath(cx, cy, a, us, w, bend)}" fill="url(#${grad})" opacity="${n(op, 2)}"/>`
    );
  };
  for (let k = 0; k < 40; k++) {
    const a = eq + fr() * Math.PI * 2;
    const lat = Math.abs(Math.sin(a - eq)); // 0 equator … 1 pole
    if (lat > 0.55) continue;
    const belt = 1 - lat;
    const length =
      R * (0.5 + 1.2 * belt ** 2 * (0.6 + 0.4 * lenNoise(k * 0.37))) * (0.6 + 0.5 * fr());
    lens(
      a,
      R * (0.014 + 0.02 * fr()),
      length,
      0,
      belt > 0.75 ? "ea-fm" : "ea-fs",
      0.07 + 0.1 * fr()
    );
  }
  // Polar plumes: short, fine, fanning away from each pole like dipole lines.
  for (const pole of [-1, 1]) {
    const pa = eq + (pole * Math.PI) / 2;
    for (let k = 0; k < 24; k++) {
      const off = (fr() * 2 - 1) * 0.62; // ±35°
      const a = pa + off;
      const length =
        R *
        (0.28 + 0.55 * fr() * (1 - Math.abs(off) * 0.6)) *
        (0.8 + 0.4 * (0.5 + 0.5 * lenNoise(10 + k)));
      lens(a, R * (0.012 + 0.016 * fr()), length, off * 0.45, "ea-fs", 0.08 + 0.12 * fr());
    }
  }

  layers.push({
    defs: coronaDefs,
    elements: `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 6)}" fill="url(#ea-wash)"/>
<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 3.1)}" fill="url(#ea-inner)"/>
<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 1.3)}" fill="url(#ea-limb)"/>
<g filter="url(#ea-soft)">${helmets.join("")}</g>
<g filter="url(#ea-hair)">${filaments.join("")}</g>`,
  });

  // ── Limb: chromosphere sliver + one prominence, then the disc over both ───
  {
    const la = eq + (38 * Math.PI) / 180; // lower-west limb, where the Sun returns
    const lx = cx + R * Math.cos(la);
    const ly = cy + R * Math.sin(la);
    const off = R * 0.011;
    const pa = la - (17 * Math.PI) / 180;
    const ca = Math.cos(pa);
    const sa = Math.sin(pa);
    const at = (u: number, v: number): Pt => ({ x: cx + u * ca - v * sa, y: cy + u * sa + v * ca });
    // A low, rounded hedgerow mound leaning slightly, plus a faint wisp above.
    const tongue = smoothPath([
      at(R * 0.97, -R * 0.05),
      at(R * 1.02, -R * 0.045),
      at(R * 1.05, -R * 0.022),
      at(R * 1.062, R * 0.006),
      at(R * 1.052, R * 0.03),
      at(R * 1.02, R * 0.042),
      at(R * 0.97, R * 0.04),
    ]);
    const wisp = smoothPath([
      at(R * 1.07, -R * 0.012),
      at(R * 1.082, R * 0.0),
      at(R * 1.08, R * 0.02),
      at(R * 1.068, R * 0.014),
      at(R * 1.07, -R * 0.012),
    ]);
    const bx = cx + R * ca;
    const by = cy + R * sa;
    layers.push({
      defs: `<radialGradient id="ea-chromo" cx="${n(lx)}" cy="${n(ly)}" r="${n(R * 0.34)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${halpha}" stop-opacity="0.85"/>
  <stop offset="0.45" stop-color="${halpha}" stop-opacity="0.35"/>
  <stop offset="1" stop-color="${halpha}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ea-prom" cx="${n(bx)}" cy="${n(by)}" r="${n(R * 0.14)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${mix(halpha, corona, 0.25)}" stop-opacity="1"/>
  <stop offset="0.6" stop-color="${halpha}" stop-opacity="0.85"/>
  <stop offset="1" stop-color="${halpha}" stop-opacity="0.45"/>
</radialGradient>
<radialGradient id="ea-disc" cx="${n(cx - R * 0.2)}" cy="${n(cy - R * 0.15)}" r="${n(R * 1.2)}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${discCentre}"/>
  <stop offset="1" stop-color="${disc}"/>
</radialGradient>`,
      elements: `<circle cx="${n(cx + off * Math.cos(la), 2)}" cy="${n(cy + off * Math.sin(la), 2)}" r="${n(R, 2)}" fill="url(#ea-chromo)"/>
<path d="${tongue}Z" fill="url(#ea-prom)"/>
<path d="${wisp}Z" fill="url(#ea-prom)" opacity="0.45"/>
<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R, 2)}" fill="url(#ea-disc)"/>`,
    });
  }

  // ── Land: one height field through the camera ─────────────────────────────
  const landKey = (part: string) => rngFrom(`${key}-land-${part}`);
  const nPlain = [0, 1, 2, 3, 4].map(i => valueNoise2D(landKey(`plain${i}`), 64));
  const nRange = [0, 1, 2, 3, 4].map(i => valueNoise2D(landKey(`range${i}`), 64));
  const nSwell = valueNoise2D(landKey("swell"), 64);
  const nMid = [0, 1, 2, 3].map(i => valueNoise2D(landKey(`mid${i}`), 64));
  const nAmp = valueNoise2D(landKey("amp"), 64);
  /**
   * Fractal noise whose octaves fade out once they are too small on screen at
   * distance z. The ground is seen at a grazing angle (eye 2 m), so a bump of
   * length λ is focal·λ/z wide but only focal·λ·eye/z² tall: on the plain
   * (`ground`) the limit uses that full foreshortening, so no octave thinner
   * than ~20–48 px (at 2160 high) survives to alias against the depth slices as stacked
   * horizontal streaks (review 3D1-11); the low mid-distance hills use it as
   * well. The far range (`ground` false) keeps the milder limit, so the
   * skyline keeps its detail.
   * (u, v) is where the noise is sampled; z only sets the limit.
   */
  const bandLimited = (
    layersN: Array<(x: number, z: number) => number>,
    u: number,
    v: number,
    z: number,
    base: number,
    ground = false
  ) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let f = base;
    const fore = ground ? Math.min(1, cam.eye / z) : Math.min(1, Math.sqrt((3 * cam.eye) / z));
    for (const nz of layersN) {
      const px = (cam.focal / (f * z)) * fore;
      const w = ground ? smooth(20, 48, px) : smooth(30, 64, px);
      if (w > 0) sum += amp * w * nz(u * f, v * f);
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };
  // The plain's swales run obliquely, ~32° across the line of sight and twice
  // as long as they are wide, so their lit backs project as slanted, tapered
  // lenses converging toward their own vanishing point, never as rules
  // parallel to the horizon. Their amplitude wanders at a broad scale.
  const OB = (32 * Math.PI) / 180;
  const obC = Math.cos(OB);
  const obS = Math.sin(OB);
  // The far range: low, rounded hills, heavier on the left (where the ring is
  // dim) and opening into broad, low saddles toward the bright right.
  const rangeMass = (x: number, z: number) => {
    const az = Math.atan2(x, z);
    return 0.65 + 0.55 * smooth(0.3, -0.6, az) - 0.25 * Math.exp(-(((az - 0.5) / 0.22) ** 2));
  };
  const height = (x: number, z: number) => {
    // Plain: broad oblique swales plus finer undulation, band-limited by
    // their foreshortened height on screen.
    const pu = x * obC + z * obS;
    const pv = (-x * obS + z * obC) * 0.5;
    const plainAmp = 0.5 * (0.72 + 0.28 * nAmp(x * 0.035, z * 0.035));
    let h = plainAmp * bandLimited(nPlain, pu, pv, z, 1 / 26, true) + 0.05;
    // Scattered low hills in the middle distance (z 35–95): only the tops of
    // the noise rise, so they stand apart instead of forming a stripe.
    const mz = smooth(28, 45, z) * smooth(105, 80, z);
    // Their low crests are seen nearly edge-on too, so they take the ground
    // limit: fine octaves stacked thin dark crest lines across the plain.
    if (mz > 0) h += mz * 4.5 * Math.max(0, bandLimited(nMid, x, z, z, 1 / 40, true) - 0.05) ** 1.4;
    // Near swell (z 6–20): a chain of low hummocks on the left, the dark and
    // calm ground under the text, dying out before the centre so the lit
    // plain runs down to the frame toward the ring's peak. Its crest wanders
    // in distance and height, so the light caught on its back slope breaks
    // into tapered pieces instead of one ruled line.
    const swellAmp =
      smooth(5, -3, x) *
      ((0.75 + 0.45 * smooth(-2, -12, x)) * (0.75 + 0.45 * nSwell(x * 0.09, 0.5)) +
        0.15 * nSwell(x * 0.3, 7.5));
    const swellZ = 11.5 + 3.5 * nSwell(x * 0.04, 3.7);
    const swellW = 4.2 + 1.4 * nSwell(x * 0.05, 9.1);
    h += Math.max(0, swellAmp) * Math.exp(-(((z - swellZ) / swellW) ** 2));
    // Far range from z ≈ 110: rounded hills, never alpine crests. The ridges
    // grow toward the back, so the farthest slice stays the skyline in every
    // column.
    const rz = smooth(105, 175, z) * (0.55 + 0.45 * smooth(140, 300, z));
    if (rz > 0) {
      const shape = 0.5 + 0.5 * bandLimited(nRange, x, z * 0.6, z * 0.6, 1 / 70);
      h += rz * rangeMass(x, z) * (2.5 + 20 * shape ** 1.6);
    }
    return h;
  };

  // Keep the farthest slice the skyline in at least a fifth of the columns
  // (the noise is keyed per mode): pull the far distance in until it is, so
  // no slices are spent on range hidden behind a nearer ridge everywhere.
  const skylineShare = (zf: number) => {
    const COLS = 64;
    let seen = 0;
    for (let i = 0; i < COLS; i++) {
      const u = ((i + 0.5) / COLS - 0.5) * (W / cam.focal); // x per unit z
      const angle = (z: number) => (height(u * z, z) - cam.eye) / z;
      const far = angle(zf);
      let hidden = false;
      for (let z = zf * 0.97; z > 15 && !hidden; z *= 0.97) hidden = angle(z) > far;
      if (!hidden) seen++;
    }
    return seen / COLS;
  };
  let zFar = 300;
  while (zFar > 130 && skylineShare(zFar) < 0.2) zFar -= 15;

  // Haze per azimuth: the air is lit where the ring is bright.
  const atmZ = { visibility: 80, max: 0.55 };
  const airAt = (az: number) => mix(airNavy, airWarm, glowAt(az) ** 1.4);
  // Light from a coarser surface than the silhouette (as mandarian's
  // lightAt): a slice's colour is constant downward, so any change of n·L at
  // the scale of a few samples would be extruded into thin horizontal rules
  // under this 2° raking light. The normal is taken over a footprint of
  // ±4.5 % of the distance (≥ 0.35 m), a low-pass on the shading only.
  const Ln = norm3(L);
  const lightAt = (x: number, z: number) => {
    const e = Math.max(0.35, 0.045 * z);
    const dx = (height(x + e, z) - height(x - e, z)) / (2 * e);
    const dz = (height(x, z + e) - height(x, z - e)) / (2 * e);
    const nn = norm3([-dx, 1, -dz]);
    return {
      lam: Math.max(0, nn[0] * Ln[0] + nn[1] * Ln[1] + nn[2] * Ln[2]),
      up: Math.max(0, nn[1]),
    };
  };
  const terrain = slicesDP({
    id: "ea-t",
    cam,
    // Haze is applied in `surface` (it depends on the azimuth), so the
    // helper's own single-colour haze is switched off.
    atm: { haze: airNavy, visibility: 1, max: 0 },
    height,
    light: L,
    zNear: 2.5,
    zFar,
    candidates: 3000,
    // ≤ 3 px of constant colour per strip (at 3840 wide) everywhere: the
    // plain has no occlusion, so every kept slice is a full-width strip.
    maxBand: 3,
    samples: 420,
    // sRGB 0–1: on near-black ground a coarser fit reads as stacked arcs.
    tolerance: 1.2 / 255,
    surface: (_lam, x, z) => {
      const az = Math.atan2(x, z);
      const { lam, up } = lightAt(x, z);
      // Skylight from the navy dome on faces turned up; the ring's raking
      // light (scaled by how bright the ring is behind this direction).
      const base = mix(ink, inkSky, up ** 6 * 0.35);
      const lift = Math.min(1, lam * 4.5) ** 1.1;
      const body = mix(base, landLit, lift);
      const hz = Math.min(atmZ.max, 1 - Math.exp(-z / atmZ.visibility));
      return mix(body, airAt(az), hz);
    },
  });
  layers.push(terrain);

  layers.push(grainBrick("ea-grain", W, H, corona, 0.035));
  return mergeBricks(layers);
}

export function composeEclipse(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(eclipseMotif(p), p);
}
