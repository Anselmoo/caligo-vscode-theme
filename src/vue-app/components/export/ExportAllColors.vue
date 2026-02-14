<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "@/composables/useTheme";

const { currentTheme } = useTheme();

const colors = computed(() => {
  if (!currentTheme.value?.colors) return [];
  return Object.entries(currentTheme.value.colors);
});
void colors;
</script>

<template>
  <div class="export-all-colors preview-panel">
    <div class="export-all-colors__header">
      <h3>All color tokens (reference)</h3>
      <span class="export-all-colors__badge">Secondary panel</span>
    </div>
    <p class="export-all-colors__subtitle">
      Inspect every token in one place. Primary export lives inside the Core palette panel.
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
</style>
