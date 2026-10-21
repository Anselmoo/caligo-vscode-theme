<script setup lang="ts">
/**
 * Themes: every variant (palette x harmony mode) in one matrix, a quiet filter
 * toolbar above it, and the selected variant's screenshot and palette beside it.
 * Choosing a swatch applies that theme to the whole site.
 */
import { computed, ref } from "vue";
import ThemeFilters from "../components/gallery/ThemeFilters.vue";
import ThemeMatrix from "../components/gallery/ThemeMatrix.vue";
import VariantDetail from "../components/gallery/VariantDetail.vue";
import { useScreenshots } from "../composables/useScreenshots.js";
import { useTheme } from "../composables/useTheme.js";
import type { ThemeIndexEntry } from "../types/theme.js";
import { resolveScreenshotPath } from "../utils/asset-paths.js";

const { themes, seeds, harmonies, currentTheme, currentThemeKey, setTheme, isLoading, error } =
  useTheme();
const { screenshots, isLoading: screenshotsLoading } = useScreenshots();

const seedFilter = ref("");
const modeFilter = ref("");
const search = ref("");
const announcement = ref("");

const seedOptions = computed(() => seeds.value.map(s => ({ id: s.id, label: s.label })));
const harmonyIds = computed(() => harmonies.value.map(h => h.id as string));
// Labels come from the variants themselves ("Split Complementary"), the same words
// each swatch uses in its accessible name.
const modeOptions = computed(() =>
  harmonies.value.map(h => ({
    id: h.id as string,
    label: themes.value.find(t => t.harmonyId === h.id)?.harmonyLabel ?? h.label,
  }))
);

function matches(theme: ThemeIndexEntry): boolean {
  if (seedFilter.value && theme.seedId !== seedFilter.value) return false;
  if (modeFilter.value && theme.harmonyId !== modeFilter.value) return false;
  const query = search.value.trim().toLowerCase();
  if (!query) return true;
  return `${theme.displayName} ${theme.seedLabel} ${theme.harmonyLabel}`
    .toLowerCase()
    .includes(query);
}

const visible = computed(() => themes.value.filter(matches));
const hasFilters = computed(() => !!(seedFilter.value || modeFilter.value || search.value.trim()));
const hasThemes = computed(() => themes.value.length > 0);

function clearFilters() {
  seedFilter.value = "";
  modeFilter.value = "";
  search.value = "";
}

function choose(key: string) {
  setTheme(key);
  const chosen = themes.value.find(t => t.key === key);
  announcement.value = chosen ? `Applied ${chosen.displayName}` : "";
}

/** Screenshot of the selected variant: the generated manifest names the file. */
const screenshot = computed(() => {
  const key = currentTheme.value?.key;
  if (!key || screenshotsLoading.value) return null;
  const entry = screenshots.value.find(s => s.themeKey === key);
  return resolveScreenshotPath(entry?.filename ?? `${key}.png`);
});

</script>

<template>
  <div class="themes">
    <header class="themes__head">
      <h1 class="themes__title">Themes</h1>
      <p class="themes__lede">
        {{ seeds.length }} palettes, each in {{ harmonies.length }} harmony modes. Choose a variant
        to apply it across this site and see how it looks in VS Code.
      </p>
    </header>

    <div class="themes__body">
      <div class="themes__browse">
        <p v-if="error" class="notice">
          The theme list could not be loaded ({{ error.message }}). Check your connection and reload
          the page.
        </p>
        <p v-else-if="!hasThemes && isLoading" class="notice">Loading themes</p>

        <template v-else>
          <ThemeFilters
            v-model:seed="seedFilter"
            v-model:mode="modeFilter"
            v-model:search="search"
            :seeds="seedOptions"
            :modes="modeOptions"
            :shown="visible.length"
            :total="themes.length"
            :can-clear="hasFilters && visible.length > 0"
            @clear="clearFilters"
          />

          <ThemeMatrix
            v-if="visible.length > 0"
            class="themes__matrix"
            :variants="visible"
            :seeds="seedOptions"
            :harmony-ids="harmonyIds"
            :current-key="currentThemeKey"
            @select="choose"
          />
          <div v-else class="empty">
            <p>No variant matches these filters.</p>
            <button type="button" class="empty__clear" @click="clearFilters">Clear filters</button>
          </div>
        </template>

        <p class="visually-hidden" role="status">{{ announcement }}</p>
      </div>

      <div v-if="currentTheme" class="themes__detail">
        <VariantDetail :theme="currentTheme" :screenshot="screenshot" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.themes {
  box-sizing: border-box;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(40px, 8vh, 88px) var(--gutter) clamp(56px, 10vh, 112px);
}

.themes__head {
  margin-bottom: clamp(28px, 5vh, 48px);
}

.themes__title {
  margin: 0 0 14px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: var(--step-3);
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

.themes__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(36px, 6vh, 56px) clamp(32px, 4vw, 64px);
  align-items: start;
}

.themes__browse {
  min-width: 0;
}

.themes__matrix {
  margin-top: clamp(24px, 4vh, 36px);
}

.themes__detail {
  min-width: 0;
}

.notice,
.empty {
  max-width: var(--measure);
  margin: 0;
  color: var(--fg1);
  line-height: 1.55;
}

.empty {
  margin-top: 32px;
}

.empty p {
  margin: 0 0 14px;
}

.empty__clear {
  height: 40px;
  padding: 0 16px;
  border: 1px solid color-mix(in oklab, var(--fg0) 24%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--fg0);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.empty__clear:hover {
  border-color: color-mix(in oklab, var(--fg0) 50%, transparent);
}

.empty__clear:focus-visible {
  outline: 2px solid var(--fg0);
  outline-offset: 2px;
}

@media (min-width: 1100px) {
  .themes__body {
    grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
  }

  .themes__detail {
    position: sticky;
    top: 76px;
  }
}
</style>
