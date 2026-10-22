<script setup lang="ts">
/**
 * Export the active theme as design tokens (CSS, SCSS, JSON, TypeScript), with the
 * colours the theme ships. Lives in the Themes detail; /export redirects here.
 */
import { computed, onBeforeUnmount, ref } from "vue";
import { useExport } from "../../composables/useExport.js";
import { useTheme } from "../../composables/useTheme.js";
import CopyDownload from "./CopyDownload.vue";
import ExportPreview from "./ExportPreview.vue";
import FormatSelector from "./FormatSelector.vue";

const { currentTheme } = useTheme();
const {
  selectedFormat,
  availableFormats,
  formatLabels,
  currentResult,
  copyCurrent,
  downloadCurrent,
} = useExport();

const themeName = computed(() => currentTheme.value?.displayName ?? "the current theme");
const content = computed(() => currentResult.value?.content ?? "");
const fileNote = computed(() => {
  const result = currentResult.value;
  if (!result) return "";
  const lines = result.content.split("\n").length;
  return `${result.filename}, ${lines} lines`;
});

/** One live region reports the outcome of whichever action ran last. */
const status = ref("");
let clearTimer: ReturnType<typeof setTimeout> | undefined;

function announce(message: string) {
  status.value = message;
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    status.value = "";
  }, 4000);
}

async function copy() {
  announce(
    (await copyCurrent())
      ? "Copied to clipboard"
      : "Copy was blocked by the browser. Select the code below and copy it by hand."
  );
}

function download() {
  downloadCurrent();
  if (currentResult.value) announce(`Downloaded ${currentResult.value.filename}`);
}

onBeforeUnmount(() => clearTimeout(clearTimer));

</script>

<template>
  <section id="export" class="export" aria-labelledby="export-title">
    <h3 id="export-title" class="export__title">Use the colours in your project</h3>
    <p class="export__lede">
      <strong data-export-theme>{{ themeName }}</strong> as CSS variables, SCSS, JSON or
      TypeScript tokens, with the exact colours the theme ships.
    </p>
    <div class="export__bar">
      <FormatSelector v-model="selectedFormat" :options="availableFormats" :labels="formatLabels" />
      <CopyDownload :disabled="!currentResult" @copy="copy" @download="download" />
    </div>
    <p class="export__status" role="status">{{ status }}</p>
    <p v-if="fileNote" class="export__file">{{ fileNote }}</p>
    <ExportPreview :content="content" :export-format="currentResult?.format" />
  </section>
</template>

<style scoped>
.export {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  scroll-margin-top: 72px;
}

.export__title {
  margin: 0 0 8px;
  color: var(--fg0);
  font-size: var(--step-1);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.export__lede {
  max-width: var(--measure);
  margin: 0 0 18px;
  color: var(--fg-muted);
  line-height: 1.55;
}

.export__lede strong {
  color: var(--fg0);
  font-weight: 600;
}

.export__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px 24px;
}

.export__status {
  min-height: 1.6em;
  margin: 14px 0 0;
  color: var(--fg0);
  font-size: var(--step--1);
}

.export__file {
  margin: 0 0 10px;
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 0.78rem;
}
</style>
