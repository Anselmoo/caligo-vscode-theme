import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const themesDir = resolve(process.cwd(), "themes");
const marker = resolve(process.cwd(), ".generated-themes-by-pretest");

if (!existsSync(themesDir)) {
  mkdirSync(themesDir, { recursive: true });

  const example = {
    name: "Example Theme (generated)",
    type: "dark",
    colors: {
      "editor.background": "#000000",
      "editor.foreground": "#ffffff",
    },
  };

  await writeFile(
    resolve(themesDir, "example-theme.json"),
    JSON.stringify(example, null, 2),
    "utf-8"
  );
  await writeFile(marker, "generated-by-pretest", "utf-8");
  console.log("✅ Generated temporary themes/example-theme.json for tests");
} else {
  console.log("⚠️  themes directory already exists; no changes made");
}
