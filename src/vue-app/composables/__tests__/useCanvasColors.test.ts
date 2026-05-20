import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  adjustChroma,
  darken,
  hexToOklch,
  hexToRgba,
  lighten,
  oklchToHex,
  oklchToRgba,
  rgbaFromVar,
  useCanvasColors,
} from "../useCanvasColors";

const mockThemeColors = {
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
};

const mockCurrentTheme = ref<{ colors: typeof mockThemeColors } | null>({
  colors: mockThemeColors,
});

vi.mock("../useTheme", () => ({
  useTheme: () => ({ currentTheme: mockCurrentTheme }),
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

    it("throws when theme is not loaded — backgrounds", () => {
      mockCurrentTheme.value = null;
      const { backgrounds } = useCanvasColors();
      expect(() => backgrounds.value).toThrow("useCanvasColors: Theme is not loaded");
      mockCurrentTheme.value = { colors: mockThemeColors };
    });

    it("throws when theme is not loaded — foregrounds", () => {
      mockCurrentTheme.value = null;
      const { foregrounds } = useCanvasColors();
      expect(() => foregrounds.value).toThrow("useCanvasColors: Theme is not loaded");
      mockCurrentTheme.value = { colors: mockThemeColors };
    });

    it("throws when theme is not loaded — accents", () => {
      mockCurrentTheme.value = null;
      const { accents } = useCanvasColors();
      expect(() => accents.value).toThrow("useCanvasColors: Theme is not loaded");
      mockCurrentTheme.value = { colors: mockThemeColors };
    });
  });

  describe("oklchToRgba", () => {
    it("converts OKLCH to rgba string", () => {
      const result = oklchToRgba(0.5, 0.1, 180);
      expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*1\)$/);
    });

    it("respects alpha parameter", () => {
      const result = oklchToRgba(0.5, 0.1, 180, 0.5);
      expect(result).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.5\)$/);
    });
  });

  describe("hexToOklch", () => {
    it("converts hex to OKLCH object", () => {
      const result = hexToOklch("#5eb3f6");
      expect(result).not.toBeNull();
      expect(result?.mode).toBe("oklch");
      expect(typeof result?.l).toBe("number");
    });

    it("returns null for invalid hex", () => {
      const result = hexToOklch("notvalid");
      expect(result).toBeNull();
    });
  });

  describe("adjustChroma", () => {
    it("increases chroma of a color", () => {
      const original = oklchToHex(0.5, 0.1, 180);
      const adjusted = adjustChroma(original, 0.05);
      expect(adjusted).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("decreases chroma of a color", () => {
      const original = oklchToHex(0.5, 0.1, 180);
      const adjusted = adjustChroma(original, -0.05);
      expect(adjusted).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("returns original hex for invalid input", () => {
      const result = adjustChroma("notvalid", 0.05);
      expect(result).toBe("notvalid");
    });
  });

  describe("rgbaFromVar", () => {
    it("converts a CSS variable with hex value to rgba", () => {
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        getPropertyValue: () => "#5eb3f6",
      } as unknown as CSSStyleDeclaration);
      const result = rgbaFromVar("--accent");
      expect(result).toMatch(/^rgba\(/);
      vi.restoreAllMocks();
    });

    it("handles CSS variable with comma-separated RGB components", () => {
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        getPropertyValue: () => "94, 179, 246",
      } as unknown as CSSStyleDeclaration);
      const result = rgbaFromVar("--accent", 0.5);
      expect(result).toBe("rgba(94, 179, 246, 0.5)");
      vi.restoreAllMocks();
    });

    it("throws when CSS variable is not set", () => {
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        getPropertyValue: () => "",
      } as unknown as CSSStyleDeclaration);
      expect(() => rgbaFromVar("--missing-var")).toThrow("CSS variable --missing-var is not set");
      vi.restoreAllMocks();
    });
  });
});
