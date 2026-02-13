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

  it("should detect missing token types", () => {
    const incomplete: SemanticTokenColors = {
      variable: "#00ff00",
      function: "#0000ff",
      keyword: "#ff00ff",
    };

    const report = evaluateSemanticTokenQuality(incomplete, "#111111");

    expect(report.coverage.typeCoverage).toBeLessThan(1);
    expect(report.coverage.missingTypes.length).toBeGreaterThan(0);
  });

  it("should detect missing modifiers", () => {
    const noModifiers: SemanticTokenColors = {
      variable: "#00ff00",
      function: "#0000ff",
      class: "#ff0000",
      keyword: "#ff00ff",
      string: "#00ffff",
    };

    const report = evaluateSemanticTokenQuality(noModifiers, "#111111");

    expect(report.coverage.modifierCoverage).toBeLessThan(1);
    expect(report.coverage.missingModifiers.length).toBeGreaterThan(0);
  });

  it("should validate APCA contrast for each tier", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);
    const report = evaluateSemanticTokenQuality(tokens, palette.bg0);

    expect(report.apca.minLcByTier.tier1).toBeGreaterThan(0);
    expect(report.apca.minLcByTier.tier2).toBeGreaterThan(0);
    expect(report.apca.minLcByTier.tier3).toBeGreaterThan(0);
    expect(report.apca.minLcByTier.tier4).toBeGreaterThan(0);
    expect(report.apca.minLcByTier.tier5).toBeGreaterThan(0);
  });

  it("should detect APCA violations", () => {
    const lowContrast: SemanticTokenColors = {
      variable: "#222222", // Low contrast against dark background
      function: "#333333",
      property: "#444444",
      method: "#555555",
      parameter: "#666666",
    };

    const report = evaluateSemanticTokenQuality(lowContrast, "#111111");

    expect(report.apca.valid).toBe(false);
    expect(report.apca.violations.length).toBeGreaterThan(0);
  });

  it("should validate deltaE for critical pairs", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);
    const report = evaluateSemanticTokenQuality(tokens, palette.bg0);

    expect(report.deltaE.minima.critical).toBeDefined();
    expect(report.deltaE.minima.important).toBeDefined();
    expect(report.deltaE.minima.modifier).toBeDefined();
  });

  it("should detect deltaE violations for similar colors", () => {
    const similarColors: SemanticTokenColors = {
      variable: "#ff0000",
      keyword: "#ff0001", // Almost identical to variable
      function: "#00ff00",
      property: "#00ff01", // Almost identical to function (not a critical pair though)
    };

    const report = evaluateSemanticTokenQuality(similarColors, "#111111");

    // Variable and keyword is a critical pair, should have violation
    expect(report.deltaE.valid).toBe(false);
    expect(report.deltaE.violations.length).toBeGreaterThan(0);
  });

  it("should handle object-style token values", () => {
    const objectTokens: SemanticTokenColors = {
      variable: { foreground: "#00ff00", fontStyle: "bold" },
      function: { foreground: "#0000ff" },
      class: "#ff0000",
      keyword: "#ff00ff",
    };

    const report = evaluateSemanticTokenQuality(objectTokens, "#111111");

    // Should successfully extract foreground colors
    expect(report.apca.minLcByTier.tier1).toBeGreaterThan(0);
  });

  it("should handle tokens with language scopes", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);
    // Add some language-scoped tokens
    tokens["variable:typescript"] = "#00ff00";
    tokens["function.declaration:python"] = "#0000ff";

    const report = evaluateSemanticTokenQuality(tokens, palette.bg0);

    // Should process successfully even with scoped tokens
    expect(report.coverage.typeCoverage).toBeGreaterThanOrEqual(0.95);
  });

  it("should skip invalid color values when evaluating APCA", () => {
    const mixedTokens: SemanticTokenColors = {
      variable: "not-a-color", // Invalid
      function: "#0000ff",
      parameter: { foreground: "also-invalid" }, // Invalid
      class: "#ff0000",
    };

    const report = evaluateSemanticTokenQuality(mixedTokens, "#111111");

    // Should not crash, just skip invalid colors
    expect(report).toBeDefined();
  });

  it("should recognize type coverage with scoped variants", () => {
    const scopedTokens: SemanticTokenColors = {
      "variable.declaration": "#00ff00",
      "function:typescript": "#0000ff",
      "class.static": "#ff0000",
      keyword: "#ff00ff",
    };

    const report = evaluateSemanticTokenQuality(scopedTokens, "#111111");

    // Should recognize that variable, function, and class are covered
    expect(report.coverage.typeCoverage).toBeGreaterThan(0);
  });

  it("should recognize modifier coverage with wildcards", () => {
    const modifierTokens: SemanticTokenColors = {
      variable: "#00ff00",
      "*.deprecated": { foreground: "#666666", fontStyle: "strikethrough" },
      "*.readonly": { foreground: "#0000ff", fontStyle: "underline" },
      "*.static": { fontStyle: "underline" },
    };

    const report = evaluateSemanticTokenQuality(modifierTokens, "#111111");

    // Should recognize modifier coverage
    expect(report.coverage.modifierCoverage).toBeGreaterThan(0);
  });

  it("should return 0 for minLc when tier has no tokens", () => {
    const sparseTokens: SemanticTokenColors = {
      variable: "#00ff00", // tier1
      // No tier5 tokens (deprecated)
    };

    const report = evaluateSemanticTokenQuality(sparseTokens, "#111111");

    // Tiers without tokens should have minLc of 0
    expect(report.apca.minLcByTier.tier5).toBe(0);
  });
});
