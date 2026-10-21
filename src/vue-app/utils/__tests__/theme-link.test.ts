import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThemeIndex } from "../../types/theme";
import { initialThemeKey, themeKeyForSlug, themeSlug, writeThemeToAddress } from "../theme-link";

const entry = (key: string, seedId: string, harmonyId: string) =>
  ({ key, seedId, seedSlug: seedId.toLowerCase(), harmonyId }) as ThemeIndex["themes"][string];

const index = {
  defaultThemeKey: "Caligo-DeepSable",
  seeds: [],
  harmonies: [],
  themes: {
    "Caligo-DeepSable": entry("Caligo-DeepSable", "DeepSable", "balanced"),
    "Caligo-AuroraNoirSplitComplementary": entry(
      "Caligo-AuroraNoirSplitComplementary",
      "AuroraNoir",
      "split-complementary"
    ),
  },
} as ThemeIndex;

describe("theme-link", () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReset();
    history.replaceState(null, "", "/caligo-vscode-theme/#/themes");
  });

  it("slugs seed and harmony into a readable, stable id", () => {
    expect(themeSlug(index.themes["Caligo-AuroraNoirSplitComplementary"])).toBe(
      "auroranoir-split-complementary"
    );
  });

  it("resolves a slug or a raw key, case-insensitively, and rejects unknowns", () => {
    expect(themeKeyForSlug(index, "AuroraNoir-Split-Complementary")).toBe(
      "Caligo-AuroraNoirSplitComplementary"
    );
    expect(themeKeyForSlug(index, "Caligo-DeepSable")).toBe("Caligo-DeepSable");
    expect(themeKeyForSlug(index, "nope-triadic")).toBeNull();
  });

  it("prefers the link, then the last pick, then the default", () => {
    // tests/setup.ts replaces localStorage with no-op mocks; stub the read.
    const stored = vi.mocked(localStorage.getItem);
    stored.mockReturnValue("Caligo-DeepSable");
    expect(initialThemeKey(index, "?theme=auroranoir-split-complementary")).toBe(
      "Caligo-AuroraNoirSplitComplementary"
    );
    stored.mockReturnValue("Caligo-AuroraNoirSplitComplementary");
    expect(initialThemeKey(index, "")).toBe("Caligo-AuroraNoirSplitComplementary");
    stored.mockReturnValue("Caligo-Removed");
    expect(initialThemeKey(index, "?theme=garbage")).toBe("Caligo-DeepSable");
  });

  it("writes the slug before the hash so route changes keep it", () => {
    writeThemeToAddress(index.themes["Caligo-AuroraNoirSplitComplementary"]);
    expect(window.location.search).toBe("?theme=auroranoir-split-complementary");
    expect(window.location.hash).toBe("#/themes");
  });

  it("falls back to the default when storage is blocked", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(initialThemeKey(index, "")).toBe("Caligo-DeepSable");
  });

  it("leaves the address alone for a theme without a slug", () => {
    writeThemeToAddress({ seedId: "", harmonyId: "balanced" } as never);
    expect(window.location.search).toBe("");
  });
});
