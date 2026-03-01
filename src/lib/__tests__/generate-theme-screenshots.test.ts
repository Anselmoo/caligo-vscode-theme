import { describe, expect, it } from "vitest";

import { resolveTokenColor } from "../screenshot-token-colors";

describe("generate-theme-screenshots: resolveTokenColor", () => {
  it("prefers semantic token colors when semantic highlighting is enabled", () => {
    const theme = {
      name: "Test",
      colors: {
        "editor.background": "#000000",
        "editor.foreground": "#ffffff",
      },
      semanticHighlighting: true,
      semanticTokenColors: {
        type: "#112233",
      },
      tokenColors: [
        {
          scope: ["entity.name.type"],
          settings: { foreground: "#445566" },
        },
      ],
    };

    expect(resolveTokenColor(theme, ["type"], ["entity.name.type"], "#778899")).toBe("#112233");
  });

  it("falls back to TextMate token colors when semantic token color is unavailable", () => {
    const theme = {
      name: "Test",
      colors: {
        "editor.background": "#000000",
        "editor.foreground": "#ffffff",
      },
      semanticHighlighting: true,
      semanticTokenColors: {},
      tokenColors: [
        {
          scope: ["entity.name.function"],
          settings: { foreground: "#aabbcc" },
        },
      ],
    };

    expect(resolveTokenColor(theme, ["function"], ["entity.name.function"], "#778899")).toBe(
      "#aabbcc"
    );
  });

  it("supports semantic token object form with foreground", () => {
    const theme = {
      name: "Test",
      colors: {
        "editor.background": "#000000",
        "editor.foreground": "#ffffff",
      },
      semanticHighlighting: true,
      semanticTokenColors: {
        method: { foreground: "#123abc" },
      },
      tokenColors: [],
    };

    expect(resolveTokenColor(theme, ["method"], ["entity.name.function"], "#778899")).toBe(
      "#123abc"
    );
  });
});
