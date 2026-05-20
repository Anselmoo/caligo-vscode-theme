<script setup lang="ts">
import { computed, onMounted } from "vue";
// biome-ignore lint/correctness/noUnusedImports: used in Vue template
import WallpaperCard from "../components/wallpapers/WallpaperCard.vue";
// biome-ignore lint/correctness/noUnusedImports: used in Vue template
import WallpaperFilters from "../components/wallpapers/WallpaperFilters.vue";
import { useWallpapers } from "../composables/useWallpapers";

const {
  entries,
  loading,
  error,
  filter,
  filteredEntries,
  allSeeds,
  allModes,
  loadManifest,
  setFilter,
  resetFilter,
} = useWallpapers();

onMounted(loadManifest);

const downloadAllUrl = computed(() => "./caligo-wallpapers.zip");

const gridEntries = computed(() => filteredEntries.value);

// Silence biome: all vars below are used in the Vue template
void entries;
void error;
void loading;
void filter;
void allSeeds;
void allModes;
void setFilter;
void resetFilter;
void downloadAllUrl;
void gridEntries;
</script>

<template>
  <main class="wallpapers-view container">
    <!-- Header -->
    <header class="view-header">
      <div class="header-text">
        <h1 class="view-title">Wallpapers</h1>
        <p class="view-desc">
          50 unique wallpapers — 10 Caligo themes × 5 harmony modes, each with a distinct visual
          topic. Available for monitor, tablet, and mobile in text and no-text variants.
        </p>
      </div>
      <a :href="downloadAllUrl" download="caligo-wallpapers.zip" class="download-all-btn">
        <i class="pi pi-download" /> Download All (ZIP)
      </a>
    </header>

    <!-- Filters -->
    <WallpaperFilters
      :filter="filter"
      :seeds="allSeeds"
      :modes="allModes"
      @update="setFilter"
      @reset="resetFilter"
    />

    <!-- State: loading / error / empty -->
    <div v-if="loading" class="state-message">
      <span class="spinner" aria-hidden="true" />
      Loading wallpapers…
    </div>

    <div v-else-if="error" class="state-message error" role="alert">
      ❌ Could not load wallpapers: {{ error }}<br />
      <small>Run <code>npm run wallpapers:generate</code> to generate the wallpaper files.</small>
    </div>

    <div v-else-if="gridEntries.length === 0" class="state-message">
      No wallpapers match the current filters.
      <button class="link-btn" @click="resetFilter">Reset filters</button>
    </div>

    <!-- Grid -->
    <div v-else class="wallpapers-grid">
      <WallpaperCard
        v-for="entry in gridEntries"
        :key="`${entry.seedId}-${entry.harmonyMode}-${entry.platform}-${entry.textVariant}`"
        :entry="entry"
        :active-platform="filter.platform ?? 'monitor'"
        :active-text-variant="filter.textVariant ?? 'no-text'"
      />
    </div>

    <!-- Count -->
    <p v-if="!loading && gridEntries.length > 0" class="grid-count">
      Showing {{ gridEntries.length }} wallpaper{{ gridEntries.length !== 1 ? "s" : "" }}
    </p>
  </main>
</template>

<style scoped>
.wallpapers-view {
  padding: var(--space-xl) var(--space-lg);
  min-height: 80vh;
}

.view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.header-text {
  flex: 1 1 300px;
}

.view-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--fg0);
  margin: 0 0 var(--space-sm);
}

.view-desc {
  color: var(--fg2);
  font-size: var(--text-md);
  max-width: 560px;
  margin: 0;
  line-height: 1.6;
}

.download-all-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: var(--text-md);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.download-all-btn:hover {
  background: var(--accent);
  color: var(--bg0);
}

.wallpapers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
  margin-top: var(--space-xl);
}

.state-message {
  margin-top: var(--space-2xl);
  text-align: center;
  color: var(--fg2);
  font-size: var(--text-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.state-message.error {
  color: var(--hue-red);
}

.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.grid-count {
  margin-top: var(--space-xl);
  text-align: center;
  color: var(--fg3, var(--fg2));
  font-size: var(--text-sm);
}

.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
  padding: 0;
}
</style>
