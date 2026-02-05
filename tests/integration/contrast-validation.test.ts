import { describe, expect, it } from "vitest";
import { APCAcontrast, sRGBtoY } from "../../src/lib/apca-wrapper";
import type { Seed } from "../../src/lib/constraints";
import { derivePalette } from "../../src/lib/palette";
import { generateVSCodeTheme } from "../../src/lib/vscode-theme";

describe("Contrast Validation", () => {
  const testSeed: Seed = {
    id: "ContrastTest",
    displayName: "Contrast Test",
    background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
    accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
  };

  /**
   * Convert hex color to RGB for APCA
   */
  function hexToRgb(hex: string): [number, number, number] {
    const cleaned = hex.replace("#", "").slice(0, 6);
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    return [r, g, b];
  }

  /**
   * Calculate APCA contrast between two hex colors
   */
  function calculateContrast(fg: string, bg: string): number {
    // hexToRgb returns 0-255 ints which sRGBtoY expects
    const fgRgb = hexToRgb(fg) as [number, number, number];
    const bgRgb = hexToRgb(bg) as [number, number, number];

    const fgY = sRGBtoY(fgRgb);
    const bgY = sRGBtoY(bgRgb);

    const contrast = APCAcontrast(fgY, bgY);
    return Math.abs(contrast);
  }

  describe("Editor Contrast", () => {
    it("should have sufficient editor foreground/background contrast", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const fg = theme.colors["editor.foreground"];
      const bg = theme.colors["editor.background"];
      if (!fg || !bg) return;

      const contrast = calculateContrast(fg, bg);

      // APCA Lc 75 minimum for body text
      expect(contrast).toBeGreaterThanOrEqual(75);
    });

    it("should have readable selection contrast", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const selectionBg = theme.colors["editor.selectionBackground"];
      const editorBg = theme.colors["editor.background"];
      if (!selectionBg || !editorBg) return;

      // Selection should be visible against background
      const contrast = calculateContrast(selectionBg, editorBg);
      expect(contrast).toBeGreaterThanOrEqual(15);
    });

    it("should have visible line highlight", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const lineHighlight = theme.colors["editor.lineHighlightBackground"];
      const editorBg = theme.colors["editor.background"];
      if (!lineHighlight || !editorBg) return;

      const contrast = calculateContrast(lineHighlight, editorBg);
      expect(contrast).toBeGreaterThanOrEqual(10);
    });
  });

  describe("UI Element Contrast", () => {
    it("should have readable status bar text", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const fg = theme.colors["statusBar.foreground"];
      const bg = theme.colors["statusBar.background"];
      if (!fg || !bg) return;

      const contrast = calculateContrast(fg, bg);
      expect(contrast).toBeGreaterThanOrEqual(59);
    });

    it("should have readable activity bar text", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const fg = theme.colors["activityBar.foreground"];
      const bg = theme.colors["activityBar.background"];
      if (!fg || !bg) return;

      const contrast = calculateContrast(fg, bg);
      expect(contrast).toBeGreaterThanOrEqual(59);
    });

    it("should have readable sidebar text", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const fg = theme.colors["sideBar.foreground"];
      const bg = theme.colors["sideBar.background"];
      if (!fg || !bg) return;

      const contrast = calculateContrast(fg, bg);
      expect(contrast).toBeGreaterThanOrEqual(59);
    });
  });

  describe("Semantic Color Contrast", () => {
    it("should have visible error messages", () => {
      const palette = derivePalette(testSeed, "Balanced");

      const errorColor = palette.semantic.error;
      const editorBg = palette.bg0;

      const contrast = calculateContrast(errorColor, editorBg);
      expect(contrast).toBeGreaterThanOrEqual(60);
    });

    it("should have visible warning messages", () => {
      const palette = derivePalette(testSeed, "Balanced");

      const warningColor = palette.semantic.warning;
      const editorBg = palette.bg0;

      const contrast = calculateContrast(warningColor, editorBg);
      expect(contrast).toBeGreaterThanOrEqual(60);
    });

    it("should have visible success messages", () => {
      const palette = derivePalette(testSeed, "Balanced");

      const successColor = palette.semantic.success;
      const editorBg = palette.bg0;

      const contrast = calculateContrast(successColor, editorBg);
      expect(contrast).toBeGreaterThanOrEqual(60);
    });
  });

  describe("Terminal Contrast", () => {
    it("should have readable terminal colors", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const terminalColors = [
        "terminal.ansiRed",
        "terminal.ansiGreen",
        "terminal.ansiBlue",
        "terminal.ansiYellow",
        "terminal.ansiCyan",
        "terminal.ansiMagenta",
      ];

      const terminalBg = theme.colors["terminal.background"] || theme.colors["editor.background"];

      for (const colorKey of terminalColors) {
        const color = theme.colors[colorKey];
        const contrast = calculateContrast(color, terminalBg);
        expect(contrast, `${colorKey} should have sufficient contrast`).toBeGreaterThanOrEqual(60);
      }
    });
  });

  describe("Cross-Mode Contrast Consistency", () => {
    it("should maintain consistent contrast across harmony modes", () => {
      const modes = [
        "Balanced",
        "Analogous",
        "Monochromatic",
        "Triadic",
        "SplitComplementary",
      ] as const;

      const contrastResults = modes.map(mode => {
        const palette = derivePalette(testSeed, mode);
        const theme = generateVSCodeTheme(palette);

        return {
          mode,
          editorContrast: calculateContrast(
            theme.colors["editor.foreground"],
            theme.colors["editor.background"]
          ),
        };
      });

      // All modes should meet minimum threshold
      for (const result of contrastResults) {
        expect(
          result.editorContrast,
          `${result.mode} mode should have sufficient editor contrast`
        ).toBeGreaterThanOrEqual(75);
      }
    });
  });
});
