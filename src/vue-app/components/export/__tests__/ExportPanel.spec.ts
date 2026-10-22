import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import ExportPanel from "../ExportPanel.vue";

const copyCurrent = vi.fn();
const downloadCurrent = vi.fn();

vi.mock("../../../composables/useTheme.js", () => ({
  useTheme: () => ({ currentTheme: computed(() => ({ displayName: "Eclipse Triadic" })) }),
}));

vi.mock("../../../composables/useExport.js", () => {
  const selectedFormat = ref("json-flat");
  const currentResult = computed(() => ({
    content: '{\n  "caligo-accent": "#ffaa33"\n}',
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
      copyCurrent,
      downloadCurrent,
    }),
  };
});

afterEach(() => {
  copyCurrent.mockReset();
  downloadCurrent.mockReset();
});

describe("ExportPanel", () => {
  it("names the theme being exported and the file it produces", () => {
    const wrapper = mount(ExportPanel);
    expect(wrapper.find("h3").exists()).toBe(true);
    expect(wrapper.find("[data-export-theme]").text()).toBe("Eclipse Triadic");
    expect(wrapper.text()).toContain("caligo.json, 3 lines");
  });

  it("downloads the current theme and confirms it", async () => {
    const wrapper = mount(ExportPanel);
    await wrapper.get('[data-export-action="download"]').trigger("click");
    expect(downloadCurrent).toHaveBeenCalledOnce();
    expect(wrapper.get('[role="status"]').text()).toBe("Downloaded caligo.json");
  });

  it("copies the current theme and confirms it", async () => {
    copyCurrent.mockResolvedValue(true);
    const wrapper = mount(ExportPanel);
    await wrapper.get('[data-export-action="copy"]').trigger("click");
    await flushPromises();
    expect(copyCurrent).toHaveBeenCalledOnce();
    expect(wrapper.get('[role="status"]').text()).toBe("Copied to clipboard");
  });

  it("says what to do when the browser blocks the clipboard", async () => {
    copyCurrent.mockResolvedValue(false);
    const wrapper = mount(ExportPanel);
    await wrapper.get('[data-export-action="copy"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toContain("copy it by hand");
  });
});
