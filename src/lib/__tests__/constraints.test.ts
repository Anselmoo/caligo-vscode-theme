import { describe, expect, it } from "vitest";
import { assertValidSeed, type Seed } from "../constraints.js";

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
