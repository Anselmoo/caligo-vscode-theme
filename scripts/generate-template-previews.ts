/**
 * generate-template-previews.ts
 *
 * Renders the night-aurora.svg template for all 5 harmony modes using a
 * representative dark palette, outputting standalone SVG files to
 * src/wallpaper/templates/previews/.
 *
 * Useful for quick visual verification of palette changes without running
 * the full wallpaper generation pipeline.
 *
 * Usage:
 *   npx tsx scripts/generate-template-previews.ts
 *   npx tsx scripts/generate-template-previews.ts --mode=monochromatic
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyVars, loadTemplate } from "../src/wallpaper/templates/engine.js";
import type { WallpaperColors } from "../src/wallpaper/types.js";
import { buildNightAuroraVars } from "../src/wallpaper/motifs/aurora-vars.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(PROJECT_ROOT, "src", "wallpaper", "templates", "previews");

// ─── Reference palette (dark arctic night, matches the AuroraNoir seed intent) ─

const REFERENCE_COLORS: WallpaperColors = {
  bg:           "#020b18",
  bgSoft:       "#0d2040",
  bgMid:        "#091832",
  accent:       "#cc44ff",
  accentSoft:   "#aa77ff",
  accentMuted:  "#3a1a55",
  hueRed:       "#ff2244",
  hueOrange:    "#ff8800",
  hueYellow:    "#ffee44",
  hueGreen:     "#00e896",
  hueCyan:      "#00d4ff",
  hueBlue:      "#0066ff",
  huePurple:    "#cc44ff",
  strings:      "#00e896",
  keywords:     "#cc44ff",
  functions:    "#00d4ff",
  types:        "#ffaa66",
  variables:    "#c8d8ee",
};

const MODES = [
  "none",
  "analogous",
  "split-complementary",
  "monochromatic",
  "triadic",
] as const;

const MODE_LABELS: Record<string, string> = {
  none:                  "stillness",
  analogous:             "drift",
  "split-complementary": "break",
  monochromatic:         "void",
  triadic:               "pulse",
};

// ─── CLI filter ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filterMode = args.find(a => a.startsWith("--mode="))?.split("=")[1];

// ─── Generate ─────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

const template = loadTemplate("night-aurora.svg");
const modestoRun = filterMode ? MODES.filter(m => m === filterMode) : [...MODES];

for (const mode of modestoRun) {
  const vars = buildNightAuroraVars(REFERENCE_COLORS, mode);
  const svg = applyVars(template, vars);

  const label = MODE_LABELS[mode] ?? mode;
  const filename = `aurora-${label}.svg`;
  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, svg, "utf8");
  console.log(`✓  ${filename}`);
}

console.log(`\n📁 Previews written to src/wallpaper/templates/previews/`);
