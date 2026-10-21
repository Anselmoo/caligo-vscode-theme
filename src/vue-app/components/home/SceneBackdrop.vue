<script setup lang="ts">
/**
 * Full-bleed night scene behind the Home hero.
 *
 * Two layers:
 * 1. An inline night built from the theme's own tokens (sky gradient, horizon glow,
 *    two ridges as smooth cubic Béziers shaded along their own axis, a sparse star
 *    field). It paints with the first frame, costs no request, and follows every
 *    theme switch through CSS variables.
 * 2. The theme's generated wallpaper, when the wallpaper manifest lists one. It loads
 *    after first paint as a single <img> (rasterised once, never re-filtered) and
 *    fades in over layer 1, so a missing or slow wallpaper never leaves a hole.
 */
import { computed, onMounted, ref, watch } from "vue";
import { useTheme } from "../../composables/useTheme.js";
import { useWallpapers } from "../../composables/useWallpapers.js";

const { currentTheme } = useTheme();
const { loadManifest, findVariant } = useWallpapers();

const sceneLoaded = ref(false);

/** Theme harmony ids say "balanced"; the wallpaper manifest says "none". */
const sceneSrc = computed(() => {
  const theme = currentTheme.value;
  if (!theme) return null;
  const mode = theme.harmonyId === "balanced" ? "none" : theme.harmonyId;
  const entry = findVariant(theme.seedId, mode, "monitor", "no-text");
  return entry ? `./${entry.svgPath}` : null;
});

watch(sceneSrc, () => {
  sceneLoaded.value = false;
});

onMounted(() => {
  // Idle-time fetch: the hero must never wait on the wallpaper manifest.
  const run = () => void loadManifest();
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 300);
});

/**
 * Deterministic star field: a fixed low-discrepancy sequence, denser and brighter
 * toward the zenith, gone by the horizon. No randomness, so it never jumps on reload.
 */
const stars = Array.from({ length: 70 }, (_, i) => {
  const x = ((i * 0.618034) % 1) * 1600;
  const t = ((i * 0.754877) % 1) ** 1.7; // bias toward the top
  const y = t * 560;
  const r = i % 11 === 0 ? 1.6 : i % 4 === 0 ? 1.1 : 0.7;
  const o = (1 - t) * (i % 11 === 0 ? 0.9 : 0.55);
  return { x: x.toFixed(1), y: y.toFixed(1), r, o: o.toFixed(2) };
});

void sceneLoaded;
void stars;
</script>

<template>
  <div class="scene" aria-hidden="true">
    <svg class="scene__night" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="sky-top" />
          <stop offset="0.62" class="sky-horizon" />
          <stop offset="1" class="sky-top" />
        </linearGradient>
        <radialGradient id="scene-glow" cx="0.62" cy="0.66" r="0.55" gradientTransform="scale(1 0.42) translate(0 0.9)">
          <stop offset="0" class="glow-core" />
          <stop offset="1" class="glow-edge" />
        </radialGradient>
        <!-- Ridges shade along their own vertical axis: crest stays defined, base dissolves. -->
        <linearGradient id="scene-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="far-crest" />
          <stop offset="1" class="far-base" />
        </linearGradient>
        <linearGradient id="scene-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="near-crest" />
          <stop offset="0.5" class="near-base" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#scene-sky)" />
      <rect width="1600" height="1000" fill="url(#scene-glow)" />
      <g class="scene__stars">
        <circle v-for="(s, i) in stars" :key="i" :cx="s.x" :cy="s.y" :r="s.r" :opacity="s.o" />
      </g>
      <path
        fill="url(#scene-far)"
        d="M0 690 C 140 664 250 640 380 652 C 520 664 600 618 720 604 C 850 590 940 640 1060 646 C 1190 652 1290 612 1420 618 C 1500 622 1560 640 1600 648 L 1600 1000 L 0 1000 Z"
      />
      <path
        fill="url(#scene-near)"
        d="M0 760 C 180 742 300 716 470 724 C 640 732 760 770 930 762 C 1110 754 1240 712 1400 716 C 1490 718 1560 734 1600 742 L 1600 1000 L 0 1000 Z"
      />
    </svg>
    <img
      v-if="sceneSrc"
      :key="sceneSrc"
      class="scene__image"
      :class="{ 'is-loaded': sceneLoaded }"
      :src="sceneSrc"
      alt=""
      decoding="async"
      fetchpriority="low"
      @load="sceneLoaded = true"
    />
    <div class="scene__fade" />
  </div>
</template>

<style scoped>
.scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  view-transition-name: scene;
}

.scene__night,
.scene__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.scene__image {
  object-fit: cover;
  object-position: center 70%;
  opacity: 0;
  transition: opacity 900ms var(--ease-out);
}

.scene__image.is-loaded {
  opacity: 1;
}

.sky-top {
  stop-color: var(--bg0);
}

.sky-horizon {
  stop-color: color-mix(in oklab, var(--bg0) 78%, var(--accent));
}

.glow-core {
  stop-color: color-mix(in oklab, var(--accent) 55%, var(--syntax-keywords));
  stop-opacity: 0.32;
}

.glow-edge {
  stop-color: var(--bg0);
  stop-opacity: 0;
}

.scene__stars circle {
  fill: var(--fg0);
}

.far-crest {
  stop-color: color-mix(in oklab, var(--bg1) 70%, var(--accent) 12%);
}

.far-base {
  stop-color: var(--bg0);
}

.near-crest {
  stop-color: oklch(from var(--bg0) calc(l * 0.72) c h);
}

.near-base {
  stop-color: oklch(from var(--bg0) calc(l * 0.6) c h);
}

/* Blend the scene into the page below so the hero has no bottom edge. */
.scene__fade {
  position: absolute;
  inset: auto 0 0;
  height: 28%;
  background: linear-gradient(to bottom, transparent, var(--bg0));
}

@media (prefers-reduced-motion: reduce) {
  .scene__image {
    transition: none;
  }
}
</style>
