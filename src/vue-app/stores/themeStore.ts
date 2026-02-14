import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { oklch } from "../../lib/color.js";
import type { Seed } from "../../lib/constraints.js";
import { derivePalette } from "../../lib/palette.js";
import type { HarmonyMode } from "../../types/harmony.js";
import type { PreviewHarmonyMode, PreviewPalette, PreviewThemeSeed } from "../../types/preview.js";

/**
 * Theme Store for Live Preview Demo
 *
 * ⚠️ IMPORTANT: This store generates colors CLIENT-SIDE for the interactive
 * seed/harmony picker demonstration (ThemeSpectrum component).
 *
 * For the main site theming, use the `useTheme()` composable which loads
 * pre-generated themes from the build artifacts.
 *
 * This store is ONLY used by:
 * - ThemeSpectrum.vue (interactive color wheel demo)
 * - Color harmony visualization components
 *
 * It is NOT used for styling the main Vue app UI.
 */

// Seed palette metadata sourced from seeds-manifest.json (accent hue as base)
export const THEME_SEEDS: PreviewThemeSeed[] = [
  { name: "AuroraNoir", baseHue: 160, description: "Aurora Noir" },
  { name: "Cinder", baseHue: 35, description: "Cinder" },
  { name: "DeepSable", baseHue: 250, description: "Deep Sable" },
  { name: "Eclipse", baseHue: 215, description: "Eclipse" },
  { name: "GraphiteFlux", baseHue: 175, description: "Graphite Flux" },
  { name: "Mandarian", baseHue: 55, description: "Mandarian" },
  { name: "MidnightAtelier", baseHue: 320, description: "Midnight Atelier" },
  { name: "NebulaNight", baseHue: 285, description: "Nebula Night" },
  { name: "ObsidianGlow", baseHue: 195, description: "Obsidian Glow" },
  { name: "VoidEmber", baseHue: 10, description: "Void Ember" },
];

export const HARMONY_MODES: PreviewHarmonyMode[] = [
  {
    id: "balanced",
    name: "Balanced",
    description: "Original seed colors",
    generateHues: (baseHue: number) => [baseHue],
  },
  {
    id: "monochromatic",
    name: "Monochromatic",
    description: "Same hue, varying lightness",
    generateHues: (baseHue: number) => [baseHue, baseHue, baseHue],
  },
  {
    id: "analogous",
    name: "Analogous",
    description: "±30° hue rotation",
    generateHues: (baseHue: number) => [(baseHue - 30 + 360) % 360, baseHue, (baseHue + 30) % 360],
  },
  {
    id: "triadic",
    name: "Triadic",
    description: "120° hue intervals",
    generateHues: (baseHue: number) => [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360],
  },
  {
    id: "split-complementary",
    name: "Split-Complementary",
    description: "180° ± 30°",
    generateHues: (baseHue: number) => [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360],
  },
];

export const useThemeStore = defineStore("theme", () => {
  // State
  const selectedSeed = ref<PreviewThemeSeed>(THEME_SEEDS[0]);
  const selectedHarmony = ref<PreviewHarmonyMode>(HARMONY_MODES[0]);

  // Computed
  const currentPalette = computed<PreviewPalette>(() => {
    const hues = selectedHarmony.value.generateHues(selectedSeed.value.baseHue);
    return {
      seed: selectedSeed.value,
      harmony: selectedHarmony.value,
      hues,
      colors: generateColorPalette(hues, selectedHarmony.value.id),
    };
  });

  // Actions
  function selectSeed(seedName: string) {
    const seed = THEME_SEEDS.find(s => s.name === seedName);
    if (seed) selectedSeed.value = seed;
  }

  function selectHarmony(harmonyId: string) {
    const harmony = HARMONY_MODES.find(h => h.id === harmonyId);
    if (harmony) selectedHarmony.value = harmony;
  }

  function toHarmonyMode(harmonyId: string): HarmonyMode {
    if (
      harmonyId === "analogous" ||
      harmonyId === "monochromatic" ||
      harmonyId === "triadic" ||
      harmonyId === "split-complementary"
    ) {
      return harmonyId;
    }
    // The preview palette generator uses HarmonyMode="none" to represent the balanced base.
    return "none";
  }

  function generateColorPalette(hues: number[], harmonyId: string) {
    const primaryHue = hues[0];
    const seed: Seed = {
      id: selectedSeed.value.name,
      displayName: selectedSeed.value.description,
      background: oklch(0.1, 0.02, primaryHue),
      accent: oklch(0.65, 0.15, primaryHue),
      harmony: toHarmonyMode(harmonyId),
    };
    const palette = derivePalette(seed, "Balanced");

    return {
      bg0: palette.bg0,
      bg1: palette.bg1,
      bg2: palette.bg2,
      fg0: palette.fg0,
      fgMuted: palette.fgMuted,
      fgDisabled: palette.fgMuted,
      accent: palette.accent,
      accentAlt: palette.accentSoft,
      declaration: palette.harmony.types,
      mutation: palette.harmony.keywords,
      usage: palette.harmony.variables,
      control: palette.harmony.keywords,
      data: palette.harmony.numbers,
      literal: palette.harmony.strings,
    };
  }

  return {
    selectedSeed,
    selectedHarmony,
    currentPalette,
    selectSeed,
    selectHarmony,
    THEME_SEEDS,
    HARMONY_MODES,
  };
});
