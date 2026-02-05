import { describe, expect, it } from "vitest";
import { oklch, toHex, withAlpha } from "../color.js";

describe("oklch", () => {
  it("should create OKLCH color object", () => {
    const color = oklch(0.5, 0.1, 180);

    expect(color.mode).toBe("oklch");
    expect(color.l).toBe(0.5);
    expect(color.c).toBe(0.1);
    expect(color.h).toBe(180);
  });

  it("should handle different hue values", () => {
    const color1 = oklch(0.5, 0.1, 0);
    const color2 = oklch(0.5, 0.1, 359.9);

    expect(color1.h).toBe(0);
    expect(color2.h).toBe(359.9);
  });
});

describe("toHex", () => {
  it("should convert OKLCH to hex", () => {
    const color = oklch(0.5, 0.1, 180);
    const hex = toHex(color);

    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("should convert dark colors", () => {
    const color = oklch(0.18, 0.03, 220);
    const hex = toHex(color);

    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("should convert light colors", () => {
    const color = oklch(0.86, 0.03, 220);
    const hex = toHex(color);

    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("withAlpha", () => {
  it("should add alpha channel to hex color", () => {
    const result = withAlpha("#ff0000", 0.5);

    assert.match(result, /^#[0-9a-f]{6}[0-9a-f]{2}$/i);
  });

  it("should handle 0 alpha", () => {
    const result = withAlpha("#ff0000", 0);

    assert.match(result, /^#ff000000$/i);
  });

  it("should handle 1 alpha", () => {
    const result = withAlpha("#ff0000", 1);

    assert.match(result, /^#ff0000ff$/i);
  });

  it("should handle mid-range alpha values", () => {
    const result = withAlpha("#123456", 0.28);

    assert.match(result, /^#[0-9a-f]{6}[0-9a-f]{2}$/i);
    // 0.28 * 255 ≈ 71 = 0x47
    expect(result.toLowerCase()).toMatch(/^#12345647$/i);
  });
});
