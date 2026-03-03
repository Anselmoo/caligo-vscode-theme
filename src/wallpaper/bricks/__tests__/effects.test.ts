import { describe, expect, it } from "vitest";
import type { BrickParams, WallpaperColors } from "../../types.js";
import { bloomEllipseBrick } from "../effects.js";

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

function createParams(): BrickParams {
  return {
    viewBox: { width: 3840, height: 2160 },
    colors: createColors(),
    seedId: "TestSeed",
    harmonyMode: "none",
    platform: "monitor",
  };
}

describe("bloomEllipseBrick", () => {
  it("creates reusable bloom defs and ellipse elements", () => {
    const output = bloomEllipseBrick(createParams(), {
      id: "test-bloom",
      cx: 0.5,
      cy: 0.35,
      rx: 0.15,
      ry: 0.25,
      color: "#33aaff",
      opacity: 0.12,
      blurRatio: 0.02,
    });

    expect(output.defs).toContain('id="test-bloom"');
    expect(output.defs).toContain('stdDeviation="76.8"');
    expect(output.elements).toContain('filter="url(#test-bloom)"');
    expect(output.elements).toContain('cx="1920"');
    expect(output.elements).toContain('cy="756"');
  });
});
