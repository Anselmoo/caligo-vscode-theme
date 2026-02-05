import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePreviewPath } from "./resolvePreviewPath";

const cwd = process.cwd();
const legacyDir = path.join(cwd, "build", "preview");
const vueDir = path.join(cwd, "dist");

function ensureFile(p: string) {
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, "ok");
}

function rmIfExists(p: string) {
  try {
    fs.rmSync(p, { force: true, recursive: true });
  } catch {}
}

describe("resolvePreviewPath", () => {
  it("prefers legacy preview-original.html when present", () => {
    const legacy = path.join(legacyDir, "preview-original.html");

    // clean up then create legacy
    rmIfExists(legacyDir);
    rmIfExists(vueDir);

    ensureFile(legacy);

    const resolved = resolvePreviewPath();
    expect(resolved).toBe(legacy);

    // cleanup
    rmIfExists(legacyDir);
  });

  it("falls back to vue index when legacy missing", () => {
    const vueIndex = path.join(vueDir, "index.html");

    rmIfExists(legacyDir);
    rmIfExists(vueDir);

    ensureFile(vueIndex);

    const resolved = resolvePreviewPath();
    expect(resolved).toBe(vueIndex);

    rmIfExists(vueDir);
  });
});
