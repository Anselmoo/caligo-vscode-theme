/**
 * Seed-mapped composition engine — v4.
 *
 * Each seed = one bold, full-screen fingerprint design.
 * Fewer elements, maximum visual impact.
 * Aurora stays; 9 other seeds each get a unique architectural effect.
 */

import {
  auroraAdvancedBrick,
  duneBrick,
  fractureBrick,
  lightningBrick,
  nebulaDustBrick,
  nebulaGlowBrick,
  particlesBrick,
  sparksBrick,
  starFieldBrick,
  terrainContourBrick,
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
// 3. DeepSable — Desert dune sea at dusk
//    Layered dune ridges recede to a horizon with terrain silhouettes.
//    Warm atmospheric glow near the horizon; foreground dunes in accent hues.
//    Sand-grain texture + sparse particle dust add tactile depth.
// ═══════════════════════════════════════════════════════════════════════════

function composeDeepSable(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ds", {
    glows: [
      // Horizon warmth
      { cx: 0.5, cy: 0.35, rx: 0.6, ry: 0.3, color: c.hueOrange, opacity: 0.35 },
      { cx: 0.5, cy: 0.3, rx: 0.35, ry: 0.18, color: c.accent, opacity: 0.28 },
      // Foreground warmth
      { cx: 0.28, cy: 0.72, rx: 0.3, ry: 0.22, color: c.numbers, opacity: 0.22 },
    ],
    glowBlur: 60,
    effects: [
      // Night sky — stars fill the upper two-thirds so the canvas is never empty
      starFieldBrick(p, {
        id: "ds-sf",
        count: 520,
        brightCount: 18,
        color: c.accentSoft,
        distribution: "upper",
        maxY: 0.55,
        opacity: 0.65,
      }),
      // Sky-horizon mountain silhouettes — 4 depth layers
      terrainContourBrick(p, {
        id: "ds-tc",
        horizonY: 0.18,
        gridW: 80,
        gridH: 40,
        layers: [
          { color: c.hueBlue, opacity: 0.32, edgeBlur: 8 }, // far haze
          { color: c.keywords, opacity: 0.45, edgeBlur: 3 }, // mid ridges
          { color: c.huePurple, opacity: 0.55, edgeBlur: 1 }, // near ridges
          { color: c.accent, opacity: 0.68 }, // foreground silhouette
        ],
      }),
      // Dune sea — foreground, mid, and background layers of actual dunes
      duneBrick(p, {
        id: "ds-d1",
        baseY: 0.52,
        ridges: 5,
        color: c.strings,
        opacity: 0.45,
        seedSuffix: "d1",
      }),
      duneBrick(p, {
        id: "ds-d2",
        baseY: 0.64,
        ridges: 4,
        color: c.hueOrange,
        opacity: 0.65,
        seedSuffix: "d2",
      }),
      duneBrick(p, {
        id: "ds-d3",
        baseY: 0.77,
        ridges: 3,
        color: c.numbers,
        opacity: 0.82,
        seedSuffix: "d3",
      }),
      // Sand-dust particles drifting across the dunes
      particlesBrick(p, {
        id: "ds-p1",
        count: 280,
        color: c.accentSoft,
        opacity: 0.25,
        minRadius: 0.5,
        maxRadius: 1.8,
        distribution: "lower",
      }),
      // Fine grain overlay for tactile texture
      nebulaDustBrick(p, {
        id: "ds-nd1",
        tintColor: c.accentMuted,
        opacity: 0.22,
        baseFrequency: 0.005,
        numOctaves: 3,
        alphaStrength: 0.4,
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
// 7. MidnightAtelier — Electric storm / thunder scene
//    Multiple lightning bolts erupt from a charged storm sky. Wide soft
//    curtain bands simulate the cloud banks lit by the flashes. Atmospheric
//    dust grain adds the heavy-air texture of a real thunderstorm.
// ═══════════════════════════════════════════════════════════════════════════

function composeMidnightAtelier(p: BrickParams): ComposedWallpaper {
  const c = p.colors;
  return scaffold(p, "ma", {
    glows: [
      // Storm sky illumination — wide diffuse flash glow
      { cx: 0.48, cy: 0.22, rx: 0.55, ry: 0.38, color: c.accent, opacity: 0.32 },
      { cx: 0.28, cy: 0.18, rx: 0.32, ry: 0.22, color: c.constants, opacity: 0.22 },
      { cx: 0.72, cy: 0.25, rx: 0.28, ry: 0.18, color: c.hueBlue, opacity: 0.18 },
    ],
    glowBlur: 60,
    effects: [
      // Primary bolt — centre canvas, main strike, bright accent
      lightningBrick(p, {
        id: "ma-l1",
        startX: 0.48,
        startY: 0.0,
        endX: 0.44,
        endY: 1.0,
        color: c.accent,
        opacity: 0.95,
        branches: 5,
      }),
      // Secondary bolt — left side, hits mid-canvas, different hue
      lightningBrick(p, {
        id: "ma-l2",
        startX: 0.24,
        startY: 0.02,
        endX: 0.18,
        endY: 0.88,
        color: c.constants,
        opacity: 0.72,
        branches: 3,
      }),
      // Tertiary bolt — right side, short burst
      lightningBrick(p, {
        id: "ma-l3",
        startX: 0.72,
        startY: 0.04,
        endX: 0.76,
        endY: 0.82,
        color: c.hueBlue,
        opacity: 0.55,
        branches: 2,
      }),
      // Heavy storm-air grain
      nebulaDustBrick(p, {
        id: "ma-nd1",
        tintColor: c.accentSoft,
        opacity: 0.32,
        baseFrequency: 0.003,
        numOctaves: 4,
        alphaStrength: 0.5,
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
      // Dense ember base — many sparks rising from the bottom third
      sparksBrick(p, {
        id: "ve-s1",
        count: 220,
        color: c.hueRed,
        opacity: 0.88,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 0.7,
        sourceCy: 0.9,
        lengthScale: 1.2,
      }),
      // Mid-canvas sparks — launch from center-bottom, reach the upper half
      sparksBrick(p, {
        id: "ve-s2",
        count: 130,
        color: c.hueOrange,
        opacity: 0.68,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 0.5,
        sourceCy: 0.65,
        lengthScale: 2.2,
      }),
      // High-energy sparks — launch from upper-middle, streak to the very top
      sparksBrick(p, {
        id: "ve-s3",
        count: 65,
        color: c.hueYellow,
        opacity: 0.5,
        direction: 1,
        sourceCx: 0.5,
        sourceSpread: 0.35,
        sourceCy: 0.38,
        lengthScale: 3.0,
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
