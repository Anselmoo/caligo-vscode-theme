import { describe, expect, it } from "vitest";
import type { Seed } from "../../src/lib/constraints";
import { derivePalette } from "../../src/lib/palette";
import { validateSeed } from "../../src/lib/seeds";

describe("Seed Processing", () => {
  describe("Valid Seed Validation", () => {
    it("should accept valid seed", () => {
      const seed: Seed = {
        id: "ValidSeed",
        displayName: "Valid Seed",
        background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
      };

      expect(() => validateSeed(seed)).not.toThrow();
    });

    it("should validate all required seed properties", () => {
      const seed: Seed = {
        id: "TestSeed",
        displayName: "Test Seed",
        background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
      };

      validateSeed(seed);

      expect(seed.id).toBeDefined();
      expect(seed.displayName).toBeDefined();
      expect(seed.background).toBeDefined();
      expect(seed.accent).toBeDefined();
    });
  });

  describe("Invalid Seed Rejection", () => {
    it("should allow seed with pure black background", () => {
      const seed = {
        id: "BlackSeed",
        displayName: "Black Seed",
        background: { mode: "oklch", l: 0, c: 0, h: 0 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
      } as Seed;

      // True-black OLED backgrounds are permitted by constraints
      expect(() => validateSeed(seed)).not.toThrow();
    });

    it("should reject seed with negative lightness", () => {
      const seed = {
        id: "NegativeSeed",
        displayName: "Negative Seed",
        background: { mode: "oklch", l: -0.1, c: 0.03, h: 220 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
      } as Seed;

      expect(() => validateSeed(seed)).toThrow();
    });

    it("should reject seed with lightness > 1", () => {
      const seed = {
        id: "OverbrightSeed",
        displayName: "Overbright Seed",
        background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
        accent: { mode: "oklch", l: 1.5, c: 0.15, h: 215 },
      } as Seed;

      expect(() => validateSeed(seed)).toThrow();
    });

    it("should reject seed with negative chroma", () => {
      const seed = {
        id: "NegativeChroma",
        displayName: "Negative Chroma",
        background: { mode: "oklch", l: 0.18, c: -0.01, h: 220 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
      } as Seed;

      expect(() => validateSeed(seed)).toThrow();
    });

    it("should reject seed with invalid hue", () => {
      const seed = {
        id: "InvalidHue",
        displayName: "Invalid Hue",
        background: { mode: "oklch", l: 0.18, c: 0.03, h: 400 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
      } as Seed;

      expect(() => validateSeed(seed)).toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle minimum valid lightness", () => {
      const seed: Seed = {
        id: "MinLight",
        displayName: "Min Light",
        background: { mode: "oklch", l: 0.01, c: 0.01, h: 220 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
      };

      expect(() => validateSeed(seed)).not.toThrow();
      const palette = derivePalette(seed, "Balanced");
      expect(palette.bg0).toBeDefined();
    });

    it("should handle maximum valid lightness", () => {
      const seed: Seed = {
        id: "MaxLight",
        displayName: "Max Light",
        background: { mode: "oklch", l: 0.99, c: 0.01, h: 220 },
        accent: { mode: "oklch", l: 0.5, c: 0.15, h: 215 },
      };

      expect(() => validateSeed(seed)).not.toThrow();
      const palette = derivePalette(seed, "Balanced");
      expect(palette.bg0).toBeDefined();
    });

    it("should reject zero chroma accent (grayscale) due to minimum accent chroma", () => {
      const seed: Seed = {
        id: "Grayscale",
        displayName: "Grayscale",
        background: { mode: "oklch", l: 0.18, c: 0, h: 0 },
        accent: { mode: "oklch", l: 0.7, c: 0, h: 0 },
      };

      expect(() => validateSeed(seed)).toThrow();
    });

    it("should handle boundary hue values", () => {
      const seed1: Seed = {
        id: "HueZero",
        displayName: "Hue Zero",
        background: { mode: "oklch", l: 0.18, c: 0.03, h: 0 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 0 },
      };

      const seed2: Seed = {
        id: "Hue360",
        displayName: "Hue 360",
        background: { mode: "oklch", l: 0.18, c: 0.03, h: 359.99 },
        accent: { mode: "oklch", l: 0.7, c: 0.15, h: 359.99 },
      };

      expect(() => validateSeed(seed1)).not.toThrow();
      expect(() => validateSeed(seed2)).not.toThrow();
    });
  });

  describe("Batch Processing", () => {
    it("should process multiple valid seeds", () => {
      const seeds: Seed[] = [
        {
          id: "Seed1",
          displayName: "Seed 1",
          background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
          accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
        },
        {
          id: "Seed2",
          displayName: "Seed 2",
          background: { mode: "oklch", l: 0.16, c: 0.04, h: 280 },
          accent: { mode: "oklch", l: 0.65, c: 0.18, h: 275 },
        },
        {
          id: "Seed3",
          displayName: "Seed 3",
          background: { mode: "oklch", l: 0.2, c: 0.02, h: 140 },
          accent: { mode: "oklch", l: 0.75, c: 0.12, h: 145 },
        },
      ];

      const results = seeds.map(seed => {
        validateSeed(seed);
        return derivePalette(seed, "Balanced");
      });

      expect(results).toHaveLength(3);
      for (const palette of results) {
        expect(palette.bg0).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.fg0).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it("should identify invalid seed in batch", () => {
      const seeds = [
        {
          id: "ValidSeed",
          displayName: "Valid",
          background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
          accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
        },
        {
          id: "InvalidSeed",
          displayName: "Invalid",
          background: { mode: "oklch", l: -0.1, c: 0.03, h: 220 },
          accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
        },
      ] as Seed[];

      expect(() => validateSeed(seeds[0])).not.toThrow();
      expect(() => validateSeed(seeds[1])).toThrow();
    });
  });
});
