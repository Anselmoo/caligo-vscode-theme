<script setup lang="ts">
import { useExport } from "../../composables/useExport.js";
import CopyDownload from "./CopyDownload.vue";
import ExportPreview from "./ExportPreview.vue";
import FormatSelector from "./FormatSelector.vue";

const { selectedFormat, availableFormats, currentResult, copyCurrent, downloadCurrent } =
  useExport();

async function copy() {
  await copyCurrent();
}
void CopyDownload;
void ExportPreview;
void FormatSelector;
void selectedFormat;
void availableFormats;
void currentResult;
void downloadCurrent;
void copy;
</script>

<template>
  <div class="export-panel">
    <div class="export-panel__header">
      <h3>Export palette</h3>
      <FormatSelector v-model="selectedFormat" :options="availableFormats" />
    </div>
    <ExportPreview :content="currentResult?.content || ''" />
    <CopyDownload :disabled="!currentResult" @copy="copy" @download="downloadCurrent" />
  </div>
</template>

<style scoped>
.export-panel {
  display: grid;
  gap: var(--space-md);
  padding: var(--space-xl);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: rgb(var(--bg2-rgb, 255 255 255) / 0.3);
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
</style>
