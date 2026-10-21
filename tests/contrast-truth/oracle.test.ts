/**
 * (1) Oracle tests: the single src/lib implementation equals culori (WCAG 2.x)
 * and apca-w3 (APCA 0.1.9) within 1e-6 on fixed opaque pairs.
 *
 * Contract (area "math", src/lib/contrast.ts):
 *   wcagContrastRatio(fg, bg, base?) -> number   WCAG 2.x ratio, unrounded
 *   apcaContrast(fg, bg, base?)      -> number   SIGNED APCA Lc, (text, background) order
 *   apcaLc(fg, bg, base?)            -> number   Math.abs(apcaContrast(...))
 */
import { APCAcontrast, sRGBtoY } from "apca-w3";
import { describe, expect, it } from "vitest";
import * as lib from "../../src/lib/contrast";
import { oracleApcaSigned, oracleWcag, TOL } from "./_oracle";

type Fn = (fg: string, bg: string) => number;
const L = lib as unknown as Record<string, unknown>;
const fn = (name: string): Fn => {
  expect(typeof L[name], `src/lib/contrast.ts must export ${name}()`).toBe("function");
  return L[name] as Fn;
};

/** Opaque pairs: extremes, greys, and real Caligo AuroraNoir surfaces. */
const OPAQUE_PAIRS: Array<[string, string]> = [
  ["#000000", "#ffffff"],
  ["#ffffff", "#000000"],
  ["#888888", "#ffffff"],
  ["#767676", "#ffffff"],
  ["#a4a4a4", "#000000"],
  ["#d6e2e0", "#001519"],
  ["#81979b", "#001519"],
  ["#63b189", "#001519"],
  ["#001519", "#63b189"],
  ["#ff5ff6", "#001519"],
  ["#66f1f8", "#0b2227"],
  ["#123456", "#fedcba"],
  ["#ABCDEF", "#012345"],
];

/**
 * Published APCA 0.1.9 reference values, from the package's own test page
 * (node_modules/apca-w3/test/test.html lines 67-74), (text, background) order.
 * The #234-on-#444 row of that page is omitted: installed 0.1.9 returns 0 for it.
 */
const APCA_REFERENCE: Array<[string, string, number]> = [
  ["#888888", "#ffffff", 63.056469930209424],
  ["#ffffff", "#888888", -68.54146436644962],
  ["#000000", "#aaaaaa", 58.146262578561334],
  ["#aaaaaa", "#000000", -56.24113336839742],
  ["#112233", "#ddeeff", 91.66830811481631],
  ["#ddeeff", "#112233", -93.06770049484275],
  ["#112233", "#444444", 8.32326136957393],
];

describe("contrast-truth / oracle: WCAG 2.x", () => {
  it("black on white is exactly 21:1 in both argument orders", () => {
    const wcag = fn("wcagContrastRatio");
    expect(wcag("#000000", "#ffffff")).toBeCloseTo(21, 12);
    expect(wcag("#ffffff", "#000000")).toBeCloseTo(21, 12);
  });

  it("equal colors are exactly 1:1", () => {
    const wcag = fn("wcagContrastRatio");
    for (const c of ["#000000", "#ffffff", "#888888", "#001519", "#63b189"]) {
      expect(wcag(c, c)).toBe(1);
    }
  });

  it.each(OPAQUE_PAIRS)("%s on %s equals culori.wcagContrast within 1e-6", (fg, bg) => {
    const wcag = fn("wcagContrastRatio");
    expect(Math.abs(wcag(fg, bg) - oracleWcag(fg, [bg]))).toBeLessThanOrEqual(TOL);
  });

  it("is symmetric in its arguments for opaque colors", () => {
    const wcag = fn("wcagContrastRatio");
    for (const [a, b] of OPAQUE_PAIRS) expect(wcag(a, b)).toBe(wcag(b, a));
  });

  it("rejects input that is not #RRGGBB or #RRGGBBAA instead of guessing", () => {
    const wcag = fn("wcagContrastRatio");
    for (const bad of ["#fff", "red", "#gggggg", "", "001519", "#0015190"]) {
      expect(() => wcag(bad, "#000000"), `input ${JSON.stringify(bad)}`).toThrow();
    }
  });
});

describe("contrast-truth / oracle: APCA", () => {
  it.each(APCA_REFERENCE)("apcaContrast(%s, %s) is the published Lc %d", (fg, bg, lc) => {
    const apca = fn("apcaContrast");
    expect(Math.abs(apca(fg, bg) - lc)).toBeLessThanOrEqual(TOL);
  });

  it("is polarity-aware: swapping text and background changes the value", () => {
    const apca = fn("apcaContrast");
    expect(apca("#000000", "#ffffff")).toBeCloseTo(106.04067321268862, 9);
    expect(apca("#ffffff", "#000000")).toBeCloseTo(-107.88473318309848, 9);
  });

  it("equal colors give Lc 0", () => {
    const apca = fn("apcaContrast");
    for (const c of ["#000000", "#ffffff", "#888888", "#001519"]) expect(apca(c, c)).toBe(0);
  });

  it.each(OPAQUE_PAIRS)("%s on %s equals apca-w3 within 1e-6 (signed and abs)", (fg, bg) => {
    const apca = fn("apcaContrast");
    const lc = fn("apcaLc");
    const expected = oracleApcaSigned(fg, [bg]);
    expect(Math.abs(apca(fg, bg) - expected)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(lc(fg, bg) - Math.abs(expected))).toBeLessThanOrEqual(TOL);
  });

  it("the oracle itself reproduces apca-w3 on integer sRGB (guards the harness)", () => {
    expect(APCAcontrast(sRGBtoY([0x88, 0x88, 0x88]), sRGBtoY([255, 255, 255]))).toBeCloseTo(
      63.056469930209424,
      12
    );
    expect(oracleApcaSigned("#888888", ["#ffffff"])).toBeCloseTo(63.056469930209424, 9);
  });

  it("rejects malformed hex instead of silently scoring Lc 0", () => {
    const lc = fn("apcaLc");
    for (const bad of ["#fff", "red", "#gggggg"]) {
      expect(() => lc(bad, "#000000"), `input ${JSON.stringify(bad)}`).toThrow();
    }
  });
});
