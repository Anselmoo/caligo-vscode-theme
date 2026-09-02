import { describe, expect, it } from "vitest";
import type { DerivedPalette } from "../../lib/palette.js";
import {
  buildAllSpecs,
  extractWallpaperColors,
  thumbnailFilename,
  thumbnailSize,
  wallpaperFilename,
} from "../renderer.js";

// Minimal palette fixture — only the fields extractWallpaperColors reads
function makePalette(overrides: Partial<DerivedPalette> = {}): DerivedPalette {
  return {
    bg0: "#0b0c10",
    bg1: "#10121a",
    bg2: "#1a1c26",
    fg0: "#e6e6e6",
    fg1: "#c8c8c8",
    fg2: "#a0a0a0",
    fg3: "#787878",
    accent: "#5eb3f6",
    accentSoft: "#4a9fe0",
    accentMuted: "#2a6fa8",
    hueRed: "#e06c75",
    hueOrange: "#d19a66",
    hueYellow: "#e5c07b",
    hueGreen: "#98c379",
    hueCyan: "#56b6c2",
    hueBlue: "#61afef",
    huePurple: "#c678dd",
    harmony: {
      mode: "none",
      strings: "#98c379",
      keywords: "#c678dd",
      functions: "#61afef",
      types: "#56b6c2",
      variables: "#e06c75",
      constants: "#e5c07b",
      numbers: "#d19a66",
      tags: "#e06c75",
      attributes: "#d19a66",
    },
    ...overrides,
  } as DerivedPalette;
}

describe("extractWallpaperColors", () => {
  it("passes bg and accent colors through unchanged", () => {
    const palette = makePalette();
    const colors = extractWallpaperColors(palette);
    expect(colors.bg).toBe("#0b0c10");
    expect(colors.bgSoft).toBe("#10121a");
    expect(colors.accent).toBe("#5eb3f6");
    expect(colors.accentSoft).toBe("#4a9fe0");
    expect(colors.accentMuted).toBe("#2a6fa8");
  });

  it("uses palette hue* colors when harmony mode is 'none'", () => {
    const palette = makePalette({ harmony: { ...makePalette().harmony, mode: "none" } });
    const colors = extractWallpaperColors(palette);
    expect(colors.hueRed).toBe(palette.hueRed);
    expect(colors.hueOrange).toBe(palette.hueOrange);
    expect(colors.hueBlue).toBe(palette.hueBlue);
  });

  it("maps hue* to harmony roles when harmony mode is not 'none'", () => {
    const palette = makePalette({
      harmony: { ...makePalette().harmony, mode: "analogous" },
    });
    const colors = extractWallpaperColors(palette);
    // In non-none mode: hueRed → h.tags, hueOrange → h.numbers, huePurple → h.keywords
    expect(colors.hueRed).toBe(palette.harmony.tags);
    expect(colors.hueOrange).toBe(palette.harmony.numbers);
    expect(colors.huePurple).toBe(palette.harmony.keywords);
  });

  it("always uses harmony syntax roles directly", () => {
    const palette = makePalette();
    const colors = extractWallpaperColors(palette);
    expect(colors.strings).toBe(palette.harmony.strings);
    expect(colors.keywords).toBe(palette.harmony.keywords);
    expect(colors.functions).toBe(palette.harmony.functions);
    expect(colors.types).toBe(palette.harmony.types);
    expect(colors.variables).toBe(palette.harmony.variables);
    expect(colors.constants).toBe(palette.harmony.constants);
  });

  it("returns all required color keys", () => {
    const colors = extractWallpaperColors(makePalette());
    const required = [
      "bg",
      "bgSoft",
      "bgMid",
      "accent",
      "accentSoft",
      "accentMuted",
      "hueRed",
      "hueOrange",
      "hueYellow",
      "hueGreen",
      "hueCyan",
      "hueBlue",
      "huePurple",
      "strings",
      "keywords",
      "functions",
      "types",
      "variables",
      "constants",
      "numbers",
      "tags",
    ];
    for (const key of required) {
      expect(colors).toHaveProperty(key);
    }
  });
});

