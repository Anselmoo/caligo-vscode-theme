#!/usr/bin/env npx tsx
/**
 * audit-wallpaper-elements.ts
 *
 * Audits all generated wallpaper SVGs for thematic element presence.
 * Checks that each seed/mode combination contains expected night-scene
 * elements: night sky (mandatory), plus optional nature/universe/moon elements.
 *
 * Usage:
 *   npx tsx scripts/audit-wallpaper-elements.ts
 *
 * Exit codes:
 *   0 — all SVGs pass minimum requirements
 *   1 — some SVGs fail
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLPAPERS_DIR = resolve(__dirname, "..", "public", "wallpapers");

// ─── Element detection heuristics ─────────────────────────────────────────────

interface ElementPresence {
  /** Night sky: dark background gradient or sky gradient present */
  nightSky: boolean;
  /** Stars: starField circles or constellation lines */
  stars: boolean;
  /** Moon / celestial body: celestial brick (circle with glow filter) */
  moon: boolean;
  /** Aurora: aurora advanced brick (bézier bands with gradient) */
  aurora: boolean;
  /** Terrain / mountains / landscape: terrain or terrain-stack paths */
  terrain: boolean;
  /** Water / reflection: waterReflection brick (ripple filter) */
  water: boolean;
  /** Nebula / cosmic clouds: nebulaGlow ellipses with blur */
  nebula: boolean;
  /** Cloud / mist / atmosphere: cloudBand turbulence */
  clouds: boolean;
  /** Dunes: duneBrick ridges */
  dunes: boolean;
  /** Volcano: volcanoBrick with lava */
  volcano: boolean;
  /** Lightning: lightning bolt paths */
  lightning: boolean;
  /** Shooting stars / trails */
  shootingStars: boolean;
  /** Sparks / embers */
  sparks: boolean;
  /** Advanced filters: ≥2 filter primitives beyond basic blur/noise */
  advancedFilters: boolean;
  /** Polygon/path complexity: ≥1 complex path (not just circles) */
  complexPaths: boolean;
}

type ElementKey = keyof ElementPresence;

