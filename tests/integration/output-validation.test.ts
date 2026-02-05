import { describe, expect, it } from "vitest";
import type { Seed } from "../../src/lib/constraints";
import { derivePalette } from "../../src/lib/palette";
import { generateVSCodeTheme } from "../../src/lib/vscode-theme";

describe("Theme Output Validation", () => {
  const testSeed: Seed = {
    id: "ValidationTest",
    displayName: "Validation Test",
    background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
    accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
  };

  describe("JSON Structure", () => {
    it("should produce valid JSON-serializable theme", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      // Should not throw when serializing
      expect(() => JSON.stringify(theme)).not.toThrow();

      // Should deserialize correctly
      const serialized = JSON.stringify(theme);
      const deserialized = JSON.parse(serialized);
      expect(deserialized.name).toBe(theme.name);
      expect(deserialized.type).toBe(theme.type);
    });

    it("should have no undefined or null values in required fields", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      expect(theme.name).toBeDefined();
      expect(theme.type).toBeDefined();
      expect(theme.colors).toBeDefined();
      expect(theme.tokenColors).toBeDefined();

      // Check no undefined in colors object
      for (const [, value] of Object.entries(theme.colors)) {
        expect(value).toBeDefined();
        expect(value).not.toBeNull();
        expect(typeof value).toBe("string");
      }
    });
  });

  describe("Color Format Validation", () => {
    it("should use only valid hex color codes", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      // Regex for #RRGGBB or #RRGGBBAA
      const hexPattern = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

      for (const [key, value] of Object.entries(theme.colors)) {
        // key is used here for descriptive failure messages
        expect(value, `Color ${key} should be valid hex`).toMatch(hexPattern);
      }
    });

    it("should not contain pure black (#000000)", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      for (const [key, value] of Object.entries(theme.colors)) {
        // Check 6-digit hex (without alpha)
        const colorValue = value.slice(0, 7).toLowerCase();
        expect(colorValue, `Color ${key} should not be pure black`).not.toBe("#000000");
      }
    });
  });

  describe("Theme Properties", () => {
    it("should include all VSCode required properties", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const requiredProps = [
        "name",
        "type",
        "colors",
        "tokenColors",
        "semanticHighlighting",
        "semanticTokenColors",
      ];

      for (const prop of requiredProps) {
        expect(theme).toHaveProperty(prop);
      }
    });

    it("should have dark theme type", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      expect(theme.type).toBe("dark");
    });

    it("should enable semantic highlighting", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      expect(theme.semanticHighlighting).toBe(true);
    });
  });

  describe("Token Colors", () => {
    it("should have token colors array with scopes", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      expect(Array.isArray(theme.tokenColors)).toBe(true);
      expect(theme.tokenColors.length).toBeGreaterThan(0);

      for (const token of theme.tokenColors) {
        expect(token).toHaveProperty("settings");
        expect(token.settings).toHaveProperty("foreground");
      }
    });

    it("should cover common language scopes", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const scopePatterns = ["comment", "string", "keyword", "variable", "function", "constant"];

      const allScopes = theme.tokenColors
        .flatMap(token => (Array.isArray(token.scope) ? token.scope : [token.scope]))
        .filter(Boolean);

      for (const pattern of scopePatterns) {
        const found = allScopes.some(scope => scope?.includes(pattern));
        expect(found, `Should have scope pattern containing "${pattern}"`).toBe(true);
      }
    });
  });

  describe("Semantic Token Colors", () => {
    it("should define semantic token colors", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      expect(theme.semanticTokenColors).toBeDefined();
      expect(typeof theme.semanticTokenColors).toBe("object");
    });

    it("should include common semantic token types", () => {
      const palette = derivePalette(testSeed, "Balanced");
      const theme = generateVSCodeTheme(palette);

      const commonTokens = ["variable", "function", "class", "interface"];

      for (const token of commonTokens) {
        expect(
          theme.semanticTokenColors,
          `Should have semantic token for "${token}"`
        ).toHaveProperty(token);
      }
    });
  });
});
