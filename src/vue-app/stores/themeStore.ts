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
  { name: "Attractor", baseHue: 10, description: "Attractor" },
  { name: "Cipher", baseHue: 240, description: "Cipher" },
  { name: "Convolution", baseHue: 90, description: "Convolution" },
  { name: "Datamosh", baseHue: 160, description: "Datamosh" },
  { name: "DriftField", baseHue: 140, description: "Drift Field" },
  { name: "Erosion", baseHue: 210, description: "Erosion" },
  { name: "Filament", baseHue: 195, description: "Filament" },
  { name: "Fracture", baseHue: 120, description: "Fracture" },
  { name: "Interference", baseHue: 280, description: "Interference" },
  { name: "Kaleidoscope", baseHue: 290, description: "Kaleidoscope" },
  { name: "Lattice", baseHue: 160, description: "Lattice" },
  { name: "Orbital", baseHue: 320, description: "Orbital" },
  { name: "Parallax", baseHue: 345, description: "Parallax" },
  { name: "Penrose", baseHue: 50, description: "Penrose" },
  { name: "Ripple", baseHue: 200, description: "Ripple" },
  { name: "Scatter", baseHue: 28, description: "Scatter" },
  { name: "Signal", baseHue: 250, description: "Signal" },
  { name: "Stratum", baseHue: 78, description: "Stratum" },
  { name: "Tessellate", baseHue: 175, description: "Tessellate" },
  { name: "Topology", baseHue: 100, description: "Topology" },
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
