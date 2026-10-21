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
  CODE_STACKS,
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
    // Code stacks: opaque bottom, translucent white overlays on top.
    for (const stack of CODE_STACKS) {
      const [bottom, ...overlays] = stack.split(">");
      colors[bottom] = "#000000";
      for (const k of overlays) colors[k] = "#ffffff1a";
    }
    const results = evaluateThemeContrast({
      colors: { ...colors, "editor.background": "#000000" },
      tokenColors: [
        { name: "Comment", settings: { foreground: "#ffffff80" } },
        { name: "Faint", settings: { foreground: "#ffffff40" } },
        { scope: "x" },
      ],
      semanticTokenColors: { "variable.readonly": { foreground: "#ffffff" }, "x.y": "#ffffff" },
    });
    const byId = new Map(results.map(r => [r.id, r]));
    expect(byId.get("token:Comment|editor.background")?.pass).toBe(
      wcagContrastRatio("#ffffff80", "#000000") >= 4.5
    );
    expect(byId.get("semantic:variable.readonly|editor.background")?.wcag).toBeCloseTo(21, 9);
    expect(byId.get("semantic:x.y|editor.background")?.pass).toBe(true);
    expect(byId.has("token:x|editor.background")).toBe(false);

    // Every code ink that passes on the bare editor is scored over every code stack, composited;
    // inks are deduplicated by hex (x.y shares #ffffff with variable.readonly).
    const removedWord =
      "editor.background>diffEditor.removedLineBackground>diffEditor.removedTextBackground";
    expect(byId.get(`code:semantic:variable.readonly|${removedWord}`)?.wcag).toBeCloseTo(
      wcagContrastRatio("#ffffff", "#ffffff1a", ["#000000", "#ffffff1a"]),
      9
    );
    expect(byId.has(`code:semantic:x.y|${removedWord}`)).toBe(false);
    // An ink that already fails on the bare editor is not scored again on the code stacks.
    expect(wcagContrastRatio("#ffffff40", "#000000")).toBeLessThan(4.5);
    expect([...byId.keys()].some(id => id.startsWith("code:token:Faint|"))).toBe(false);
    expect(results.filter(r => r.id.startsWith("code:")).length).toBe(
      CODE_STACKS.length * 2 // Comment (#ffffff80 passes bare) and variable.readonly
    );
  });

  it("throws on a missing registry key", () => {
    expect(() => evaluateThemeContrast({ colors: {} })).toThrow(/colors\[/);
  });
});
