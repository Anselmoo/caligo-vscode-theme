<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import CopyDownload from "../components/export/CopyDownload.vue";
import ExportPreview from "../components/export/ExportPreview.vue";
import FormatSelector from "../components/export/FormatSelector.vue";
import { useExport } from "../composables/useExport.js";
import { useTheme } from "../composables/useTheme.js";

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
  <div class="export">
    <header class="export__head">
      <h1 class="export__title">Export a theme</h1>
      <p class="export__lede">
        Take <strong data-export-theme>{{ themeName }}</strong> into your own project as CSS
        variables, SCSS, JSON or TypeScript. Pick another theme from the nav to export that
        one instead.
      </p>
    </header>

    <section class="export__tool" aria-label="Export options">
      <div class="export__bar">
        <FormatSelector v-model="selectedFormat" :options="availableFormats" :labels="formatLabels" />
        <CopyDownload :disabled="!currentResult" @copy="copy" @download="download" />
      </div>
      <p class="export__status" role="status">{{ status }}</p>
      <p v-if="fileNote" class="export__file">{{ fileNote }}</p>
      <ExportPreview :content="content" :export-format="currentResult?.format" />
    </section>
  </div>
</template>

<style scoped>
.export {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(40px, 8vh, 96px) var(--gutter) clamp(56px, 10vh, 120px);
}

.export__head {
  margin-bottom: clamp(32px, 6vh, 64px);
}

.export__title {
  margin: 0 0 18px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.25rem + 2.3vw, 3.3rem);
  font-weight: 340;
  font-stretch: 106%;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.export__lede {
  max-width: var(--measure);
  margin: 0;
  color: var(--fg1);
  font-size: var(--step-1);
  line-height: 1.55;
  text-wrap: pretty;
}

.export__lede strong {
  color: var(--fg0);
  font-weight: 600;
}

.export__tool {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  max-width: 56rem;
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
