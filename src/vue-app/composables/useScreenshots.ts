/**
 * useScreenshots Composable
 * Loads and manages screenshot data
 */

import { onMounted, ref } from "vue";
import type { ThemeScreenshot } from "../types/gallery.js";
import type { ThemeIndex, ThemeIndexEntry } from "../types/theme.js";

export function useScreenshots() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const screenshots = ref<ThemeScreenshot[]>([]);
  const isLoading = ref(true);
  const error = ref<Error | null>(null);

  /**
   * Load screenshot data
   * In production, this would come from a manifest file generated at build time
   */
  const loadScreenshots = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      // Try to load screenshot manifest first
      let screenshotsLoaded = false;
      try {
        const response = await fetch(`${baseUrl}screenshots-manifest.json`);
        if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
          const data = await response.json();
          screenshots.value = data.screenshots || data;
          screenshotsLoaded = true;
        }
      } catch {
        // Screenshot manifest doesn't exist, will use fallback
      }

      // Fallback: generate expected screenshots based on theme index
      if (!screenshotsLoaded) {
        const themeIndexResponse = await fetch(`${baseUrl}themes-manifest.json`);
        if (!themeIndexResponse.ok) {
          throw new Error("Failed to load theme index");
        }

        const themeIndex = (await themeIndexResponse.json()) as ThemeIndex;
        const bySeedHarmony = new Map<string, ThemeIndexEntry>();
        for (const theme of Object.values(themeIndex.themes)) {
          bySeedHarmony.set(`${theme.seedId}|${theme.harmonyId}`, theme);
        }

        const ordered: ThemeScreenshot[] = [];
        for (const seed of themeIndex.seeds ?? []) {
          for (const harmony of themeIndex.harmonies ?? []) {
            const theme = bySeedHarmony.get(`${seed.id}|${harmony.id}`);
            if (!theme) continue;
            ordered.push({
              themeKey: theme.key,
              themeName: theme.displayName,
              seedId: theme.seedId,
              seedLabel: theme.seedLabel ?? seed.label ?? theme.seedId,
              harmonyMode: theme.harmonyId,
              harmonyLabel: theme.harmonyLabel ?? harmony.label ?? theme.harmonyId,
              filename: `${theme.key}.png`,
              exists: false,
            });
          }
        }

        screenshots.value = ordered;
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      console.error("Failed to load screenshots:", err);
      screenshots.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Auto-load on mount
  onMounted(() => {
    loadScreenshots();
  });

  return {
    screenshots,
    isLoading,
    error,
    loadScreenshots,
  };
}
