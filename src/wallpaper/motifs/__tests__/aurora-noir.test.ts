import { describe, expect, it } from "vitest";
import type { BrickParams, WallpaperColors } from "../../types.js";
import { auroraNoir } from "../aurora-noir.js";

function createColors(): WallpaperColors {
  return {
    bg: "#000000",
    bgSoft: "#111111",
    bgMid: "#222222",
    accent: "#33aaff",
    accentSoft: "#66bbff",
    accentMuted: "#335577",
    hueRed: "#ff0000",
    hueOrange: "#ff8800",
    hueYellow: "#ffff00",
    hueGreen: "#00ff00",
    hueCyan: "#00ffff",
    hueBlue: "#0000ff",
    huePurple: "#aa00ff",
    strings: "#00ff88",
    keywords: "#ff66cc",
    functions: "#66ccff",
    types: "#ffaa66",
    variables: "#cccccc",
  };
}

describe("auroraNoir motif", () => {
  it("uses reference template for monitor platform", () => {
    const params: BrickParams = {
      viewBox: { width: 3840, height: 2160 },
      colors: createColors(),
      seedId: "AuroraNoir",
      harmonyMode: "split-complementary",
      platform: "monitor",
    };

    const composed = auroraNoir(params);
    // Template produces skyGradient and aurora gradients in defs
    expect(composed.defs).toContain('id="skyGradient"');
    expect(composed.defs).toContain('id="aurora1"');
    // Elements are wrapped in a scale transform for 3840×2160
    expect(composed.elements).toContain('transform="scale(2.400000, 2.400000)"');
  });

  it("uses procedural bricks for mobile platform (portrait fallback)", () => {
    const params: BrickParams = {
      viewBox: { width: 1290, height: 2796 },
      colors: createColors(),
      seedId: "AuroraNoir",
      harmonyMode: "split-complementary",
      platform: "mobile",
    };

    const composed = auroraNoir(params);
    // Procedural split-complementary path uses bloomEllipseBrick
    expect(composed.defs).toContain('id="an-b-bloom"');
    expect(composed.elements).toContain('filter="url(#an-b-bloom)"');
  });

  it("all 5 modes produce non-empty output on monitor", () => {
    const modes = ["none", "analogous", "split-complementary", "monochromatic", "triadic"];
    for (const mode of modes) {
      const params: BrickParams = {
        viewBox: { width: 3840, height: 2160 },
        colors: createColors(),
        seedId: "AuroraNoir",
        harmonyMode: mode,
        platform: "monitor",
      };
      const composed = auroraNoir(params);
      expect(composed.defs.length).toBeGreaterThan(0);
      expect(composed.elements.length).toBeGreaterThan(0);
    }
  });
});
