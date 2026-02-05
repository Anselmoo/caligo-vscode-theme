<script setup lang="ts">
import { computed, ref } from "vue";
import { useTheme } from "../../composables/useTheme.js";
import type { ThemeHarmony, ThemeIndexEntry, ThemeSeed } from "../../types/theme.js";
import { HARMONY_ICONS } from "../../utils/harmony-utils.js";

const { themes, setCurrentTheme, harmonies, seeds, currentThemeKey } = useTheme();
const activeThemeKey = currentThemeKey ?? ref("");

// Group themes by seed and harmony using manifest order
const themeMatrix = computed(() => {
  const seedIds = seeds.value.map((s: ThemeSeed) => s.id);
  const harmonyIds = harmonies.value.map((h: ThemeHarmony) => h.id);

  const matrix: { [seedId: string]: { [harmonyId: string]: ThemeIndexEntry | null } } = {};

  for (const seedId of seedIds) {
    matrix[seedId] = {};
    for (const harmonyId of harmonyIds) {
      const theme = themes.value.find(
        (t: ThemeIndexEntry) => t.seedId === seedId && t.harmonyId === harmonyId
      ) as ThemeIndexEntry | undefined;
      matrix[seedId][harmonyId] = theme || null;
    }
  }

  return { matrix, seedIds, harmonyIds };
});

const harmonyLabels = computed(() => {
  return harmonies.value.reduce<Record<string, { label: string; icon: string }>>(
    (acc: Record<string, { label: string; icon: string }>, mode: ThemeHarmony) => {
      acc[mode.id] = { label: mode.label, icon: HARMONY_ICONS[mode.id] || "pi pi-circle" };
      return acc;
    },
    {}
  );
});

const seedLabels = computed(() => {
  return seeds.value.reduce<Record<string, string>>(
    (acc: Record<string, string>, seed: ThemeSeed) => {
      acc[seed.id] = seed.label;
      return acc;
    },
    {}
  );
});

// Chips-only display - no toggle needed

function handleThemeClick(theme: ThemeIndexEntry | null) {
  if (theme) setCurrentTheme(theme.key);
}
function isSelected(theme: ThemeIndexEntry | null) {
  return Boolean(theme && theme.key === activeThemeKey.value);
}
function getChipStyles(theme: ThemeIndexEntry | null) {
  if (!theme) return undefined;
  return {
    "--chip-accent": theme.colors.accent,
    "--chip-strings": theme.colors.strings,
    "--chip-keywords": theme.colors.keywords,
    "--chip-functions": theme.colors.functions,
    "--chip-types": theme.colors.types,
    "--chip-decorator": theme.colors.decorator,
  } as Record<string, string>;
}
void handleThemeClick;
void isSelected;
void getChipStyles;
void themeMatrix;
void harmonyLabels;
void seedLabels;
</script>

<template>
  <div class="theme-spectrum">
    <div class="spectrum-header">
      <h2 class="spectrum-title">Theme Spectrum</h2>
      <p class="spectrum-subtitle text-subtle">
        {{ seeds.length }} seed palettes × {{ harmonies.length }} harmony modes. Click any cell to
        apply.
      </p>
    </div>
    
    <div class="spectrum-table">
      <!-- Column headers -->
      <div class="spectrum-head">
        <div class="spectrum-corner" />
        <div
          v-for="harmonyId in themeMatrix.harmonyIds"
          :key="harmonyId"
          class="spectrum-col-header"
        >
          {{ harmonyLabels[harmonyId]?.label }}
        </div>
      </div>
      
      <!-- Rows -->
      <div class="spectrum-body">
        <div
          v-for="seedId in themeMatrix.seedIds"
          :key="seedId"
          class="spectrum-row"
        >
          <div class="spectrum-seed">
            {{ seedLabels[seedId] }}
          </div>
          
          <button
            v-for="harmonyId in themeMatrix.harmonyIds"
            :key="`${seedId}-${harmonyId}`"
            class="spectrum-cell"
            :class="{ 'spectrum-cell--missing': !themeMatrix.matrix[seedId][harmonyId], 'spectrum-cell--selected': isSelected(themeMatrix.matrix[seedId][harmonyId]) }"
            :style="getChipStyles(themeMatrix.matrix[seedId][harmonyId])"
            :disabled="!themeMatrix.matrix[seedId][harmonyId]"
            :aria-disabled="!themeMatrix.matrix[seedId][harmonyId] ? 'true' : 'false'"
            :aria-pressed="isSelected(themeMatrix.matrix[seedId][harmonyId]) ? 'true' : 'false'"
            type="button"
            @click="handleThemeClick(themeMatrix.matrix[seedId][harmonyId])"
            :aria-label="themeMatrix.matrix[seedId][harmonyId] ? themeMatrix.matrix[seedId][harmonyId].displayName : 'Missing theme'"
          >
            <div v-if="themeMatrix.matrix[seedId][harmonyId]" class="spectrum-chips" aria-hidden="true">
              <span class="chip chip--accent"></span>
              <span class="chip chip--strings"></span>
              <span class="chip chip--keywords"></span>
              <span class="chip chip--functions"></span>
              <span class="chip chip--types"></span>
              <span class="chip chip--decorator"></span>
            </div>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Harmony Legend -->
    <div class="harmony-legend">
      <div class="legend-title">Harmony Modes:</div>
      <div class="legend-items">
        <div
          v-for="harmonyId in themeMatrix.harmonyIds"
          :key="harmonyId"
          class="legend-item"
        >
          <i :class="['legend-icon', harmonyLabels[harmonyId].icon]"></i>
          <span class="legend-label">{{ harmonyLabels[harmonyId].label }}</span>
        </div>
      </div>
    </div>
    
    <div class="spectrum-legend">
      <span class="pill">Interactive matrix</span>
      <span class="pill">Click cells to preview</span>
    </div>


  </div>
