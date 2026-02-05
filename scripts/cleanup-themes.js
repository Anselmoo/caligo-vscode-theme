import { existsSync } from "node:fs";
import { rmdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";

const themesDir = resolve(process.cwd(), "themes");
const marker = resolve(process.cwd(), ".generated-themes-by-pretest");

if (existsSync(marker)) {
  try {
    await unlink(resolve(themesDir, "example-theme.json"));
  } catch {
    // ignore
  }
  try {
    await rmdir(themesDir);
  } catch {
    // ignore
  }
  try {
    await unlink(marker);
  } catch {
    // ignore
  }
  console.log("✅ Cleaned up generated themes");
} else {
  console.log("ℹ️  No generated themes marker found; nothing to clean");
}
