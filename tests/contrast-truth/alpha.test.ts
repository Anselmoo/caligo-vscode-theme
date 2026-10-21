/**
 * (2) Alpha: a #RRGGBBAA foreground is scored as its source-over composite;
 * a translucent background is composited over its declared base first.
 *
 * Contract (area "math", src/lib/contrast.ts):
 *   type Rgba = { r: number; g: number; b: number; a: number } // r,g,b 0..255 floats, a 0..1
 *   type Color = string | Rgba                                 // string = #RRGGBB | #RRGGBBAA
 *   parseHex(hex: string): Rgba                                // throws on anything else
 *   compositeOver(top: Color, bottom: Color): Rgba             // Porter-Duff source-over, gamma-encoded sRGB, UNROUNDED
 *   flattenLayers(layers: readonly Color[]): Rgba              // bottom -> top; throws if layers[0] is not opaque
 *   wcagContrastRatio(fg: Color, bg: Color, base?: Color | readonly Color[]): number
 *   apcaContrast / apcaLc (same signature)
 * Scoring rule: bgEff = flattenLayers([...base, bg]); fgEff = compositeOver(fg, bgEff);
 * score(fgEff, bgEff). A translucent bg with no base throws (it has no defined color).
 */
import { describe, expect, it } from "vitest";
import * as lib from "../../src/lib/contrast";
import { oracleApcaSigned, oracleWcag, TOL } from "./_oracle";

type Rgba = { r: number; g: number; b: number; a: number };
type Color = string | Rgba;
type Score = (fg: Color, bg: Color, base?: Color | readonly Color[]) => number;

const L = lib as unknown as Record<string, unknown>;
function fn<T>(name: string): T {
  expect(typeof L[name], `src/lib/contrast.ts must export ${name}()`).toBe("function");
  return L[name] as T;
}

/** Real emitted values (Caligo-AuroraNoir): translucent fg keys over editor.background. */
const ALPHA_FG: Array<[key: string, fg: string, bg: string]> = [
  ["editorLineNumber.foreground", "#81979b8c", "#001519"],
  ["comment token", "#81979bbf", "#001519"],
  ["disabledForeground", "#81979ba6", "#001519"],
  ["editorWhitespace.foreground", "#81979b4d", "#001519"],
  ["input.placeholderForeground", "#81979bcc", "#0b2227"],
  ["half white on black", "#ffffff80", "#000000"],
  ["half black on white", "#00000080", "#ffffff"],
];

/** Translucent backgrounds with their declared base (bottom -> top). */
const ALPHA_BG: Array<[fg: string, bg: string, base: string[]]> = [
  ["#d6e2e0", "#63b18959", ["#001519"]], // list.activeSelectionBackground over sideBar-like base
  ["#d6e2e0", "#63b18947", ["#001519"]], // editor.lineHighlightBackground
  ["#81979bbf", "#63b18959", ["#001519"]], // translucent fg over translucent bg
  ["#d6e2e0", "#63b18959", ["#001519", "#63b18947"]], // selection over lineHighlight over editor bg
  ["#000000", "#ffffff40", ["#808080"]],
];

describe("contrast-truth / alpha: parsing and compositing", () => {
  it("parseHex keeps the alpha byte", () => {
    const parseHex = fn<(h: string) => Rgba>("parseHex");
    expect(parseHex("#81979b8c")).toEqual({ r: 0x81, g: 0x97, b: 0x9b, a: 0x8c / 255 });
    expect(parseHex("#001519")).toEqual({ r: 0, g: 0x15, b: 0x19, a: 1 });
    expect(parseHex("#ABCDEF00").a).toBe(0);
    for (const bad of ["#fff", "red", "#gggggg", "#12345"]) expect(() => parseHex(bad)).toThrow();
  });

  it("compositeOver is unrounded source-over in sRGB", () => {
    const over = fn<(t: Color, b: Color) => Rgba>("compositeOver");
    const out = over("#ff000080", "#0000ff");
    const a = 0x80 / 255;
    expect(out.a).toBe(1);
    expect(out.r).toBeCloseTo(255 * a, 9);
    expect(out.g).toBe(0);
    expect(out.b).toBeCloseTo(255 * (1 - a), 9);
  });

  it("alpha ff is identical to the opaque color, alpha 00 is invisible", () => {
    const over = fn<(t: Color, b: Color) => Rgba>("compositeOver");
    expect(over("#81979bff", "#001519")).toEqual({ r: 0x81, g: 0x97, b: 0x9b, a: 1 });
    expect(over("#81979b00", "#001519")).toEqual({ r: 0, g: 0x15, b: 0x19, a: 1 });
  });

  it("source-over is associative over an opaque base (metamorphic)", () => {
    const over = fn<(t: Color, b: Color) => Rgba>("compositeOver");
    const [x, y, z] = ["#63b18959", "#ff5ff633", "#001519"];
    const left = over(x, over(y, z));
    const right = over(over(x, y), z);
    for (const k of ["r", "g", "b", "a"] as const) expect(left[k]).toBeCloseTo(right[k], 9);
  });

  it("flattenLayers refuses a stack whose bottom layer is translucent", () => {
    const flatten = fn<(l: readonly Color[]) => Rgba>("flattenLayers");
    expect(() => flatten(["#00151980", "#63b18959"])).toThrow();
    expect(() => flatten([])).toThrow();
    expect(flatten(["#001519"])).toEqual({ r: 0, g: 0x15, b: 0x19, a: 1 });
  });
});

