/**
 * Copy theme screenshots to web build directory for the Vue landing page
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SOURCE_DIR = join(process.cwd(), "docs/images/themes");
// Vite serves static assets from the repo-root `public/` directory.
// Keep screenshots there so they are available at `/screenshots/<file>.png`.
const TARGET_DIR = join(process.cwd(), "public", "screenshots");

function listPngs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const pngs: string[] = [];
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".png")) {
      pngs.push(file);
    }
  }
  return pngs;
}

function copyScreenshots() {
  try {
    // Create target directory if it doesn't exist
    if (!existsSync(TARGET_DIR)) {
      mkdirSync(TARGET_DIR, { recursive: true });
    }

    // If screenshots are already present in public/screenshots (e.g. downloaded artifact in CI),
    // keep them as source-of-truth and do not overwrite from docs placeholders.
    const existingTargetFiles = listPngs(TARGET_DIR);

    // Check if source directory exists. Fallback to ./tmp-screenshots-reuse if present or if the source dir is empty.
    const ALTERNATE_DIR = join(process.cwd(), "tmp-screenshots-reuse");
    const DOCS_DIR = join(process.cwd(), "docs", "images", "themes");
    let sourceUsed = SOURCE_DIR;
    let files: string[] = [];

    if (existingTargetFiles.length > 0) {
      sourceUsed = TARGET_DIR;
      files = existingTargetFiles;
      console.log(
        `ℹ️  Found ${files.length} existing screenshot(s) in ${TARGET_DIR}; preserving downloaded/generated files.`
      );
    }

    if (files.length === 0) {
      // If the primary source dir doesn't exist, consider the alternate
      if (!existsSync(SOURCE_DIR)) {
        console.warn(`⚠️  Source directory not found: ${SOURCE_DIR}`);
        if (existsSync(ALTERNATE_DIR)) {
          console.warn(`   Falling back to alternate screenshots directory: ${ALTERNATE_DIR}`);
          sourceUsed = ALTERNATE_DIR;
        } else {
          console.warn(
            "   No screenshots found. Run Playwright/CI screenshot generation first to produce screenshots."
          );
          return;
        }
      }

      // If the primary source exists but contains no PNGs, also fallback to the alternate (if it has PNGs).
      files = listPngs(sourceUsed);
      if (files.length === 0 && existsSync(ALTERNATE_DIR)) {
        const altFiles = listPngs(ALTERNATE_DIR);
        if (altFiles.length > 0) {
          console.warn(
            `⚠️  No screenshots found in ${sourceUsed}; falling back to ${ALTERNATE_DIR}`
          );
          sourceUsed = ALTERNATE_DIR;
          files = altFiles;
        }
      }
    }

    console.log(`ℹ️  Using screenshots source: ${sourceUsed}. Found ${files.length} PNG(s).`);

    let copied = 0;
    if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });

    for (const file of files) {
      const sourcePath = join(sourceUsed, file);
      const targetPath = join(TARGET_DIR, file);
      if (sourcePath !== targetPath) {
        copyFileSync(sourcePath, targetPath);
      }

      // Also copy into docs/images/themes so README and pages pipelines can reference them
      const docsTarget = join(DOCS_DIR, file);
      if (sourcePath !== docsTarget) {
        copyFileSync(sourcePath, docsTarget);
      }

      copied++;
    }

    console.log(`✅ Copied ${copied} theme screenshots to ${TARGET_DIR} and ${DOCS_DIR}`);
  } catch (error) {
    console.error("❌ Failed to copy screenshots:", error);
    process.exit(1);
  }
}

copyScreenshots();
