import { describe, expect, it } from "vitest";
import type { Seed } from "../constraints.js";
import { derivePalette } from "../palette.js";
import { evaluateSemanticTokenQuality } from "../semantic-token-quality.js";
import { deriveSemanticTokenColors, type SemanticTokenColors } from "../semantic-tokens.js";

describe("evaluateSemanticTokenQuality", () => {
  const testSeed: Seed = {
    id: "quality-seed",
    displayName: "Quality Seed",
    background: { mode: "oklch", l: 0.18, c: 0.03, h: 240 },
    accent: { mode: "oklch", l: 0.69, c: 0.16, h: 200 },
  };

  it("should report coverage and quality for generated semantic tokens", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);
    const report = evaluateSemanticTokenQuality(tokens, palette.bg0);

    expect(report.coverage.typeCoverage).toBeGreaterThanOrEqual(0.95);
    expect(report.coverage.modifierCoverage).toBeGreaterThanOrEqual(0.8);
    expect(report.apca.valid).toBe(true);
    expect(report.deltaE.valid).toBe(true);
  });

  it("should flag low-quality token maps", () => {
    const lowQuality: SemanticTokenColors = {
      variable: "#666666",
      function: "#666666",
      class: "#666666",
      keyword: "#666666",
      "*.deprecated": "#666666",
    };

    const report = evaluateSemanticTokenQuality(lowQuality, "#111111");
    expect(report.coverage.valid).toBe(false);
    expect(report.apca.valid).toBe(false);
    expect(report.deltaE.valid).toBe(false);
  });
});
