/**
 * ObsidianGlow — wet basalt sea stacks in the last glow of night.
 *
 * Concept: volcanic black rock standing in still, dark water. A thin band of
 * last light lies on the horizon ahead-left; three sea stacks of columnar
 * basalt stand to the right of it, so the light rakes across them from
 * behind and every column face turned toward the band catches a glassy,
 * wet sheen while the rest of the rock stays black glass.
 *
 * World (x right, y up, z away; units ≈ metres):
 *   · Stacks: a few large columns each (5–7-sided prisms, ≈ 0.9–1.6
 *     across, on a jittered hex grid of 1.15), at z 90 / 45 / 25. Every
 *     corner is chamfered (a narrow face with the in-between normal), tall
 *     columns taper slightly. Each column head tilts with only 55 % of the
 *     slope of the stack's convex envelope (two or three spires), so
 *     the outline steps from column to column instead of rising in pointed
 *     saw-teeth; a few columns are broken off lower. A ring of low worn
 *     blocks forms the talus.
 *   · Water: the plane y = 0, a mirror with Schlick–Fresnel reflectance.
 *     Stacks and headland are reflected as the mirrored world (x, −y, z)
 *     through the same camera: lit faces in their own colour, all shadow
 *     faces of a stack in one shadow colour (per-facet tones read as
 *     coloured streaks in the water, review 3D2-02), smeared mostly
 *     vertically by the breeze. The share of the mirror image is the
 *     Fresnel reflectance of each water ROW (its distance f·eye/(y − horizon)),
 *     so the image fades from ≈0.8 at a stack's foot to ≈0.3 near the shore
 *     and never ends in a hard block. No foam strokes on the waterline.
 *   · A low headland far right at z ≈ 170–235 gives the horizon a second plane.
 *   · Beach: a black-sand height field from the bottom of the frame to a
 *     curving shoreline (a cove that recedes toward the band). At the
 *     waterline the wet sand is a film of water that takes the water's own
 *     colour and darkens into sand over a band of varying depth, so the
 *     shore is no crisp full-width edge over a dark strip (lesson 5).
 *
 * Camera: a low eye (1.0) close to the water. Monitor horizon 0.62, focal
 * 1.1 H; tablet horizon 0.60; mobile (portrait) horizon 0.64 with a ~64°
 * lens (focal = W / 1.25), so the near stack sits inside the right edge
 * (≈ 0.94 W) and the band stays in the left sixth. The viewer stands 4.3 from the waterline on monitor and
 * tablet (the bottom of the frame sees only z ≈ 2.9) and 1.6 on mobile.
 * Stacks and band are placed through `project`, never at screen fractions.
 *
 * Light: the band is an extended source on the horizon (core at azimuth
 * −24°, elevation 3°), sampled as four directions — the core plus its wash
 * at about −17°, −34° and +13° — each with its own weight. Shading is smooth
 * (Gouraud): every ring vertex has a normal (radial, blended with the
 * stack's mass normal), the light is evaluated at each face corner and
 * fitted as an affine function of screen position, which one linear
 * gradient renders exactly. Neighbouring faces therefore agree at their
 * shared edge and the columns read as weathered rounded prisms, not as flat
 * shards (review 3D2-02). Each light sample is switched on above its cast-
 * shadow line from the neighbouring columns over a wide penumbra, and cast
 * shadows keep 30 % of the light (wash and bounce), so a lit flank fades
 * downward instead of ending in a horizontal cut. A high-exponent
 * Blinn-Phong wet specular from the core adds the glassy sheen. The column
 * chamfers continue the colour of the faces below (no lighter cap block),
 * and a dark underlay per stack makes the seams between separately shaded
 * faces read as joints. Ambient is one value per column (not per facet).
 *
 * Atmosphere: haze toward the plum horizon sky, visibility ≈ 105 (the near
 * stack keeps its black-glass key, the far one sinks toward the sky).
 *
 * Personal touch: the band's reflection runs as a soft light path toward
 * the viewer between the stacks, its length and spread taken from the
 * glitter statistics of a nearly still sea, and the wet sand at the cove
 * picks it up once more.
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
  relPath,
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

interface Pt {
  x: number;
  y: number;
}

/** Keep a palette colour's chroma under a cap (hue and lightness unchanged). */
function capChroma(c: string, maxC: number): string {
  const ch = oklch(c)?.c ?? 0;
  return ch > maxC ? tone(c, maxC / ch) : c;
}

const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
/** Schlick's Fresnel reflectance of water for the cosine of the incidence angle. */
const fresnel = (cos: number) => 0.02 + 0.98 * (1 - Math.max(0, Math.min(1, cos))) ** 5;

// ─── World: three sea stacks (x, z of the centre; footprint radii; spires) ───

interface StackSpec {
  x: number;
  z: number;
  rx: number;
  rz: number;
  /** Height of the massive lower body; spires rise out of it. */
  body: number;
  spires: Array<{ dx: number; dz: number; h: number; r: number }>;
}

const STACKS: StackSpec[] = [
  {
    x: -6.6,
    z: 90,
    rx: 2.6,
    rz: 2.0,
    body: 2.4,
    spires: [
      { dx: -0.6, dz: 0.2, h: 8.2, r: 2.6 },
      { dx: 1.1, dz: -0.3, h: 5.6, r: 2.1 },
    ],
  },
  {
    x: 4.6,
    z: 45,
    rx: 3.0,
    rz: 2.3,
    body: 2.6,
    spires: [
      { dx: -1.0, dz: 0.3, h: 7.0, r: 2.3 },
      { dx: 0.8, dz: -0.2, h: 9.4, r: 2.9 },
    ],
  },
  {
    x: 9.2,
    z: 25,
    rx: 3.7,
    rz: 2.7,
    body: 2.8,
    spires: [
      { dx: -1.7, dz: 0.4, h: 5.8, r: 2.2 },
      { dx: 0.2, dz: 0, h: 9.2, r: 3.1 },
      { dx: 1.8, dz: -0.3, h: 7.4, r: 2.4 },
    ],
  },
];

/**
 * One basalt column: footprint polygon with chamfered corners, a slight
 * taper (the top ring is drawn in toward the axis), a top on the stack's
 * envelope and a rounded top edge.
 */
interface Prism {
  cx: number;
  cz: number;
  /** Footprint at the waterline; corners cut, so faces alternate wide/narrow. */
  ring: Array<[number, number]>;
  /** The same ring at the top, drawn in by the taper. */
  ringTop: Array<[number, number]>;
  /** Top height at each ring vertex and at the shrunken chamfer ring. */
  tops: number[];
  inner: Array<[number, number]>;
  innerTops: number[];
  cap: number;
  mean: number;
  r: number;
  stack: number;
}

/**
 * Convex height envelope of a stack at offset (dx, dz) from its centre. `w`
 * scales all distances (the footprint's wobble), so the outline follows the
 * spires instead of a fixed ellipse: no column ends in a vertical cut.
 */
