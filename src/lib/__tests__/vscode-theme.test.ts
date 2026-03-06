import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import type { Seed } from "../constraints.js";
import { wcagContrastRatio } from "../contrast.js";
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

  it("should produce WCAG AA contrast (≥4.5) for button foreground against button background", () => {
    // Dark-theme seed with a bright accent (worst case: light accent on dark bg)
    const brightAccentSeed: Seed = {
      id: "BrightAccent",
      displayName: "Bright Accent",
      background: { mode: "oklch", l: 0.18, c: 0.02, h: 220 },
      accent: { mode: "oklch", l: 0.82, c: 0.18, h: 90 }, // bright lime-yellow accent
    };

    const palette = derivePalette(brightAccentSeed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    const btnBg = theme.colors["button.background"];
    const btnFg = theme.colors["button.foreground"];
    const contrast = wcagContrastRatio(btnFg, btnBg);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it("should always pick the higher-contrast foreground option for the primary button", () => {
    // Mid-range accent: neither pure-light nor pure-dark may reach 4.5, but we
    // must always choose whichever option gives the better ratio.
    const seed: Seed = {
      id: "MidAccent",
      displayName: "Mid Accent",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.55, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    const btnBg = theme.colors["button.background"];
    const btnFg = theme.colors["button.foreground"];

    const contrastWithLight = wcagContrastRatio(palette.fg0, btnBg);
    const contrastWithDark = wcagContrastRatio(palette.bg0, btnBg);
    const chosenContrast = wcagContrastRatio(btnFg, btnBg);

    // The chosen foreground must be at least as good as the better-of-two options.
    // A tiny epsilon accounts for floating-point rounding in hex conversion.
    const CONTRAST_EPSILON = 0.01;
    expect(chosenContrast).toBeGreaterThanOrEqual(
      Math.max(contrastWithLight, contrastWithDark) - CONTRAST_EPSILON
    );
  });

  it("should produce WCAG AA contrast (≥4.5) for secondary button foreground against secondary button background", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");
    const theme = buildVscodeThemeJson(palette);

    const secBg = theme.colors["button.secondaryBackground"];
    const secFg = theme.colors["button.secondaryForeground"];
    const contrast = wcagContrastRatio(secFg, secBg);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