function detectElements(svg: string): ElementPresence {
  // Count SVG elements
  const circleCount = (svg.match(/<circle/g) || []).length;
  const pathCount = (svg.match(/<path/g) || []).length;
  const ellipseCount = (svg.match(/<ellipse/g) || []).length;
  const lineCount = (svg.match(/<line/g) || []).length;
  const filterCount = (svg.match(/<filter/g) || []).length;

  // ID-based detection
  const ids = (svg.match(/id="([^"]*)"/g) || []).map(m => m.replace(/id="|"/g, ""));

  // Night sky: any sky gradient or dark background atmosphere
  const nightSky =
    ids.some(
      id =>
        id.includes("-sky") || id.includes("bg-atm") || id.includes("-dk") || id.includes("-aby")
    ) ||
    svg.includes("skyGradient") ||
    (svg.match(/<linearGradient/g) || []).length >= 1;

  // Stars: starField brick generates circles with -st or -st- prefix, plus glow filters
  const stars =
    ids.some(id => /-(st|stars|bs|ds|ws|bl|li|ci|em|t[123])-?/.test(id) && id.includes("glow")) ||
    (circleCount >= 10 && ids.some(id => id.includes("-st")));

  // Moon / celestial: celestialBrick creates an id with -mn or -rg suffix
  const moon =
    ids.some(id => id.includes("-mn") && !id.includes("mtn")) ||
    ids.some(id => id.match(/-[a-z]+-rg$/) !== null);

  // Aurora
  const aurora = ids.some(id => id.includes("-au-"));

  // Terrain: terrainBrick/terrainStackBrick generate path ids
  const terrainIds = ids.filter(id =>
    /-(tr|lw|rw|fg|gr|td|ice|mtn|pk|mt|rd|sl|bld|rt|fl|vb|vm|vf|fm|sh\d|dc|at|wl|wr|cr|mo|vc|p[12])-?\d*$/.test(
      id
    )
  );
  const terrain = terrainIds.length > 0 || pathCount >= 2;

  // Water
  const water = ids.some(
    id =>
      id.includes("-w-") ||
      id.includes("-ref") ||
      id.includes("-wa") ||
      id.includes("-lk") ||
      id.includes("ripple")
  );

  // Nebula: nebulaGlow creates ellipses with blur filter
  const nebula = ids.some(
    id =>
      id.includes("-blur") ||
      id.includes("-em-") ||
      id.includes("-co-") ||
      id.includes("-jel") ||
      id.includes("-gl")
  );

  // Clouds / mist / atmosphere
  const clouds = ids.some(
    id =>
      id.includes("-turb") ||
      id.includes("mist") ||
      id.includes("-cl") ||
      id.includes("-hz") ||
      id.includes("-sm") ||
      id.includes("-f1") ||
      id.includes("-f2") ||
      id.includes("-f3") ||
      id.includes("-fog")
  );

  // Dunes
  const dunes = ids.some(
    id => id.includes("-d1") || id.includes("-d2") || id.includes("-d3") || id.includes("-dn")
  );

  // Volcano
  const volcano = ids.some(id => id.includes("-vc") || id.includes("lava"));

  // Lightning
  const lightning = ids.some(id => id.includes("-lt") || id.includes("-bf"));

  // Shooting stars
  const shootingStars = ids.some(
    id => id.includes("-trail") || id.includes("-ej") || id.includes("-tl")
  );

  // Sparks
  const sparks = ids.some(id => id.includes("-sp") && !id.includes("sky") && !id.includes("split"));

  // Advanced filters: count distinct filter primitives
  const advancedPrimitives = [
    "feTurbulence",
    "feDisplacementMap",
    "feDiffuseLighting",
    "feSpecularLighting",
    "feComposite",
    "feColorMatrix",
    "feComponentTransfer",
    "feMorphology",
    "feMerge",
  ];
  const foundPrimitives = advancedPrimitives.filter(p => svg.includes(`<${p}`));
  const advancedFilters = foundPrimitives.length >= 2;

  // Complex paths
  const complexPaths = pathCount >= 1;

  return {
    nightSky,
    stars,
    moon,
    aurora,
    terrain,
    water,
    nebula,
    clouds,
    dunes,
    volcano,
    lightning,
    shootingStars,
    sparks,
    advancedFilters,
    complexPaths,
  };
}

// ─── Quality gate ─────────────────────────────────────────────────────────────

interface AuditResult {
  seed: string;
  mode: string;
  fileSize: number;
  elements: ElementPresence;
  pass: boolean;
  failures: string[];
  thematicScore: number;
}

/**
 * Expected thematic elements per seed theme.
 * Elements marked true MUST exist in at least one mode.
 * Night sky is required for ALL.
 */
const SEED_EXPECTED_THEMES: Record<string, ElementKey[]> = {
  AuroraNoir: ["nightSky", "aurora", "stars", "terrain"],
  Cinder: ["nightSky", "terrain", "sparks"],
  DeepSable: ["nightSky", "nebula", "clouds"],
  Eclipse: ["nightSky", "moon", "terrain"],
  GraphiteFlux: ["nightSky", "terrain"],
  Mandarian: ["nightSky", "dunes", "terrain"],
  MidnightAtelier: ["nightSky", "moon", "terrain"],
  NebulaNight: ["nightSky", "nebula", "stars"],
  ObsidianGlow: ["nightSky", "terrain", "moon"],
  VoidEmber: ["nightSky", "terrain"],
};

