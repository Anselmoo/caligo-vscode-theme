import { describe, expect, it } from "vitest";
import { applyVars, assembleScene, parseBrickOutput, renderTemplate } from "../engine.js";

// ─── applyVars ──────────────────────────────────────────────────────────────

describe("applyVars", () => {
  it("replaces all {{key}} placeholders with string values", () => {
    const result = applyVars('<circle cx="{{cx}}" cy="{{cy}}"/>', { cx: "100", cy: "200" });
    expect(result).toBe('<circle cx="100" cy="200"/>');
  });

  it("replaces {{key}} placeholders with numeric values", () => {
    const result = applyVars("stdDeviation={{blur}}", { blur: 42.5 });
    expect(result).toBe("stdDeviation=42.5");
  });

  it("replaces multiple occurrences of the same key", () => {
    const result = applyVars('id="{{id}}" href="url(#{{id}})"', { id: "test" });
    expect(result).toBe('id="test" href="url(#test)"');
  });

  it("throws if a placeholder has no matching key", () => {
    expect(() => applyVars("fill={{color}}", {})).toThrow("missing variable: 'color'");
  });

  it("returns the string unchanged if no placeholders are present", () => {
    const input = '<rect width="100" height="100"/>';
    expect(applyVars(input, {})).toBe(input);
  });
});

// ─── parseBrickOutput ────────────────────────────────────────────────────────

describe("parseBrickOutput", () => {
  it("extracts defs content and body elements", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="f1"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <ellipse cx="100" cy="200" rx="50" ry="80"/>
</svg>`;
    const out = parseBrickOutput(svg);
    expect(out.defs).toContain('id="f1"');
    expect(out.defs).toContain("feGaussianBlur");
    expect(out.elements).toContain("<ellipse");
    expect(out.elements).not.toContain("<svg");
    expect(out.elements).not.toContain("<defs");
  });

  it("returns undefined defs when <defs> is absent", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="50"/></svg>`;
    const out = parseBrickOutput(svg);
    expect(out.defs).toBeUndefined();
    expect(out.elements).toContain("<rect");
  });

  it("strips XML declaration and SVG comments from output", () => {
    const svg = `<?xml version="1.0"?>
<!-- This is a template comment -->
<svg>
  <defs></defs>
  <rect width="200" height="100"/>
</svg>`;
    const out = parseBrickOutput(svg);
    expect(out.elements).not.toContain("<?xml");
    expect(out.elements).not.toContain("<!--");
    expect(out.elements).not.toContain("template comment");
    expect(out.elements).toContain("<rect");
  });

  it("handles multiple body elements correctly", () => {
    const svg = `<svg>
  <defs><linearGradient id="g1"/></defs>
  <rect width="100" height="50" fill="url(#g1)"/>
  <rect width="100" height="50" fill="red"/>
</svg>`;
    const out = parseBrickOutput(svg);
    const count = (out.elements.match(/<rect/g) ?? []).length;
    expect(count).toBe(2);
  });
});

// ─── renderTemplate ──────────────────────────────────────────────────────────

describe("renderTemplate", () => {
  it("renders bloom-ellipse.svg with expected structure", () => {
    const out = renderTemplate("bloom-ellipse.svg", {
      filterId: "bloom-test",
      blur: "76.8",
      cx: "1920",
      cy: "756",
      rx: "576",
      ry: "432",
      color: "#33aaff",
      opacity: "0.12",
    });

    expect(out.defs).toContain('id="bloom-test"');
    expect(out.defs).toContain('stdDeviation="76.8"');
    expect(out.defs).toContain("feMerge");
    expect(out.elements).toContain('cx="1920"');
    expect(out.elements).toContain('cy="756"');
    expect(out.elements).toContain('filter="url(#bloom-test)"');
    expect(out.elements).toContain('fill="#33aaff"');
  });

  it("renders vignette.svg with expected structure", () => {
    const out = renderTemplate("vignette.svg", {
      gradId: "vig-test",
      cx: "1920",
      cy: "1080",
      r: "2880",
      color: "#000011",
      innerStop: "35%",
      opacity: "0.6",
      width: 3840,
      height: 2160,
    });

    expect(out.defs).toContain('id="vig-test"');
    expect(out.defs).toContain('offset="35%"');
    expect(out.elements).toContain('fill="url(#vig-test)"');
    expect(out.elements).toContain('width="3840"');
  });

  it("renders background-glow.svg with two rects", () => {
    const out = renderTemplate("background-glow.svg", {
      gradId: "bg-atm",
      cx: "1920",
      cy: "756",
      r: "2496",
      bgColor: "#0a0a1a",
      softColor: "#1a1a3a",
      width: 3840,
      height: 2160,
    });

    expect(out.defs).toContain('id="bg-atm"');
    expect(out.defs).toContain('"#1a1a3a"');
    const rectCount = (out.elements.match(/<rect/g) ?? []).length;
    expect(rectCount).toBe(2);
    expect(out.elements).toContain('fill="#0a0a1a"');
  });

  it("throws when a required template variable is missing", () => {
    expect(() =>
      renderTemplate("bloom-ellipse.svg", {
        filterId: "x",
        // blur and other vars missing
      })
    ).toThrow("missing variable");
  });
});

// ─── assembleScene ───────────────────────────────────────────────────────────

/** Minimal token set covering all desert-night fragments. */
function desertVars(): Record<string, string> {
  return {
    skyTop: "#020105", skyMid: "#0a0815", skyBottom: "#0f0c1a",
    starWhite: "#ffffff", starFaint: "#ddeeff", starBlue: "#bbccff",
    moonSurface: "#f0e8d8", moonGlow: "#ffe8c0",
    hazeColor: "#2a1a0a", hazeOpacity: "0.18",
    duneFar: "#1a1408", duneMidFar: "#120e05", duneMidNear: "#0a0803", duneFront: "#050401",
    vignetteColor: "#000000", vignetteOpacity: "0.55",
  };
}

describe("assembleScene", () => {
  it("assembles desert-night: produces defs and elements", () => {
    const out = assembleScene("desert-night", desertVars());
    expect(out.defs).toBeTruthy();
    expect(out.elements).toBeTruthy();
  });

  it("assembled desert-night contains expected fragment markers", () => {
    const out = assembleScene("desert-night", desertVars());
    // Sky gradient from sky-gradient.svg
    expect(out.defs).toContain("sg-grad");
    // Vignette from vignette-overlay.svg
    expect(out.defs).toContain("vo-grad");
    // Dunes silhouette paths
    expect(out.elements).toContain("<path");
  });

  it("assembled desert-night has all color tokens substituted", () => {
    const out = assembleScene("desert-night", desertVars());
    expect(out.defs).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    expect(out.elements).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
  });

  it("throws when a required token is missing from vars", () => {
    const incomplete = { skyTop: "#020105" }; // missing most tokens
    expect(() => assembleScene("desert-night", incomplete)).toThrow("missing variable");
  });
});
