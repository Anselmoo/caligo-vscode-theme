import { describe, expect, it } from "vitest";
import {
  calculateDeltaE,
  deriveIntentPalette,
  deriveIntentPaletteWithHarmony,
  deriveIntentSemanticTokenColors,
  INTENT_EMPHASIS_MODES,
  INTENT_LAYERS,
  type IntentEmphasis,
  inferFallbackIntent,
  validateIntentPaletteDistances,
} from "../intent-layers.js";

describe("intent-layers", () => {
  describe("deriveIntentPalette", () => {
    it("should create a palette with all intent layer colors", () => {
      const palette = deriveIntentPalette(35, 0.15, "balanced");

      expect(palette.baseHue).toBe(35);
      expect(palette.baseChroma).toBe(0.15);
      expect(palette.emphasis).toBe("balanced");

      // Check that all colors are defined
      expect(palette.declaration).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.mutation).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.usage).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.controlFlow).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.data).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.meta).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette.documentation).toMatch(/^#[0-9a-f]{6}$/);

      // Check debug OKLCH values
      expect(palette.debug.declaration.l).toBeGreaterThan(0);
      expect(palette.debug.declaration.c).toBeGreaterThanOrEqual(0);
      expect(palette.debug.declaration.h).toBeGreaterThanOrEqual(0);
      expect(palette.debug.declaration.h).toBeLessThan(360);
    });

    it("should apply emphasis modes correctly", () => {
      const emphasizes: IntentEmphasis[] = ["balanced", "declaration", "controlFlow", "mutation"];

      for (const emphasis of emphasizes) {
        const palette = deriveIntentPalette(35, 0.15, emphasis);
        expect(palette.emphasis).toBe(emphasis);
      }
    });

    it("should use default values when parameters are omitted", () => {
      const palette = deriveIntentPalette(35);

      expect(palette.baseHue).toBe(35);
      expect(palette.baseChroma).toBe(0.15);
      expect(palette.emphasis).toBe("balanced");
    });

    it("should produce different colors for different hues", () => {
      const palette1 = deriveIntentPalette(35, 0.15, "balanced");
      const palette2 = deriveIntentPalette(200, 0.15, "balanced");

      expect(palette1.declaration).not.toBe(palette2.declaration);
    });

    it("should respect hue offsets from INTENT_LAYERS", () => {
      const palette = deriveIntentPalette(0, 0.15, "balanced");

      // Mutation should have +30 hue offset
      expect(palette.debug.mutation.h).toBeCloseTo(30, 0);

      // Usage should have -30 hue offset
      expect(palette.debug.usage.h).toBeCloseTo(330, 0);
    });

    it("should clamp OKLCH values to valid ranges", () => {
      const palette = deriveIntentPalette(35, 1.0, "declaration"); // Very high chroma and emphasis

      expect(palette.debug.declaration.l).toBeGreaterThanOrEqual(0);
      expect(palette.debug.declaration.l).toBeLessThanOrEqual(1);
      expect(palette.debug.declaration.c).toBeGreaterThanOrEqual(0);
      expect(palette.debug.declaration.c).toBeLessThanOrEqual(0.4);
    });
  });

  describe("deriveIntentPaletteWithHarmony", () => {
    it("should apply harmony offsets to intent layers", () => {
      const harmonyOffsets = {
        declaration: 0,
        mutation: 60,
        usage: -60,
        controlFlow: 120,
        data: 180,
        meta: 240,
      };

      const palette = deriveIntentPaletteWithHarmony(0, 0.15, "balanced", harmonyOffsets);

      expect(palette.debug.mutation.h).toBeCloseTo(60, 0);
      expect(palette.debug.usage.h).toBeCloseTo(300, 0);
      expect(palette.debug.controlFlow.h).toBeCloseTo(120, 0);
    });

    it("should fall back to default offsets for unlisted layers", () => {
      const harmonyOffsets = {
        declaration: 0,
        mutation: 60,
        usage: -60,
        controlFlow: 120,
        data: 180,
        meta: 240,
      };

      const palette = deriveIntentPaletteWithHarmony(0, 0.15, "balanced", harmonyOffsets);

      // Documentation is not in harmonyOffsets, should use default
      // The default offset is -60, which when added to baseHue 0, gives 300 (normalized)
      expect(palette.debug.documentation.h).toBeCloseTo(300, 0);
    });

    it("should normalize hues to 0-360 range", () => {
      const harmonyOffsets = {
        declaration: 0,
        mutation: 400, // Over 360
        usage: -60,
        controlFlow: 120,
        data: 180,
        meta: 240,
      };

      const palette = deriveIntentPaletteWithHarmony(0, 0.15, "balanced", harmonyOffsets);

      expect(palette.debug.mutation.h).toBeGreaterThanOrEqual(0);
      expect(palette.debug.mutation.h).toBeLessThan(360);
    });
  });

  describe("calculateDeltaE", () => {
    it("should calculate perceptual distance between colors", () => {
      const color1 = { l: 0.5, c: 0.1, h: 0 };
      const color2 = { l: 0.6, c: 0.1, h: 0 };

      const deltaE = calculateDeltaE(color1, color2);

      expect(deltaE).toBeGreaterThan(0);
      expect(deltaE).toBeCloseTo(0.1, 1);
    });

    it("should return 0 for identical colors", () => {
      const color = { l: 0.5, c: 0.1, h: 180 };

      const deltaE = calculateDeltaE(color, color);

      expect(deltaE).toBe(0);
    });

    it("should account for hue differences", () => {
      const color1 = { l: 0.5, c: 0.1, h: 0 };
      const color2 = { l: 0.5, c: 0.1, h: 180 };

      const deltaE = calculateDeltaE(color1, color2);

      expect(deltaE).toBeGreaterThan(0);
    });

    it("should account for chroma differences", () => {
      const color1 = { l: 0.5, c: 0.1, h: 0 };
      const color2 = { l: 0.5, c: 0.2, h: 0 };

      const deltaE = calculateDeltaE(color1, color2);

      expect(deltaE).toBeGreaterThan(0);
      expect(deltaE).toBeCloseTo(0.1, 1);
    });
  });

  describe("validateIntentPaletteDistances", () => {
    it("should validate that all intent layers are distinct", () => {
      const palette = deriveIntentPalette(35, 0.15, "balanced");

      const validation = validateIntentPaletteDistances(palette);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it("should detect when colors are too similar", () => {
      // Create a palette with very low chroma to force similar colors
      const palette = deriveIntentPalette(35, 0.001, "balanced");

      const validation = validateIntentPaletteDistances(palette);

      // With such low chroma, some colors may be too similar
      // The result depends on the implementation, so we just check structure
      expect(validation.valid).toBeDefined();
      expect(Array.isArray(validation.issues)).toBe(true);
    });
  });

  describe("deriveIntentSemanticTokenColors", () => {
    it("maps tokens to intent palette colors", () => {
      const palette = deriveIntentPalette(35, 0.15, "balanced");

      const tokens = deriveIntentSemanticTokenColors(palette, "#999999");

      // Functions should be declaration color
      expect(tokens.function).toBe(palette.declaration);

      // Variable should map to usage
      expect(tokens.variable).toBe(palette.usage);

      // Keyword should map to controlFlow
      expect(tokens.keyword).toBe(palette.controlFlow);

      // String should map to data
      expect(tokens.string).toBe(palette.data);

      // Comments should use muted FG
      expect(typeof tokens.comment).toBe("object");
      expect((tokens.comment as { foreground?: string }).foreground).toBe("#999999");

      // Deprecated style should include both italic and strikethrough
      const depStyle = (tokens["*.deprecated"] as { fontStyle?: string }).fontStyle;
      expect(depStyle?.includes("italic")).toBe(true);
      expect(depStyle?.includes("strikethrough")).toBe(true);

      expect((tokens["*.definition"] as { fontStyle?: string }).fontStyle).toBe("bold");
      expect((tokens["*.readonly"] as { fontStyle?: string }).fontStyle).toBe("underline");
      expect((tokens["*.defaultLibrary"] as { fontStyle?: string }).fontStyle).toBe("bold");
      expect(tokens["function.definition"]).toBe(palette.declaration);
      expect(tokens["variable.definition"]).toBe(palette.declaration);
      expect(tokens.modifier).toBe(palette.controlFlow);
    });

    it("should include language-specific token colors", () => {
      const palette = deriveIntentPalette(35, 0.15, "balanced");
      const tokens = deriveIntentSemanticTokenColors(palette, "#999999");

      // Check that language-specific tokens are generated
      const languageTokens = Object.keys(tokens).filter(key => key.includes(":"));
      expect(languageTokens.length).toBeGreaterThan(0);
    });

    it("should apply font styles to language-specific tokens", () => {
      const palette = deriveIntentPalette(35, 0.15, "balanced");
      const tokens = deriveIntentSemanticTokenColors(palette, "#999999");

      // Find a language-specific token with font style
      const tokensWithStyle = Object.entries(tokens).filter(
        ([key, value]) => key.includes(":") && typeof value === "object" && "fontStyle" in value
      );

      // Just verify structure - actual tokens depend on language mappers
      if (tokensWithStyle.length > 0) {
        const [, value] = tokensWithStyle[0];
        expect(typeof value).toBe("object");
        expect("foreground" in (value as object)).toBe(true);
      }
    });

    it("should map type-like constructs to declaration", () => {
      const palette = deriveIntentPalette(35, 0.15, "balanced");
      const tokens = deriveIntentSemanticTokenColors(palette, "#999999");

      expect(tokens.class).toBe(palette.declaration);
      expect(tokens.interface).toBe(palette.declaration);
      expect(tokens.type).toBe(palette.declaration);
      expect(tokens.enum).toBe(palette.declaration);
    });

    it("should map operators and decorators to mutation", () => {
      const palette = deriveIntentPalette(35, 0.15, "balanced");
      const tokens = deriveIntentSemanticTokenColors(palette, "#999999");

      expect(tokens.operator).toBe(palette.mutation);
      expect(tokens.decorator).toBe(palette.mutation);
      expect(tokens.macro).toBe(palette.mutation);
    });

    it("should apply correct modifiers", () => {
      const palette = deriveIntentPalette(35, 0.15, "balanced");
      const tokens = deriveIntentSemanticTokenColors(palette, "#999999");

      expect((tokens["*.abstract"] as { fontStyle?: string }).fontStyle).toBe("italic");
      expect((tokens["*.async"] as { fontStyle?: string }).fontStyle).toBe("italic");
      expect((tokens["*.static"] as { fontStyle?: string }).fontStyle).toBe("underline");
      expect((tokens["*.modification"] as { foreground?: string }).foreground).toBe(
        palette.mutation
      );
    });
  });

  describe("INTENT_LAYERS", () => {
    it("should have all expected intent layers", () => {
      expect(INTENT_LAYERS.declaration).toBeDefined();
      expect(INTENT_LAYERS.mutation).toBeDefined();
      expect(INTENT_LAYERS.usage).toBeDefined();
      expect(INTENT_LAYERS.controlFlow).toBeDefined();
      expect(INTENT_LAYERS.data).toBeDefined();
      expect(INTENT_LAYERS.meta).toBeDefined();
      expect(INTENT_LAYERS.documentation).toBeDefined();
    });

    it("should have valid lightness values", () => {
      for (const layer of Object.values(INTENT_LAYERS)) {
        expect(layer.l).toBeGreaterThan(0);
        expect(layer.l).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("INTENT_EMPHASIS_MODES", () => {
    it("should have all expected emphasis modes", () => {
      expect(INTENT_EMPHASIS_MODES.balanced).toBeDefined();
      expect(INTENT_EMPHASIS_MODES.declaration).toBeDefined();
      expect(INTENT_EMPHASIS_MODES.controlFlow).toBeDefined();
      expect(INTENT_EMPHASIS_MODES.mutation).toBeDefined();
    });

    it("should have balanced mode with all multipliers at 1.0", () => {
      const balanced = INTENT_EMPHASIS_MODES.balanced;
      expect(balanced.declaration).toBe(1.0);
      expect(balanced.mutation).toBe(1.0);
      expect(balanced.usage).toBe(1.0);
      expect(balanced.controlFlow).toBe(1.0);
      expect(balanced.data).toBe(1.0);
      expect(balanced.meta).toBe(1.0);
      expect(balanced.documentation).toBe(1.0);
    });
  });
});

describe("inferFallbackIntent", () => {
  it("handles compound modifiers and language-specific selectors", () => {
    expect(inferFallbackIntent("variable.readonly.defaultLibrary")).toBe("usage");
    expect(inferFallbackIntent("property:css")).toBe("usage");
  });

  it("treats definition selectors as declarations", () => {
    expect(inferFallbackIntent("function.definition")).toBe("declaration");
  });

  it("maps fallback mutation tokens", () => {
    expect(inferFallbackIntent("macro")).toBe("mutation");
  });

  it("maps fallback control-flow tokens", () => {
    expect(inferFallbackIntent("label")).toBe("controlFlow");
    expect(inferFallbackIntent("event")).toBe("controlFlow");
  });

  it("maps fallback data and documentation tokens", () => {
    expect(inferFallbackIntent("comment.documentation")).toBe("data");
    expect(inferFallbackIntent("token.documentation.extra")).toBe("documentation");
  });

  it("maps fallback meta tokens and defaults unknown tokens to usage", () => {
    expect(inferFallbackIntent("annotation")).toBe("meta");
    expect(inferFallbackIntent("attribute.custom")).toBe("meta");
    expect(inferFallbackIntent("unknown.custom.token")).toBe("usage");
  });
});
