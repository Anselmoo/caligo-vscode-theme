<script setup lang="ts">
/**
 * A scroll-snap strip with the selected palette's five night scenes, one per harmony
 * mode. Cards use the 640 px WebP thumbnail only (never the multi-MB SVG); until it
 * arrives, or if the build made none, a gradient of the variant's own colours stands in.
 */
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useTheme } from "../../composables/useTheme.js";
import { useWallpapers } from "../../composables/useWallpapers.js";

const { themes, harmonies, currentTheme } = useTheme();
const { loadManifest, findVariant } = useWallpapers();

onMounted(() => void loadManifest());

const scenes = computed(() => {
  const seedId = currentTheme.value?.seedId;
  if (!seedId) return [];
  return harmonies.value.flatMap(h => {
    const theme = themes.value.find(t => t.seedId === seedId && t.harmonyId === h.id);
    if (!theme) return [];
    const mode = h.id === "balanced" ? "none" : h.id;
    const thumb = findVariant(seedId, mode, "monitor", "no-text")?.thumbPath;
    return [
      {
        key: theme.key,
        label: h.label,
        thumb: thumb ? `./${thumb}` : null,
        current: theme.key === currentTheme.value?.key,
        fallback: `linear-gradient(160deg, ${theme.colors.bg0}, ${theme.colors.bg2} 60%, ${theme.colors.accent})`,
      },
    ];
  });
});
</script>

<template>
  <section v-if="scenes.length" class="strip" aria-labelledby="strip-title">
    <header class="strip__head">
      <div>
        <p class="strip__eyebrow">Wallpapers</p>
        <h2 id="strip-title" class="strip__title">Every mood has its own night</h2>
      </div>
      <RouterLink class="strip__more" to="/wallpapers">Browse all wallpapers</RouterLink>
    </header>

    <!-- A scrollable region must be keyboard-focusable (axe: scrollable-region-focusable), so
         keyboard users can scroll it with the arrow keys. -->
    <section
      class="strip__rail"
      aria-label="Wallpapers for this palette, scrollable"
      :tabindex="0"
    >
      <ul class="strip__list">
      <li v-for="s in scenes" :key="s.key" class="scene-card" :class="{ 'is-current': s.current }">
        <div class="scene-card__art" :style="{ background: s.fallback }">
          <img v-if="s.thumb" :src="s.thumb" alt="" width="640" height="360" loading="lazy" decoding="async" />
        </div>
        <p class="scene-card__label">{{ currentTheme?.seedLabel }} <span>{{ s.label }}</span></p>
      </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.strip {
  padding: clamp(64px, 11vh, 128px) 0 0;
}

.strip__head {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  max-width: var(--page-max);
  margin: 0 auto clamp(20px, 3vw, 32px);
  padding: 0 var(--gutter);
}

.strip__eyebrow {
  margin: 0 0 10px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.strip__title {
  margin: 0;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: var(--step-3);
  font-weight: 320;
  font-stretch: 108%;
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.strip__more {
  color: var(--fg0);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--fg0) 45%, transparent);
  text-underline-offset: 4px;
}

.strip__list {
  display: flex;
  gap: clamp(12px, 1.6vw, 20px);
  width: max-content;
  margin: 0;
  padding: 0;
  list-style: none;
}

.strip__rail {
  padding: 4px var(--gutter) 24px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--gutter);
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--fg0) 30%, transparent) transparent;
}

.scene-card {
  flex: 0 0 min(78vw, 460px);
  scroll-snap-align: start;
}

.scene-card__art {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--fg0) 12%, transparent);
  border-radius: 16px;
  transition:
    border-color 260ms var(--ease-out),
    translate 260ms var(--ease-out);
}

.scene-card__art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: scale 600ms var(--ease-out);
}

.scene-card:hover .scene-card__art {
  border-color: color-mix(in oklab, var(--accent) 45%, transparent);
  translate: 0 -3px;
}

.scene-card:hover img {
  scale: 1.04;
}

.scene-card.is-current .scene-card__art {
  border-color: var(--accent);
}

.scene-card__label {
  margin: 12px 4px 0;
  color: var(--fg0);
  font-weight: 600;
}

.scene-card__label span {
  margin-left: 6px;
  color: var(--fg-muted);
  font-weight: 400;
}

@media (prefers-reduced-motion: reduce) {
  .scene-card__art,
  .scene-card__art img {
    transition: none;
  }

  .scene-card:hover .scene-card__art,
  .scene-card:hover img {
    translate: none;
    scale: none;
  }
}
</style>
