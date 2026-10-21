import { describe, expect, it } from "vitest";
import type { ThemeIndexEntry } from "../../types/theme.js";
import { EXPORT_FORMATTERS, getFormatter } from "../formatter-registry.js";
import { sourceFromTheme } from "../shared.js";

function makeEntry(overrides: Partial<ThemeIndexEntry> = {}): ThemeIndexEntry {
  // Deep Sable (Balanced) as shipped: keywords are cyan, types orange, functions yellow, strings pink
  return {
    key: "Caligo-DeepSable",
    seedId: "DeepSable",
    seedSlug: "deepsable",
    seedLabel: "Deep Sable",
    harmonyId: "balanced",
    harmonyLabel: "Balanced",
    displayName: "Deep Sable",
    colors: {
      bg0: "#0f0e17",
      bg1: "#14131d",
      bg2: "#1a1925",
      fg0: "#e6e4f0",
      fg1: "#c9c7d6",
      fgMuted: "#8a889a",
      accent: "#3b9cf6",
      error: "#ff9687",
      warning: "#e2aa00",
      success: "#00ce39",
      info: "#73dfff",
      strings: "#ffc8cf",
      types: "#ce8545",
      functions: "#d1d473",
      keywords: "#71fff7",
      decorator: "#b79cff",
    },
    core: [
      {
        key: "bg0",
        label: "Background Primary",
        hex: "#0f0e17",
        oklch: { l: 0.1, c: 0.02, h: 290 },
      },
      { key: "keywords", label: "Keywords", hex: "#71fff7", oklch: { l: 0.9, c: 0.13, h: 190 } },
    ],
    oklch: {
      accent: { l: 0.65, c: 0.15, h: 250 },
      bg: { l: 0.1, c: 0.02, h: 290 },
      fg: { l: 0.9, c: 0.02, h: 290 },
    },
    ...overrides,
  };
}

const balanced = makeEntry();
const analogous = makeEntry({
  key: "Caligo-DeepSableAnalogous",
  harmonyId: "analogous",
  harmonyLabel: "Analogous",
  colors: {
    ...balanced.colors,
    keywords: "#ff9ec4",
    types: "#c8a2ff",
    functions: "#9fe0a8",
    strings: "#f2d98a",
  },
});

const flat = (entry: ThemeIndexEntry) =>
  JSON.parse(getFormatter("json-flat").generate(sourceFromTheme(entry)).content) as Record<
    string,
    string
  >;

describe("export formatters", () => {
  const source = sourceFromTheme(balanced);

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
    const result = getFormatter("css-custom-properties").generate(source);
    expect(result.content).toContain("/* Caligo — Deep Sable (Balanced) */");
    expect(result.content).toContain("--caligo-bg-base:");
    expect(result.content).toContain("--caligo-syntax-keywords:");
    expect(result.content).toContain("--caligo-accent:");
    expect(result.content).toContain("--caligo-warning: #e2aa00;");
  });

  it("generates W3C design tokens with color metadata", () => {
    const result = getFormatter("design-tokens-w3c").generate(source);
    const parsed = JSON.parse(result.content) as {
      caligo: { background: { base: { $value: { colorSpace: string; channels: number[] } } } };
    };
    expect(parsed.caligo.background.base.$value.colorSpace).toBe("srgb");
    expect(parsed.caligo.background.base.$value.channels).toHaveLength(3);
  });

  it("generates grouped and flat json variants", () => {
    const grouped = JSON.parse(getFormatter("json-grouped").generate(source).content) as {
      backgrounds: { "bg-base": string };
    };

    expect(grouped.backgrounds["bg-base"]).toBe(balanced.colors.bg0);
    expect(flat(balanced)["bg-base"]).toBe(balanced.colors.bg0);
  });

  it("uses the oklch from core where listed and computes it from the hex otherwise", () => {
    const css = getFormatter("css-oklch").generate(source).content;
    expect(css).toContain("--caligo-syntax-keywords: oklch(0.900 0.130 190.0);");
    // not in `core`: computed from #ff9687, a warm red, so hue is far from the cyan above
    const error = /--caligo-error: oklch\(([\d.]+) ([\d.]+) ([\d.]+)\);/.exec(css);
    expect(error).not.toBeNull();
    expect(Number(error?.[3])).toBeGreaterThan(10);
    expect(Number(error?.[3])).toBeLessThan(40);
  });
});

describe("export emits the shipped colours", () => {
  it("syntax tokens equal entry.colors, not slot-name guesses (Deep Sable regression)", () => {
    const out = flat(balanced);
    expect(out["syntax-keywords"]).toBe(balanced.colors.keywords);
    expect(out["syntax-types"]).toBe(balanced.colors.types);
    expect(out["syntax-functions"]).toBe(balanced.colors.functions);
    expect(out["syntax-strings"]).toBe(balanced.colors.strings);
    expect(out["syntax-decorator"]).toBe(balanced.colors.decorator);
    // the old export said keywords #73ccff, types #d1d473, functions #ffc8cf, strings #ce8545
    expect(out["syntax-keywords"]).toBe("#71fff7");
    expect(out["syntax-types"]).toBe("#ce8545");
    expect(out["syntax-functions"]).toBe("#d1d473");
    expect(out["syntax-strings"]).toBe("#ffc8cf");
  });

  it("exports backgrounds, foregrounds, semantic and accent from the same entry", () => {
    const out = flat(balanced);
    expect(out["bg-base"]).toBe(balanced.colors.bg0);
    expect(out["bg-surface"]).toBe(balanced.colors.bg1);
    expect(out["bg-elevated"]).toBe(balanced.colors.bg2);
    expect(out["fg-primary"]).toBe(balanced.colors.fg0);
    expect(out["fg-secondary"]).toBe(balanced.colors.fg1);
    expect(out["fg-muted"]).toBe(balanced.colors.fgMuted);
    expect(out.error).toBe(balanced.colors.error);
    expect(out.warning).toBe(balanced.colors.warning);
    expect(out.success).toBe(balanced.colors.success);
    expect(out.info).toBe(balanced.colors.info);
    expect(out.accent).toBe(balanced.colors.accent);
  });

  it("a non-balanced harmony exports its own colours, not the balanced ones", () => {
    const out = flat(analogous);
    expect(out["syntax-keywords"]).toBe("#ff9ec4");
    expect(out["syntax-types"]).toBe("#c8a2ff");
    expect(out["syntax-functions"]).toBe("#9fe0a8");
    expect(out["syntax-strings"]).toBe("#f2d98a");
    expect(out["syntax-keywords"]).not.toBe(flat(balanced)["syntax-keywords"]);
    expect(sourceFromTheme(analogous).title).toBe("Deep Sable (Analogous)");
  });

  it("keeps the token names unchanged", () => {
    const names = Object.keys(flat(balanced));
    expect(names).toEqual([
      "bg-base",
      "bg-surface",
      "bg-elevated",
      "fg-primary",
      "fg-secondary",
      "fg-muted",
      "syntax-keywords",
      "syntax-types",
      "syntax-functions",
      "syntax-strings",
      "syntax-decorator",
      "error",
      "warning",
      "success",
      "info",
      "accent",
    ]);
  });
});
