<script setup lang="ts">
/**
 * One scene at the active platform: thumbnail first, then the facts and the
 * two downloads. The preview is always the build-time WebP; the full SVG is only
 * ever requested by the person who asks for it.
 */
import { computed, ref } from "vue";
import { PLATFORM_SIZES, thumbnailSize } from "../../../wallpaper/types.js";
import type { WallpaperManifestEntry } from "../../composables/useWallpapers";
import { rasterizeSvgToPng, triggerDownload } from "../../utils/rasterize-svg.js";

const props = defineProps<{ entry: WallpaperManifestEntry }>();

const previewUrl = computed(() => (props.entry.thumbPath ? `./${props.entry.thumbPath}` : null));
const svgUrl = computed(() => `./${props.entry.svgPath}`);
const previewSize = computed(() => thumbnailSize(props.entry.platform));
const baseName = computed(() => {
  const { seedId, harmonyMode, platform, textVariant } = props.entry;
  return `caligo-${seedId}-${harmonyMode}-${platform}${textVariant === "text" ? "-text" : ""}`;
});

const pngState = ref<"idle" | "working" | "error">("idle");

/**
 * PNGs are not deployed (the 4K set is ~2 GB, over the Pages limit), so the
 * browser renders one from the SVG when asked.
 */
async function downloadPng() {
  if (pngState.value === "working") return;
  pngState.value = "working";
  try {
    const { width, height } = PLATFORM_SIZES[props.entry.platform];
    const blob = await rasterizeSvgToPng(svgUrl.value, width, height);
    triggerDownload(blob, `${baseName.value}.png`);
    pngState.value = "idle";
  } catch (e) {
    console.error("Wallpaper PNG export failed", e);
    pngState.value = "error";
  }
}

</script>

<template>
  <article class="scene-card" data-wallpaper-card>
    <div class="scene-card__frame" :style="{ aspectRatio: `${previewSize.width} / ${previewSize.height}` }">
      <img
        v-if="previewUrl"
        class="scene-card__img"
        :src="previewUrl"
        :alt="`${entry.seedDisplayName}, ${entry.harmonyLabel}: ${entry.platform} wallpaper preview`"
        :width="previewSize.width"
        :height="previewSize.height"
        loading="lazy"
        decoding="async"
      />
      <p v-else class="scene-card__missing">Preview not built yet</p>
    </div>

    <div class="scene-card__body">
      <div>
        <h3 class="scene-card__title">{{ entry.seedDisplayName }}</h3>
        <p class="scene-card__mode">{{ entry.harmonyLabel }}</p>
      </div>
      <div class="scene-card__actions">
        <a class="scene-card__link" :href="svgUrl" :download="`${baseName}.svg`">
          SVG<span class="visually-hidden"> of {{ entry.seedDisplayName }}, {{ entry.harmonyLabel }}</span>
        </a>
        <button
          type="button"
          class="scene-card__link"
          :disabled="pngState === 'working'"
          @click="downloadPng"
        >
          {{ pngState === "working" ? "Rendering…" : "PNG"
          }}<span class="visually-hidden"> of {{ entry.seedDisplayName }}, {{ entry.harmonyLabel }}</span>
        </button>
      </div>
      <p v-if="pngState === 'error'" class="scene-card__error" role="alert">
        The PNG could not be rendered. Try again, or download the SVG.
      </p>
    </div>
  </article>
</template>

<style scoped>
.scene-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.scene-card__frame {
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: var(--bg1);
  outline: 1px solid color-mix(in oklab, var(--fg0) 12%, transparent);
  outline-offset: -1px;
}

.scene-card__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scene-card__missing {
  margin: 0;
  padding: 0 16px;
  color: var(--fg1);
  font-size: var(--step--1);
  text-align: center;
}

.scene-card__body {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
}

.scene-card__title {
  margin: 0;
  color: var(--fg0);
  font-family: var(--font-sans);
  font-size: var(--step-0);
  font-weight: 600;
  letter-spacing: -0.005em;
}

.scene-card__mode {
  margin: 2px 0 0;
  color: var(--fg1);
  font-size: var(--step--1);
}

.scene-card__actions {
  display: flex;
  gap: 16px;
}

.scene-card__link {
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--fg0);
  font: inherit;
  font-size: var(--step--1);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.scene-card__link:hover {
  text-decoration-thickness: 2px;
}

.scene-card__link:disabled {
  cursor: progress;
  color: var(--fg1);
}

.scene-card__error {
  flex-basis: 100%;
  margin: 0;
  color: var(--error);
  font-size: var(--step--1);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
