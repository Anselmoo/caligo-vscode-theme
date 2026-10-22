/**
 * Screenshot filenames, shared by the capture (screenshot-core.ts) and the
 * gallery manifest (generate-screenshots-manifest.ts). Both sides must slug the
 * same string — the label VS Code shows, read from package.json — or the
 * gallery looks for a file the capture never wrote. Labels are not derivable
 * from seed + harmony: monochromatic ones carry a weight count, e.g.
 * "Caligo (Aurora Noir — Monochromatic · 2 weights)".
 */
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

export function slugifyForFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function screenshotFilename(themeLabel: string, lang = "typescript"): string {
  return `${slugifyForFilename(themeLabel)}-${lang}.png`;
}

/** Theme key ("Caligo-AuroraNoirMonochromatic") → shipped label, from package.json. */
export function readThemeLabels(projectRoot: string): Map<string, string> {
  const pkg = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf-8")) as {
    contributes?: { themes?: Array<{ label?: string; path?: string }> };
  };
  const labels = new Map<string, string>();
  for (const theme of pkg.contributes?.themes ?? []) {
    if (theme.label && theme.path) labels.set(basename(theme.path, ".json"), theme.label);
  }
  return labels;
}
