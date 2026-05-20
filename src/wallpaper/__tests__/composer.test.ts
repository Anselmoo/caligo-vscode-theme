import { describe, expect, it } from "vitest";
import { mergeBricks, toSvgDocument } from "../composer.js";

describe("mergeBricks", () => {
  it("combines elements from multiple bricks", () => {
    const result = mergeBricks([{ elements: "<rect/>" }, { elements: "<circle/>" }]);
    expect(result.elements).toContain("<rect/>");
    expect(result.elements).toContain("<circle/>");
  });

  it("combines defs from multiple bricks", () => {
    const result = mergeBricks([
      { defs: '<linearGradient id="g1"/>', elements: "" },
      { defs: '<linearGradient id="g2"/>', elements: "" },
    ]);
    expect(result.defs).toContain('id="g1"');
    expect(result.defs).toContain('id="g2"');
  });

  it("deduplicates defs with the same id — first wins", () => {
    const result = mergeBricks([
      {
        defs: '<filter id="blur"><feGaussianBlur stdDeviation="4"/></filter>',
        elements: "<g filter='url(#blur)'/>",
      },
      {
        defs: '<filter id="blur"><feGaussianBlur stdDeviation="8"/></filter>',
        elements: "<g filter='url(#blur)'/>",
      },
    ]);
    expect(result.defs).toContain('stdDeviation="4"');
    expect(result.defs).not.toContain('stdDeviation="8"');
  });

  it("handles bricks with no defs", () => {
    const result = mergeBricks([{ elements: "<rect/>" }, { elements: "<line/>" }]);
    expect(result.defs).toBe("");
  });

  it("handles bricks with no elements", () => {
    const result = mergeBricks([{ defs: '<filter id="f1"/>' }]);
    expect(result.elements).toBe("");
  });

  it("returns empty result for empty input", () => {
    const result = mergeBricks([]);
    expect(result.defs).toBe("");
    expect(result.elements).toBe("");
  });

  it("trims whitespace from defs and elements", () => {
    const result = mergeBricks([{ defs: "  <filter id='f'/>  ", elements: "  <rect/>  " }]);
    expect(result.defs).toBe("<filter id='f'/>");
    expect(result.elements).toBe("<rect/>");
  });
});

describe("toSvgDocument", () => {
  const viewBox = { width: 3840, height: 2160 };

  it("produces a valid SVG root element", () => {
    const svg = toSvgDocument({ defs: "", elements: "<rect/>" }, viewBox);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="3840"');
    expect(svg).toContain('height="2160"');
    expect(svg).toContain('viewBox="0 0 3840 2160"');
  });

  it("includes an XML declaration", () => {
    const svg = toSvgDocument({ defs: "", elements: "" }, viewBox);
    expect(svg).toMatch(/^<\?xml version="1\.0"/);
  });

  it("wraps defs in a <defs> block when present", () => {
    const svg = toSvgDocument({ defs: '<filter id="f"/>', elements: "<rect/>" }, viewBox);
    expect(svg).toContain("<defs>");
    expect(svg).toContain('id="f"');
    expect(svg).toContain("</defs>");
  });

  it("omits <defs> block when defs is empty", () => {
    const svg = toSvgDocument({ defs: "", elements: "<rect/>" }, viewBox);
    expect(svg).not.toContain("<defs>");
  });

  it("includes elements in output", () => {
    const svg = toSvgDocument({ defs: "", elements: '<circle cx="50" cy="50" r="10"/>' }, viewBox);
    expect(svg).toContain('<circle cx="50"');
  });

  it("scales correctly for tablet viewport", () => {
    const svg = toSvgDocument({ defs: "", elements: "" }, { width: 1668, height: 2388 });
    expect(svg).toContain('width="1668"');
    expect(svg).toContain('height="2388"');
  });
});
