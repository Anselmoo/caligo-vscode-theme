/**
 * useGalleryFilter Composable
 * Manages gallery search and filtering state
 */

import { computed, type Ref, ref } from "vue";
import type { GalleryFilters, GalleryOption, ThemeScreenshot } from "../types/gallery.js";
import type { ThemeHarmony, ThemeSeed } from "../types/theme.js";
import { harmonySortIndex } from "../utils/harmony-utils.js";
import { useTheme } from "./useTheme.js";

export function useGalleryFilter(screenshots: Ref<ThemeScreenshot[]>) {
  const { seeds, harmonies } = useTheme();

  // Filter state
  const filters = ref<GalleryFilters>({
    search: "",
    seed: "",
    harmony: "",
  });

  /**
   * Filtered screenshots based on current filters
   */
  const filteredScreenshots = computed(() => {
    const seedIndex = new Map<string, number>();
    // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach only used for side effects
    seeds.value.forEach((seed: ThemeSeed, index: number) => seedIndex.set(seed.id, index));

    return screenshots.value
      .filter(screenshot => {
        // Search filter (matches theme name)
        if (filters.value.search) {
          const searchLower = filters.value.search.toLowerCase();
          if (!screenshot.themeName.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        // Seed filter
        if (filters.value.seed && screenshot.seedId !== filters.value.seed) {
          return false;
        }

        // Harmony filter
        if (filters.value.harmony && screenshot.harmonyMode !== filters.value.harmony) {
          return false;
        }

        return true;
      })
      .slice()
      .sort((a, b) => {
        const seedA = seedIndex.get(a.seedId) ?? Number.POSITIVE_INFINITY;
        const seedB = seedIndex.get(b.seedId) ?? Number.POSITIVE_INFINITY;
        if (seedA !== seedB) return seedA - seedB;

        const harmonyA = harmonySortIndex(a.harmonyMode);
        const harmonyB = harmonySortIndex(b.harmonyMode);
        if (harmonyA !== harmonyB) return harmonyA - harmonyB;

        return a.themeName.localeCompare(b.themeName);
      });
  });

  /**
   * Get unique seed IDs from screenshots
   */
  const availableSeeds = computed(() => {
    const present = new Set(screenshots.value.map(s => s.seedId));
    const ordered: GalleryOption[] = seeds.value
      .filter((seed: ThemeSeed) => present.has(seed.id))
      .map((seed: ThemeSeed) => ({ id: seed.id, label: seed.label }));

    const missing = Array.from(present)
      .filter(id => !ordered.some(s => s.id === id))
      .sort()
      .map(id => ({ id, label: id }));

    return [...ordered, ...missing];
  });

  /**
   * Get unique harmony modes from screenshots
   */
  const availableHarmonies = computed(() => {
    const present = new Set(screenshots.value.map(s => s.harmonyMode));
    const ordered: GalleryOption[] = harmonies.value
      .filter((harmony: ThemeHarmony) => present.has(harmony.id))
      .map((harmony: ThemeHarmony) => ({ id: harmony.id, label: harmony.label }));

    const missing = Array.from(present)
      .filter(id => !ordered.some(h => h.id === id))
      .sort((a, b) => harmonySortIndex(a) - harmonySortIndex(b))
      .map(id => ({ id, label: id }));

    return [...ordered, ...missing];
  });

  /**
   * Set search term
   */
  const setSearch = (search: string) => {
    filters.value.search = search;
  };

  /**
   * Set seed filter
   */
  const setSeedFilter = (seed: string) => {
    filters.value.seed = seed;
  };

  /**
   * Set harmony filter
   */
  const setHarmonyFilter = (harmony: string) => {
    filters.value.harmony = harmony;
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    filters.value = {
      search: "",
      seed: "",
      harmony: "",
    };
  };

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = computed(() => {
    return !!(filters.value.search || filters.value.seed || filters.value.harmony);
  });

  /**
   * Result count
   */
  const resultCount = computed(() => filteredScreenshots.value.length);

  return {
    // State
    filters,
    filteredScreenshots,
    availableSeeds,
    availableHarmonies,
    resultCount,
    hasActiveFilters,

    // Actions
    setSearch,
    setSeedFilter,
    setHarmonyFilter,
    clearFilters,
  };
}
