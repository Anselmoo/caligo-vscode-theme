import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ExportAllColors from "../ExportAllColors.vue";

vi.mock("@/composables/useTheme", () => {
  return {
    useTheme: () => ({
      currentTheme: {
        value: {
          key: "caligo-test-balanced",
          colors: {
            bg0: "#0b0c10",
            accent: "#5eb3f6",
            keywords: "#f0c674",
          },
        },
      },
    }),
  };
});

describe("ExportAllColors", () => {
  it("renders all current theme colors and marks this panel as a secondary reference", () => {
    const wrapper = mount(ExportAllColors);

    expect(wrapper.text()).toContain("All color tokens (reference)");
    expect(wrapper.text()).toContain("Secondary panel");
    expect(wrapper.text()).toContain("Primary export lives inside the Core palette panel.");
    expect(wrapper.findAll(".export-all-colors__item")).toHaveLength(3);
    expect(wrapper.text()).toContain("#5eb3f6");
  });
});
