/**
 * Copy static assets to public/ directory for Vite build
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "public");

function copyStaticAssets() {
  try {
    // Ensure public directory exists
    if (!existsSync(PUBLIC_DIR)) {
      mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    // Copy icon.svg
    const iconSource = join(ROOT, "images", "icon.svg");
    const iconTarget = join(PUBLIC_DIR, "icon.svg");

    if (existsSync(iconSource)) {
      copyFileSync(iconSource, iconTarget);
      console.log("✅ Copied icon.svg to public/");
    } else {
      console.warn(`⚠️  icon.svg not found at ${iconSource}`);
    }
  } catch (error) {
    console.error("❌ Failed to copy static assets:", error);
    process.exit(1);
  }
}

copyStaticAssets();
