<script setup lang="ts">
import { onMounted } from "vue";
// biome-ignore lint/correctness/noUnusedImports: used in template
import type { Platform, TextVariant } from "../../wallpaper/types.js";
// biome-ignore lint/correctness/noUnusedImports: used in template
import type { HarmonyMode } from "../composables/useWallpaperComposer.js";
import { useWallpaperComposer } from "../composables/useWallpaperComposer.js";

const {
  seeds,
  seedsLoading,
  seedsError,
  loadSeeds,
  selectedSeed,
  selectedMode,
  selectedPlatform,
  selectedTextVariant,
  svgUrl,
  currentMode,
  currentPlatform,
  currentSeed,
  harmonyModes,
  platforms,
} = useWallpaperComposer();

onMounted(loadSeeds);

// Silence biome: all vars below are used in the Vue template
void seeds;
void seedsLoading;
void seedsError;
void selectedSeed;
void selectedMode;
void selectedPlatform;
void selectedTextVariant;
void svgUrl;
void currentMode;
void currentPlatform;
void currentSeed;
void harmonyModes;
void platforms;
</script>

<template>
  <main class="composer-view container">
    <header class="view-header">
      <div class="header-text">
        <h1 class="view-title">Wallpaper Composer</h1>
        <p class="view-desc">
          Explore wallpapers by seed, harmony mode, and platform. Each seed uses a dedicated
          scene — aurora mountains, desert night, ocean, eclipse, and more.
        </p>
      </div>
    </header>

    <!-- Controls -->
    <section class="controls" aria-label="Wallpaper selection">
      <!-- Seed selector -->
      <div class="control-group">
        <label class="control-label" for="seed-select">Theme Seed</label>
        <div v-if="seedsLoading" class="control-loading">Loading seeds…</div>
        <div v-else-if="seedsError" class="control-error">{{ seedsError }}</div>
        <select
          v-else
          id="seed-select"
          v-model="selectedSeed"
          class="control-select"
          aria-label="Select theme seed"
        >
          <option v-for="seed in seeds" :key="seed.id" :value="seed.id">
            {{ seed.displayName }}
          </option>
        </select>
      </div>

      <!-- Harmony mode tabs -->
      <div class="control-group">
        <span class="control-label">Harmony Mode</span>
        <div class="tab-row" role="radiogroup" aria-label="Harmony mode">
          <button
            v-for="mode in harmonyModes"
            :key="mode.id"
            class="tab-btn"
            :class="{ active: selectedMode === mode.id }"
            :aria-pressed="selectedMode === mode.id"
            @click="selectedMode = mode.id as HarmonyMode"
          >
            {{ mode.label }}
            <small class="tab-sub">{{ mode.topic }}</small>
          </button>
        </div>
      </div>

      <!-- Platform tabs -->
      <div class="control-group">
        <span class="control-label">Platform</span>
        <div class="tab-row" role="radiogroup" aria-label="Platform">
          <button
            v-for="plat in platforms"
            :key="plat.id"
            class="tab-btn"
            :class="{ active: selectedPlatform === plat.id }"
            :aria-pressed="selectedPlatform === plat.id"
            @click="selectedPlatform = plat.id as Platform"
          >
            {{ plat.icon }} {{ plat.label }}
            <small class="tab-sub">{{ plat.aspect }}</small>
          </button>
        </div>
      </div>

      <!-- Text variant -->
      <div class="control-group">
        <span class="control-label">Text</span>
        <div class="tab-row tab-row--small" role="radiogroup" aria-label="Text variant">
          <button
            class="tab-btn"
            :class="{ active: selectedTextVariant === 'no-text' }"
            :aria-pressed="selectedTextVariant === 'no-text'"
            @click="selectedTextVariant = 'no-text' as TextVariant"
          >No text</button>
          <button
            class="tab-btn"
            :class="{ active: selectedTextVariant === 'text' }"
            :aria-pressed="selectedTextVariant === 'text'"
            @click="selectedTextVariant = 'text' as TextVariant"
          >With text</button>
        </div>
      </div>
    </section>

    <!-- Preview -->
    <section class="preview-section" :class="`platform--${selectedPlatform}`" aria-label="Wallpaper preview">
      <div class="preview-frame">
        <img
          :key="svgUrl"
          :src="svgUrl"
          :alt="`${currentSeed?.displayName ?? selectedSeed} · ${currentMode.topic} · ${currentPlatform.label}`"
          class="preview-img"
        />
      </div>
    </section>

    <!-- Info bar -->
    <section class="info-bar">
      <div class="info-chip">
        <span class="info-label">Seed</span>
        <span class="info-value">{{ currentSeed?.displayName ?? selectedSeed }}</span>
      </div>
      <div class="info-chip">
        <span class="info-label">Mode</span>
        <span class="info-value">{{ currentMode.label }} · {{ currentMode.topic }}</span>
      </div>
      <div class="info-chip">
        <span class="info-label">Platform</span>
        <span class="info-value">{{ currentPlatform.label }} ({{ currentPlatform.aspect }})</span>
      </div>
      <a :href="svgUrl" :download="`caligo-${selectedSeed}-${currentMode.label.toLowerCase()}-${selectedPlatform}.svg`" class="download-btn">
        ⬇ Download SVG
      </a>
    </section>
  </main>
</template>

<style scoped>
.composer-view {
  padding: var(--space-xl) var(--space-lg);
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.view-header {
  margin-bottom: 0;
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
  max-width: 600px;
  margin: 0;
  line-height: 1.6;
}

/* ── Controls ───────────────────────────────────────────────────────────── */
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg);
  align-items: flex-start;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.control-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--fg2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.control-select {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg1);
  color: var(--fg0);
  font-size: var(--text-md);
  min-width: 160px;
  cursor: pointer;
}

.control-loading,
.control-error {
  font-size: var(--text-sm);
  color: var(--fg2);
}
.control-error { color: var(--hue-red, #e06c75); }

/* ── Tabs ───────────────────────────────────────────────────────────────── */
.tab-row {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.tab-row--small .tab-btn {
  min-width: 80px;
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg1);
  color: var(--fg1);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  min-width: 90px;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  line-height: 1.3;
}

.tab-btn:hover {
  background: var(--bg2);
  border-color: var(--accent-muted, var(--accent));
  color: var(--fg0);
}

.tab-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg0);
  font-weight: 600;
}

.tab-sub {
  font-size: var(--text-xs, 0.7rem);
  font-weight: 400;
  opacity: 0.8;
  display: block;
}

/* ── Preview ────────────────────────────────────────────────────────────── */
.preview-section {
  width: 100%;
}

.preview-frame {
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}

/* Platform aspect ratios */
.platform--monitor .preview-frame { aspect-ratio: 16 / 9; }
.platform--tablet .preview-frame  { aspect-ratio: 4 / 3; }
.platform--mobile .preview-frame  { max-width: 340px; aspect-ratio: 9 / 19.5; margin: 0 auto; }

/* ── Info bar ───────────────────────────────────────────────────────────── */
.info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg1);
  border: 1px solid var(--border-color);
}

.info-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--text-xs, 0.7rem);
  color: var(--fg3, var(--fg2));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: var(--text-sm);
  color: var(--fg0);
  font-weight: 500;
}

.download-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: var(--text-sm);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}

.download-btn:hover {
  background: var(--accent);
  color: var(--bg0);
}

@media (max-width: 600px) {
  .controls { flex-direction: column; }
  .tab-row { flex-wrap: wrap; }
  .download-btn { margin-left: 0; }
  .platform--mobile .preview-frame { max-width: 240px; }
}
</style>
