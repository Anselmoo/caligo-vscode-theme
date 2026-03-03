import { describe, expect, it } from "vitest";
import { fmtCoord, fmtLength, fmtOpacity, fmtPercent, fmtStroke } from "../svg-format.js";

describe("wallpaper svg-format", () => {
  it("formats coordinates with shared precision and trimmed zeros", () => {
    expect(fmtCoord(12.3456)).toBe("12.35");
    expect(fmtCoord(12)).toBe("12");
  });

  it("formats lengths and strokes consistently", () => {
    expect(fmtLength(3.2)).toBe("3.2");
    expect(fmtStroke(0.6666)).toBe("0.67");
  });

  it("formats opacity and percents with dedicated precision", () => {
    expect(fmtOpacity(0.12394)).toBe("0.124");
    expect(fmtPercent(33.3333)).toBe("33.33");
  });
});
