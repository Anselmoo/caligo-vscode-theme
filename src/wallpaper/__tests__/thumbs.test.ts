import { describe, expect, it } from "vitest";
import { matchesSeed, parseQuality, platformFromPath } from "../thumbs.js";

describe("parseQuality", () => {
  it("defaults when the flag is absent", () => {
    expect(parseQuality(undefined)).toBe(0.8);
  });

  it("accepts a value inside the canvas quality range", () => {
    expect(parseQuality("0.95")).toBe(0.95);
    expect(parseQuality("0")).toBe(0);
    expect(parseQuality("1")).toBe(1);
  });

  it("rejects non-numeric input instead of silently encoding at NaN", () => {
    // canvas.toDataURL ignores an out-of-range quality and uses its own
    // default, so a typo would silently change every thumbnail's size.
    expect(() => parseQuality("foo")).toThrow(/quality/i);
  });

  it("rejects values outside [0, 1]", () => {
    expect(() => parseQuality("1.5")).toThrow(/quality/i);
    expect(() => parseQuality("-0.1")).toThrow(/quality/i);
  });
});

describe("platformFromPath", () => {
  it("reads the platform from a POSIX path", () => {
    expect(platformFromPath("/w/Eclipse/analogous/monitor.svg")).toBe("monitor");
  });

  it("reads the platform from a Windows path", () => {
    expect(platformFromPath("C:\\w\\Eclipse\\analogous\\tablet.svg")).toBe("tablet");
  });

  it("strips the -text suffix", () => {
    expect(platformFromPath("/w/Eclipse/analogous/mobile-text.svg")).toBe("mobile");
    expect(platformFromPath("C:\\w\\Eclipse\\analogous\\mobile-text.svg")).toBe("mobile");
  });

  it("throws on an unrecognised basename rather than guessing", () => {
    expect(() => platformFromPath("/w/Eclipse/analogous/desktop.svg")).toThrow(/platform/i);
  });
});

describe("matchesSeed", () => {
  it("matches a seed directory in a POSIX path", () => {
    expect(matchesSeed("/w/wallpapers/Eclipse/analogous/monitor.svg", "Eclipse")).toBe(true);
  });

  it("matches a seed directory in a Windows path", () => {
    expect(matchesSeed("C:\\w\\wallpapers\\Eclipse\\analogous\\monitor.svg", "Eclipse")).toBe(true);
  });

  it("does not match a different seed", () => {
    expect(matchesSeed("/w/wallpapers/Cinder/analogous/monitor.svg", "Eclipse")).toBe(false);
  });

  it("matches whole path segments only, not substrings", () => {
    expect(matchesSeed("/w/wallpapers/EclipseNoir/analogous/monitor.svg", "Eclipse")).toBe(false);
  });
});
