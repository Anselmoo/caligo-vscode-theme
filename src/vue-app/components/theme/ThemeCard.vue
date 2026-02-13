<script setup lang="ts">
import type { ThemeIndexEntry } from "@types/theme";
import { computed } from "vue";

interface Props {
  theme: ThemeIndexEntry;
}

const props = defineProps<Props>();

// biome-ignore lint/correctness/noUnusedVariables: used in Vue template
const accentStyle = computed(() => ({
  backgroundColor: props.theme.colors.accent,
  color: props.theme.colors.bg0,
}));

// biome-ignore lint/correctness/noUnusedVariables: used in Vue template
const coreColors = computed(() => {
  return props.theme.core.slice(0, 6); // Show first 6 core colors
});
</script>

<template>
  <div class="theme-card">
    <div class="card-header">
      <h3 class="card-title">{{ theme.displayName }}</h3>
      <span class="card-badge" :style="accentStyle">
        {{ theme.harmonyLabel }}
      </span>
    </div>

    <div class="card-colors">
      <div
        v-for="color in coreColors"
        :key="color.key"
        class="color-swatch"
        :style="{ backgroundColor: color.hex }"
        :title="`${color.label}: ${color.hex}`"
      />
    </div>

    <div class="card-info">
      <div class="info-row">
        <span class="info-label">Seed:</span>
        <span class="info-value">{{ theme.seedLabel }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Accent:</span>
        <span class="info-value">{{ theme.colors.accent }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-card {
  background: var(--bg2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: all var(--transition-base);
}

.theme-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--bg0-rgb), 0.55);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--fg0);
}

.card-badge {
  font-size: var(--text-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-weight: 600;
}

.card-colors {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
  height: 48px;
}

.color-swatch {
  flex: 1;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.color-swatch:hover {
  transform: scale(1.1);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.info-label {
  color: var(--fg-muted);
}

.info-value {
  color: var(--fg0);
  font-family: var(--font-mono);
}
</style>
