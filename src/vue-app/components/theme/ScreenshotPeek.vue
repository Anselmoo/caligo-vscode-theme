<script setup lang="ts">
/**
 * A real VS Code screenshot of the selected variant, as a small thumbnail that opens
 * in place and closes again (click, close button or Esc). It renders nothing unless CI
 * produced a screenshot and the image loads, so the page never shows a broken frame.
 * It is not forced shut when the theme changes: pick another cell and the picture swaps.
 */
import { nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from "vue";

const props = defineProps<{
  /** Resolved URL of the screenshot, or null when none exists. */
  src: string | null;
  /** Theme name, used for the image's alternative text. */
  label: string;
}>();

const open = ref(false);
const failed = ref(false);
const toggle = useTemplateRef<HTMLButtonElement>("toggle");
const cardId = useId();

// A new URL gets a fresh chance to load.
watch(
  () => props.src,
  () => {
    failed.value = false;
  }
);

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

function close() {
  open.value = false;
}

watch(open, async isOpen => {
  if (isOpen) {
    document.addEventListener("keydown", onKeydown);
  } else {
    document.removeEventListener("keydown", onKeydown);
    await nextTick();
    toggle.value?.focus({ preventScroll: true });
  }
});

onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div v-if="src && !failed" class="peek" :class="{ 'is-open': open }" data-screenshot-peek>
    <div :id="cardId" class="peek__card">
      <button
        ref="toggle"
        type="button"
        class="peek__toggle"
        :aria-expanded="open"
        :aria-controls="cardId"
        :aria-label="
          open ? 'Close the VS Code screenshot' : `Open a real VS Code screenshot of ${label}`
        "
        @click="open = !open"
      >
        <img
          class="peek__img"
          :src="src"
          :alt="`${label} in VS Code`"
          loading="lazy"
          decoding="async"
          @error="failed = true"
        />
      </button>
      <span class="peek__caption" aria-hidden="true">Real VS Code</span>
      <button v-if="open" type="button" class="peek__close" @click="close">Close</button>
    </div>
  </div>
</template>

<style scoped>
/* The root reserves the thumbnail's footprint so opening the card shifts nothing. */
.peek {
  --peek-thumb: 176px;
  position: relative;
  width: var(--peek-thumb);
  aspect-ratio: 16 / 10;
}

.peek__card {
  position: absolute;
  top: 0;
  right: 0;
  z-index: var(--z-dropdown);
  width: var(--peek-thumb);
  overflow: hidden;
  background: var(--bg1);
  border: 1px solid color-mix(in oklab, var(--fg0) 16%, transparent);
  border-radius: 10px;
  box-shadow: 0 10px 30px -12px color-mix(in oklab, black 70%, transparent);
  transition:
    width 260ms var(--ease-out),
    box-shadow 260ms var(--ease-out);
}

.is-open .peek__card {
  width: min(720px, calc(100vw - 2 * var(--gutter)));
  box-shadow: 0 24px 60px -16px color-mix(in oklab, black 80%, transparent);
}

.peek__toggle {
  display: block;
  width: 100%;
  padding: 0;
  background: none;
  border: 0;
  cursor: zoom-in;
}

.is-open .peek__toggle {
  cursor: zoom-out;
}

.peek__toggle:focus-visible,
.peek__close:focus-visible {
  outline: 2px solid var(--fg0);
  outline-offset: -2px;
}

.peek__img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.peek__caption {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 2px 8px;
  background: color-mix(in oklab, var(--bg0) 78%, transparent);
  border-radius: 999px;
  color: var(--fg1);
  font-size: 0.72rem;
  line-height: 1.5;
  backdrop-filter: blur(6px);
  pointer-events: none;
}

.is-open .peek__caption {
  display: none;
}

.peek__close {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 12px;
  background: color-mix(in oklab, var(--bg0) 82%, transparent);
  border: 1px solid color-mix(in oklab, var(--fg0) 22%, transparent);
  border-radius: 999px;
  color: var(--fg0);
  font: inherit;
  font-size: var(--step--1);
  cursor: pointer;
  backdrop-filter: blur(6px);
}

/* Narrow screens: sit in the flow and grow rightwards from the left edge. */
@media (max-width: 720px) {
  .peek__card {
    right: auto;
    left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .peek__card {
    transition: none;
  }
}
</style>
