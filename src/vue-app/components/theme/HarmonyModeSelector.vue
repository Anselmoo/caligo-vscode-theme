<script setup lang="ts">
import { ref, watch } from "vue";
import { useTheme } from "@/composables/useTheme";
import type { ThemeHarmonyId, ThemeIndexEntry } from "@/types/theme";
import { HARMONY_ICONS } from "@/utils/harmony-utils";

const { currentTheme, themes, setTheme, harmonies } = useTheme();

const selectedHarmonyId = ref<ThemeHarmonyId>("balanced");

// Sync with current theme's harmony
watch(
  currentTheme,
  theme => {
    if (theme?.harmonyId) {
      selectedHarmonyId.value = theme.harmonyId as ThemeHarmonyId;
    }
  },
  { immediate: true }
);

// When harmony changes, find matching theme with current seed
function handleHarmonyChange(harmonyId: ThemeHarmonyId) {
  selectedHarmonyId.value = harmonyId;

  if (!currentTheme.value) return;

  // Find theme with same seed but different harmony
  const matchingTheme = themes.value.find(
    (t: ThemeIndexEntry) => t.seedId === currentTheme.value?.seedId && t.harmonyId === harmonyId
  );

  if (matchingTheme) {
    setTheme(matchingTheme.key);
  }
}
void handleHarmonyChange;

const harmonyIcon = HARMONY_ICONS;
void harmonyIcon;
</script>

<template>
  <div class="harmony-selector">
    <div class="harmony-buttons">
      <button
        v-for="mode in harmonies"
        :key="mode.id"
        class="harmony-button"
        :class="{ active: selectedHarmonyId === mode.id }"
        :title="mode.label"
        @click="handleHarmonyChange(mode.id as ThemeHarmonyId)"
      >
        <i :class="['harmony-icon', harmonyIcon[mode.id as ThemeHarmonyId] || 'pi pi-circle']"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.harmony-selector {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.harmony-buttons {
  display: flex;
  gap: var(--space-xs);
  background: var(--bg1);
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.harmony-button {
  appearance: none;
  background: transparent;
  border: none;
  padding: var(--space-xs);
  border-radius: var(--radius-xs);
  color: var(--fg-muted);
  font-size: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.harmony-button:hover {
  color: var(--fg0);
  background: rgba(var(--fg0-rgb), 0.05);
}

.harmony-button.active {
  color: var(--bg0);
  background: var(--accent);
}

.harmony-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .harmony-buttons {
    flex-wrap: wrap;
  }
}
</style>