function auditSvg(seed: string, mode: string, svgPath: string): AuditResult {
  const svg = readFileSync(svgPath, "utf-8");
  const fileSize = statSync(svgPath).size;
  const elements = detectElements(svg);

  const failures: string[] = [];

  // ── Mandatory: night sky ──
  if (!elements.nightSky) {
    failures.push("MISSING night-sky (dark gradient/atmosphere)");
  }

  // ── File size gate ──
  if (fileSize < 4000) {
    failures.push(`TOO-SMALL: ${fileSize} bytes (min 4000)`);
  }

  // ── Must have at least 1 complex path (polygon/terrain/curve) ──
  if (!elements.complexPaths) {
    failures.push("NO-COMPLEX-PATHS: no terrain/polygon paths");
  }

  // ── Must have at least 1 filter ──
  if (!elements.advancedFilters) {
    failures.push("NO-ADVANCED-FILTERS: fewer than 2 filter primitives");
  }

  // ── Thematic richness score ──
  const thematicKeys: ElementKey[] = [
    "stars",
    "moon",
    "aurora",
    "terrain",
    "water",
    "nebula",
    "clouds",
    "dunes",
    "volcano",
    "lightning",
    "shootingStars",
    "sparks",
  ];
  const thematicScore = thematicKeys.filter(k => elements[k]).length;

  // For monochromatic/void modes allow sparser compositions
  const minThematic = mode === "monochromatic" ? 1 : 2;
  if (thematicScore < minThematic) {
    failures.push(
      `LOW-THEMATIC: only ${thematicScore} nature/universe elements (min ${minThematic})`
    );
  }

  return {
    seed,
    mode,
    fileSize,
    elements,
    pass: failures.length === 0,
    failures,
    thematicScore,
  };
}

// ─── Cross-seed verification ──────────────────────────────────────────────────

