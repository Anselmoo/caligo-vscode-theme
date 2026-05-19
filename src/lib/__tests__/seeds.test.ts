import { describe, expect, it } from "vitest";
import { loadAllSeeds, loadSeedById } from "../seeds.js";

describe("loadAllSeeds", () => {
  it("should load all seed files from src/seeds", async () => {
    const seeds = await loadAllSeeds();

    expect(seeds.length).toBeGreaterThan(0);

    // Check that each seed has required properties
    for (const seed of seeds) {
      expect(seed.id).toBeTruthy();
      expect(seed.displayName).toBeTruthy();
      expect(seed.background).toBeTruthy();
      expect(seed.background.mode).toBe("oklch");
      expect(seed.background.l).toBeGreaterThanOrEqual(0);
      expect(seed.background.l).toBeLessThanOrEqual(1);
      expect(seed.background.c).toBeGreaterThanOrEqual(0);
      expect(seed.background.h).toBeGreaterThanOrEqual(0);
      expect(seed.background.h).toBeLessThan(360);

      expect(seed.accent).toBeTruthy();
      expect(seed.accent.mode).toBe("oklch");
      expect(seed.accent.l).toBeGreaterThanOrEqual(0);
      expect(seed.accent.l).toBeLessThanOrEqual(1);
      expect(seed.accent.c).toBeGreaterThanOrEqual(0);
      expect(seed.accent.h).toBeGreaterThanOrEqual(0);
      expect(seed.accent.h).toBeLessThan(360);
    }
  });

  it("should return seeds in alphabetical order", async () => {
    const seeds = await loadAllSeeds();

    for (let i = 1; i < seeds.length; i++) {
      const prev = seeds[i - 1].id.toLowerCase();
      const curr = seeds[i].id.toLowerCase();
      expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
    }
  });
});

describe("loadSeedById", () => {
  it("should load a specific seed by id", async () => {
    const seed = await loadSeedById("Signal");

    expect(seed).toBeTruthy();
    expect(seed?.id).toBe("Signal");
    expect(seed?.displayName).toBe("Signal");
  });

  it("should load updated Scatter background values", async () => {
    const seed = await loadSeedById("Scatter");

    expect(seed).toBeTruthy();
    expect(seed?.background).toEqual({ mode: "oklch", l: 0.12, c: 0.05, h: 20 });
  });

  it("should return undefined for non-existent seed", async () => {
    const seed = await loadSeedById("NonExistentSeed");

    expect(seed).toBeUndefined();
  });

  it("should be case-insensitive", async () => {
    const seed1 = await loadSeedById("Signal");
    const seed2 = await loadSeedById("eclipse");
    const seed3 = await loadSeedById("ECLIPSE");

    expect(seed1).toBeTruthy();
    expect(seed2).toBeTruthy();
    expect(seed3).toBeTruthy();
    expect(seed1?.id).toBe(seed2?.id);
    expect(seed2?.id).toBe(seed3?.id);
  });
});
