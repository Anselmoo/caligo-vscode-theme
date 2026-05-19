/**
 * bundle-wallpapers.ts
 *
 * Creates public/caligo-wallpapers.zip containing all generated wallpaper files.
 * Both SVGs and PNGs are included, organised by seed/mode/platform.
 *
 * Usage:
 *   npx tsx scripts/bundle-wallpapers.ts [--svg-only]
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const WALLPAPERS_DIR = join(PROJECT_ROOT, "public", "wallpapers");
const OUTPUT_ZIP = join(PROJECT_ROOT, "public", "caligo-wallpapers.zip");

const SVG_ONLY = process.argv.includes("--svg-only");

async function main() {
  console.log("📦 Bundling wallpapers into ZIP…");

  if (!existsSync(WALLPAPERS_DIR)) {
    console.warn("⚠️  public/wallpapers/ not found — skipping ZIP bundle.");
    console.warn("   Run `npm run wallpapers:generate` to generate wallpaper files.");
    process.exit(0);
  }

  // Collect files to bundle
  const files: string[] = [];
  collectFiles(WALLPAPERS_DIR, files);

  const filtered = SVG_ONLY ? files.filter(f => f.endsWith(".svg")) : files;

  if (filtered.length === 0) {
    console.warn("⚠️  No wallpaper files found to bundle — skipping.");
    process.exit(0);
  }

  console.log(`  Found ${filtered.length} files to bundle`);

  // Use a streaming zip approach without external dependencies
  // We'll write a ZIP file using built-in Node.js streams and zlib
  await writeZip(filtered, OUTPUT_ZIP);

  const size = statSync(OUTPUT_ZIP).size;
  const sizeMb = (size / 1024 / 1024).toFixed(1);
  console.log(`✅ Created ${OUTPUT_ZIP} (${sizeMb} MB, ${filtered.length} files)`);
}

function collectFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (entry.isFile() && (entry.name.endsWith(".svg") || entry.name.endsWith(".png"))) {
      out.push(full);
    }
  }
}

async function writeZip(files: string[], _outputPath: string): Promise<void> {
  // Use Node.js child_process to zip (widely available, no external deps)
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);

  // Check if zip is available
  try {
    const relPaths = files.map(f => relative(join(PROJECT_ROOT, "public"), f));
    // Run zip from the public directory so paths are relative inside ZIP
    await exec("zip", ["-r", "-9", OUTPUT_ZIP, ...relPaths], {
      cwd: join(PROJECT_ROOT, "public"),
      maxBuffer: 1024 * 1024 * 500, // 500 MB buffer for large archives
    });
  } catch (_err) {
    // Fallback: try using the tar + gz if zip is not available
    console.warn("  ⚠  `zip` not found, falling back to tar.gz");
    const tarOutput = OUTPUT_ZIP.replace(".zip", ".tar.gz");
    const relPaths = files.map(f => relative(join(PROJECT_ROOT, "public"), f));
    const { execFile: execFile2 } = await import("node:child_process");
    const exec2 = promisify(execFile2);
    await exec2("tar", ["-czf", tarOutput, ...relPaths], {
      cwd: join(PROJECT_ROOT, "public"),
    });
    console.log(`  📦 Created .tar.gz fallback: ${tarOutput}`);
  }
}

main().catch(err => {
  console.error("❌ Bundle creation failed:", err);
  process.exit(1);
});
