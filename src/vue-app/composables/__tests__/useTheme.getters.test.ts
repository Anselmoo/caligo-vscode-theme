/**
 * useTheme getters used by the Themes page and the Home horizon picker: seeds
 * and harmonies (from the manifest or the built-in fallback) and the watcher
 * that applies a key set directly.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { HARMONY_ORDER } from "../../utils/harmony-utils";

async function freshTheme(index: object) {
  vi.resetModules();
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    json: async () => index,
  } as Response);
  const { useTheme } = await import("../useTheme");
  const theme = useTheme();
  await theme.loadThemeIndex();
  return theme;
}

const THEMES = {
  "night-a": { key: "night-a", colors: { bg0: "#000001", fg0: "#ffffff", accent: "#ff0000" } },
  "night-b": { key: "night-b", colors: { bg0: "#000002", fg0: "#eeeeee", accent: "#00ff00" } },
};

describe("useTheme getters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to the ten built-in seeds when the manifest has none", async () => {
    const { seeds } = await freshTheme({ defaultThemeKey: "night-a", themes: THEMES });

    expect(seeds.value).toHaveLength(10);
    expect(seeds.value.find(s => s.id === "MidnightAtelier")?.label).toBe("Midnight Atelier");
  });

  it("humanizes seed labels that only repeat the id", async () => {
    const { seeds } = await freshTheme({
      defaultThemeKey: "night-a",
      themes: THEMES,
      seeds: [
        { id: "DeepSable", slug: "deepsable", label: "DeepSable" },
        { id: "OKLCHNight", slug: "oklchnight", label: "OKLCHNight" },
        { id: "Cinder", slug: "cinder", label: "Glowing Cinder" },
      ],
    });

    expect(seeds.value.map(s => s.label)).toEqual(["Deep Sable", "OKLCH Night", "Glowing Cinder"]);
  });

  it("orders harmonies canonically, from the manifest or the fallback", async () => {
    const fromFallback = await freshTheme({ defaultThemeKey: "night-a", themes: THEMES });
    expect(fromFallback.harmonies.value.map(h => h.id)).toEqual(HARMONY_ORDER);

    const fromManifest = await freshTheme({
      defaultThemeKey: "night-a",
      themes: THEMES,
      harmonies: [
        { id: "triadic", label: "triadic" },
        { id: "balanced", label: "balanced" },
      ],
    });
    expect(fromManifest.harmonies.value.map(h => h.id)).toEqual(["balanced", "triadic"]);
  });

  it("applies a theme whose key is set directly", async () => {
    const { currentThemeKey } = await freshTheme({ defaultThemeKey: "night-a", themes: THEMES });

    currentThemeKey.value = "night-b";
    await nextTick();

    expect(document.documentElement.style.getPropertyValue("--bg0")).toBe("#000002");
  });
});
