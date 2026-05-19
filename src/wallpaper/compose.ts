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
  }
): ComposedWallpaper {
  const { viewBox, colors } = p;
  const { width, height } = viewBox;
  // Gradient background: flat bg + radial bgSoft bloom centred slightly high.
  // Uses objectBoundingBox percentages so it works at any canvas size.
  const bgGradId = `${prefix}-bg-grad`;
  const bg: BrickOutput = {
    defs: `<radialGradient id="${bgGradId}" cx="50%" cy="42%" r="72%">
  <stop offset="0%"   stop-color="${colors.bgSoft}"/>
  <stop offset="58%"  stop-color="${colors.bgSoft}" stop-opacity="0.45"/>
  <stop offset="100%" stop-color="${colors.bg}"     stop-opacity="0"/>
</radialGradient>`,
    elements: `<rect width="${width}" height="${height}" fill="${colors.bg}"/>
<rect width="${width}" height="${height}" fill="url(#${bgGradId})"/>`,
  };
  const layers: BrickOutput[] = [bg];
  if (opts.glows?.length) {
    layers.push(
      nebulaGlowBrick(p, { id: `${prefix}-g`, blobs: opts.glows, blur: opts.glowBlur ?? 45 })
    );
  }
  layers.push(...opts.effects);
  return mergeBricks(layers);
}

// ─── Liquid glass wave bands ─────────────────────────────────────────────────
// Renders N overlapping translucent wave bands spanning the full canvas height.
// Each band has a blurred frosted-glass fill + a crisp white highlight stroke
// on its top edge + a thin coloured outline — producing a liquid-glass optic.

interface LiquidWaveBand {
  cy: number; // centre Y as fraction of height
  color: string;
  opacity: number;
  phase: number; // wave phase offset in radians
}

