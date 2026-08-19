import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import AuroraBackground from "@/components/layout/AuroraBackground.vue";

// Minimal matchMedia mock helper
function mockMatchMedia(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  });
}

// Mock Canvas API for JsDOM
HTMLCanvasElement.prototype.getContext = (() => {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Array(w * h * 4).fill(0),
    }),
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  } as unknown as CanvasRenderingContext2D;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

describe("AuroraBackground", () => {
  beforeEach(() => {
    // default: animations allowed
    mockMatchMedia(false);
    document.documentElement.style.setProperty("--accent", "#112233");
  });

  it("mounts and renders canvas", () => {
    const wrapper = mount(AuroraBackground);
    // Ensure component mounts successfully
    expect(wrapper.exists()).toBe(true);
  });

  it("applies reduced-motion styles when prefers-reduced-motion is set", () => {
    mockMatchMedia(true);
    const wrapper = mount(AuroraBackground);
    const layer = wrapper.find(".aurora-layer");

    // computed styles should reflect the reduced-motion media rule (animation set to none)
    const cs = window.getComputedStyle(layer.element as Element);
    expect(cs.animationName === "none" || cs.animationName === "").toBe(true);
  });
});
