import { describe, expect, it } from "vitest";
import {
  apcaContrast,
  apcaLc,
  compositeOver,
  flattenLayers,
  parseHex,
  wcagContrastRatio,
} from "../contrast.js";
import {
  CONTRAST_EXEMPT_FOREGROUNDS,
  CONTRAST_PAIRS,
  evaluateThemeContrast,
  pairId,
  WCAG_MIN,
} from "../contrast-pairs.js";

describe("contrast: alpha-aware scoring", () => {
  it("composites a translucent foreground before scoring (line-number color is ~2.66, not 6.09)", () => {
    expect(wcagContrastRatio("#81979b8c", "#001519")).toBeCloseTo(2.65821637384033, 6);
    expect(wcagContrastRatio("#81979b", "#001519")).toBeGreaterThan(6);
  });

  it("composites a translucent background over its base and throws without one", () => {
    expect(() => wcagContrastRatio("#d6e2e0", "#63b18959")).toThrow();
    expect(wcagContrastRatio("#d6e2e0", "#63b18959", ["#001519"])).toBe(
      wcagContrastRatio("#d6e2e0", compositeOver("#63b18959", "#001519"))
    );
  });

  it("apcaLc is the absolute value of the signed apcaContrast", () => {
    expect(apcaContrast("#ffffff", "#000000")).toBeLessThan(0);
    expect(apcaLc("#ffffff", "#000000")).toBe(Math.abs(apcaContrast("#ffffff", "#000000")));
  });

  it("parseHex and flattenLayers reject malformed or translucent-bottom input", () => {
    for (const bad of ["#fff", "red", "#gggggg", ""]) expect(() => parseHex(bad)).toThrow();
    expect(() => flattenLayers(["#00151980"])).toThrow();
    expect(() => flattenLayers([])).toThrow();
  });
});

describe("contrast-pairs registry", () => {
  it("has unique ids, floors per kind, and no foreground both gated and exempt", () => {
    const ids = CONTRAST_PAIRS.map(pairId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of CONTRAST_PAIRS) expect(p.min).toBe(WCAG_MIN[p.kind]);
    const gated = new Set(CONTRAST_PAIRS.map(p => p.fg));
    for (const k of Object.keys(CONTRAST_EXEMPT_FOREGROUNDS)) expect(gated.has(k)).toBe(false);
  });

  it("evaluateThemeContrast scores registry, token and semantic pairs on a minimal theme", () => {
    const colors: Record<string, string> = {};
    for (const p of CONTRAST_PAIRS) {
      for (const k of [p.fg, p.bg, ...[p.base ?? []].flat()]) {
        colors[k] = k === p.fg ? "#ffffff80" : "#000000";
      }
    }
    // Every non-foreground key is an opaque bottom or a translucent overlay: keep bottoms opaque.
    for (const p of CONTRAST_PAIRS) {
      const bottom = [p.base ?? [], p.bg].flat()[0];
      if (!(bottom in colors) || colors[bottom].length === 9) colors[bottom] = "#000000";
    }
    const results = evaluateThemeContrast({
      colors: { ...colors, "editor.background": "#000000" },
      tokenColors: [{ name: "Comment", settings: { foreground: "#ffffff80" } }, { scope: "x" }],
      semanticTokenColors: { "variable.readonly": { foreground: "#ffffff" }, "x.y": "#ffffff" },
    });
    const byId = new Map(results.map(r => [r.id, r]));
    expect(byId.get("token:Comment|editor.background")?.pass).toBe(
      wcagContrastRatio("#ffffff80", "#000000") >= 4.5
    );
    expect(byId.get("semantic:variable.readonly|editor.background")?.wcag).toBeCloseTo(21, 9);
    expect(byId.get("semantic:x.y|editor.background")?.pass).toBe(true);
    expect(byId.has("token:x|editor.background")).toBe(false);
  });

  it("throws on a missing registry key", () => {
    expect(() => evaluateThemeContrast({ colors: {} })).toThrow(/colors\[/);
  });
});
