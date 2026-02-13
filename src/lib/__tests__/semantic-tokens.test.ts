import { describe, expect, it } from "vitest";
import type { Seed } from "../constraints.js";
import { derivePalette } from "../palette.js";
import { deriveSemanticTokenColors } from "../semantic-tokens.js";

describe("deriveSemanticTokenColors", () => {
  const testSeed: Seed = {
    id: "test-seed",
    displayName: "Test Seed",
    background: { mode: "oklch", l: 0.18, c: 0.035, h: 285 },
    accent: { mode: "oklch", l: 0.68, c: 0.16, h: 250 },
  };

  it("should generate semantic token colors from palette", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens).toBeTruthy();
    expect(typeof tokens).toBe("object");
  });

  it("should map type constructs to harmony.types", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens.class).toBe(palette.harmony.types);
    expect(tokens.interface).toBe(palette.harmony.types);
    expect(tokens.type).toBe(palette.harmony.types);
    expect(tokens.enum).toBe(palette.harmony.types);
  });

  it("should map functions to harmony.functions", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens.function).toBe(palette.harmony.functions);
    expect(tokens.method).toBe(palette.harmony.functions);
  });

  it("should map variables to harmony.variables", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens.variable).toBe(palette.harmony.variables);
    expect(tokens.parameter).toBe(palette.harmony.variables);
  });

  it("should map events and labels", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens.event).toBe(palette.harmony.constants);
    expect(tokens.label).toBe(palette.harmony.keywords);
  });

  it("should map readonly variables to harmony.constants", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens["variable.readonly"]).toBe(palette.harmony.constants);
  });

  it("should map strings and numbers to harmony colors", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens.string).toBe(palette.harmony.strings);
    expect(tokens.number).toBe(palette.harmony.numbers);
  });

  it("should apply italic fontStyle to comments", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(typeof tokens.comment).toBe("object");
    expect((tokens.comment as { fontStyle?: string }).fontStyle).toBe("italic");
  });

  it("should apply bold to variable.defaultLibrary", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(typeof tokens["variable.defaultLibrary"]).toBe("object");
    expect((tokens["variable.defaultLibrary"] as { fontStyle?: string }).fontStyle).toBe("bold");
  });

  it("should apply strikethrough to deprecated tokens", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(typeof tokens["*.deprecated"]).toBe("object");
    const style = (tokens["*.deprecated"] as { fontStyle?: string }).fontStyle;
    expect(style?.includes("italic")).toBe(true);
    expect(style?.includes("strikethrough")).toBe(true);
  });

  it("should apply modifier styles for static and abstract tokens", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect((tokens["*.static"] as { fontStyle?: string }).fontStyle).toBe("underline");
    expect((tokens["*.abstract"] as { fontStyle?: string }).fontStyle).toBe("italic");
    expect((tokens["*.modification"] as { foreground?: string }).foreground).toBe(
      palette.harmony.variables
    );
    expect((tokens["*.definition"] as { fontStyle?: string }).fontStyle).toBe("bold");
    expect((tokens["*.readonly"] as { fontStyle?: string }).fontStyle).toBe("underline");
    expect((tokens["*.async"] as { fontStyle?: string }).fontStyle).toBe("italic");
    expect((tokens["*.defaultLibrary"] as { fontStyle?: string }).fontStyle).toBe("bold");
  });

  it("should include language-specific overrides", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens["variable:typescript"]).toBe(palette.harmony.variables);
    expect(tokens["property:css"]).toBe(palette.harmony.attributes);
    expect((tokens["function.defaultLibrary"] as { fontStyle?: string }).fontStyle).toBe("bold");
    expect((tokens["parameter:python"] as { fontStyle?: string }).fontStyle).toBe("italic");
    expect(
      (tokens["variable.readonly.defaultLibrary:typescript"] as { fontStyle?: string }).fontStyle
    ).toBe("bold underline");
  });

  it("should include definition and compound modifier coverage", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    expect(tokens["function.definition"]).toBe(palette.harmony.functions);
    expect(tokens["method.definition"]).toBe(palette.harmony.functions);
    expect(tokens["variable.definition"]).toBe(palette.harmony.variables);
    expect(tokens["property.definition"]).toBe(palette.fg0);
    expect(typeof tokens["variable.readonly.defaultLibrary"]).toBe("object");
    expect(typeof tokens["property.readonly.defaultLibrary"]).toBe("object");
    expect(tokens.modifier).toBe(palette.harmony.keywords);
  });

  it("should use different colors for triadic harmony mode", () => {
    const triadicSeed: Seed = {
      ...testSeed,
      harmony: "triadic",
    };

    const basePalette = derivePalette(testSeed, "Balanced");
    const triadicPalette = derivePalette(triadicSeed, "Balanced");

    const baseTokens = deriveSemanticTokenColors(basePalette);
    const triadicTokens = deriveSemanticTokenColors(triadicPalette);

    // Keywords should differ between harmony modes
    expect(baseTokens.keyword).not.toBe(triadicTokens.keyword);
    // Types should also differ
    expect(baseTokens.type).not.toBe(triadicTokens.type);
  });

  it("should return all hex colors as strings", () => {
    const palette = derivePalette(testSeed, "Balanced");
    const tokens = deriveSemanticTokenColors(palette);

    // Check that all string values are valid hex colors
    const hexRegex = /^#[0-9a-f]{6}$/i;
    for (const [key, value] of Object.entries(tokens)) {
      if (typeof value === "string") {
        expect(hexRegex.test(value), `${key} should be a valid hex color, got ${value}`).toBe(true);
      } else if (typeof value === "object" && value.foreground) {
        expect(
          hexRegex.test(value.foreground),
          `${key}.foreground should be a valid hex color, got ${value.foreground}`
        ).toBe(true);
      }
    }
  });
});
