<script setup lang="ts">
/**
 * A tiny editor drawn in one variant's own colours: its bg0 for the page and its
 * syntax inks as three lines of "code". Pure fills, no text, so no ink (some are
 * translucent or low contrast) is ever used for readable type.
 */
import { computed } from "vue";
import type { ThemeIndexEntry } from "../../types/theme.js";

const props = defineProps<{ theme: ThemeIndexEntry }>();

const paint = computed(() => {
  const c = props.theme.colors;
  return {
    "--sw-bg": c.bg0,
    "--sw-keyword": c.keywords,
    "--sw-function": c.functions,
    "--sw-type": c.types,
    "--sw-decorator": c.decorator,
    "--sw-string": c.strings,
    "--sw-muted": c.fgMuted,
  };
});

</script>

<template>
  <span class="swatch" :style="paint" aria-hidden="true">
    <span class="line">
      <i class="ink ink--keyword" style="flex-basis: 20%" />
      <i class="ink ink--function" style="flex-basis: 34%" />
      <i class="ink ink--muted" style="flex-basis: 10%" />
    </span>
    <span class="line line--indent">
      <i class="ink ink--type" style="flex-basis: 30%" />
      <i class="ink ink--decorator" style="flex-basis: 18%" />
    </span>
    <span class="line line--indent">
      <i class="ink ink--string" style="flex-basis: 46%" />
      <i class="ink ink--muted" style="flex-basis: 12%" />
    </span>
  </span>
</template>

<style scoped>
.swatch {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  min-height: 3.5rem;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--sw-bg);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg0) 14%, transparent);
  transition: box-shadow 150ms var(--ease-out);
}

.line {
  display: flex;
  gap: 4px;
  align-items: center;
}

.line--indent {
  padding-left: 14%;
}

.ink {
  display: block;
  flex: 0 1 auto;
  height: 5px;
  border-radius: 3px;
}

.ink--keyword {
  background-color: var(--sw-keyword);
}

.ink--function {
  background-color: var(--sw-function);
}

.ink--type {
  background-color: var(--sw-type);
}

.ink--decorator {
  background-color: var(--sw-decorator);
}

.ink--string {
  background-color: var(--sw-string);
}

.ink--muted {
  background-color: var(--sw-muted);
}

@media (prefers-reduced-motion: reduce) {
  .swatch {
    transition: none;
  }
}
</style>
