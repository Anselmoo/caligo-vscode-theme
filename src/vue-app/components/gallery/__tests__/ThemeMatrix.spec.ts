import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ThemeIndexEntry } from "../../../types/theme.js";
import ThemeMatrix from "../ThemeMatrix.vue";

function variant(seedId: string, seedLabel: string, harmonyId: string, harmonyLabel: string) {
  return {
    key: `Caligo-${seedId}-${harmonyId}`,
    seedId,
    seedSlug: seedId.toLowerCase(),
    seedLabel,
    harmonyId,
    harmonyLabel,
    displayName: `${seedLabel} ${harmonyLabel}`,
    colors: {
      bg0: "#101010",
      bg1: "#151515",
      bg2: "#1a1a1a",
      fg0: "#f0f0f0",
      fg1: "#d0d0d0",
      fgMuted: "#a0a0a0",
      accent: "#3b9cf6",
      error: "#ff9687",
      strings: "#9090a2bf",
      types: "#ce8545",
      functions: "#d1d473",
      keywords: "#71fff7",
      decorator: "#b4a8fd",
    },
    core: [],
    oklch: {},
  } as unknown as ThemeIndexEntry;
}

const seeds = [
  { id: "Cinder", label: "Cinder" },
  { id: "Eclipse", label: "Eclipse" },
];
const harmonyIds = ["balanced", "triadic"];
const all = [
  variant("Cinder", "Cinder", "balanced", "Balanced"),
  variant("Cinder", "Cinder", "triadic", "Triadic"),
  variant("Eclipse", "Eclipse", "balanced", "Balanced"),
  variant("Eclipse", "Eclipse", "triadic", "Triadic"),
];

function mountMatrix(variants = all, currentKey = "Caligo-Eclipse-triadic") {
  return mount(ThemeMatrix, { props: { variants, seeds, harmonyIds, currentKey } });
}

describe("ThemeMatrix", () => {
  it("draws one native button per variant, named by palette and mode", () => {
    const wrapper = mountMatrix();
    const cards = wrapper.findAll("button[data-theme-card]");
    expect(cards).toHaveLength(4);
    expect(cards.every(card => card.attributes("type") === "button")).toBe(true);
    expect(wrapper.get('[data-theme-id="Caligo-Cinder-triadic"]').attributes("aria-label")).toBe(
      "Cinder Triadic"
    );
  });

  it("marks only the current variant as pressed and makes it the one tab stop", () => {
    const wrapper = mountMatrix();
    const pressed = wrapper.findAll('[aria-pressed="true"]');
    expect(pressed).toHaveLength(1);
    expect(pressed[0].attributes("data-theme-id")).toBe("Caligo-Eclipse-triadic");
    const tabbable = wrapper
      .findAll("[data-theme-card]")
      .filter(b => b.attributes("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].attributes("data-theme-id")).toBe("Caligo-Eclipse-triadic");
  });

  it("emits select with the variant key on click", async () => {
    const wrapper = mountMatrix();
    await wrapper.get('[data-theme-id="Caligo-Cinder-balanced"]').trigger("click");
    expect(wrapper.emitted("select")).toEqual([["Caligo-Cinder-balanced"]]);
  });

  it("drops rows and columns that have no match", () => {
    const wrapper = mountMatrix([all[3]]);
    expect(wrapper.findAll("[data-theme-card]")).toHaveLength(1);
    expect(wrapper.findAll(".row")).toHaveLength(1);
    expect(wrapper.findAll(".matrix__col").map(c => c.text())).toEqual(["Triadic"]);
  });

  it("falls back to the first variant as tab stop when the current one is filtered out", () => {
    const wrapper = mountMatrix([all[0], all[1]], "Caligo-Eclipse-triadic");
    const tabbable = wrapper
      .findAll("[data-theme-card]")
      .filter(b => b.attributes("tabindex") === "0");
    expect(tabbable.map(b => b.attributes("data-theme-id"))).toEqual(["Caligo-Cinder-balanced"]);
  });

  it("moves focus with the arrow keys", async () => {
    const wrapper = mount(ThemeMatrix, {
      props: { variants: all, seeds, harmonyIds, currentKey: "Caligo-Cinder-balanced" },
      attachTo: document.body,
    });
    const start = wrapper.get('[data-theme-id="Caligo-Cinder-balanced"]');
    (start.element as HTMLElement).focus();
    await start.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("data-theme-id")).toBe("Caligo-Cinder-triadic");
    await wrapper
      .get('[data-theme-id="Caligo-Cinder-triadic"]')
      .trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("data-theme-id")).toBe("Caligo-Eclipse-triadic");
    await wrapper
      .get('[data-theme-id="Caligo-Eclipse-triadic"]')
      .trigger("keydown", { key: "Home" });
    expect(document.activeElement?.getAttribute("data-theme-id")).toBe("Caligo-Eclipse-balanced");
    wrapper.unmount();
  });
});
