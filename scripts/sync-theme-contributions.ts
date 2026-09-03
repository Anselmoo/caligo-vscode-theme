/**
 * Keep the theme picker honest.
 *
 * VS Code's theme picker shows `contributes.themes[].label` from package.json.
 * It never reads the `name` inside the theme file. Those labels are the entire
 * first five minutes of this extension: install, open the picker, choose from
 * fifty entries. Nothing else happens on activation.
 *
 * They were hand-maintained, and had already drifted -- themes that compute
 * their own weight count were still listed under a label that predates it, so
 * the one thing a single-ink theme has to say about itself never reached the
 * only screen where it mattered.
 *
 * This derives every label from the generated theme's own `name`, so the picker
 * cannot disagree with what was actually built.
 *
 *   npx tsx scripts/sync-theme-contributions.ts          # rewrite package.json
 *   npx tsx scripts/sync-theme-contributions.ts --check  # fail if out of sync
 */

import fs from "node:fs";
import path from "node:path";

type ThemeContribution = {
  label: string;
  uiTheme: string;
  path: string;
};

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, "package.json");
const builtThemesDir = path.join(projectRoot, "build", "themes");

function readBuiltContributions(): ThemeContribution[] {
  if (!fs.existsSync(builtThemesDir)) {
    console.error(`Missing ${builtThemesDir}. Run \`npm run generate\` first.`);
    process.exit(1);
  }

  return fs
    .readdirSync(builtThemesDir)
    .filter(f => f.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map(file => {
      const theme = JSON.parse(fs.readFileSync(path.join(builtThemesDir, file), "utf8")) as {
        name?: string;
        type?: string;
      };
      if (!theme.name) {
        console.error(`${file} has no "name" field; cannot derive a picker label.`);
        process.exit(1);
      }
      return {
        label: theme.name,
        uiTheme: theme.type === "light" ? "vs" : "vs-dark",
        path: `./themes/${file}`,
      };
    });
}

function main(): void {
  const check = process.argv.includes("--check");
  const pkgRaw = fs.readFileSync(packageJsonPath, "utf8");
  const pkg = JSON.parse(pkgRaw) as {
    contributes?: { themes?: ThemeContribution[] };
  };

  const current = pkg.contributes?.themes ?? [];
  const expected = readBuiltContributions();

  const same =
    current.length === expected.length &&
    current.every(
      (c, i) =>
        c.label === expected[i].label &&
        c.uiTheme === expected[i].uiTheme &&
        c.path === expected[i].path
    );

  if (same) {
    console.log(`✅ Theme picker labels are in sync (${expected.length} themes).`);
    return;
  }

  if (check) {
    console.error("❌ Theme picker labels are out of sync with the generated themes.\n");
    const width = Math.max(...expected.map(e => e.label.length));
    for (let i = 0; i < Math.max(current.length, expected.length); i++) {
      const was = current[i]?.label ?? "(missing)";
      const now = expected[i]?.label ?? "(removed)";
      if (was !== now) console.error(`  ${was.padEnd(width)}  ->  ${now}`);
    }
    console.error("\nRun `npx tsx scripts/sync-theme-contributions.ts` to fix.");
    process.exit(1);
  }

  // Preserve the file's existing indentation and trailing newline.
  const indentMatch = pkgRaw.match(/\n(\s+)"name"/);
  const indent = indentMatch ? indentMatch[1].length : 2;
  pkg.contributes = { ...pkg.contributes, themes: expected };
  const endsWithNewline = pkgRaw.endsWith("\n");
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(pkg, null, indent) + (endsWithNewline ? "\n" : "")
  );

  console.log(`✅ Synced ${expected.length} theme picker labels from build/themes/.`);
}

main();