function envelope(s: StackSpec, dx: number, dz: number, w: number): number {
  const rho = Math.hypot(dx / s.rx, dz / s.rz) / w;
  // Massive body: a low convex dome the spires rise out of.
  let h = rho < 1 ? s.body * (1 - rho * rho) : 0;
  for (const sp of s.spires) {
    const d = Math.hypot(dx - sp.dx, dz - sp.dz) / (sp.r * w);
    // (1 − d²)^1.4: a rounded, convex summit and upper flank (no concave
    // witch-hat), easing into a slight flare at the foot (the talus) instead
    // of ending in a vertical cut.
    if (d < 1) h = Math.max(h, sp.h * (1 - d * d) ** 1.4);
  }
  return h;
}

function buildStack(s: StackSpec, si: number, rng: () => number): Prism[] {
  // A few large columns (≈ 0.9–1.6 across) instead of a heap of small ones:
  // at 0.4 the flanks broke into flat-shaded shards (review 3D1-04).
  const S = 1.15;
  const outline = fbm1D(rng, 3); // footprint wobble by angle
  const out: Prism[] = [];
  const wobble = (dx: number, dz: number) =>
    1 + 0.1 * outline(Math.atan2(dz / s.rz, dx / s.rx) * 1.3 + si * 5);
  const ext = Math.max(s.rx, ...s.spires.map(q => Math.abs(q.dx) + q.r)) * 1.25;
  const extZ = Math.max(s.rz, ...s.spires.map(q => Math.abs(q.dz) + q.r)) * 1.25;
  const nx = Math.ceil(ext / S);
  const nz = Math.ceil(extZ / (S * 0.866));
  for (let j = -nz; j <= nz; j++)
    for (let i = -nx; i <= nx; i++) {
      const dx = (i + (j & 1) * 0.5) * S + (rng() - 0.5) * 0.3 * S;
      const dz = j * S * 0.866 + (rng() - 0.5) * 0.3 * S;
      const jit = rng();
      const broken = rng();
      const sizeR = rng();
      const k = 5 + Math.floor(rng() * 3);
      const base = rng() * Math.PI * 2;
      const angJ = Array.from({ length: k }, () => rng());
      const radJ = Array.from({ length: k }, () => rng());
      const capR = rng();
      const w = wobble(dx, dz);
      const e = envelope(s, dx, dz, w);
      // Talus: worn blocks in a sparse ring just outside the rock.
      const eT = envelope(s, dx, dz, w * 1.14);
      if (e < 0.25 && eT <= 0) continue;
      const talus = e < 0.25;
      if (talus && broken > 0.5) continue;
      // Tops stay on the one envelope surface (one weathered outline); only
      // a few columns are broken off lower (a few stepped tops). A column
      // standing proud read as a block perched on the summit.
      let off = 0;
      if (!talus) {
        off = (jit - 0.5) * 0.1;
        if (broken < 0.07) off -= 0.5 + 0.6 * jit;
      }
      // Slightly irregular widths, a few wider columns.
      const r = 0.56 * S * (0.86 + 0.4 * sizeR ** 2) * (talus ? 0.6 : 1);
      const poly: Array<[number, number]> = [];
      for (let q = 0; q < k; q++) {
        const th = base + (2 * Math.PI * q) / k + (angJ[q] - 0.5) * 0.4 * ((2 * Math.PI) / k);
        const rr = r * (0.9 + 0.2 * radJ[q]);
        poly.push([s.x + dx + rr * Math.cos(th), s.z + dz + rr * Math.sin(th)]);
      }
      // Chamfered corners: each vertex is cut back along both edges, so a
      // narrow face with the in-between normal rounds every column edge.
      const cut = talus ? 0.3 : 0.17;
      const ring: Array<[number, number]> = [];
      for (let q = 0; q < k; q++) {
        const [px, pz] = poly[q];
        const [ax, az] = poly[(q + k - 1) % k];
        const [bx, bz] = poly[(q + 1) % k];
        ring.push([px + (ax - px) * cut, pz + (az - pz) * cut]);
        ring.push([px + (bx - px) * cut, pz + (bz - pz) * cut]);
      }
      const cx = s.x + dx;
      const cz = s.z + dz;
      const talusH = 0.1 + Math.min(0.5, 0.14 * eT) * (0.4 + 0.6 * jit);
      const topAt = (x: number, z: number) => {
        if (talus) return talusH;
        const ddx = x - s.x;
        const ddz = z - s.z;
        return Math.max(0.15, envelope(s, ddx, ddz, wobble(ddx, ddz)) + off);
      };
      // Weathering tapers tall columns a little toward their tops.
      const taper = talus ? 0.8 : 1 - 0.07 * Math.min(1, e / 6) - 0.03 * jit;
      const ringTop = ring.map(([x, z]) => [cx + (x - cx) * taper, cz + (z - cz) * taper]) as Array<
        [number, number]
      >;
      // Column heads tilt with only 55 % of the envelope's slope, so the
      // outline steps from column to column like basalt instead of rising in
      // pointed saw-teeth (review 3D2-02); level heads (30 %) read as
      // castle crenellations.
      const hc = topAt(cx, cz);
      const tops = ringTop.map(([x, z]) => (talus ? hc : hc + 0.55 * (topAt(x, z) - hc)));
      const shrink = talus ? 0.45 : 0.6; // talus blocks are worn round
      const inner = ringTop.map(([x, z]) => [
        cx + (x - cx) * shrink,
        cz + (z - cz) * shrink,
      ]) as Array<[number, number]>;
      // The rounded top edge: wider than before, so column heads read soft.
      const cap = talus
        ? 0.55 * Math.min(...tops)
        : Math.min(0.2, 0.1 + 0.08 * capR, 0.3 * Math.min(...tops));
      const innerTops = inner.map(([x, z], q) =>
        talus ? tops[q] + cap * 0.3 : Math.max(hc + 0.55 * (topAt(x, z) - hc), tops[q] - cap * 0.4)
      );
      const mean = tops.reduce((a, b) => a + b, 0) / tops.length;
      out.push({ cx, cz, ring, ringTop, tops, inner, innerTops, cap, mean, r, stack: si });
    }
  return out;
}

/** Monotone-chain convex hull of screen points. */
function hull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cr = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: Pt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

