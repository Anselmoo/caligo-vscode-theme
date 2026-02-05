import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ThemeSpectrum from "../ThemeSpectrum.vue";

// Mock useTheme composable
const setCurrentThemeMock = vi.fn();
vi.mock("@/composables/useTheme", () => {
  return {
    useTheme: () => ({
      themes: {
        value: [
          {
            key: "caligo-aurora-noir-balanced",
            seedId: "AuroraNoir",
            harmonyId: "balanced",
            displayName: "Aurora Noir — Balanced",
            colors: {
              accent: "#00c57c",
              strings: "#8e92f6",
              keywords: "#b89f00",
              functions: "#f7787b",
              types: "#d385cc",
              decorator: "#c68c00",
              bg0: "#000000",
              bg1: "#111111",
              bg2: "#222222",
              fg0: "#ffffff",
              fg1: "#e0e0e0",
              fgMuted: "#9a9a9a",
              error: "#ff0000",
            },
            core: [],
          },
        ],
      },
      setCurrentTheme: setCurrentThemeMock,
      seeds: {
        value: [{ id: "AuroraNoir", slug: "auroranoir", label: "Aurora Noir" }],
      },
      harmonies: {
        value: [{ id: "balanced", label: "Balanced" }],
      },
    }),
  };
});

describe("ThemeSpectrum", () => {
  it("renders the matrix and applies theme on click", async () => {
    const wrapper = mount(ThemeSpectrum);

    expect(wrapper.find(".spectrum-title").text()).toBe("Theme Spectrum");
    expect(wrapper.text()).toContain("Aurora Noir");
    expect(wrapper.text()).toContain("Balanced");

    // The cell should be a button and clicking it should call setCurrentTheme
    const cellButton = wrapper.find("button.spectrum-cell");
    expect(cellButton.exists()).toBe(true);

    await cellButton.trigger("click");
    expect(setCurrentThemeMock).toHaveBeenCalledTimes(1);
    expect(setCurrentThemeMock).toHaveBeenCalledWith("caligo-aurora-noir-balanced");
  });
});
