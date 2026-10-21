import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import type { ThemeIndexEntry } from "../../../types/theme.js";
import ThemeSpectrum from "../ThemeSpectrum.vue";

function variant(seedId: string, seedLabel: string, harmonyId: string, harmonyLabel: string) {
  return {
    key: `Caligo-${seedId}-${harmonyId}`,
    seedId,
    seedLabel,
    harmonyId,
    harmonyLabel,
    displayName: `${seedLabel} ${harmonyLabel}`,
    colors: {
      bg0: "#101010",
      bg2: "#1a1a1a",
      accent: "#3b9cf6",
      strings: "#ffc8cf",
      types: "#ce8545",
      functions: "#d1d473",
      keywords: "#71fff7",
      decorator: "#b4a8fd",
    },
  } as unknown as ThemeIndexEntry;
}

const all = [
  variant("Cinder", "Cinder", "balanced", "Balanced"),
  variant("Cinder", "Cinder", "triadic", "Triadic"),
  variant("Eclipse", "Eclipse", "balanced", "Balanced"),
  variant("Eclipse", "Eclipse", "triadic", "Triadic"),
];
const currentThemeKey = ref("Caligo-Eclipse-triadic");
const setTheme = vi.fn((key: string) => {
  currentThemeKey.value = key;
});

vi.mock("../../../composables/useTheme.js", () => ({
  useTheme: () => ({
    themes: computed(() => all),
    seeds: computed(() => [
      { id: "Cinder", label: "Cinder" },
      { id: "Eclipse", label: "Eclipse" },
    ]),
    harmonies: computed(() => [
      { id: "balanced", label: "Balanced" },
      { id: "triadic", label: "Triadic" },
    ]),
    currentThemeKey,
    currentTheme: computed(() => all.find(t => t.key === currentThemeKey.value) ?? null),
    setTheme,
  }),
}));

describe("ThemeSpectrum", () => {
  it("keeps the Spectrum's title, promise and legend", () => {
    const wrapper = mount(ThemeSpectrum);
    expect(wrapper.get("h2").text()).toBe("Theme Spectrum");
    expect(wrapper.text()).toContain("2 seed palettes × 2 harmony modes. Click any cell to apply.");
    expect(wrapper.findAll(".legend__item")).toHaveLength(2);
  });

  it("is a table whose cells are native buttons named by palette and mode", () => {
    const wrapper = mount(ThemeSpectrum);
    expect(wrapper.findAll('th[scope="row"]').map(th => th.text())).toEqual(["Cinder", "Eclipse"]);
    const names = wrapper.findAll("button[data-chip]").map(b => b.attributes("aria-label"));
    expect(names).toEqual([
      "Cinder Balanced",
      "Cinder Triadic",
      "Eclipse Balanced",
      "Eclipse Triadic",
    ]);
  });

  it("marks only the active theme as pressed and makes it the one tab stop", () => {
    currentThemeKey.value = "Caligo-Eclipse-triadic";
    const wrapper = mount(ThemeSpectrum);
    const pressed = wrapper.findAll('[aria-pressed="true"]');
    expect(pressed).toHaveLength(1);
    expect(pressed[0].attributes("data-key")).toBe("Caligo-Eclipse-triadic");
    expect(wrapper.findAll('[tabindex="0"]').map(b => b.attributes("data-key"))).toEqual([
      "Caligo-Eclipse-triadic",
    ]);
  });

  it("applies a theme on click and announces it", async () => {
    const wrapper = mount(ThemeSpectrum);
    await wrapper.get('[data-key="Caligo-Cinder-balanced"]').trigger("click");
    expect(setTheme).toHaveBeenCalledWith("Caligo-Cinder-balanced");
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("Now wearing Cinder, Balanced.");
  });

  it("moves focus with the arrow keys", async () => {
    currentThemeKey.value = "Caligo-Cinder-balanced";
    const wrapper = mount(ThemeSpectrum, { attachTo: document.body });
    const key = () => document.activeElement?.getAttribute("data-key");
    const start = wrapper.get('[data-key="Caligo-Cinder-balanced"]');
    (start.element as HTMLElement).focus();
    await start.trigger("keydown", { key: "ArrowRight" });
    expect(key()).toBe("Caligo-Cinder-triadic");
    await wrapper
      .get('[data-key="Caligo-Cinder-triadic"]')
      .trigger("keydown", { key: "ArrowDown" });
    expect(key()).toBe("Caligo-Eclipse-triadic");
    await wrapper.get('[data-key="Caligo-Eclipse-triadic"]').trigger("keydown", { key: "Home" });
    expect(key()).toBe("Caligo-Eclipse-balanced");
    wrapper.unmount();
  });
});