export function obsidianGlowMotif(p: BrickParams): ComposedWallpaper {
  const { width: W, height: H } = p.viewBox;
  const c = p.colors;
  const key = (part: string) => rngFrom(`${p.seedId}-${p.harmonyMode}-obsidian-glow-${part}`);

  // ── Value plan (hue follows the palette; lightness is guarded) ────────────
  const bgL = lightness(c.bg);
  const light = keepLightness(
    capChroma(palest([c.functions, c.tags, c.strings, c.numbers, c.types]), 0.045),
    0.86,
    0.95
  );
  const zenith = shade(c.bg, 0.55);
  const horizonSky = keepLightness(mix(c.bg, light, 0.2), bgL + 0.06, bgL + 0.12);
  const band = keepLightness(capChroma(mix(c.bg, light, 0.7), 0.05), 0.62, 0.74);
  const rock = keepLightness(shade(c.bg, 0.38), 0.04, 0.06); // black glass
  // Lit rock and its wet sheen stay well below the band itself: a brighter
  // rim turned every lit column face into a glassy shard (review 3D1-04).
  const sheen = keepLightness(mix(band, light, 0.4), 0.56, 0.7);
  const litRock = keepLightness(mix(band, rock, 0.3), 0.3, 0.4);
  const waterLow = shade(c.bg, 0.42);

  // ── One camera, one light, one atmosphere ─────────────────────────────────
  const portrait = H > W;
  const tablet = !portrait && W / H < 1.5;
  const cam: Camera = portrait
    ? { W, H, horizon: 0.64, eye: 1, focal: W / 1.25 }
    : { W, H, horizon: tablet ? 0.6 : 0.62, eye: 1, focal: 1.1 * H };
  const hY = cam.horizon * H;
  const camPos: V3 = [0, cam.eye, 0];
  const az = Math.atan(-0.45); // the band: ahead-left
  const elev = (3 * Math.PI) / 180;
  const L: V3 = [Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)];
  const Lh = norm3([L[0], 0, L[2]]);
  const tanE = Math.tan(elev);
  // The band is a broad source: a crisp core plus its wide wash along the
  // horizon, sampled as a few directions (azimuth offset, weight). The core
  // alone gives the wet specular; the wash gives soft fill on the faces
  // turned front-left, each sample with its own cast shadows.
  const LIGHTS = [
    { da: 0, w: 1 },
    { da: -0.3, w: 0.55 },
    { da: -0.6, w: 0.32 },
    { da: 0.22, w: 0.4 },
  ].map(({ da, w }) => {
    const a = az + da;
    const dir: V3 = [Math.sin(a) * Math.cos(elev), Math.sin(elev), Math.cos(a) * Math.cos(elev)];
    return { dir, h: norm3([dir[0], 0, dir[2]]), w: w / 2.27 };
  });
  const atm = { haze: horizonSky, visibility: 105, max: 0.65 };
  const bandX = project(cam, [Math.sin(az) * 1000, 0, Math.cos(az) * 1000]).x;
  // The viewer's distance to the waterline (nearer on the tall mobile frame).
  const d0 = portrait ? 1.6 : 4.3;

  const layers: BrickOutput[] = [];

  // ── Sky (kept from the approved scene, now relative to the horizon) ───────
  const skyStops: Array<[number, string]> = [
    [0, zenith],
    [Math.min(0.4, cam.horizon - 0.15), mix(zenith, c.bg, 0.8)],
    [cam.horizon - 0.12, mix(c.bg, horizonSky, 0.55)],
    [cam.horizon, horizonSky],
    [1, horizonSky],
  ];
  const skyAt = (f: number) => {
    for (let i = 1; i < skyStops.length; i++) {
      const [f1, c1] = skyStops[i];
      const [f0, c0] = skyStops[i - 1];
      if (f <= f1) return mix(c0, c1, (f - f0) / Math.max(1e-6, f1 - f0));
    }
    return horizonSky;
  };
  const bandR = Math.max(W, H * 0.9) * 0.36;
  layers.push({
    defs: `<linearGradient id="og-sky" x1="0" y1="0" x2="0" y2="1">${skyStops
      .map(([f, col]) => `<stop offset="${n(f, 4)}" stop-color="${col}"/>`)
      .join("")}</linearGradient>
<radialGradient id="og-band" cx="${n(bandX)}" cy="${n(hY)}" r="${n(bandR)}" gradientTransform="translate(0 ${n(hY * 0.86)}) scale(1 0.14)" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${band}" stop-opacity="0.55"/>
  <stop offset="0.25" stop-color="${band}" stop-opacity="0.3"/>
  <stop offset="0.55" stop-color="${band}" stop-opacity="0.08"/>
  <stop offset="1" stop-color="${band}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="og-core" cx="${n(bandX)}" cy="${n(hY)}" r="${n(bandR * 0.28)}" gradientTransform="translate(0 ${n(hY * 0.97)}) scale(1 0.03)" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${light}" stop-opacity="0.22"/>
  <stop offset="0.4" stop-color="${light}" stop-opacity="0.08"/>
  <stop offset="1" stop-color="${light}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="og-wash" cx="${n(bandX)}" cy="${n(hY)}" r="${n(bandR * 1.25)}" gradientTransform="translate(0 ${n(hY * 0.65)}) scale(1 0.35)" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${band}" stop-opacity="0.08"/>
  <stop offset="0.5" stop-color="${band}" stop-opacity="0.02"/>
  <stop offset="1" stop-color="${band}" stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${W}" height="${H}" fill="url(#og-sky)"/>
<rect width="${W}" height="${H}" fill="url(#og-wash)"/>`,
  });
  layers.push(
    starField({
      id: "og-st",
      width: W,
      horizonY: hY * 0.9,
      count: portrait ? 150 : 200,
      tints: [light, keepLightness(mix(light, band, 0.4), 0.78, 0.92)],
      rng: key("stars"),
    })
  );
  const bandH = Math.min(H * 0.1, W * 0.056);
  layers.push({
    elements: `<rect x="0" y="${n(hY - bandH)}" width="${W}" height="${n(bandH)}" fill="url(#og-band)"/>
<rect x="0" y="${n(hY - H * 0.015)}" width="${W}" height="${n(H * 0.015)}" fill="url(#og-core)"/>`,
  });

  // ── Low stratus: thin, irregular, formless layers lit from below ──────────
  // (approved; positions now relative to the band and the horizon).
  {
    const crng = key("stratus");
    const defs: string[] = [];
    const els: string[] = [];
    const specs = [
      { x: 0.08, dy: 0.085, w: 0.34, op: 0.2 },
      { x: -0.1, dy: 0.14, w: 0.22, op: 0.13 },
      { x: 0.3, dy: 0.055, w: 0.26, op: 0.12 },
      { x: 0.14, dy: 0.2, w: 0.3, op: 0.07 },
      { x: 0.56, dy: 0.11, w: 0.2, op: 0.06 },
    ];
    const span = Math.min(W, H * 1.78);
    specs.forEach((s0, k) => {
      const cx = bandX + (s0.x + 0.03 * (crng() - 0.5)) * span;
      const cy = hY - (s0.dy + 0.012 * (crng() - 0.5)) * Math.min(H, W * 0.5625);
      const rx = s0.w * span * 0.6 * (0.85 + 0.3 * crng());
      const ry = Math.min(H, W * 0.5625) * (0.022 + 0.016 * crng());
      const near = Math.exp(-(((cx - bandX) / (span * 0.35)) ** 2));
      const col = mix(horizonSky, band, 0.25 + 0.6 * near);
      const id = `og-cl${k}`;
      defs.push(`<radialGradient id="${id}" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientTransform="translate(0 ${n(cy * (1 - ry / rx))}) scale(1 ${n(ry / rx, 4)})" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${col}" stop-opacity="${n(s0.op * (0.5 + 0.5 * near), 3)}"/>
  <stop offset="0.5" stop-color="${col}" stop-opacity="${n(s0.op * 0.35 * (0.5 + 0.5 * near), 3)}"/>
  <stop offset="1" stop-color="${col}" stop-opacity="0"/>
</radialGradient>`);
      els.push(
        `<rect x="${n(cx - rx)}" y="${n(cy - ry)}" width="${n(rx * 2)}" height="${n(ry * 2)}" fill="url(#${id})"/>`
      );
    });
    layers.push({ defs: defs.join("\n"), elements: els.join("") });
  }

  // ── Water: a Fresnel mirror of the sky ────────────────────────────────────
  // Per row the water reflects the sky at the mirrored elevation; Schlick's
  // reflectance falls from ~0.9 at the horizon to ~0.3 at our feet, so the
  // near water is darker. Scaled by 0.88 so a faint horizon line remains.
  {
    const stops: string[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) ** 2;
      const y = hY + (H - hY) * t;
      const dy = Math.max(0.5, y - hY);
      const z = (cam.focal * cam.eye) / dy;
      const R = 0.88 * fresnel(cam.eye / Math.hypot(cam.eye, z));
      const col = mix(waterLow, skyAt(Math.max(0, (2 * hY - y) / H)), R);
      stops.push(`<stop offset="${n(t, 4)}" stop-color="${col}"/>`);
    }
    layers.push({
      defs: `<linearGradient id="og-water" x1="0" y1="${n(hY)}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">${stops.join("")}</linearGradient>`,
      // The band halo is symmetric about the horizon, so the same gradients
      // drawn below the line are its mirror image (dimmed by the Fresnel R).
      elements: `<rect x="0" y="${n(hY)}" width="${W}" height="${n(H - hY)}" fill="url(#og-water)"/>
<rect x="0" y="${n(hY)}" width="${W}" height="${n(bandH)}" fill="url(#og-band)" opacity="0.7"/>
<rect x="0" y="${n(hY)}" width="${W}" height="${n(H * 0.015)}" fill="url(#og-core)" opacity="0.6"/>`,
    });
  }

  // ── The light path (personal touch) ───────────────────────────────────────
  // Glitter statistics (Cox–Munk) of a nearly still sea, slope rms SIGMA:
  // for a water point and the view vector V, a facet reflects the band when
  // its normal is the half vector of V and S; the chance of that slope gives
  // the radiance. The band is an extended source (azimuth spread, elevation
  // 0.4°–2.5°), integrated over a few directions. Per screen row we keep the
  // centroid, spread and peak, and paint one soft ellipse there: the path is
  // long and narrow far away and widens toward the viewer, by derivation.
  {
    const SIGMA = 0.05;
    const srcs: Array<{ s: V3; w: number }> = [];
    for (let a = -4; a <= 4; a++)
      for (const [e, we] of [
        [0.4, 0.5],
        [1.2, 0.35],
        [2.5, 0.15],
      ]) {
        const aa = az + (a / 4) * 0.09;
        const ee = (e * Math.PI) / 180;
        srcs.push({
          s: [Math.sin(aa) * Math.cos(ee), Math.sin(ee), Math.cos(aa) * Math.cos(ee)],
          w: we * Math.exp(-((a / 2) ** 2)),
        });
      }
    const glitter = (X: number, z: number) => {
      const V = norm3([-X, cam.eye, -z]);
      let sum = 0;
      for (const { s, w } of srcs) {
        const h = norm3([V[0] + s[0], V[1] + s[1], V[2] + s[2]]);
        if (h[1] <= 0) continue;
        const sx = h[0] / h[1];
        const sz = h[2] / h[1];
        const pr = Math.exp(-(sx * sx + sz * sz) / (2 * SIGMA * SIGMA));
        sum += (w * pr * fresnel(dot3(V, h))) / (h[1] ** 4 * Math.max(0.02, V[1]));
      }
      return sum;
    };
    const shoreY = hY + (cam.focal * cam.eye) / d0;
    const rows: Array<{ y: number; x: number; sd: number; I: number }> = [];
    const K = 22;
    for (let k = 0; k < K; k++) {
      const t = (k + 0.5) / K;
      const y = hY + (shoreY - hY) * t ** 1.5;
      const z = (cam.focal * cam.eye) / (y - hY);
      let s0 = 0;
      let s1 = 0;
      let s2 = 0;
      let peak = 0;
      for (let q = -60; q <= 60; q++) {
        const sx = bandX + (q / 60) * W * 0.35;
        const X = ((sx - W * (cam.cx ?? 0.5)) * z) / cam.focal;
        const g = glitter(X, z);
        s0 += g;
        s1 += g * sx;
        s2 += g * sx * sx;
        peak = Math.max(peak, g);
      }
      if (s0 <= 0) continue;
      const mx = s1 / s0;
      rows.push({ y, x: mx, sd: Math.sqrt(Math.max(1, s2 / s0 - mx * mx)), I: peak });
    }
    const Imax = Math.max(...rows.map(r => r.I));
    const defs: string[] = [];
    const els: string[] = [];
    rows.forEach((r, k) => {
      // Tone-map the radiance; fade fully before the shore and the text box.
      const fade = 1 - smooth(0.82, 1, (r.y - hY) / (shoreY - hY));
      const op = 0.3 * (1 - Math.exp((-3 * r.I) / Imax)) * fade;
      if (op < 0.004) return;
      const gap = k + 1 < rows.length ? rows[k + 1].y - r.y : r.y - rows[k - 1].y;
      const rx = Math.max(W * 0.02, 2.4 * r.sd);
      const ry = Math.max(gap * 2.2, H * 0.006);
      const id = `og-pt${k}`;
      defs.push(`<radialGradient id="${id}" cx="${n(r.x)}" cy="${n(r.y)}" r="${n(rx)}" gradientTransform="translate(0 ${n(r.y * (1 - ry / rx))}) scale(1 ${n(ry / rx, 4)})" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="${band}" stop-opacity="${n(op, 3)}"/>
  <stop offset="0.45" stop-color="${band}" stop-opacity="${n(op * 0.4, 3)}"/>
  <stop offset="1" stop-color="${band}" stop-opacity="0"/>
</radialGradient>`);
      els.push(
        `<rect x="${n(r.x - rx)}" y="${n(r.y - ry)}" width="${n(rx * 2)}" height="${n(ry * 2)}" fill="url(#${id})"/>`
      );
    });
    layers.push({ defs: defs.join("\n"), elements: `<g id="og-path">${els.join("")}</g>` });
  }

  // ── Headland: a low hazy ridge far right, and its reflection ──────────────
  {
    const hrng = key("headland");
    const wob = fbm1D(hrng, 3);
    const top: V3[] = [];
    const foot: V3[] = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      const x = 55 + 150 * t;
      const z = 235 - 65 * t;
      const hgt = 4.6 * Math.sin(Math.PI * Math.min(1, t * 1.3)) ** 0.7 + 0.5 * wob(t * 5);
      top.push([x, Math.max(0, hgt), z]);
      foot.push([x, 0, z]);
    }
    const hz = hazeAt(atm, 200);
    const col = mix(rock, atm.haze, hz);
    const refl = mix(skyAt(cam.horizon), col, 0.55);
    const up = top.map(q => project(cam, q)).filter(q => q.x < W * 1.2);
    const dn = top.map(q => project(cam, [q[0], -q[1], q[2]])).filter(q => q.x < W * 1.2);
    const base = foot.map(q => project(cam, q)).filter(q => q.x < W * 1.2);
    const close = [...base]
      .reverse()
      .map(q => `L${n(q.x)},${n(q.y)}`)
      .join("");
    // The mirror image is smeared vertically by the slight swell, so its
    // lower edge never reads as a second, hard band.
    const ry0 = Math.min(...base.map(q => q.y));
    const ry1 = Math.max(...dn.map(q => q.y));
    const sy = H * 0.003;
    layers.push({
      defs: `<filter id="og-hdb" filterUnits="userSpaceOnUse" x="${n(Math.min(...base.map(q => q.x)) - 20)}" y="${n(ry0 - 4 * sy)}" width="${n(W * 1.2)}" height="${n(ry1 - ry0 + 8 * sy)}"><feGaussianBlur stdDeviation="${n(sy * 0.3)} ${n(sy)}"/></filter>`,
      elements: `<path d="${smoothPath(dn)}${close}Z" fill="${refl}" filter="url(#og-hdb)"/>
<path d="${smoothPath(up)}${close}Z" fill="${col}"/>`,
    });
  }

  // ── Stacks: build the columns, then shade every face from its normal ──────
  const prisms = STACKS.flatMap((s, si) => buildStack(s, si, key(`stack${si}`)));
  // Hidden columns are not drawn but still cast shadows (kept for the rays).
  const allPrisms = [...prisms];
  // Painter's order: far → near by plan distance from the eye.
  prisms.sort((a, b) => Math.hypot(b.cx, b.cz) - Math.hypot(a.cx, a.cz));

  // Cull columns that nearer columns hide completely (bytes only where seen):
  // walk near → far keeping, per screen column, the covered span.
  {
    const covTop = new Float32Array(W + 1).fill(Number.POSITIVE_INFINITY);
    const covBot = new Float32Array(W + 1).fill(Number.NEGATIVE_INFINITY);
    const hidden = new Set<Prism>();
    for (let i = prisms.length - 1; i >= 0; i--) {
      const pr = prisms[i];
      const pts = [
        ...pr.ring.map(([x, z]) => project(cam, [x, 0, z])),
        ...pr.ringTop.map(([x, z], q) => project(cam, [x, pr.tops[q], z])),
        ...pr.inner.map(([x, z], q) => project(cam, [x, pr.innerTops[q], z])),
      ];
      const hl = hull(pts);
      const x0 = Math.max(0, Math.ceil(Math.min(...hl.map(q => q.x))));
      const x1 = Math.min(W, Math.floor(Math.max(...hl.map(q => q.x))));
      const tp: number[] = [];
      const bt: number[] = [];
      for (let x = x0; x <= x1; x++) {
        let lo = Number.POSITIVE_INFINITY;
        let hi = Number.NEGATIVE_INFINITY;
        for (let e = 0; e < hl.length; e++) {
          const a = hl[e];
          const b = hl[(e + 1) % hl.length];
          if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
          const y = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
          lo = Math.min(lo, y);
          hi = Math.max(hi, y);
        }
        tp.push(lo);
        bt.push(hi);
      }
      let covered = x1 >= x0;
      for (let x = x0; x <= x1 && covered; x++)
        if (!(covTop[x] <= tp[x - x0] - 1 && covBot[x] >= bt[x - x0] + 1)) covered = false;
      if (covered && x1 - x0 > 0) hidden.add(pr);
      for (let x = x0; x <= x1; x++) {
        if (!Number.isFinite(tp[x - x0])) continue;
        covTop[x] = Math.min(covTop[x], tp[x - x0]);
        covBot[x] = Math.max(covBot[x], bt[x - x0]);
      }
    }
    for (let i = prisms.length - 1; i >= 0; i--) if (hidden.has(prisms[i])) prisms.splice(i, 1);
  }

  // Cast shadows: a ray from a face toward the band; any column it passes
  // shades the face up to that column's top minus the light's climb.
  const shadowHeight = (self: Prism, px: number, pz: number, Lh: V3) => {
    let hs = 0;
    for (const o of allPrisms) {
      if (o === self || o.stack !== self.stack) continue;
      const ox = o.cx - px;
      const oz = o.cz - pz;
      const t = ox * Lh[0] + oz * Lh[2];
      if (t <= 0) continue;
      const perp = Math.abs(ox * Lh[2] - oz * Lh[0]);
      if (perp > o.r * 0.9) continue;
      hs = Math.max(hs, o.mean - t * tanE);
    }
    return hs;
  };

  const stackZ = STACKS.map(s => s.z);
  const stackTop = STACKS.map(s => Math.max(s.body, ...s.spires.map(q => q.h)));
  const yOf = (si: number, h: number) => hY + (cam.focal * (cam.eye - h)) / stackZ[si];
  // Faint sky ambient: faces turned toward the band see more of its glow;
  // lower rock sees less sky (occlusion by the cluster). Kept small so
  // shadow faces merge into black glass (lesson 10). One value per column
  // (from the stack's mass normal there): a value per facet gave every facet
  // its own tone, and in the water those tones became coloured streaks
  // (review 3D2-02).
  const ambient = (nrm: V3, jit: number) =>
    Math.round(
      (0.08 +
        0.12 * Math.max(0, 0.35 + 0.65 * dot3(nrm, Lh)) ** 1.5 +
        0.25 * Math.max(0, nrm[1]) +
        jit) *
        50
    ) / 50;
  const shadowCol = (si: number, amb: number, h: number) =>
    mix(
      mix(rock, horizonSky, amb * (0.6 + 0.4 * smooth(0, stackTop[si], h))),
      atm.haze,
      hazeAt(atm, stackZ[si])
    );
  /** Rock under ambient `amb`, irradiance `s` and the face's wet specular term. */
  const rockCol = (si: number, amb: number, h: number, s: number, spec: number) => {
    const lit = Math.min(1, s * 2.2);
    let col = mix(rock, horizonSky, amb * (0.6 + 0.4 * smooth(0, stackTop[si], h)));
    col = mix(col, litRock, lit);
    col = mix(col, sheen, Math.min(0.5, spec * 0.75 * lit));
    return mix(col, atm.haze, hazeAt(atm, stackZ[si]));
  };
  // Cast-shadow line of each light sample on a face (turned along nrm).
  const shadowLines = (pr: Prism, nrm: V3, px: number, pz: number, top: number) =>
    LIGHTS.map(l => (dot3(nrm, l.dir) > 0.02 ? shadowHeight(pr, px, pz, l.h) : top + 1));
  // Irradiance at a face corner from its vertex normal: each sample switched
  // on above its shadow line over a wide penumbra (a broad source on
  // weathered columns), so a lit flank fades out downward instead of ending
  // in a horizontal cut (review 3D2-02). Cast shadows keep 30 % of the
  // light (the band's wash reaches round a column, and the lit wet rock
  // bounces it), so a shadowed column in front of a lit one is a soft dark
  // joint, not a black crescent cut into it.
  const irr = (nv: V3, h: number, hs: number[]) =>
    LIGHTS.reduce(
      (e, l, i) =>
        e +
        l.w *
          Math.max(0, dot3(nv, l.dir)) *
          (hs[i] <= 0.05 ? 1 : 0.3 + 0.7 * smooth(hs[i] - 0.5, hs[i] + 1.2, h)),
      0
    );

  const defs: string[] = [];
  const sharedGrad = new Map<string, string>();
  const shared = (si: number, amb: number) => {
    const id = `og-g${si}-${Math.round(amb * 50)}`;
    if (!sharedGrad.has(id))
      sharedGrad.set(
        id,
        `<linearGradient id="${id}" x1="0" y1="${n(yOf(si, stackTop[si]))}" x2="0" y2="${n(yOf(si, 0))}" gradientUnits="userSpaceOnUse">${[
          0, 0.35, 0.7, 1,
        ]
          .map(
            f => `<stop offset="${f}" stop-color="${shadowCol(si, amb, stackTop[si] * (1 - f))}"/>`
          )
          .join("")}</linearGradient>`
      );
    return `url(#${id})`;
  };

  /**
   * Smooth (Gouraud) shading across one face: the light parameter `t` is
   * known at the face's corners; it is fitted as an affine function of
   * screen position, which one linear gradient renders exactly, so faces
   * meeting at a column edge share its colour and no facet reads as a flat
   * shard (review 3D2-02).
   */
  let quadId = 0;
  const shadeQuad = (cs: Pt[], t: number[], colour: (t: number) => string): string => {
    const m = cs.length;
    const mx = cs.reduce((a, q) => a + q.x, 0) / m;
    const my = cs.reduce((a, q) => a + q.y, 0) / m;
    const mt = t.reduce((a, v) => a + v, 0) / m;
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    let sxt = 0;
    let syt = 0;
    cs.forEach((q, i) => {
      const dx = q.x - mx;
      const dy = q.y - my;
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
      sxt += dx * (t[i] - mt);
      syt += dy * (t[i] - mt);
    });
    const det = sxx * syy - sxy * sxy;
    const t0 = Math.min(...t);
    const t1 = Math.max(...t);
    if (t1 - t0 < 0.004 || det < 1e-6 * (sxx + syy) ** 2) return colour(mt);
    const bx = (sxt * syy - syt * sxy) / det;
    const by = (syt * sxx - sxt * sxy) / det;
    const g2 = bx * bx + by * by;
    if (g2 < 1e-14) return colour(mt);
    const c0 = colour(t0);
    const c1 = colour(t1);
    if (c0 === c1) return c0;
    const id = `og-q${quadId++}`;
    defs.push(
      `<linearGradient id="${id}" x1="${n(mx + ((t0 - mt) * bx) / g2)}" y1="${n(my + ((t0 - mt) * by) / g2)}" x2="${n(mx + ((t1 - mt) * bx) / g2)}" y2="${n(my + ((t1 - mt) * by) / g2)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c0}"/><stop offset=".5" stop-color="${colour((t0 + t1) / 2)}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`
    );
    return `url(#${id})`;
  };

  interface Face {
    pts: V3[];
    fill: string;
    /** Flat colour for the mirrored (reflected) copy; "" = the stack's shadow. */
    flat: string;
    mirrorVisible: boolean;
    stack: number;
  }
  const faces: Face[] = [];
  const ambSum = STACKS.map(() => ({ a: 0, n: 0 }));
  const frng = key("faces");
  const prj = (q: V3) => project(cam, q);
  for (const pr of prisms) {
    const k = pr.ring.length;
    const jit = (frng() - 0.5) * 0.03;
    const local: Array<Face & { d: number }> = [];
    const centre: V3 = [pr.cx, 0, pr.cz];
    // The stack's mass normal here: outward from the stack's axis and
    // tilted up by its taper. Blended into every normal, so a flank turned
    // to the band lights as one mass and the joints read as subtle grooves.
    const st = STACKS[pr.stack];
    const out0 = norm3([(pr.cx - st.x) / st.rx ** 2, 0, (pr.cz - st.z) / st.rz ** 2]);
    const mass = norm3([out0[0], 0.35, out0[2]]);
    const amb = ambient(mass, jit);
    ambSum[pr.stack].a += amb;
    ambSum[pr.stack].n++;
    // Vertex normals: radial at each ring vertex, blended with the mass
    // normal, so the light turns smoothly round the column (a weathered,
    // rounded prism) and neighbouring faces agree at their shared edge.
    const vn = pr.ring.map(([x, z]) => {
      const r = norm3([x - pr.cx, 0, z - pr.cz]);
      return norm3([0.4 * r[0] + 0.6 * mass[0], 0.6 * mass[1], 0.4 * r[2] + 0.6 * mass[2]]);
    });
    const top = Math.max(...pr.tops);
    for (let q = 0; q < k; q++) {
      const q2 = (q + 1) % k;
      const [ax, az0] = pr.ring[q];
      const [bx, bz] = pr.ring[q2];
      const [ax2, az2] = pr.ringTop[q];
      const [bx2, bz2] = pr.ringTop[q2];
      const tA = pr.tops[q] - pr.cap;
      const tB = pr.tops[q2] - pr.cap;
      const mx = (ax + bx) / 2;
      const mz = (az0 + bz) / 2;
      // True facet normal of the tapered face (leans up a little).
      const u: V3 = [bx - ax, 0, bz - az0];
      const v: V3 = [ax2 - ax, tA, az2 - az0];
      let facet = norm3([
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ]);
      if (facet[0] * (mx - centre[0]) + facet[2] * (mz - centre[2]) < 0)
        facet = [-facet[0], -facet[1], -facet[2]];
      const nrm = norm3([
        0.3 * facet[0] + 0.7 * mass[0],
        0.3 * facet[1] + 0.7 * mass[1],
        0.3 * facet[2] + 0.7 * mass[2],
      ]);
      const midH = (tA + tB) / 4;
      const toCam = norm3([camPos[0] - mx, camPos[1] - midH, camPos[2] - mz]);
      const toMir = norm3([camPos[0] - mx, -camPos[1] - midH, camPos[2] - mz]);
      const vis = dot3(facet, toCam) > 0;
      const mVis = dot3(facet, toMir) > 0;
      if (!vis && !mVis) continue;
      const pts: V3[] = [
        [ax, 0, az0],
        [bx, 0, bz],
        [bx2, tB, bz2],
        [ax2, tA, az2],
      ];
      const hs = shadowLines(pr, nrm, mx + nrm[0] * 0.02, mz + nrm[2] * 0.02, top);
      const sC = [irr(vn[q], 0, hs), irr(vn[q2], 0, hs), irr(vn[q2], tB, hs), irr(vn[q], tA, hs)];
      let fill: string;
      let flat = "";
      if (Math.max(...sC) > 0.01) {
        const Hv = norm3([L[0] + toCam[0], L[1] + toCam[1], L[2] + toCam[2]]);
        const spec = Math.max(0, dot3(nrm, Hv)) ** 48;
        const colour = (s: number) => rockCol(pr.stack, amb, midH * 1.2, s, spec);
        fill = vis ? shadeQuad(pts.map(prj), sC, colour) : "";
        flat = colour(sC.reduce((a2, b2) => a2 + b2, 0) / 4);
      } else fill = shared(pr.stack, amb);
      local.push({
        pts,
        fill: vis ? fill : "",
        flat,
        mirrorVisible: mVis,
        stack: pr.stack,
        d: Math.hypot(mx, mz),
      });
    }
    // Chamfer faces: the rounded column edge. They continue the colour of the
    // side faces below them (same vertex normals, a whisper of sky), so the
    // head of a column never reads as a separate lighter cap block.
    const hsTop = shadowLines(pr, mass, pr.cx, pr.cz, top);
    for (let q = 0; q < k; q++) {
      const q2 = (q + 1) % k;
      const [ax, az0] = pr.ringTop[q];
      const [bx, bz] = pr.ringTop[q2];
      const [cx2, cz2] = pr.inner[q2];
      const [dx2, dz2] = pr.inner[q];
      const pts: V3[] = [
        [ax, pr.tops[q] - pr.cap, az0],
        [bx, pr.tops[q2] - pr.cap, bz],
        [cx2, pr.innerTops[q2], cz2],
        [dx2, pr.innerTops[q], dz2],
      ];
      const u: V3 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]];
      const v: V3 = [pts[3][0] - pts[0][0], pts[3][1] - pts[0][1], pts[3][2] - pts[0][2]];
      let nrm = norm3([
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ]);
      if (nrm[1] < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
      const m: V3 = [(ax + cx2) / 2, (pts[0][1] + pts[2][1]) / 2, (az0 + cz2) / 2];
      const toCam = norm3([camPos[0] - m[0], camPos[1] - m[1], camPos[2] - m[2]]);
      if (dot3(nrm, toCam) <= 0) continue;
      const sC = [
        irr(vn[q], pr.tops[q], hsTop),
        irr(vn[q2], pr.tops[q2], hsTop),
        irr(vn[q2], pr.innerTops[q2], hsTop),
        irr(vn[q], pr.innerTops[q], hsTop),
      ];
      const colour = (s: number) => rockCol(pr.stack, amb + 0.02, m[1], s, 0);
      const fill = shadeQuad(pts.map(prj), sC, colour);
      local.push({ pts, fill, flat: "", mirrorVisible: false, stack: pr.stack, d: 0 });
    }
    // Low talus columns show their top from above the eye line.
    if (Math.max(...pr.innerTops) < cam.eye - 0.05) {
      const pts = pr.inner.map(([x, z], q) => [x, pr.innerTops[q], z] as V3);
      local.push({
        pts,
        fill: shadowCol(pr.stack, amb, pr.innerTops[0]),
        flat: "",
        mirrorVisible: false,
        stack: pr.stack,
        d: -1,
      });
    }
    // Side faces back to front, then chamfers and caps on top.
    const sides = local.filter(f => f.d > 0).sort((a, b) => b.d - a.d);
    faces.push(...sides, ...local.filter(f => f.d === 0), ...local.filter(f => f.d < 0));
  }
  // One shadow colour per stack for its mirrored shadow faces: the reflection
  // carries only the stack's own tones, darkened, never per-facet streaks.
  const stackShadow = STACKS.map((_, si) =>
    shadowCol(si, ambSum[si].n ? ambSum[si].a / ambSum[si].n : 0.1, stackTop[si] * 0.5)
  );

  // Paint: consecutive faces of one fill share one path element.
  const paint = (list: Array<{ pts: Pt[]; fill: string }>) => {
    const out: string[] = [];
    let cur = "";
    let d = "";
    for (const f of list) {
      if (!f.fill) continue;
      if (f.fill !== cur && d) {
        out.push(`<path d="${d}" fill="${cur}"/>`);
        d = "";
      }
      cur = f.fill;
      d += `${relPath(f.pts)}Z`;
    }
    if (d) out.push(`<path d="${d}" fill="${cur}"/>`);
    return out.join("");
  };

  // Reflections: the mirrored world (x, −y, z) through the same camera, each
  // face in its own colour (the lit rim mirrors too). Physically the share of
  // the mirror image in the water is the Fresnel reflectance of the WATER
  // POINT, not of the stack: a row at screen y sees water at distance
  // z_w = f·eye/(y − horizon), and R(z_w) falls from ≈0.8 at the stack's foot
  // to ≈0.3 near the shore. So the image fades with distance below the
  // waterline by derivation (one luminance mask per frame), and the near
  // stack's long mirror image dies out before the beach instead of ending in
  // a straight-bottomed block. The breeze smears it mostly vertically.
  const shoreY0 = hY + (cam.focal * cam.eye) / d0;
  {
    const stops: string[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const y = hY + (shoreY0 - hY) * t ** 1.6;
      const zw = (cam.focal * cam.eye) / Math.max(0.5, y - hY);
      const R = 0.92 * fresnel(cam.eye / Math.hypot(cam.eye, zw));
      stops.push(
        `<stop offset="${n((y - hY) / (shoreY0 - hY), 4)}" stop-color="white" stop-opacity="${n(Math.min(1, R), 3)}"/>`
      );
    }
    defs.push(
      `<linearGradient id="og-rf" x1="0" y1="${n(hY)}" x2="0" y2="${n(shoreY0)}" gradientUnits="userSpaceOnUse">${stops.join("")}</linearGradient>`,
      `<mask id="og-rm" maskUnits="userSpaceOnUse" x="0" y="${n(hY)}" width="${W}" height="${n(H - hY)}"><rect x="0" y="${n(hY)}" width="${W}" height="${n(H - hY)}" fill="url(#og-rf)"/></mask>`
    );
  }
  const reflEls: string[] = [];
  STACKS.forEach((s, si) => {
    const list = faces
      .filter(f => f.stack === si && f.mirrorVisible)
      .map(f => ({
        pts: f.pts.map(q => project(cam, [q[0], -q[1], q[2]])),
        // The water darkens what it mirrors a little.
        fill: mix(waterLow, f.flat || stackShadow[si], 0.85),
      }));
    if (!list.length) return;
    const all = list.flatMap(f => f.pts);
    const bx0 = Math.min(...all.map(q => q.x));
    const bx1 = Math.max(...all.map(q => q.x));
    const by0 = Math.min(...all.map(q => q.y));
    const by1 = Math.min(H, Math.max(...all.map(q => q.y)));
    const sx = H * 0.0014;
    const sy = H * 0.006 * (25 / s.z) ** 0.3;
    const id = `og-rb${si}`;
    defs.push(
      `<filter id="${id}" filterUnits="userSpaceOnUse" x="${n(bx0 - 4 * sx)}" y="${n(by0 - 4 * sy)}" width="${n(bx1 - bx0 + 8 * sx)}" height="${n(by1 - by0 + 8 * sy)}"><feGaussianBlur stdDeviation="${n(sx)} ${n(sy)}"/></filter>`
    );
    reflEls.push(`<g filter="url(#${id})">${paint(list)}</g>`);
  });
  layers.push({ defs: "", elements: `<g id="og-refl" mask="url(#og-rm)">${reflEls.join("")}</g>` });

  // Per stack, far to near: a dark underlay of all its faces first, so the
  // anti-aliased seams between separately shaded faces show black glass (a
  // joint), never the sky behind.
  const bodies = STACKS.map((_, si) => si)
    .sort((a, b) => stackZ[b] - stackZ[a])
    .map(si => {
      const own = faces.filter(f => f.stack === si && f.fill);
      if (!own.length) return "";
      const under = own.map(f => `${relPath(f.pts.map(prj))}Z`).join("");
      return `<path d="${under}" fill="${stackShadow[si]}"/>${paint(own.map(f => ({ pts: f.pts.map(prj), fill: f.fill })))}`;
    })
    .join("");
  layers.push({
    defs: [...defs, ...sharedGrad.values()].join("\n"),
    elements: `<g id="og-stacks">${bodies}</g>`,
  });

  // ── Beach: black sand from the frame's bottom to a curving shoreline ──────
  // The shoreline is a world curve z_s(x): a cove that recedes toward the
  // band. The sand is a low height field shaded by the same light, with a
  // wet band near the water whose Blinn-Phong sheen picks up the band.
  {
    const brng = key("beach");
    const wob = fbm1D(brng, 3);
    const relief = valueNoise2D(brng, 64);
    const zs = (x: number) =>
      d0 *
      (1 +
        0.1 * smooth(-0.1, -0.9, x / d0) +
        0.04 * wob(x / d0 + 3) +
        0.06 * smooth(0.4, 1.2, x / d0));
    const sand = keepLightness(shade(rock, 0.9), 0.03, 0.05);
    const wetSand = mix(sand, waterLow, 0.35);
    const shore: Pt[] = [];
    for (let k = 0; k <= 40; k++) {
      const sx = -0.02 * W + (k / 40) * 1.04 * W;
      let X = ((sx - W * 0.5) * d0) / cam.focal;
      for (let it = 0; it < 4; it++) X = ((sx - W * 0.5) * zs(X)) / cam.focal;
      shore.push(project(cam, [X, 0, zs(X)]));
    }
    const zFar = Math.max(...shore.map(q => (cam.focal * cam.eye) / (q.y - hY))) + 0.3;
    const zNear = ((cam.focal * cam.eye) / (H - hY)) * 0.9;
    const height = (x: number, z: number) =>
      0.03 * (zs(x) - z) + 0.018 * relief(x * 2.2, z * 2.2) + 0.03 * relief(x * 0.5 + 9, z * 0.5);
    // The water's colour at screen row y (the og-water gradient, unhazed).
    const waterAt = (y: number) => {
      const zw = (cam.focal * cam.eye) / Math.max(0.5, y - hY);
      const R = 0.88 * fresnel(cam.eye / Math.hypot(cam.eye, zw));
      return mix(waterLow, skyAt(Math.max(0, (2 * hY - y) / H)), R);
    };
    const beach = terrainSlices({
      id: "og-bch",
      cam,
      atm,
      height,
      light: L,
      zNear,
      zFar,
      candidates: 1500,
      maxBand: 6 * (W / 3840),
      samples: 200,
      tolerance: 0.012,
      surface: (lam, x, z, h, nrm) => {
        const wet = 1 - smooth(0.05 * d0, 0.35 * d0, zs(x) - z);
        const V = norm3([-x, cam.eye - h, -z]);
        const Hv = norm3([L[0] + V[0], L[1] + V[1], L[2] + V[2]]);
        // Kept faint: the sheen falls inside the text box on monitor.
        const spec = Math.max(0, dot3(nrm, Hv)) ** 90;
        const dry = mix(sand, horizonSky, 0.08 + 0.5 * lam);
        const sandCol = mix(mix(dry, wetSand, wet), band, Math.min(0.1, spec * wet * 0.3));
        // At the waterline the wet sand is a film of water: it takes the
        // water's own colour and darkens into sand over a band of varying
        // depth, so the shore is no crisp edge over a uniform dark strip
        // (lesson 5, review 3D2-02).
        const film = 1 - smooth(0, (0.1 + 0.08 * (wob(x / d0 + 7) + 1)) * d0, zs(x) - z);
        return mix(sandCol, waterAt(project(cam, [x, h, z]).y), 0.95 * film);
      },
    });
    const clipD = `${smoothPath(shore)}L${n(W * 1.02)},${H}L${n(-W * 0.02)},${H}Z`;
    // No foam strokes on the waterline: thin bright crescents read as drawn
    // lines (lesson 1, review 3D1-05). The wet band's own sheen (above)
    // carries the shore, soft on both sides.
    layers.push({
      defs: `${beach.defs}
<clipPath id="og-bcl"><path d="${clipD}"/></clipPath>`,
      elements: `<g clip-path="url(#og-bcl)">${beach.elements}</g>`,
    });
  }

  layers.push(grainBrick("og-grain", W, H, light, 0.035));
  return mergeBricks(layers);
}

export function composeObsidianGlow(p: BrickParams): ComposedWallpaper {
  return (MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(obsidianGlowMotif(p), p);
}
