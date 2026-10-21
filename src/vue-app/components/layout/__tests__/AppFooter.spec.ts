import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppFooter from "../AppFooter.vue";

/** Text as read aloud: aria-hidden icons (and their <title>) left out. */
function spoken(el: Element): string {
  const copy = el.cloneNode(true) as Element;
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("AppFooter", () => {
  const wrapper = mount(AppFooter, { global: { stubs: { RouterLink: RouterLinkStub } } });

  it("links to every page and to Marketplace, GitHub, Contributing and License", () => {
    const names = wrapper.findAll(".footer__link").map(a => spoken(a.element));
    expect(names).toEqual([
      "Themes",
      "Wallpapers",
      "Science",
      "Marketplace",
      "GitHub",
      "Contributing",
      "License",
    ]);
  });

  it("carries the original slogan, with its icons named for screen readers", () => {
    expect(spoken(wrapper.find(".footer__slogan").element)).toMatch(
      /Built with\s+love\s+for developers who code after dark/
    );
  });

  it("draws its icons inline: no icon font", () => {
    expect(wrapper.find(".pi").exists()).toBe(false);
    expect(wrapper.findAll(".footer__link--ext svg")).toHaveLength(4);
  });
});
