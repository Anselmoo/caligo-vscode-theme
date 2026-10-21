import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { extractManifestColors } from "../../scripts/generate-themes-manifest";

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

  it("does not read the comment colour as Strings when a comment rule carries string.comment", () => {
    const extracted = extractManifestColors({
      colors: { "editor.background": "#100f20" },
      tokenColors: [
        {
          name: "Comments",
          scope: ["comment", "punctuation.definition.comment", "string.comment"],
          settings: { foreground: "#9090a2bf" },
        },
        { name: "Strings", scope: ["string"], settings: { foreground: "#ffc8cf" } },
      ],
    });

    expect(extracted.strings).toBe("#ffc8cf");
  });
});

// Every role the site shows must be the colour VS Code paints for that scope.
describe("generate-themes-manifest: roles match the shipped themes", () => {
  const themesDir = join(process.cwd(), "themes");
  const files = readdirSync(themesDir).filter(f => f.startsWith("Caligo-") && f.endsWith(".json"));
  const exact = (
    theme: { tokenColors?: { scope?: string | string[]; settings?: { foreground?: string } }[] },
    scope: string
  ) =>
    theme.tokenColors?.find(t => ([] as string[]).concat(t.scope ?? []).includes(scope))?.settings
      ?.foreground;

  it("covers all 50 themes", () => {
    expect(files).toHaveLength(50);
  });

  it.each(files)("%s", file => {
    const theme = JSON.parse(readFileSync(join(themesDir, file), "utf-8"));
    const extracted = extractManifestColors(theme);
    expect(extracted.strings).toBe(exact(theme, "string"));
    expect(extracted.keywords).toBe(exact(theme, "keyword"));
    expect(extracted.types).toBe(exact(theme, "entity.name.type"));
    expect(extracted.functions).toBe(exact(theme, "entity.name.function"));
  });
});
