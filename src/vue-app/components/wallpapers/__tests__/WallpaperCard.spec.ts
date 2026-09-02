/**
 * WallpaperCard preview-source tests.
 *
 * The gallery must never point an <img> at a wallpaper SVG: those are authored
 * at up to 3840×2160 with tens of thousands of nodes (~455 KB each, 4.4 MB for
 * a 50-card grid) and are rendered into a ~300 px card. Previews come from the
 * build-time WebP thumbnail; the SVG stays the download source.
 */

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { WallpaperManifestEntry } from "../../../../wallpaper/types.js";
import WallpaperCard from "../WallpaperCard.vue";

const colors = {
  bg: "#0b0c10",
  bgSoft: "#141425",
  bgMid: "#19182a",
  accent: "#7aa2f7",
  accentSoft: "#9ab8f9",
  accentMuted: "#5a7fc4",
  hueRed: "#f7768e",
  hueOrange: "#ff9e64",
  hueYellow: "#e0af68",
  hueGreen: "#9ece6a",
  hueCyan: "#7dcfff",
  hueBlue: "#7aa2f7",
  huePurple: "#bb9af7",
  strings: "#9ece6a",
  keywords: "#bb9af7",
  functions: "#7aa2f7",
  types: "#7dcfff",
  variables: "#c0caf5",
  constants: "#ff9e64",
  numbers: "#ff9e64",
  tags: "#f7768e",
  attributes: "#e0af68",
};

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
    colors,
    ...over,
  };
}

function mountCard(entry: WallpaperManifestEntry, variants: WallpaperManifestEntry[] = [entry]) {
  return mount(WallpaperCard, {
    props: {
      entry,
      activePlatform: "monitor" as const,
      activeTextVariant: "no-text" as const,
      resolve: (
        seedId: string,
        harmonyMode: string,
        platform: string,
        textVariant: string
      ): WallpaperManifestEntry | null =>
        variants.find(
          v =>
            v.seedId === seedId &&
            v.harmonyMode === harmonyMode &&
            v.platform === platform &&
            v.textVariant === textVariant
        ) ?? null,
    },
  });
}

describe("WallpaperCard preview source", () => {
  it("previews the WebP thumbnail, never the full-resolution SVG", () => {
    const wrapper = mountCard(makeEntry());
    expect(wrapper.get("img.preview-img").attributes("src")).toBe(
      "wallpapers/Eclipse/balanced/monitor.webp"
    );
  });

  it("falls back to the SVG when an entry has no thumbnail yet", () => {
    const wrapper = mountCard(makeEntry({ thumbPath: undefined }));
    expect(wrapper.get("img.preview-img").attributes("src")).toBe(
      "wallpapers/Eclipse/balanced/monitor.svg"
    );
  });

  it("swaps to the selected variant's thumbnail when the platform toggle is clicked", async () => {
    const monitor = makeEntry();
    const mobile = makeEntry({
      platform: "mobile",
      svgPath: "wallpapers/Eclipse/balanced/mobile.svg",
      pngPath: "wallpapers/Eclipse/balanced/mobile.png",
      thumbPath: "wallpapers/Eclipse/balanced/mobile.webp",
    });
    const wrapper = mountCard(monitor, [monitor, mobile]);

    const mobileBtn = wrapper.findAll("button.toggle-btn").find(b => b.text().includes("Mobile"));
    await mobileBtn?.trigger("click");

    expect(wrapper.get("img.preview-img").attributes("src")).toBe(
      "wallpapers/Eclipse/balanced/mobile.webp"
    );
  });

  it("falls back to the selected variant's own SVG, never another variant's thumbnail", async () => {
    // A partially-generated thumbnail set must not make the card show a
    // different platform's artwork: the fallback has to stay inside the
    // selected variant.
    const monitor = makeEntry();
    const mobile = makeEntry({
      platform: "mobile",
      svgPath: "wallpapers/Eclipse/balanced/mobile.svg",
      pngPath: "wallpapers/Eclipse/balanced/mobile.png",
      thumbPath: undefined,
    });
    const wrapper = mountCard(monitor, [monitor, mobile]);

    const mobileBtn = wrapper.findAll("button.toggle-btn").find(b => b.text().includes("Mobile"));
    await mobileBtn?.trigger("click");

    expect(wrapper.get("img.preview-img").attributes("src")).toBe(
      "wallpapers/Eclipse/balanced/mobile.svg"
    );
  });

  it("gives the preview intrinsic dimensions so the grid reserves space before load", () => {
    const img = mountCard(makeEntry()).get("img.preview-img");
    expect(img.attributes("width")).toBe("640");
    expect(img.attributes("height")).toBe("360");
  });
});
