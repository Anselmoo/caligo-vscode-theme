/**
 * Copy JSON reports to public/ directory for Vite build
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "public");
const REPORTS_DIR = join(ROOT, "build", "reports");

function copyManifests() {
  try {
    if (!existsSync(PUBLIC_DIR)) {
      mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    if (!existsSync(REPORTS_DIR)) {
      console.warn(`⚠️  Reports directory not found at ${REPORTS_DIR}`);
      return;
    }

    const reportFiles = readdirSync(REPORTS_DIR, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
      .map(entry => entry.name);
    if (reportFiles.length === 0) {
      console.warn(`⚠️  No JSON reports found in ${REPORTS_DIR}`);
      return;
    }

    for (const file of reportFiles) {
      const source = join(REPORTS_DIR, file);
      const target = join(PUBLIC_DIR, file);
      copyFileSync(source, target);
    }

    console.log(`✅ Copied ${reportFiles.length} JSON report(s) to public/`);
  } catch (error) {
    console.error("❌ Failed to copy JSON reports:", error);
    process.exit(1);
  }
}

copyManifests();
