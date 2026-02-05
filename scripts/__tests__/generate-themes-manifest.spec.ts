import { describe, expect, it } from "vitest";

import { extractManifestColors } from "../generate-themes-manifest";

describe("generate-themes-manifest: extractManifestColors", () => {
  it("does not misclassify keyword storage.type as the Types color", () => {
    const themeContent = {
      colors: {
        "editor.background": "#100f20",
        "sideBar.background": "#141425",
        "input.background": "#19182a",
        "editor.foreground": "#cecfe4",
        foreground: "#afafc3",
        "editorLineNumber.foreground": "#9090a28c",
        focusBorder: "#3b9cf6",
        "editorError.foreground": "#f04f40",
      },
      tokenColors: [
        {
          name: "Keywords",
          scope: ["keyword", "storage.type", "storage.modifier"],
          settings: { foreground: "#00b7b0" },
        },
        {
          name: "Functions",
          scope: ["entity.name.function", "support.function"],
          settings: { foreground: "#a9ab4a" },
        },
        {
          name: "Types",
          scope: ["entity.name.type", "support.type"],
          settings: { foreground: "#db9152" },
        },
      ],
    };

    const extracted = extractManifestColors(themeContent);

    expect(extracted.keywords).toBe("#00b7b0");
    expect(extracted.types).toBe("#db9152");
    expect(extracted.types).not.toBe(extracted.keywords);
  });

  it("prefers inner-surface colors for bg2 (e.g. input.background)", () => {
    const themeContent = {
      colors: {
        "editor.background": "#100f20",
        "sideBar.background": "#141425",
        "panel.background": "#141425",
        "input.background": "#19182a",
        "editor.foreground": "#cecfe4",
      },
      tokenColors: [],
    };

    const extracted = extractManifestColors(themeContent);

    expect(extracted.bg0).toBe("#100f20");
    expect(extracted.bg1).toBe("#141425");
    expect(extracted.bg2).toBe("#19182a");
    expect(extracted.bg2).not.toBe(extracted.bg1);
  });
});
