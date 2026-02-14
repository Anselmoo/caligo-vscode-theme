<script setup lang="ts">
import { ref } from "vue";
import { useExport } from "../../composables/useExport.js";
import CopyDownload from "./CopyDownload.vue";
import ExportPreview from "./ExportPreview.vue";
import FormatSelector from "./FormatSelector.vue";

withDefaults(
  defineProps<{
    embedded?: boolean;
    title?: string;
    subtitle?: string;
  }>(),
  {
    embedded: false,
    title: "Primary export",
    subtitle: "Source of truth for palette export format and output.",
  }
);

const {
  selectedFormat,
  availableFormats,
  formatLabels,
  currentResult,
  copyCurrent,
  downloadCurrent,
} = useExport();
const copyStatus = ref<"idle" | "success" | "error">("idle");

async function copy() {
  copyStatus.value = (await copyCurrent()) ? "success" : "error";
  setTimeout(() => {
    copyStatus.value = "idle";
  }, 2000);
}
void CopyDownload;
void ExportPreview;
void FormatSelector;
void selectedFormat;
void availableFormats;
void formatLabels;
void currentResult;
void downloadCurrent;
void copy;
void copyStatus;
</script>

<template>
  <div :class="['export-panel', { 'preview-panel': !embedded, 'export-panel--embedded': embedded }]">
    <div class="export-panel__header">
      <div>
        <h3>{{ title }}</h3>
        <p class="export-panel__subtitle">{{ subtitle }}</p>
      </div>
      <FormatSelector v-model="selectedFormat" :options="availableFormats" :labels="formatLabels" />
    </div>
    <ExportPreview :content="currentResult?.content || ''" />
    <p v-if="copyStatus === 'success'" class="copy-status copy-status--success">Copied to clipboard</p>
    <p v-else-if="copyStatus === 'error'" class="copy-status copy-status--error">
      Clipboard copy failed
    </p>
    <CopyDownload :disabled="!currentResult" @copy="copy" @download="downloadCurrent" />
  </div>
</template>

<style scoped>
.export-panel {
  display: grid;
  gap: var(--space-md);
  padding: var(--space-xl);
}

.export-panel--embedded {
  padding: var(--space-lg);
  border: 1px solid rgb(var(--fg0-rgb, 255 255 255) / 0.1);
  border-radius: var(--radius-md);
  background: rgb(var(--bg1-rgb, 0 0 0) / 0.35);
}

.export-panel__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  align-items: end;
}

h3 {
  margin: 0;
}

.export-panel__subtitle {
  margin: var(--space-xs) 0 0;
  font-size: var(--text-xs);
  color: var(--text-subtle);
}

.copy-status {
  margin: 0;
  font-size: var(--text-sm);
}

.copy-status--success {
  color: var(--color-success);
}

.copy-status--error {
  color: var(--color-error);
}
</style>
