import fs from "node:fs";
import path from "node:path";
import {
  evaluateModeDistinctness,
  type ModeDistinctnessSample,
} from "../src/lib/mode-distinctness";
import { evaluateSemanticTokenQuality } from "../src/lib/semantic-token-quality";
import type { SemanticTokenColors } from "../src/lib/semantic-tokens";

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

function sanitizeIdForFilename(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, "");
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
  const semanticFailures: Array<{ file: string; issue: string }> = [];
  const modeFailures: string[] = [];
  const modeDistinctnessSamples: ModeDistinctnessSample[] = [];

  for (const file of files) {
    const fullPath = path.join(reportsDir, file);
    const json = JSON.parse(fs.readFileSync(fullPath, "utf8")) as {
      seed?: { id?: string };
      colors?: { bg0?: string };
      contrast?: Record<string, unknown>;
      semanticQuality?: {
        coverage?: {
          typeCoverage?: number;
          modifierCoverage?: number;
          valid?: boolean;
        };
        apca?: {
          valid?: boolean;
          violations?: string[];
        };
        deltaE?: {
          valid?: boolean;
          violations?: string[];
        };
      };
      modeDistinctnessSource?: ModeDistinctnessSample;
    };
    const contrast = json?.contrast ?? {};
    if (json.modeDistinctnessSource) {
      modeDistinctnessSamples.push(json.modeDistinctnessSource);
    }

    for (const [key, min] of Object.entries(THRESHOLDS)) {
      const v = contrast[key];
      if (!isNumber(v) || v < min) {
        failures.push({ file, key, value: isNumber(v) ? v : NaN });
      }
    }

    const themeId = json.seed?.id ? sanitizeIdForFilename(json.seed.id) : undefined;
    const fallbackThemePath = themeId
      ? path.join(projectRoot, "build", "themes", `Caligo-${themeId}.json`)
      : "";
    const fallbackBg = json.colors?.bg0;
    const fallbackSemanticQuality =
      !json.semanticQuality && fallbackThemePath && fs.existsSync(fallbackThemePath) && fallbackBg
        ? (() => {
            const themeJson = JSON.parse(fs.readFileSync(fallbackThemePath, "utf8")) as {
              semanticTokenColors?: SemanticTokenColors;
            };
            const semanticTokenColors = themeJson.semanticTokenColors ?? {};
            return evaluateSemanticTokenQuality(semanticTokenColors, fallbackBg);
          })()
        : undefined;

    const semanticQuality = json.semanticQuality ?? fallbackSemanticQuality;
    const coverage = semanticQuality?.coverage;
    const apca = semanticQuality?.apca;
    const deltaE = semanticQuality?.deltaE;

    if (!coverage || !isNumber(coverage.typeCoverage) || coverage.typeCoverage < 0.95) {
      semanticFailures.push({
        file,
        issue: `coverage.typeCoverage=${coverage?.typeCoverage ?? "(missing)"} (min 0.95)`,
      });
    }
    if (!coverage || !isNumber(coverage.modifierCoverage) || coverage.modifierCoverage < 0.8) {
      semanticFailures.push({
        file,
        issue: `coverage.modifierCoverage=${coverage?.modifierCoverage ?? "(missing)"} (min 0.80)`,
      });
    }
    if (!coverage?.valid) {
      semanticFailures.push({ file, issue: "coverage.valid=false" });
    }
    if (!apca?.valid) {
      semanticFailures.push({
        file,
        issue: `apca violations: ${apca?.violations?.slice(0, 3).join("; ") ?? "(missing)"}`,
      });
    }
    if (!deltaE?.valid) {
      semanticFailures.push({
        file,
        issue: `deltaE violations: ${deltaE?.violations?.slice(0, 3).join("; ") ?? "(missing)"}`,
      });
    }
  }

  const evaluateModeReport = (modeDistinctness: {
    valid?: boolean;
    seedScores?: Array<{
      seedId?: string;
      score?: number;
      minPairScore?: number;
      valid?: boolean;
    }>;
    pairChecks?: Array<{
      seedId?: string;
      from?: string;
      to?: string;
      score?: number;
      valid?: boolean;
      violations?: string[];
    }>;
    violations?: string[];
  }) => {
    if (!modeDistinctness.valid) {
      for (const violation of modeDistinctness.violations?.slice(0, 20) ?? []) {
        modeFailures.push(violation);
      }
      if ((modeDistinctness.violations?.length ?? 0) > 20) {
        modeFailures.push(`...and ${(modeDistinctness.violations?.length ?? 0) - 20} more`);
      }
    }

    for (const seedScore of modeDistinctness.seedScores ?? []) {
      if (!seedScore.valid) {
        modeFailures.push(
          `${seedScore.seedId ?? "(unknown seed)"} score=${seedScore.score?.toFixed(3) ?? "(missing)"} minPair=${seedScore.minPairScore?.toFixed(3) ?? "(missing)"}`
        );
      }
    }

    for (const pair of modeDistinctness.pairChecks ?? []) {
      if (pair.valid) continue;
      modeFailures.push(
        `${pair.seedId ?? "(unknown seed)"} ${pair.from ?? "?"}↔${pair.to ?? "?"}: ${pair.violations?.join("; ") ?? "failed"}`
      );
    }
  };

  if (modeDistinctnessSamples.length > 0) {
    evaluateModeReport(evaluateModeDistinctness(modeDistinctnessSamples));
  } else {
    console.warn("⚠️ Skipping mode distinctness checks: no mode distinctness data available");
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

  if (semanticFailures.length) {
    console.error(`❌ Semantic quality checks failed (${semanticFailures.length} issue(s))`);
    for (const f of semanticFailures.slice(0, 30)) {
      console.error(`  ${f.file}: ${f.issue}`);
    }
    if (semanticFailures.length > 30) {
      console.error(`  …and ${semanticFailures.length - 30} more`);
    }
    process.exit(1);
  }

  if (modeFailures.length) {
    console.error(`❌ Mode distinctness checks failed (${modeFailures.length} issue(s))`);
    for (const failure of modeFailures.slice(0, 30)) {
      console.error(`  ${failure}`);
    }
    if (modeFailures.length > 30) {
      console.error(`  …and ${modeFailures.length - 30} more`);
    }
    process.exit(1);
  }

  console.log(`✅ Contrast checks passed (${files.length} report(s))`);
}

main();
