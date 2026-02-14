<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "@/composables/useTheme";

const { currentTheme } = useTheme();

const coreColors = computed(() => {
  if (!currentTheme.value?.core) return [];
  return currentTheme.value.core;
});
void coreColors;

const themeName = computed(() => {
  return currentTheme.value?.displayName || "Theme";
});
void themeName;
</script>

<template>
  <div class="core-palette preview-panel">
    <div class="core-palette__header">
      <div>
        <div class="core-palette__title">Core palette</div>
        <div class="kicker">10 colors that drive the UI + syntax accents</div>
      </div>
      <div class="core-palette__current">
        <span>{{ themeName }}</span>
      </div>
    </div>

    <div class="core-grid">
      <div
        v-for="color in coreColors"
        :key="color.key"
        class="core-item"
      >
        <div class="core-left">
          <div
            class="core-swatch"
            :style="{ background: color.hex }"
          ></div>
          <div class="core-label">{{ color.label }}</div>
        </div>
        <div class="core-hex">{{ color.hex.toLowerCase() }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.core-palette {
  padding: var(--space-xl);
}

.core-palette__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
  gap: var(--space-md);
  flex-wrap: wrap;
}

.core-palette__title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-strong);
}

.core-palette__current {
  color: var(--accent);
  font-weight: 600;
  font-size: var(--text-sm);
  padding: var(--space-xs) var(--space-md);
  background: rgba(var(--accent-rgb, 99, 102, 241), 0.15);
  border-radius: var(--radius-md);
}

.kicker {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-subtle);
  margin-top: var(--space-xs);
}

.core-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-md);
}

.core-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: rgba(var(--bg1-rgb, 0, 0, 0), 0.4);
  border: 1px solid rgba(var(--fg0-rgb, 255, 255, 255), 0.08);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.core-item:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.core-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.core-swatch {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  border: 2px solid rgba(var(--fg0-rgb, 255, 255, 255), 0.2);
}

.core-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.core-hex {
  font-family: var(--font-mono, 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace);
  font-size: var(--text-xs);
  color: var(--text-subtle);
  white-space: nowrap;
  user-select: all;
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.core-hex:hover {
  background: rgba(var(--accent-rgb, 99, 102, 241), 0.2);
  color: var(--accent);
}

@media (max-width: 640px) {
  .core-grid {
    grid-template-columns: 1fr;
  }
  
  .core-palette__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
