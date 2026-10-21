import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppFooter from "../AppFooter.vue";

describe("AppFooter", () => {
  const wrapper = mount(AppFooter, { global: { stubs: { RouterLink: RouterLinkStub } } });

  it("links to Themes, Marketplace, GitHub and License only", () => {
    const names = wrapper.findAll("a, .footer__link").map(a => a.text());
    expect(new Set(names)).toEqual(new Set(["Themes", "Marketplace", "GitHub", "License"]));
    expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe("/themes");
  });

  it("uses plain text: no icon font, emoji or old gallery link", () => {
    expect(wrapper.find(".pi").exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(wrapper.html()).not.toMatch(/gallery/i);
  });
});
