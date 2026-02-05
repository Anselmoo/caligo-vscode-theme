/**
 * Tests for svg-utils.ts
 * Comprehensive coverage for SVG visualization utilities
 */

import { describe, expect, it } from "vitest";
import type { ThemeOKLCH } from "../../types/theme.js";
import {
  calculateContrast,
  describeArc,
  getWCAGColor,
  getWCAGLevel,
  hueToPoint,
  oklchToRgb,
  polarToCartesian,
} from "../svg-utils.js";

describe("svg-utils", () => {
  describe("oklchToRgb", () => {
    it("should convert OKLCH to hex color string", () => {
      const oklch: ThemeOKLCH = { l: 0.5, c: 0.1, h: 0 };
      const result = oklchToRgb(oklch);
      // Should be a hex color string
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should handle various OKLCH values", () => {
      const testCases: ThemeOKLCH[] = [
        { l: 0.2, c: 0.05, h: 0 },
        { l: 0.5, c: 0.15, h: 180 },
        { l: 0.8, c: 0.2, h: 270 },
      ];

      testCases.forEach(oklch => {
        const result = oklchToRgb(oklch);
        expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe("hueToPoint", () => {
    it("should calculate point at 0 degrees", () => {
      const result = hueToPoint(0, 100, 0, 0);
      expect(result.x).toBeCloseTo(100, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });

    it("should calculate point at 90 degrees", () => {
      const result = hueToPoint(90, 100, 0, 0);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(100, 5);
    });

    it("should calculate point at 180 degrees", () => {
      const result = hueToPoint(180, 100, 0, 0);
      expect(result.x).toBeCloseTo(-100, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });

    it("should calculate point at 270 degrees", () => {
      const result = hueToPoint(270, 100, 0, 0);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(-100, 5);
    });

    it("should respect center coordinates", () => {
      const result = hueToPoint(0, 50, 100, 200);
      expect(result.x).toBeCloseTo(150, 5);
      expect(result.y).toBeCloseTo(200, 5);
    });

    it("should handle different radii", () => {
      const result1 = hueToPoint(0, 50, 0, 0);
      const result2 = hueToPoint(0, 100, 0, 0);
      expect(result2.x).toBeCloseTo(result1.x * 2, 5);
      expect(result2.y).toBeCloseTo(result1.y * 2, 5);
    });
  });

  describe("calculateContrast", () => {
    it("should calculate contrast between two OKLCH colors", () => {
      const color1: ThemeOKLCH = { l: 0.1, c: 0.05, h: 0 };
      const color2: ThemeOKLCH = { l: 0.9, c: 0.05, h: 0 };
      const contrast = calculateContrast(color1, color2);

      // Should be a positive number (WCAG contrast ratio)
      expect(typeof contrast).toBe("number");
      expect(contrast).toBeGreaterThan(1);
      expect(contrast).toBeLessThanOrEqual(21);
    });

    it("should return higher contrast for more different colors", () => {
      const darkColor: ThemeOKLCH = { l: 0.1, c: 0.05, h: 0 };
      const lightColor: ThemeOKLCH = { l: 0.9, c: 0.05, h: 0 };
      const midColor: ThemeOKLCH = { l: 0.5, c: 0.05, h: 0 };

      const contrastDarkLight = calculateContrast(darkColor, lightColor);
      const contrastDarkMid = calculateContrast(darkColor, midColor);

      // Dark to light should have higher contrast than dark to mid
      expect(contrastDarkLight).toBeGreaterThan(contrastDarkMid);
    });

    it("should return 1 for same color", () => {
      const color: ThemeOKLCH = { l: 0.5, c: 0.1, h: 180 };
      const contrast = calculateContrast(color, color);
      expect(contrast).toBeCloseTo(1, 1);
    });
  });

  describe("describeArc", () => {
    it("should generate SVG arc path", () => {
      const path = describeArc(0, 0, 100, 0, 90);
      expect(typeof path).toBe("string");
      // Should contain SVG commands: M (move), A (arc)
      expect(path).toContain("M");
      expect(path).toContain("A");
    });

    it("should generate different paths for different angles", () => {
      const path1 = describeArc(0, 0, 100, 0, 90);
      const path2 = describeArc(0, 0, 100, 0, 180);
      expect(path1).not.toBe(path2);
    });

    it("should set largeArcFlag correctly for angles > 180", () => {
      // Small arc (< 180 degrees)
      const smallArc = describeArc(0, 0, 100, 0, 90);
      // The path format is: "M x y A rx ry xAxisRotation largeArcFlag sweepFlag ex ey"
      // Elements are space-separated
      const smallArcParts = smallArc.split(" ");
      const smallLargeArcFlag = smallArcParts[7]; // The 7th element after split is the largeArcFlag

      // Large arc (> 180 degrees)
      const largeArc = describeArc(0, 0, 100, 0, 270);
      const largeArcParts = largeArc.split(" ");
      const largeLargeArcFlag = largeArcParts[7];

      // Small arc should have 0, large arc should have 1
      expect(smallLargeArcFlag).toBe("0");
      expect(largeLargeArcFlag).toBe("1");
    });

    it("should respect center coordinates", () => {
      const path1 = describeArc(0, 0, 100, 0, 90);
      const path2 = describeArc(100, 100, 100, 0, 90);
      expect(path1).not.toBe(path2);
    });
  });

  describe("polarToCartesian", () => {
    it("should convert polar coordinates to cartesian", () => {
      // Note: angleInDegrees is offset by -90, so 0° starts at rightmost point
      const result = polarToCartesian(0, 0, 100, 90);
      expect(result.x).toBeCloseTo(100, 2);
      expect(result.y).toBeCloseTo(0, 2);
    });

    it("should handle 90 degree angle", () => {
      // 90° - 90 = 0°, which is rightmost, but we're testing 90°
      const result = polarToCartesian(0, 0, 100, 180);
      expect(result.x).toBeCloseTo(0, 2);
      expect(result.y).toBeCloseTo(100, 2);
    });

    it("should handle 180 degree angle", () => {
      const result = polarToCartesian(0, 0, 100, 270);
      expect(result.x).toBeCloseTo(-100, 2);
      expect(result.y).toBeCloseTo(0, 2);
    });

    it("should handle 270 degree angle", () => {
      const result = polarToCartesian(0, 0, 100, 0);
      expect(result.x).toBeCloseTo(0, 2);
      expect(result.y).toBeCloseTo(-100, 2);
    });

    it("should respect center coordinates", () => {
      const result = polarToCartesian(50, 50, 100, 90);
      expect(result.x).toBeCloseTo(150, 2);
      expect(result.y).toBeCloseTo(50, 2);
    });

    it("should handle various radii", () => {
      const result50 = polarToCartesian(0, 0, 50, 90);
      const result100 = polarToCartesian(0, 0, 100, 90);
      expect(result100.x).toBeCloseTo(result50.x * 2, 2);
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

    it("should return AA Large for contrast >= 3 and < 4.5", () => {
      expect(getWCAGLevel(3)).toBe("AA Large");
      expect(getWCAGLevel(3.5)).toBe("AA Large");
      expect(getWCAGLevel(4.4)).toBe("AA Large");
    });

    it("should return Fail for contrast < 3", () => {
      expect(getWCAGLevel(2.9)).toBe("Fail");
      expect(getWCAGLevel(1)).toBe("Fail");
      expect(getWCAGLevel(0.5)).toBe("Fail");
    });

    it("should handle boundary values", () => {
      expect(getWCAGLevel(7)).toBe("AAA");
      expect(getWCAGLevel(6.99)).toBe("AA");
      expect(getWCAGLevel(4.5)).toBe("AA");
      expect(getWCAGLevel(4.49)).toBe("AA Large");
      expect(getWCAGLevel(3)).toBe("AA Large");
      expect(getWCAGLevel(2.99)).toBe("Fail");
    });
  });

  describe("getWCAGColor", () => {
    it("should return success color for AAA level", () => {
      expect(getWCAGColor("AAA")).toBe("var(--color-success)");
    });

    it("should return warning color for AA level", () => {
      expect(getWCAGColor("AA")).toBe("var(--color-warning)");
    });

    it("should return warning color for AA Large level", () => {
      expect(getWCAGColor("AA Large")).toBe("var(--color-warning)");
    });

    it("should return error color for Fail level", () => {
      expect(getWCAGColor("Fail")).toBe("var(--color-error)");
    });

    it("should return error color for unknown level", () => {
      expect(getWCAGColor("Unknown")).toBe("var(--color-error)");
      expect(getWCAGColor("")).toBe("var(--color-error)");
    });
  });
});
