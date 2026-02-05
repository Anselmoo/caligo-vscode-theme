/**
 * Tests for useColors composable
 */

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { useColors } from "../useColors";

// Mock useTheme
vi.mock("../useTheme", () => ({
  useTheme: () => ({
    currentTheme: {
      value: {
        colors: {
          bg0: "#0b0c10",
          bg1: "#14161b",
          bg2: "#1e2127",
          fg0: "#dcdcdc",
          fg1: "#c5c5c5",
          fgMuted: "#9ca3af",
          accent: "#7dd3fc",
          error: "#ef4444",
          keywords: "#fbbf24",
          types: "#5ac662",
          functions: "#10b981",
          strings: "#c084fc",
          decorator: "#94a3b8",
        },
      },
    },
  }),
}));

describe("useColors", () => {
  beforeEach(() => {
    // Mock document.documentElement.style
    const mockStyle = {
      getPropertyValue: (name: string) => {
        const mockVars: Record<string, string> = {
          "--bg0": "#0b0c10",
          "--bg1": "#14161b",
          "--bg2": "#1e2127",
          "--fg0": "#dcdcdc",
          "--fg1": "#c5c5c5",
          "--fg-muted": "#9ca3af",
          "--app-text-muted": "#9ca3af",
          "--text-muted": "#9ca3af",
          "--accent": "#7dd3fc",
          "--color-error": "#ef4444",
          "--color-warning": "#fbbf24",
          "--color-success": "#10b981",
          "--color-info": "#7dd3fc",
          "--syntax-keywords": "#fbbf24",
          "--syntax-types": "#5ac662",
          "--syntax-functions": "#10b981",
          "--syntax-strings": "#c084fc",
          "--syntax-decorator": "#94a3b8",
          "--border-primary": "rgba(125, 211, 252, 0.3)",
        };
        return mockVars[name] || "";
      },
    };
    vi.spyOn(window, "getComputedStyle").mockReturnValue(mockStyle as CSSStyleDeclaration);
  });

  it("provides background colors", () => {
    const TestComponent = defineComponent({
      setup() {
        const colors = useColors();
        return () => h("div", { id: "test" }, colors.backgrounds.value.bg0);
      },
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.text()).toBe("#0b0c10");
  });

  it("provides foreground colors", () => {
    const TestComponent = defineComponent({
      setup() {
        const colors = useColors();
        return () =>
          h("div", {}, [
            h("span", { id: "fg0" }, colors.foregrounds.value.fg0),
            h("span", { id: "muted" }, colors.foregrounds.value.muted),
          ]);
      },
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.find("#fg0").text()).toBe("#dcdcdc");
    expect(wrapper.find("#muted").text()).toBe("#9ca3af");
  });

  it("provides accent colors", () => {
    const TestComponent = defineComponent({
      setup() {
        const colors = useColors();
        return () =>
          h("div", {}, [
            h("span", { id: "accent" }, colors.accents.value.accent),
            h("span", { id: "error" }, colors.accents.value.error),
            h("span", { id: "warning" }, colors.accents.value.warning),
          ]);
      },
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.find("#accent").text()).toBe("#7dd3fc");
    expect(wrapper.find("#error").text()).toBe("#ef4444");
    expect(wrapper.find("#warning").text()).toBe("#fbbf24");
  });

  it("provides syntax colors", () => {
    const TestComponent = defineComponent({
      setup() {
        const colors = useColors();
        return () =>
          h("div", {}, [
            h("span", { id: "keywords" }, colors.syntax.value.keywords),
            h("span", { id: "types" }, colors.syntax.value.types),
            h("span", { id: "functions" }, colors.syntax.value.functions),
          ]);
      },
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.find("#keywords").text()).toBe("#fbbf24");
    expect(wrapper.find("#types").text()).toBe("#5ac662");
    expect(wrapper.find("#functions").text()).toBe("#10b981");
  });

  it("provides getColor utility function", () => {
    const TestComponent = defineComponent({
      setup() {
        const colors = useColors();
        return () => h("div", {}, colors.getColor("--accent", "#fallback"));
      },
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.text()).toBe("#7dd3fc");
  });

  it("handles missing CSS variables with fallback", () => {
    const TestComponent = defineComponent({
      setup() {
        const colors = useColors();
        return () => h("div", {}, colors.getColor("--nonexistent-var", "#fallback"));
      },
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.text()).toBe("#fallback");
  });

  it("provides all colors as flat object", () => {
    const TestComponent = defineComponent({
      setup() {
        const colors = useColors();
        return () => h("div", {}, JSON.stringify(Object.keys(colors.all.value).length > 0));
      },
    });

    const wrapper = mount(TestComponent);
    expect(wrapper.text()).toBe("true");
  });
});
