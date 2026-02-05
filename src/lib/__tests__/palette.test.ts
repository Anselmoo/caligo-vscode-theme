import { describe, expect, it } from "vitest";
import type { Seed } from "../constraints.js";
import { derivePalette } from "../palette.js";

describe("derivePalette", () => {
  it("should derive a complete palette from a valid seed", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");

    // Check basic structure
    expect(palette.seed).toEqual(seed);
    expect(palette.mode).toBe("Balanced");

    // Check all required color properties exist
    expect(palette.bg0).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.bg1).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.bg2).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.fg0).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.fg1).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.fgMuted).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.accentSoft).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.accentMuted).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.accentSubtle).toMatch(/^#[0-9a-f]{6}$/i);
    // Decorative hue wheel colors
    expect(palette.hueRed).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.hueOrange).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.hueYellow).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.hueGreen).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.hueCyan).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.hueBlue).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.huePurple).toMatch(/^#[0-9a-f]{6}$/i);
    // Semantic colors (FIXED hues)
    expect(palette.semantic.error).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.semantic.warning).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.semantic.success).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.semantic.info).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.border).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.selection).toMatch(/^#[0-9a-f]{6}[0-9a-f]{2}$/i);

    // Check debug info exists
    expect(palette.debug).toBeTruthy();
    expect(palette.debug.oklch).toBeTruthy();
    expect(palette.debug.selectionAlpha).toBeGreaterThan(0);
    expect(palette.debug.harmonyMode).toBe("none"); // default

    // Check harmony colors exist
    expect(palette.harmony).toBeTruthy();
    expect(palette.harmony.strings).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.harmony.keywords).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("should use harmony mode from seed when specified", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
      harmony: "triadic",
    };

    const palette = derivePalette(seed, "Balanced");

    assert.equal(palette.debug.harmonyMode, "triadic");
    assert.equal(palette.harmony.mode, "triadic");
    // Triadic should have 3 hues
    assert.equal(palette.harmony.harmonyHues.length, 3);
  });

  it("should create progressively lighter backgrounds", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");

    // bg0 should be darkest, bg2 should be lightest
    assert.ok(palette.debug.oklch.bg0.l < palette.debug.oklch.bg1.l);
    assert.ok(palette.debug.oklch.bg1.l < palette.debug.oklch.bg2.l);
  });

  it("should create progressively darker foregrounds", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");

    // fg0 should be lightest, fgMuted should be darkest
    assert.ok(palette.debug.oklch.fg0.l > palette.debug.oklch.fg1.l);
    assert.ok(palette.debug.oklch.fg1.l > palette.debug.oklch.fgMuted.l);
  });

  it("should preserve seed accent hue in derived accent colors", () => {
    const seed: Seed = {
      id: "TestSeed",
      displayName: "Test Seed",
      background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
      accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
    };

    const palette = derivePalette(seed, "Balanced");

    assert.equal(palette.debug.oklch.accent.h, 215);
    assert.equal(palette.debug.oklch.accentSoft.h, 215);
    assert.equal(palette.debug.oklch.accentMuted.h, 215);
    assert.equal(palette.debug.oklch.accentSubtle.h, 215);
  });
});
