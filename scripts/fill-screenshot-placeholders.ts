/**
 * Fill missing theme screenshots by duplicating a real screenshot (fast local runs).
 *
 * Usage:
 *   npx tsx scripts/fill-screenshot-placeholders.ts --keep "Caligo (Aurora Noir — Balanced)" \
 *     --source "docs/images/themes/caligo-aurora-noir-balanced-typescript.png"
 *
 * If --source is omitted, the script will use the first existing PNG in docs/images/themes.
 * If none exist, it falls back to a 1x1 PNG placeholder.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(process.cwd());
const OUTPUT_DIR = join(PROJECT_ROOT, "docs", "images", "themes");

const BASE64_PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";

function slugifyForFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseArgValue(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const eq = args.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function readThemeLabelsFromPackage(): string[] {
  const pkgPath = join(PROJECT_ROOT, "package.json");
  const raw = readFileSync(pkgPath, "utf-8");
  const parsed = JSON.parse(raw) as { contributes?: { themes?: { label?: string }[] } };
  return (
    parsed.contributes?.themes
      ?.map(t => t.label)
      .filter((label): label is string => Boolean(label)) ?? []
  );
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writePlaceholder(targetPath: string) {
  const buffer = Buffer.from(BASE64_PNG_1X1, "base64");
  writeFileSync(targetPath, buffer);
}

function resolveSourceImage(sourceArg?: string): string | undefined {
  if (sourceArg) {
    const resolved = resolve(PROJECT_ROOT, sourceArg);
    if (existsSync(resolved)) return resolved;
  }

  if (existsSync(OUTPUT_DIR)) {
    const existing = readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".png"));
    if (existing.length > 0) return join(OUTPUT_DIR, existing[0]);
  }

  return undefined;
}

function main() {
  const keepRaw = parseArgValue("--keep") ?? "";
  const sourceArg = parseArgValue("--source");
  const keepLabels = keepRaw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const themeLabels = readThemeLabelsFromPackage();
  if (themeLabels.length === 0) {
    console.error("❌ No theme labels found in package.json");
    process.exit(1);
  }

  ensureDir(OUTPUT_DIR);

  const sourceImage = resolveSourceImage(sourceArg);

  const keepFiles = new Set(keepLabels.map(label => `${slugifyForFilename(label)}-typescript.png`));

  let created = 0;
  let skipped = 0;

  for (const label of themeLabels) {
    const filename = `${slugifyForFilename(label)}-typescript.png`;
    if (keepFiles.has(filename)) {
      skipped++;
      continue;
    }

    const targetPath = join(OUTPUT_DIR, filename);
    if (!existsSync(targetPath)) {
      if (sourceImage) {
        copyFileSync(sourceImage, targetPath);
      } else {
        writePlaceholder(targetPath);
      }
      created++;
    }
  }

  const existing = existsSync(OUTPUT_DIR)
    ? readdirSync(OUTPUT_DIR).filter(f => f.endsWith(".png")).length
    : 0;

  console.log(
    `✅ Placeholders ready. Created ${created}, skipped ${skipped}, total PNGs now ${existing}.`
  );
  if (sourceImage) {
    console.log(`🧩 Duplicated source: ${sourceImage}`);
  } else {
    console.log("🧩 No source image found; used 1x1 PNG placeholders.");
  }
}

main();
