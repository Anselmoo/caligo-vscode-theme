<script setup lang="ts">
/**
 * Copies `text` to the clipboard and confirms in place: the icon turns into a check
 * and the button's name says "Copied" for a moment (announced politely).
 */
import { ref } from "vue";
import SiteIcon from "./SiteIcon.vue";

const props = defineProps<{ text: string; label: string }>();

const state = ref<"idle" | "copied" | "failed">("idle");
let timer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text);
    state.value = "copied";
  } catch {
    state.value = "failed";
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.value = "idle";
  }, 1800);
}
</script>

<template>
  <button type="button" class="copy" :class="`is-${state}`" @click="copy">
    <SiteIcon :name="state === 'copied' ? 'check' : 'copy'" :size="16" />
    <span class="copy__text" aria-live="polite">{{
      state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : label
    }}</span>
  </button>
</template>

<style scoped>
.copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid color-mix(in oklab, var(--fg0) 14%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--bg1) 80%, transparent);
  color: var(--fg1);
  font: inherit;
  font-size: var(--step--1);
  cursor: pointer;
  white-space: nowrap;
}

.copy:hover {
  color: var(--fg0);
  border-color: color-mix(in oklab, var(--accent) 50%, transparent);
}

.copy.is-copied {
  color: var(--color-success);
  border-color: color-mix(in oklab, var(--color-success) 50%, transparent);
}
</style>