function verifySeedCoverage(results: AuditResult[]): string[] {
  const warnings: string[] = [];
  const seedModes = new Map<string, Map<string, AuditResult>>();

  for (const r of results) {
    if (!seedModes.has(r.seed)) seedModes.set(r.seed, new Map());
    seedModes.get(r.seed)!.set(r.mode, r);
  }

  for (const [seed, modes] of seedModes) {
    const expected = SEED_EXPECTED_THEMES[seed] ?? ["nightSky"];

    // Check that expected elements appear in at least one mode
    for (const elem of expected) {
      const hasInAnyMode = [...modes.values()].some(r => r.elements[elem]);
      if (!hasInAnyMode) {
        warnings.push(`${seed}: expected element '${elem}' not found in ANY mode`);
      }
    }

    // Check global coverage: across all seeds, do we have moon in ≥3 seeds?
  }

  // Cross-seed element distribution
  const globalPresence: Record<string, number> = {};
  const thematicKeys: ElementKey[] = [
    "stars",
    "moon",
    "aurora",
    "terrain",
    "water",
    "nebula",
    "clouds",
    "dunes",
    "volcano",
    "lightning",
    "shootingStars",
    "sparks",
  ];
  for (const key of thematicKeys) {
    globalPresence[key] = [...seedModes.keys()].filter(seed => {
      const modes = seedModes.get(seed)!;
      return [...modes.values()].some(r => r.elements[key]);
    }).length;
  }

  // Moon should appear in at least 3 seed themes
  if (globalPresence.moon < 3) {
    warnings.push(`GLOBAL: moon/celestial only in ${globalPresence.moon}/10 seeds (want ≥3)`);
  }
  // Terrain should appear in most
  if (globalPresence.terrain < 7) {
    warnings.push(`GLOBAL: terrain only in ${globalPresence.terrain}/10 seeds (want ≥7)`);
  }
  // Stars should appear in most
  if (globalPresence.stars < 6) {
    warnings.push(`GLOBAL: stars only in ${globalPresence.stars}/10 seeds (want ≥6)`);
  }

  return warnings;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("🔍 Caligo Wallpaper Element Audit");
  console.log("═".repeat(70));

  const seeds = readdirSync(WALLPAPERS_DIR).filter(f =>
    statSync(join(WALLPAPERS_DIR, f)).isDirectory()
  );

  const results: AuditResult[] = [];
  const modes = ["balanced", "analogous", "monochromatic", "split-complementary", "triadic"];

  for (const seed of seeds) {
    for (const mode of modes) {
      const svgPath = join(WALLPAPERS_DIR, seed, mode, "monitor.svg");
      try {
        const result = auditSvg(seed, mode, svgPath);
        results.push(result);
      } catch {
        console.error(`  ⚠ Could not read ${seed}/${mode}/monitor.svg`);
      }
    }
  }

  // ── Per-SVG results ──
  console.log("\n📊 Per-SVG Results:");
  console.log("─".repeat(70));

  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const status = r.pass ? "✅" : "❌";
    if (r.pass) passCount++;
    else failCount++;

    const elems: string[] = [];
    if (r.elements.nightSky) elems.push("🌙night");
    if (r.elements.stars) elems.push("⭐stars");
    if (r.elements.moon) elems.push("🌕moon");
    if (r.elements.aurora) elems.push("🌈aurora");
    if (r.elements.terrain) elems.push("⛰️terrain");
    if (r.elements.water) elems.push("💧water");
    if (r.elements.nebula) elems.push("🌌nebula");
    if (r.elements.clouds) elems.push("☁️clouds");
    if (r.elements.dunes) elems.push("🏜️dunes");
    if (r.elements.volcano) elems.push("🌋volcano");
    if (r.elements.lightning) elems.push("⚡lightning");
    if (r.elements.shootingStars) elems.push("💫trails");
    if (r.elements.sparks) elems.push("✨sparks");
    if (r.elements.advancedFilters) elems.push("🔬filters");
    if (r.elements.complexPaths) elems.push("📐paths");

    const sizeStr = `${(r.fileSize / 1024).toFixed(1)}KB`.padStart(7);
    const modeStr = r.mode.padEnd(20);

    console.log(
      `${status} ${r.seed.padEnd(18)} ${modeStr} ${sizeStr}  score:${r.thematicScore}  ${elems.join(" ")}`
    );
    if (!r.pass) {
      for (const f of r.failures) {
        console.log(`   └─ ${f}`);
      }
    }
  }

  // ── Element coverage matrix ──
  console.log("\n📋 Element Coverage Matrix (balanced mode):");
  console.log("─".repeat(70));

  const header =
    "Seed".padEnd(18) +
    "night stars moon aurora terr water nebul cloud dunes volc light trail spark filt paths";
  console.log(header);

  for (const seed of seeds) {
    const r = results.find(r => r.seed === seed && r.mode === "balanced");
    if (!r) continue;
    const e = r.elements;
    const row =
      seed.padEnd(18) +
      [
        e.nightSky,
        e.stars,
        e.moon,
        e.aurora,
        e.terrain,
        e.water,
        e.nebula,
        e.clouds,
        e.dunes,
        e.volcano,
        e.lightning,
        e.shootingStars,
        e.sparks,
        e.advancedFilters,
        e.complexPaths,
      ]
        .map(v => (v ? "  ✓  " : "  ·  "))
        .join("");
    console.log(row);
  }

  // ── Cross-seed verification ──
  console.log("\n🔗 Cross-Seed Coverage Verification:");
  console.log("─".repeat(70));
  const warnings = verifySeedCoverage(results);
  if (warnings.length === 0) {
    console.log("  ✅ All expected thematic elements present across seed themes");
  } else {
    for (const w of warnings) {
      console.log(`  ⚠ ${w}`);
    }
  }

  // ── Summary ──
  console.log("\n📈 Summary:");
  console.log("─".repeat(70));
  console.log(`  Total SVGs audited: ${results.length}`);
  console.log(`  Passed: ${passCount}  Failed: ${failCount}`);
  console.log(`  Pass rate: ${((passCount / results.length) * 100).toFixed(1)}%`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
