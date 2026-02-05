<script setup lang="ts">
import { computed, ref } from "vue";
import GalleryFilter from "../components/gallery/GalleryFilter.vue";
import Lightbox from "../components/gallery/Lightbox.vue";
import ScreenshotCard from "../components/gallery/ScreenshotCard.vue";
import { useGalleryFilter } from "../composables/useGalleryFilter.js";
import { useScreenshots } from "../composables/useScreenshots.js";
import { useTheme } from "../composables/useTheme.js";
import type { ThemeScreenshot } from "../types/gallery.js";
import { resolveScreenshotPath } from "../utils/asset-paths.js";
import { getHarmonyLabel } from "../utils/harmony-utils.js";

const { screenshots, isLoading, error } = useScreenshots();
const { setTheme } = useTheme();

const {
  filters,
  filteredScreenshots,
  availableSeeds,
  availableHarmonies,
  resultCount,
  hasActiveFilters,
  setSearch,
  setSeedFilter,
  setHarmonyFilter,
  clearFilters,
} = useGalleryFilter(screenshots);

// Lightbox state
const lightboxOpen = ref(false);
const lightboxIndex = ref(-1);

const lightboxItems = ref<
  Array<{
    src: string;
    alt: string;
    title: string;
    modeLabel: string;
  }>
>([]);

const totalThemes = computed(() => screenshots.value.length);

const openLightbox = (index: number) => {
  // Build lightbox items from current filtered screenshots
  lightboxItems.value = filteredScreenshots.value.map((screenshot: ThemeScreenshot) => ({
    src: resolveScreenshotPath(screenshot.filename),
    alt: `${screenshot.themeName} - ${screenshot.seedLabel || screenshot.seedId} (${screenshot.harmonyLabel || getHarmonyLabel(screenshot.harmonyMode)})`,
    title: screenshot.themeName,
    modeLabel: screenshot.harmonyLabel || getHarmonyLabel(screenshot.harmonyMode),
  }));

  lightboxIndex.value = index;
  lightboxOpen.value = true;

  // Apply selected theme in SPA
  const selected = filteredScreenshots.value[index];
  if (selected) {
    if (selected.themeKey) {
      setTheme(selected.themeKey);
    } else {
      const seedKebab = selected.seedId
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
      const mode = selected.harmonyMode === "none" ? "balanced" : selected.harmonyMode;
      setTheme(`caligo-${seedKebab}-${mode}`);
    }
  }
};

const closeLightbox = () => {
  lightboxOpen.value = false;
  lightboxIndex.value = -1;
};

const nextImage = () => {
  if (lightboxItems.value.length > 0) {
    lightboxIndex.value = (lightboxIndex.value + 1) % lightboxItems.value.length;
  }
};

const prevImage = () => {
  if (lightboxItems.value.length > 0) {
    lightboxIndex.value =
      (lightboxIndex.value - 1 + lightboxItems.value.length) % lightboxItems.value.length;
  }
};

const totalThemesText = computed(() => (totalThemes.value ? `${totalThemes.value}` : "…"));

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
void GalleryFilter;
void Lightbox;
void ScreenshotCard;
void filters;
void filteredScreenshots;
void availableSeeds;
void availableHarmonies;
void resultCount;
void hasActiveFilters;
void setSearch;
void setSeedFilter;
void setHarmonyFilter;
void clearFilters;
void openLightbox;
void closeLightbox;
void nextImage;
void prevImage;
void totalThemesText;
void isLoading;
void error;
</script>

<template>
  <div class="gallery-view">
    <div class="container">
      <!-- Header -->
      <section class="gallery-header section">
        <h1>Theme Gallery</h1>
        <p class="page-description">
          Browse all {{ totalThemesText }} Caligo theme variations with live screenshots.
          Filter by seed palette or harmony mode to find your perfect theme.
        </p>
      </section>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <p class="loading-text">Loading screenshots...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p class="error-text">Failed to load screenshots: {{ error.message }}</p>
      </div>

      <!-- Gallery Content -->
      <div v-else>
        <!-- Filter Controls -->
        <GalleryFilter
          :search="filters.search"
          :seed="filters.seed"
          :harmony="filters.harmony"
          :available-seeds="availableSeeds"
          :available-harmonies="availableHarmonies"
          :result-count="resultCount"
          :has-active-filters="hasActiveFilters"
          @update:search="setSearch"
          @update:seed="setSeedFilter"
          @update:harmony="setHarmonyFilter"
          @clear="clearFilters"
        />

        <!-- Screenshot Grid -->
        <div v-if="filteredScreenshots.length > 0" class="gallery-grid">
          <ScreenshotCard
            v-for="(screenshot, index) in filteredScreenshots"
            :key="screenshot.filename"
            :theme-name="screenshot.themeName"
            :filename="screenshot.filename"
            :seed-id="screenshot.seedId"
            :seed-label="screenshot.seedLabel"
            :harmony-mode="screenshot.harmonyMode"
            :harmony-label="screenshot.harmonyLabel"
            @open="openLightbox(index)"
          />
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <p class="empty-text">No themes match your filters.</p>
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="btn-reset"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <Lightbox 
      :open="lightboxOpen"
      :items="lightboxItems"
      :current-index="lightboxIndex"
      @close="closeLightbox"
      @next="nextImage"
      @prev="prevImage"
    />
  </div>
</template>

<style scoped>
.gallery-view {
  min-height: 100vh;
  padding: var(--space-2xl) 0;
}

.gallery-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}


.page-description {
  font-size: var(--text-lg);
  color: var(--syntax-types);
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: var(--space-3xl) 0;
}

.loading-text {
  font-size: var(--text-lg);
  color: var(--syntax-functions);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.error-text {
  font-size: var(--text-lg);
  color: var(--error);
}

.empty-text {
  font-size: var(--text-lg);
  color: var(--syntax-types);
  margin-bottom: var(--space-lg);
}

.btn-reset {
  background: var(--accent);
  color: var(--bg0);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-xl);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-reset:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-md);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-lg);
}

@media (min-width: 800px) {
  .gallery-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .gallery-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {

  .gallery-grid {
    grid-template-columns: 1fr;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