describe("wallpaperFilename", () => {
  it("builds path for monitor no-text", () => {
    const name = wallpaperFilename(
      {
        seedId: "Eclipse",
        harmonyMode: "balanced",
        platform: "monitor",
        textVariant: "no-text",
        seedDisplayName: "Eclipse",
        topic: "Balanced",
        displayName: "",
      },
      "svg"
    );
    expect(name).toBe("Eclipse/balanced/monitor.svg");
  });

  it("appends -text suffix for text variant", () => {
    const name = wallpaperFilename(
      {
        seedId: "Cinder",
        harmonyMode: "analogous",
        platform: "tablet",
        textVariant: "text",
        seedDisplayName: "Cinder",
        topic: "Balanced",
        displayName: "",
      },
      "png"
    );
    expect(name).toBe("Cinder/analogous/tablet-text.png");
  });

  it("normalises 'none' harmony mode to 'balanced'", () => {
    const name = wallpaperFilename(
      {
        seedId: "AuroraNoir",
        harmonyMode: "none",
        platform: "mobile",
        textVariant: "no-text",
        seedDisplayName: "AuroraNoir",
        topic: "Balanced",
        displayName: "",
      },
      "svg"
    );
    expect(name).toBe("AuroraNoir/balanced/mobile.svg");
  });
});

describe("buildAllSpecs", () => {
  const seeds = [
    { id: "Eclipse", displayName: "Eclipse", harmonyMode: "balanced" },
    { id: "Cinder", displayName: "Cinder", harmonyMode: "analogous" },
  ];

  it("produces 6 specs per seed (3 platforms × 2 text variants)", () => {
    const specs = buildAllSpecs(seeds);
    expect(specs).toHaveLength(12);
  });

  it("covers all platforms and text variants", () => {
    const specs = buildAllSpecs([seeds[0]]);
    const platforms = new Set(specs.map(s => s.platform));
    const variants = new Set(specs.map(s => s.textVariant));
    expect(platforms).toEqual(new Set(["monitor", "tablet", "mobile"]));
    expect(variants).toEqual(new Set(["no-text", "text"]));
  });

  it("sets seedId and seedDisplayName correctly", () => {
    const specs = buildAllSpecs([seeds[0]]);
    expect(specs.every(s => s.seedId === "Eclipse")).toBe(true);
    expect(specs.every(s => s.seedDisplayName === "Eclipse")).toBe(true);
  });

  it("returns empty array for empty seeds", () => {
    expect(buildAllSpecs([])).toHaveLength(0);
  });
});

// ─── Thumbnails ───────────────────────────────────────────────────────────────

describe("thumbnailFilename", () => {
  const base = {
    seedId: "Eclipse",
    seedDisplayName: "Eclipse",
    topic: "Balanced" as const,
    displayName: "Eclipse · Balanced",
  };

  it("emits a .webp path alongside the SVG", () => {
    expect(
      thumbnailFilename({
        ...base,
        harmonyMode: "analogous",
        platform: "monitor",
        textVariant: "no-text",
      })
    ).toBe("Eclipse/analogous/monitor.webp");
  });

  it("maps harmonyMode 'none' onto the 'balanced' folder, matching wallpaperFilename", () => {
    const spec = {
      ...base,
      harmonyMode: "none",
      platform: "monitor" as const,
      textVariant: "no-text" as const,
    };
    expect(thumbnailFilename(spec)).toBe("Eclipse/balanced/monitor.webp");
    expect(thumbnailFilename(spec)).toBe(wallpaperFilename(spec, "svg").replace(".svg", ".webp"));
  });

  it("keeps the -text suffix for the text variant", () => {
    expect(
      thumbnailFilename({
        ...base,
        harmonyMode: "triadic",
        platform: "mobile",
        textVariant: "text",
      })
    ).toBe("Eclipse/triadic/mobile-text.webp");
  });
});

describe("thumbnailSize", () => {
  it("scales a landscape monitor wallpaper to the long-edge budget", () => {
    expect(thumbnailSize("monitor", 640)).toEqual({ width: 640, height: 360 });
  });

  it("scales a portrait mobile wallpaper by its height, not its width", () => {
    // 1290x2796 is portrait — capping width at 640 would make a 1387px-tall thumb.
    expect(thumbnailSize("mobile", 640)).toEqual({ width: 295, height: 640 });
  });

  it("preserves the tablet aspect ratio", () => {
    expect(thumbnailSize("tablet", 640)).toEqual({ width: 640, height: 480 });
  });

  it("never rounds a dimension down to zero", () => {
    const { width, height } = thumbnailSize("mobile", 1);
    expect(width).toBeGreaterThanOrEqual(1);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});
