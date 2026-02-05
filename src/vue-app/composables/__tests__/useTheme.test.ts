/**
 * Unit tests for useTheme composable
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "../useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with default state", () => {
    const { themeIndex, currentThemeKey, isLoading, error } = useTheme();

    expect(themeIndex.value).toBeNull();
    expect(currentThemeKey.value).toBe("");
    expect(isLoading.value).toBe(true);
    expect(error.value).toBeNull();
  });

  it("should load theme index successfully", async () => {
    const mockThemeData = {
      defaultThemeKey: "deep-sable-balanced",
      seeds: [{ id: "deep-sable", slug: "deep-sable", label: "Deep Sable" }],
      harmonies: [{ id: "balanced", label: "Balanced" }],
      themes: {
        "deep-sable-balanced": {
          key: "deep-sable-balanced",
          displayName: "Deep Sable Balanced",
          colors: {
            bg0: "#0b0c10",
            fg0: "#e6e6e6",
            accent: "#5eb3f6",
          },
        },
      },
    };

    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeData,
    } as Response);

    const { loadThemeIndex, themeIndex, isLoading } = useTheme();
    await loadThemeIndex();

    expect(themeIndex.value).toEqual(mockThemeData);
    expect(isLoading.value).toBe(false);
  });

  it("should handle load errors gracefully", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const { loadThemeIndex, error, isLoading } = useTheme();
    await loadThemeIndex();

    expect(error.value).toBeInstanceOf(Error);
    expect(isLoading.value).toBe(false);
  });

  it("should set theme and update CSS variables", async () => {
    const mockThemeData = {
      defaultThemeKey: "test-theme",
      themes: {
        "test-theme": {
          key: "test-theme",
          colors: {
            bg0: "#000000",
            bg1: "#111111",
            bg2: "#222222",
            fg0: "#ffffff",
            fg1: "#eeeeee",
            fgMuted: "#cccccc",
            accent: "#ff0000",
            error: "#ff6b6b",
          },
        },
      },
    };

    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeData,
    } as Response);

    const { loadThemeIndex, setTheme } = useTheme();
    await loadThemeIndex();

    const setPropertySpy = vi.spyOn(document.documentElement.style, "setProperty");
    setTheme("test-theme");

    expect(setPropertySpy).toHaveBeenCalledWith("--accent", "#ff0000");
    expect(setPropertySpy).toHaveBeenCalledWith("--bg0", "#000000");
  });

  it("should compute themes array from theme index", async () => {
    const mockThemeData = {
      themes: {
        "theme-1": { key: "theme-1" },
        "theme-2": { key: "theme-2" },
      },
    };

    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockThemeData,
    } as Response);

    const { loadThemeIndex, themes } = useTheme();
    await loadThemeIndex();

    expect(themes.value).toHaveLength(2);
    expect(themes.value[0].key).toBe("theme-1");
  });
});
