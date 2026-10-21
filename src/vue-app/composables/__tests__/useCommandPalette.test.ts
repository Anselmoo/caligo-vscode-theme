/**
 * Unit tests for the shared command palette state and its global shortcut.
 */

import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { useCommandPalette, useCommandPaletteShortcut } from "../useCommandPalette";

const ShortcutHost = defineComponent({
  setup() {
    useCommandPaletteShortcut();
    return () => h("div");
  },
});

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", { cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

describe("useCommandPalette", () => {
  afterEach(() => {
    useCommandPalette().close();
    document.body.replaceChildren();
  });

  it("shares one open state between callers", () => {
    const a = useCommandPalette();
    const b = useCommandPalette();

    a.open();
    expect(b.isOpen.value).toBe(true);

    b.close();
    expect(a.isOpen.value).toBe(false);
  });

  it("toggle opens and closes", () => {
    const { isOpen, toggle } = useCommandPalette();

    toggle();
    expect(isOpen.value).toBe(true);
    toggle();
    expect(isOpen.value).toBe(false);
  });

  it("open and close are idempotent", () => {
    const { isOpen, open, close } = useCommandPalette();

    close();
    expect(isOpen.value).toBe(false);
    open();
    open();
    expect(isOpen.value).toBe(true);
  });

  it("returns focus to the element that was focused before opening", () => {
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    const { open, close } = useCommandPalette();

    open();
    button.blur();
    close();

    expect(document.activeElement).toBe(button);
  });
});

describe("useCommandPaletteShortcut", () => {
  afterEach(() => {
    useCommandPalette().close();
  });

  it.each([
    ["⌘K", { key: "k", metaKey: true }],
    ["Ctrl+K", { key: "K", ctrlKey: true }],
    ["⌘⇧P", { key: "p", metaKey: true, shiftKey: true }],
  ])("%s toggles the palette and prevents the browser default", (_name, init) => {
    const wrapper = mount(ShortcutHost);
    const { isOpen } = useCommandPalette();

    const event = press(init);
    expect(isOpen.value).toBe(true);
    expect(event.defaultPrevented).toBe(true);

    press(init);
    expect(isOpen.value).toBe(false);
    wrapper.unmount();
  });

  it.each([
    ["plain K", { key: "k" }],
    ["⌘⇧K", { key: "k", metaKey: true, shiftKey: true }],
    ["⌘⌥K", { key: "k", metaKey: true, altKey: true }],
    ["⌘P without shift", { key: "p", metaKey: true }],
  ])("ignores %s", (_name, init) => {
    const wrapper = mount(ShortcutHost);

    const event = press(init);

    expect(useCommandPalette().isOpen.value).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    wrapper.unmount();
  });

  it("stops listening once the host unmounts", () => {
    const wrapper = mount(ShortcutHost);
    wrapper.unmount();

    press({ key: "k", metaKey: true });

    expect(useCommandPalette().isOpen.value).toBe(false);
  });
});
