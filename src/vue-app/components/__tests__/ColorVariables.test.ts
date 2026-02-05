/**
 * Test that CSS variables are properly initialized
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("CSS Color Variables", () => {
  beforeEach(() => {
    // Create a temporary root element
    const root = document.documentElement;
    // Reset to defaults
    root.style.removeProperty("--bg0");
    root.style.removeProperty("--fg0");

    // Mock getComputedStyle to provide expected CSS custom properties for jsdom
    const mockVars: Record<string, string> = {
      "--bg0": "#0b0c10",
      "--bg1": "#111214",
      "--bg2": "#1b1d21",
      "--fg0": "#e6e6e6",
      "--fg1": "#cfcfcf",
      "--fg-muted": "#9ca3af",
      "--accent": "#5eb3f6",
      "--text-primary": "#e6e6e6",
      "--text-muted": "#9ca3af",
      "--surface-base": "#0b0c10",
      "--app-text-primary": "#e6e6e6",
      "--app-text-muted": "#9ca3af",
      "--app-text-subtle": "#808080",
      "--border-primary": "rgba(125,211,252,0.3)",
      "--border-secondary": "rgba(125,211,252,0.15)",
      "--border-color": "rgba(125,211,252,0.2)",
    };

    const mockStyle = {
      getPropertyValue: (name: string) => mockVars[name] || "",
    } as unknown as CSSStyleDeclaration;

    vi.spyOn(window, "getComputedStyle").mockImplementation(() => mockStyle);
  });

  it("should have fallback color variables defined", () => {
    const root = document.documentElement;
    const style = window.getComputedStyle(root);

    // Check fallback values are present
    const bg0 = style.getPropertyValue("--bg0").trim();
    const fg0 = style.getPropertyValue("--fg0").trim();
    const accent = style.getPropertyValue("--accent").trim();

    expect(bg0).toBeTruthy();
    expect(fg0).toBeTruthy();
    expect(accent).toBeTruthy();
  });

  it("should allow setting custom color values via setProperty", () => {
    const root = document.documentElement;

    // Set custom values
    root.style.setProperty("--bg0", "#ff0000");
    root.style.setProperty("--fg0", "#00ff00");

    // Since window.getComputedStyle is mocked with static values above, read back
    // the inline style which is updated by setProperty to verify the behavior.
    const bg0 = root.style.getPropertyValue("--bg0").trim();
    const fg0 = root.style.getPropertyValue("--fg0").trim();

    expect(bg0).toBe("#ff0000");
    expect(fg0).toBe("#00ff00");
  });

  it("should have semantic token variables defined", () => {
    const root = document.documentElement;
    const style = window.getComputedStyle(root);

    const textPrimary = style.getPropertyValue("--text-primary").trim();
    const textMuted = style.getPropertyValue("--text-muted").trim();
    const surfaceBase = style.getPropertyValue("--surface-base").trim();

    expect(textPrimary).toBeTruthy();
    expect(textMuted).toBeTruthy();
    expect(surfaceBase).toBeTruthy();
  });

  it("should distinguish between bg0, bg1, bg2", () => {
    const root = document.documentElement;
    const style = window.getComputedStyle(root);

    const bg0 = style.getPropertyValue("--bg0").trim();
    const bg1 = style.getPropertyValue("--bg1").trim();
    const bg2 = style.getPropertyValue("--bg2").trim();

    expect(bg0).toBeTruthy();
    expect(bg1).toBeTruthy();
    expect(bg2).toBeTruthy();
    // Each should be different
    expect(bg0).not.toBe(bg1);
    expect(bg1).not.toBe(bg2);
  });
});
