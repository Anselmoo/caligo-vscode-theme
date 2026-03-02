/**
 * generate-wallpapers.ts
 *
 * Generates all 300 wallpaper SVGs (50 seed×mode × 3 platforms × 2 text variants)
 * and rasterises each to PNG using a single Playwright browser session.
 *
 * Usage:
 *   npx tsx scripts/generate-wallpapers.ts [--svg-only] [--seed=<id>] [--mode=<mode>]
 *
 * Flags:
 *   --svg-only    Skip PNG rasterisation (much faster for development)
 *   --seed=<id>   Only process the given seedId (e.g. --seed=Eclipse)
 *   --mode=<mode> Only process the given harmonyMode (e.g. --mode=analogous)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import type { DerivedPalette } from "../src/lib/palette.js";
import { derivePalette } from "../src/lib/palette.js";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds.js";
import { buildAllSpecs, renderWallpaperSvg, wallpaperFilename } from "../src/wallpaper/renderer.js";
import type { WallpaperSpec } from "../src/wallpaper/types.js";
import { PLATFORM_SIZES } from "../src/wallpaper/types.js";

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUTPUT_DIR = join(PROJECT_ROOT, "public", "wallpapers");

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const SVG_ONLY = args.includes("--svg-only");
const FILTER_SEED = args.find(a => a.startsWith("--seed="))?.split("=")[1];
const FILTER_MODE = args.find(a => a.startsWith("--mode="))?.split("=")[1];

// ─── Harmony mode ↔ ThemeMode mapping ────────────────────────────────────────

type ThemeMode = "Balanced" | "Analogous" | "Monochromatic" | "Triadic" | "SplitComplementary";

const HARMONY_TO_THEME_MODE: Record<string, ThemeMode> = {
  none: "Balanced",
  analogous: "Analogous",
  monochromatic: "Monochromatic",
  triadic: "Triadic",
  "split-complementary": "SplitComplementary",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎨 Caligo Wallpaper Generator");
  console.log("─".repeat(50));

  // Load all seeds and expand variants
  const baseSeeds = await loadAllSeeds();
  const expandedSeeds: Array<{
    id: string;
    displayName: string;
    harmonyMode: string;
    palette: DerivedPalette;
  }> = [];

  for (const baseSeed of baseSeeds) {
    const variants = expandSeedVariants(baseSeed);
    for (const variant of variants) {
      const harmonyMode = variant.harmony ?? "none";
      const themeMode = HARMONY_TO_THEME_MODE[harmonyMode] ?? "Balanced";
      const palette = derivePalette(variant, themeMode);

      // Extract base seedId (strip variant suffix)
      const baseName = baseSeed.id;

      expandedSeeds.push({
        id: baseName,
        displayName: baseSeed.displayName,
        harmonyMode,
        palette,
      });
    }
  }

  // Build all 300 specs and filter if requested
  const allSeeds = expandedSeeds.map(s => ({
    id: s.id,
    displayName: s.displayName,
    harmonyMode: s.harmonyMode,
  }));
  let specs = buildAllSpecs(allSeeds);

  if (FILTER_SEED) {
    specs = specs.filter(s => s.seedId === FILTER_SEED);
    console.log(`  Filtering to seed: ${FILTER_SEED}`);
  }
  if (FILTER_MODE) {
    specs = specs.filter(s => s.harmonyMode === FILTER_MODE);
    console.log(`  Filtering to mode: ${FILTER_MODE}`);
  }

  console.log(`  Generating ${specs.length} wallpapers…`);

  // Ensure output directories exist
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate all SVGs first (no browser needed)
  console.log("\n📄 Writing SVGs…");
  for (const spec of specs) {
    const palette = expandedSeeds.find(
      s => s.id === spec.seedId && s.harmonyMode === spec.harmonyMode
    )?.palette;

    if (!palette) {
      console.warn(`  ⚠  No palette found for ${spec.seedId}/${spec.harmonyMode}, skipping`);
      continue;
    }

    const svgContent = renderWallpaperSvg({ palette, spec });
    const relPath = wallpaperFilename(spec, "svg");
    const absPath = join(OUTPUT_DIR, relPath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, svgContent, "utf-8");
  }
  console.log(`  ✅ ${specs.length} SVGs written to ${OUTPUT_DIR}`);

  // Rasterise to PNG via Playwright
  if (SVG_ONLY) {
    console.log("\n⏭  Skipping PNG rasterisation (--svg-only)");
  } else {
    console.log("\n🖼  Rasterising to PNG via Playwright…");
    await rasteriseAll(specs);
  }

  console.log("\n✅ Wallpaper generation complete.");
}

async function rasteriseAll(specs: WallpaperSpec[]) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let count = 0;
  for (const spec of specs) {
    const svgRelPath = wallpaperFilename(spec, "svg");
    const svgAbsPath = join(OUTPUT_DIR, svgRelPath);

    if (!existsSync(svgAbsPath)) {
      console.warn(`  ⚠  SVG not found: ${svgRelPath}`);
      continue;
    }

    const { width, height } = PLATFORM_SIZES[spec.platform];

    // Wrap SVG in minimal HTML for consistent rendering
    const svgContent = readFileSync(svgAbsPath, "utf-8");
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;width:${width}px;height:${height}px;background:none">${svgContent}</body></html>`;

    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: "load" });

    const pngRelPath = wallpaperFilename(spec, "png");
    const pngAbsPath = join(OUTPUT_DIR, pngRelPath);
    mkdirSync(dirname(pngAbsPath), { recursive: true });

    await page.screenshot({
      path: pngAbsPath,
      clip: { x: 0, y: 0, width, height },
    });

    count++;
    if (count % 10 === 0) {
      console.log(`  ${count}/${specs.length} PNGs rendered…`);
    }
  }

  await browser.close();
  console.log(`  ✅ ${count} PNGs written`);
}

main().catch(err => {
  console.error("❌ Generation failed:", err);
  process.exit(1);
});
