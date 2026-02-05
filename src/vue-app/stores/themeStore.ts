import { formatHex } from "culori";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
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
      colors: generateColorPalette(hues),
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

  function generateColorPalette(hues: number[]) {
    const palette: Record<string, string> = {};

    // Use primary hue for base colors
    const primaryHue = hues[0];

    // Background layers (low lightness, subtle hue tint)
    palette.bg0 = formatHex({ mode: "oklch", l: 0.1, c: 0.02, h: primaryHue }) || "#000000";
    palette.bg1 = formatHex({ mode: "oklch", l: 0.15, c: 0.025, h: primaryHue }) || "#0f0f0f";
    palette.bg2 = formatHex({ mode: "oklch", l: 0.2, c: 0.03, h: primaryHue }) || "#1a1a1a";

    // Foreground layers (high lightness, subtle hue tint)
    palette.fg0 = formatHex({ mode: "oklch", l: 0.85, c: 0.05, h: primaryHue }) || "#d9d9d9";
    palette.fgMuted = formatHex({ mode: "oklch", l: 0.6, c: 0.04, h: primaryHue }) || "#999999";
    palette.fgDisabled = formatHex({ mode: "oklch", l: 0.35, c: 0.03, h: primaryHue }) || "#595959";

    // Accent colors - use primary and secondary hues from harmony
    palette.accent = formatHex({ mode: "oklch", l: 0.65, c: 0.15, h: primaryHue }) || "#8080ff";
    palette.accentAlt =
      formatHex({ mode: "oklch", l: 0.65, c: 0.15, h: hues[1] || primaryHue }) || "#ff8080";

    // Semantic tokens - map to harmony hues for visual variety
    // For Balanced (1 hue): use offset hues for variety
    // For Analogous (3 hues): distribute across the 3 hues
    // For Triadic (3 hues): distribute across the 3 hues
    // For monochromatic: use same hue with different offsets
    const semanticHues =
      hues.length === 1
        ? [
            primaryHue,
            (primaryHue + 30) % 360,
            (primaryHue + 60) % 360,
            (primaryHue + 90) % 360,
            (primaryHue + 120) % 360,
            (primaryHue + 150) % 360,
          ]
        : hues.length === 3
          ? [hues[0], hues[1], hues[2], hues[0], hues[1], hues[2]]
          : hues;

    palette.declaration =
      formatHex({ mode: "oklch", l: 0.65, c: 0.13, h: semanticHues[0] }) || "#9580ff";
    palette.mutation =
      formatHex({ mode: "oklch", l: 0.68, c: 0.12, h: semanticHues[1] }) || "#ff9580";
    palette.usage = formatHex({ mode: "oklch", l: 0.7, c: 0.14, h: semanticHues[2] }) || "#80d4ff";
    palette.control =
      formatHex({ mode: "oklch", l: 0.65, c: 0.14, h: semanticHues[3] }) || "#8095ff";
    palette.data = formatHex({ mode: "oklch", l: 0.68, c: 0.12, h: semanticHues[4] }) || "#ff80d4";
    palette.literal =
      formatHex({ mode: "oklch", l: 0.7, c: 0.13, h: semanticHues[5] }) || "#80ffaa";

    return palette;
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
