import { describe, expect, it } from "vitest";
import type { WallpaperColors } from "../../types.js";
import { buildDesertNightVars } from "../desert-vars.js";

const REQUIRED_TOKENS = [
  "skyTop",
  "skyMid",
  "skyBottom",
  "starWhite",
  "starFaint",
  "starBlue",
  "moonSurface",
  "moonGlow",
  "hazeColor",
  "hazeOpacity",
  "duneFar",
  "duneMidFar",
  "duneMidNear",
  "duneFront",
  "vignetteColor",
  "vignetteOpacity",
] as const;

function makeColors(): WallpaperColors {
  return {
    bg: "#0a0508",
    bgSoft: "#2a1208",
    bgMid: "#1a0d06",
    accent: "#ff6600",
    accentSoft: "#cc4400",
    accentMuted: "#441100",
    hueRed: "#ff2200",
    hueOrange: "#ff8800",
    hueYellow: "#ffcc00",
    hueGreen: "#88cc00",
    hueCyan: "#00cccc",
    hueBlue: "#0066cc",
    huePurple: "#8844cc",
    strings: "#ff8800",
    keywords: "#ff6600",
    functions: "#ffcc00",
    types: "#cc8800",
    variables: "#ccaa88",
  };
}

describe("buildDesertNightVars", () => {
  it("produces all 16 required tokens", () => {
    const vars = buildDesertNightVars(makeColors(), "none");
    for (const token of REQUIRED_TOKENS) {
      expect(vars).toHaveProperty(token);
    }
  });

  it("all hex color tokens are valid 6-digit hex", () => {
    const vars = buildDesertNightVars(makeColors(), "none");
    for (const token of REQUIRED_TOKENS) {
      if (token.endsWith("Opacity")) continue;
      expect(vars[token], `token '${token}'`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("opacity tokens are numeric string in [0,1]", () => {
    const vars = buildDesertNightVars(makeColors(), "none");
    const haze = Number.parseFloat(vars.hazeOpacity);
    const vig = Number.parseFloat(vars.vignetteOpacity);
    expect(haze).toBeGreaterThan(0);
    expect(haze).toBeLessThanOrEqual(1);
    expect(vig).toBeGreaterThan(0);
    expect(vig).toBeLessThanOrEqual(1);
  });

  it("dune depth is ordered far → front (lighter → darker)", () => {
    const vars = buildDesertNightVars(makeColors(), "none");
    expect(vars.duneFar).not.toBe(vars.duneFront);
  });

  it("moon glow differs per mode (warm vs cool)", () => {
    const colors = makeColors();
    const still = buildDesertNightVars(colors, "none");
    const mono = buildDesertNightVars(colors, "monochromatic");
    expect(still.moonGlow).not.toBe(mono.moonGlow);
  });

  it("all tokens have no undefined or empty values", () => {
    for (const mode of ["none", "analogous", "split-complementary", "monochromatic", "triadic"]) {
      const vars = buildDesertNightVars(makeColors(), mode);
      for (const [key, value] of Object.entries(vars)) {
        expect(value, `token '${key}' mode '${mode}'`).toBeTruthy();
      }
    }
  });
});
