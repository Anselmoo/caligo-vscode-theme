import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import NotFoundView from "../NotFoundView.vue";

vi.mock("vue-router", async importOriginal => ({
  ...(await importOriginal<typeof import("vue-router")>()),
  useRoute: () => ({ fullPath: "/no-such-page" }),
}));

describe("NotFoundView", () => {
  const wrapper = mount(NotFoundView, { global: { stubs: { RouterLink: RouterLinkStub } } });

  it("states what was not found and offers a way home", () => {
    expect(wrapper.get("h1").text()).toBe("Page not found");
    expect(wrapper.text()).toContain("/no-such-page");
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links.map(l => l.props("to"))).toEqual(["/", "/themes"]);
    expect(links[0].text()).toMatch(/home/i);
  });
});
