import { describe, expect, it } from "vitest";
import type { Seed } from "../../src/lib/constraints";
import { derivePalette } from "../../src/lib/palette";
import { generateVSCodeTheme } from "../../src/lib/vscode-theme";

describe("Theme Generation Pipeline", () => {
  const testSeed: Seed = {
    id: "IntegrationTest",
    displayName: "Integration Test",
    background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
    accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
  };

  describe("Seed to Palette", () => {
    it("should derive valid palette from seed", () => {
      const palette = derivePalette(testSeed, "Balanced");

      expect(palette.seed).toBe(testSeed);
      expect(palette.mode).toBe("Balanced");
      expect(palette.bg0).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.fg0).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should generate all harmony modes correctly", () => {
      const modes = [
        "Balanced",
        "Analogous",
        "Monochromatic",
        "Triadic",
        "SplitComplementary",
      ] as const;

      for (const mode of modes) {
        const palette = derivePalette(testSeed, mode);

        expect(palette.mode).toBe(mode);
        expect(palette.hueRed).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.hueGreen).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.hueBlue).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.semantic.error).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.semantic.warning).toMatch(/^#[0-9a-f]{6}$/i);
        expect(palette.semantic.success).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe("Palette to Theme", () => {
    it("should generate valid VSCode theme from palette", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      expect(theme.name).toBe("Caligo (Integration Test)");
      expect(theme.type).toBe("dark");
      expect(theme.colors).toBeDefined();
      expect(theme.tokenColors).toBeDefined();
      expect(theme.semanticHighlighting).toBe(true);
    });

    it("should include all required color properties", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      // Editor colors
      expect(theme.colors["editor.background"]).toBeDefined();
      expect(theme.colors["editor.foreground"]).toBeDefined();
      expect(theme.colors["editor.lineHighlightBackground"]).toBeDefined();
      expect(theme.colors["editor.selectionBackground"]).toBeDefined();

      // UI colors
      expect(theme.colors["activityBar.background"]).toBeDefined();
      expect(theme.colors["statusBar.background"]).toBeDefined();
      expect(theme.colors["titleBar.activeBackground"]).toBeDefined();

      // Terminal colors
      expect(theme.colors["terminal.ansiRed"]).toBeDefined();
      expect(theme.colors["terminal.ansiGreen"]).toBeDefined();
      expect(theme.colors["terminal.ansiBlue"]).toBeDefined();
    });

    it("should map semantic tokens correctly", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      expect(theme.semanticTokenColors).toBeDefined();
      expect(theme.semanticTokenColors?.variable).toBeDefined();
      expect(theme.semanticTokenColors?.function).toBeDefined();
      expect(theme.semanticTokenColors?.class).toBeDefined();
    });
  });

  describe("End-to-End Pipeline", () => {
    it("should complete full pipeline: seed → palette → theme", () => {
      // Step 1: Derive palette
      const palette = derivePalette(testSeed, "Triadic");
      expect(palette.mode).toBe("Triadic");

      // Step 2: Generate theme
      const theme = generateVSCodeTheme(palette);
      expect(theme.name).toContain("Triadic");
      expect(theme.type).toBe("dark");

      // Step 3: Validate theme structure
      expect(Object.keys(theme.colors).length).toBeGreaterThan(50);
      expect(theme.tokenColors.length).toBeGreaterThan(8);
      expect(theme.semanticTokenColors).toBeDefined();
    });

    it("should generate distinct themes for different harmony modes", () => {
      const balanced = generateVSCodeTheme(derivePalette(testSeed, "Balanced"));
      const analogous = generateVSCodeTheme(derivePalette(testSeed, "Analogous"));
      const triadic = generateVSCodeTheme(derivePalette(testSeed, "Triadic"));

      expect(balanced.name).not.toBe(analogous.name);
      expect(balanced.name).not.toBe(triadic.name);
      expect(analogous.name).not.toBe(triadic.name);
    });
  });
});
