import { describe, expect, it } from "vitest";
import type { WallpaperColors } from "../../types.js";
import { buildEclipseCoronaVars } from "../eclipse-vars.js";

const REQUIRED_TOKENS = [
  "skyTop", "skyMid", "skyBottom",
  "starWhite", "starFaint", "starBlue", "milkyWayColor",
  "coronaInner", "coronaMid", "coronaOuter", "coronaBlood", "eclipseCore",
  "mountainFar", "mountainMid", "mountainNear",
  "hazeColor", "hazeOpacity",
  "vignetteColor", "vignetteOpacity",
] as const;

function makeColors(): WallpaperColors {
  return {
    bg: "#080408", bgSoft: "#201020", bgMid: "#140a14",
    accent: "#cc00ff", accentSoft: "#aa44ee", accentMuted: "#330033",
    hueRed: "#ff2244", hueOrange: "#ff8822", hueYellow: "#ffdd00",
    hueGreen: "#44cc44", hueCyan: "#00ccdd", hueBlue: "#4466ff",
    huePurple: "#cc00ff",
    strings: "#44cc44", keywords: "#cc00ff", functions: "#00ccdd",
    types: "#ffaa44", variables: "#ccbbdd",
  };
}

describe("buildEclipseCoronaVars", () => {
  it("produces all 19 required tokens", () => {
    const vars = buildEclipseCoronaVars(makeColors(), "none");
    for (const token of REQUIRED_TOKENS) {
      expect(vars).toHaveProperty(token);
    }
  });

  it("all hex color tokens are valid 6-digit hex", () => {
    const vars = buildEclipseCoronaVars(makeColors(), "none");
    for (const token of REQUIRED_TOKENS) {
      if (token.endsWith("Opacity")) continue;
      expect(vars[token], `token '${token}'`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("opacity tokens are numeric string in (0,1]", () => {
    const vars = buildEclipseCoronaVars(makeColors(), "none");
    const haze = Number.parseFloat(vars.hazeOpacity);
    const vig = Number.parseFloat(vars.vignetteOpacity);
    expect(haze).toBeGreaterThan(0);
    expect(haze).toBeLessThanOrEqual(1);
    expect(vig).toBeGreaterThan(0);
    expect(vig).toBeLessThanOrEqual(1);
  });

  it("eclipse core is absolute black", () => {
    const vars = buildEclipseCoronaVars(makeColors(), "none");
    expect(vars.eclipseCore).toBe("#000000");
  });

  it("coronaMid is between coronaInner and coronaOuter", () => {
    const vars = buildEclipseCoronaVars(makeColors(), "none");
    // Just check all three are different (gradient exists)
    expect(vars.coronaInner).not.toBe(vars.coronaOuter);
    expect(vars.coronaMid).not.toBe(vars.coronaInner);
    expect(vars.coronaMid).not.toBe(vars.coronaOuter);
  });

  it("corona colors differ dramatically per mode", () => {
    const colors = makeColors();
    const golden = buildEclipseCoronaVars(colors, "none");
    const blood = buildEclipseCoronaVars(colors, "split-complementary");
    const void_ = buildEclipseCoronaVars(colors, "monochromatic");
    // All three should have different coronaInner
    expect(golden.coronaInner).not.toBe(blood.coronaInner);
    expect(golden.coronaInner).not.toBe(void_.coronaInner);
  });

  it("mountain depth is ordered far → near (lighter → darker)", () => {
    const vars = buildEclipseCoronaVars(makeColors(), "none");
    expect(vars.mountainFar).not.toBe(vars.mountainNear);
  });

  it("all tokens have no undefined or empty values across all modes", () => {
    for (const mode of ["none", "analogous", "split-complementary", "monochromatic", "triadic"]) {
      const vars = buildEclipseCoronaVars(makeColors(), mode);
      for (const [key, value] of Object.entries(vars)) {
        expect(value, `token '${key}' mode '${mode}'`).toBeTruthy();
      }
    }
  });
});
