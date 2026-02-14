import { describe, expect, it } from "vitest";
import type { Seed } from "../../core/constraints.js";
import { derivePalette } from "../../core/palette.js";
import { EXPORT_FORMATTERS, getFormatter } from "../formatter-registry.js";

const seed: Seed = {
  id: "TestSeed",
  displayName: "Test Seed",
  background: { mode: "oklch", l: 0.18, c: 0.03, h: 220 },
  accent: { mode: "oklch", l: 0.7, c: 0.15, h: 215 },
};

describe("export formatters", () => {
  const palette = derivePalette(seed, "Balanced");

  it("registers all expected export formats", () => {
    expect(EXPORT_FORMATTERS.map(item => item.format)).toEqual([
      "css-custom-properties",
      "css-oklch",
      "scss-variables",
      "design-tokens-w3c",
      "tailwind-config",
      "json-flat",
      "json-grouped",
    ]);
  });

  it("generates css custom properties with semantic names", () => {
    const result = getFormatter("css-custom-properties").generate(palette);
    expect(result.content).toContain("--caligo-bg-base:");
    expect(result.content).toContain("--caligo-syntax-keywords:");
    expect(result.content).toContain("--caligo-accent:");
  });

  it("generates W3C design tokens with color metadata", () => {
    const result = getFormatter("design-tokens-w3c").generate(palette);
    const parsed = JSON.parse(result.content) as {
      caligo: { background: { base: { $value: { colorSpace: string; channels: number[] } } } };
    };
    expect(parsed.caligo.background.base.$value.colorSpace).toBe("srgb");
    expect(parsed.caligo.background.base.$value.channels).toHaveLength(3);
  });

  it("generates grouped and flat json variants", () => {
    const grouped = JSON.parse(getFormatter("json-grouped").generate(palette).content) as {
      backgrounds: { "bg-base": string };
    };
    const flat = JSON.parse(getFormatter("json-flat").generate(palette).content) as {
      "bg-base": string;
    };

    expect(grouped.backgrounds["bg-base"]).toBe(palette.bg0);
    expect(flat["bg-base"]).toBe(palette.bg0);
  });
});
