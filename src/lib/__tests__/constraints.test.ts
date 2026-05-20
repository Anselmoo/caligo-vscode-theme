import { describe, expect, it } from "vitest";
import { assertValidSeed, type Seed, validateSeed } from "../constraints.js";

describe("assertValidSeed", () => {
  it("should accept valid seed", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    expect(() => assertValidSeed(seed)).not.toThrow();
  });

  it("should reject seed without id", () => {
    const seed = {
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    } as Seed;

    expect(() => assertValidSeed(seed)).toThrow();
  });

  it("should reject seed without background", () => {
    const seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    } as Seed;

    expect(() => assertValidSeed(seed)).toThrow();
  });

  it("should reject seed without accent", () => {
    const seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
    } as Seed;

    expect(() => assertValidSeed(seed)).toThrow();
  });

  it("should reject background with invalid lightness", () => {
    const seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 1.5, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    } as Seed;

    expect(() => assertValidSeed(seed)).toThrow();
  });

  it("should allow true black OLED background (L=0, C=0)", () => {
    const seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0, c: 0, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    } as Seed;

    // Should NOT throw for OLED-optimized true black
    expect(() => assertValidSeed(seed)).not.toThrow();
  });

  it("should reject accent with too low chroma", () => {
    const seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.05, h: 215 },
    } as Seed;

    expect(() => assertValidSeed(seed)).toThrow();
  });
});

describe("validateSeed — optional field validation", () => {
  const base: Seed = {
    id: "TestSeed",
    displayName: "Test Seed",
    background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
    accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
  };

  it("returns no violations for a minimal valid seed", () => {
    expect(validateSeed(base)).toHaveLength(0);
  });

  it("flags invalid syntaxStyle", () => {
    const seed = { ...base, syntaxStyle: "ultra" as Seed["syntaxStyle"] };
    const violations = validateSeed(seed);
    expect(violations.some(v => v.code === "invalid_syntax_style")).toBe(true);
  });

  it("accepts valid syntaxStyle values", () => {
    for (const style of ["vibrant", "muted", "balanced"] as const) {
      expect(validateSeed({ ...base, syntaxStyle: style })).toHaveLength(0);
    }
  });

  it("flags invalid contrastTarget", () => {
    const seed = { ...base, contrastTarget: "WCAG-B" as Seed["contrastTarget"] };
    const violations = validateSeed(seed);
    expect(violations.some(v => v.code === "invalid_contrast_target")).toBe(true);
  });

  it("accepts valid contrastTarget values", () => {
    for (const target of ["WCAG-AA", "WCAG-AAA"] as const) {
      expect(validateSeed({ ...base, contrastTarget: target })).toHaveLength(0);
    }
  });

  it("flags out-of-range semantic errorHue", () => {
    const seed = { ...base, semantic: { errorHue: 400 } };
    const violations = validateSeed(seed);
    expect(violations.some(v => v.code === "invalid_semantic_hue")).toBe(true);
  });

  it("flags negative semantic warningHue", () => {
    const seed = { ...base, semantic: { warningHue: -5 } };
    const violations = validateSeed(seed);
    expect(violations.some(v => v.code === "invalid_semantic_hue")).toBe(true);
  });

  it("accepts null semantic hue overrides without violation", () => {
    const seed = {
      ...base,
      semantic: { errorHue: null, warningHue: null, successHue: null, infoHue: null },
    };
    expect(validateSeed(seed).some(v => v.code === "invalid_semantic_hue")).toBe(false);
  });

  it("accepts valid in-range semantic hue overrides", () => {
    const seed = {
      ...base,
      semantic: { errorHue: 20, warningHue: 60, successHue: 145, infoHue: 220 },
    };
    expect(validateSeed(seed)).toHaveLength(0);
  });

  it("flags negative background chroma", () => {
    const seed = { ...base, background: { ...base.background, c: -0.01 } };
    const violations = validateSeed(seed);
    expect(violations.some(v => v.code === "background_too_gray")).toBe(true);
  });
});
