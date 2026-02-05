import fs from "node:fs";
import path from "node:path";

export function resolvePreviewPath(): string {
  const cwd = process.cwd();
  const legacy = path.join(cwd, "build", "preview", "preview-original.html");
  const vueIndex = path.join(cwd, "dist", "index.html");

  if (fs.existsSync(legacy)) return legacy;
  if (fs.existsSync(vueIndex)) return vueIndex;

  // As a last resort, return the expected legacy path (so errors are clear)
  return legacy;
}
