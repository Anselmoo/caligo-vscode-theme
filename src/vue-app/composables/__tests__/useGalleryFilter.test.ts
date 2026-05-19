/**
 * Unit tests for useGalleryFilter composable
 */

import type { ThemeScreenshot } from "@types/gallery";
import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useGalleryFilter } from "../useGalleryFilter";

describe("useGalleryFilter", () => {
  const mockScreenshots = ref<ThemeScreenshot[]>([
    {
      themeName: "Deep Sable Balanced",
      seedId: "deep-sable",
      harmonyMode: "balanced",
      filename: "deep-sable-balanced.png",
      exists: true,
    },
    {
      themeName: "Signal Triadic",
      seedId: "eclipse",
      harmonyMode: "triadic",
      filename: "eclipse-triadic.png",
      exists: true,
    },
    {
      themeName: "Deep Sable Analogous",
      seedId: "deep-sable",
      harmonyMode: "analogous",
      filename: "deep-sable-analogous.png",
      exists: true,
    },
  ]);

  it("should filter by search term", () => {
    const { filteredScreenshots, setSearch } = useGalleryFilter(mockScreenshots);

    setSearch("eclipse");
    expect(filteredScreenshots.value).toHaveLength(1);
    expect(filteredScreenshots.value[0].themeName).toBe("Signal Triadic");
  });

  it("should filter by seed", () => {
    const { filteredScreenshots, setSeedFilter } = useGalleryFilter(mockScreenshots);

    setSeedFilter("deep-sable");
    expect(filteredScreenshots.value).toHaveLength(2);
  });

  it("should filter by harmony mode", () => {
    const { filteredScreenshots, setHarmonyFilter } = useGalleryFilter(mockScreenshots);

    setHarmonyFilter("triadic");
    expect(filteredScreenshots.value).toHaveLength(1);
    expect(filteredScreenshots.value[0].harmonyMode).toBe("triadic");
  });

  it("should combine multiple filters", () => {
    const { filteredScreenshots, setSearch, setSeedFilter } = useGalleryFilter(mockScreenshots);

    setSearch("deep");
    setSeedFilter("deep-sable");
    expect(filteredScreenshots.value).toHaveLength(2);
  });

  it("should clear all filters", () => {
    const { filteredScreenshots, setSearch, clearFilters } = useGalleryFilter(mockScreenshots);

    setSearch("test");
    expect(filteredScreenshots.value).toHaveLength(0);

    clearFilters();
    expect(filteredScreenshots.value).toHaveLength(3);
  });

  it("should extract available seeds", () => {
    const { availableSeeds } = useGalleryFilter(mockScreenshots);

    expect(availableSeeds.value).toEqual([
      { id: "deep-sable", label: "deep-sable" },
      { id: "eclipse", label: "eclipse" },
    ]);
  });

  it("should extract available harmonies", () => {
    const { availableHarmonies } = useGalleryFilter(mockScreenshots);

    expect(availableHarmonies.value).toEqual([
      { id: "balanced", label: "Balanced" },
      { id: "analogous", label: "Analogous" },
      { id: "triadic", label: "Triadic" },
    ]);
  });

  it("should track active filters", () => {
    const { hasActiveFilters, setSearch, clearFilters } = useGalleryFilter(mockScreenshots);

    expect(hasActiveFilters.value).toBe(false);

    setSearch("test");
    expect(hasActiveFilters.value).toBe(true);

    clearFilters();
    expect(hasActiveFilters.value).toBe(false);
  });

  it("should count filtered results", () => {
    const { resultCount, setSeedFilter } = useGalleryFilter(mockScreenshots);

    expect(resultCount.value).toBe(3);

    setSeedFilter("deep-sable");
    expect(resultCount.value).toBe(2);
  });
});
