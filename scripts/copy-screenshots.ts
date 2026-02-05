/**
 * Copy theme screenshots to web build directory for the Vue landing page
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SOURCE_DIR = join(process.cwd(), "docs/images/themes");
// Vite serves static assets from the repo-root `public/` directory.
// Keep screenshots there so they are available at `/screenshots/<file>.png`.
const TARGET_DIR = join(process.cwd(), "public", "screenshots");

function copyScreenshots() {
  try {
    // Create target directory if it doesn't exist
    if (!existsSync(TARGET_DIR)) {
      mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Check if source directory exists. Fallback to ./tmp-screenshots-reuse if present or if the source dir is empty.
    const ALTERNATE_DIR = join(process.cwd(), "tmp-screenshots-reuse");
    let sourceUsed = SOURCE_DIR;

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
    let files = readdirSync(sourceUsed).filter(f => f.endsWith(".png"));
    if (files.length === 0 && existsSync(ALTERNATE_DIR)) {
      const altFiles = readdirSync(ALTERNATE_DIR).filter(f => f.endsWith(".png"));
      if (altFiles.length > 0) {
        console.warn(`⚠️  No screenshots found in ${sourceUsed}; falling back to ${ALTERNATE_DIR}`);
        sourceUsed = ALTERNATE_DIR;
        files = altFiles;
      }
    }

    console.log(`ℹ️  Using screenshots source: ${sourceUsed}. Found ${files.length} PNG(s).`);

    let copied = 0;
    const DOCS_DIR = join(process.cwd(), "docs", "images", "themes");
    if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });

    for (const file of files) {
      const sourcePath = join(sourceUsed, file);
      const targetPath = join(TARGET_DIR, file);
      copyFileSync(sourcePath, targetPath);

      // Also copy into docs/images/themes so README and pages pipelines can reference them
      const docsTarget = join(DOCS_DIR, file);
      copyFileSync(sourcePath, docsTarget);

      copied++;
    }

    console.log(`✅ Copied ${copied} theme screenshots to ${TARGET_DIR} and ${DOCS_DIR}`);
  } catch (error) {
    console.error("❌ Failed to copy screenshots:", error);
    process.exit(1);
  }
}

copyScreenshots();
