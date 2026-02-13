<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "@/composables/useTheme";
import type { CaligoTheme } from "@/types/theme";

const { currentTheme, themes, setTheme, themeIndex } = useTheme();

const currentSeedId = computed(() => currentTheme.value?.seedId || "");
void currentSeedId;

function handleSeedChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const newSeedId = select.value;

  // Find theme with new seed and current harmony mode
  const currentHarmony = currentTheme.value?.harmonyId || "balanced";
  const matchingTheme = themes.value.find(
    (t: CaligoTheme) => t.seedId === newSeedId && t.harmonyId === currentHarmony
  );

  if (matchingTheme) {
    setTheme(matchingTheme.key);
  }
}
void handleSeedChange;
void themeIndex;
</script>

<template>
  <div class="theme-selector">
    <select 
      id="theme-select"
      :value="currentSeedId"
      @change="handleSeedChange"
      class="theme-select"
      aria-label="Select theme family"
    >
      <option
        v-for="seed in themeIndex?.seeds"
        :key="seed.id"
        :value="seed.id"
      >
        {{ seed.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.theme-selector {
  position: relative;
}

.theme-select {
  appearance: none;
  background: var(--bg1);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--fg0);
  padding: var(--space-sm) var(--space-xl) var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 200px;
}

.theme-select:hover {
  border-color: var(--accent);
}

.theme-select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.theme-select::after {
  content: '▼';
  position: absolute;
  right: var(--space-md);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--fg-muted);
}

/* Custom select arrow */
.theme-selector::after {
  content: '▼';
  position: absolute;
  right: var(--space-md);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--fg-muted);
  font-size: var(--text-xs);
}
</style>
