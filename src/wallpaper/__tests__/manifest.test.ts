import { describe, expect, it } from "vitest";
import { resolveThumbPath } from "../manifest.js";

describe("resolveThumbPath", () => {
  const always = () => true;
  const never = () => false;

  it("swaps the .svg extension for .webp when the thumbnail exists", () => {
    expect(resolveThumbPath("wallpapers/Eclipse/balanced/monitor.svg", always)).toBe(
      "wallpapers/Eclipse/balanced/monitor.webp"
    );
  });

  it("returns undefined when the thumbnail was never generated", () => {
    // CI rasterises thumbnails; a local `wallpapers:generate` does not. The
    // manifest must not advertise a file that would 404 in the gallery.
    expect(resolveThumbPath("wallpapers/Eclipse/balanced/monitor.svg", never)).toBeUndefined();
  });

  it("asks about the .webp path, not the .svg it was derived from", () => {
    const asked: string[] = [];
    resolveThumbPath("wallpapers/Eclipse/balanced/mobile-text.svg", p => {
      asked.push(p);
      return true;
    });
    expect(asked).toEqual(["wallpapers/Eclipse/balanced/mobile-text.webp"]);
  });

  it("only rewrites a trailing .svg, leaving other dots alone", () => {
    expect(resolveThumbPath("wallpapers/v1.2/balanced/monitor.svg", always)).toBe(
      "wallpapers/v1.2/balanced/monitor.webp"
    );
  });
});
