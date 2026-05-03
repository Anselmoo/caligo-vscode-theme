/**
 * Brick Gallery Generator
 * Renders every brick type in isolation on a dark background so we can
 * assess individual element quality before compositing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Import all bricks
import {
  atmosphereBrick,
  auroraAdvancedBrick,
  backgroundBrick,
  celestialBrick,
  cityscapeBrick,
  cloudBandBrick,
  duneBrick,
  horizonGlowBrick,
  jellyfishBrick,
  lavaRiverBrick,
  lightningBrick,
  nebulaDustBrick,
  nebulaGlowBrick,
  particlesBrick,
  raysBrick,
  ridgeHighlightBrick,
  ringBrick,
  shootingStarBrick,
  skyGradientBrick,
  smokeRisingBrick,
  sparksBrick,
  starFieldBrick,
  terrainBrick,
  terrainContourBrick,
  terrainStackBrick,
  toneCurveBrick,
  treelineBrick,
  vignetteBrick,
  waterCurrentBrick,
  waterReflectionBrick,
} from "../src/wallpaper/bricks/index.js";
import { mergeBricks, toSvgDocument } from "../src/wallpaper/composer.js";
import type { BrickOutput, BrickParams, WallpaperColors } from "../src/wallpaper/types.js";

// ── Caligo representative palette (from the dark navy/cyan theme) ──────────
const COLORS_NIGHT: WallpaperColors = {
  bg: "#0a0d14",
  bgSoft: "#141824",
  bgMid: "#1c2133",
  accent: "#4fc3f7",
  accentSoft: "#2a9abd",
  accentMuted: "#1a5c72",
  hueRed: "#ef5350",
  hueOrange: "#ff8a65",
  hueYellow: "#ffd54f",
  hueGreen: "#66bb6a",
  hueCyan: "#4fc3f7",
  hueBlue: "#5c6bc0",
  huePurple: "#ab47bc",
  strings: "#66bb6a",
  keywords: "#ef5350",
  functions: "#4fc3f7",
  types: "#ffd54f",
  variables: "#ab47bc",
};

const COLORS_FIRE: WallpaperColors = {
  ...COLORS_NIGHT,
  accent: "#ff6f00",
  accentSoft: "#e65100",
  accentMuted: "#bf360c",
  hueOrange: "#ff6f00",
  hueRed: "#d32f2f",
};

const COLORS_OCEAN: WallpaperColors = {
  ...COLORS_NIGHT,
  accent: "#00e5ff",
  accentSoft: "#00b8d4",
  accentMuted: "#006064",
  hueCyan: "#00e5ff",
  hueBlue: "#1565c0",
};

// ── Canvas sizes ─────────────────────────────────────────────────────────────
const W = 960,
  H = 540; // 16:9 half-HD for quick rendering

function makeParams(seedId: string, colors = COLORS_NIGHT, harmonyMode = "none"): BrickParams {
  return {
    viewBox: { width: W, height: H },
    colors,
    seedId,
    harmonyMode,
    platform: "monitor",
  };
}

// ── Brick → SVG wrapper ───────────────────────────────────────────────────────
function wrap(bg: BrickOutput, brick: BrickOutput, params: BrickParams): string {
  const composed = mergeBricks([bg, brick]);
  return toSvgDocument(composed, params.viewBox);
}

// ── Brick catalog ─────────────────────────────────────────────────────────────
interface BrickEntry {
  group: string;
  name: string;
  description: string;
  generate: () => string;
}

function makeCatalog(): BrickEntry[] {
  const p = makeParams("gallery");
  const pFire = makeParams("gallery-fire", COLORS_FIRE);
  const pOcean = makeParams("gallery-ocean", COLORS_OCEAN);
  const bg = () => backgroundBrick(p);
  const bgFire = () => backgroundBrick(pFire);
  const bgOcean = () => backgroundBrick(pOcean);

  return [
    // ── Stars & Sky ────────────────────────────────────────────────────────────
    {
      group: "Stars & Sky",
      name: "Star Field — upper",
      description: "200 stars distributed in the upper 60% with magnitude variation",
      generate: () =>
        wrap(
          bg(),
          starFieldBrick(p, {
            id: "t-sf-upper",
            count: 200,
            brightCount: 12,
            color: "#ffffff",
            distribution: "upper",
            opacity: 0.85,
          }),
          p
        ),
    },
    {
      group: "Stars & Sky",
      name: "Star Field — full",
      description: "Stars across the full canvas, simulating horizon atmosphere",
      generate: () =>
        wrap(
          bg(),
          starFieldBrick(p, {
            id: "t-sf-full",
            count: 150,
            brightCount: 8,
            color: "#ffffff",
            distribution: "full",
            opacity: 0.7,
          }),
          p
        ),
    },
    {
      group: "Stars & Sky",
      name: "Sky Gradient — dusk",
      description: "Multi-stop vertical gradient for atmospheric depth",
      generate: () =>
        wrap(
          bg(),
          skyGradientBrick(p, {
            id: "t-sky",
            stops: [
              { offset: "0%", color: p.colors.bg },
              { offset: "35%", color: p.colors.bgSoft },
              { offset: "65%", color: p.colors.hueCyan, opacity: 0.1 },
              { offset: "100%", color: p.colors.bg },
            ],
          }),
          p
        ),
    },
    {
      group: "Stars & Sky",
      name: "Shooting Star",
      description: "Meteor trail with Gaussian blur glow",
      generate: () =>
        wrap(
          bg(),
          shootingStarBrick(p, {
            id: "t-mt",
            count: 3,
            color: "#ffffff",
            opacity: 0.6,
          }),
          p
        ),
    },
    {
      group: "Stars & Sky",
      name: "Nebula Dust",
      description: "Large-scale feTurbulence cloud overlay for cosmic texture",
      generate: () =>
        wrap(
          bg(),
          nebulaDustBrick(p, {
            id: "t-nd",
            tintColor: p.colors.hueCyan,
            opacity: 0.12,
            baseFrequency: 0.015,
            numOctaves: 4,
          }),
          p
        ),
    },
    {
      group: "Stars & Sky",
      name: "Nebula Glow",
      description: "Radial blurred blobs simulating nebula cores",
      generate: () =>
        wrap(
          bg(),
          nebulaGlowBrick(p, {
            id: "t-ng",
            blur: 0.06,
            blobs: [
              { cx: 0.3, cy: 0.3, rx: 0.15, ry: 0.1, color: p.colors.hueBlue, opacity: 0.35 },
              { cx: 0.7, cy: 0.5, rx: 0.12, ry: 0.08, color: p.colors.huePurple, opacity: 0.25 },
              { cx: 0.5, cy: 0.2, rx: 0.18, ry: 0.07, color: p.colors.hueCyan, opacity: 0.2 },
            ],
          }),
          p
        ),
    },

    // ── Aurora ─────────────────────────────────────────────────────────────────
    {
      group: "Aurora",
      name: "Aurora — 3 bands",
      description: "Displaced sine-wave curtains with feDisplacementMap turbulence",
      generate: () =>
        wrap(
          bg(),
          auroraAdvancedBrick(p, {
            id: "t-au-3",
            bands: 3,
            cy: 0.25,
            zoneHeight: 0.22,
            color: p.colors.hueGreen,
            color2: p.colors.hueCyan,
            opacity: 0.55,
            displacement: true,
          }),
          p
        ),
    },
    {
      group: "Aurora",
      name: "Aurora — 5 bands wide",
      description: "Broader aurora with more bands for triadic/pulse mode",
      generate: () =>
        wrap(
          bg(),
          auroraAdvancedBrick(p, {
            id: "t-au-5",
            bands: 5,
            cy: 0.28,
            zoneHeight: 0.3,
            color: p.colors.hueGreen,
            color2: p.colors.huePurple,
            opacity: 0.5,
            displacement: true,
          }),
          p
        ),
    },
    {
      group: "Aurora",
      name: "Cloud Band — atmospheric",
      description: "feTurbulence horizontal band for mist, fog, or aurora base",
      generate: () =>
        wrap(
          bg(),
          cloudBandBrick(p, {
            id: "t-cb",
            cy: 0.35,
            bandHeight: 0.18,
            color: p.colors.hueGreen,
            opacity: 0.14,
            frequency: 0.004,
            seed: 7,
          }),
          p
        ),
    },

    // ── Moon & Celestial ────────────────────────────────────────────────────────
    {
      group: "Moon & Celestial",
      name: "Crescent Moon",
      description: "Moon with SVG mask crescent cut-out and radial glow",
      generate: () =>
        wrap(
          bg(),
          celestialBrick(p, {
            id: "t-mn",
            cx: 0.72,
            cy: 0.2,
            r: 0.025,
            color: "#e8dcc8",
            glowColor: "#c8a96e",
            glowSize: 4.5,
            crescent: { offsetX: 0.62, offsetY: -0.22, color: p.colors.bg },
          }),
          p
        ),
    },
    {
      group: "Moon & Celestial",
      name: "Ring — halo",
      description: "Stroked ellipse for moon halo or ring effects",
      generate: () =>
        wrap(
          bg(),
          ringBrick(p, {
            id: "t-rg",
            cx: 0.5,
            cy: 0.35,
            r: 0.08,
            strokeWidth: 1.5,
            color: p.colors.bgSoft,
            opacity: 0.45,
          }),
          p
        ),
    },
    {
      group: "Moon & Celestial",
      name: "Horizon Glow",
      description: "Soft radial gradient band at the horizon",
      generate: () =>
        wrap(
          bg(),
          horizonGlowBrick(p, {
            id: "t-hg",
            y: 0.65,
            color: p.colors.hueOrange,
            opacity: 0.18,
            height: 0.12,
          }),
          p
        ),
    },

    // ── Terrain & Landscape ────────────────────────────────────────────────────
    {
      group: "Terrain",
      name: "Terrain — single ridge",
      description: "Catmull-Rom bezier ridgeline with roughify pass",
      generate: () =>
        wrap(
          bg(),
          terrainBrick(p, {
            id: "t-tr",
            baseY: 0.6,
            roughness: 0.08,
            points: 40,
            color: p.colors.bgMid,
            opacity: 0.9,
            gradient: { topColor: p.colors.hueCyan, bottomColor: p.colors.bgMid, topOpacity: 0.12 },
          }),
          p
        ),
    },
    {
      group: "Terrain",
      name: "Terrain Stack — 3 layers",
      description: "Near/mid/far depth planes with atmospheric perspective",
      generate: () =>
        wrap(
          bg(),
          terrainStackBrick(p, {
            id: "t-ts",
            layers: [
              { baseY: 0.45, roughness: 0.06, color: p.colors.bgMid, opacity: 0.45 },
              { baseY: 0.55, roughness: 0.09, color: p.colors.bgSoft, opacity: 0.68 },
              { baseY: 0.68, roughness: 0.12, color: p.colors.bg, opacity: 0.92 },
            ],
          }),
          p
        ),
    },
    {
      group: "Terrain",
      name: "Terrain Contour — marching squares",
      description: "d3-contour fBm heightfield with 4 iso-surface layers",
      generate: () =>
        wrap(
          bg(),
          terrainContourBrick(p, {
            id: "t-tc",
            horizonY: 0.38,
            layers: [
              { color: p.colors.bgMid, opacity: 0.4, edgeBlur: 4 },
              { color: p.colors.bgSoft, opacity: 0.58 },
              { color: p.colors.bg, opacity: 0.82 },
              { color: "#000000", opacity: 0.95 },
            ],
          }),
          p
        ),
    },
    {
      group: "Terrain",
      name: "Ridge Highlight",
      description: "Anisotropic glow stroke on ridgeline — moonlight catching peaks",
      generate: () => {
        const tc = terrainBrick(p, {
          id: "t-tc-base",
          baseY: 0.6,
          roughness: 0.08,
          points: 40,
          color: p.colors.bgMid,
          opacity: 0.85,
          seedSuffix: "ridge-demo",
        });
        const hl = ridgeHighlightBrick(p, {
          id: "t-hl",
          baseY: 0.6,
          roughness: 0.08,
          points: 40,
          color: p.colors.hueGreen,
          opacity: 0.3,
          glowPx: 18,
          seedSuffix: "ridge-demo",
        });
        return toSvgDocument(mergeBricks([bg(), tc, hl]), p.viewBox);
      },
    },
    {
      group: "Terrain",
      name: "Treeline",
      description: "Organic silhouette of individual tree peaks",
      generate: () => {
        const base = terrainBrick(p, {
          id: "t-tl-base",
          baseY: 0.68,
          roughness: 0.04,
          points: 30,
          color: p.colors.bgMid,
          opacity: 0.8,
        });
        const tl = treelineBrick(p, {
          id: "t-tl",
          baseY: 0.68,
          count: 60,
          color: p.colors.bg,
          opacity: 0.95,
          maxHeight: 0.09,
        });
        return toSvgDocument(mergeBricks([bg(), base, tl]), p.viewBox);
      },
    },
    {
      group: "Terrain",
      name: "Dune",
      description: "Smooth sine-based desert dune ridgeline",
      generate: () =>
        wrap(
          bg(),
          duneBrick(p, {
            id: "t-dn",
            baseY: 0.65,
            ridges: 3,
            color: p.colors.bgMid,
            opacity: 0.7,
          }),
          p
        ),
    },
    {
      group: "Terrain",
      name: "Water Reflection",
      description: "Ripple-displaced horizontal mirror band",
      generate: () =>
        wrap(
          bg(),
          waterReflectionBrick(p, {
            id: "t-wr",
            waterY: 0.55,
            color: p.colors.hueBlue,
            opacity: 0.12,
            rippleScale: 10,
            rippleFrequency: 0.02,
          }),
          p
        ),
    },

    // ── City & Architecture ────────────────────────────────────────────────────
    {
      group: "City",
      name: "Cityscape — foreground",
      description: "Procedural building silhouettes with window lights",
      generate: () =>
        wrap(
          bg(),
          cityscapeBrick(p, {
            id: "t-cs",
            baseY: 0.6,
            heightRange: [0.2, 0.42],
            density: 14,
            color: p.colors.bgMid,
            opacity: 0.85,
            hasWindows: true,
            windowProbability: 0.05,
          }),
          p
        ),
    },

    // ── Fire & Atmosphere ──────────────────────────────────────────────────────
    {
      group: "Fire & Atmosphere",
      name: "Sparks — rising",
      description: "Ember particles arcing upward with feGaussianBlur glow",
      generate: () =>
        wrap(
          bgFire(),
          sparksBrick(pFire, {
            id: "t-sp",
            count: 40,
            color: pFire.colors.hueOrange,
            opacity: 0.65,
            direction: 1,
            sourceCx: 0.5,
            sourceSpread: 0.3,
          }),
          pFire
        ),
    },
    {
      group: "Fire & Atmosphere",
      name: "Lava River",
      description: "Molten lava flow path with glowing core",
      generate: () =>
        wrap(
          bgFire(),
          lavaRiverBrick(pFire, {
            id: "t-lv",
          }),
          pFire
        ),
    },
    {
      group: "Fire & Atmosphere",
      name: "Smoke Rising",
      description: "Wispy vertical smoke columns with feGaussianBlur",
      generate: () =>
        wrap(
          bgFire(),
          smokeRisingBrick(pFire, {
            id: "t-sm",
            sourceY: 0.65,
            riseHeight: 0.5,
            spreadX: 0.6,
            color: "#887070",
            opacity: 0.14,
            columns: 5,
          }),
          pFire
        ),
    },
    {
      group: "Fire & Atmosphere",
      name: "Lightning Bolt",
      description: "Jagged recursive lightning with branch forks",
      generate: () =>
        wrap(
          bg(),
          lightningBrick(p, {
            id: "t-lt",
            startX: 0.5,
            startY: 0.02,
            color: p.colors.hueCyan,
            branches: 4,
          }),
          p
        ),
    },
    {
      group: "Fire & Atmosphere",
      name: "Atmosphere",
      description: "Anisotropic scattered-light haze layer",
      generate: () =>
        wrap(
          bg(),
          atmosphereBrick(p, {
            id: "t-atmo",
            color: p.colors.bgSoft,
            highlightColor: p.colors.hueCyan,
            opacity: 0.1,
            lightAzimuth: 210,
            lightElevation: 30,
            seed: 7,
          }),
          p
        ),
    },
    {
      group: "Fire & Atmosphere",
      name: "Horizon Glow — fire",
      description: "Warm horizon bloom for wildfire or sunset scenes",
      generate: () =>
        wrap(
          bgFire(),
          horizonGlowBrick(pFire, {
            id: "t-hg-fire",
            y: 0.5,
            color: pFire.colors.hueOrange,
            opacity: 0.3,
            height: 0.15,
          }),
          pFire
        ),
    },

    // ── Ocean ──────────────────────────────────────────────────────────────────
    {
      group: "Ocean",
      name: "Jellyfish",
      description: "Anatomical jellyfish dome + bioluminescent tentacles",
      generate: () =>
        wrap(
          bgOcean(),
          jellyfishBrick(pOcean, {
            id: "t-jf",
            jellyfish: [
              { cx: 0.25, cy: 0.3, r: 0.045, color: pOcean.colors.hueCyan, opacity: 0.7 },
              { cx: 0.6, cy: 0.45, r: 0.032, color: pOcean.colors.accent, opacity: 0.6 },
              { cx: 0.8, cy: 0.25, r: 0.024, color: pOcean.colors.hueCyan, opacity: 0.5 },
              { cx: 0.45, cy: 0.62, r: 0.02, color: pOcean.colors.hueBlue, opacity: 0.45 },
            ],
          }),
          pOcean
        ),
    },
    {
      group: "Ocean",
      name: "Water Current",
      description: "Deep pressure current bands with volumetric flow",
      generate: () =>
        wrap(
          bgOcean(),
          waterCurrentBrick(pOcean, {
            id: "t-wc",
            cy: 0.5,
            zoneHeight: 0.8,
            color: pOcean.colors.hueCyan,
            opacity: 0.22,
            layers: 4,
          }),
          pOcean
        ),
    },

    // ── Vignette & Effects ─────────────────────────────────────────────────────
    {
      group: "Effects",
      name: "Vignette",
      description: "Radial darkening vignette to pull eye to center",
      generate: () => {
        // show on a lighter bg so vignette is visible
        const lightBg: BrickOutput = {
          elements: `<rect width="${W}" height="${H}" fill="#1c2133"/>`,
        };
        return toSvgDocument(
          mergeBricks([lightBg, vignetteBrick(p, { id: "t-vig", opacity: 0.7 })]),
          p.viewBox
        );
      },
    },
    {
      group: "Effects",
      name: "Tone Curve — cinematic",
      description: "S-curve contrast + slight blue-shadow tint",
      generate: () => {
        const base: BrickOutput = {
          elements: `<defs><linearGradient id="demo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7ecaf0"/><stop offset="100%" stop-color="#1a2744"/>
          </linearGradient></defs>
          <rect width="${W}" height="${H}" fill="url(#demo-g)"/>`,
        };
        return toSvgDocument(
          mergeBricks([
            base,
            toneCurveBrick(p, { id: "t-tc-tone", preset: "cinematic", opacity: 0.45 }),
          ]),
          p.viewBox
        );
      },
    },
    {
      group: "Effects",
      name: "Particles — scattered",
      description: "Random small dots for dust, embers, or plankton",
      generate: () =>
        wrap(
          bg(),
          particlesBrick(p, {
            id: "t-pt",
            count: 80,
            color: p.colors.hueOrange,
            minRadius: 1,
            maxRadius: 3,
            opacity: 0.4,
            distribution: "uniform",
          }),
          p
        ),
    },
    {
      group: "Effects",
      name: "Rays",
      description: "Radial crepuscular rays from a focal point",
      generate: () =>
        wrap(
          bg(),
          raysBrick(p, {
            id: "t-ry",
            cx: 0.5,
            cy: 0.15,
            count: 18,
            spreadDeg: 70,
            color: p.colors.hueYellow,
            opacity: 0.08,
          }),
          p
        ),
    },
  ];
}

// ── HTML gallery generator ──────────────────────────────────────────────────────

function generateGallery(catalog: BrickEntry[]): string {
  const groups = [...new Set(catalog.map(e => e.group))];

  const groupSections = groups
    .map(group => {
      const entries = catalog.filter(e => e.group === group);
      const cards = entries
        .map(entry => {
          let svgContent = "";
          try {
            svgContent = entry.generate();
            // Inline SVG: strip XML declaration, make it embeddable
            svgContent = svgContent.replace(/<\?xml[^?]*\?>\n?/, "");
          } catch (e) {
            svgContent = `<svg viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg">
          <rect width="960" height="540" fill="#1a1a2e"/>
          <text x="480" y="270" fill="#ff5555" text-anchor="middle" font-size="32">ERROR: ${String(e)}</text>
        </svg>`;
          }

          // Base64 encode for img src to avoid CORS / iframe issues
          const b64 = Buffer.from(svgContent).toString("base64");
          return `
        <div class="card">
          <div class="preview">
            <img src="data:image/svg+xml;base64,${b64}" alt="${entry.name}" loading="lazy"/>
          </div>
          <div class="info">
            <div class="name">${entry.name}</div>
            <div class="desc">${entry.description}</div>
          </div>
        </div>`;
        })
        .join("\n");

      return `
    <section>
      <h2>${group}</h2>
      <div class="grid">${cards}</div>
    </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Caligo — Brick Gallery</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #060810;
      color: #c0cae0;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      padding: 24px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #e0eaff;
      margin-bottom: 6px;
    }
    .subtitle {
      color: #5c7090;
      margin-bottom: 32px;
      font-size: 12px;
    }
    h2 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #4fc3f7;
      border-bottom: 1px solid #1c2744;
      padding-bottom: 8px;
      margin-bottom: 16px;
      margin-top: 36px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .card {
      background: #0d1220;
      border: 1px solid #1c2744;
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .card:hover { border-color: #4fc3f7; }
    .preview {
      width: 100%;
      aspect-ratio: 16/9;
      overflow: hidden;
      background: #060810;
    }
    .preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .info {
      padding: 10px 12px;
    }
    .name {
      font-weight: 600;
      color: #e0eaff;
      margin-bottom: 4px;
    }
    .desc {
      color: #4a6080;
      font-size: 11px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <h1>Caligo Brick Gallery</h1>
  <p class="subtitle">Each visual element rendered in isolation on the canonical dark background · ${catalog.length} bricks · ${new Date().toISOString().split("T")[0]}</p>
  ${groupSections}
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

const catalog = makeCatalog();
const html = generateGallery(catalog);
const out = path.join(ROOT, "public", "brick-gallery.html");
fs.writeFileSync(out, html, "utf8");
console.log(`✓ Brick gallery written → ${path.relative(ROOT, out)}`);
console.log(`  ${catalog.length} bricks across ${new Set(catalog.map(e => e.group)).size} groups`);
