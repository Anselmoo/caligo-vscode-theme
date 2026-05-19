import { describe, expect, it } from "vitest";
import { clamp01, oklch, toHex, withAlpha } from "../color.js";

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

  it("should throw for non-hex input", () => {
    expect(() => withAlpha("invalid", 0.5)).toThrow("withAlpha: expected #RRGGBB");
  });

  it("should throw for short hex", () => {
    expect(() => withAlpha("#fff", 0.5)).toThrow();
  });
});

describe("toHex — alpha", () => {
  it("produces 8-char hex when alpha < 1", () => {
    const color = oklch(0.5, 0.1, 180, 0.5);
    const hex = toHex(color);
    expect(hex).toMatch(/^#[0-9a-f]{8}$/i);
  });

  it("produces 6-char hex when alpha is 1", () => {
    const color = oklch(0.5, 0.1, 180, 1);
    const hex = toHex(color);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("clamp01", () => {
  it("clamps values below 0 to 0", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(-0.001)).toBe(0);
  });

  it("clamps values above 1 to 1", () => {
    expect(clamp01(2)).toBe(1);
    expect(clamp01(1.001)).toBe(1);
  });

  it("passes through values within [0, 1]", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });
});
