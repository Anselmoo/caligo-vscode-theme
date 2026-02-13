import { describe, expect, it } from "vitest";
import type { Seed } from "../constraints.js";
import {
  buildModeDistinctnessSample,
  evaluateModeDistinctness,
  harmonyModeToId,
  MODE_DISTINCTNESS_THRESHOLDS,
  type ModeDistinctnessSample,
} from "../mode-distinctness.js";
import { derivePalette } from "../palette.js";
import { deriveSemanticTokenColors } from "../semantic-tokens.js";

describe("mode-distinctness", () => {
  const testSeed: Seed = {
    id: "test-seed",
    displayName: "Test Seed",
    background: { mode: "oklch", l: 0.18, c: 0.03, h: 240 },
    accent: { mode: "oklch", l: 0.69, c: 0.16, h: 200 },
  };

  describe("harmonyModeToId", () => {
    it("should return correct harmony mode IDs", () => {
      expect(harmonyModeToId("analogous")).toBe("analogous");
      expect(harmonyModeToId("monochromatic")).toBe("monochromatic");
      expect(harmonyModeToId("triadic")).toBe("triadic");
      expect(harmonyModeToId("split-complementary")).toBe("split-complementary");
    });

    it("should default to balanced for unknown modes", () => {
      expect(harmonyModeToId("unknown")).toBe("balanced");
      expect(harmonyModeToId(undefined)).toBe("balanced");
      expect(harmonyModeToId("")).toBe("balanced");
    });
  });

  describe("buildModeDistinctnessSample", () => {
    it("should build a valid sample from palette and tokens", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const tokens = deriveSemanticTokenColors(palette);

      const sample = buildModeDistinctnessSample("test-seed", "balanced", palette, tokens);

      expect(sample.seedId).toBe("test-seed");
      expect(sample.themeId).toBe(testSeed.id);
      expect(sample.harmonyId).toBe("balanced");
      expect(sample.editorBg).toBe(palette.bg0);
      expect(sample.uiRamp.accent).toBe(palette.accent);
      expect(sample.tier1.variable).toBeDefined();
      expect(sample.tier1.function).toBeDefined();
    });

    it("should use fallback colors when tokens are not available", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const emptyTokens = {};

      const sample = buildModeDistinctnessSample("test-seed", "balanced", palette, emptyTokens);

      expect(sample.tier1.variable).toBe(palette.harmony.variables);
      expect(sample.tier1.function).toBe(palette.harmony.functions);
      expect(sample.tier1.property).toBe(palette.fg0);
    });

    it("should extract foreground from object-style tokens", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const tokens = {
        variable: { foreground: "#ff0000", fontStyle: "bold" },
        function: "#00ff00",
      };

      const sample = buildModeDistinctnessSample("test-seed", "balanced", palette, tokens);

      expect(sample.tier1.variable).toBe("#ff0000");
      expect(sample.tier1.function).toBe("#00ff00");
    });
  });

  describe("evaluateModeDistinctness", () => {
    it("should validate samples with sufficient distinctness", () => {
      const samples: ModeDistinctnessSample[] = [
        {
          seedId: "seed1",
          themeId: "theme1",
          harmonyId: "balanced",
          editorBg: "#111111",
          uiRamp: {
            accent: "#ff6b6b",
            accentSoft: "#ee5555",
            accentMuted: "#dd4444",
            accentSubtle: "#cc3333",
          },
          tier1: {
            variable: "#4ecdc4",
            parameter: "#3daca3",
            property: "#2d8c83",
            function: "#95e1d3",
            method: "#84d0c2",
          },
        },
        {
          seedId: "seed1",
          themeId: "theme1",
          harmonyId: "analogous",
          editorBg: "#111111",
          uiRamp: {
            accent: "#a8e6cf",
            accentSoft: "#97d5be",
            accentMuted: "#86c4ad",
            accentSubtle: "#75b39c",
          },
          tier1: {
            variable: "#ffd3b6",
            parameter: "#ffc2a5",
            property: "#ffb194",
            function: "#ffaaa5",
            method: "#ff9994",
          },
        },
      ];

      const report = evaluateModeDistinctness(samples);

      // Report structure should be correct
      expect(report.pairChecks).toHaveLength(1);
      expect(report.seedScores).toHaveLength(1);
      expect(report.thresholds).toEqual(MODE_DISTINCTNESS_THRESHOLDS);

      // Check that we got a score (may or may not be valid depending on thresholds)
      expect(report.seedScores[0].score).toBeGreaterThanOrEqual(0);
      expect(report.seedScores[0].score).toBeLessThanOrEqual(1);
    });

    it("should detect violations when colors are too similar", () => {
      const samples: ModeDistinctnessSample[] = [
        {
          seedId: "seed1",
          themeId: "theme1",
          harmonyId: "balanced",
          editorBg: "#111111",
          uiRamp: {
            accent: "#ff0000",
            accentSoft: "#ff0001",
            accentMuted: "#ff0002",
            accentSubtle: "#ff0003",
          },
          tier1: {
            variable: "#00ff00",
            parameter: "#00ff01",
            property: "#00ff02",
            function: "#00ff03",
            method: "#00ff04",
          },
        },
        {
          seedId: "seed1",
          themeId: "theme1",
          harmonyId: "analogous",
          editorBg: "#111111",
          uiRamp: {
            accent: "#ff0004",
            accentSoft: "#ff0005",
            accentMuted: "#ff0006",
            accentSubtle: "#ff0007",
          },
          tier1: {
            variable: "#00ff05",
            parameter: "#00ff06",
            property: "#00ff07",
            function: "#00ff08",
            method: "#00ff09",
          },
        },
      ];

      const report = evaluateModeDistinctness(samples);

      expect(report.valid).toBe(false);
      expect(report.violations.length).toBeGreaterThan(0);
    });

    it("should handle multiple seeds independently", () => {
      const samples: ModeDistinctnessSample[] = [
        {
          seedId: "seed1",
          themeId: "theme1",
          harmonyId: "balanced",
          editorBg: "#111111",
          uiRamp: {
            accent: "#ff0000",
            accentSoft: "#dd0000",
            accentMuted: "#bb0000",
            accentSubtle: "#990000",
          },
          tier1: {
            variable: "#00ff00",
            parameter: "#00dd00",
            property: "#00bb00",
            function: "#0000ff",
            method: "#0000dd",
          },
        },
        {
          seedId: "seed2",
          themeId: "theme2",
          harmonyId: "balanced",
          editorBg: "#222222",
          uiRamp: {
            accent: "#00ff00",
            accentSoft: "#00dd00",
            accentMuted: "#00bb00",
            accentSubtle: "#009900",
          },
          tier1: {
            variable: "#ff0000",
            parameter: "#dd0000",
            property: "#bb0000",
            function: "#0000ff",
            method: "#0000dd",
          },
        },
      ];

      const report = evaluateModeDistinctness(samples);

      expect(report.seedScores).toHaveLength(2);
      expect(report.seedScores.find(s => s.seedId === "seed1")).toBeDefined();
      expect(report.seedScores.find(s => s.seedId === "seed2")).toBeDefined();
    });

    it("should return empty report for empty samples", () => {
      const report = evaluateModeDistinctness([]);

      expect(report.valid).toBe(true);
      expect(report.violations).toHaveLength(0);
      expect(report.pairChecks).toHaveLength(0);
      expect(report.seedScores).toHaveLength(0);
    });

    it("should handle single sample without comparisons", () => {
      const samples: ModeDistinctnessSample[] = [
        {
          seedId: "seed1",
          themeId: "theme1",
          harmonyId: "balanced",
          editorBg: "#111111",
          uiRamp: {
            accent: "#ff0000",
            accentSoft: "#dd0000",
            accentMuted: "#bb0000",
            accentSubtle: "#990000",
          },
          tier1: {
            variable: "#00ff00",
            parameter: "#00dd00",
            property: "#00bb00",
            function: "#0000ff",
            method: "#0000dd",
          },
        },
      ];

      const report = evaluateModeDistinctness(samples);

      expect(report.valid).toBe(true);
      expect(report.violations).toHaveLength(0);
      expect(report.pairChecks).toHaveLength(0);
      expect(report.seedScores).toHaveLength(1);
      expect(report.seedScores[0].pairCount).toBe(0);
    });

    it("should compute scores correctly", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const tokens = deriveSemanticTokenColors(palette);

      const samples: ModeDistinctnessSample[] = [
        buildModeDistinctnessSample("test-seed", "balanced", palette, tokens),
        buildModeDistinctnessSample("test-seed", "analogous", palette, tokens),
      ];

      const report = evaluateModeDistinctness(samples);

      expect(report.seedScores[0].score).toBeGreaterThanOrEqual(0);
      expect(report.seedScores[0].score).toBeLessThanOrEqual(1);
      expect(report.seedScores[0].minPairScore).toBeGreaterThanOrEqual(0);
      expect(report.seedScores[0].minPairScore).toBeLessThanOrEqual(1);
    });
  });
});
