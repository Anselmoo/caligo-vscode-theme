/**
 * Alpine valley at first light — the 3D reference scene.
 *
 * Theme: ships for **Deep Sable** since the seed swap of 2026-10-21 (see the
 * registry in src/wallpaper/compose.ts). The file keeps its historical name
 * `mandarian.ts` because spike/scene-brief.md and scene3d.ts cite it as the
 * reference implementation of the 3D method. Deep Sable's cool blue-violet
 * night gives the snow and shadow faces their tone; the warm horizon glow is
 * the palette's warmest hue, so the scene still works on a cool palette.
 *
 * Concept: the sun is just below the far range, right of centre. The sky
 * climbs from deep night blue to a warm glow pooled on the horizon, and a
 * river winds out of the valley toward the viewer, mirroring that glow.
 *
 * World (x right, y up, z away; 1 unit ≈ 100 m): one height field, a ridged
 * multifractal whose amplitude grows from low forested slopes near the viewer
 * (z ≈ 2–8) to a tall range from mid distance on (z ≈ 34–70). A valley is
 * carved along the river's centre line; the river is the part of the valley
 * floor below the water line. Conifer forest covers the land below a tree
 * line that wanders with its own noise at two scales.
 *
 * Camera: eye 3 units above the valley floor. Landscape frames keep the
 * approved monitor lens (focal 0.62 H, horizon 0.58), so the tablet shows the
 * central 75 % of the monitor's view. Portrait gets a wide lens (≈77°
 * horizontal) and a horizon at 0.62, so the valley is not a narrow slot; the
 * glow pools and the river's reflection are sized by the lens, not the frame.
 *
 * Light: one low sun, right and beyond the range (Lambert, n·L). Faces turned
 * to it take the warm alpenglow, faces turned away sit in cold blue shadow,
 * and the crisp ridge between them follows from the geometry alone.
 *
 * Right range (east of the river, z ≈ 15–35 as seen): its camera-facing
 * slopes cannot see this sun, so with the light alone it read as one flat
 * blue mass (review 3D1-12). Three changes, masked to it so the left wall
 * is untouched: spur geometry in the height field (ridged noise stretched
 * along z, domain-warped, its own rng key), light from a finer surface
 * there (lod 1.5), and the bounce light of the sunlit left wall across the
 * valley (a second Lambert term toward the west), which models the spurs:
 * flanks turned to the wall warm up, flanks turned away stay blue.
 *
 * Atmosphere: aerial perspective toward an opaque cool air colour
 * (visibility 30, capped at 0.62), so the far range is hazed but stays solid.
 *
 * Rendering: adaptive depth slices (painter's algorithm), with three
 * measured fixes against the comb on the steep lit left wall and the strata
 * on the lower slopes:
 *   · the relief is band-limited per distance (no octave finer than ~4
 *     profile samples), so far crests lose their aliased micro-spikes;
 *   · the light is taken from a coarser surface than the silhouette, and
 *     near the viewer over a wider footprint (a low-pass in depth);
 *   · each slice's gradient is an error-bounded fit (terrainSlicesLocal).
 * Conifers are drawn only where they stand against something different:
 * sky, rock or water at the forest's edge; and in the near field, where each
 * tree is big enough to read against the slope behind it, as a stand
 * scattered in world space.
 *
 * Personal touch: the river's last bend catches the brightest light.
 */
import { converter, oklch } from "culori";
import { mergeBricks } from "../composer.js";
import { MODE_COMPOSERS } from "../modes/index.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "../types.js";
import {
  type Camera,
  coniferRow,
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
  mix,
  n,
  palest,
  rngFrom,
  shade,
  starField,
  tone,
} from "./shared.js";

// ─── Colour roles by value and hue (slot names do not describe hue) ──────────

