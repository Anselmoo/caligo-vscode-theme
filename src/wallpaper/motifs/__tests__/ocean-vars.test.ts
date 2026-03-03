import { describe, expect, it } from "vitest";
import type { WallpaperColors } from "../../types.js";
import { buildOceanNightVars } from "../ocean-vars.js";

const REQUIRED_TOKENS = [
  "skyTop",
  "skyMid",
  "skyBottom",
  "starWhite",
  "starFaint",
  "starBlue",
  "moonSurface",
  "moonGlow",
  "moonCorona",
  "seaDeep",
  "seaMid",
  "moonReflection",
  "waveEdge",
  "waveColor",
  "foamColor",
  "hazeColor",
  "hazeOpacity",
  "vignetteColor",
  "vignetteOpacity",
] as const;

function makeColors(): WallpaperColors {
  return {
    bg: "#020814",
    bgSoft: "#0a1a3a",
    bgMid: "#061228",
    accent: "#0066ff",
    accentSoft: "#4499ff",
    accentMuted: "#001133",
    hueRed: "#ff2244",
    hueOrange: "#ff8822",
    hueYellow: "#ffee44",
    hueGreen: "#00cc88",
    hueCyan: "#00ddff",
    hueBlue: "#0055ee",
    huePurple: "#8855cc",
    strings: "#00cc88",
    keywords: "#0066ff",
    functions: "#00ddff",
    types: "#44aaff",
    variables: "#aaccdd",
  };
}

describe("buildOceanNightVars", () => {
  it("produces all 19 required tokens", () => {
    const vars = buildOceanNightVars(makeColors(), "none");
    for (const token of REQUIRED_TOKENS) {
      expect(vars).toHaveProperty(token);
    }
  });

  it("all hex color tokens are valid 6-digit hex", () => {
    const vars = buildOceanNightVars(makeColors(), "none");
    for (const token of REQUIRED_TOKENS) {
      if (token.endsWith("Opacity")) continue;
      expect(vars[token], `token '${token}'`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("opacity tokens are numeric string in (0,1]", () => {
    const vars = buildOceanNightVars(makeColors(), "none");
    const haze = Number.parseFloat(vars.hazeOpacity);
    const vig = Number.parseFloat(vars.vignetteOpacity);
    expect(haze).toBeGreaterThan(0);
    expect(haze).toBeLessThanOrEqual(1);
    expect(vig).toBeGreaterThan(0);
    expect(vig).toBeLessThanOrEqual(1);
  });

  it("sea deep and moon reflection are distinct colors", () => {
    const vars = buildOceanNightVars(makeColors(), "none");
    expect(vars.seaDeep).not.toBe(vars.moonReflection);
  });

  it("moon glow differs per mode (cool vs vivid)", () => {
    const colors = makeColors();
    const still = buildOceanNightVars(colors, "none");
    const pulse = buildOceanNightVars(colors, "triadic");
    expect(still.moonCorona).not.toBe(pulse.moonCorona);
  });

  it("all tokens have no undefined or empty values across all modes", () => {
    for (const mode of ["none", "analogous", "split-complementary", "monochromatic", "triadic"]) {
      const vars = buildOceanNightVars(makeColors(), mode);
      for (const [key, value] of Object.entries(vars)) {
        expect(value, `token '${key}' mode '${mode}'`).toBeTruthy();
      }
    }
  });
});
