/**
 * Seed-mapped composition engine — v4.
 *
 * Each seed = one bold, full-screen fingerprint design.
 * Fewer elements, maximum visual impact.
 * Aurora stays; 9 other seeds each get a unique architectural effect.
 */

import {
  auroraAdvancedBrick,
  fractureBrick,
  lightningBrick,
  nebulaDustBrick,
  nebulaGlowBrick,
  particlesBrick,
  sparksBrick,
  starFieldBrick,
  topologyBrick,
  voronoiBrick,
} from "./bricks/index.js";
import { causticBrick, icecrackBrick, smokeWispBrick } from "./bricks/organic.js";
import { mergeBricks } from "./composer.js";
import type { BrickOutput, BrickParams, ComposedWallpaper } from "./types.js";

// ─── Scaffold: bg + optional ambient glow + effects ─────────────────────────

interface GlowBlob {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  opacity: number;
}

function scaffold(
  p: BrickParams,
  prefix: string,
  opts: {
    glows?: GlowBlob[];
    glowBlur?: number;
    effects: BrickOutput[];
    /** Skip the radial bgSoft gradient — use a pure flat bg colour only.
     *  Use when the effect itself provides all the luminance and the lifted
     *  centre glow would reduce contrast (e.g. aurora, deep-space scenes). */
    flatBg?: boolean;
  }
): ComposedWallpaper {
  const { viewBox, colors } = p;
  const { width, height } = viewBox;

  let bg: BrickOutput;
  if (opts.flatBg) {
    bg = {
      elements: `<rect width="${width}" height="${height}" fill="${colors.bg}"/>`,
    };
  } else {
    // Radial bgSoft bloom centred slightly high — objectBoundingBox percentages
    // so it scales correctly across all three canvas sizes.
    const bgGradId = `${prefix}-bg-grad`;
    bg = {
      defs: `<radialGradient id="${bgGradId}" cx="50%" cy="42%" r="72%">
  <stop offset="0%"   stop-color="${colors.bgSoft}"/>
  <stop offset="58%"  stop-color="${colors.bgSoft}" stop-opacity="0.45"/>
  <stop offset="100%" stop-color="${colors.bg}"     stop-opacity="0"/>
</radialGradient>`,
      elements: `<rect width="${width}" height="${height}" fill="${colors.bg}"/>
<rect width="${width}" height="${height}" fill="url(#${bgGradId})"/>`,
    };
  }
  const layers: BrickOutput[] = [bg];
  if (opts.glows?.length) {
    layers.push(
      nebulaGlowBrick(p, { id: `${prefix}-g`, blobs: opts.glows, blur: opts.glowBlur ?? 45 })
    );
  }
  layers.push(...opts.effects);

  // ── Global 3D depth lighting ─────────────────────────────────────────────
  // Directional key light: top-left highlight → bottom-right shadow.
  // Simulates an overhead light source at ~135° and adds perceived volume.
  const lgtId = `${prefix}-lgt`;
  layers.push({
    defs: `<linearGradient id="${lgtId}" x1="14%" y1="0%" x2="86%" y2="100%">
  <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.060"/>
  <stop offset="40%"  stop-color="#ffffff" stop-opacity="0.010"/>
  <stop offset="60%"  stop-color="#000000" stop-opacity="0.010"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0.068"/>
</linearGradient>`,
    elements: `<rect width="${width}" height="${height}" fill="url(#${lgtId})"/>`,
  });
  // Atmospheric vignette: transparent centre → dark corners.
  // Focuses the eye on the centre and makes the scene feel deep.
  const vigId = `${prefix}-vig`;
  layers.push({
    defs: `<radialGradient id="${vigId}" cx="50%" cy="50%" r="72%">
  <stop offset="0%"   stop-color="#000000" stop-opacity="0"/>
  <stop offset="56%"  stop-color="#000000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0.54"/>
</radialGradient>`,
    elements: `<rect width="${width}" height="${height}" fill="url(#${vigId})"/>`,
  });

  return mergeBricks(layers);
}

// ─── Liquid glass wave bands (kept for reference — not currently used) ───────

interface LiquidWaveBand {
  cy: number;
  color: string;
  opacity: number;
  phase: number;
}

