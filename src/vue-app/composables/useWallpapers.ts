/**
 * useWallpapers — composable for the wallpaper gallery.
 *
 * Loads wallpapers-manifest.json and exposes reactive filter state
 * so the WallpapersView can render a filtered, scrollable grid.
 */

import { computed, readonly, ref } from "vue";
import type { WallpaperManifestEntry, WallpapersManifest } from "../../wallpaper/types.js";

export type WallpaperFilter = {
  seedId: string | null;
  harmonyMode: string | null;
  platform: "monitor" | "tablet" | "mobile" | null;
  textVariant: "text" | "no-text" | null;
};

const MANIFEST_URL = "./wallpapers-manifest.json";

export function useWallpapers() {
  const entries = ref<WallpaperManifestEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const filter = ref<WallpaperFilter>({
    seedId: null,
    harmonyMode: null,
    platform: "monitor",
    textVariant: "no-text",
  });

  // Derived lists for filter selects
  const allSeeds = computed(() => {
    const seen = new Set<string>();
    return entries.value
      .filter(e => {
        if (seen.has(e.seedId)) return false;
        seen.add(e.seedId);
        return true;
      })
      .map(e => ({ id: e.seedId, label: e.seedDisplayName }));
  });

  const allModes = computed(() => {
    const seen = new Set<string>();
    return entries.value
      .filter(e => {
        if (seen.has(e.harmonyMode)) return false;
        seen.add(e.harmonyMode);
        return true;
      })
      .map(e => ({ id: e.harmonyMode, label: e.harmonyLabel, topic: e.topic }));
  });

  // Filtered entries
  const filteredEntries = computed(() => {
    const f = filter.value;
    return entries.value.filter(e => {
      if (f.seedId && e.seedId !== f.seedId) return false;
      if (f.harmonyMode && e.harmonyMode !== f.harmonyMode) return false;
      if (f.platform && e.platform !== f.platform) return false;
      if (f.textVariant && e.textVariant !== f.textVariant) return false;
      return true;
    });
  });

  async function loadManifest() {
    if (entries.value.length > 0) return; // already loaded
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(MANIFEST_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WallpapersManifest = await res.json();
      entries.value = data.entries;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  function setFilter(patch: Partial<WallpaperFilter>) {
    filter.value = { ...filter.value, ...patch };
  }

  function resetFilter() {
    filter.value = { seedId: null, harmonyMode: null, platform: "monitor", textVariant: "no-text" };
  }

  return {
    entries: readonly(entries),
    loading: readonly(loading),
    error: readonly(error),
    filter,
    filteredEntries,
    allSeeds,
    allModes,
    loadManifest,
    setFilter,
    resetFilter,
  };
}
