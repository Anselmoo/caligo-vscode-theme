<script setup lang="ts">
/**
 * The site's few icons, inline so they need no icon font and follow the theme
 * through currentColor. Decorative by default (the link or button beside them
 * carries the name); pass `label` when the icon stands alone.
 * The GitHub mark is the Octicons "mark-github" path (MIT).
 */
import { computed } from "vue";

type IconName = "github" | "marketplace" | "heart" | "moon" | "contribute" | "license" | "copy" | "check";

const props = withDefaults(defineProps<{ name: IconName; label?: string; size?: number }>(), {
  label: "",
  size: 18,
});

const SHAPES: Record<IconName, { box: string; fill?: boolean; d: string }> = {
  github: {
    box: "0 0 16 16",
    fill: true,
    d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z",
  },
  marketplace: {
    box: "0 0 24 24",
    d: "M4 4h6.5v6.5H4ZM4 13.5h6.5V20H4ZM13.5 13.5H20V20h-6.5ZM16.75 2.6l4.65 4.65-4.65 4.65-4.65-4.65Z",
  },
  heart: {
    box: "0 0 24 24",
    fill: true,
    d: "M12 20.5S3.5 15.3 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 6.1-8.5 11.3-8.5 11.3Z",
  },
  moon: {
    box: "0 0 24 24",
    fill: true,
    d: "M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a8.5 8.5 0 1 0 10.8 10.8Z",
  },
  contribute: {
    box: "0 0 24 24",
    d: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16.5 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.2a6.5 6.5 0 0 1 3 5.8",
  },
  license: {
    box: "0 0 24 24",
    d: "M7 3h7l5 5v13H7ZM14 3v5h5M10 13h6M10 17h6",
  },
  copy: {
    box: "0 0 24 24",
    d: "M9 9h11v11H9ZM5 15H4V4h11v1",
  },
  check: {
    box: "0 0 24 24",
    d: "M5 12.5l4.5 4.5L19 7.5",
  },
};

const shape = computed(() => SHAPES[props.name]);
</script>

<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    :viewBox="shape.box"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <title>{{ label || name }}</title>
    <path
      :d="shape.d"
      :fill="shape.fill ? 'currentColor' : 'none'"
      :stroke="shape.fill ? 'none' : 'currentColor'"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.icon {
  flex: none;
  vertical-align: -0.15em;
}
</style>