function _liquidWaveBands(p: BrickParams, id: string, bands: LiquidWaveBand[]): BrickOutput {
  const { viewBox } = p;
  const { width, height } = viewBox;

  const defs: string[] = [];
  const elems: string[] = [];

  const blurId = `${id}-blur`;
  const blurSd = (height * 0.009).toFixed(1); // ~10 px at 1080p
  defs.push(
    `<filter id="${blurId}" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="${blurSd}"/></filter>`
  );

  const bandH = height * 0.38; // 38 % height — heavy overlap between layers
  const amp = height * 0.075; // ±7.5 % wave amplitude
  const steps = 100;

  for (let i = 0; i < bands.length; i++) {
    const { cy, color, opacity, phase } = bands[i];
    const cyPx = cy * height;
    const minY = cyPx - bandH / 2 - amp;
    const maxY = cyPx + bandH / 2 + amp;

    const topPts: string[] = [];
    const botRevPts: string[] = [];

    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const x = (t * width).toFixed(1);
      const topY = (
        cyPx -
        bandH / 2 +
        Math.sin(t * Math.PI * 3.1 + phase) * amp * 0.62 +
        Math.sin(t * Math.PI * 6.7 + phase * 1.3) * amp * 0.38
      ).toFixed(1);
      const botY = (
        cyPx +
        bandH / 2 +
        Math.sin(t * Math.PI * 2.8 + phase + 2.0) * amp * 0.68 +
        Math.sin(t * Math.PI * 5.3 + phase * 0.7) * amp * 0.32
      ).toFixed(1);
      topPts.push(`${j === 0 ? "M" : "L"} ${x},${topY}`);
      botRevPts.unshift(`L ${x},${botY}`);
    }

    const bodyPath = `${topPts.join(" ")} ${botRevPts.join(" ")} Z`;
    const topPath = topPts.join(" ");

    // Vertical gradient: white glint → colour body → transparent
    const gradId = `${id}-g${i}`;
    defs.push(
      `<linearGradient id="${gradId}" x1="0" y1="${minY.toFixed(1)}" x2="0" y2="${maxY.toFixed(1)}" gradientUnits="userSpaceOnUse">
  <stop offset="0%"   stop-color="#ffffff" stop-opacity="${(opacity * 0.55).toFixed(2)}"/>
  <stop offset="12%"  stop-color="${color}" stop-opacity="${opacity.toFixed(2)}"/>
  <stop offset="52%"  stop-color="${color}" stop-opacity="${(opacity * 0.38).toFixed(2)}"/>
  <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
</linearGradient>`
    );

    elems.push(`<path d="${bodyPath}" fill="url(#${gradId})" filter="url(#${blurId})"/>`);
    // White glass glint on top edge
    elems.push(
      `<path d="${topPath}" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="${(opacity * 0.55).toFixed(2)}" stroke-linecap="round"/>`
    );
    // Coloured outline — subtle refraction edge
    elems.push(
      `<path d="${bodyPath}" fill="none" stroke="${color}" stroke-width="0.7" opacity="${(opacity * 0.5).toFixed(2)}"/>`
    );
  }

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── Seeded PRNG (mulberry32) ────────────────────────────────────────────────

