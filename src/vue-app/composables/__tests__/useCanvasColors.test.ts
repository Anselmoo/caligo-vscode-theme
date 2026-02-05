import { describe, expect, it, vi } from "vitest";
import { darken, hexToRgba, lighten, oklchToHex, useCanvasColors } from "../useCanvasColors";

// Mock useTheme
vi.mock("../useTheme", () => ({
  useTheme: () => ({
    currentTheme: {
      value: {
        colors: {
          bg0: "#0b0c10",
          bg1: "#1a1d23",
          bg2: "#2a2d33",
          fg0: "#e6e6e6",
          fg1: "#b3b3b3",
          fgMuted: "#808080",
          accent: "#5eb3f6",
          error: "#ff5555",
          keywords: "#ff9500",
          types: "#55ff55",
          functions: "#55aaff",
          strings: "#ffaa00",
          decorator: "#ff5555",
        },
      },
    },
  }),
}));

describe("useCanvasColors", () => {
  describe("hexToRgba", () => {
    it("should convert hex to rgba", () => {
      const result = hexToRgba("#ff5555");
      expect(result).toBe("rgba(255, 85, 85, 1)");
    });

    it("should handle alpha channel", () => {
      const result = hexToRgba("#ff5555", 0.5);
      expect(result).toBe("rgba(255, 85, 85, 0.5)");
    });

    it("should handle hex without hash", () => {
      const result = hexToRgba("ff5555");
      expect(result).toBe("rgba(255, 85, 85, 1)");
    });
  });

  describe("oklchToHex", () => {
    it("should convert OKLCH to hex", () => {
      const result = oklchToHex(0.5, 0.1, 180);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe("lighten", () => {
    it("should make color lighter", () => {
      const result = lighten("#808080", 0.1);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      // Result should be different from input
      expect(result).not.toBe("#808080");
    });
  });

  describe("darken", () => {
    it("should make color darker", () => {
      const result = darken("#808080", 0.1);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      // Result should be different from input
      expect(result).not.toBe("#808080");
    });
  });

  describe("useCanvasColors composable", () => {
    it("should provide background colors", () => {
      const { backgrounds } = useCanvasColors();

      expect(backgrounds.value.bg0).toBe("#0b0c10");
      expect(backgrounds.value.bg1).toBe("#1a1d23");
    });

    it("should provide foreground colors", () => {
      const { foregrounds } = useCanvasColors();

      expect(foregrounds.value.fg0).toBe("#e6e6e6");
      expect(foregrounds.value.fgMuted).toBe("#808080");
    });

    it("should provide accent colors", () => {
      const { accents } = useCanvasColors();

      expect(accents.value.accent).toBe("#5eb3f6");
      expect(accents.value.keywords).toBe("#ff9500");
    });

    it("should provide all colors", () => {
      const { all } = useCanvasColors();

      expect(all.value.bg0).toBeDefined();
      expect(all.value.fg0).toBeDefined();
      expect(all.value.accent).toBeDefined();
    });
  });
});
