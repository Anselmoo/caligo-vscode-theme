import { describe, expect, it } from "vitest";
import {
  deriveHarmonyDecorativeWheel,
  deriveHarmonyPalette,
  getHarmonyHues,
  HARMONY_MODES,
  HARMONY_OFFSETS,
  type HarmonyMode,
  SYNTAX_LC_DEFAULTS,
} from "../harmony-colors.js";

describe("harmony-colors", () => {
  describe("getHarmonyHues", () => {
    it("should return correct hues for 'none' mode", () => {
      const hues = getHarmonyHues(180, "none");
      expect(hues).toEqual([180]);
    });

    it("should return correct hues for 'analogous' mode", () => {
      const hues = getHarmonyHues(180, "analogous");
      expect(hues).toHaveLength(3);
      expect(hues).toEqual([150, 180, 210]);
    });

    it("should return correct hues for 'triadic' mode", () => {
      const hues = getHarmonyHues(0, "triadic");
      expect(hues).toHaveLength(3);
      expect(hues).toEqual([0, 120, 240]);
    });

    it("should return correct hues for 'split-complementary' mode", () => {
      const hues = getHarmonyHues(0, "split-complementary");
      expect(hues).toHaveLength(3);
      expect(hues).toEqual([0, 150, 210]);
    });

    it("should return correct hues for 'monochromatic' mode", () => {
      const hues = getHarmonyHues(45, "monochromatic");
      expect(hues).toHaveLength(1);
      expect(hues).toEqual([45]);
    });

    it("should normalize hues to 0-360 range", () => {
      const hues = getHarmonyHues(350, "analogous");
      expect(hues).toHaveLength(3);
      // -30 from 350 = 320, 0 = 350, +30 = 380 % 360 = 20
      expect(hues).toEqual([320, 350, 20]);
    });
  });

  describe("deriveHarmonyPalette", () => {
    it("should create a palette with all required colors", () => {
      const palette = deriveHarmonyPalette(180, "analogous");

      expect(palette.mode).toBe("analogous");
      expect(palette.baseHue).toBe(180);
      expect(palette.harmonyHues).toBeDefined();

      // Check hex colors
      expect(palette.strings).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.numbers).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.keywords).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.functions).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.types).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.variables).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.constants).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.attributes).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.tags).toMatch(/^#[0-9a-f]{6}$/);

      // Check debug OKLCH values
      expect(palette.debug.strings.l).toBeGreaterThan(0);
      expect(palette.debug.strings.c).toBeGreaterThanOrEqual(0);
      expect(palette.debug.strings.h).toBeGreaterThanOrEqual(0);
      expect(palette.debug.strings.h).toBeLessThan(360);
    });

    it("should respect baseChroma parameter", () => {
      const palette1 = deriveHarmonyPalette(180, "analogous", 0.1);
      const palette2 = deriveHarmonyPalette(180, "analogous", 0.2);

      // Higher chroma should result in more saturated colors
      expect(palette2.debug.strings.c).toBeGreaterThan(palette1.debug.strings.c);
    });

    it("should use default chroma when not provided", () => {
      const palette = deriveHarmonyPalette(180, "analogous");

      expect(palette.debug.strings.c).toBeGreaterThan(0);
    });

    it("should handle all harmony modes", () => {
      const modes: HarmonyMode[] = [
        "none",
        "analogous",
        "triadic",
        "split-complementary",
        "monochromatic",
      ];

      for (const mode of modes) {
        const palette = deriveHarmonyPalette(180, mode);
        expect(palette.mode).toBe(mode);
        expect(palette.strings).toBeDefined();
        expect(palette.keywords).toBeDefined();
      }
    });

    it("should create different colors for different modes", () => {
      const palette1 = deriveHarmonyPalette(180, "analogous");
      const palette2 = deriveHarmonyPalette(180, "triadic");

      // Triadic and analogous should produce different color schemes
      expect(palette1.keywords).not.toBe(palette2.keywords);
    });

    it("should respect SYNTAX_LC_DEFAULTS for lightness and chroma", () => {
      const palette = deriveHarmonyPalette(180, "analogous", 0.15);

      // Check that each color uses the correct L/C baseline
      const stringsLC = SYNTAX_LC_DEFAULTS.strings;
      expect(palette.debug.strings.l).toBeCloseTo(stringsLC.l, 1);
    });

    it("should clamp OKLCH values to valid ranges", () => {
      const palette = deriveHarmonyPalette(180, "analogous", 1.0); // Very high chroma

      expect(palette.debug.strings.l).toBeGreaterThanOrEqual(0);
      expect(palette.debug.strings.l).toBeLessThanOrEqual(1);
      expect(palette.debug.strings.c).toBeGreaterThanOrEqual(0);
      expect(palette.debug.strings.c).toBeLessThanOrEqual(0.4);
    });
  });

  describe("deriveHarmonyDecorativeWheel", () => {
    it("should create decorative wheel for 'none' mode", () => {
      const wheel = deriveHarmonyDecorativeWheel(180, "none");

      expect(wheel.hueRed).toBeDefined();
      expect(wheel.hueOrange).toBeDefined();
      expect(wheel.hueYellow).toBeDefined();
      expect(wheel.hueGreen).toBeDefined();
      expect(wheel.hueCyan).toBeDefined();
      expect(wheel.hueBlue).toBeDefined();
      expect(wheel.huePurple).toBeDefined();

      // All hues should be normalized to 0-360
      expect(wheel.hueRed).toBeGreaterThanOrEqual(0);
      expect(wheel.hueRed).toBeLessThan(360);
    });

    it("should use same hue for all colors in monochromatic mode", () => {
      const wheel = deriveHarmonyDecorativeWheel(180, "monochromatic");

      expect(wheel.hueRed).toBe(180);
      expect(wheel.hueOrange).toBe(180);
      expect(wheel.hueYellow).toBe(180);
      expect(wheel.hueGreen).toBe(180);
      expect(wheel.hueCyan).toBe(180);
      expect(wheel.hueBlue).toBe(180);
      expect(wheel.huePurple).toBe(180);
    });

    it("should create varied hues for analogous mode", () => {
      const wheel = deriveHarmonyDecorativeWheel(180, "analogous");

      // Analogous should have some variation within the narrow band
      const hues = [
        wheel.hueRed,
        wheel.hueOrange,
        wheel.hueYellow,
        wheel.hueGreen,
        wheel.hueCyan,
        wheel.hueBlue,
        wheel.huePurple,
      ];

      // Not all hues should be identical
      const uniqueHues = new Set(hues);
      expect(uniqueHues.size).toBeGreaterThan(1);
    });

    it("should create varied hues for triadic mode", () => {
      const wheel = deriveHarmonyDecorativeWheel(0, "triadic");

      const hues = [
        wheel.hueRed,
        wheel.hueOrange,
        wheel.hueYellow,
        wheel.hueGreen,
        wheel.hueCyan,
        wheel.hueBlue,
        wheel.huePurple,
      ];

      // Should have variety across the wheel
      const uniqueHues = new Set(hues);
      expect(uniqueHues.size).toBeGreaterThan(1);
    });

    it("should create varied hues for split-complementary mode", () => {
      const wheel = deriveHarmonyDecorativeWheel(0, "split-complementary");

      const hues = [
        wheel.hueRed,
        wheel.hueOrange,
        wheel.hueYellow,
        wheel.hueGreen,
        wheel.hueCyan,
        wheel.hueBlue,
        wheel.huePurple,
      ];

      // Should have variety
      const uniqueHues = new Set(hues);
      expect(uniqueHues.size).toBeGreaterThan(1);
    });

    it("should normalize all hues to 0-360 range", () => {
      const modes: HarmonyMode[] = [
        "none",
        "analogous",
        "triadic",
        "split-complementary",
        "monochromatic",
      ];

      for (const mode of modes) {
        const wheel = deriveHarmonyDecorativeWheel(350, mode);

        expect(wheel.hueRed).toBeGreaterThanOrEqual(0);
        expect(wheel.hueRed).toBeLessThan(360);
        expect(wheel.hueOrange).toBeGreaterThanOrEqual(0);
        expect(wheel.hueOrange).toBeLessThan(360);
        expect(wheel.hueYellow).toBeGreaterThanOrEqual(0);
        expect(wheel.hueYellow).toBeLessThan(360);
      }
    });
  });

  describe("HARMONY_OFFSETS", () => {
    it("should have correct offsets for each mode", () => {
      expect(HARMONY_OFFSETS.none).toEqual([0]);
      expect(HARMONY_OFFSETS.analogous).toEqual([-30, 0, 30]);
      expect(HARMONY_OFFSETS.triadic).toEqual([0, 120, 240]);
      expect(HARMONY_OFFSETS["split-complementary"]).toEqual([0, 150, 210]);
      expect(HARMONY_OFFSETS.monochromatic).toEqual([0]);
    });
  });

  describe("HARMONY_MODES", () => {
    it("should include all expected modes", () => {
      expect(HARMONY_MODES).toContain("none");
      expect(HARMONY_MODES).toContain("analogous");
      expect(HARMONY_MODES).toContain("triadic");
      expect(HARMONY_MODES).toContain("split-complementary");
      expect(HARMONY_MODES).toContain("monochromatic");
    });
  });
});
