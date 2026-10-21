import fs from "node:fs";
import path from "node:path";
import { evaluateThemeContrast, type PairResult, type ThemeJson } from "../src/lib/contrast-pairs";
import {
  evaluateModeDistinctness,
  type ModeDistinctnessSample,
} from "../src/lib/mode-distinctness";
import { evaluateSemanticTokenQuality } from "../src/lib/semantic-token-quality";
import type { SemanticTokenColors } from "../src/lib/semantic-tokens";

const projectRoot = process.cwd();
const reportsDir = path.join(projectRoot, "build", "reports");

const themesDir = path.join(projectRoot, "themes");
const knownViolationsPath = path.join(projectRoot, "scripts", "contrast-known-violations.json");
const pairsReportPath = path.join(reportsDir, "contrast-pairs.json");

type KnownViolation = { pair: string; themes: string[] | "*"; reason: string };
type KnownViolationsFile = { version: number; violations: KnownViolation[] };

function isNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function sanitizeIdForFilename(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, "");
}

/**
 * Registry gate: every text-on-background pair the emitted themes declare is scored with
 * alpha compositing (src/lib/contrast.ts) and compared with the ratchet list. A failing
 * (pair, theme) that is not listed is a regression; a listed (pair, theme) that passes is
 * stale and must be removed, so the list can only shrink.
 */
function evaluateRegistryGate(): string[] {
  const problems: string[] = [];

  const themeFiles = fs.existsSync(themesDir)
    ? fs
        .readdirSync(themesDir)
        .filter(f => /^Caligo-.+\.json$/.test(f))
        .sort((a, b) => a.localeCompare(b))
    : [];
  if (themeFiles.length === 0) {
    return [`no themes/Caligo-*.json found in ${themesDir}; run \`npm run generate\` first`];
  }

  if (!fs.existsSync(knownViolationsPath)) {
    return [`missing ${path.relative(projectRoot, knownViolationsPath)}`];
  }
  const known = JSON.parse(fs.readFileSync(knownViolationsPath, "utf8")) as KnownViolationsFile;
  if (known.version !== 1 || !Array.isArray(known.violations)) {
    return [
      `${path.relative(projectRoot, knownViolationsPath)}: expected { version: 1, violations: [] }`,
    ];
  }

  const themeNames = themeFiles.map(f => f.replace(/\.json$/, ""));
  const perTheme: Record<string, Array<Array<string | number | boolean | string[]>>> = {};
  const failing = new Set<string>();
  const knownPairIds = new Set<string>();
  const results = new Map<string, PairResult[]>();

  for (const [index, file] of themeFiles.entries()) {
    const name = themeNames[index];
    const theme = JSON.parse(fs.readFileSync(path.join(themesDir, file), "utf8")) as ThemeJson;
    const evaluated = evaluateThemeContrast(theme);
    results.set(name, evaluated);
    for (const r of evaluated) {
      knownPairIds.add(r.id);
      if (!r.pass) failing.add(`${r.id}@${name}`);
    }
  }

  const listed = new Set<string>();
  const seenPairs = new Set<string>();
  for (const v of known.violations) {
    if (seenPairs.has(v.pair)) problems.push(`duplicate known-violation entry: ${v.pair}`);
    seenPairs.add(v.pair);
    if (!knownPairIds.has(v.pair))
      problems.push(`known violation names an unknown pair: ${v.pair}`);
    if (typeof v.reason !== "string" || v.reason.trim().length < 10) {
      problems.push(`known violation without a reason (>= 10 chars): ${v.pair}`);
    }
    const names = v.themes === "*" ? themeNames : v.themes;
    if (!Array.isArray(names) || names.length === 0) {
      problems.push(`known violation without themes: ${v.pair}`);
      continue;
    }
    for (const n of names) {
      if (!themeNames.includes(n)) problems.push(`known violation ${v.pair}: unknown theme ${n}`);
      listed.add(`${v.pair}@${n}`);
    }
  }

  const unlisted = [...failing].filter(k => !listed.has(k)).sort();
  const stale = [...listed].filter(k => !failing.has(k)).sort();

  for (const name of themeNames) {
    perTheme[name] = (results.get(name) ?? []).map(r => [
      r.id,
      r.kind,
      r.min,
      r.fg,
      r.layers,
      r.wcag,
      r.apcaLc,
      r.pass,
      r.pass ? "ok" : listed.has(`${r.id}@${name}`) ? "known" : "violation",
    ]);
  }
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    pairsReportPath,
    JSON.stringify({
      version: 1,
      // rows are columnar to keep the file small: results[theme][i] follows `columns`
      columns: ["id", "kind", "min", "fg", "layers", "wcag", "apcaLc", "pass", "status"],
      themes: themeNames.length,
      pairs: Object.values(perTheme)[0]?.length ?? 0,
      failing: failing.size,
      known: failing.size - unlisted.length,
      results: perTheme,
    })
  );

  if (unlisted.length) {
    problems.push(
      `${unlisted.length} failing (pair, theme) not in ${path.relative(projectRoot, knownViolationsPath)}:`
    );
    for (const k of unlisted.slice(0, 30)) {
      const [id, theme] = k.split("@");
      const r = results.get(theme)?.find(x => x.id === id);
      problems.push(
        `  ${theme}: ${id} wcag=${r?.wcag.toFixed(2)} (min ${r?.min}) fg=${r?.fg} layers=${r?.layers.join(">")}`
      );
    }
    if (unlisted.length > 30) problems.push(`  ...and ${unlisted.length - 30} more`);
  }
  if (stale.length) {
    problems.push(`${stale.length} stale known-violation entries (now passing, remove them):`);
    for (const k of stale.slice(0, 30)) problems.push(`  ${k}`);
    if (stale.length > 30) problems.push(`  ...and ${stale.length - 30} more`);
  }

  console.log(
    `Contrast pairs: ${themeNames.length} theme(s), ${failing.size} failing (pair, theme), ` +
      `${failing.size - unlisted.length} known, ${unlisted.length} new -> ${path.relative(projectRoot, pairsReportPath)}`
  );
  return problems;
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

  const semanticFailures: Array<{ file: string; issue: string }> = [];
  const modeFailures: string[] = [];
  const modeDistinctnessSamples: ModeDistinctnessSample[] = [];

  for (const file of files) {
    const fullPath = path.join(reportsDir, file);
    const json = JSON.parse(fs.readFileSync(fullPath, "utf8")) as {
      seed?: { id?: string };
      colors?: { bg0?: string };
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
    if (json.modeDistinctnessSource) {
      modeDistinctnessSamples.push(json.modeDistinctnessSource);
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

  const registryProblems = evaluateRegistryGate();
  if (registryProblems.length) {
    console.error("❌ Contrast pair gate failed");
    for (const line of registryProblems) console.error(`  ${line}`);
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

  console.log(`✅ Contrast checks passed (${files.length} report(s), pair registry gate)`);
}

main();
