import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import DetailsCollapsible from "../DetailsCollapsible.vue";

/** The native toggle event fires on a later task; wait for it, then for Vue to re-render. */
async function settled(details: HTMLDetailsElement) {
  await new Promise<void>(resolve =>
    details.addEventListener("toggle", () => resolve(), { once: true })
  );
  await nextTick();
}

describe("DetailsCollapsible", () => {
  it("toggles open on summary click", async () => {
    const wrapper = mount(DetailsCollapsible, { props: { title: "Test" } });
    expect(wrapper.find(".details__body").exists()).toBe(false);

    await wrapper.find(".details__summary").trigger("click");
    await settled(wrapper.find("details").element as HTMLDetailsElement);
    expect(wrapper.find(".details__body").exists()).toBe(true);

    const details = wrapper.find("details").element as HTMLDetailsElement;
    expect(details.open).toBe(true);

    await wrapper.find(".details__summary").trigger("click");
    await settled(details);
    expect(wrapper.find(".details__body").exists()).toBe(false);
    expect(details.open).toBe(false);
  });

  it("respects initial open prop", () => {
    const wrapper = mount(DetailsCollapsible, { props: { title: "Open", open: true } });
    expect(wrapper.find(".details__body").exists()).toBe(true);
    const details = wrapper.find("details").element as HTMLDetailsElement;
    expect(details.open).toBe(true);
  });
});
