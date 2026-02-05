import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const reportsDir = path.join(projectRoot, "build", "reports");

const THRESHOLDS: Record<string, number> = {
  editorFgOnBg: 4.5,
  workbenchFgOnBg1: 4.5,
  mutedOnBg1: 3.0,
  lineNumbersOnBg: 3.0,
};

function isNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function main(): void {
  if (!fs.existsSync(reportsDir)) {
    console.error(`❌ Missing reports directory: ${reportsDir}`);
    console.error("Run `npm run generate` first.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(reportsDir)
    .filter(f => f.endsWith("-report.json"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.error(`❌ No report files found in: ${reportsDir}`);
    console.error("Run `npm run generate` first.");
    process.exit(1);
  }

  const failures: Array<{ file: string; key: string; value: number }> = [];

  for (const file of files) {
    const fullPath = path.join(reportsDir, file);
    const json = JSON.parse(fs.readFileSync(fullPath, "utf8")) as {
      contrast?: Record<string, unknown>;
    };
    const contrast = json?.contrast ?? {};

    for (const [key, min] of Object.entries(THRESHOLDS)) {
      const v = contrast[key];
      if (!isNumber(v) || v < min) {
        failures.push({ file, key, value: isNumber(v) ? v : NaN });
      }
    }
  }

  if (failures.length) {
    console.error(`❌ Contrast checks failed (${failures.length} issue(s))`);
    for (const f of failures.slice(0, 30)) {
      const value = Number.isFinite(f.value) ? f.value.toFixed(2) : "(missing)";
      console.error(`  ${f.file}: ${f.key} = ${value} (min ${THRESHOLDS[f.key]})`);
    }
    if (failures.length > 30) {
      console.error(`  …and ${failures.length - 30} more`);
    }
    process.exit(1);
  }

  console.log(`✅ Contrast checks passed (${files.length} report(s))`);
}

main();
