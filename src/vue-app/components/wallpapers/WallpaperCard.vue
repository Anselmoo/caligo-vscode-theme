<script setup lang="ts">
import { computed, ref } from "vue";
import { PLATFORM_SIZES, thumbnailSize } from "../../../wallpaper/types.js";
import type { WallpaperManifestEntry } from "../../composables/useWallpapers";
import { rasterizeSvgToPng, triggerDownload } from "../../utils/rasterize-svg.js";

const props = defineProps<{
  entry: WallpaperManifestEntry;
  activePlatform: "monitor" | "tablet" | "mobile";
  activeTextVariant: "text" | "no-text";
  /**
   * Resolves a variant to its manifest entry. Paths MUST come from the manifest:
   * the on-disk folder for harmonyMode "none" is "balanced", so re-deriving a
   * path from harmonyMode produces a 404 for every Balanced wallpaper.
   */
  resolve: (
    seedId: string,
    harmonyMode: string,
    platform: "monitor" | "tablet" | "mobile",
    textVariant: "text" | "no-text"
  ) => WallpaperManifestEntry | null;
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

// Resolve the currently selected variant straight from the manifest.
const activeVariant = computed(() =>
  props.resolve(
    props.entry.seedId,
    props.entry.harmonyMode,
    localPlatform.value,
    localTextVariant.value
  )
);

/** Full-resolution SVG — the download source, never the preview source. */
const sourceSvgUrl = computed(() => activeVariant.value?.svgPath ?? props.entry.svgPath);

/**
 * Preview source for the card image.
 *
 * Prefers the build-time WebP thumbnail (~30 KB) over the wallpaper SVG
 * (~455 KB, up to 8,700 nodes, 3840x2160 intrinsic). Falls back to the SVG when
 * thumbnails have not been generated, so a local checkout still shows previews.
 */
const previewUrl = computed(
  () => activeVariant.value?.thumbPath ?? props.entry.thumbPath ?? sourceSvgUrl.value
);

/** Intrinsic thumbnail box, so the grid reserves space before the image lands. */
const previewSize = computed(() => thumbnailSize(localPlatform.value));

const downloadState = ref<"idle" | "working" | "error">("idle");

const downloadLabel = computed(() => {
  if (downloadState.value === "working") return "Rendering PNG…";
  if (downloadState.value === "error") return "Retry download";
  return "Download PNG";
});

/**
 * Rasterise the selected SVG to a full-resolution PNG in the browser.
 * PNGs are not deployed: the complete 4K set is ~2 GB, over the 1 GB
 * GitHub Pages limit, so we generate on demand instead.
 */
async function downloadPng() {
  if (downloadState.value === "working") return;
  downloadState.value = "working";
  try {
    const { width, height } = PLATFORM_SIZES[localPlatform.value];
    const blob = await rasterizeSvgToPng(sourceSvgUrl.value, width, height);
    const textSuffix = localTextVariant.value === "text" ? "-text" : "";
    triggerDownload(
      blob,
      `caligo-${props.entry.seedId}-${props.entry.harmonyMode}-${localPlatform.value}${textSuffix}.png`
    );
    downloadState.value = "idle";
  } catch (e) {
    console.error("Wallpaper PNG export failed", e);
    downloadState.value = "error";
  }
}

// Silence biome: all vars below are used in the Vue template
void platforms;
void textVariants;
void previewUrl;
void previewSize;
void sourceSvgUrl;
void activeVariant;
void downloadLabel;
void downloadPng;
</script>

<template>
  <article class="wallpaper-card">
    <!-- Preview -->
    <div class="preview-wrap">
      <img
        :src="previewUrl"
        :alt="`${entry.displayName} wallpaper preview (${localPlatform})`"
        class="preview-img"
        :width="previewSize.width"
        :height="previewSize.height"
        loading="lazy"
        decoding="async"
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
      <button
        type="button"
        class="download-btn"
        :class="{ 'is-error': downloadState === 'error' }"
        :disabled="downloadState === 'working'"
        @click="downloadPng"
      >
        <i
          :class="downloadState === 'working' ? 'pi pi-spinner pi-spin' : 'pi pi-download'"
          aria-hidden="true"
        />
        {{ downloadLabel }}
      </button>
      <p v-if="downloadState === 'error'" class="download-error" role="alert">
        Could not render the PNG. Please try again.
      </p>
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
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  width: 100%;
  justify-content: center;
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

.download-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--bg0);
}

.download-btn:disabled {
  opacity: 0.7;
  cursor: progress;
}

.download-btn.is-error {
  border-color: var(--color-error);
  color: var(--color-error);
}

.download-error {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-error);
}
</style>
