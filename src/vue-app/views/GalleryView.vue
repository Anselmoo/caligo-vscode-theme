<script setup lang="ts">
/**
 * Themes: the whole family on the Theme Spectrum, then the active variant up close
 * (a live editor drawn from its colours and its palette), how to wear it in VS Code,
 * and its colours as tokens for your own project.
 */
import { computed } from "vue";
import ExportPanel from "../components/export/ExportPanel.vue";
import VariantDetail from "../components/gallery/VariantDetail.vue";
import ThemeSpectrum from "../components/theme/ThemeSpectrum.vue";
import WearIt from "../components/theme/WearIt.vue";
import { useScreenshots } from "../composables/useScreenshots.js";
import { useTheme } from "../composables/useTheme.js";
import { resolveScreenshotPath } from "../utils/asset-paths.js";

const { themes, currentTheme, isLoading, error } = useTheme();
const { screenshots } = useScreenshots();

const hasThemes = computed(() => themes.value.length > 0);

/** A real screenshot only when the manifest says CI generated one. */
const screenshot = computed(() => {
  const key = currentTheme.value?.key;
  const entry = screenshots.value.find(s => s.themeKey === key);
  return entry?.exists ? resolveScreenshotPath(entry.filename) : null;
});
</script>

<template>
  <div class="themes">
    <header class="themes__head">
      <h1 class="themes__title">Themes</h1>
      <p class="themes__lede">
        Ten palettes, each in five harmony modes. Pick one and this whole site wears it; below,
        see it in an editor and take it home.
      </p>
    </header>

    <p v-if="error" class="notice">
      The theme list could not be loaded ({{ error.message }}). Check your connection and reload
      the page.
    </p>
    <p v-else-if="!hasThemes && isLoading" class="notice">Loading themes</p>

    <template v-if="hasThemes">
      <ThemeSpectrum />

      <div v-if="currentTheme" class="themes__detail">
        <VariantDetail :theme="currentTheme" :screenshot="screenshot" />
        <div class="themes__take">
          <WearIt />
          <ExportPanel />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.themes {
  display: grid;
  gap: clamp(32px, 5vw, 56px);
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(40px, 8vh, 96px) var(--gutter) clamp(56px, 10vh, 120px);
}

.themes__title {
  margin: 0 0 18px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.25rem + 2.3vw, 3.3rem);
  font-weight: 340;
  font-stretch: 106%;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.themes__lede {
  max-width: var(--measure);
  margin: 0;
  color: var(--fg1);
  font-size: var(--step-1);
  line-height: 1.55;
  text-wrap: pretty;
}

.themes__detail {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: clamp(28px, 4vw, 56px);
  align-items: start;
  padding-top: clamp(24px, 4vw, 40px);
  border-top: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
}

.themes__take {
  display: grid;
  gap: clamp(28px, 4vw, 40px);
  min-width: 0;
}

.notice {
  margin: 0;
  color: var(--fg-muted);
}

@media (max-width: 960px) {
  .themes__detail {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
