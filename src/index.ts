import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ThemeMode } from "./lib/constraints.js";
import { wcagContrastRatio } from "./lib/contrast.js";
import {
  buildModeDistinctnessSample,
  evaluateModeDistinctness,
  harmonyModeToId,
  type ModeDistinctnessSample,
} from "./lib/mode-distinctness.js";
import { type DerivedPalette, derivePalette } from "./lib/palette.js";
import { expandSeedVariants, loadAllSeeds, loadSeedById } from "./lib/seeds.js";
import { evaluateSemanticTokenQuality } from "./lib/semantic-token-quality.js";
import type { SemanticTokenColors } from "./lib/semantic-tokens.js";
import { buildVscodeThemeJson } from "./lib/vscode-theme.js";

type CliArgs = {
  palette?: string;
  mode?: ThemeMode;
  help?: boolean;
  list?: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--list") out.list = true;
    else if (a === "--palette") out.palette = argv[i + 1];
    else if (a.startsWith("--palette=")) out.palette = a.split("=", 2)[1];
    else if (a === "--mode") out.mode = argv[i + 1] as ThemeMode;
    else if (a.startsWith("--mode=")) out.mode = a.split("=", 2)[1] as ThemeMode;
  }

  return out;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function cleanJsonFiles(dirPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    await Promise.all(
      entries
        .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
        .map(entry => fs.unlink(path.join(dirPath, entry.name)))
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

function sanitizeIdForFilename(id: string): string {
  // The extension contributes filenames without spaces.
  // Keep it strict and predictable.
  return id.replace(/[^A-Za-z0-9_-]/g, "");
}

function makeThemeFilename(seedId: string, _mode: ThemeMode): string {
  return `Caligo-${sanitizeIdForFilename(seedId)}.json`;
}

function buildContrastReport(
  p: DerivedPalette,
  semanticTokenColors: SemanticTokenColors,
  modeDistinctnessSource: ModeDistinctnessSample
) {
  return {
    seed: p.seed,
    mode: p.mode,
    colors: {
      bg0: p.bg0,
      bg1: p.bg1,
      bg2: p.bg2,
      fg0: p.fg0,
      fg1: p.fg1,
      fgMuted: p.fgMuted,
      accent: p.accent,
    },
    contrast: {
      editorFgOnBg: wcagContrastRatio(p.fg0, p.bg0),
      workbenchFgOnBg1: wcagContrastRatio(p.fg1, p.bg1),
      mutedOnBg1: wcagContrastRatio(p.fgMuted, p.bg1),
      lineNumbersOnBg: wcagContrastRatio(p.fgMuted, p.bg0),
    },
    semanticQuality: evaluateSemanticTokenQuality(semanticTokenColors, p.bg0),
    modeDistinctnessSource,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mode: ThemeMode = args.mode ?? "Balanced";

  if (args.help) {
    const here = pathToFileURL(path.join(projectRoot, "README.md")).toString();
    // Keep output terse; callers can read README for full details.
    console.log(
      `Caligo generator\n\nFlags:\n  --palette <id>   Generate a single palette (e.g. Mandarian)\n  --mode <name>     Theme mode (default: Balanced)\n  --list            List available palettes\n  --help            Show help\n\nDocs: ${here}`
    );
    return;
  }

  const allSeeds = await loadAllSeeds();
  const expandedSeeds = allSeeds.flatMap(expandSeedVariants);
  if (args.list) {
    for (const s of expandedSeeds) console.log(`${s.id}\t${s.displayName}`);
    return;
  }

  if (allSeeds.length === 0) {
    throw new Error(
      `No seeds found. Expected JSON seed files in ${path.join(projectRoot, "src", "seeds")}.`
    );
  }

  const seeds = args.palette
    ? [
        (await loadSeedById(args.palette)) ??
          (() => {
            throw new Error(`Unknown palette '${args.palette}'. Use --list to see valid ids.`);
          })(),
      ]
    : allSeeds;

  // If a variant id was provided, narrow the base seed's variants to just that match.
  const normalizedSeeds =
    args.palette && seeds.length === 1 && seeds[0] && !seeds[0].variants
      ? (() => {
          const requestedId = (args.palette || "").toLowerCase();
          const baseSeed = allSeeds.find(s =>
            (s.variants ?? []).some(v => (s.id + v.id).toLowerCase() === requestedId)
          );
          if (!baseSeed) return seeds;
          const variant = (baseSeed.variants ?? []).find(
            v => (baseSeed.id + v.id).toLowerCase() === requestedId
          );
          if (!variant) return seeds;
          return [
            {
              ...baseSeed,
              variants: [variant],
            },
          ];
        })()
      : seeds;

  const outThemesDir = path.join(projectRoot, "themes");
  const buildDir = path.join(projectRoot, "build");
  const buildThemesDir = path.join(buildDir, "themes");
  const buildPalettesDir = path.join(buildDir, "palettes");
  const buildReportsDir = path.join(buildDir, "reports");
  const buildPreviewDir = path.join(buildDir, "preview");
  const buildPreviewAssetsDir = path.join(buildPreviewDir, "assets");

  await Promise.all([
    ensureDir(outThemesDir),
    ensureDir(buildThemesDir),
    ensureDir(buildPalettesDir),
    ensureDir(buildReportsDir),
    ensureDir(buildPreviewDir),
    ensureDir(buildPreviewAssetsDir),
  ]);

  await Promise.all([
    cleanJsonFiles(outThemesDir),
    cleanJsonFiles(buildThemesDir),
    cleanJsonFiles(buildPalettesDir),
    cleanJsonFiles(buildReportsDir),
  ]);

  const derived: DerivedPalette[] = [];
  const modeDistinctnessSamples: ModeDistinctnessSample[] = [];

  for (const seed of normalizedSeeds) {
    // Generate base theme with seed's default harmony mode (labeled as "Balanced")
    const baseSeed = {
      ...seed,
      displayName: `${seed.displayName} — Balanced`,
    };
    const basePalette = derivePalette(baseSeed, mode);
    derived.push(basePalette);

    const baseTheme = buildVscodeThemeJson(basePalette);
    const baseSemanticTokenColors = baseTheme.semanticTokenColors ?? {};
    const baseModeDistinctness = buildModeDistinctnessSample(
      seed.id,
      "balanced",
      basePalette,
      baseSemanticTokenColors
    );
    const baseFilename = makeThemeFilename(seed.id, mode);

    const baseThemeJson = `${JSON.stringify(baseTheme, null, 2)}\n`;
    await Promise.all([
      fs.writeFile(path.join(outThemesDir, baseFilename), baseThemeJson, "utf8"),
      fs.writeFile(path.join(buildThemesDir, baseFilename), baseThemeJson, "utf8"),
    ]);

    const basePaletteJson = `${JSON.stringify(basePalette, null, 2)}\n`;
    await fs.writeFile(
      path.join(buildPalettesDir, `${seed.id}-${mode}-palette.json`),
      basePaletteJson,
      "utf8"
    );

    const baseReport = buildContrastReport(
      basePalette,
      baseSemanticTokenColors,
      baseModeDistinctness
    );
    const baseReportJson = `${JSON.stringify(baseReport, null, 2)}\n`;
    await fs.writeFile(
      path.join(buildReportsDir, `${seed.id}-${mode}-report.json`),
      baseReportJson,
      "utf8"
    );
    modeDistinctnessSamples.push(baseModeDistinctness);

    // Generate variant themes if variants are defined
    if (seed.variants && seed.variants.length > 0) {
      for (const variant of seed.variants) {
        // Merge variant options into seed
        const variantSeed = {
          ...seed,
          id: `${seed.id}${variant.id}`,
          displayName: `${seed.displayName} — ${variant.displayName}`,
          harmony: variant.harmony ?? seed.harmony,
          syntaxStyle: variant.syntaxStyle ?? seed.syntaxStyle,
          contrastTarget: variant.contrastTarget ?? seed.contrastTarget,
          semantic: variant.semantic ?? seed.semantic,
          intentEmphasis: variant.intentEmphasis ?? seed.intentEmphasis,
        };

        const variantPalette = derivePalette(variantSeed, mode);
        derived.push(variantPalette);

        const variantTheme = buildVscodeThemeJson(variantPalette);
        const variantSemanticTokenColors = variantTheme.semanticTokenColors ?? {};
        const variantModeDistinctness = buildModeDistinctnessSample(
          seed.id,
          harmonyModeToId(variant.harmony ?? seed.harmony),
          variantPalette,
          variantSemanticTokenColors
        );
        const variantFilename = makeThemeFilename(variantSeed.id, mode);

        const variantThemeJson = `${JSON.stringify(variantTheme, null, 2)}\n`;
        await Promise.all([
          fs.writeFile(path.join(outThemesDir, variantFilename), variantThemeJson, "utf8"),
          fs.writeFile(path.join(buildThemesDir, variantFilename), variantThemeJson, "utf8"),
        ]);

        const variantPaletteJson = `${JSON.stringify(variantPalette, null, 2)}\n`;
        await fs.writeFile(
          path.join(buildPalettesDir, `${variantSeed.id}-${mode}-palette.json`),
          variantPaletteJson,
          "utf8"
        );

        const variantReport = buildContrastReport(
          variantPalette,
          variantSemanticTokenColors,
          variantModeDistinctness
        );
        const variantReportJson = `${JSON.stringify(variantReport, null, 2)}\n`;
        await fs.writeFile(
          path.join(buildReportsDir, `${variantSeed.id}-${mode}-report.json`),
          variantReportJson,
          "utf8"
        );
        modeDistinctnessSamples.push(variantModeDistinctness);
      }
    }
  }

  const modeDistinctnessReport = evaluateModeDistinctness(modeDistinctnessSamples);
  const modeDistinctnessJson = `${JSON.stringify(modeDistinctnessReport, null, 2)}\n`;
  await fs.writeFile(
    path.join(buildReportsDir, "mode-distinctness.json"),
    modeDistinctnessJson,
    "utf8"
  );
}

await main();
