<script setup lang="ts">
import { computed, ref } from "vue";
import { useTheme } from "@/composables/useTheme";

const { currentTheme } = useTheme();
const copyStatus = ref<"idle" | "success" | "error">("idle");

const colors = computed(() => {
  if (!currentTheme.value?.colors) return [];
  return Object.entries(currentTheme.value.colors);
});

const exportedColors = computed(() => JSON.stringify(Object.fromEntries(colors.value), null, 2));

async function copyAll() {
  try {
    await navigator.clipboard.writeText(exportedColors.value);
    copyStatus.value = "success";
  } catch {
    copyStatus.value = "error";
  }

  setTimeout(() => {
    copyStatus.value = "idle";
  }, 2000);
}

function downloadAll() {
  const blob = new Blob([exportedColors.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${currentTheme.value?.key ?? "theme"}-all-colors.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
void copyAll;
void downloadAll;
</script>

<template>
  <div class="export-all-colors preview-panel">
    <div class="export-all-colors__header">
      <h3>All colors export</h3>
      <span class="export-all-colors__badge">Augments Export palette</span>
    </div>
    <p class="export-all-colors__subtitle">
      Alternative UX option: preview all current theme colors in one place before export.
    </p>
    <div class="export-all-colors__grid">
      <div
        v-for="[key, value] in colors"
        :key="key"
        class="export-all-colors__item"
      >
        <div class="export-all-colors__meta">
          <span class="export-all-colors__swatch" :style="{ background: value }"></span>
          <span>{{ key }}</span>
        </div>
        <code>{{ value }}</code>
      </div>
    </div>
    <p v-if="copyStatus === 'success'" class="copy-status copy-status--success">Copied to clipboard</p>
    <p v-else-if="copyStatus === 'error'" class="copy-status copy-status--error">
      Clipboard copy failed
    </p>
    <div class="export-all-colors__actions">
      <button class="preview-action-button" type="button" :disabled="colors.length === 0" @click="copyAll">
        Copy all
      </button>
      <button class="preview-action-button" type="button" :disabled="colors.length === 0" @click="downloadAll">
        Download JSON
      </button>
    </div>
  </div>
</template>

<style scoped>
.export-all-colors {
  display: grid;
  gap: var(--space-md);
  padding: var(--space-xl);
}

.export-all-colors__header {
  align-items: center;
  display: flex;
  gap: var(--space-sm);
  justify-content: space-between;
}

h3 {
  margin: 0;
}

.export-all-colors__badge {
  background: rgba(var(--accent-rgb, 99, 102, 241), 0.15);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: var(--space-xs) var(--space-sm);
}

.export-all-colors__subtitle {
  color: var(--text-subtle);
  margin: 0;
}

.export-all-colors__grid {
  display: grid;
  gap: var(--space-sm);
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.export-all-colors__item {
  align-items: center;
  background: rgba(var(--bg1-rgb, 0, 0, 0), 0.35);
  border: 1px solid rgba(var(--fg0-rgb, 255, 255, 255), 0.08);
  border-radius: var(--radius-sm);
  display: flex;
  gap: var(--space-sm);
  justify-content: space-between;
  padding: var(--space-sm);
}

.export-all-colors__meta {
  align-items: center;
  display: flex;
  gap: var(--space-xs);
  min-width: 0;
}

.export-all-colors__swatch {
  border: 1px solid rgba(var(--fg0-rgb, 255, 255, 255), 0.2);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  height: 14px;
  width: 14px;
}

code {
  color: var(--text-subtle);
  font-size: var(--text-xs);
}

.export-all-colors__actions {
  display: flex;
  gap: var(--space-sm);
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
