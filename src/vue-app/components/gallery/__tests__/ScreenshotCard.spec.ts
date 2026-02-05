import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ScreenshotCard from "../ScreenshotCard.vue";

describe("ScreenshotCard", () => {
  it("renders as a button and emits open on click", async () => {
    const wrapper = mount(ScreenshotCard, {
      props: {
        themeName: "Aurora Noir — Balanced",
        filename: "/screenshots/test.png",
        seedId: "AuroraNoir",
        harmonyMode: "balanced",
      },
    });

    const btn = wrapper.find("button.screenshot-card");
    expect(btn.exists()).toBe(true);

    await btn.trigger("click");
    expect(wrapper.emitted()).toHaveProperty("open");
  });

  it("prefixes screenshot URLs with the Vite base", () => {
    const env = import.meta.env as Record<string, string>;
    const originalBase = env.BASE_URL;
    env.BASE_URL = "/caligo-vscode-theme/";

    const wrapper = mount(ScreenshotCard, {
      props: {
        themeName: "Aurora Noir — Balanced",
        filename: "test.png",
        seedId: "AuroraNoir",
        harmonyMode: "balanced",
      },
    });

    const img = wrapper.get("img");
    expect(img.attributes("src")).toBe("/caligo-vscode-theme/screenshots/test.png");

    env.BASE_URL = originalBase;
  });
});
