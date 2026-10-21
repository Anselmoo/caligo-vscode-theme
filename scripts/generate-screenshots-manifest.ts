/**
 * Generate screenshots manifest for Vue app Gallery view
 * This generates a manifest from the themes-manifest.json instead of scanning files
 * so the gallery can work even when screenshots haven't been generated yet.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readThemeLabels, screenshotFilename } from "./lib/screenshot-filename.js";

interface ScreenshotEntry {
  themeKey: string;
  themeName: string;
  seedId: string;
  seedLabel: string;
  harmonyMode: string;
  harmonyLabel: string;
  filename: string;
  exists: boolean;
}

interface ThemeIndex {
  themes: Record<
    string,
    {
      key: string;
      seedId: string;
      seedLabel: string;
      harmonyId: string;
      harmonyLabel: string;
      displayName: string;
    }
  >;
}

const publicDir = join(process.cwd(), "public");
const screenshotsDir = join(publicDir, "screenshots");
const themesManifestPath = join(publicDir, "themes-manifest.json");

// Read theme manifest to get all themes
const themeIndex: ThemeIndex = JSON.parse(readFileSync(themesManifestPath, "utf-8"));

// Check which screenshots actually exist
const existingScreenshots = new Set<string>();
if (existsSync(screenshotsDir)) {
  const files = readdirSync(screenshotsDir).filter(f => f.endsWith(".png"));
  for (const f of files) {
    existingScreenshots.add(f);
  }
}

const themeLabels = readThemeLabels(process.cwd());

// Generate screenshot entries for all themes
const screenshots: ScreenshotEntry[] = Object.values(themeIndex.themes).map(theme => {
  // The capture names each file after the label VS Code shows (package.json),
  // which is not always "Caligo (Seed — Harmony)": monochromatic labels carry a
  // weight count. Fall back to the reconstructed label only for unknown keys.
  const label = themeLabels.get(theme.key) ?? `Caligo (${theme.seedLabel} — ${theme.harmonyLabel})`;
  const filename = screenshotFilename(label);

  return {
    themeKey: theme.key,
    themeName: theme.displayName,
    seedId: theme.seedId,
    seedLabel: theme.seedLabel,
    harmonyMode: theme.harmonyId,
    harmonyLabel: theme.harmonyLabel,
    filename: `/screenshots/${filename}`,
    exists: existingScreenshots.has(filename),
  };
});

// Write manifest
const manifestPath = join(publicDir, "screenshots-manifest.json");
const manifest = { screenshots };

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const existingCount = screenshots.filter(s => s.exists).length;
console.log(
  `✅ Generated screenshots manifest with ${screenshots.length} entries (${existingCount} exist, ${screenshots.length - existingCount} pending)`
);
console.log(`📝 Written to: ${manifestPath}`);