</template>

<style scoped>
.theme-spectrum {
  margin: var(--space-2xl) 0;
}

.spectrum-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}
.section-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-lg);
}

.spectrum-subtitle {
  font-size: var(--text-sm);
  color: var(--text-subtle);
}

.spectrum-table {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  background: rgba(var(--bg1-rgb), 0.3);
  backdrop-filter: blur(12px);
  padding: var(--space-sm);
}

.spectrum-head {
  display: grid;
  grid-template-columns: 170px repeat(5, minmax(140px, 1fr));
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.spectrum-col-header {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.3px;
  color: var(--syntax-types);
  text-transform: uppercase;
  padding: 0 6px;
  text-align: center;
}

.harmony-icon {
  opacity: 0.9;
}

.spectrum-corner {
  grid-column: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 16px;
  opacity: 0.6;
}

.corner-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.spectrum-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spectrum-row {
  display: grid;
  grid-template-columns: 170px repeat(5, minmax(140px, 1fr));
  gap: 10px;
  align-items: center;
}

.spectrum-seed {
  font-size: 13px;
  font-weight: 800;
  color: var(--syntax-types);
  padding: 0 6px;
  white-space: nowrap;
}

.spectrum-cell {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-muted);
  background: rgba(var(--bg2-rgb), 0.3);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.spectrum-cell:hover {
  transform: translateY(-1px);
  border-color: var(--border-base);
  background: rgba(var(--bg2-rgb), 0.6);
  box-shadow: 0 10px 22px rgba(var(--bg0-rgb), 0.35);
}

.spectrum-cell--selected {
  border-color: var(--accent);
  background: rgba(var(--bg2-rgb), 0.75);
  box-shadow:
    0 0 0 2px rgba(var(--accent-rgb), 0.35),
    0 14px 28px rgba(var(--accent-rgb), 0.22);
}

.spectrum-cell--selected:hover {
  box-shadow:
    0 0 0 2px rgba(var(--accent-rgb), 0.45),
    0 16px 32px rgba(var(--accent-rgb), 0.28);
}

.spectrum-cell--missing {
  background: rgba(var(--bg2-rgb), 0.1);
  border-style: dashed;
  opacity: 0.4;
  cursor: not-allowed;
}

.spectrum-cell--missing:hover {
  transform: none;
  border-color: var(--border-muted);
  background: rgba(var(--bg2-rgb), 0.1);
}

.spectrum-chips {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
}

.chip {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border-muted);
  box-shadow: 0 6px 20px rgba(var(--bg0-rgb), 0.55);
  flex-shrink: 0;
}

.chip--accent { background: var(--chip-accent); }
.chip--strings { background: var(--chip-strings); }
.chip--keywords { background: var(--chip-keywords); }
.chip--functions { background: var(--chip-functions); }
.chip--types { background: var(--chip-types); }
.chip--decorator { background: var(--chip-decorator); }

.spectrum-cell:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  transform: scale(1.08);
}

.harmony-legend {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: rgba(var(--bg1-rgb), 0.3);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
}

.legend-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--syntax-types);
  margin-bottom: var(--space-sm);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.legend-items {
  display: flex;
  gap: var(--space-lg);
  flex-wrap: wrap;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.legend-icon {
  font-size: 20px;
  color: var(--syntax-types);
  opacity: 0.9;
}

.legend-label {
  font-size: 13px;
  color: var(--syntax-types);
  font-weight: 500;
}

.spectrum-legend {
  margin-top: var(--space-lg);
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  flex-wrap: wrap;
}

.pill {
  display: inline-block;
  padding: var(--space-xs) var(--space-md);
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

@media (max-width: 768px) {
  .spectrum-row {
    grid-template-columns: 80px repeat(5, 1fr);
  }
  
  .chip {
    width: 10px;
    height: 10px;
  }
}
</style>
