import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { converter } from "culori";
import { describe, expect, it } from "vitest";

import { buildCoreColors, extractManifestColors } from "../../scripts/generate-themes-manifest";

const toOklch = converter("oklch");
const TOLERANCE = 1e-3;
const THEMES_DIR = join(process.cwd(), "build/themes");

// Minimal stand-in for Caligo-DeepSable (types orange, functions yellow, translucent strings),
// so the regression is covered even when build/themes has not been generated.
const DEEP_SABLE_LIKE = {
  colors: {
    "editor.background": "#100f20",
    "sideBar.background": "#141425",
    "input.background": "#19182a",
    "editor.foreground": "#cecfe4",
    focusBorder: "#3b9cf6",
  },
  tokenColors: [
    { scope: ["string"], settings: { foreground: "#9090a2bf" } },
    { scope: ["entity.name.type"], settings: { foreground: "#ce8545" } },
    { scope: ["entity.name.function"], settings: { foreground: "#d1d473" } },
    { scope: ["keyword"], settings: { foreground: "#00b7b0" } },
    { scope: ["meta.decorator"], settings: { foreground: "#78dce8" } },
  ],
};

function coreFor(theme: Parameters<typeof extractManifestColors>[0]) {
  return buildCoreColors(extractManifestColors(theme));
}

function expectOklchMatchesHex(core: ReturnType<typeof buildCoreColors>) {
  expect(core).toHaveLength(10);
  for (const entry of core) {
    const expected = toOklch(entry.hex);
    expect(expected, `${entry.key} ${entry.hex}`).toBeDefined();
    expect(Math.abs(entry.oklch.l - (expected?.l ?? 0))).toBeLessThan(TOLERANCE);
    expect(Math.abs(entry.oklch.c - (expected?.c ?? 0))).toBeLessThan(TOLERANCE);
    // hue is circular; it is also undefined (→ 0) for achromatic colours
    const dh = Math.abs(entry.oklch.h - (expected?.h ?? 0)) % 360;
    expect(Math.min(dh, 360 - dh)).toBeLessThan(TOLERANCE * 100);
    expect(entry.alpha).toBeCloseTo(expected?.alpha ?? 1, 2);
  }
}

describe("generate-themes-manifest: core oklch metadata", () => {
  it("derives oklch from the hex it describes (DeepSable-like fixture)", () => {
    const core = coreFor(DEEP_SABLE_LIKE);
    expectOklchMatchesHex(core);

    const byKey = Object.fromEntries(core.map(e => [e.key, e]));
    // orange vs yellow must not collapse onto the same l/c/h
    expect(byKey.types.oklch.h).not.toBeCloseTo(byKey.functions.oklch.h, 0);
    expect(byKey.types.oklch.l).toBeLessThan(byKey.functions.oklch.l);
  });

  it("keeps alpha in the hex and reports the opaque colour's oklch plus an alpha field", () => {
    const strings = coreFor(DEEP_SABLE_LIKE).find(e => e.key === "strings");
    expect(strings?.hex).toBe("#9090a2bf");
    expect(strings?.alpha).toBeCloseTo(0xbf / 255, 2);
    const opaque = toOklch("#9090a2");
    expect(strings?.oklch.l).toBeCloseTo(opaque?.l ?? 0, 3);
    expect(strings?.oklch.c).toBeCloseTo(opaque?.c ?? 0, 3);
  });

  it("reports alpha 1 for opaque colours", () => {
    for (const entry of coreFor(DEEP_SABLE_LIKE).filter(e => e.hex.length === 7)) {
      expect(entry.alpha).toBe(1);
    }
  });

  const themeFiles = existsSync(THEMES_DIR)
    ? readdirSync(THEMES_DIR).filter(f => f.endsWith(".json"))
    : [];
  const sample = ["Caligo-DeepSable", ...themeFiles.map(f => f.replace(".json", ""))]
    .filter((name, i, all) => all.indexOf(name) === i && themeFiles.includes(`${name}.json`))
    .slice(0, 4);

  it.skipIf(sample.length === 0)("matches culori for generated themes", () => {
    for (const name of sample) {
      const theme = JSON.parse(readFileSync(join(THEMES_DIR, `${name}.json`), "utf-8"));
      expectOklchMatchesHex(coreFor(theme));
    }
  });
});
