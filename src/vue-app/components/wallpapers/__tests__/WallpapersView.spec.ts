import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import WallpapersView from "../../../views/WallpapersView.vue";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function mountWith(response: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  const wrapper = mount(WallpapersView);
  await flushPromises();
  return wrapper;
}

describe("WallpapersView empty state", () => {
  it("explains how to create wallpapers when the manifest is a 404", async () => {
    const wrapper = await mountWith({ ok: false, status: 404 });
    const empty = wrapper.get("[data-wallpapers-empty]");
    expect(empty.text()).toContain("npm run wallpapers:all");
    expect(wrapper.text()).not.toMatch(/HTTP \d{3}|Unexpected token|SyntaxError/);
    expect(wrapper.find("[data-wallpaper-card]").exists()).toBe(false);
  });

  it("treats an HTML fallback page as a missing manifest", async () => {
    const wrapper = await mountWith({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
    });
    expect(wrapper.get("[data-wallpapers-empty]").text()).toContain("npm run wallpapers:all");
    expect(wrapper.text()).not.toMatch(/Unexpected token|SyntaxError|not valid JSON/);
  });

  it("treats a 200 whose body is not JSON as a missing manifest", async () => {
    const wrapper = await mountWith({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
    });
    expect(wrapper.get("[data-wallpapers-empty]").text()).toContain("npm run wallpapers:all");
  });
});
