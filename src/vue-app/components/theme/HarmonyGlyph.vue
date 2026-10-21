<script setup lang="ts">
/**
 * A hue wheel that draws one harmony mode's real hue relationship: a ring, and a
 * dot on it for every hue the mode places, at the angles the palette engine uses
 * (HARMONY_GLYPH_ANGLES mirrors HARMONY_OFFSETS in src/lib/harmony-colors.ts; a
 * test keeps them equal). Monochromatic is one hue at three lightness steps, so its
 * dots sit on one spoke at three radii.
 */
import { computed } from "vue";
import { HARMONY_GLYPH_ANGLES } from "../../utils/harmony-utils.js";

const props = withDefaults(defineProps<{ mode: string; label: string; size?: number }>(), {
  size: 22,
});

const R = 8;

const dots = computed(() => {
  if (props.mode === "monochromatic") {
    return [4, 6.2, R].map((r, i) => ({ x: 0, y: -r, r: 1.6 + i * 0.35, base: i === 2 }));
  }
  const angles = HARMONY_GLYPH_ANGLES[props.mode] ?? [0];
  return angles.map((a, i) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: R * Math.cos(rad), y: R * Math.sin(rad), r: i === 0 ? 2.4 : 1.9, base: i === 0 };
  });
});
</script>

<template>
  <svg
    class="glyph"
    :width="size"
    :height="size"
    viewBox="-11 -11 22 22"
    aria-hidden="true"
    focusable="false"
  >
    <title>{{ label }}</title>
    <circle class="glyph__ring" r="8" />
    <circle
      v-for="(d, i) in dots"
      :key="i"
      class="glyph__dot"
      :class="{ 'glyph__dot--base': d.base }"
      :cx="d.x.toFixed(2)"
      :cy="d.y.toFixed(2)"
      :r="d.r"
    />
  </svg>
</template>

<style scoped>
.glyph {
  flex: none;
  overflow: visible;
}

.glyph__ring {
  fill: none;
  stroke: currentColor;
  stroke-opacity: 0.32;
  stroke-width: 1;
}

.glyph__dot {
  fill: currentColor;
  opacity: 0.7;
}

.glyph__dot--base {
  opacity: 1;
}
</style>
