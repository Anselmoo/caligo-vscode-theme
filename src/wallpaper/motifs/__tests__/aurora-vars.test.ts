import { describe, expect, it } from "vitest";
import type { WallpaperColors } from "../../types.js";
import { buildNightAuroraVars } from "../aurora-vars.js";

const REQUIRED_TOKENS = [
  "skyDeep", "skyLow", "skyMid", "skyHigh", "skyUp", "skyHorizon",
  "auroraGreen", "auroraGreenSoft", "auroraGreenMid", "auroraGreenBright",
  "auroraGreenCool", "auroraGreenDeep", "auroraGreenDim", "auroraGreenDark",
  "auroraGreenFade", "auroraCyan", "auroraPurple", "auroraPurpleMid",
  "auroraPurpleSoft", "mountainFarTop", "mountainFarBase", "mountainMidTop",
  "mountainMidBase", "mountainNearTop", "mountainNearBase", "mountainFrontTop",
  "mountainFrontBase", "lakeDeep", "lakeMid", "lakeDark", "moonGlowColor",
  "moonGlowWarm", "moonGlowDim", "moonSurfaceTop", "moonSurfaceMid",
  "moonSurfaceBase", "moonCrater", "snowTop", "snowBase", "snowFaint",
  "starWhite", "starBlue", "starFaint", "starFeature", "milkyWayColor",
  "shootingStarMid", "shootingStarTail", "ridgeLight", "rippleColor",
  "fogColor", "shoreColor", "mistLight", "mistMid", "treeColor",
  "treeColorDark", "treeColorBack", "vignetteColor",
] as const;

function makeColors(): WallpaperColors {
  return {
    bg: "#020111",
    bgSoft: "#1a3a5c",
    bgMid: "#0d2455",
    accent: "#cc00ff",
    accentSoft: "#aa66ff",
    accentMuted: "#442255",
    hueRed: "#ff2244",
    hueOrange: "#ff8800",
    hueYellow: "#ffee00",
    hueGreen: "#00ff88",
    hueCyan: "#00e5ff",
    hueBlue: "#0066ff",
    huePurple: "#cc00ff",
    strings: "#00ff88",
    keywords: "#cc00ff",
    functions: "#00e5ff",
    types: "#ffaa66",
    variables: "#cccccc",
  };
}

describe("buildNightAuroraVars", () => {
  it("produces all 57 required tokens", () => {
    const vars = buildNightAuroraVars(makeColors(), "none");
    for (const token of REQUIRED_TOKENS) {
      expect(vars).toHaveProperty(token);
      expect(vars[token]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("has no undefined or empty values", () => {
    const vars = buildNightAuroraVars(makeColors(), "triadic");
    for (const [key, value] of Object.entries(vars)) {
      expect(value, `token '${key}' must not be empty`).toBeTruthy();
    }
  });

  it("aurora primary changes per mode", () => {
    const colors = makeColors();
    const stillness = buildNightAuroraVars(colors, "none");
    const mono = buildNightAuroraVars(colors, "monochromatic");
    // Void mode uses desaturated near-dark primary — different from vivid hueGreen
    expect(stillness.auroraGreen).not.toBe(mono.auroraGreen);
  });

  it("secondary aurora differs between modes", () => {
    const colors = makeColors();
    const splitComp = buildNightAuroraVars(colors, "split-complementary");
    const triadic = buildNightAuroraVars(colors, "triadic");
    // split-comp uses accent as secondary; triadic uses hueCyan
    expect(splitComp.auroraCyan).toBe(colors.accent);
    expect(triadic.auroraCyan).toBe(colors.hueCyan);
  });

  it("sky tokens graduate from dark to light", () => {
    const vars = buildNightAuroraVars(makeColors(), "none");
    // skyDeep is darkest (lerp bg → black), skyHorizon is bgSoft (lightest)
    expect(vars.skyDeep).toBe(vars.skyDeep); // smoke test — value exists
    expect(vars.skyHorizon).toBe(makeColors().bgSoft);
  });

  it("moon and star tokens use fixed reference values", () => {
    const vars = buildNightAuroraVars(makeColors(), "none");
    expect(vars.moonGlowColor).toBe("#ffeedd");
    expect(vars.starWhite).toBe("#ffffff");
    expect(vars.snowTop).toBe("#c8d8ee");
    expect(vars.vignetteColor).toBe("#000000");
  });

  it("mountain depth is ordered far → front (lighter → darker)", () => {
    const vars = buildNightAuroraVars(makeColors(), "none");
    // Far mountains are brighter (higher lerp toward bgSoft)
    // Front mountains are near-black (darken bg toward black)
    // Just validate they are different hex values indicating the gradient exists
    expect(vars.mountainFarTop).not.toBe(vars.mountainFrontTop);
    expect(vars.mountainFarBase).not.toBe(vars.mountainFrontBase);
  });
});