function liquidWaveBands(p: BrickParams, id: string, bands: LiquidWaveBand[]): BrickOutput {
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
// 1. AuroraNoir — High-contrast aurora over star field
//    Stars fill the dark sky so the eye reads "true dark" against the aurora.
//    Glow blobs are kept dim to preserve that dark background.
//    Three aurora layers at different heights + opacity give color depth:
//    primary (accent/green), secondary (cyan/accent), tertiary (purple fringe).
// ═══════════════════════════════════════════════════════════════════════════

function composeAuroraNoir(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "an", {
    // Dim glows — keep the sky dark so the aurora has somewhere to contrast against
    glows: [
      { cx: 0.5, cy: 0.38, rx: 0.52, ry: 0.28, color: c.accent, opacity: 0.12 },
      { cx: 0.38, cy: 0.28, rx: 0.28, ry: 0.14, color: c.hueGreen, opacity: 0.07 },
    ],
    glowBlur: 55,
    effects: [
      // Stars — deep-space backdrop; the aurora punches against these
      starFieldBrick(p, {
        id: "an-sf",
        count: 600,
        brightCount: 22,
        color: c.accentSoft,
        distribution: "full",
        opacity: 0.68,
      }),
      // Primary curtain — hero aurora, wide zone, full intensity
      auroraAdvancedBrick(p, {
        id: "an-a1",
        bands: 5,
        cy: 0.38,
        zoneHeight: 0.72,
        color: c.accent,
        color2: c.hueGreen,
        opacity: 0.92,
      }),
      // Secondary curtain — higher, narrower, strong cyan contrast
      auroraAdvancedBrick(p, {
        id: "an-a2",
        bands: 4,
        cy: 0.26,
        zoneHeight: 0.42,
        color: c.hueCyan,
        color2: c.accent,
        opacity: 0.72,
      }),
      // Tertiary curtain — upper-sky purple/violet fringe for color depth
      auroraAdvancedBrick(p, {
        id: "an-a3",
        bands: 2,
        cy: 0.15,
        zoneHeight: 0.26,
        color: c.huePurple,
        color2: c.hueCyan,
        opacity: 0.42,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Cinder — Cream thunder on magma
//    Three topology fields share the same noise seed so the crisp contour line
//    and its bloom twin trace identical paths. Each layer: thick cream/white
//    stroke → gaussian blur → incandescent halo; then the crisp coloured line
//    on top. Result = glowing lava veins that follow the terrain exactly —
//    "cream thunder" — no horizontal bands cutting across the structure.
// ═══════════════════════════════════════════════════════════════════════════

function composeCinder(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  const { height } = p.viewBox;
  const sd1 = (height * 0.008).toFixed(1); // primary bloom radius  ~17 px at 2160p
  const sd2 = (height * 0.005).toFixed(1); // secondary bloom radius ~11 px
  const sd3 = (height * 0.003).toFixed(1); // fine detail bloom       ~6 px

  // ── Topology contours — same id = same noise field = same paths ──────────
  // Primary magma channels (22 levels, low frequency = broad landmass shapes)
  const t1Bloom = topologyBrick(p, {
    id: "ci-t1",
    levels: 22,
    frequency: 0.0032,
    resolution: 200,
    color: "#fff8e0", // warm cream-white for the bloom
    opacity: 0.42,
    strokeWidth: 8.5,
    accentColor: "#ffffff",
    accentLevel: 11,
  });
  const t1Crisp = topologyBrick(p, {
    id: "ci-t1", // identical id → identical contours
    levels: 22,
    frequency: 0.0032,
    resolution: 200,
    color: c.hueOrange,
    opacity: 0.75,
    strokeWidth: 1.8,
    accentColor: c.hueYellow,
    accentLevel: 11,
  });

  // Secondary magma texture (finer frequency, red hue)
  const t2Bloom = topologyBrick(p, {
    id: "ci-t2",
    levels: 14,
    frequency: 0.0055,
    resolution: 160,
    color: "#ffe8c0", // amber-cream
    opacity: 0.3,
    strokeWidth: 5.5,
  });
  const t2Crisp = topologyBrick(p, {
    id: "ci-t2",
    levels: 14,
    frequency: 0.0055,
    resolution: 160,
    color: c.hueRed,
    opacity: 0.48,
    strokeWidth: 1.1,
  });

  // Fine detail veins (highest frequency, strings hue)
  const t3Bloom = topologyBrick(p, {
    id: "ci-t3",
    levels: 10,
    frequency: 0.0082,
    resolution: 130,
    color: "#ffd8a0",
    opacity: 0.22,
    strokeWidth: 3.5,
  });
  const t3Crisp = topologyBrick(p, {
    id: "ci-t3",
    levels: 10,
    frequency: 0.0082,
    resolution: 130,
    color: c.strings,
    opacity: 0.35,
    strokeWidth: 0.65,
  });

  // ── Wrap each bloom twin in a gaussian blur filter ────────────────────────
  const bloom1: BrickOutput = {
    defs: `<filter id="ci-gf1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${sd1}"/></filter>`,
    elements: `<g filter="url(#ci-gf1)">${t1Bloom.elements}</g>`,
  };
  const bloom2: BrickOutput = {
    defs: `<filter id="ci-gf2" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="${sd2}"/></filter>`,
    elements: `<g filter="url(#ci-gf2)">${t2Bloom.elements}</g>`,
  };
  const bloom3: BrickOutput = {
    defs: `<filter id="ci-gf3" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${sd3}"/></filter>`,
    elements: `<g filter="url(#ci-gf3)">${t3Bloom.elements}</g>`,
  };

  return scaffold(p, "ci", {
    glows: [
      { cx: 0.5, cy: 0.55, rx: 0.52, ry: 0.45, color: c.hueRed, opacity: 0.38 },
      { cx: 0.3, cy: 0.35, rx: 0.28, ry: 0.22, color: c.hueOrange, opacity: 0.28 },
      { cx: 0.72, cy: 0.42, rx: 0.22, ry: 0.18, color: c.hueYellow, opacity: 0.22 },
    ],
    glowBlur: 50,
    effects: [
      bloom1,
      t1Crisp, // primary: cream bloom then crisp orange line
      bloom2,
      t2Crisp, // secondary: amber bloom then crisp red line
      bloom3,
      t3Crisp, // fine: warm bloom then crisp strings line
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DeepSable — Liquid glass over starfield
//    Dense star field fills the entire canvas. Six liquid-glass wave bands
//    span the full height (heavily overlapping) giving a frosted-glass optic.
//    Each band: blurred fill + white glint stroke + coloured outline.
//    Gradient background gives depth for the transparent layers to read against.
// ═══════════════════════════════════════════════════════════════════════════

function composeDeepSable(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ds", {
    glows: [
      { cx: 0.5, cy: 0.45, rx: 0.55, ry: 0.4, color: c.strings, opacity: 0.12 },
      { cx: 0.3, cy: 0.6, rx: 0.3, ry: 0.22, color: c.types, opacity: 0.09 },
    ],
    glowBlur: 80,
    effects: [
      // Stars — dense and bright, clearly visible behind the glass layers
      starFieldBrick(p, {
        id: "ds-sf1",
        count: 1400,
        brightCount: 55,
        color: c.accentSoft,
        distribution: "full",
        opacity: 0.92,
      }),
      starFieldBrick(p, {
        id: "ds-sf2",
        count: 500,
        brightCount: 20,
        color: c.keywords,
        distribution: "full",
        opacity: 0.72,
      }),
      starFieldBrick(p, {
        id: "ds-sf3",
        count: 200,
        brightCount: 10,
        color: c.strings,
        distribution: "full",
        opacity: 0.55,
      }),
      // Six liquid glass wave bands — cy 0.0→1.0, full canvas height coverage
      liquidWaveBands(p, "ds-lw", [
        { cy: 0.0, color: c.strings, opacity: 0.48, phase: 0.0 },
        { cy: 0.2, color: c.types, opacity: 0.52, phase: 1.1 },
        { cy: 0.4, color: c.functions, opacity: 0.5, phase: 2.3 },
        { cy: 0.6, color: c.keywords, opacity: 0.52, phase: 3.5 },
        { cy: 0.8, color: c.huePurple, opacity: 0.48, phase: 4.7 },
        { cy: 1.0, color: c.hueBlue, opacity: 0.44, phase: 5.9 },
      ]),
      // Fine cosmic dust behind the glass
      nebulaDustBrick(p, {
        id: "ds-nd1",
        tintColor: c.strings,
        opacity: 0.12,
        baseFrequency: 0.003,
        numOctaves: 4,
        alphaStrength: 0.28,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Eclipse — Shattered glass / ice fracture field
//    Dense branching crack patterns spanning the full canvas, like the
//    shadow geometry of an eclipse. Jagged, dramatic, high-contrast —
//    very different from all other organic/smooth effects.
// ═══════════════════════════════════════════════════════════════════════════

function composeEclipse(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ec", {
    // No partial glow blobs — pure void background, full-canvas crack field only
    glowBlur: 50,
    effects: [
      // Bold thick veins — highly visible primary color
      icecrackBrick(p, {
        id: "ec-i0",
        crackCount: 30,
        branchProbability: 0.28,
        color: c.constants,
        opacity: 0.72,
        strokeWidth: 3.2,
      }),
      // Dense primary fracture network
      icecrackBrick(p, {
        id: "ec-i1",
        crackCount: 100,
        branchProbability: 0.62,
        color: c.strings,
        opacity: 0.82,
        strokeWidth: 1.8,
      }),
      // Secondary cracks — different color, clearly visible
      icecrackBrick(p, {
        id: "ec-i2",
        crackCount: 65,
        branchProbability: 0.5,
        color: c.hueCyan,
        opacity: 0.58,
        strokeWidth: 1.0,
      }),
      // Fine detail cracks — third distinct color
      icecrackBrick(p, {
        id: "ec-i3",
        crackCount: 40,
        branchProbability: 0.38,
        color: c.keywords,
        opacity: 0.44,
        strokeWidth: 0.55,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. GraphiteFlux — Water caustic light curves
//    Dense intersecting bezier curves simulate light refracted through water
//    or energy flux lines. Bright glowing lines cross and intersect to fill
//    the entire canvas — kinetic, energetic, "in flux".
// ═══════════════════════════════════════════════════════════════════════════

function composeGraphiteFlux(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "gf", {
    glows: [
      { cx: 0.5, cy: 0.45, rx: 0.45, ry: 0.35, color: c.accent, opacity: 0.2 },
      { cx: 0.25, cy: 0.35, rx: 0.25, ry: 0.2, color: c.hueBlue, opacity: 0.14 },
      { cx: 0.75, cy: 0.6, rx: 0.22, ry: 0.18, color: c.hueGreen, opacity: 0.12 },
    ],
    glowBlur: 50,
    effects: [
      // Dense primary caustic layer — bright intersecting curves
      causticBrick(p, {
        id: "gf-c1",
        lineCount: 120,
        color: c.accent,
        opacity: 0.55,
        strokeWidth: 1.5,
        region: [0, 0, 1, 1],
      }),
      // Secondary caustic layer — different seed, different color
      causticBrick(p, {
        id: "gf-c2",
        lineCount: 80,
        color: c.hueBlue,
        opacity: 0.32,
        strokeWidth: 0.85,
        region: [0, 0, 1, 1],
      }),
      // Fine accent layer
      causticBrick(p, {
        id: "gf-c3",
        lineCount: 50,
        color: c.hueGreen,
        opacity: 0.2,
        strokeWidth: 0.55,
        region: [0, 0, 1, 1],
      }),
    ],
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
// 7. MidnightAtelier — Bricks in the universe / cosmic web
//    The large-scale structure of the universe: matter clusters into a foam
//    of cells separated by glowing filaments. Three scales of Voronoi:
//      • Macro bricks  — 28 pts, 8 Lloyd passes → near-hexagonal honeycomb,
//                        thick glowing edges, semi-transparent faces
//      • Mid structure — 90 pts, 5 passes → internal cell divisions, medium glow
//      • Fine web      — 200-pt Delaunay → the cosmic mortar / thin filament lines
//    Stars scatter behind the web; nebula dust fills the interstices.
// ═══════════════════════════════════════════════════════════════════════════

function composeMidnightAtelier(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ma", {
    glows: [
      // Vast cosmic filament glow — wide and diffuse, not a spotlight
      { cx: 0.45, cy: 0.4, rx: 0.58, ry: 0.48, color: c.accent, opacity: 0.18 },
      { cx: 0.22, cy: 0.28, rx: 0.32, ry: 0.28, color: c.keywords, opacity: 0.14 },
      { cx: 0.74, cy: 0.65, rx: 0.3, ry: 0.24, color: c.functions, opacity: 0.12 },
    ],
    glowBlur: 60,
    effects: [
      // Layer 1 — cosmic backdrop: faint scattered stars
      starFieldBrick(p, {
        id: "ma-sf",
        count: 500,
        brightCount: 22,
        color: c.accentSoft,
        distribution: "full",
        opacity: 0.52,
      }),
      // Layer 2 — fine Delaunay web: the thin cosmic filaments / mortar lines
      voronoiBrick(p, {
        id: "ma-d1",
        points: 220,
        mode: "delaunay",
        color: c.functions,
        opacity: 0.32,
        fillOpacity: 0,
        strokeWidth: 0.65,
        glowRadius: 2.2,
      }),
      // Layer 3 — medium Voronoi: internal cell structure, moderate glow
      voronoiBrick(p, {
        id: "ma-v2",
        points: 90,
        color: c.keywords,
        opacity: 0.5,
        fillOpacity: 0.06,
        strokeWidth: 1.9,
        relaxIterations: 5,
        glowRadius: 3.5,
      }),
      // Layer 4 — macro cosmic bricks: 8 Lloyd passes → near-hexagonal cells
      //           thick glowing edges, semi-transparent faces catch the glow
      voronoiBrick(p, {
        id: "ma-v1",
        points: 28,
        color: c.accent,
        opacity: 0.72,
        fillOpacity: 0.14,
        strokeWidth: 3.8,
        relaxIterations: 8,
        glowRadius: 4.5,
      }),
      // Layer 5 — nebula dust: fills the interior of cells with soft colour
      nebulaDustBrick(p, {
        id: "ma-nd1",
        tintColor: c.accentSoft,
        opacity: 0.22,
        baseFrequency: 0.003,
        numOctaves: 4,
        alphaStrength: 0.38,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. NebulaNight — Cosmic-scale topology map
//    Very low frequency = continent-sized features. Looks like a star chart,
//    elevation map of an alien planet, or nebula density contours.
// ═══════════════════════════════════════════════════════════════════════════

function composeNebulaNight(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "nn", {
    glows: [
      { cx: 0.45, cy: 0.4, rx: 0.5, ry: 0.4, color: c.accent, opacity: 0.28 },
      { cx: 0.6, cy: 0.55, rx: 0.35, ry: 0.3, color: c.huePurple, opacity: 0.18 },
      { cx: 0.3, cy: 0.35, rx: 0.25, ry: 0.2, color: c.hueCyan, opacity: 0.15 },
    ],
    glowBlur: 60,
    effects: [
      // Large-scale contours — cosmic landmasses
      topologyBrick(p, {
        id: "nn-t1",
        levels: 18,
        frequency: 0.00085,
        resolution: 150,
        color: c.accent,
        opacity: 0.45,
        strokeWidth: 1.3,
        accentColor: c.hueCyan,
        accentLevel: 9,
      }),
      // Fine detail overlay — adds texture
      topologyBrick(p, {
        id: "nn-t2",
        levels: 12,
        frequency: 0.0022,
        resolution: 110,
        color: c.huePurple,
        opacity: 0.22,
        strokeWidth: 0.6,
      }),
      // THICK major isobars — bold yellow/gold lines cutting through the fine ones
      topologyBrick(p, {
        id: "nn-t3",
        levels: 6,
        frequency: 0.00115,
        resolution: 130,
        color: c.hueYellow,
        opacity: 0.52,
        strokeWidth: 4.5,
      }),
      // Second bold color — blue isobars at a different scale/phase
      topologyBrick(p, {
        id: "nn-t4",
        levels: 8,
        frequency: 0.00065,
        resolution: 120,
        color: c.hueBlue,
        opacity: 0.38,
        strokeWidth: 3.2,
        accentColor: c.hueGreen,
        accentLevel: 4,
      }),
      // Cosmic dust — fractal noise overlay for nebula texture
      nebulaDustBrick(p, {
        id: "nn-d1",
        tintColor: c.accentSoft,
        opacity: 0.32,
        baseFrequency: 0.0028,
        numOctaves: 4,
        alphaStrength: 0.5,
      }),
      // Star field — scattered bright dots for space atmosphere
      particlesBrick(p, {
        id: "nn-p1",
        count: 400,
        color: c.hueYellow,
        opacity: 0.55,
        minRadius: 0.5,
        maxRadius: 2,
        distribution: "uniform",
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