function _seedRng(seed: number) {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function _hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// ─── Full-canvas energy orb ───────────────────────────────────────────────────
// The orb is scaled so its sphere radius equals the canvas diagonal — meaning
// the rim clips at all four canvas edges and the interior fills the frame.
// You are looking at the inside of an energy sphere.
//
// Layers (bottom → top):
//   1. Hot-spot radial gradient at canvas centre
//   2. Wide neon ribbons (thick bezier arcs, blurred) — the glow body
//   3. Crisp neon tendrils (thin bezier arcs with white hot-core line)
//   4. Sphere rim ring (large circle whose stroke clips at canvas boundary)
//   5. Inner rim (slightly smaller, coloured)

function energyOrb(p: BrickParams, id: string): BrickOutput {
  const { viewBox, colors: c, seedId, harmonyMode } = p;
  const { width, height } = viewBox;
  const sc = Math.max(width, height) / 2160;
  const rng = _seedRng(_hashStr(`${seedId}-${harmonyMode}-eo-${id}`));

  const cx = width / 2;
  const cy = height / 2;
  // Sphere radius = diagonal/2 so the circumference passes through all 4 corners
  const R = Math.sqrt(width * width + height * height) / 2;

  const defs: string[] = [];
  const elems: string[] = [];

  // ── Central hot spot (radial gradient filling the sphere interior) ──────────
  const hotId = `${id}-hot`;
  defs.push(
    `<radialGradient id="${hotId}" cx="50%" cy="50%" r="50%">
  <stop offset="0%"   stop-color="#ffffff"     stop-opacity="0.52"/>
  <stop offset="18%"  stop-color="${c.hueCyan}" stop-opacity="0.38"/>
  <stop offset="45%"  stop-color="${c.accent}"  stop-opacity="0.18"/>
  <stop offset="100%" stop-color="${c.accent}"  stop-opacity="0"/>
</radialGradient>`
  );
  elems.push(
    `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(width * 0.42).toFixed(1)}" ry="${(height * 0.42).toFixed(1)}" fill="url(#${hotId})"/>`
  );

  // ── Ribbon blur filters ──────────────────────────────────────────────────────
  const wideBlurId = `${id}-wb`;
  defs.push(
    `<filter id="${wideBlurId}" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur stdDeviation="${(11 * sc).toFixed(1)}"/></filter>`
  );
  const thinBlurId = `${id}-tb`;
  defs.push(
    `<filter id="${thinBlurId}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${(3.5 * sc).toFixed(1)}"/></filter>`
  );

  const palette = [c.accent, c.hueBlue, c.hueCyan, c.huePurple, c.hueGreen, c.hueRed, c.hueOrange];

  // ── Wide glowing ribbons (6) — sweep edge-to-edge through the interior ───────
  for (let i = 0; i < 6; i++) {
    const color = palette[i % palette.length];
    const op = 0.3 + rng() * 0.28;
    const sw = (4.5 + rng() * 6.0) * sc;

    // Endpoints on the sphere rim (canvas edge region), control points near centre
    const a1 = rng() * Math.PI * 2;
    const a2 = a1 + Math.PI * (0.45 + rng() * 0.65);
    const x1 = cx + Math.cos(a1) * R * 0.92;
    const y1 = cy + Math.sin(a1) * R * 0.92;
    const x2 = cx + Math.cos(a2) * R * 0.92;
    const y2 = cy + Math.sin(a2) * R * 0.92;
    const off = R * (0.08 + rng() * 0.28);
    const ca1 = a1 + (rng() - 0.5) * 1.1;
    const ca2 = a2 + (rng() - 0.5) * 1.1;
    const cp1x = cx + Math.cos(ca1) * off;
    const cp1y = cy + Math.sin(ca1) * off;
    const cp2x = cx + Math.cos(ca2) * off;
    const cp2y = cy + Math.sin(ca2) * off;
    const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;

    elems.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${(sw * 4.5).toFixed(1)}" stroke-opacity="${(op * 0.28).toFixed(3)}" stroke-linecap="round" filter="url(#${wideBlurId})"/>`
    );
    elems.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-opacity="${op.toFixed(3)}" stroke-linecap="round"/>`
    );
  }

  // ── Thin crisp tendrils (14) — white hot-core + coloured outer line ──────────
  for (let i = 0; i < 14; i++) {
    const color = palette[i % palette.length];
    const op = 0.5 + rng() * 0.42;
    const sw = (0.9 + rng() * 1.4) * sc;

    const a1 = rng() * Math.PI * 2;
    const a2 = a1 + Math.PI * (0.28 + rng() * 0.85);
    const x1 = cx + Math.cos(a1) * R * (0.65 + rng() * 0.28);
    const y1 = cy + Math.sin(a1) * R * (0.65 + rng() * 0.28);
    const x2 = cx + Math.cos(a2) * R * (0.65 + rng() * 0.28);
    const y2 = cy + Math.sin(a2) * R * (0.65 + rng() * 0.28);
    const off = R * (0.04 + rng() * 0.2);
    const cp1x = cx + (rng() - 0.5) * off * 2;
    const cp1y = cy + (rng() - 0.5) * off * 2;
    const cp2x = cx + (rng() - 0.5) * off * 2;
    const cp2y = cy + (rng() - 0.5) * off * 2;
    const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;

    elems.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${(sw * 3.2).toFixed(1)}" stroke-opacity="${(op * 0.22).toFixed(3)}" stroke-linecap="round" filter="url(#${thinBlurId})"/>`
    );
    elems.push(
      `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${(sw * 0.55).toFixed(1)}" stroke-opacity="${(op * 0.55).toFixed(3)}" stroke-linecap="round"/>`
    );
    elems.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-opacity="${op.toFixed(3)}" stroke-linecap="round"/>`
    );
  }

  // ── Sphere rim ring — clips at canvas edges, creating the orb boundary ───────
  const rimGlow1Id = `${id}-rg1`;
  const rimGlow2Id = `${id}-rg2`;
  defs.push(
    `<filter id="${rimGlow1Id}" x="-4%" y="-4%" width="108%" height="108%"><feGaussianBlur stdDeviation="${(28 * sc).toFixed(1)}"/></filter>`,
    `<filter id="${rimGlow2Id}" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="${(8 * sc).toFixed(1)}"/></filter>`
  );
  elems.push(
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" fill="none" stroke="${c.accent}" stroke-width="${(22 * sc).toFixed(1)}" stroke-opacity="0.45" filter="url(#${rimGlow1Id})"/>`,
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" fill="none" stroke="${c.hueBlue}" stroke-width="${(9 * sc).toFixed(1)}" stroke-opacity="0.55" filter="url(#${rimGlow2Id})"/>`,
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="${(2.2 * sc).toFixed(1)}" stroke-opacity="0.60"/>`
  );

  return {
    defs: defs.join("\n"),
    elements: `<g id="${id}">${elems.join("\n")}</g>`,
  };
}

// ─── Registry ────────────────────────────────────────────────────────────────

type ComposeFn = (p: BrickParams) => ComposedWallpaper;

const SEED_COMPOSITIONS: Record<string, ComposeFn> = {
  AuroraNoir: composeAuroraNoir,
  Cinder: composeCinder,
  DeepSable: composeDeepSable,
  Eclipse: composeEclipse,
  GraphiteFlux: composeGraphiteFlux,
  Mandarian: composeMandarian,
  MidnightAtelier: composeMidnightAtelier,
  NebulaNight: composeNebulaNight,
  ObsidianGlow: composeObsidianGlow,
  VoidEmber: composeVoidEmber,
};

export function composeSeedWallpaper(p: BrickParams): ComposedWallpaper {
  return (SEED_COMPOSITIONS[p.seedId] ?? composeAuroraNoir)(p);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. AuroraNoir — Maximum-contrast aurora
//    flatBg = pure dark floor, no ambient gradient lift.
//    Tighter zoneHeights mean dark sky is visible above and below the bands.
//    Stars use "upper" distribution (4 clusters, less clumping than "full").
// ═══════════════════════════════════════════════════════════════════════════

function composeAuroraNoir(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "an", {
    flatBg: true, // pure dark bg — no radial lift between curtains
    effects: [
      // Stars — few, upper sky only, 4-cluster distribution = no centre clump
      starFieldBrick(p, {
        id: "an-sf",
        count: 180,
        brightCount: 7,
        color: c.accentSoft,
        distribution: "upper",
        opacity: 0.62,
      }),
      // Primary curtain — focused zone (0.50 height), maximum opacity
      // Tighter zone = clear dark sky above and below, high local contrast
      auroraAdvancedBrick(p, {
        id: "an-a1",
        bands: 5,
        cy: 0.45,
        zoneHeight: 0.5,
        color: c.accent,
        color2: c.hueGreen,
        opacity: 0.95,
      }),
      // Secondary curtain — clearly separated upper zone
      auroraAdvancedBrick(p, {
        id: "an-a2",
        bands: 4,
        cy: 0.22,
        zoneHeight: 0.28,
        color: c.hueCyan,
        color2: c.accent,
        opacity: 0.78,
      }),
      // Tertiary — narrow violet fringe at the very top
      auroraAdvancedBrick(p, {
        id: "an-a3",
        bands: 2,
        cy: 0.1,
        zoneHeight: 0.16,
        color: c.huePurple,
        color2: c.hueCyan,
        opacity: 0.48,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Cinder — Million stars full screen
//    Dense multi-layer starfield. Tiny stars blanket the entire canvas.
//    Three layers at different sizes and opacities create depth:
//    micro background haze → mid-field points → foreground bright stars.
//    Palette colors tint each layer so every harmony mode looks distinct.
// ═══════════════════════════════════════════════════════════════════════════

function composeCinder(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ci", {
    flatBg: true,
    effects: [
      // Micro background haze — 3000 sub-pixel dots, near-white
      starFieldBrick(p, {
        id: "ci-s1",
        count: 3000,
        brightCount: 0,
        color: "#f0eee8",
        distribution: "full",
        opacity: 0.45,
      }),
      // Mid-field — accent tinted
      starFieldBrick(p, {
        id: "ci-s2",
        count: 1800,
        brightCount: 20,
        color: c.accentSoft,
        distribution: "full",
        opacity: 0.62,
      }),
      // Warm layer — hueOrange sparse
      starFieldBrick(p, {
        id: "ci-s3",
        count: 900,
        brightCount: 18,
        color: c.hueOrange,
        distribution: "full",
        opacity: 0.7,
      }),
      // Foreground bright — accent, largest stars
      starFieldBrick(p, {
        id: "ci-s4",
        count: 400,
        brightCount: 40,
        color: c.accent,
        distribution: "full",
        opacity: 0.88,
      }),
      // Rare cool highlights
      starFieldBrick(p, {
        id: "ci-s5",
        count: 180,
        brightCount: 22,
        color: c.hueCyan,
        distribution: "full",
        opacity: 0.72,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DeepSable — Full-canvas energy orb
//    The sphere radius equals the canvas diagonal so its rim clips at all
//    four canvas edges — you are looking at the interior of the orb.
//    Wide blurred ribbons sweep edge-to-edge; thin crisp tendrils with
//    white hot-cores overlay them. A bright central hot-spot and a glowing
//    rim ring (whose stroke clips at the canvas boundary) complete the look.
// ═══════════════════════════════════════════════════════════════════════════

function composeDeepSable(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ds", {
    flatBg: true,
    effects: [
      // Faint deep-space dust — just enough grain to prevent the black from
      // looking perfectly flat without brightening the dark areas
      nebulaDustBrick(p, {
        id: "ds-nd1",
        tintColor: c.accentSoft,
        opacity: 0.14,
        baseFrequency: 0.003,
        numOctaves: 4,
        alphaStrength: 0.28,
      }),
      // Energy orb — fills the entire canvas
      energyOrb(p, "ds-eo"),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Eclipse — Ice fractures with prism split
//    Same crack paths rendered 3× with slight ±translate offsets in warm /
//    neutral / cool palette colours — the chromatic-aberration technique from
//    examples/effects/069-prism-split.svg. Each fracture line appears to
//    scatter light into its colour components, like ice catching a prism beam.
// ═══════════════════════════════════════════════════════════════════════════

function composeEclipse(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  const { width, height } = p.viewBox;
  // Prism offset — ~0.4% of canvas width / ~0.3% height, scales across platforms
  const dx = Math.round(width * 0.004);
  const dy = Math.round(height * 0.003);

  // Same id = same crack paths. Render each crack set 3×:
  //   warm shift (−dx, −dy)  ·  cool shift (+dx, +dy)  ·  crisp centre
  const v0W = icecrackBrick(p, {
    id: "ec-i0",
    crackCount: 30,
    branchProbability: 0.28,
    color: c.hueOrange,
    opacity: 0.5,
    strokeWidth: 3.2,
  });
  const v0C = icecrackBrick(p, {
    id: "ec-i0",
    crackCount: 30,
    branchProbability: 0.28,
    color: c.hueCyan,
    opacity: 0.5,
    strokeWidth: 3.2,
  });
  const v0 = icecrackBrick(p, {
    id: "ec-i0",
    crackCount: 30,
    branchProbability: 0.28,
    color: c.constants,
    opacity: 0.78,
    strokeWidth: 3.2,
  });

  const v1W = icecrackBrick(p, {
    id: "ec-i1",
    crackCount: 100,
    branchProbability: 0.62,
    color: c.hueRed,
    opacity: 0.35,
    strokeWidth: 1.8,
  });
  const v1C = icecrackBrick(p, {
    id: "ec-i1",
    crackCount: 100,
    branchProbability: 0.62,
    color: c.hueBlue,
    opacity: 0.35,
    strokeWidth: 1.8,
  });
  const v1 = icecrackBrick(p, {
    id: "ec-i1",
    crackCount: 100,
    branchProbability: 0.62,
    color: c.strings,
    opacity: 0.85,
    strokeWidth: 1.8,
  });

  return scaffold(p, "ec", {
    flatBg: true,
    effects: [
      // Thick veins — prism split: warm behind left, cool behind right, crisp centre
      { elements: `<g transform="translate(${-dx},${-dy})">${v0W.elements}</g>` },
      { elements: `<g transform="translate(${dx},${dy})">${v0C.elements}</g>` },
      v0,
      // Dense fracture network — prism split (slightly smaller offset)
      {
        elements: `<g transform="translate(${-Math.round(dx * 0.7)},${-Math.round(dy * 0.7)})">${v1W.elements}</g>`,
      },
      {
        elements: `<g transform="translate(${Math.round(dx * 0.7)},${Math.round(dy * 0.7)})">${v1C.elements}</g>`,
      },
      v1,
      // Fine detail cracks — no split (too thin; fringe would blur with the line)
      icecrackBrick(p, {
        id: "ec-i2",
        crackCount: 65,
        branchProbability: 0.5,
        color: c.hueCyan,
        opacity: 0.5,
        strokeWidth: 1.0,
      }),
      icecrackBrick(p, {
        id: "ec-i3",
        crackCount: 40,
        branchProbability: 0.38,
        color: c.keywords,
        opacity: 0.4,
        strokeWidth: 0.55,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. GraphiteFlux — Glowing caustic light curves
//    Each caustic layer has a bloom twin: thick blurred stroke behind the
//    crisp line (same id = same bezier paths). Wide outer aura → tight inner
//    corona → sharp core. Three colour layers fill the full canvas.
// ═══════════════════════════════════════════════════════════════════════════

function composeGraphiteFlux(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  const { height } = p.viewBox;
  const sd1 = (height * 0.006).toFixed(1); // ~13 px at 2160p — wide neon aura
  const sd2 = (height * 0.004).toFixed(1); //  ~9 px
  const sd3 = (height * 0.003).toFixed(1); //  ~6 px

  // Each layer: bloom twin (thick, blurred) + crisp line (same id = same paths)
  const c1Bloom = causticBrick(p, {
    id: "gf-c1",
    lineCount: 120,
    color: c.accent,
    opacity: 0.4,
    strokeWidth: 5.5,
    region: [0, 0, 1, 1],
  });
  const c1Crisp = causticBrick(p, {
    id: "gf-c1",
    lineCount: 120,
    color: c.accent,
    opacity: 0.78,
    strokeWidth: 1.5,
    region: [0, 0, 1, 1],
  });

  const c2Bloom = causticBrick(p, {
    id: "gf-c2",
    lineCount: 80,
    color: c.hueBlue,
    opacity: 0.3,
    strokeWidth: 4.0,
    region: [0, 0, 1, 1],
  });
  const c2Crisp = causticBrick(p, {
    id: "gf-c2",
    lineCount: 80,
    color: c.hueBlue,
    opacity: 0.55,
    strokeWidth: 0.85,
    region: [0, 0, 1, 1],
  });

  const c3Bloom = causticBrick(p, {
    id: "gf-c3",
    lineCount: 50,
    color: c.hueGreen,
    opacity: 0.22,
    strokeWidth: 3.0,
    region: [0, 0, 1, 1],
  });
  const c3Crisp = causticBrick(p, {
    id: "gf-c3",
    lineCount: 50,
    color: c.hueGreen,
    opacity: 0.42,
    strokeWidth: 0.55,
    region: [0, 0, 1, 1],
  });

  const glow1: BrickOutput = {
    defs: `<filter id="gf-gf1" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="${sd1}"/></filter>`,
    elements: `<g filter="url(#gf-gf1)">${c1Bloom.elements}</g>`,
  };
  const glow2: BrickOutput = {
    defs: `<filter id="gf-gf2" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation="${sd2}"/></filter>`,
    elements: `<g filter="url(#gf-gf2)">${c2Bloom.elements}</g>`,
  };
  const glow3: BrickOutput = {
    defs: `<filter id="gf-gf3" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${sd3}"/></filter>`,
    elements: `<g filter="url(#gf-gf3)">${c3Bloom.elements}</g>`,
  };

  return scaffold(p, "gf", {
    glows: [
      { cx: 0.5, cy: 0.45, rx: 0.45, ry: 0.35, color: c.accent, opacity: 0.18 },
      { cx: 0.25, cy: 0.35, rx: 0.25, ry: 0.2, color: c.hueBlue, opacity: 0.12 },
      { cx: 0.75, cy: 0.6, rx: 0.22, ry: 0.18, color: c.hueGreen, opacity: 0.1 },
    ],
    glowBlur: 50,
    effects: [glow1, c1Crisp, glow2, c2Crisp, glow3, c3Crisp],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Mandarian — Radioactive neon cell lattice
//    Voronoi cells with multi-pass glow: wide outer aura + tight inner halo +
//    crisp core line — looks like radioactive/nuclear stained glass. Delaunay
//    triangulation underneath adds angular density. Three layers, three colors.
// ═══════════════════════════════════════════════════════════════════════════

function composeMandarian(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "mn", {
    glows: [
      { cx: 0.45, cy: 0.42, rx: 0.5, ry: 0.48, color: c.hueGreen, opacity: 0.45 },
      { cx: 0.24, cy: 0.3, rx: 0.3, ry: 0.26, color: c.accent, opacity: 0.32 },
      { cx: 0.74, cy: 0.64, rx: 0.26, ry: 0.22, color: c.hueCyan, opacity: 0.24 },
    ],
    glowBlur: 50,
    effects: [
      // Delaunay triangulation baseline — angular fine grain, dim
      voronoiBrick(p, {
        id: "mn-d1",
        points: 140,
        mode: "delaunay",
        color: c.hueCyan,
        opacity: 0.42,
        fillOpacity: 0.03,
        strokeWidth: 0.9,
        glowRadius: 5,
      }),
      // Medium density Voronoi — warm accent mid-layer
      voronoiBrick(p, {
        id: "mn-v2",
        points: 200,
        color: c.accent,
        opacity: 0.6,
        fillOpacity: 0.05,
        strokeWidth: 1.8,
        relaxIterations: 3,
        glowRadius: 7,
      }),
      // Primary sparse cells — bold radioactive green, thick neon glow
      voronoiBrick(p, {
        id: "mn-v1",
        points: 55,
        color: c.hueGreen,
        opacity: 0.92,
        fillOpacity: 0.1,
        strokeWidth: 4.2,
        relaxIterations: 6,
        glowRadius: 11,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. MidnightAtelier — Cosmic megalith bricks
//    Large architectural stone-like faces floating in deep space.
//    Key difference from Mandarian: FEWER cells (8 vs 55+), SOLID fills
//    (0.28 vs 0.05), MINIMAL glow (1.5 vs 7–11) → reads as stone architecture,
//    not a radioactive lattice. Stars only at top edge (upper distribution).
// ═══════════════════════════════════════════════════════════════════════════

function composeMidnightAtelier(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  // Pure: nebula dust background + lightning only. No bricks, no stars, no voronoi.
  return scaffold(p, "ma", {
    flatBg: true,
    effects: [
      // Deep cosmic dust — subtle turbulence tinting the void
      nebulaDustBrick(p, {
        id: "ma-nd1",
        tintColor: c.accentSoft,
        opacity: 0.35,
        baseFrequency: 0.003,
        numOctaves: 4,
        alphaStrength: 0.5,
      }),
      // Primary bolt — full-height centre, brightest
      lightningBrick(p, {
        id: "ma-l1",
        startX: 0.46,
        startY: 0.0,
        endX: 0.5,
        endY: 1.0,
        color: c.accent,
        opacity: 0.92,
        branches: 4,
        skyFlashOpacity: 0.04,
      }),
      // Left bolt — diagonal, accent-2 colour
      lightningBrick(p, {
        id: "ma-l2",
        startX: 0.2,
        startY: 0.04,
        endX: 0.15,
        endY: 0.92,
        color: c.keywords,
        opacity: 0.62,
        branches: 3,
        skyFlashOpacity: 0.04,
      }),
      // Right bolt — subtle, functions colour
      lightningBrick(p, {
        id: "ma-l3",
        startX: 0.72,
        startY: 0.02,
        endX: 0.76,
        endY: 0.88,
        color: c.functions,
        opacity: 0.45,
        branches: 2,
        skyFlashOpacity: 0.04,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. NebulaNight — Ice-shine topology map
//    Same bloom-twin technique as Cinder but with cool ice colours instead of
//    warm fire ones. Each topology layer gets a frozen-crystal halo: pale-blue
//    stroke → gaussian blur → ice glint; crisp coloured line on top.
//    No star particles — the ice-shine contours are the sparkle.
// ═══════════════════════════════════════════════════════════════════════════

function composeNebulaNight(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  const { height } = p.viewBox;
  const sd1 = (height * 0.004).toFixed(1); // ~9 px at 2160p — crisp ice edge
  const sd2 = (height * 0.003).toFixed(1); // ~6 px
  const sd3 = (height * 0.002).toFixed(1); // ~4 px — micro sparkle on fine lines

  // ── Ice-shine bloom twins (same id = same noise field = same contours) ───
  // Bloom twins use FEWER levels than the crisp pass — only the major ridge
  // lines get a frozen-crystal halo; the fine detail between them stays dark.
  const t1Bloom = topologyBrick(p, {
    id: "nn-t1",
    levels: 4,
    frequency: 0.00085,
    resolution: 150,
    color: "#e8f8ff",
    opacity: 0.55,
    strokeWidth: 6.0,
  });
  const t1Crisp = topologyBrick(p, {
    id: "nn-t1",
    levels: 18,
    frequency: 0.00085,
    resolution: 150,
    color: c.accent,
    opacity: 0.58,
    strokeWidth: 1.3,
    accentColor: c.hueCyan,
    accentLevel: 9,
  });

  const t3Bloom = topologyBrick(p, {
    id: "nn-t3",
    levels: 3,
    frequency: 0.00115,
    resolution: 130,
    color: "#c4ecff",
    opacity: 0.45,
    strokeWidth: 8.0,
  });
  const t3Crisp = topologyBrick(p, {
    id: "nn-t3",
    levels: 6,
    frequency: 0.00115,
    resolution: 130,
    color: c.hueYellow,
    opacity: 0.58,
    strokeWidth: 4.5,
  });

  const t4Bloom = topologyBrick(p, {
    id: "nn-t4",
    levels: 3,
    frequency: 0.00065,
    resolution: 120,
    color: "#a8d8f8",
    opacity: 0.42,
    strokeWidth: 7.0,
  });
  const t4Crisp = topologyBrick(p, {
    id: "nn-t4",
    levels: 8,
    frequency: 0.00065,
    resolution: 120,
    color: c.hueBlue,
    opacity: 0.42,
    strokeWidth: 3.2,
    accentColor: c.hueGreen,
    accentLevel: 4,
  });

  const iceBloom1: BrickOutput = {
    defs: `<filter id="nn-if1" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation="${sd1}"/></filter>`,
    elements: `<g filter="url(#nn-if1)">${t1Bloom.elements}</g>`,
  };
  const iceBloom3: BrickOutput = {
    defs: `<filter id="nn-if3" x="-14%" y="-14%" width="128%" height="128%"><feGaussianBlur stdDeviation="${sd2}"/></filter>`,
    elements: `<g filter="url(#nn-if3)">${t3Bloom.elements}</g>`,
  };
  const iceBloom4: BrickOutput = {
    defs: `<filter id="nn-if4" x="-13%" y="-13%" width="126%" height="126%"><feGaussianBlur stdDeviation="${sd3}"/></filter>`,
    elements: `<g filter="url(#nn-if4)">${t4Bloom.elements}</g>`,
  };

  return scaffold(p, "nn", {
    flatBg: true,
    effects: [
      iceBloom1,
      t1Crisp,
      // Fine detail overlay — no bloom needed, it's the texture layer
      topologyBrick(p, {
        id: "nn-t2",
        levels: 12,
        frequency: 0.0022,
        resolution: 110,
        color: c.huePurple,
        opacity: 0.22,
        strokeWidth: 0.6,
      }),
      iceBloom3,
      t3Crisp,
      iceBloom4,
      t4Crisp,
      nebulaDustBrick(p, {
        id: "nn-d1",
        tintColor: c.accentSoft,
        opacity: 0.28,
        baseFrequency: 0.0028,
        numOctaves: 4,
        alphaStrength: 0.45,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. ObsidianGlow — Shattered glass / crystal shard field
//    Dense Delaunay triangulation fills the entire canvas with displaced
//    polygon edges, like obsidian fracture planes catching light.
// ═══════════════════════════════════════════════════════════════════════════

function composeObsidianGlow(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "og", {
    glows: [
      { cx: 0.5, cy: 0.45, rx: 0.35, ry: 0.3, color: c.accent, opacity: 0.3 },
      { cx: 0.3, cy: 0.3, rx: 0.2, ry: 0.18, color: c.hueBlue, opacity: 0.18 },
      { cx: 0.7, cy: 0.6, rx: 0.2, ry: 0.18, color: c.huePurple, opacity: 0.15 },
    ],
    glowBlur: 45,
    effects: [
      // Dense shard field — many small facets
      fractureBrick(p, {
        id: "og-f1",
        cx: 0.5,
        cy: 0.45,
        shardCount: 350,
        displacement: 0.005,
        color: c.accent,
        opacity: 0.48,
        glowColor: c.accentSoft,
        glowOpacity: 0.18,
        strokeWidth: 0.9,
      }),
      // Second layer — sparser, larger facets, accent color
      fractureBrick(p, {
        id: "og-f2",
        cx: 0.5,
        cy: 0.5,
        shardCount: 80,
        displacement: 0.012,
        color: c.hueBlue,
        opacity: 0.28,
        strokeWidth: 1.5,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. VoidEmber — Embers rising from darkness
//     A dark void with glowing ember sparks rising upward, scattered ember
//     particles collecting in the lower canvas, and smoke wisps curling above.
//     The glow blobs are kept small/focused so the near-black bg stays dark.
//     Otherworldly and atmospheric — like magical embers in an abyss.
// ═══════════════════════════════════════════════════════════════════════════

function composeVoidEmber(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ve", {
    glows: [
      // Focused ember hot-spot — concentrated glow, not a canvas-wide wash
      { cx: 0.5, cy: 0.65, rx: 0.28, ry: 0.22, color: c.hueYellow, opacity: 0.35 },
      { cx: 0.5, cy: 0.68, rx: 0.14, ry: 0.12, color: c.hueOrange, opacity: 0.5 },
      { cx: 0.38, cy: 0.7, rx: 0.1, ry: 0.08, color: c.hueRed, opacity: 0.3 },
      { cx: 0.62, cy: 0.72, rx: 0.09, ry: 0.07, color: c.accent, opacity: 0.28 },
    ],
    glowBlur: 12,
    effects: [
      // Dense ember base — full-width sparks rising from the bottom
      sparksBrick(p, {
        id: "ve-s1",
        count: 280,
        color: c.hueRed,
        opacity: 0.88,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 1.0,
        sourceCy: 0.9,
        lengthScale: 1.2,
      }),
      // Mid-canvas sparks — full-width, reach the upper half
      sparksBrick(p, {
        id: "ve-s2",
        count: 160,
        color: c.hueOrange,
        opacity: 0.68,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 1.0,
        sourceCy: 0.65,
        lengthScale: 2.2,
      }),
      // High-energy sparks — full-width, streak to the very top
      sparksBrick(p, {
        id: "ve-s3",
        count: 80,
        color: c.hueYellow,
        opacity: 0.5,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 1.0,
        sourceCy: 0.38,
        lengthScale: 3.0,
      }),
      // Ember particles — uniform across entire canvas, not just the base
      particlesBrick(p, {
        id: "ve-p1",
        count: 500,
        color: c.hueOrange,
        opacity: 0.48,
        minRadius: 1.5,
        maxRadius: 5,
        distribution: "uniform",
      }),
      particlesBrick(p, {
        id: "ve-p2",
        count: 250,
        color: c.hueRed,
        opacity: 0.62,
        minRadius: 2,
        maxRadius: 7,
        distribution: "uniform",
      }),
      // Smoke wisps rising from the ember bed
      smokeWispBrick(p, {
        id: "ve-w1",
        wispCount: 14,
        color: c.hueOrange,
        opacity: 0.2,
        maxWidth: 4.0,
      }),
    ],
  });
}