describe("contrast-truth / alpha: translucent foreground over opaque background", () => {
  it.each(ALPHA_FG)("%s (%s on %s) scores exactly as its composite", (_k, fg, bg) => {
    const wcag = fn<Score>("wcagContrastRatio");
    const apca = fn<Score>("apcaContrast");
    const over = fn<(t: Color, b: Color) => Rgba>("compositeOver");
    const composite = over(fg, bg);
    expect(wcag(fg, bg)).toBe(wcag(composite, bg));
    expect(apca(fg, bg)).toBe(apca(composite, bg));
  });

  it.each(ALPHA_FG)("%s (%s on %s) equals culori.blend + oracle within 1e-6", (_k, fg, bg) => {
    const wcag = fn<Score>("wcagContrastRatio");
    const apca = fn<Score>("apcaContrast");
    const lc = fn<Score>("apcaLc");
    expect(Math.abs(wcag(fg, bg) - oracleWcag(fg, [bg]))).toBeLessThanOrEqual(TOL);
    expect(Math.abs(apca(fg, bg) - oracleApcaSigned(fg, [bg]))).toBeLessThanOrEqual(TOL);
    expect(Math.abs(lc(fg, bg) - Math.abs(oracleApcaSigned(fg, [bg])))).toBeLessThanOrEqual(TOL);
  });

  it("the line-number color is scored at its true ~2.66:1, not the alpha-blind 6.09:1", () => {
    const wcag = fn<Score>("wcagContrastRatio");
    const v = wcag("#81979b8c", "#001519");
    expect(v).toBeCloseTo(2.65821637384033, 6);
    expect(v).toBeLessThan(wcag("#81979b", "#001519"));
  });

  it("fully transparent foreground has ratio 1 and Lc 0", () => {
    const wcag = fn<Score>("wcagContrastRatio");
    const lc = fn<Score>("apcaLc");
    expect(wcag("#ffffff00", "#000000")).toBe(1);
    expect(lc("#ffffff00", "#000000")).toBe(0);
  });

  it("contrast of white over black grows monotonically with alpha (metamorphic)", () => {
    const wcag = fn<Score>("wcagContrastRatio");
    let prev = 0;
    for (let a = 0; a <= 255; a += 15) {
      const v = wcag(`#ffffff${a.toString(16).padStart(2, "0")}`, "#000000");
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(prev).toBeCloseTo(21, 12);
  });
});

describe("contrast-truth / alpha: translucent background over its declared base", () => {
  it.each(ALPHA_BG)("%s on %s over %j equals the oracle within 1e-6", (fg, bg, base) => {
    const wcag = fn<Score>("wcagContrastRatio");
    const apca = fn<Score>("apcaContrast");
    const stack = [...base, bg];
    expect(Math.abs(wcag(fg, bg, base) - oracleWcag(fg, stack))).toBeLessThanOrEqual(TOL);
    expect(Math.abs(apca(fg, bg, base) - oracleApcaSigned(fg, stack))).toBeLessThanOrEqual(TOL);
  });

  it("a single-string base is the same as a one-element base array", () => {
    const wcag = fn<Score>("wcagContrastRatio");
    expect(wcag("#d6e2e0", "#63b18959", "#001519")).toBe(wcag("#d6e2e0", "#63b18959", ["#001519"]));
  });

  it("a translucent background without a base is an error, not a guess", () => {
    const wcag = fn<Score>("wcagContrastRatio");
    const lc = fn<Score>("apcaLc");
    expect(() => wcag("#d6e2e0", "#63b18959")).toThrow();
    expect(() => lc("#d6e2e0", "#63b18959")).toThrow();
  });

  it("a base under an opaque background has no effect", () => {
    const wcag = fn<Score>("wcagContrastRatio");
    expect(wcag("#d6e2e0", "#001519", "#ffffff")).toBe(wcag("#d6e2e0", "#001519"));
  });
});
