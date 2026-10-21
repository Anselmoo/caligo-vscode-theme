/**
 * WallpaperCard tests.
 *
 * The gallery must never point an <img> at a wallpaper SVG: those are authored
 * at up to 3840x2160 with tens of thousands of nodes (~455 KB each) and are
 * rendered into a ~300 px card. Previews come from the build-time WebP
 * thumbnail; the SVG is only a download link.
 */

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { WallpaperManifestEntry } from "../../../../wallpaper/types.js";
import WallpaperCard from "../WallpaperCard.vue";

function makeEntry(over: Partial<WallpaperManifestEntry> = {}): WallpaperManifestEntry {
  return {
    seedId: "Eclipse",
    seedDisplayName: "Eclipse",
    harmonyMode: "none",
    harmonyLabel: "Balanced",
    topic: "Balanced",
    platform: "monitor",
    textVariant: "no-text",
    displayName: "Eclipse · Balanced",
    svgPath: "wallpapers/Eclipse/balanced/monitor.svg",
    pngPath: "wallpapers/Eclipse/balanced/monitor.png",
    thumbPath: "wallpapers/Eclipse/balanced/monitor.webp",
    ...over,
  };
}

describe("WallpaperCard", () => {
  it("previews the WebP thumbnail, never the full-resolution SVG", () => {
    const wrapper = mount(WallpaperCard, { props: { entry: makeEntry() } });
    expect(wrapper.get("img").attributes("src")).toBe("./wallpapers/Eclipse/balanced/monitor.webp");
  });

  it("shows a placeholder, not the SVG, when an entry has no thumbnail", () => {
    const wrapper = mount(WallpaperCard, { props: { entry: makeEntry({ thumbPath: undefined }) } });
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toContain("Preview not built yet");
  });

  it("links the full SVG and names the scene", () => {
    const wrapper = mount(WallpaperCard, { props: { entry: makeEntry() } });
    const link = wrapper.get("a");
    expect(link.attributes("href")).toBe("./wallpapers/Eclipse/balanced/monitor.svg");
    expect(wrapper.text()).toContain("Eclipse");
    expect(wrapper.text()).toContain("Balanced");
  });

  it("gives the preview intrinsic dimensions so the grid reserves space before load", () => {
    const img = mount(WallpaperCard, { props: { entry: makeEntry() } }).get("img");
    expect(img.attributes("width")).toBe("640");
    expect(img.attributes("height")).toBe("360");
  });

  it("uses the portrait box for mobile entries", () => {
    const entry = makeEntry({
      platform: "mobile",
      thumbPath: "wallpapers/Eclipse/balanced/mobile.webp",
    });
    const img = mount(WallpaperCard, { props: { entry } }).get("img");
    expect(Number(img.attributes("height"))).toBeGreaterThan(Number(img.attributes("width")));
  });
});
