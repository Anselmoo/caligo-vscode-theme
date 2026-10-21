import { describe, expect, it } from "vitest";
import type { ThemeIndexEntry } from "../../../types/theme.js";
import {
  AA_TEXT,
  colourRows,
  measureHex,
  minLightnessFor,
  opacityPercent,
  renderedContrast,
  toContrastColor,
} from "../colour-report.js";

const BG0 = "#100f20";

function theme(): ThemeIndexEntry {
  // The manifest's own oklch for `types` is deliberately wrong (L 0.92): the report must ignore it.
  const wrong = { l: 0.92, c: 0.1, h: 10 };
  return {
    colors: { bg0: BG0, strings: "#9090a2bf", types: "#ce8545" },
    core: [
      { key: "bg0", label: "Background Primary", hex: BG0, oklch: wrong },
      { key: "strings", label: "Strings", hex: "#9090a2bf", oklch: wrong },
      { key: "types", label: "Types", hex: "#ce8545", oklch: wrong },
    ],
  } as unknown as ThemeIndexEntry;
}

describe("colour report", () => {
  it("measures OKLCH from the hex, not from manifest metadata", () => {
    const types = colourRows(theme()).find(r => r.key === "types");
    expect(types?.l).toBeCloseTo(0.68, 2);
    expect(types?.l).not.toBeCloseTo(0.92, 1);
  });

  it("reads alpha from 8-digit hex", () => {
    const strings = measureHex("#9090a2bf");
    expect(strings.alpha).toBeCloseTo(0.75, 2);
    expect(opacityPercent(strings.alpha)).toBe(75);
    expect(opacityPercent(1)).toBeNull();
  });

  it("composites a translucent ink over the background before measuring contrast", () => {
    const composited = renderedContrast("#9090a2bf", BG0);
    const opaque = renderedContrast("#9090a2", BG0);
    expect(composited).toBeLessThan(opaque - 0.5);
  });

  it("reports contrast for inks and none for surfaces", () => {
    const rows = colourRows(theme());
    expect(rows.find(r => r.key === "bg0")?.contrast).toBeNull();
    expect(rows.find(r => r.key === "strings")?.contrast).toBeCloseTo(
      renderedContrast("#9090a2bf", BG0),
      6
    );
    expect(rows.find(r => r.key === "strings")?.kind).toBe("ink");
  });

  it("finds the grey lightness that just reaches 4.5:1", () => {
    const l = minLightnessFor(BG0);
    expect(l).not.toBeNull();
    const grey = (value: number) => ({ mode: "oklch", l: value, c: 0, h: 0 });
    expect(renderedContrast(toContrastColor(grey(l ?? 0)), BG0)).toBeGreaterThanOrEqual(
      AA_TEXT - 0.01
    );
    expect(renderedContrast(toContrastColor(grey((l ?? 0) - 0.02)), BG0)).toBeLessThan(AA_TEXT);
  });

  it("returns no rows before a theme is loaded", () => {
    expect(colourRows(null)).toEqual([]);
  });
});
