import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import ExportView from "../ExportView.vue";

vi.mock("../../composables/useThemeAnalysis.js", () => ({
  useThemeAnalysis: () => ({
    oklchColors: computed(() => [
      {
        key: "accent",
        hex: "#ffaa33",
        l: 0.8,
        c: 0.18,
        h: 80,
      },
    ]),
  }),
}));

vi.mock("../../composables/useExport.js", () => {
  const selectedFormat = ref("json-flat");
  const currentResult = computed(() => ({
    content:
      '{\n  "caligo-bg-base": "#101010",\n  "caligo-fg-primary": "#f0f0f0",\n  "caligo-accent": "#ffaa33"\n}',
    filename: "caligo.json",
    format: "json-flat",
    mimeType: "application/json",
  }));
  return {
    useExport: () => ({
      selectedFormat,
      availableFormats: computed(() => ["json-flat"]),
      formatLabels: computed(() => ({ "json-flat": "JSON (Flat)" })),
      currentResult,
      copyCurrent: vi.fn().mockResolvedValue(true),
      downloadCurrent: vi.fn(),
    }),
  };
});

describe("ExportView", () => {
  it("renders semantic matrix swatches from exported content colors", () => {
    const wrapper = mount(ExportView);

    expect(wrapper.findAll(".semantic-matrix__swatch")).toHaveLength(3);
    expect(wrapper.text()).toContain("Accent");
    expect(wrapper.text()).toContain("Other");
    expect(wrapper.text()).toContain("caligo-bg-base");
  });

  it("updates selected token details when a matrix swatch is chosen", async () => {
    const wrapper = mount(ExportView);

    const swatches = wrapper.findAll(".semantic-matrix__swatch");
    expect(swatches).toHaveLength(3);

    expect(wrapper.text()).toContain("caligo-bg-base");

    await swatches[2].trigger("click");

    expect(wrapper.text()).toContain("caligo-accent");
    expect(wrapper.text()).toContain("#ffaa33");
  });
});
