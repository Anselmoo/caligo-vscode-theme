/**
 * The Home sections that read the selected theme: the "Why it reads" bento and the
 * wallpaper strip. The theme and wallpaper composables are replaced with a small fixture
 * (2 palettes x 5 moods), so these tests pin what the sections derive from it.
 */
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

const SEEDS = [
  { id: "Alpha", slug: "alpha", label: "Alpha" },
  { id: "Beta", slug: "beta", label: "Beta" },
];
const HARMONIES = [
  { id: "balanced", label: "Balanced" },
  { id: "analogous", label: "Analogous" },
  { id: "monochromatic", label: "Monochromatic" },
  { id: "split-complementary", label: "Split-Complementary" },
  { id: "triadic", label: "Triadic" },
];

const THEMES = SEEDS.flatMap(s =>
  HARMONIES.map(h => ({
    key: `${s.id}-${h.id}`,
    seedId: s.id,
    seedLabel: s.label,
    harmonyId: h.id,
    harmonyLabel: h.label,
    displayName: `${s.label} ${h.label}`,
    colors: {
      bg0: "#101018",
      bg1: "#181824",
      bg2: "#202030",
      fg0: "#f0f0ff",
      fg1: "#c0c0d8",
      fgMuted: "#8080a0",
      accent: "#4090f0",
      keywords: "#60e0e0",
      types: "#d09050",
      functions: "#d0d070",
      decorator: "#b0a0f0",
    },
    oklch: { bg: { l: 0.18, c: 0.035, h: 285 } },
  }))
);

const currentKey = ref("Alpha-analogous");
const thumbs = ref<Record<string, string>>({});

vi.mock("../../../composables/useTheme.js", () => ({
  useTheme: () => ({
    themes: computed(() => THEMES),
    seeds: computed(() => SEEDS),
    harmonies: computed(() => HARMONIES),
    currentTheme: computed(() => THEMES.find(t => t.key === currentKey.value) ?? null),
  }),
}));

vi.mock("../../../composables/useWallpapers.js", () => ({
  useWallpapers: () => ({
    loadManifest: vi.fn(async () => {}),
    findVariant: (seedId: string, mode: string) => {
      const thumbPath = thumbs.value[`${seedId}|${mode}`];
      return thumbPath ? { thumbPath } : null;
    },
  }),
}));

import BentoGrid from "../BentoGrid.vue";
import SceneStrip from "../SceneStrip.vue";

const stubs = { RouterLink: { template: "<a><slot /></a>" } };

beforeEach(() => {
  currentKey.value = "Alpha-analogous";
  thumbs.value = {};
});

describe("BentoGrid", () => {
  it("reports the theme's own body-text contrast as a ratio", () => {
    const wrapper = mount(BentoGrid, { global: { stubs } });
    expect(wrapper.find(".tile__figure").text()).toMatch(/^\d+\.\d:1$/);
  });

  it("measures all four ink roles against the page background", () => {
    const wrapper = mount(BentoGrid, { global: { stubs } });
    const rows = wrapper.findAll(".ink");
    expect(rows.map(r => r.find(".ink__label").text())).toEqual([
      "Primary text",
      "Secondary text",
      "Muted text",
      "Accent",
    ]);
    for (const row of rows) expect(row.find(".ink__value").text()).toMatch(/^\d+\.\d$/);
  });

  it("lists the current palette in every mood and marks the selected one", () => {
    const wrapper = mount(BentoGrid, { global: { stubs } });
    const moods = wrapper.findAll(".mood");
    expect(moods).toHaveLength(HARMONIES.length);
    expect(moods.filter(m => m.classes("is-current"))).toHaveLength(1);
    expect(wrapper.find(".mood.is-current").text()).toContain("Analogous");
  });

  it("draws one dot per variant and rings exactly the selected one", () => {
    const wrapper = mount(BentoGrid, { global: { stubs } });
    expect(wrapper.findAll(".matrix i")).toHaveLength(SEEDS.length * HARMONIES.length);
    expect(wrapper.findAll(".matrix i.is-current")).toHaveLength(1);
  });

  it("shows the background's L, C and h", () => {
    const wrapper = mount(BentoGrid, { global: { stubs } });
    const values = wrapper.findAll(".axis__val").map(d => d.text());
    expect(values).toEqual(["0.18", "0.035", "285°"]);
  });
});

describe("SceneStrip", () => {
  it("shows one card per mood of the current palette", () => {
    const wrapper = mount(SceneStrip, { global: { stubs } });
    expect(wrapper.findAll(".scene-card")).toHaveLength(HARMONIES.length);
    expect(wrapper.findAll(".scene-card.is-current")).toHaveLength(1);
  });

  it("uses the thumbnail, never the SVG, and maps balanced to the manifest's 'none'", () => {
    thumbs.value = {
      "Alpha|none": "wallpapers/Alpha/none/monitor.webp",
      "Alpha|analogous": "wallpapers/Alpha/analogous/monitor.webp",
    };
    const wrapper = mount(SceneStrip, { global: { stubs } });
    const srcs = wrapper.findAll("img").map(i => i.attributes("src"));
    expect(srcs).toEqual([
      "./wallpapers/Alpha/none/monitor.webp",
      "./wallpapers/Alpha/analogous/monitor.webp",
    ]);
    for (const src of srcs) expect(src).not.toMatch(/\.svg$/);
  });

  it("falls back to a gradient of the variant's colours when no thumbnail exists", () => {
    const wrapper = mount(SceneStrip, { global: { stubs } });
    expect(wrapper.findAll("img")).toHaveLength(0);
    expect(wrapper.find(".scene-card__art").attributes("style")).toContain("gradient");
  });

  it("follows the selected palette", () => {
    currentKey.value = "Beta-triadic";
    const wrapper = mount(SceneStrip, { global: { stubs } });
    expect(wrapper.find(".scene-card__label").text()).toContain("Beta");
  });
});
