<script setup lang="ts">
import { useThemeStore } from "../stores/themeStore";

// biome-ignore lint/correctness/noUnusedVariables: used in Vue template
const themeStore = useThemeStore();
</script>

<template>
  <div class="theme-selector">
    <div class="selector-header">
      <i class="pi pi-palette"></i>
      <h3>Interactive Theme Selector</h3>
    </div>
    
    <div class="selector-content">
      <!-- Seed Palette Selection -->
      <div class="selector-section">
        <label class="section-label">Seed Palette ({{ themeStore.selectedSeed.name }})</label>
        <div class="seeds-grid">
          <button
            v-for="seed in themeStore.THEME_SEEDS"
            :key="seed.name"
            :class="['seed-chip', { active: themeStore.selectedSeed.name === seed.name }]"
            :title="`${seed.name}: ${seed.description}`"
            @click="themeStore.selectSeed(seed.name)"
          >
            <span class="seed-name">{{ seed.name }}</span>
            <span class="seed-hue">{{ seed.baseHue }}°</span>
          </button>
        </div>
      </div>
      
      <!-- Harmony Mode Selection -->
      <div class="selector-section">
        <label class="section-label">Harmony Mode ({{ themeStore.selectedHarmony.name }})</label>
        <div class="harmonies-list">
          <button
            v-for="harmony in themeStore.HARMONY_MODES"
            :key="harmony.id"
            :class="['harmony-button', { active: themeStore.selectedHarmony.id === harmony.id }]"
            @click="themeStore.selectHarmony(harmony.id)"
          >
            <span class="harmony-name">{{ harmony.name }}</span>
            <span class="harmony-desc">{{ harmony.description }}</span>
          </button>
        </div>
      </div>
      
      <!-- Current Palette Preview -->
      <div class="selector-section">
        <label class="section-label">Current Palette Colors</label>
        <div class="palette-preview">
          <div
            v-for="(color, key) in themeStore.currentPalette.colors"
            :key="key"
            class="color-sample"
            :style="{ backgroundColor: color }"
            :title="`${key}: ${color}`"
          >
            <span class="color-label">{{ key }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-selector {
  position: sticky;
  top: var(--space-md);
  background: rgba(var(--bg2-rgb), 0.8);
  border: 1px solid rgba(var(--fg0-rgb), 0.1);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(var(--bg0-rgb), 0.6);
  z-index: var(--z-sticky, 50);
}

.selector-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: 2px solid rgba(var(--accent-rgb), 0.3);
}

.selector-header i {
  font-size: 20px;
  color: var(--accent);
}

.selector-header h3 {
  font-size: var(--text-lg);
  font-weight: 700;
  /* Color from typography.css: --text-primary */
  margin: 0;
}

.selector-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.selector-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section-label {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--fg-muted);
}

.seeds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--space-xs);
}

.seed-chip {
  background: rgba(var(--fg0-rgb), 0.05);
  border: 1px solid rgba(var(--fg0-rgb), 0.1);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.seed-chip:hover {
  background: rgba(var(--fg0-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.5);
}

.seed-chip.active {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: var(--accent);
}

.seed-name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--fg0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.seed-hue {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--fg-muted);
}

.harmonies-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.harmony-button {
  background: rgba(var(--fg0-rgb), 0.05);
  border: 1px solid rgba(var(--fg0-rgb), 0.1);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.harmony-button:hover {
  background: rgba(var(--fg0-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.5);
}

.harmony-button.active {
  background: rgba(var(--accent-rgb), 0.2);
  border-color: var(--accent);
}

.harmony-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--fg0);
}

.harmony-desc {
  font-size: var(--text-xs);
  color: var(--fg-muted);
}

.palette-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: var(--space-xs);
}

.color-sample {
  height: 48px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--fg0-rgb), 0.2);
  display: flex;
  align-items: flex-end;
  padding: 4px;
  position: relative;
  overflow: hidden;
}

.color-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--bg0);
  background: rgba(var(--fg0-rgb), 0.9);
  padding: 2px 4px;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

@media (max-width: 1024px) {
  .theme-selector {
    position: relative;
    top: 0;
  }
}

@media (max-width: 768px) {
  .seeds-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  }
  
  .palette-preview {
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  }
  
  .color-sample {
    height: 36px;
  }
}
</style>
