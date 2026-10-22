import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScreenshotPeek from "../ScreenshotPeek.vue";

const SRC = "/screenshots/caligo-aurora-noir-balanced-typescript.png";

function mountPeek(src: string | null = SRC) {
  return mount(ScreenshotPeek, {
    props: { src, label: "Aurora Noir — Balanced" },
    attachTo: document.body,
  });
}

describe("ScreenshotPeek", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing without a screenshot", () => {
    expect(mountPeek(null).find("[data-screenshot-peek]").exists()).toBe(false);
  });

  it("renders nothing once the image fails to load", async () => {
    const wrapper = mountPeek();
    await wrapper.find("img").trigger("error");
    expect(wrapper.find("[data-screenshot-peek]").exists()).toBe(false);
  });

  it("tries again when the screenshot changes after a failure", async () => {
    const wrapper = mountPeek();
    await wrapper.find("img").trigger("error");
    await wrapper.setProps({ src: "/screenshots/other.png" });
    expect(wrapper.find("img").attributes("src")).toBe("/screenshots/other.png");
  });

  it("starts closed, names the theme, and toggles on click", async () => {
    const wrapper = mountPeek();
    const toggle = wrapper.find("button.peek__toggle");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-label")).toContain("Aurora Noir");
    expect(wrapper.find("img").attributes("alt")).toBe("Aurora Noir — Balanced in VS Code");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(".peek").classes()).toContain("is-open");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("false");
  });

  it("closes from the Close button and from Escape", async () => {
    const wrapper = mountPeek();
    const toggle = wrapper.find("button.peek__toggle");

    await toggle.trigger("click");
    await wrapper.find("button.peek__close").trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("false");

    await toggle.trigger("click");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(toggle.attributes("aria-expanded")).toBe("false");
  });

  it("returns focus to the toggle when it closes", async () => {
    const wrapper = mountPeek();
    await wrapper.find("button.peek__toggle").trigger("click");
    await wrapper.find("button.peek__close").trigger("click");
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(wrapper.find("button.peek__toggle").element);
  });

  it("adds the Escape listener only while open and removes it on close and unmount", async () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const keydown = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === "keydown");

    const wrapper = mountPeek();
    expect(keydown(add)).toHaveLength(0);

    await wrapper.find("button.peek__toggle").trigger("click");
    expect(keydown(add)).toHaveLength(1);

    await wrapper.find("button.peek__close").trigger("click");
    expect(keydown(remove)).toHaveLength(1);

    await wrapper.find("button.peek__toggle").trigger("click");
    wrapper.unmount();
    expect(keydown(remove).length).toBeGreaterThanOrEqual(2);
    vi.restoreAllMocks();
  });

  it("keeps the thumbnail open when the screenshot changes", async () => {
    const wrapper = mountPeek();
    await wrapper.find("button.peek__toggle").trigger("click");
    await wrapper.setProps({ src: "/screenshots/other.png" });
    expect(wrapper.find("button.peek__toggle").attributes("aria-expanded")).toBe("true");
  });
});
