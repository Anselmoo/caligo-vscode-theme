/**
 * useWallpaperComposer — composable for the interactive wallpaper composer view.
 *
 * Loads seeds from the static seeds-manifest.json and exposes reactive
 * selector state + computed SVG preview URL.
 */

import { computed, readonly, ref } from "vue";
import type { Platform, TextVariant } from "../../wallpaper/types.js";

// ─── Static data ─────────────────────────────────────────────────────────────

export type HarmonyMode =
  | "none"
  | "analogous"
  | "split-complementary"
  | "monochromatic"
  | "triadic";

export const HARMONY_MODES: Array<{ id: HarmonyMode; label: string; topic: string }> = [
  { id: "none", label: "Balanced", topic: "Stillness" },
  { id: "analogous", label: "Analogous", topic: "Drift" },
  { id: "split-complementary", label: "Split-Comp", topic: "Break" },
  { id: "monochromatic", label: "Monochromatic", topic: "Void" },
  { id: "triadic", label: "Triadic", topic: "Pulse" },
];

export const PLATFORMS: Array<{ id: Platform; label: string; icon: string; aspect: string }> = [
  { id: "monitor", label: "Monitor", icon: "🖥", aspect: "16:9 (4K)" },
  { id: "tablet", label: "Tablet", icon: "⬛", aspect: "4:3 (2K)" },
  { id: "mobile", label: "Mobile", icon: "📱", aspect: "9:19.5 (HD)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeedEntry = { id: string; displayName: string };

// ─── URL helpers (mirrors wallpaperFilename in renderer.ts) ──────────────────

function modeDir(mode: HarmonyMode): string {
  return mode === "none" ? "balanced" : mode;
}

function buildSvgUrl(seedId: string, mode: HarmonyMode, platform: Platform, textVariant: TextVariant): string {
  const suffix = textVariant === "text" ? "-text" : "";
  return `./wallpapers/${seedId}/${modeDir(mode)}/${platform}${suffix}.svg`;
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useWallpaperComposer() {
  // ── Seed list ────────────────────────────────────────────────────────────
  const seeds = ref<SeedEntry[]>([]);
  const seedsLoading = ref(false);
  const seedsError = ref<string | null>(null);

  async function loadSeeds() {
    seedsLoading.value = true;
    try {
      const res = await fetch("./seeds-manifest.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Array<{ id: string; displayName: string }> = await res.json();
      seeds.value = data.map(s => ({ id: s.id, displayName: s.displayName }));
      if (seeds.value.length > 0 && !selectedSeed.value) {
        selectedSeed.value = seeds.value[0].id;
      }
    } catch (err) {
      seedsError.value = err instanceof Error ? err.message : String(err);
    } finally {
      seedsLoading.value = false;
    }
  }

  // ── Selection state ──────────────────────────────────────────────────────
  const selectedSeed = ref<string>("AuroraNoir");
  const selectedMode = ref<HarmonyMode>("none");
  const selectedPlatform = ref<Platform>("monitor");
  const selectedTextVariant = ref<TextVariant>("no-text");

  // ── Derived ──────────────────────────────────────────────────────────────
  const svgUrl = computed(() =>
    buildSvgUrl(selectedSeed.value, selectedMode.value, selectedPlatform.value, selectedTextVariant.value)
  );

  const currentMode = computed(() =>
    HARMONY_MODES.find(m => m.id === selectedMode.value) ?? HARMONY_MODES[0]
  );

  const currentPlatform = computed(() =>
    PLATFORMS.find(p => p.id === selectedPlatform.value) ?? PLATFORMS[0]
  );

  const currentSeed = computed(() =>
    seeds.value.find(s => s.id === selectedSeed.value)
  );

  return {
    // Seed list
    seeds: readonly(seeds),
    seedsLoading: readonly(seedsLoading),
    seedsError: readonly(seedsError),
    loadSeeds,

    // Selection (writable refs)
    selectedSeed,
    selectedMode,
    selectedPlatform,
    selectedTextVariant,

    // Derived
    svgUrl,
    currentMode,
    currentPlatform,
    currentSeed,

    // Static data for UI
    harmonyModes: HARMONY_MODES,
    platforms: PLATFORMS,
  };
}
