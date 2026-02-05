/**
 * Tests for color-utils.ts
 * Comprehensive coverage for shared hex conversion utilities
 */

import { describe, expect, it } from "vitest";
import {
  calculateContrast,
  calculateHueSpread,
  distanceOklabFromOKLCH,
  formatOKLCH,
  generateHueSpectrum,
  getWCAGColor,
  getWCAGLevel,
  hexToRgb,
  hexToRgba,
  hexToRgbTuple,
  hexToSRGB,
  oklchToHex,
} from "../color-utils.js";

describe("color-utils", () => {
  describe("hexToRgb", () => {
    it("should convert 6-digit hex to RGB string", () => {
      expect(hexToRgb("#ff0000")).toBe("255, 0, 0");
      expect(hexToRgb("#00ff00")).toBe("0, 255, 0");
      expect(hexToRgb("#0000ff")).toBe("0, 0, 255");
    });

    it("should handle hex without # prefix", () => {
      expect(hexToRgb("ff0000")).toBe("255, 0, 0");
    });

    it("should handle 8-digit hex (with alpha) and ignore alpha", () => {
      expect(hexToRgb("#ff0000ff")).toBe("255, 0, 0");
      expect(hexToRgb("#00ff0080")).toBe("0, 255, 0");
    });

    it("should handle hex with whitespace", () => {
      expect(hexToRgb("  #ff0000  ")).toBe("255, 0, 0");
    });

    it("should throw error for null/undefined", () => {
      expect(() => hexToRgb(null)).toThrow("hexToRgb: hex color is required");
      expect(() => hexToRgb(undefined)).toThrow("hexToRgb: hex color is required");
    });

    it("should throw error for invalid hex", () => {
      expect(() => hexToRgb("#gggggg")).toThrow('hexToRgb: invalid hex color "#gggggg"');
      expect(() => hexToRgb("#ff")).toThrow('hexToRgb: invalid hex color "#ff"');
      expect(() => hexToRgb("not-a-color")).toThrow('hexToRgb: invalid hex color "not-a-color"');
    });

    it("should convert various valid colors correctly", () => {
      expect(hexToRgb("#ffffff")).toBe("255, 255, 255");
      expect(hexToRgb("#000000")).toBe("0, 0, 0");
      expect(hexToRgb("#7f7f7f")).toBe("127, 127, 127");
    });
  });

  describe("hexToRgbTuple", () => {
    it("should convert hex to RGB tuple", () => {
      expect(hexToRgbTuple("#ff0000")).toEqual([255, 0, 0]);
      expect(hexToRgbTuple("#00ff00")).toEqual([0, 255, 0]);
      expect(hexToRgbTuple("#0000ff")).toEqual([0, 0, 255]);
    });

    it("should handle 8-digit hex and ignore alpha", () => {
      expect(hexToRgbTuple("#ff0000ff")).toEqual([255, 0, 0]);
    });

    it("should throw error for invalid hex", () => {
      expect(() => hexToRgbTuple("#gggggg")).toThrow('hexToRgbTuple: invalid hex color "#gggggg"');
    });

    it("should convert edge cases correctly", () => {
      expect(hexToRgbTuple("#ffffff")).toEqual([255, 255, 255]);
      expect(hexToRgbTuple("#000000")).toEqual([0, 0, 0]);
    });
  });

  describe("hexToRgba", () => {
    it("should convert hex to RGBA with default alpha", () => {
      expect(hexToRgba("#ff0000")).toBe("rgba(255, 0, 0, 1)");
    });

    it("should convert hex to RGBA with custom alpha", () => {
      expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
      expect(hexToRgba("#00ff00", 0)).toBe("rgba(0, 255, 0, 0)");
      expect(hexToRgba("#0000ff", 1)).toBe("rgba(0, 0, 255, 1)");
    });

    it("should handle various alpha values", () => {
      expect(hexToRgba("#ffffff", 0.25)).toBe("rgba(255, 255, 255, 0.25)");
      expect(hexToRgba("#000000", 0.75)).toBe("rgba(0, 0, 0, 0.75)");
    });

    it("should throw error for invalid hex", () => {
      expect(() => hexToRgba("#gggggg")).toThrow('hexToRgbTuple: invalid hex color "#gggggg"');
    });
  });

  describe("hexToSRGB", () => {
    it("should convert hex to sRGB string for APCA", () => {
      expect(hexToSRGB("#ff0000")).toBe("rgb(255, 0, 0)");
      expect(hexToSRGB("#00ff00")).toBe("rgb(0, 255, 0)");
      expect(hexToSRGB("#0000ff")).toBe("rgb(0, 0, 255)");
    });

    it("should handle various colors", () => {
      expect(hexToSRGB("#ffffff")).toBe("rgb(255, 255, 255)");
      expect(hexToSRGB("#000000")).toBe("rgb(0, 0, 0)");
      expect(hexToSRGB("#7f7f7f")).toBe("rgb(127, 127, 127)");
    });

    it("should throw error for invalid hex", () => {
      expect(() => hexToSRGB("#invalid")).toThrow('hexToRgbTuple: invalid hex color "#invalid"');
    });
  });

  describe("Integration tests", () => {
    it("should handle same input consistently across all functions", () => {
      const hex = "#ff5500";

      // hexToRgb returns string
      const rgbString = hexToRgb(hex);
      expect(rgbString).toBe("255, 85, 0");

      // hexToRgbTuple returns tuple
      const [r, g, b] = hexToRgbTuple(hex);
      expect([r, g, b]).toEqual([255, 85, 0]);

      // They should have same values
      const parts = rgbString.split(", ").map(Number);
      expect(parts).toEqual([r, g, b]);

      // hexToRgba should use same RGB values
      const rgba = hexToRgba(hex, 0.8);
      expect(rgba).toBe("rgba(255, 85, 0, 0.8)");

      // hexToSRGB should use same RGB values
      const srgb = hexToSRGB(hex);
      expect(srgb).toBe("rgb(255, 85, 0)");
    });
  });

  describe("oklchToHex", () => {
    it("should convert OKLCH to hex color", () => {
      const hex = oklchToHex(0.5, 0.1, 0);
      expect(typeof hex).toBe("string");
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should handle various OKLCH values", () => {
      const testCases = [
        { l: 0.2, c: 0.05, h: 0 },
        { l: 0.5, c: 0.15, h: 180 },
        { l: 0.8, c: 0.2, h: 270 },
      ];

      testCases.forEach(({ l, c, h }) => {
        const hex = oklchToHex(l, c, h);
        expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe("calculateContrast", () => {
    it("should calculate contrast between two colors", () => {
      const contrast = calculateContrast("#ffffff", "#000000");
      expect(typeof contrast).toBe("number");
      expect(contrast).toBeGreaterThan(1);
      expect(contrast).toBeLessThanOrEqual(21);
    });

    it("should return 1 for same color", () => {
      const contrast = calculateContrast("#ff0000", "#ff0000");
      expect(contrast).toBe(1);
    });

    it("should handle various color combinations", () => {
      const testCases = [
        { color1: "#ffffff", color2: "#000000" },
        { color1: "#ff0000", color2: "#00ff00" },
        { color1: "#0000ff", color2: "#ffff00" },
      ];

      testCases.forEach(({ color1, color2 }) => {
        const contrast = calculateContrast(color1, color2);
        expect(typeof contrast).toBe("number");
        expect(contrast).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("distanceOklabFromOKLCH", () => {
    it("should calculate distance between two OKLCH colors", () => {
      const distance = distanceOklabFromOKLCH({ l: 0.1, c: 0.05, h: 0 }, { l: 0.9, c: 0.05, h: 0 });
      expect(typeof distance).toBe("number");
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 for same color", () => {
      const distance = distanceOklabFromOKLCH(
        { l: 0.5, c: 0.1, h: 180 },
        { l: 0.5, c: 0.1, h: 180 }
      );
      expect(distance).toBe(0);
    });

    it("should be symmetric", () => {
      const color1 = { l: 0.2, c: 0.05, h: 0 };
      const color2 = { l: 0.8, c: 0.2, h: 180 };
      const dist12 = distanceOklabFromOKLCH(color1, color2);
      const dist21 = distanceOklabFromOKLCH(color2, color1);
      expect(dist12).toBeCloseTo(dist21, 10);
    });
  });

  describe("getWCAGLevel", () => {
    it("should return AAA for contrast >= 7", () => {
      expect(getWCAGLevel(7)).toBe("AAA");
      expect(getWCAGLevel(10)).toBe("AAA");
      expect(getWCAGLevel(21)).toBe("AAA");
    });

    it("should return AA for contrast >= 4.5 and < 7", () => {
      expect(getWCAGLevel(4.5)).toBe("AA");
      expect(getWCAGLevel(5)).toBe("AA");
      expect(getWCAGLevel(6.9)).toBe("AA");
    });

    it("should return FAIL for contrast < 4.5", () => {
      expect(getWCAGLevel(3)).toBe("FAIL");
      expect(getWCAGLevel(2.5)).toBe("FAIL");
      expect(getWCAGLevel(1)).toBe("FAIL");
    });

    it("should handle boundary values", () => {
      expect(getWCAGLevel(7)).toBe("AAA");
      expect(getWCAGLevel(6.99999)).toBe("AA");
      expect(getWCAGLevel(4.5)).toBe("AA");
      expect(getWCAGLevel(4.49999)).toBe("FAIL");
    });
  });

  describe("calculateHueSpread", () => {
    it("should return 0 for empty array", () => {
      expect(calculateHueSpread([])).toBe(0);
    });

    it("should return 0 for single color", () => {
      expect(calculateHueSpread([{ h: 180 }])).toBe(0);
    });

    it("should calculate spread for two colors", () => {
      const spread = calculateHueSpread([{ h: 0 }, { h: 180 }]);
      expect(spread).toBe(180);
    });

    it("should calculate spread for multiple colors", () => {
      const spread = calculateHueSpread([{ h: 0 }, { h: 120 }, { h: 240 }]);
      expect(spread).toBe(120);
    });

    it("should handle wrap-around (circular nature of hue)", () => {
      // Colors at 350° and 10° - the largest gap is 340° going backwards
      // But the algorithm returns max spread between sorted points
      const spread = calculateHueSpread([{ h: 350 }, { h: 10 }]);
      // The sorted order is [10, 350], spread between them is 340
      // But wrap-around is 360 - 350 + 10 = 20, so max is 340
      expect(spread).toBe(340);
    });

    it("should handle colors across 0°/360° boundary", () => {
      // Colors at 10°, 20°, and 340°
      const spread = calculateHueSpread([{ h: 10 }, { h: 20 }, { h: 340 }]);
      // Sorted: [10, 20, 340]
      // Gaps: 20-10=10, 340-20=320, wrap=360-340+10=30
      // Max spread is 320
      expect(spread).toBe(320);
    });
  });

  describe("generateHueSpectrum", () => {
    it("should generate colors with default steps", () => {
      const spectrum = generateHueSpectrum();
      expect(Array.isArray(spectrum)).toBe(true);
      expect(spectrum.length).toBe(360);
      spectrum.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it("should generate colors with custom steps", () => {
      const spectrum = generateHueSpectrum(12);
      expect(spectrum.length).toBe(12);
      spectrum.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it("should generate different colors for different hues", () => {
      const spectrum = generateHueSpectrum(6);
      // Check that first and second colors are different
      expect(spectrum[0]).not.toBe(spectrum[1]);
      // Check that opposite colors in spectrum are different
      expect(spectrum[0]).not.toBe(spectrum[3]);
    });
  });

  describe("formatOKLCH", () => {
    it("should format OKLCH values correctly", () => {
      const formatted = formatOKLCH(0.5, 0.1, 180);
      expect(formatted).toContain("oklch");
      expect(formatted).toContain("50%");
      expect(formatted).toContain("0.1");
      expect(formatted).toContain("180");
    });

    it("should handle various OKLCH values", () => {
      const testCases = [
        { l: 0.2, c: 0.05, h: 0 },
        { l: 0.5, c: 0.15, h: 180 },
        { l: 0.8, c: 0.2, h: 270 },
      ];

      testCases.forEach(({ l, c, h }) => {
        const formatted = formatOKLCH(l, c, h);
        expect(formatted).toMatch(/oklch\(\d+%\s[\d.]+\s\d+\)/);
      });
    });

    it("should round hue to nearest integer", () => {
      const formatted = formatOKLCH(0.5, 0.1, 179.5);
      expect(formatted).toContain("180");
    });
  });

  describe("getWCAGColor", () => {
    it("should return success color for AAA level", () => {
      expect(getWCAGColor("AAA")).toBe("var(--color-success)");
    });

    it("should return warning color for AA level", () => {
      expect(getWCAGColor("AA")).toBe("var(--color-warning)");
    });

    it("should return error color for FAIL level", () => {
      expect(getWCAGColor("FAIL")).toBe("var(--color-error)");
    });
  });
});
