/**
 * Seed-mapped composition engine — v4.
 *
 * Each seed = one bold, full-screen fingerprint design.
 * Fewer elements, maximum visual impact.
 * Aurora stays; 9 other seeds each get a unique architectural effect.
 */

import {
  auroraAdvancedBrick,
  brushStrokeBrick,
  fractureBrick,
  nebulaDustBrick,
  nebulaGlowBrick,
  particlesBrick,
  sparksBrick,
  topologyBrick,
  voronoiBrick,
} from "./bricks/index.js";
import { causticBrick, icecrackBrick, marbleBrick, smokeWispBrick } from "./bricks/organic.js";
import { guillocheBrick } from "./bricks/patterns.js";
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
  const bg: BrickOutput = {
    elements: `<rect width="${viewBox.width}" height="${viewBox.height}" fill="${colors.bg}"/>`,
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
// 1. AuroraNoir — Full-screen aurora curtains
//    Two overlapping curtain bands of different hue filling the canvas.
// ═══════════════════════════════════════════════════════════════════════════

function composeAuroraNoir(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "an", {
    glows: [
      { cx: 0.5, cy: 0.35, rx: 0.55, ry: 0.3, color: c.accent, opacity: 0.25 },
      { cx: 0.35, cy: 0.25, rx: 0.3, ry: 0.15, color: c.hueGreen, opacity: 0.12 },
    ],
    glowBlur: 50,
    effects: [
      auroraAdvancedBrick(p, {
        id: "an-a1",
        bands: 5,
        cy: 0.35,
        zoneHeight: 0.65,
        color: c.accent,
        color2: c.hueGreen,
        opacity: 0.85,
      }),
      auroraAdvancedBrick(p, {
        id: "an-a2",
        bands: 2,
        cy: 0.25,
        zoneHeight: 0.35,
        color: c.hueCyan,
        color2: c.accent,
        opacity: 0.4,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Cinder — Thermal topology map
//    Dense contour lines at high frequency look like heat-imaging or fire maps.
//    Accent level glows hot orange/red.
// ═══════════════════════════════════════════════════════════════════════════

function composeCinder(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ci", {
    glows: [
      { cx: 0.5, cy: 0.55, rx: 0.45, ry: 0.4, color: c.hueRed, opacity: 0.3 },
      { cx: 0.3, cy: 0.35, rx: 0.25, ry: 0.2, color: c.hueOrange, opacity: 0.2 },
      { cx: 0.7, cy: 0.4, rx: 0.2, ry: 0.15, color: c.hueYellow, opacity: 0.16 },
    ],
    glowBlur: 55,
    effects: [
      // Dense high-frequency topology at maximum resolution for crisp lines
      topologyBrick(p, {
        id: "ci-t1",
        levels: 22,
        frequency: 0.0032,
        resolution: 200,
        color: c.hueOrange,
        opacity: 0.68,
        strokeWidth: 1.8,
        accentColor: c.hueYellow,
        accentLevel: 11,
      }),
      // Second layer — finer detail overlay
      topologyBrick(p, {
        id: "ci-t2",
        levels: 14,
        frequency: 0.0055,
        resolution: 160,
        color: c.hueRed,
        opacity: 0.42,
        strokeWidth: 1.1,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DeepSable — Guilloche engravings
//    Dozens of overlapping precision sine-wave lines spanning full width.
//    Looks like sand dunes, Lissajous engravings, or wind currents.
// ═══════════════════════════════════════════════════════════════════════════

function composeDeepSable(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ds", {
    glows: [
      // Neon glow zones — bright blobs create colored light behind the waves
      { cx: 0.5, cy: 0.5, rx: 0.55, ry: 0.45, color: c.huePurple, opacity: 0.4 },
      { cx: 0.2, cy: 0.65, rx: 0.3, ry: 0.28, color: c.hueBlue, opacity: 0.3 },
      { cx: 0.8, cy: 0.3, rx: 0.28, ry: 0.24, color: c.accent, opacity: 0.25 },
    ],
    glowBlur: 55,
    effects: [
      // Background layer — wide slow purple waves for depth/second color
      guillocheBrick(p, {
        id: "ds-g0",
        lineCount: 40,
        amplitude: 62,
        frequency: 3.5,
        color: c.huePurple,
        opacity: 0.65,
        strokeWidth: 3.2,
      }),
      // Primary engraving — main wave structure, crisp and bold
      guillocheBrick(p, {
        id: "ds-g1",
        lineCount: 55,
        amplitude: 38,
        frequency: 7,
        color: c.accent,
        opacity: 0.82,
        strokeWidth: 2.5,
      }),
      // Secondary — different frequency creates neon interference bands
      guillocheBrick(p, {
        id: "ds-g2",
        lineCount: 35,
        amplitude: 22,
        frequency: 11,
        color: c.keywords,
        opacity: 0.48,
        strokeWidth: 1.4,
      }),
      // Fine high-frequency accent layer
      guillocheBrick(p, {
        id: "ds-g3",
        lineCount: 20,
        amplitude: 12,
        frequency: 18,
        color: c.functions,
        opacity: 0.3,
        strokeWidth: 0.8,
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
    glows: [
      { cx: 0.42, cy: 0.38, rx: 0.35, ry: 0.3, color: c.strings, opacity: 0.32 },
      { cx: 0.65, cy: 0.62, rx: 0.3, ry: 0.26, color: c.hueCyan, opacity: 0.22 },
      { cx: 0.25, cy: 0.7, rx: 0.22, ry: 0.18, color: c.keywords, opacity: 0.18 },
    ],
    glowBlur: 50,
    effects: [
      // Dense primary fracture network — bright, fills canvas
      icecrackBrick(p, {
        id: "ec-i1",
        crackCount: 100,
        branchProbability: 0.62,
        color: c.strings,
        opacity: 0.78,
        strokeWidth: 1.8,
      }),
      // Secondary finer cracks — different color for depth
      icecrackBrick(p, {
        id: "ec-i2",
        crackCount: 65,
        branchProbability: 0.5,
        color: c.hueCyan,
        opacity: 0.42,
        strokeWidth: 0.9,
      }),
      // Accent micro-cracks — very fine texture layer
      icecrackBrick(p, {
        id: "ec-i3",
        crackCount: 40,
        branchProbability: 0.38,
        color: c.keywords,
        opacity: 0.28,
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
// 6. Mandarian — Full-canvas Voronoi tessellation
//    Organic cellular pattern covering the whole canvas. Warm filled cells
//    with bright edges look like cracked earth, stained glass, or coral.
// ═══════════════════════════════════════════════════════════════════════════

function composeMandarian(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "mn", {
    glows: [
      { cx: 0.5, cy: 0.45, rx: 0.45, ry: 0.4, color: c.accent, opacity: 0.25 },
      { cx: 0.3, cy: 0.3, rx: 0.25, ry: 0.2, color: c.hueOrange, opacity: 0.18 },
      { cx: 0.7, cy: 0.65, rx: 0.2, ry: 0.18, color: c.hueYellow, opacity: 0.15 },
    ],
    glowBlur: 55,
    effects: [
      // Structured primary cells — high relaxation → near-hexagonal grid
      voronoiBrick(p, {
        id: "mn-v1",
        points: 80,
        color: c.accent,
        opacity: 0.72,
        fillOpacity: 0.25,
        strokeWidth: 2.2,
        relaxIterations: 6,
      }),
      // Fine secondary overlay — denser, adds texture depth
      voronoiBrick(p, {
        id: "mn-v2",
        points: 280,
        color: c.hueOrange,
        opacity: 0.28,
        fillOpacity: 0.06,
        strokeWidth: 0.8,
        relaxIterations: 3,
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. MidnightAtelier — Ink wash / brushwork studio
//    Big sweeping brushstrokes cross the canvas like paint on wet paper,
//    underscored by fine flowing marble veins. Feels like a night studio:
//    spontaneous, layered, expressive. Wide organic arcs, not straight bolts.
// ═══════════════════════════════════════════════════════════════════════════

function composeMidnightAtelier(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ma", {
    glows: [
      { cx: 0.45, cy: 0.4, rx: 0.42, ry: 0.36, color: c.accent, opacity: 0.28 },
      { cx: 0.68, cy: 0.62, rx: 0.32, ry: 0.26, color: c.huePurple, opacity: 0.2 },
      { cx: 0.22, cy: 0.7, rx: 0.22, ry: 0.18, color: c.hueBlue, opacity: 0.14 },
    ],
    glowBlur: 55,
    effects: [
      // Primary bold brushstrokes — wide sweeping arcs, like ink wash painting
      brushStrokeBrick(p, {
        id: "ma-b1",
        color: c.accent,
        opacity: 0.78,
        x1: 0.0,
        y1: 0.36,
        x2: 0.98,
        y2: 0.42,
        strokeWidth: 0.038,
        roughness: 0.07,
      }),
      brushStrokeBrick(p, {
        id: "ma-b2",
        color: c.huePurple,
        opacity: 0.58,
        x1: 0.04,
        y1: 0.64,
        x2: 1.0,
        y2: 0.56,
        strokeWidth: 0.026,
        roughness: 0.09,
      }),
      brushStrokeBrick(p, {
        id: "ma-b3",
        color: c.accentSoft,
        opacity: 0.38,
        x1: 0.08,
        y1: 0.22,
        x2: 0.88,
        y2: 0.26,
        strokeWidth: 0.019,
        roughness: 0.06,
      }),
      brushStrokeBrick(p, {
        id: "ma-b4",
        color: c.hueBlue,
        opacity: 0.3,
        x1: 0.0,
        y1: 0.76,
        x2: 0.72,
        y2: 0.74,
        strokeWidth: 0.014,
        roughness: 0.05,
      }),
      brushStrokeBrick(p, {
        id: "ma-b5",
        color: c.strings,
        opacity: 0.22,
        x1: 0.3,
        y1: 0.1,
        x2: 0.95,
        y2: 0.14,
        strokeWidth: 0.011,
        roughness: 0.04,
      }),
      // Fine flowing veins between strokes — organic studio texture
      marbleBrick(p, {
        id: "ma-m1",
        veinCount: 22,
        color: c.strings,
        opacity: 0.32,
        strokeWidth: 2.0,
        curviness: 0.72,
      }),
      marbleBrick(p, {
        id: "ma-m2",
        veinCount: 15,
        color: c.accent,
        opacity: 0.2,
        strokeWidth: 1.1,
        curviness: 0.85,
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
      // Primary rising sparks — bright ember trails curving upward
      sparksBrick(p, {
        id: "ve-s1",
        count: 200,
        color: c.hueRed,
        opacity: 0.88,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 0.65,
      }),
      // Secondary sparks — different color, tighter cluster
      sparksBrick(p, {
        id: "ve-s2",
        count: 120,
        color: c.hueOrange,
        opacity: 0.68,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 0.4,
      }),
      // Tertiary accent sparks
      sparksBrick(p, {
        id: "ve-s3",
        count: 60,
        color: c.hueYellow,
        opacity: 0.5,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 0.25,
      }),
      // Ember bed — glowing particle pool at the base
      particlesBrick(p, {
        id: "ve-p1",
        count: 350,
        color: c.hueOrange,
        opacity: 0.5,
        minRadius: 1.5,
        maxRadius: 5,
        distribution: "lower",
      }),
      particlesBrick(p, {
        id: "ve-p2",
        count: 180,
        color: c.hueRed,
        opacity: 0.65,
        minRadius: 2,
        maxRadius: 7,
        distribution: "lower",
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
