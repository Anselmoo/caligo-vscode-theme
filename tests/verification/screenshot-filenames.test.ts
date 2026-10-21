import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { readThemeLabels, screenshotFilename } from "../../scripts/lib/screenshot-filename";

// Regression guard: every Monochromatic card in the gallery showed a broken
// image because the manifest rebuilt the label as "Caligo (Seed — Harmony)"
// while the capture slugged the shipped label "… — Monochromatic · 2 weights".

test("monochromatic labels keep their weight count in the filename", () => {
  expect(screenshotFilename("Caligo (Aurora Noir — Monochromatic · 2 weights)")).toBe(
    "caligo-aurora-noir-monochromatic-2-weights-typescript.png"
  );
});

test("every shipped theme has a label to slug", () => {
  const labels = readThemeLabels(process.cwd());
  expect(labels.size).toBe(50);
  expect(labels.get("Caligo-AuroraNoirMonochromatic")).toMatch(/Monochromatic · \d+ weights?\)$/);
});

test("the screenshots manifest marks a capture-named file as existing", () => {
  const root = mkdtempSync(join(tmpdir(), "caligo-shots-"));
  const pub = join(root, "public");
  execFileSync("mkdir", ["-p", join(pub, "screenshots")]);
  writeFileSync(join(root, "package.json"), readFileSync("package.json"));
  writeFileSync(
    join(pub, "themes-manifest.json"),
    JSON.stringify({
      themes: {
        "Caligo-AuroraNoirMonochromatic": {
          key: "Caligo-AuroraNoirMonochromatic",
          seedId: "AuroraNoir",
          seedLabel: "Aurora Noir",
          harmonyId: "monochromatic",
          harmonyLabel: "Monochromatic",
          displayName: "Aurora Noir Monochromatic",
        },
      },
    })
  );
  const label = readThemeLabels(process.cwd()).get("Caligo-AuroraNoirMonochromatic") ?? "";
  writeFileSync(join(pub, "screenshots", screenshotFilename(label)), "");

  execFileSync("npx", ["tsx", join(process.cwd(), "scripts/generate-screenshots-manifest.ts")], {
    cwd: root,
    stdio: "pipe",
  });

  const manifest = JSON.parse(readFileSync(join(pub, "screenshots-manifest.json"), "utf-8"));
  expect(manifest.screenshots[0].exists).toBe(true);
  expect(manifest.screenshots[0].filename).toBe(`/screenshots/${screenshotFilename(label)}`);
});
