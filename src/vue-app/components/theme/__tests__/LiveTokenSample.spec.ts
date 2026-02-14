import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import LiveTokenSample from "../LiveTokenSample.vue";

describe("LiveTokenSample", () => {
  it("toggles editable mode and shows reset action only while editable", async () => {
    const wrapper = mount(LiveTokenSample);

    expect(wrapper.find("textarea").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Reset sample");

    await wrapper.get('button[aria-label="Switch to editable mode"]').trigger("click");

    expect(wrapper.find("textarea").exists()).toBe(true);
    expect(wrapper.text()).toContain("Reset sample");
  });

  it("resets edited content back to canonical snippet", async () => {
    const wrapper = mount(LiveTokenSample);
    await wrapper.get('button[aria-label="Switch to editable mode"]').trigger("click");

    const editor = wrapper.get("textarea");
    await editor.setValue("export class Changed {}");
    expect(wrapper.text()).toContain("Changed");

    await wrapper.get('button[aria-label="Reset sample"]').trigger("click");
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).value).toContain(
      "export class Palette"
    );
  });
});
