import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const rootPackagePath = path.join(repoRoot, "package.json");
const sourceThemesDir = path.join(repoRoot, "themes");
const packageDir = path.join(
  repoRoot,
  process.env.CALIGO_THEME_DATA_OUTPUT_DIR ?? "build/github-packages/caligo-theme-data"
);
const distDir = path.join(packageDir, "dist");
const distThemesDir = path.join(distDir, "themes");
const manifestPath = path.join(distDir, "manifest.json");
const packageJsonPath = path.join(packageDir, "package.json");
const readmePath = path.join(packageDir, "README.md");
const indexPath = path.join(packageDir, "index.cjs");

const rootPackage = JSON.parse(await fs.readFile(rootPackagePath, "utf8"));
const packageVersionRaw = process.env.CALIGO_THEME_DATA_VERSION ?? rootPackage.version;
const packageVersion = packageVersionRaw.startsWith("v")
  ? packageVersionRaw.slice(1)
  : packageVersionRaw;

const entries = await fs.readdir(sourceThemesDir, { withFileTypes: true });
const themeFiles = entries
  .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
  .map(entry => entry.name)
  .sort((left, right) => left.localeCompare(right));

if (themeFiles.length === 0) {
  throw new Error(
    'No theme JSON files found in ./themes. Run "npm run generate" before packaging.'
  );
}

await fs.rm(packageDir, { recursive: true, force: true });
await fs.mkdir(distThemesDir, { recursive: true });

for (const themeFile of themeFiles) {
  await fs.copyFile(path.join(sourceThemesDir, themeFile), path.join(distThemesDir, themeFile));
}

const manifest = {
  count: themeFiles.length,
  themes: themeFiles.map(file => ({
    file,
    path: `themes/${file}`,
  })),
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await fs.writeFile(
  packageJsonPath,
  `${JSON.stringify(
    {
      name: "@anselmoo/caligo-theme-data",
      version: packageVersion,
      description: "Caligo VS Code theme JSON assets and manifest",
      license: rootPackage.license ?? "MIT",
      repository: rootPackage.repository,
      homepage: rootPackage.homepage,
      main: "./index.cjs",
      files: ["index.cjs", "README.md", "dist/"],
      publishConfig: {
        registry: "https://npm.pkg.github.com",
        access: "restricted",
      },
    },
    null,
    2
  )}\n`,
  "utf8"
);
await fs.writeFile(
  readmePath,
  "# @anselmoo/caligo-theme-data\n\nGenerated publish package for Caligo theme JSON assets.\n",
  "utf8"
);
await fs.writeFile(
  indexPath,
  'const path = require("node:path");\nconst manifest = require("./dist/manifest.json");\n\nfunction getThemePath(fileName) {\n  return path.join(__dirname, "dist", "themes", fileName);\n}\n\nmodule.exports = {\n  manifest,\n  getThemePath,\n};\n',
  "utf8"
);

console.log(
  `Prepared @anselmoo/caligo-theme-data package at ${path.relative(repoRoot, packageDir)} with ${themeFiles.length} theme files (version ${packageVersion}).`
);
