import { converter } from "culori";
import { describe, expect, it } from "vitest";
import { oklch, toHex } from "../color.js";
import { apcaLc, gamutMap, maxChromaAt, solveForContrast } from "../contrast-solve.js";

const toOklch = converter("oklch");
const DARK = "#0b0c10";
const LIGHT = "#f5f5f7";

describe("gamutMap", () => {
  it("holds lightness and hue, surrendering only chroma", () => {
    const mapped = gamutMap(oklch(0.98, 0.6, 29));
    expect(mapped.l).toBeCloseTo(0.98, 3);
    expect(mapped.h).toBeCloseTo(29, 1);
    expect(mapped.c).toBeLessThan(0.6);
  });

  it("leaves an in-gamut color alone", () => {
    const inGamut = oklch(0.7, 0.1, 200);
    const mapped = gamutMap(inGamut);
    expect(mapped.l).toBeCloseTo(inGamut.l, 6);
    expect(mapped.c).toBeCloseTo(inGamut.c, 6);
  });
});

describe("maxChromaAt", () => {
  it("collapses toward white, which is why a bright color cannot be saturated", () => {
    expect(maxChromaAt(0.98, 29)).toBeLessThan(0.05);
  });

  it("affords far more room mid-scale than at the extremes", () => {
    expect(maxChromaAt(0.62, 29)).toBeGreaterThan(maxChromaAt(0.95, 29));
    expect(maxChromaAt(0.62, 29)).toBeGreaterThan(maxChromaAt(0.2, 29));
  });

  it("varies by hue, which is why one floor cannot fit every accent", () => {
    expect(maxChromaAt(0.8, 145)).toBeGreaterThan(maxChromaAt(0.8, 290));
  });
});

describe("apcaLc", () => {
  it("is zero against itself and large across the extremes", () => {
    expect(apcaLc("#0b0c10", "#0b0c10")).toBeCloseTo(0, 1);
    expect(apcaLc("#ffffff", "#000000")).toBeGreaterThan(90);
  });
});

describe("solveForContrast", () => {
  it("meets the target on a dark background while keeping the hue", () => {
    for (const hue of [29, 85, 145, 220]) {
      const s = solveForContrast({ hue, backgroundHex: DARK, targetLc: 60 });
      expect(s.met).toBe(true);
      expect(s.lc).toBeGreaterThanOrEqual(60);
      expect(s.color.h).toBeCloseTo(hue, 1);
    }
  });

  it("meets the target on a light background too, walking the other way", () => {
    const dark = solveForContrast({ hue: 29, backgroundHex: DARK, targetLc: 60 });
    const light = solveForContrast({ hue: 29, backgroundHex: LIGHT, targetLc: 60 });
    expect(light.met).toBe(true);
    expect(light.color.l).toBeLessThan(dark.color.l);
  });

  it("stops at the target rather than overshooting it", () => {
    // The defect this replaced climbed lightness until contrast was merely
    // satisfied, landing at Lc 101 against a target of 60 and spending all of
    // the color's chroma to get there.
    const s = solveForContrast({ hue: 29, backgroundHex: DARK, targetLc: 60 });
    expect(s.lc).toBeLessThan(75);
    expect(s.color.c).toBeGreaterThan(0.1);
  });

  it("respects a chroma ceiling, so a role can sit on a ladder rung", () => {
    const s = solveForContrast({
      hue: 145,
      backgroundHex: DARK,
      targetLc: 60,
      chromaCeiling: 0.06,
    });
    expect(s.color.c).toBeLessThanOrEqual(0.06 + 1e-9);
  });

  it("reports met:false rather than inventing a color it could not reach", () => {
    const s = solveForContrast({
      hue: 29,
      backgroundHex: DARK,
      targetLc: 200,
      minL: 0.5,
      maxL: 0.55,
    });
    expect(s.met).toBe(false);
    expect(s.color.h).toBeCloseTo(29, 1);
  });

  it("produces a hex that round-trips to the solved lightness", () => {
    const s = solveForContrast({ hue: 220, backgroundHex: DARK, targetLc: 60 });
    const back = toOklch(s.hex) as { l: number };
    expect(back.l).toBeCloseTo(s.color.l, 2);
    expect(s.hex).toBe(toHex(oklch(s.color.l, s.color.c, s.color.h)));
  });
});
