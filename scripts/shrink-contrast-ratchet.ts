/**
 * Shrink scripts/contrast-known-violations.json to what the generated themes still fail.
 *
 * Shrink only: a (pair, theme) that passes is removed, an entry with no failing theme left is
 * dropped, and the "Measured WCAG a-b ... in n/50 themes (seeds)." clause of each surviving reason
 * is rewritten from the new measurements so it stays true. It never adds an entry or a theme; a
 * new failure is a regression for scripts/test-contrast.ts to report, not something to record.
 *
 * Run after `npm run generate`: `tsx scripts/shrink-contrast-ratchet.ts`.
 */
import fs from "node:fs";
import path from "node:path";
import { evaluateThemeContrast, type PairResult, type ThemeJson } from "../src/lib/contrast-pairs";

type KnownViolation = { pair: string; themes: string[] | "*"; reason: string };
type KnownViolationsFile = { version: number; violations: KnownViolation[] };

const root = process.cwd();
const themesDir = path.join(root, "themes");
const ratchetPath = path.join(root, "scripts", "contrast-known-violations.json");

const HARMONY_SUFFIX = /(Analogous|Monochromatic|SplitComplementary|Triadic)$/;
const MEASURED =
  /Measured WCAG [\d.]+(?:-[\d.]+)? vs floor [\d.]+ \((?:text|ui)\) in \d+\/\d+ themes \([^)]*\)\./;

const seedOf = (theme: string) => theme.replace(/^Caligo-/, "").replace(HARMONY_SUFFIX, "");

function seedList(themes: string[]): string {
  const seeds = [...new Set(themes.map(seedOf))].sort((a, b) => a.localeCompare(b));
  return seeds.length <= 6
    ? seeds.join(", ")
    : `${seeds.length} seeds incl. ${seeds.slice(0, 3).join(", ")}`;
}

function measuredClause(results: PairResult[], total: number, themes: string[]): string {
  const ratios = results.map(r => r.wcag);
  const lo = Math.min(...ratios).toFixed(2);
  const hi = Math.max(...ratios).toFixed(2);
  const { min, kind } = results[0];
  const range = lo === hi ? lo : `${lo}-${hi}`;
  return `Measured WCAG ${range} vs floor ${min} (${kind}) in ${themes.length}/${total} themes (${seedList(themes)}).`;
}

const themeFiles = fs
  .readdirSync(themesDir)
  .filter(f => /^Caligo-.+\.json$/.test(f))
  .sort((a, b) => a.localeCompare(b));
const themeNames = themeFiles.map(f => f.replace(/\.json$/, ""));

const failing = new Map<string, Map<string, PairResult>>();
for (const [i, file] of themeFiles.entries()) {
  const theme = JSON.parse(fs.readFileSync(path.join(themesDir, file), "utf8")) as ThemeJson;
  for (const r of evaluateThemeContrast(theme)) {
    if (r.pass) continue;
    if (!failing.has(r.id)) failing.set(r.id, new Map());
    failing.get(r.id)?.set(themeNames[i], r);
  }
}

const known = JSON.parse(fs.readFileSync(ratchetPath, "utf8")) as KnownViolationsFile;
const kept: KnownViolation[] = [];
let rowsBefore = 0;
let rowsAfter = 0;
for (const v of known.violations) {
  const listed = v.themes === "*" ? themeNames : v.themes;
  rowsBefore += listed.length;
  const failed = failing.get(v.pair) ?? new Map<string, PairResult>();
  const still = listed.filter(t => failed.has(t));
  if (still.length === 0) continue;
  rowsAfter += still.length;
  const results = still.map(t => failed.get(t) as PairResult);
  const reason = v.reason.replace(MEASURED, measuredClause(results, themeNames.length, still));
  kept.push({
    pair: v.pair,
    themes: v.themes === "*" && still.length === themeNames.length ? "*" : still,
    reason,
  });
}

fs.writeFileSync(ratchetPath, `${JSON.stringify({ ...known, violations: kept }, null, 2)}\n`);
console.log(
  `contrast ratchet: ${known.violations.length} -> ${kept.length} pairs, ${rowsBefore} -> ${rowsAfter} (pair, theme) rows`
);
