/**
 * analyze-wallpaper-realism.ts
 *
 * Programmatic realism analysis for all 50 monitor-platform SVGs.
 * Detects structural patterns that produce unnatural, synthetic-looking visuals
 * when compared to real night-sky photography.
 *
 * Checks are derived from comparing SVG metrics against the gold-standard
 * reference photo (dense stars, galaxy band, crescent moon, atmospheric
 * terrain depth, non-geometric aurora).
 *
 * Run:
 *   npx tsx scripts/analyze-wallpaper-realism.ts
 *   npx tsx scripts/analyze-wallpaper-realism.ts --motif AuroraNoir
 *   npx tsx scripts/analyze-wallpaper-realism.ts --json
 *
 * Emits:
 *   public/realism-report.json
 *   public/realism-report.html
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WALLPAPERS_DIR = path.join(ROOT, "public", "wallpapers");
const OUT_JSON = path.join(ROOT, "public", "realism-report.json");
const OUT_HTML = path.join(ROOT, "public", "realism-report.html");

// Canvas dimensions (4K monitor platform)
const CANVAS_W = 3840;
const CANVAS_H = 2160;

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const motifFilter = (() => {
  const i = args.indexOf("--motif");
  return i >= 0 ? args[i + 1]?.toLowerCase() : null;
})();

// ── Realism check definitions ─────────────────────────────────────────────────

type Severity = "critical" | "moderate" | "minor";

interface RealismCheck {
  id: string;
  label: string;
  severity: Severity;
  description: string;
  reference: string; // what the gold-standard shows instead
  fix: string;
  detect: (m: SVGMetrics) => boolean;
}

interface SVGMetrics {
  svg: string;
  ids: string[];
  circleCount: number;
  pathCount: number;
  rectCount: number;
  fileSizeKB: number;
  hasAurora: boolean;
  hasTerrain: boolean;
  hasStars: boolean;
  hasMoon: boolean;
  hasGalaxyBand: boolean;
  hasNebulaDust: boolean;
  starCircles: Array<{ r: number; opacity: number; cx: number; cy: number }>;
  auroraDisplacementScale: number;
  terrainPathCommands: number;
  terrainLayerCount: number;
  hasAtmosphericHaze: boolean;
  hasCrescentMask: boolean;
  largestCircleR: number;
  celestialCx: number;
  celestialCy: number;
}

const CHECKS: RealismCheck[] = [
  // ── Star density & quality ────────────────────────────────────────────────
  {
    id: "STAR_SPARSE_4K",
    label: "Star field too sparse for 4K canvas",
    severity: "critical",
    description:
      `Night scene has fewer than 200 star circles on a ${CANVAS_W}×${CANVAS_H} canvas. ` +
      "At normal display density this renders as nearly empty sky.",
    reference: "Reference photo shows ~400–800 visible stars across the canvas.",
    fix:
      "Increase starFieldBrick count to ≥ 350 for balanced modes, ≥ 120 for void modes. " +
      "Add brightCount ≥ 8 for sparkle variation.",
    detect: m => m.hasStars && m.starCircles.length < 200,
  },
  {
    id: "STAR_NO_MAGNITUDE_RANGE",
    label: "Stars lack magnitude (size) distribution",
    severity: "moderate",
    description:
      "All star circles have radius within 0.5px of each other — no bright stars, no dim stars. " +
      "Real skies follow a magnitude distribution where a few stars are 3–5× larger.",
    reference: "Reference photo has stars ranging from barely visible (r≈0.5) to prominent (r≈3).",
    fix:
      "Ensure starFieldBrick uses at least 3 radius tiers: dim (r≈0.5–1), mid (r≈1–2), bright (r≈2–4). " +
      "brightCount ≥ 5 creates the large anchor stars.",
    detect: m => {
      if (!m.hasStars || m.starCircles.length < 10) return false;
      const radii = m.starCircles.map(s => s.r);
      const min = Math.min(...radii),
        max = Math.max(...radii);
      return max - min < 1.0; // less than 1px spread across all stars
    },
  },
  {
    id: "NO_GALAXY_BAND",
    label: "Missing galactic band / Milky Way",
    severity: "moderate",
    description:
      "Night scene has stars but no concentrated galaxy-band nebulosity. " +
      "Without a galactic core, the sky looks uniformly black — artificial.",
    reference:
      "Reference photo shows a distinct Milky Way arc with increased star density and soft diffuse glow.",
    fix:
      "Add a galaxyBandBrick (soft arc with increased star density along the band). " +
      "Alternatively, cluster stars toward one region using a non-uniform distribution.",
    detect: m => {
      if (!m.hasStars) return false;
      // No galaxy band IDs and no nebula glow that could serve as galaxy core
      const hasGalaxy = m.ids.some(id => /-(gb|galaxy|gal|mw)(-|$)/.test(id));
      const hasNebulaAsGalaxy = m.ids.some(id => /-(ng|eg)(-|$)/.test(id));
      return !hasGalaxy && !hasNebulaAsGalaxy;
    },
  },
  {
    id: "STAR_UNIFORM_UPPER_HALF",
    label: "Stars confined to upper half only",
    severity: "minor",
    description:
      "Star circles are mostly in the upper 50% of the canvas, leaving the lower sky artificially dark. " +
      "Real stars extend to near the horizon, fading only due to atmosphere.",
    reference:
      "Reference photo shows stars visible down to ~70% of canvas height near the horizon.",
    fix:
      "In starFieldBrick, set distribution to 'full' or change upper boundary from 0.5 to 0.72. " +
      "Stars near terrain line (y≈70%) should have reduced opacity to simulate atmospheric extinction.",
    detect: m => {
      if (!m.hasStars || m.starCircles.length < 30) return false;
      const belowHalf = m.starCircles.filter(s => s.cy > CANVAS_H * 0.5).length;
      return belowHalf / m.starCircles.length < 0.08; // fewer than 8% below midline
    },
  },

  // ── Aurora / atmospheric bands ─────────────────────────────────────────────
  {
    id: "AURORA_SINE_WAVE",
    label: "Aurora bands look like sine waves",
    severity: "critical",
    description:
      `Aurora displacement scale is ${"{SCALE}"}px — only {PCT}% of canvas width. ` +
      "The underlying sine wave path dominates, creating mechanical corrugated-metal appearance.",
    reference:
      "Real aurora has chaotic, turbulent vertical curtains with irregular hanging tendrils.",
    fix:
      "Increase feDisplacementMap scale to ≥ 200px (5% of 3840px canvas). " +
      "Increase turbulence numOctaves to 4+ for finer chaotic detail. " +
      "Vary band amplitude per-band by factor 1.5–3× instead of uniform amplitude.",
    detect: m => m.hasAurora && m.auroraDisplacementScale < 150,
  },
  {
    id: "AURORA_NO_VERTICAL_RAYS",
    label: "Aurora lacks vertical ray structure",
    severity: "moderate",
    description:
      "Aurora bands are rendered as horizontal stripes only — no vertical curtain rays. " +
      "Real aurora has prominent vertical structure from magnetic field lines.",
    reference: "Real aurora shows tall vertical beams/rays superimposed on the horizontal band.",
    fix:
      "Add vertical ray elements above each aurora band: thin paths or raysBrick(spreadDeg=20) " +
      "pointing upward from the top edge of each band.",
    detect: m => {
      if (!m.hasAurora) return false;
      // Has aurora bands but no vertical ray IDs
      return !m.ids.some(id => /-(ry|ray|vr|vray)(-|$)/.test(id));
    },
  },

  // ── Moon / celestial bodies ────────────────────────────────────────────────
  {
    id: "MOON_FULL_CIRCLE",
    label: "Moon rendered as full circle (no crescent)",
    severity: "moderate",
    description:
      "The moon element is a simple filled circle with no clip mask or cutout for crescent shape. " +
      "A full-circle moon looks like a planet or generic orb, not a realistic moon.",
    reference: "Reference photo shows a distinct crescent moon with visible dark side.",
    fix:
      "Add a clip path to celestialBrick: overlay a dark circle offset by 60–70% of moon radius " +
      "to create a natural crescent shape. Alternatively add a 'crescent' mode param.",
    detect: m => {
      if (!m.hasMoon) return false;
      return !m.hasCrescentMask;
    },
  },
  {
    id: "CELESTIAL_OVERSIZED",
    label: "Moon or celestial body too large",
    severity: "moderate",
    description:
      `Largest celestial circle radius (${"{R}"}px) exceeds 6% of canvas height (${Math.round(CANVAS_H * 0.06)}px). ` +
      "This looks like a planet or game asset, not a natural moon.",
    reference: "Reference photo moon occupies ~2–3% of canvas height.",
    fix:
      "Reduce celestialBrick r to ≤ 0.025 (2.5% of canvas short axis). " +
      "Compensate with a larger, softer glowSize (3–5×) rather than large body radius.",
    detect: m => m.hasMoon && m.largestCircleR > CANVAS_H * 0.06,
  },
  {
    id: "CELESTIAL_DEAD_CENTER",
    label: "Focal element at exact canvas center",
    severity: "minor",
    description:
      "Primary celestial body or glow element is positioned at or very near the exact center " +
      "(cx ≈ 1920, cy ≈ 1080). This produces a static, symmetrical composition.",
    reference:
      "Reference photo places moon at ~75% x, 25% y — rule-of-thirds off-center composition.",
    fix:
      "Use cx between 0.6–0.85 and cy between 0.15–0.35 for upper-third off-axis placement. " +
      "Avoid cx=0.5 ± 0.04 and cy=0.5 ± 0.04.",
    detect: m => {
      if (!m.hasMoon && m.largestCircleR < 50) return false;
      const cx = m.celestialCx,
        cy = m.celestialCy;
      return (
        Math.abs(cx - CANVAS_W / 2) < CANVAS_W * 0.04 &&
        Math.abs(cy - CANVAS_H / 2) < CANVAS_H * 0.04
      );
    },
  },

  // ── Terrain depth & naturalness ────────────────────────────────────────────
  {
    id: "TERRAIN_SINGLE_LAYER",
    label: "Single terrain layer — no depth",
    severity: "critical",
    description:
      "Scene has terrain but only one depth layer. Without near/mid/far planes, " +
      "the landscape looks like a flat cardboard cutout.",
    reference:
      "Reference photo shows 4 distinct terrain ridges receding into distance " +
      "with atmospheric perspective (lighter and bluer toward horizon).",
    fix:
      "Use terrainContourBrick with layers ≥ 3 or call terrainContourBrick multiple times " +
      "at different horizonY values (0.45, 0.55, 0.65, 0.75) with progressively lighter colors.",
    detect: m => m.hasTerrain && m.terrainLayerCount <= 1,
  },
  {
    id: "TERRAIN_NO_ATMOSPHERIC_DEPTH",
    label: "Multi-layer terrain without atmospheric perspective",
    severity: "moderate",
    description:
      "Scene has 2+ terrain layers but no atmospheric haze between them. " +
      "Without depth fog, far and near terrain look the same — artificial.",
    reference: "Reference photo shows clearly lighter/bluer far ridges and dark near treeline.",
    fix:
      "Add cloudBandBrick(cy=0.55, color=bgSoft, opacity=0.06) as depth haze between terrain layers. " +
      "Or add atmosphereBrick with low opacity to the mid-distance region.",
    detect: m => m.hasTerrain && m.terrainLayerCount >= 2 && !m.hasAtmosphericHaze,
  },
  {
    id: "TERRAIN_LOW_DETAIL",
    label: "Terrain path too simple (< 80 path commands)",
    severity: "minor",
    description:
      "Terrain paths have fewer than 80 C/L commands — the silhouette is too smooth and geometric, " +
      "lacking the organic jaggedness of real mountain/hill profiles.",
    reference:
      "Real terrain silhouettes have complex irregular profiles with hundreds of subtle inflections.",
    fix:
      "Increase terrain path resolution: more samples along the curve (every 20px instead of 40px). " +
      "Add secondary noise layer to terrain Y values for micro-roughness.",
    detect: m => m.hasTerrain && m.terrainPathCommands > 0 && m.terrainPathCommands < 80,
  },
  {
    id: "TERRAIN_NO_TREELINE",
    label: "Terrain without treeline detail",
    severity: "minor",
    description:
      "Ground terrain present but no treeline silhouette. " +
      "Real landscapes almost always show organic tree-top profiles at terrain edge.",
    reference:
      "Reference photo shows distinct organic treeline with individual peaks along the ridgeline.",
    fix: "Add treelineBrick(baseY=0.72, count=60, maxHeight=0.09) above the foreground terrain layer.",
    detect: m => m.hasTerrain && !m.ids.some(id => /-tl(-|$)/.test(id)),
  },

  // ── Compositional realism ─────────────────────────────────────────────────
  {
    id: "HORIZON_GLOW_ABSENT",
    label: "No horizon atmospheric glow in landscape scene",
    severity: "moderate",
    description:
      "Scene has terrain but no horizon glow. Real atmospheres scatter light at the horizon, " +
      "creating a brightened band where sky meets land.",
    reference: "Reference photo shows a distinct blue atmospheric glow band along the horizon.",
    fix:
      "Add horizonGlowBrick(y=0.68, color=bgSoft, opacity=0.12, height=0.08). " +
      "Use a cooler (blue/cyan) color for night scenes to simulate atmospheric scatter.",
    detect: m => {
      if (!m.hasTerrain) return false;
      return !m.ids.some(id => /-(hg|atmo|atm)(-|$)/.test(id));
    },
  },
  {
    id: "SCENE_MISSING_GROUND",
    label: "Scene floats — no ground reference",
    severity: "critical",
    description:
      "No terrain, dune, treeline, or ground-anchoring element detected. " +
      "Scene appears to float in void without spatial context.",
    reference:
      "Reference photo has clear terrain silhouette anchoring the bottom third of the frame.",
    fix:
      "Add at minimum a single-layer terrainContourBrick at horizonY=0.75 or duneBrick at baseY=0.7. " +
      "Even a hint of ground transforms a 'void' into a 'landscape'.",
    detect: m => {
      const hasAnyGround =
        m.hasTerrain ||
        m.ids.some(id => /-(d1|d2|d3|dn|tl|ripple|wv)(-|$)/.test(id)) ||
        // cityscape: skyline, buildings, city, ghost buildings
        m.ids.some(id => /-(sl|bld|city|cs|ug|gh)(-|$)/.test(id)) ||
        // ocean/water: currents, jellyfish, abyss, reef
        m.ids.some(id => /-(cu|jel|wc|aby|rf)(-|$)/.test(id)) ||
        // numbered terrain layers (terrainStackBrick: id-0, id-1, id-2)
        m.ids.some(id => /-[0-9]+$/.test(id)) ||
        // single terrain bricks with common abbreviations
        m.ids.some(id => /-(vb|vm|vf|hl|hz|gr|br|ds|fm|fm|at|vc|wl|wr|fl)(-|$)/.test(id));
      return !hasAnyGround;
    },
  },
  {
    id: "MISSING_NEBULA_DUST",
    label: "No large-scale cosmic dust overlay",
    severity: "minor",
    description:
      "No low-frequency feTurbulence (baseFrequency ≤ 0.025) detected. " +
      "Without large-scale organic cloud blobs the sky background looks like a plain gradient.",
    reference:
      "Reference SVG uses feTurbulence(fractalNoise, baseFrequency=0.015) + feColorMatrix constant-color " +
      "trick to create large nebular cloud structures tinted to the scene's accent color.",
    fix:
      "nebulaDustBrick is wired into backgroundBrick and auto-applied to all scenes. " +
      "If missing, verify backgroundBrick is the first brick in the motif composition.",
    detect: m => !m.hasNebulaDust,
  },
];

// ── SVG parser / metrics extractor ────────────────────────────────────────────

function extractMetrics(svg: string, ids: string[]): SVGMetrics {
  const circleCount = (svg.match(/<circle/g) ?? []).length;
  const pathCount = (svg.match(/<path/g) ?? []).length;
  const rectCount = (svg.match(/<rect/g) ?? []).length;
  const fileSizeKB = Math.round(svg.length / 1024);

  const hasAurora = ids.some(id => /-au(-|$)/.test(id));
  const hasTerrain = ids.some(id => /-(mtn|tc|rd|cr|tr)(-|$)/.test(id));
  const hasStars = ids.some(id => /-st(-|$)/.test(id));
  const hasMoon = ids.some(id => /-(mn|pl)(-|$)/.test(id));
  const hasGalaxyBand = ids.some(id => /-(gb|galaxy|gal|mw|ng)(-|$)/.test(id));

  // Extract star circles (small circles with fill=#fff or opacity < 0.5)
  const starCircles: SVGMetrics["starCircles"] = [];
  for (const cm of svg.matchAll(/<circle\s+([^/]*?)\/>/gs)) {
    const attrs = cm[1];
    const r = parseFloat(attrs.match(/\br="([0-9.]+)"/)?.[1] ?? "999");
    const op = parseFloat(attrs.match(/opacity="([0-9.]+)"/)?.[1] ?? "1");
    const cx = parseFloat(attrs.match(/\bcx="([0-9.]+)"/)?.[1] ?? "-1");
    const cy = parseFloat(attrs.match(/\bcy="([0-9.]+)"/)?.[1] ?? "-1");
    if (r < 10 && cx >= 0) {
      starCircles.push({ r, opacity: op, cx, cy });
    }
  }

  // Aurora displacement scale
  let auroraDisplacementScale = 0;
  if (hasAurora) {
    for (const dm of svg.matchAll(/feDisplacementMap[^>]*scale="([0-9.]+)"/g)) {
      const scale = parseFloat(dm[1]);
      if (scale > auroraDisplacementScale) auroraDisplacementScale = scale;
    }
  }

  // Terrain path commands (count C/L commands in terrain paths)
  let terrainPathCommands = 0;
  let terrainLayerCount = 0;
  const terrainIDs = ids.filter(id => /-(mtn|tc|rd|cr|tr)(-|$)/.test(id));
  terrainLayerCount = terrainIDs.length;
  for (const tid of terrainIDs) {
    const pathRe = new RegExp(`id="${tid}"[^>]*d="([^"]+)"`);
    const pathMatch = svg.match(pathRe);
    if (pathMatch) {
      const d = pathMatch[1];
      terrainPathCommands += (d.match(/[CcLlQqAa]/g) ?? []).length;
    }
  }

  // Also check for duneBrick layers as terrain
  const duneLayerCount = ids.filter(id => /-(d1|d2|d3|dn)(-|$)/.test(id)).length;
  if (duneLayerCount > 0) {
    terrainLayerCount = Math.max(terrainLayerCount, duneLayerCount);
  }

  const hasAtmosphericHaze = ids.some(id => /-(atmo|atm|mist|hz|haze)(-|$)/.test(id));

  // Nebula dust: presence of low-frequency feTurbulence (baseFrequency ≤ 0.025)
  const hasNebulaDust = [...svg.matchAll(/feTurbulence[^>]*baseFrequency="([0-9.]+)"/g)].some(
    ndm => parseFloat(ndm[1]) <= 0.025
  );

  // Crescent moon: has a clip path referencing a circle offset from moon
  const hasCrescentMask = /clipPath|mask/.test(svg) && hasMoon;

  // Largest celestial body radius
  let largestCircleR = 0;
  let celestialCx = 0;
  let celestialCy = 0;
  for (const bm of svg.matchAll(/<circle[^>]*r="([0-9.]+)"[^>]*\/>/g)) {
    const r = parseFloat(bm[1]);
    if (r > largestCircleR && r < CANVAS_W * 0.5) {
      largestCircleR = r;
      celestialCx = parseFloat(bm[0].match(/cx="([0-9.]+)"/)?.[1] ?? "0");
      celestialCy = parseFloat(bm[0].match(/cy="([0-9.]+)"/)?.[1] ?? "0");
    }
  }

  return {
    svg,
    ids,
    circleCount,
    pathCount,
    rectCount,
    fileSizeKB,
    hasAurora,
    hasTerrain,
    hasStars,
    hasMoon,
    hasGalaxyBand,
    hasNebulaDust,
    starCircles,
    auroraDisplacementScale,
    terrainPathCommands,
    terrainLayerCount,
    hasAtmosphericHaze,
    hasCrescentMask,
    largestCircleR,
    celestialCx,
    celestialCy,
  };
}

// ── Report types ──────────────────────────────────────────────────────────────

interface RealismIssue {
  id: string;
  label: string;
  severity: Severity;
  details: string; // filled with actual values from the SVG
}

interface RealismReport {
  motif: string;
  mode: string;
  file: string;
  fileSizeKB: number;
  metrics: {
    starCount: number;
    auroraDisplacement: number;
    terrainLayers: number;
    hasGalaxyBand: boolean;
    hasCrescentMoon: boolean;
    hasNebulaDust: boolean;
    largestCircleR: number;
    terrainPathCommands: number;
  };
  issues: RealismIssue[];
  realismScore: number; // 0–100, higher = more realistic
  grade: "A" | "B" | "C" | "D" | "F";
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

function analyzeOne(filePath: string, motif: string, mode: string): RealismReport {
  const svg = fs.readFileSync(filePath, "utf8");
  const ids = (svg.match(/\sid="([^"]+)"/g) ?? []).map(m =>
    m.replace(/^\s*id="/, "").replace(/"$/, "")
  );
  const fileSizeKB = Math.round(fs.statSync(filePath).size / 1024);

  const metrics = extractMetrics(svg, ids);

  const issues: RealismIssue[] = [];
  for (const check of CHECKS) {
    if (!check.detect(metrics)) continue;
    const pct = ((metrics.auroraDisplacementScale / CANVAS_W) * 100).toFixed(1);
    const details = check.description
      .replace("{SCALE}", String(metrics.auroraDisplacementScale))
      .replace("{PCT}", pct)
      .replace("{R}", String(Math.round(metrics.largestCircleR)));
    issues.push({ id: check.id, label: check.label, severity: check.severity, details });
  }

  // Realism score: start at 100, deduct per issue
  const DEDUCTIONS: Record<Severity, number> = { critical: 25, moderate: 12, minor: 5 };
  let score = 100;
  for (const issue of issues) {
    score -= DEDUCTIONS[issue.severity];
  }
  score = Math.max(0, score);

  const grade: RealismReport["grade"] =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";

  return {
    motif,
    mode,
    file: path.relative(ROOT, filePath),
    fileSizeKB,
    metrics: {
      starCount: metrics.starCircles.length,
      auroraDisplacement: metrics.auroraDisplacementScale,
      terrainLayers: metrics.terrainLayerCount,
      hasGalaxyBand: metrics.hasGalaxyBand,
      hasCrescentMoon: metrics.hasCrescentMask,
      hasNebulaDust: metrics.hasNebulaDust,
      largestCircleR: Math.round(metrics.largestCircleR),
      terrainPathCommands: metrics.terrainPathCommands,
    },
    issues,
    realismScore: score,
    grade,
  };
}

// ── Console reporter ──────────────────────────────────────────────────────────

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

function gradeColor(g: string): string {
  return g === "A" ? ANSI.green : g === "B" ? ANSI.cyan : g === "F" ? ANSI.red : ANSI.yellow;
}

function severityEmoji(s: Severity): string {
  return s === "critical" ? "🔴" : s === "moderate" ? "🟡" : "🟢";
}

function printConsole(reports: RealismReport[]): void {
  const sorted = [...reports].sort((a, b) => a.realismScore - b.realismScore);

  console.log(
    `\n${ANSI.bold}Caligo Wallpaper Realism Analysis${ANSI.reset} · ${reports.length} SVGs\n`
  );
  console.log(
    `${ANSI.dim}${"Motif/Mode".padEnd(40)} Score  Grade  Stars  AuDisp  Layers  Issues${ANSI.reset}`
  );
  console.log("─".repeat(100));

  for (const r of sorted) {
    const label = `${r.motif}/${r.mode}`.padEnd(40);
    const gc = gradeColor(r.grade);
    const issueList =
      r.issues.length > 0
        ? ` ${ANSI.red}${r.issues.map(i => i.id).join(" ")}${ANSI.reset}`
        : ` ${ANSI.green}✓${ANSI.reset}`;

    console.log(
      `${ANSI.white}${label}${ANSI.reset}` +
        `  ${gc}${String(r.realismScore).padEnd(5)}${ANSI.reset}` +
        `  ${gc}${r.grade}${ANSI.reset}     ` +
        `${String(r.metrics.starCount).padEnd(5)}  ` +
        `${String(r.metrics.auroraDisplacement).padEnd(8)}` +
        `${String(r.metrics.terrainLayers).padEnd(8)}` +
        issueList
    );
  }

  // Issue summary
  const issueCounts: Record<string, number> = {};
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<string, number>;
  for (const r of reports) {
    grades[r.grade]++;
    for (const i of r.issues) issueCounts[i.id] = (issueCounts[i.id] ?? 0) + 1;
  }

  console.log("\n─".padEnd(101, "─"));
  console.log(`\n${ANSI.bold}Grade distribution:${ANSI.reset}`);
  for (const [g, n] of Object.entries(grades)) {
    const gc = gradeColor(g);
    console.log(`  ${gc}${g}${ANSI.reset}  ${"█".repeat(n).padEnd(50)} ${n}`);
  }

  if (Object.keys(issueCounts).length > 0) {
    console.log(`\n${ANSI.bold}Realism issues (by frequency):${ANSI.reset}`);
    for (const [id, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
      const check = CHECKS.find(c => c.id === id);
      if (!check) continue;
      const color =
        check.severity === "critical"
          ? ANSI.red
          : check.severity === "moderate"
            ? ANSI.yellow
            : ANSI.gray;
      console.log(
        `  ${severityEmoji(check.severity)} ${color}${id.padEnd(30)}${ANSI.reset} ${"█".repeat(count)} (${count})`
      );
    }
  }

  const avgScore = Math.round(reports.reduce((s, r) => s + r.realismScore, 0) / reports.length);
  console.log(`\nAvg realism score: ${avgScore}/100\n`);
}

// ── HTML report ───────────────────────────────────────────────────────────────

function buildHtml(reports: RealismReport[]): string {
  const sorted = [...reports].sort((a, b) => a.realismScore - b.realismScore);

  const sevColor: Record<Severity, string> = {
    critical: "#e05252",
    moderate: "#d4a04a",
    minor: "#7a9e6e",
  };
  const gradeCol: Record<string, string> = {
    A: "#5a9e6e",
    B: "#4a8ab4",
    C: "#d4a04a",
    D: "#d48044",
    F: "#e05252",
  };

  const checkDefs = CHECKS.map(
    c => `
    <tr>
      <td><span class="badge" style="background:${sevColor[c.severity]}">${c.id}</span></td>
      <td>${c.label}</td>
      <td class="sev-${c.severity}">${c.severity}</td>
      <td>${c.description}</td>
      <td style="color:#6a9e8a;font-size:10px;font-style:italic">${c.reference}</td>
      <td>${c.fix}</td>
    </tr>`
  ).join("");

  const cards = sorted
    .map(r => {
      const svgContent = fs.readFileSync(path.join(ROOT, r.file), "utf8");
      const gc = gradeCol[r.grade] ?? "#888";
      const hasCrit = r.issues.some(i => i.severity === "critical");
      const hasMod = r.issues.some(i => i.severity === "moderate");
      const borderColor = hasCrit ? "#e05252" : hasMod ? "#d4a04a" : "#2a2a3a";

      const issueBadges = r.issues
        .map(
          i =>
            `<span class="badge" style="background:${sevColor[i.severity]}" title="${i.details}">${i.id}</span>`
        )
        .join(" ");

      const metricRow = (label: string, val: string | number, flag?: boolean) =>
        `<div class="metric-row"><span class="metric-label">${label}</span><span class="metric-val${flag === false ? " bad" : flag === true ? " good" : ""}">${val}</span></div>`;

      return `
  <div class="card" style="border-color:${borderColor}">
    <div class="thumb">${svgContent}</div>
    <div class="meta">
      <div class="title-row">
        <span class="title">${r.motif} / ${r.mode}</span>
        <span class="grade" style="color:${gc}">${r.grade}</span>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar" style="width:${r.realismScore}%;background:${gc}"></div>
        <span class="score-num">${r.realismScore}</span>
      </div>
      <div class="metrics">
        ${metricRow("Stars", r.metrics.starCount, r.metrics.starCount >= 200)}
        ${metricRow("AuroraDisp", `${r.metrics.auroraDisplacement}px`, r.metrics.auroraDisplacement >= 150)}
        ${metricRow("TerrainLayers", r.metrics.terrainLayers, r.metrics.terrainLayers >= 2)}
        ${metricRow("GalaxyBand", r.metrics.hasGalaxyBand ? "yes" : "no", r.metrics.hasGalaxyBand)}
        ${metricRow("NebulaDust", r.metrics.hasNebulaDust ? "yes" : "no", r.metrics.hasNebulaDust)}
        ${metricRow("CrescentMoon", r.metrics.hasCrescentMoon ? "yes" : "no")}
        ${metricRow("TerrainCmds", r.metrics.terrainPathCommands)}
      </div>
      <div class="issues">${issueBadges || '<span class="ok">✓ realistic</span>'}</div>
    </div>
  </div>`;
    })
    .join("\n");

  const avgScore = Math.round(reports.reduce((s, r) => s + r.realismScore, 0) / reports.length);
  const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<string, number>;
  const issueCounts: Record<string, number> = {};
  for (const r of reports) {
    grades[r.grade]++;
    for (const i of r.issues) issueCounts[i.id] = (issueCounts[i.id] ?? 0) + 1;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Wallpaper Realism Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0e0e18; color: #c8c8d8; font: 12px/1.5 "JetBrains Mono","Fira Code",monospace; }
  header { padding: 24px 32px 16px; border-bottom: 1px solid #1e1e2e; }
  header h1 { font-size: 20px; color: #e8e8f8; }
  header p { color: #6c6c8c; font-size: 11px; margin-top: 4px; }
  .summary { display: flex; gap: 20px; padding: 14px 32px; background: #12121e; border-bottom: 1px solid #1e1e2e; flex-wrap: wrap; align-items: center; }
  .stat { text-align: center; }
  .stat .val { font-size: 24px; font-weight: 700; }
  .stat .lbl { font-size: 10px; color: #6c6c8c; text-transform: uppercase; letter-spacing: 0.08em; }
  .divider { width: 1px; height: 40px; background: #2a2a3a; }
  section { padding: 18px 32px; }
  section h2 { font-size: 13px; color: #a0a0c0; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 6px 8px; background: #1a1a2e; color: #6c6c8c; text-transform: uppercase; letter-spacing: 0.06em; }
  td { padding: 5px 8px; border-bottom: 1px solid #1a1a2e; vertical-align: top; }
  .sev-critical { color: #e05252; } .sev-moderate { color: #d4a04a; } .sev-minor { color: #7a9e6e; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; padding: 0 32px 40px; }
  .card { border: 1px solid #2a2a3a; border-radius: 6px; overflow: hidden; background: #12121e; }
  .thumb { aspect-ratio: 16/10; overflow: hidden; background: #0a0a14; }
  .thumb svg { width: 100%; height: 100%; display: block; }
  .meta { padding: 10px 12px; }
  .title-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .title { font-size: 11px; color: #d0d0e8; font-weight: 700; }
  .grade { font-size: 22px; font-weight: 700; }
  .score-bar-wrap { height: 5px; background: #1a1a2e; border-radius: 3px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .score-bar { height: 100%; border-radius: 3px; }
  .score-num { font-size: 10px; color: #8080a0; white-space: nowrap; }
  .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; margin-bottom: 8px; }
  .metric-row { display: flex; justify-content: space-between; font-size: 10px; }
  .metric-label { color: #5c5c7c; }
  .metric-val { color: #9090b0; }
  .metric-val.good { color: #5a9e6e; }
  .metric-val.bad { color: #e05252; }
  .issues { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
  .ok { color: #5a9e6e; font-size: 10px; }
  .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; color: #fff; cursor: default; }
</style>
</head>
<body>
<header>
  <h1>Wallpaper Realism Report</h1>
  <p>Generated ${new Date().toISOString()} · ${reports.length} SVGs · avg realism score ${avgScore}/100
     · Compared against gold-standard night-sky photography reference</p>
</header>

<div class="summary">
  <div class="stat"><div class="val">${reports.length}</div><div class="lbl">Total</div></div>
  <div class="divider"></div>
  ${Object.entries(grades)
    .map(
      ([g, n]) =>
        `<div class="stat"><div class="val" style="color:${gradeCol[g]}">${n}</div><div class="lbl">Grade ${g}</div></div>`
    )
    .join("\n  ")}
  <div class="divider"></div>
  <div class="stat"><div class="val">${avgScore}</div><div class="lbl">Avg Score</div></div>
  <div class="divider"></div>
  ${Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => {
      const check = CHECKS.find(c => c.id === id);
      const col = check ? sevColor[check.severity] : "#888";
      return `<div class="stat"><div class="val" style="color:${col}">${n}</div><div class="lbl" style="font-size:9px">${id.replace(/_/g, " ")}</div></div>`;
    })
    .join("\n  ")}
</div>

<section>
  <h2>Realism Check Definitions (vs. Gold-Standard Reference)</h2>
  <table>
    <thead><tr><th>Check ID</th><th>Label</th><th>Severity</th><th>Description</th><th>Reference Photo</th><th>Fix</th></tr></thead>
    <tbody>${checkDefs}</tbody>
  </table>
</section>

<section style="padding-bottom:8px"><h2>Gallery — sorted by realism score (least realistic first)</h2></section>
<div class="gallery">
${cards}
</div>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function run(): void {
  const reports: RealismReport[] = [];

  const motifs = fs
    .readdirSync(WALLPAPERS_DIR)
    .filter(
      m =>
        fs.statSync(path.join(WALLPAPERS_DIR, m)).isDirectory() &&
        (!motifFilter || m.toLowerCase() === motifFilter)
    );

  for (const motif of motifs.sort()) {
    const motifDir = path.join(WALLPAPERS_DIR, motif);
    const modes = fs
      .readdirSync(motifDir)
      .filter(m => fs.statSync(path.join(motifDir, m)).isDirectory());
    for (const mode of modes.sort()) {
      const svgPath = path.join(motifDir, mode, "monitor.svg");
      if (!fs.existsSync(svgPath)) continue;
      reports.push(analyzeOne(svgPath, motif, mode));
    }
  }

  if (jsonOnly) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
    return;
  }

  printConsole(reports);

  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2)
  );
  console.log(`✓ ${OUT_JSON}`);
  fs.writeFileSync(OUT_HTML, buildHtml(reports));
  console.log(`✓ ${OUT_HTML}`);
}

run();
