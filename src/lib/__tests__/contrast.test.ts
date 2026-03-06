import { describe, expect, it } from "vitest";
import { pickReadableForeground, wcagContrastRatio } from "../contrast.js";

describe("wcagContrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(wcagContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns 21 for white on black", () => {
    expect(wcagContrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colors", () => {
    expect(wcagContrastRatio("#888888", "#888888")).toBe(1);
  });
});

describe("pickReadableForeground", () => {
  it("returns the palette candidate when it achieves WCAG AA", () => {
    // fg0 (light text) against a very dark background — should pass AA easily.
    const darkBg = "#1a1c23";
    const lightFg = "#bcd6df";
    const darkFg = "#0a0c10";
    const result = pickReadableForeground(darkBg, lightFg, darkFg);
    const contrast = wcagContrastRatio(result, darkBg);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(result).toBe(lightFg);
  });

  it("falls back to #000000 when both palette candidates fail WCAG AA against a mid-luminance background", () => {
    // #0085a7 is a mid-luminance teal: neither palette fg0 (~2.81) nor bg0 (~4.37) reaches 4.5.
    const midBg = "#0085a7";
    const lightFg = "#bcd6df"; // contrast ~2.81
    const darkFg = "#01151b"; // contrast ~4.37
    const result = pickReadableForeground(midBg, lightFg, darkFg);
    const contrast = wcagContrastRatio(result, midBg);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(result).toBe("#000000");
  });

  it("falls back to #ffffff when both palette candidates fail WCAG AA against a near-white background", () => {
    const nearWhiteBg = "#f0f0f0";
    const mediumFg = "#a0a0a0"; // too similar
    const lightFg = "#e0e0e0"; // too similar
    const result = pickReadableForeground(nearWhiteBg, mediumFg, lightFg);
    const contrast = wcagContrastRatio(result, nearWhiteBg);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(result).toBe("#000000");
  });

  it("always produces WCAG AA contrast regardless of background luminance", () => {
    const backgrounds = [
      "#000000",
      "#111111",
      "#333333",
      "#555555",
      "#777777",
      "#999999",
      "#aaaaaa",
      "#cccccc",
      "#eeeeee",
      "#ffffff",
    ];
    for (const bg of backgrounds) {
      const result = pickReadableForeground(bg, "#888888", "#999999");
      const contrast = wcagContrastRatio(result, bg);
      expect(
        contrast,
        `Expected ≥4.5 contrast for bg=${bg}, got ${contrast.toFixed(2)}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
