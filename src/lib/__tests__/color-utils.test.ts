import { describe, expect, it } from "vitest";
import {
  apcaLc,
  deltaEOklch,
  extractForeground,
  hexToRgb,
  isHexColor,
  normalizeHex,
} from "../color-utils.js";

describe("color-utils", () => {
  describe("normalizeHex and isHexColor", () => {
    it("normalizes 8-digit hex to 6-digit and keeps valid 6-digit intact", () => {
      expect(normalizeHex("#ABCDEF88")).toBe("#abcdef");
      expect(normalizeHex("#123456")).toBe("#123456");
    });

    it("validates 6-digit and 8-digit hex values", () => {
      expect(isHexColor("#abcdef")).toBe(true);
      expect(isHexColor("#abcdef88")).toBe(true);
      expect(isHexColor("not-a-color")).toBe(false);
    });
  });

  describe("extractForeground", () => {
    it("extracts normalized foreground from string and object values", () => {
      expect(extractForeground("#ABCDEF88")).toBe("#abcdef");
      expect(extractForeground({ foreground: "#112233aa" })).toBe("#112233");
    });

    it("returns undefined for unsupported or invalid values", () => {
      expect(extractForeground(undefined)).toBeUndefined();
      expect(extractForeground({ fontStyle: "italic" })).toBeUndefined();
      expect(extractForeground({ foreground: "blue" })).toBeUndefined();
    });
  });

  describe("hexToRgb and apcaLc", () => {
    it("converts hex to RGB tuple", () => {
      expect(hexToRgb("#ff0000")).toEqual([255, 0, 0]);
    });

    it("computes absolute APCA contrast", () => {
      expect(apcaLc("#ffffff", "#000000")).toBeGreaterThan(0);
      expect(apcaLc("#000000", "#ffffff")).toBeGreaterThan(0);
    });
  });

  describe("deltaEOklch", () => {
    it("returns 0 for invalid/unconvertible colors", () => {
      expect(deltaEOklch("invalid", "#ffffff")).toBe(0);
    });

    it("returns 0 for grayscale colors with undefined hue", () => {
      expect(deltaEOklch("#808080", "#909090")).toBe(0);
    });

    it("returns a positive distance for distinct chromatic colors", () => {
      expect(deltaEOklch("#ff0000", "#00ff00")).toBeGreaterThan(0);
    });
  });
});