function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** The candidate closest in hue to `target`, if chromatic enough and within `maxDh`. */
function nearestHue(cands: string[], target: number, minC: number, maxDh: number) {
  let best: string | undefined;
  let bestD = maxDh;
  for (const c of cands) {
    const o = oklch(c);
    if (!o || o.h === undefined || o.c < minC) continue;
    const d = hueDist(o.h, target);
    if (d <= bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Ridged multifractal (0 … ~1), band-limited. Same lattices and rng order as
 * scene3d's ridged2D, so the big forms are identical; but each octave fades
 * out smoothly once its lattice cell spans fewer than ~4 profile samples
 * (`dx` = world distance between samples at that depth). A hard cutoff would
 * leave a seam at a fixed distance, i.e. a new terrace line.
 */
function ridgedBandLimited(rng: () => number, octaves: number, base: number) {
  const layers = Array.from({ length: octaves }, () => valueNoise2D(rng));
  return (x: number, z: number, dx: number) => {
    let sum = 0;
    let amp = 0.5;
    let weight = 1;
    let freq = 1;
    for (const f of layers) {
      const cell = 1 / (base * freq); // world size of one lattice cell
      const keep = smooth(2.5, 5, cell / dx);
      if (keep <= 0) break; // finer octaves are finer still
      let s = 1 - Math.abs(f(x * base * freq, z * base * freq));
      s *= s;
      s *= weight;
      weight = Math.min(1, s * 2);
      sum += s * amp * keep;
      freq *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };
}

// ─── Depth slices (private copy of scene3d.terrainSlices, one change) ─────────

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

/**
 * scene3d.terrainSlices with one change in the gradient stops (candidate for
 * promotion). Upstream adds a stop only once the colour has drifted more than
 * `tolerance` from the previous stop, so a visible sample can show a colour
 * interpolated between distant stops, off by up to the tolerance. Where a
 * wall recedes across the screen (Mandarian's lit left wall), every column is
 * won by a different slice; each carries its own, uncorrelated error, and
 * side by side they read as fine vertical streaks. Here the stops are an
 * error-bounded fit: every visible sample (and its neighbours, which colour
 * the half column either side) is within `tolerance` of its true colour.
 */
function terrainSlicesLocal(o: SliceOptions): { defs: string; elements: string } {
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
    const near = (k: number) => visible[k] || visible[k - 1] || visible[k + 1];
    const keep = pts.map((_, k) => near(k) || k % 4 === 0 || k === S);
    const ks = pts.map((_, k) => k).filter(k => keep[k]);
    const outline = ks.map((k, i) => {
      if (near(k)) return pts[k];
      const from = ks[Math.max(0, i - 1)];
      const to = ks[Math.min(ks.length - 1, i + 1)];
      let low = pts[k].y;
      for (let j = from; j <= to; j++) low = Math.max(low, Math.min(front[j], cam.H) + 1);
      return { x: pts[k].x, y: low };
    });
    // The change: an error-bounded fit. Stops come from visible samples and
    // their neighbours, and a segment grows only while the interpolated colour
    // stays within `tol` of the true colour at every visible sample it spans.
    const E = pts.map((_, k) => k).filter(near);
    const cols = E.map(k => colour(k));
    const labs = cols.map(okl);
    const fits = (a: number, b: number) => {
      const xa = pts[E[a]].x;
      const span = pts[E[b]].x - xa || 1;
      for (let m = a + 1; m < b; m++) {
        if (!visible[E[m]]) continue;
        const t = (pts[E[m]].x - xa) / span;
        const A = labs[a];
        const B = labs[b];
        const M = labs[m];
        const d = Math.hypot(
          A[0] + (B[0] - A[0]) * t - M[0],
          A[1] + (B[1] - A[1]) * t - M[1],
          A[2] + (B[2] - A[2]) * t - M[2]
        );
        if (d > tol) return false;
      }
      return true;
    };
    const stopIdx = [0];
    let a = 0;
    for (let b = 2; b < E.length; b++) {
      if (!fits(a, b)) {
        a = b - 1;
        stopIdx.push(a);
      }
    }
    if (E.length > 1) stopIdx.push(E.length - 1);
    const stops = stopIdx
      .filter((v, i2, arr) => i2 === 0 || v !== arr[i2 - 1])
      .map(m => ({ sx: pts[E[m]].x, col: cols[m] }))
      .filter(
        (c2, i2, arr) => i2 === 0 || c2.sx > arr[i2 - 1].sx + 0.5 || c2.col !== arr[i2 - 1].col
      );
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

export function mandarianMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-mandarian-${part}`);
  const all = [
    c.accent,
    c.accentSoft,
    c.accentMuted,
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

  // ── Value plan. Hue follows the palette; lightness is guarded per role. ────
  // A cool palette (e.g. Deep Sable, monochromatic) may have no warm hue at
  // all: fall back to a desaturated palest colour instead of failing.
  const warmCands = all.filter(x => nearestHue([x], 55, 0.03, 50));
  const warmHaze = warmCands.length ? palest(warmCands) : tone(palest(all), 0.4);
  const glowHue = nearestHue([c.accent, c.accentSoft, ...all], 60, 0.06, 35) ?? warmHaze;
  const glow = keepLightness(mix(glowHue, warmHaze, 0.25), 0.66, 0.78);
  const glowCore = keepLightness(mix(glow, warmHaze, 0.55), 0.84, 0.9);
  const coolHue = nearestHue(all, 260, 0.04, 70);
  const cool = coolHue ? keepLightness(coolHue, 0.55, 0.75) : tone(warmHaze, 0.15);
  const roseHue = nearestHue(all, 20, 0.07, 45);
  const rose = roseHue ? keepLightness(tone(roseHue, 0.7), 0.5, 0.66) : mix(glow, cool, 0.5);

  const zenith = keepLightness(shade(tone(cool, 0.8), 0.32), 0.1, 0.14);
  const upper = keepLightness(mix(zenith, cool, 0.25), 0.2, 0.26);
  const lowSky = keepLightness(mix(upper, rose, 0.3), 0.3, 0.38);
  const horizonSky = keepLightness(mix(lowSky, glow, 0.35), 0.4, 0.48);

  // Rock: alpenglow on sunward faces, cold blue in shadow; air between ranges.
  const alpenglow = keepLightness(mix(glow, rose, 0.45), 0.58, 0.7);
  const rockShadow = keepLightness(mix(zenith, cool, 0.35), 0.17, 0.24);
  const air = keepLightness(mix(lowSky, cool, 0.25), 0.3, 0.38);
  const forest = keepLightness(mix(zenith, shade(c.bg, 0.5), 0.5), 0.05, 0.08);

  // ── One camera, one light, one atmosphere for the whole scene ─────────────
  // The viewer stands above a valley, looking up it toward the range.
  // Landscape frames keep the approved monitor camera (vertical FOV fixed, so
  // the tablet sees the central 75 %). Portrait gets its own wide lens
  // (~77° horizontal) and a lower horizon, so the valley is not a narrow slot.
  const portrait = W < H;
  const cam: Camera = portrait
    ? { W, H, horizon: 0.62, eye: 3, focal: W / (2 * 0.8) }
    : { W, H, horizon: 0.58, eye: 3, focal: 0.62 * H };
  // Screen sizes of sky objects scale with the focal length (constant angular
  // size); u = 1 on the monitor reference camera (focal 0.62 · 2160).
  const u = cam.focal / (0.62 * 2160);
  // Where the sun is about to rise: one fixed world direction, projected.
  const g = { x: W * (cam.cx ?? 0.5) + 384 * u, y: cam.horizon * H + 43.2 * u };
  const sunDir: [number, number, number] = [0.85, 0.35, 0.3]; // low sun right, beyond the range
  const atm = { haze: air, visibility: 30, max: 0.62 };
  const layers: BrickOutput[] = [];

  const pool = (
    id: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    col: string,
    op: number
  ): BrickOutput => ({
    defs: `<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientTransform="translate(0 ${n(cy * (1 - ry / rx))}) scale(1 ${n(ry / rx, 4)})" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${col}" stop-opacity="${n(op, 3)}"/>
  <stop offset="0.4" stop-color="${col}" stop-opacity="${n(op * 0.45, 3)}"/>
  <stop offset="0.75" stop-color="${col}" stop-opacity="${n(op * 0.12, 3)}"/>
  <stop offset="1" stop-color="${col}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#${id})"/>`,
  });

  // ── Sky ─────────────────────────────────────────────────────────────────────
  layers.push({
    defs: `<linearGradient id="md-sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${zenith}"/>
  <stop offset="0.3" stop-color="${mix(zenith, upper, 0.7)}"/>
  <stop offset="0.48" stop-color="${upper}"/>
  <stop offset="0.6" stop-color="${lowSky}"/>
  <stop offset="0.72" stop-color="${horizonSky}"/>
  <stop offset="1" stop-color="${horizonSky}"/>
</linearGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#md-sky)"/>`,
  });
  // Glow pools sized by the lens, not the frame: a frame-relative pool turns
  // into a round dome on a portrait screen (lesson 4), so it is also dimmer there.
  const glowOp = portrait ? 0.75 : 1;
  layers.push(pool("md-glow", g.x, g.y, 1536 * u, 432 * u, glow, 0.55 * glowOp));
  layers.push(pool("md-glow2", g.x, g.y + 21.6 * u, 537.6 * u, 108 * u, glowCore, 0.6 * glowOp));
  layers.push(
    starField({
      id: "md-st",
      width: W,
      horizonY: 0.42 * H,
      count: 170,
      tints: [cool, warmHaze].map(t => keepLightness(t, 0.82, 0.95)),
      rng: key("stars"),
    })
  );

  // ── Terrain: ridged alpine relief, a valley carved along the river ────────
  // Profile samples per slice. Where a ridge or wall recedes across the
  // screen, every sample column is won by a different slice, so the straight
  // chords between columns notch the crest into saw-teeth one column wide.
  // 840 columns over 3840 px halve those teeth (measured: 420 → 840 → 1680
  // shrink them in step); scaled with the frame width, every platform gets
  // the same pixel pitch.
  const SAMPLES = Math.round((840 * W) / 3840);
  // Detail is band-limited against a fixed angular pitch (the approved
  // monitor look: 420 samples over 3840 px at focal 0.62 · 2160), so the
  // terrain is the same world on every platform and sample count.
  const sampleDx = (z: number) => (2 * ((3840 * 0.54) / (0.62 * 2160)) * z) / 420;
  const relief = ridgedBandLimited(key("terrain"), 6, 0.075);
  const sunX = (g.x - cam.W * 0.5) / cam.focal; // world x per unit z toward the glow
  const riverX = (z: number) => sunX * z * 0.9 + 0.9 * Math.sin(z * 0.3 + 1.5) * Math.min(1, 8 / z);
  const water = 0.02;
  // The right range (east of the river; what the camera sees of it lies at
  // z ≈ 15–35). Its camera-facing slopes turn away from the low sun, so it
  // read as one flat blue mass. It carries spur geometry, is lit from a
  // finer surface, and catches the bounce light of the sunlit left wall
  // (see lightAt). 0 on the left wall and the valley floor.
  const rightRange = (x: number, z: number) =>
    smooth(0.3, 1.5, (x - riverX(z)) / (0.9 + 0.12 * z)) * smooth(13, 20, z);
  // Spurs: ridged noise stretched along z, so the crests run down toward
  // the viewer and each spur has one flank facing the sunlit left wall (west)
  // and one facing east. Domain-warped so the spacing is irregular (no
  // barcode); cells ~3.5 units across, band-limited like the relief.
  const spurRng = key("spurs");
  const spurOct = [valueNoise2D(spurRng, 64), valueNoise2D(spurRng, 64)];
  const spurWarp = valueNoise2D(spurRng, 64);
  const spurs = (x: number, z: number, dx: number) => {
    const wx = x + 2.4 * spurWarp(x * 0.07, z * 0.07);
    let sum = 0;
    let amp = 1;
    let weight = 1;
    let fx = 1 / 3.5;
    let fz = 1 / 11;
    for (const f of spurOct) {
      const keep = smooth(2.5, 5, 1 / fx / dx);
      if (keep <= 0) break;
      let r = 1 - Math.abs(f(wx * fx, z * fz));
      r *= r;
      sum += r * amp * keep * weight;
      weight = Math.min(1, r * 1.6);
      fx *= 2.1;
      fz *= 2.1;
      amp *= 0.4;
    }
    return sum - 0.24; // ≈ the median, so the range keeps its height
  };
  // `lod` > 1 drops more fine octaves: the lighting uses a coarser surface
  // than the silhouette (see `lightAt`).
  const rawHeight = (x: number, z: number, lod = 1) => {
    // Forested slopes near the viewer, a tall range from mid distance on.
    const amp = 0.9 + 17 * smooth(8, 34, z);
    const valleyW = 0.9 + 0.12 * z;
    const d = Math.abs(x - riverX(z)) / valleyW;
    const floor = smooth(0.35, 2.2, d); // 0 on the valley floor, 1 on the flanks
    const dx = lod * sampleDx(z);
    const r = relief(x, z, dx);
    const mR = rightRange(x, z);
    // Spurs live on the mountain flanks, not on the low ground between.
    const spur = mR > 0 ? 0.15 * amp * mR * smooth(0.05, 0.3, r) * spurs(x, z, dx) : 0;
    return amp * r * floor + spur * floor + 0.25 * floor * Math.min(1, z / 10) - 0.15 * (1 - floor);
  };
  const height = (x: number, z: number) => Math.max(water, rawHeight(x, z));
  /** Surface normal from a central difference of width 2e on a surface of the given lod. */
  const normalAt = (x: number, z: number, e: number, lod = 1) => {
    const hh = (a: number, b: number) => Math.max(water, rawHeight(a, b, lod));
    const dx = (hh(x + e, z) - hh(x - e, z)) / (2 * e);
    const dz = (hh(x, z + e) - hh(x, z - e)) / (2 * e);
    const ny = 1 / Math.hypot(dx, 1, dz);
    return { dx, dz, ny };
  };
  const L = Math.hypot(...sunDir);
  /**
   * Lambert term for shading. A slice's colour is constant downward, so any
   * variation of the light along x at the scale of one or two profile samples
   * is extruded into vertical streaks (the comb on steep lit walls). The light
   * is therefore taken from a coarser surface (lod 3: no octave finer than
   * ~10 samples) over a wider footprint; the silhouette keeps every octave.
   * Near the viewer the footprint widens further, a low-pass in depth against
   * thin stacked strata where the slopes are seen almost edge-on.
   *
   * `bounce`: the sunlit left wall is a large warm secondary source for the
   * right range across the valley (direction BOUNCE, west and toward us).
   * The right range's camera-facing slopes cannot see the sun, so this
   * reflected light is what models their spurs and sub-ridges: flanks turned
   * toward the wall warm up, flanks turned away stay cold blue.
   */
  const BOUNCE: V3 = norm3([-0.9, 0.15, -0.35]);
  const lightAt = (x: number, z: number) => {
    // The right range is lit from a finer surface (lod 1.5, footprint 0.012 z)
    // so its spurs and sub-ridges shade; the left wall keeps lod 3.
    const mR = rightRange(x, z);
    const lod = 3 - 1.5 * mR;
    const e = Math.max(
      lod * sampleDx(z),
      (z < 12 ? 0.07 - 0.04 * smooth(8, 12, z) : 0.03 - 0.018 * mR) * z
    );
    const { dx, dz, ny } = normalAt(x, z, e, lod);
    const lam = Math.max(0, (-dx * sunDir[0] + sunDir[1] - dz * sunDir[2]) * (ny / L));
    const bounce = mR * Math.max(0, (-dx * BOUNCE[0] + BOUNCE[1] - dz * BOUNCE[2]) * ny);
    return { lam, bounce, ny };
  };
  const waterCol = keepLightness(mix(horizonSky, zenith, 0.5), 0.22, 0.28);

  // Conifer forest below the tree line on all but the steepest slopes.
  // The tree line wanders with noise at two scales: the fine one frays it,
  // the broad one lets forest tongues climb gullies and rock spurs reach down,
  // so the forest edge never runs along one contour (that reads as a hedge or
  // a mesa). Forest gives way to rock over a soft band.
  const lineNoise = valueNoise2D(key("treeline"), 64);
  const tongueNoise = valueNoise2D(key("tongues"), 64);
  const treeline = (x: number, z: number) =>
    1.6 + 0.1 * z + 1.1 * lineNoise(x * 0.35, z * 0.35) + 1.4 * tongueNoise(x * 0.09, z * 0.09);
  const forestAmount = (x: number, z: number, h: number, ny: number) =>
    smooth(0.45, -0.45, h - treeline(x, z)) * smooth(0.42, 0.62, ny);
  const trees = key("trees");
  const standRng = key("stand");

  // The river: drawn per slice band (so nearer banks still cover it) as one
  // smooth surface between the exact water-line crossings of both banks, all
  // pieces sharing one gradient — the glow's broad path, widening toward us.
  const bank = (z: number, side: -1 | 1) => {
    let a = riverX(z);
    let step = 0.05 + 0.01 * z;
    let b = a + side * step;
    while (rawHeight(b, z) <= water && Math.abs(b - a) < 8 + z) {
      a = b;
      step *= 1.3;
      b += side * step;
    }
    for (let i = 0; i < 18; i++) {
      const m = (a + b) / 2;
      if (rawHeight(m, z) <= water) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  const horizonY = cam.horizon * cam.H;
  // The nearest slice must reach the frame's bottom edge on every lens, or a
  // strip of flat slice colour shows below the last river piece.
  const zNear = Math.min(2.4, (0.95 * cam.focal * (cam.eye - water)) / (cam.H - horizonY));
  const pathTint = mix(waterCol, glowCore, 0.75);
  layers.push({
    defs: `<radialGradient id="md-rv" cx="${n(g.x)}" cy="${n(horizonY)}" r="${n(2376 * u)}" gradientTransform="translate(${n(g.x * 0.76)} 0) scale(0.24 1)" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${mix(pathTint, glowCore, 0.4)}"/>
  <stop offset="0.12" stop-color="${pathTint}"/>
  <stop offset="0.32" stop-color="${mix(pathTint, waterCol, 0.55)}"/>
  <stop offset="0.6" stop-color="${waterCol}"/>
  <stop offset="1" stop-color="${shade(waterCol, -0.2)}"/>
</radialGradient>`,
    elements: "",
  });
  type Top = { y: number; forest: boolean; top: number };
  const columns = Array.from({ length: SAMPLES + 1 }, () => [] as Top[]);
  const riverPiece = (z0: number, z1: number) => {
    // Overlap the farther piece slightly so no hairline seam shows.
    const zz = [z0 * 1.015, (z0 + z1) / 2, z1];
    const l = zz.map(z => project(cam, [bank(z, -1), water, z]));
    const r = zz.map(z => project(cam, [bank(z, 1), water, z]));
    if (r[0].x - l[0].x < 0.5 && r[2].x - l[2].x < 0.5) return "";
    const pts = [...l, ...r.reverse()];
    return `<path d="${relPath(pts)}Z" fill="url(#md-rv)"/>`;
  };

  /**
   * The near conifer stand between two kept slices (z1 < z0): trees scattered
   * in world (x, z), so they are not rows along slice lines (lesson 6); each
   * stands on the true ground and is sized by its own distance. Painted after
   * the farther slice and before the nearer one, so nearer ground hides their
   * feet. Density fades out by z ≈ 17, where the edge-only trees take over.
   */
  const stand = (z0: number, z1: number) => {
    const density = 26 * (1 - smooth(7, 17, (z0 + z1) / 2)); // trees per unit²
    const half = ((cam.W * 0.54) / cam.focal) * z0;
    const xc = ((cam.cx ?? 0.5) - 0.5) * (cam.W / cam.focal) * z0;
    let count = density * 2 * half * (z0 - z1);
    const found: Array<{ x: number; y: number; z: number; h: number; w: number; r: number[] }> = [];
    while (count > 0) {
      // Fractional remainders draw a tree with that probability.
      const draw = standRng() < Math.min(1, count);
      count -= 1;
      const zt = z1 + (z0 - z1) * standRng();
      const xt = xc + half * (2 * standRng() - 1);
      const hw = 0.16 + 0.27 * standRng() ** 1.3; // 16–43 m, most trees on the low side
      const r = Array.from({ length: 8 }, () => standRng());
      if (!draw) continue;
      const h0 = height(xt, zt);
      if (h0 <= water + 0.06) continue;
      if (forestAmount(xt, zt, h0, normalAt(xt, zt, 0.02 * zt).ny) < 0.6) continue;
      const base = project(cam, [xt, h0, zt]);
      const hp = (cam.focal * hw) / zt;
      if (base.y - hp > cam.H || base.x < -hp || base.x > cam.W + hp) continue;
      found.push({ x: base.x, y: base.y, z: zt, h: hp, w: hp * (0.26 + 0.08 * r[0]), r });
    }
    if (!found.length) return "";
    found.sort((a, b) => b.z - a.z); // far to near within the gap
    const parts = found.map(t => {
      // A spire of irregular branch tiers; finer tiers on bigger trees.
      const tiers = Math.max(3, Math.min(7, Math.round(t.h / 16)));
      const lean = (t.r[1] - 0.5) * t.w * 0.12;
      const side = (dir: 1 | -1, seed: number) => {
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < tiers; i++) {
          const uu = (i + 1) / tiers;
          const j = t.r[(seed + i) % 8];
          const outer = t.w * 0.5 * uu ** 0.85 * (0.82 + 0.36 * j);
          const yy = t.y + t.h * 0.06 - t.h * (1 - uu) * 0.94;
          pts.push({ x: t.x + lean * (1 - uu) + dir * outer, y: yy });
          if (i < tiers - 1)
            pts.push({
              x: t.x + lean * (1 - uu) + dir * outer * 0.38,
              y: yy - t.h * (0.05 + 0.03 * j),
            });
        }
        return pts;
      };
      const tip = { x: t.x + lean, y: t.y + t.h * 0.06 - t.h };
      return `${relPath([tip, ...side(1, 2), ...side(-1, 5).reverse()])}Z`;
    });
    const zm = (z0 + z1) / 2;
    return `<path d="${parts.join("")}" fill="${mix(forest, atm.haze, hazeAt(atm, zm))}"/>`;
  };

  const terrain = terrainSlicesLocal({
    id: "md-t",
    cam,
    atm,
    height,
    light: sunDir,
    zNear,
    zFar: 70,
    candidates: 3000,
    maxBand: z => (z < 12 ? 14 : 5),
    samples: SAMPLES,
    // Each slice fits its own piecewise-linear gradient; its error lands at
    // different x on neighbouring slices and reads as fine streaks, so the
    // fit is error-bounded (terrainSlicesLocal) and tight.
    tolerance: 0.01,
    surface: (_lam, x, z, h) => {
      if (h <= water + 1e-4) return waterCol;
      // Light and forest cover both read the coarse surface (see lightAt).
      const { lam: lit, bounce, ny } = lightAt(x, z);
      const rock = mix(rockShadow, alpenglow, Math.min(1, lit * 1.15 + 0.5 * bounce) ** 1.1);
      // Under the canopy the light only lifts the forest a little: the slope
      // reads through its trees, not through bands of lit ground.
      const woods = mix(forest, rock, 0.06 + 0.16 * lit ** 1.5);
      return mix(rock, woods, forestAmount(x, z, h, ny));
    },
    after: s => {
      let out = riverPiece(s.z, s.zNext);
      // Per screen column, a stack of painted slice tops (y, forest, top of
      // the unbroken forest run). A tree is drawn only where it stands
      // against something other than forest — sky, rock or water — because
      // inside the forest mass it would be invisible and only cost bytes.
      const tree = (cam.focal * 0.32) / s.z;
      const e = 0.02 * s.z;
      // Forest only where the surface colour is forest too: same tree line,
      // same slope limit, so no clump floats on bare rock.
      const land = (k: number) => {
        const h = s.hs[k];
        if (h <= water + 0.06 || h >= treeline(s.xs[k], s.z) - 0.2) return false;
        return forestAmount(s.xs[k], s.z, h, normalAt(s.xs[k], s.z, e).ny) > 0.55;
      };
      const forestHere: boolean[] = [];
      const against: boolean[] = [];
      s.pts.forEach((q, k) => {
        if (!s.visible[k]) return;
        const st = columns[k];
        while (st.length && st[st.length - 1].y >= q.y) st.pop();
        const above = st[st.length - 1];
        const runTop = above?.forest ? above.top : q.y;
        against[k] = !above?.forest || above.top > q.y - 0.7 * tree;
        forestHere[k] = land(k);
        st.push({ y: q.y, forest: forestHere[k], top: forestHere[k] ? runTop : q.y });
      });
      if (s.z < 24)
        out += coniferRow(cam, s, {
          hMin: 0.2,
          hMax: 0.45,
          colour: mix(forest, atm.haze, hazeAt(atm, s.z)),
          rng: trees,
          where: (_x, _h, k) => forestHere[k] === true && against[k] === true,
        });
      // Near the viewer the canopy itself is the texture: each tree is big
      // enough to stand against the slope behind it.
      if (s.z < 17) out += stand(s.z, s.zNext);
      return out;
    },
  });
  layers.push(terrain);

  layers.push(grainBrick("md-grain", W, H, warmHaze, 0.03));
  return mergeBricks(layers);
}

export function composeMandarian(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(mandarianMotif(p), p);
}
