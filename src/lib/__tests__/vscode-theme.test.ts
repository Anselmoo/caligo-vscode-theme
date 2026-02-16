import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import type { Seed } from "../constraints.js";
import { derivePalette } from "../palette.js";
import { buildVscodeThemeJson } from "../vscode-theme.js";

describe("buildVscodeThemeJson", () => {
  it("should build a valid VS Code theme JSON", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    // Check basic structure
    expect(theme.$schema).toBe("vscode://schemas/color-theme");
    expect(theme.name.includes("Caligo")).toBe(true);
    expect(theme.name.includes("Test Seed")).toBe(true);
    // "Balanced" is the default mode and is intentionally omitted from the name.
    expect(theme.type).toBe("dark");

    // Check colors object exists and has required keys
    expect(theme.colors).toBeTruthy();
    expect(theme.colors["editor.background"]).toBeTruthy();
    expect(theme.colors["editor.foreground"]).toBeTruthy();
    expect(theme.colors["sideBar.background"]).toBeTruthy();
    expect(theme.colors["activityBar.background"]).toBeTruthy();
    expect(theme.colors["statusBar.background"]).toBeTruthy();

    // Check tokenColors array exists and has entries
    expect(theme.tokenColors).toBeTruthy();
    expect(Array.isArray(theme.tokenColors)).toBe(true);
    expect(theme.tokenColors.length).toBeGreaterThan(0);
  });

  it("should map palette colors to editor colors", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    // Verify specific mappings
    expect(theme.colors["editor.background"]).toBe(palette.bg0);
    expect(theme.colors["editor.foreground"]).toBe(palette.fg0);
    expect(theme.colors.focusBorder).toBe(palette.accent);
  });

  it("should include token color scopes", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    const scopes = theme.tokenColors.map(tc => tc.name).filter(Boolean);

    expect(scopes.includes("Comments")).toBe(true);
    expect(scopes.includes("Strings")).toBe(true);
    expect(scopes.includes("Keywords")).toBe(true);
    expect(scopes.includes("Functions")).toBe(true);
    expect(scopes.includes("Types")).toBe(true);
    expect(scopes.includes("Tags")).toBe(true);
    expect(scopes.includes("Attributes")).toBe(true);
    expect(scopes.includes("Function Parameters")).toBe(true);
    expect(scopes.includes("Markup Headings")).toBe(true);
    expect(scopes.includes("Invalid")).toBe(true);
  });

  it("should style variables and parameters distinctly", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    const variables = theme.tokenColors.find(tc => tc.name === "Variables");
    const parameters = theme.tokenColors.find(tc => tc.name === "Function Parameters");

    expect((variables?.settings as { foreground?: string })?.foreground).toBe(
      palette.harmony.variables
    );
    expect((parameters?.settings as { fontStyle?: string })?.fontStyle).toBe("italic");
    expect((parameters?.settings as { foreground?: string })?.foreground).toBe(
      palette.harmony.variables
    );
  });

  it("should use hex color format for all colors", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    // Check all color values are hex format (with or without alpha)
    const hexPattern = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

    for (const [_key, value] of Object.entries(theme.colors)) {
      if (typeof value === "string") {
        assert.match(value, hexPattern);
      }
    }
  });

  it("should enforce schema-safe theme keys and token settings", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    expect(theme.colors["editorInlayHint.parameterBackground"]).toBeTruthy();
    expect(theme.colors["editorInlayHint.parameterForeground"]).toBeTruthy();
    expect(theme.colors["editorInlayHint.paramBackground"]).toBeUndefined();
    expect(theme.colors["editorInlayHint.paramForeground"]).toBeUndefined();

    for (const token of theme.tokenColors) {
      expect((token.settings as { background?: string }).background).toBeUndefined();
    }

    const requiredColorIds = [
      "disabledForeground",
      "icon.foreground",
      "widget.shadow",
      "selection.background",
      "sash.hoverBorder",
      "statusBar.border",
      "activityBar.activeBorder",
      "sideBar.border",
      "editorStickyScroll.background",
      "editorStickyScroll.border",
      "editorStickyScroll.shadow",
      "editorStickyScrollGutter.background",
      "editorStickyScrollHover.background",
      "editorBracketPairGuide.activeBackground1",
      "editorBracketPairGuide.activeBackground2",
      "editorBracketPairGuide.activeBackground3",
      "editorBracketPairGuide.activeBackground4",
      "editorBracketPairGuide.activeBackground5",
      "editorBracketPairGuide.activeBackground6",
      "editorBracketPairGuide.background1",
      "editorBracketPairGuide.background2",
      "editorBracketPairGuide.background3",
      "editorBracketPairGuide.background4",
      "editorBracketPairGuide.background5",
      "editorBracketPairGuide.background6",
      "terminal.findMatchBackground",
      "terminal.findMatchBorder",
      "terminal.findMatchHighlightBackground",
      "terminal.findMatchHighlightBorder",
      "list.focusOutline",
      "list.focusAndSelectionOutline",
    ];

    for (const colorId of requiredColorIds) {
      expect(theme.colors[colorId], `Missing color ID ${colorId}`).toBeTruthy();
    }
  });
});
