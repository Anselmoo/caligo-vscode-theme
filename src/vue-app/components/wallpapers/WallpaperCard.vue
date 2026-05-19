<script setup lang="ts">
import { computed, ref } from "vue";
import type { WallpaperManifestEntry } from "../../composables/useWallpapers";

const props = defineProps<{
  entry: WallpaperManifestEntry;
  activePlatform: "monitor" | "tablet" | "mobile";
  activeTextVariant: "text" | "no-text";
}>();

const platforms = [
  { id: "monitor", label: "Monitor", icon: "pi pi-desktop" },
  { id: "tablet", label: "Tablet", icon: "pi pi-tablet" },
  { id: "mobile", label: "Mobile", icon: "pi pi-mobile" },
] as const;

const textVariants = [
  { id: "no-text", label: "No text" },
  { id: "text", label: "With text" },
] as const;

// Local per-card state — independent of global filter
const localPlatform = ref<"monitor" | "tablet" | "mobile">(props.activePlatform);
const localTextVariant = ref<"text" | "no-text">(props.activeTextVariant);

// Base dir: wallpapers/{seedId}/{harmonyMode}/
const baseDir = computed(() => {
  const { seedId, harmonyMode } = props.entry;
  return `wallpapers/${seedId}/${harmonyMode}`;
});

const previewUrl = computed(() => {
  const suffix = localTextVariant.value === "text" ? "-text" : "";
  return `${baseDir.value}/${localPlatform.value}${suffix}.svg`;
});

const pngUrl = computed(() => {
  const suffix = localTextVariant.value === "text" ? "-text" : "";
  return `${baseDir.value}/${localPlatform.value}${suffix}.png`;
});
</script>

<template>
  <article class="wallpaper-card">
    <!-- Preview -->
    <div class="preview-wrap">
      <img
        :src="previewUrl"
        :alt="`${entry.displayName} wallpaper preview (${localPlatform})`"
        class="preview-img"
        loading="lazy"
      />
    </div>

    <!-- Meta -->
    <div class="card-body">
      <h3 class="card-title">{{ entry.seedDisplayName }}</h3>
      <p class="card-topic">{{ entry.harmonyLabel }} · {{ entry.topic }}</p>

      <!-- Platform tabs -->
      <div class="toggle-row">
        <button
          v-for="p in platforms"
          :key="p.id"
          class="toggle-btn"
          :class="{ active: localPlatform === p.id }"
          @click="localPlatform = p.id"
        ><i :class="p.icon" /> {{ p.label }}</button>
      </div>

      <!-- Text variant tabs -->
      <div class="toggle-row">
        <button
          v-for="v in textVariants"
          :key="v.id"
          class="toggle-btn"
          :class="{ active: localTextVariant === v.id }"
          @click="localTextVariant = v.id"
        >{{ v.label }}</button>
      </div>

      <!-- Download -->
      <a :href="pngUrl" :download="`caligo-${entry.seedId}-${entry.harmonyMode}-${localPlatform}${localTextVariant === 'text' ? '-text' : ''}.png`" class="download-btn">
        <i class="pi pi-download" /> Download PNG
      </a>
    </div>
  </article>
</template>

<style scoped>
.wallpaper-card {
  background: var(--bg1);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.wallpaper-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.preview-wrap {
  aspect-ratio: 16/9;
  overflow: hidden;
  background: var(--bg0);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-body {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.card-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--fg0);
  margin: 0;
}

.card-topic {
  font-size: var(--text-sm);
  color: var(--fg2);
  margin: 0;
}

.toggle-row {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.toggle-btn {
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--fg2);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}

.toggle-btn.active,
.toggle-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg0);
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: var(--text-sm);
  text-decoration: none;
  text-align: center;
  transition: background 0.15s, color 0.15s;
}

.download-btn:hover {
  background: var(--accent);
  color: var(--bg0);
}
</style>
