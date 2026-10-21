/**
 * (3) Single source: the web helpers and the lib APCA helper return the SAME
 * numbers as src/lib/contrast.ts for the same inputs, including #RRGGBBAA.
 *
 * Contract:
 *   area "math":      src/lib/color-utils.ts apcaLc(fg, bg) === contrast.apcaLc(fg, bg)
 *                     src/lib/contrast-solve.ts apcaLc(fg, bg) === contrast.apcaLc(fg, bg)
 *   area "consumers": src/vue-app/utils/color-utils.ts calculateContrast(fg, bg) === contrast.wcagContrastRatio(fg, bg)
 *                     src/vue-app/composables/useAccessibleColors.ts checkContrast(fg, bg).contrast === contrast.apcaLc(fg, bg)
 *                     no non-test file under src/vue-app computes contrast itself (no apca-w3 import,
 *                     no APCAcontrast/sRGBtoY call, no culori wcagContrast call); they delegate to src/lib.
 * Equality is exact (Object.is): delegation, not a second formula.
 */
import { describe, expect, it } from "vitest";
import * as libColorUtils from "../../src/lib/color-utils";
import * as contrast from "../../src/lib/contrast";
import { apcaLc as solveApcaLc } from "../../src/lib/contrast-solve";
import * as accessible from "../../src/vue-app/composables/useAccessibleColors";
import * as webColorUtils from "../../src/vue-app/utils/color-utils";
import { listFiles, readText } from "./_oracle";

type Score = (fg: string, bg: string) => number;
const C = contrast as unknown as Record<string, unknown>;
const lib = (name: string): Score => {
  expect(typeof C[name], `src/lib/contrast.ts must export ${name}()`).toBe("function");
  return C[name] as Score;
};

const PAIRS: Array<[string, string]> = [
  ["#d6e2e0", "#001519"],
  ["#81979b", "#001519"],
  ["#000000", "#ffffff"],
  ["#63b189", "#0b2227"],
  // translucent foregrounds over opaque backgrounds: these are where copies diverge today
  ["#81979b8c", "#001519"],
  ["#81979bbf", "#001519"],
  ["#81979b4d", "#001519"],
  ["#ffffff80", "#000000"],
];

describe("contrast-truth / single source", () => {
  it.each(PAIRS)("web calculateContrast(%s, %s) === lib wcagContrastRatio", (fg, bg) => {
    expect(
      Object.is(webColorUtils.calculateContrast(fg, bg), lib("wcagContrastRatio")(fg, bg))
    ).toBe(true);
  });

  it.each(PAIRS)("web checkContrast(%s, %s).contrast === lib apcaLc", (fg, bg) => {
    const got = accessible.checkContrast(fg, bg).contrast;
    const want = lib("apcaLc")(fg, bg);
    expect(got, `checkContrast=${got} lib=${want}`).toBe(want);
  });

  it.each(PAIRS)("src/lib/color-utils apcaLc(%s, %s) === contrast apcaLc", (fg, bg) => {
    expect(libColorUtils.apcaLc(fg, bg)).toBe(lib("apcaLc")(fg, bg));
  });

  it.each(PAIRS)("contrast-solve apcaLc(%s, %s) === contrast apcaLc", (fg, bg) => {
    expect(solveApcaLc(fg, bg)).toBe(lib("apcaLc")(fg, bg));
  });

  it("no web-app source computes contrast itself", () => {
    const offenders: string[] = [];
    const files = listFiles("src/vue-app").filter(
      f => /\.(ts|vue)$/.test(f) && !/__tests__|\.test\.ts$|\.spec\.ts$/.test(f)
    );
    for (const f of files) {
      const src = readText(f) ?? "";
      if (/from\s+["']apca-w3["']/.test(src)) offenders.push(`${f}: imports apca-w3`);
      if (/\b(APCAcontrast|sRGBtoY)\s*\(/.test(src)) offenders.push(`${f}: calls APCA directly`);
      if (/\bwcagContrast\s*\(/.test(src)) offenders.push(`${f}: calls culori wcagContrast`);
    }
    expect(offenders).toEqual([]);
  });
});
