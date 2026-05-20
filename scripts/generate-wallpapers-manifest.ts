/**
 * generate-wallpapers-manifest.ts
 *
 * Scans public/wallpapers/ for generated files and emits
 * public/wallpapers-manifest.json, used by the Vue gallery.
 *
 * Usage:
 *   npx tsx scripts/generate-wallpapers-manifest.ts
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { derivePalette } from "../src/lib/palette.js";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds.js";
import { extractWallpaperColors } from "../src/wallpaper/renderer.js";
import type { WallpaperManifestEntry, WallpapersManifest } from "../src/wallpaper/types.js";
import { MODE_TOPICS } from "../src/wallpaper/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const WALLPAPERS_DIR = join(PROJECT_ROOT, "public", "wallpapers");
const OUTPUT_FILE = join(PROJECT_ROOT, "public", "wallpapers-manifest.json");

type ThemeMode = "Balanced" | "Analogous" | "Monochromatic" | "Triadic" | "SplitComplementary";

const HARMONY_TO_THEME_MODE: Record<string, ThemeMode> = {
  none: "Balanced",
  analogous: "Analogous",
  monochromatic: "Monochromatic",
  triadic: "Triadic",
  "split-complementary": "SplitComplementary",
};

const HARMONY_LABELS: Record<string, string> = {
  none: "Balanced",
  analogous: "Analogous",
  monochromatic: "Monochromatic",
  triadic: "Triadic",
  "split-complementary": "Split-Complementary",
};

async function main() {
  console.log("📋 Generating wallpapers manifest…");

  if (!existsSync(WALLPAPERS_DIR)) {
    console.warn("⚠️  public/wallpapers/ not found — skipping manifest generation.");
    console.warn("   Run `npm run wallpapers:generate` to generate wallpaper files.");
    process.exit(0);
  }

  // Build palette cache
  const paletteCacheMap = new Map<string, ReturnType<typeof extractWallpaperColors>>();
  const baseSeeds = await loadAllSeeds();
  for (const baseSeed of baseSeeds) {
    const variants = expandSeedVariants(baseSeed);
    for (const variant of variants) {
      const harmonyMode = variant.harmony ?? "none";
      const themeMode = HARMONY_TO_THEME_MODE[harmonyMode] ?? "Balanced";
      const palette = derivePalette(variant, themeMode);
      const key = `${baseSeed.id}/${harmonyMode}`;
      paletteCacheMap.set(key, extractWallpaperColors(palette));
    }
  }

  const entries: WallpaperManifestEntry[] = [];

  // Walk the directory structure: {seedId}/{mode}/{platform}[-text].{ext}
  for (const seedDir of readdirSync(WALLPAPERS_DIR, { withFileTypes: true })) {
    if (!seedDir.isDirectory()) continue;
    const seedId = seedDir.name;
    const seedPath = join(WALLPAPERS_DIR, seedId);

    for (const modeDir of readdirSync(seedPath, { withFileTypes: true })) {
      if (!modeDir.isDirectory()) continue;
      const modeFolder = modeDir.name;
      // modeFolder is "balanced" | "analogous" | "monochromatic" | "triadic" | "split-complementary"
      const harmonyMode = modeFolder === "balanced" ? "none" : modeFolder;
      const modePath = join(seedPath, modeFolder);

      // Find base seed displayName
      const baseSeed = baseSeeds.find(s => s.id === seedId);
      const seedDisplayName = baseSeed?.displayName ?? seedId;

      const colors = paletteCacheMap.get(`${seedId}/${harmonyMode}`);
      if (!colors) {
        console.warn(`  ⚠  No palette for ${seedId}/${harmonyMode}`);
        continue;
      }

      for (const file of readdirSync(modePath)) {
        if (!file.endsWith(".svg")) continue;

        const base = file.replace(".svg", "");
        const isText = base.endsWith("-text");
        const platformRaw = isText ? base.replace("-text", "") : base;
        const platform = platformRaw as "monitor" | "tablet" | "mobile";
        const textVariant = isText ? "text" : ("no-text" as const);

        const svgPath = `wallpapers/${seedId}/${modeFolder}/${file}`;
        const pngPath = `wallpapers/${seedId}/${modeFolder}/${base}.png`;
        const topic = MODE_TOPICS[harmonyMode] ?? "Core";

        entries.push({
          seedId,
          seedDisplayName,
          harmonyMode,
          harmonyLabel: HARMONY_LABELS[harmonyMode] ?? harmonyMode,
          topic,
          platform,
          textVariant,
          displayName: `${seedDisplayName} · ${topic}`,
          svgPath,
          pngPath,
          colors,
        });
      }
    }
  }

  // Sort: seed → mode → platform → textVariant
  const modeOrder = ["none", "analogous", "split-complementary", "monochromatic", "triadic"];
  const platformOrder = ["monitor", "tablet", "mobile"];
  entries.sort((a, b) => {
    if (a.seedId !== b.seedId) return a.seedId.localeCompare(b.seedId);
    const mi = modeOrder.indexOf(a.harmonyMode) - modeOrder.indexOf(b.harmonyMode);
    if (mi !== 0) return mi;
    const pi = platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform);
    if (pi !== 0) return pi;
    return a.textVariant.localeCompare(b.textVariant);
  });

  const manifest: WallpapersManifest = { total: entries.length, entries };

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`✅ Generated wallpapers-manifest.json with ${entries.length} entries`);
  console.log(`   Output: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error("❌ Manifest generation failed:", err);
  process.exit(1);
});
