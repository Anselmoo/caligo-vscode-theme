<script setup lang="ts">
/**
 * A seed palette's pictogram (decorative: the palette's name always sits beside it): the scene its wallpaper paints, in the quiet line style
 * of HarmonyGlyph. The lit parts (a moon, a flame, the aurora) take `--glyph-accent`,
 * so a row can tint its icon with the palette's own accent; unset, they use the text
 * colour. A seed without a drawing gets a plain ring rather than an empty box.
 */
import { computed } from "vue";
import { SEED_GLYPHS } from "../../utils/seed-glyphs.js";

const props = withDefaults(defineProps<{ seed: string; size?: number }>(), {
  size: 26,
});

const shapes = computed(() => SEED_GLYPHS[props.seed] ?? []);
</script>

<template>
  <svg
    class="seed-glyph"
    :width="size"
    :height="size"
    viewBox="-11 -11 22 22"
    aria-hidden="true"
    focusable="false"
  >
    <circle v-if="shapes.length === 0" class="seed-glyph__ring" r="8" />
    <path
      v-for="(s, i) in shapes"
      :key="i"
      :d="s.d"
      :class="`seed-glyph__${s.role}`"
      :opacity="s.opacity ?? 1"
    />
  </svg>
</template>

<style scoped>
.seed-glyph {
  flex: none;
  overflow: visible;
}

.seed-glyph path,
.seed-glyph__ring {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.seed-glyph__ring,
.seed-glyph__line,
.seed-glyph__accent {
  fill: none;
  stroke-width: 1.4;
}

.seed-glyph__ring,
.seed-glyph__line {
  stroke: currentColor;
}

.seed-glyph__fill {
  fill: currentColor;
  stroke: none;
}

.seed-glyph__accent {
  stroke: var(--glyph-accent, currentColor);
}

.seed-glyph__accent-fill {
  fill: var(--glyph-accent, currentColor);
  stroke: none;
}
</style>
