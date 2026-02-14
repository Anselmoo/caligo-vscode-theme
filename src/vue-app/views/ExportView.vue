<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CopyDownload from "../components/export/CopyDownload.vue";
import ExportPreview from "../components/export/ExportPreview.vue";
import FormatSelector from "../components/export/FormatSelector.vue";
import { useExport } from "../composables/useExport.js";
import { useThemeAnalysis } from "../composables/useThemeAnalysis.js";

const { oklchColors } = useThemeAnalysis();
const {
  selectedFormat,
  availableFormats,
  formatLabels,
  currentResult,
  copyCurrent,
  downloadCurrent,
} = useExport();

const selectedToken = ref<string>("");
const copyStatus = ref<"idle" | "success" | "error">("idle");
const MAX_MAPPING_LINES = 6;
const MAX_WHEEL_COLORS = 48;

type ExportPaletteColor = {
  key: string;
  hex: string;
};

const exportedPaletteColors = computed<ExportPaletteColor[]>(() => {
  const content = currentResult.value?.content ?? "";
  const lines = content.split("\n");
  const entries: ExportPaletteColor[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const hexMatch = line.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})/);
    if (!hexMatch) continue;
    const keyMatch = line.match(/["']?([a-zA-Z0-9._-]+)["']?\s*[:=]/);
    const key = keyMatch?.[1] ?? `color-${entries.length + 1}`;
    const hex = hexMatch[0];
    const dedupeKey = `${key}|${hex.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    entries.push({ key, hex });
  }

  if (entries.length) return entries.slice(0, MAX_WHEEL_COLORS);

  return oklchColors.value.map(color => ({ key: color.key, hex: color.hex }));
});

watch(
  exportedPaletteColors,
  colors => {
    if (!colors.length) {
      selectedToken.value = "";
      return;
    }
    if (!colors.some(color => color.key === selectedToken.value)) {
      selectedToken.value = colors[0].key;
    }
  },
  { immediate: true }
);

const selectedColor = computed(() =>
  exportedPaletteColors.value.find(color => color.key === selectedToken.value)
);

const selectedExportLines = computed(() => {
  if (!selectedColor.value || !currentResult.value?.content) return [];
  return currentResult.value.content
    .split("\n")
    .filter(line => lineMatchesToken(line, selectedColor.value?.key ?? ""))
    .slice(0, MAX_MAPPING_LINES);
});

function lineMatchesToken(line: string, token: string): boolean {
  if (!token) return false;
  const lower = token.toLowerCase();
  const kebab = token.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const snake = kebab.replace(/-/g, "_");
  const normalizedLine = line.toLowerCase();
  return (
    normalizedLine.includes(lower) ||
    normalizedLine.includes(kebab) ||
    normalizedLine.includes(snake)
  );
}

function wheelDotStyle(index: number, hex: string): Record<string, string> {
  const angle =
    (index / Math.max(exportedPaletteColors.value.length, 1)) * Math.PI * 2 - Math.PI / 2;
  const radius = 42;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  return {
    left: `${x}%`,
    top: `${y}%`,
    backgroundColor: hex,
  };
}

const wheelBackground = computed(() => {
  const colors = exportedPaletteColors.value;
  if (!colors.length) return "conic-gradient(#666, #999)";
  return `conic-gradient(${colors
    .map((color, index) => {
      const start = (index / colors.length) * 100;
      const end = ((index + 1) / colors.length) * 100;
      return `${color.hex} ${start}% ${end}%`;
    })
    .join(", ")})`;
});

const selectedDetails = computed(() => {
  const selected = selectedColor.value;
  if (!selected) return null;
  const matchingAnalysisColor = oklchColors.value.find(
    color => color.key === selected.key || color.hex.toLowerCase() === selected.hex.toLowerCase()
  );
  return {
    ...selected,
    l: matchingAnalysisColor?.l,
    c: matchingAnalysisColor?.c,
    h: matchingAnalysisColor?.h,
  };
});

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
void MAX_MAPPING_LINES;
void MAX_WHEEL_COLORS;
void selectedToken;
void selectedColor;
void selectedDetails;
void exportedPaletteColors;
void selectedExportLines;
void wheelDotStyle;
void wheelBackground;
</script>

<template>
  <div class="export-view">
    <section class="section">
      <div class="container">
        <h1 class="section-title">Export</h1>
        <p class="section-subtitle text-subtle">
          Select a token from the wheel to inspect details and highlight matching entries in the
          exported payload.
        </p>
        <div class="export-top-grid">
          <article class="export-card">
            <h2>Color wheel</h2>
            <div class="color-wheel" aria-label="Current theme colors" :style="{ '--wheel-spectrum': wheelBackground }">
              <button
                v-for="(color, index) in exportedPaletteColors"
                :key="color.key"
                type="button"
                class="color-wheel__dot"
                :class="{ 'color-wheel__dot--active': color.key === selectedToken }"
                :style="wheelDotStyle(index, color.hex)"
                :aria-label="`Select ${color.label ?? color.key} (${color.hex})`"
                @click="selectedToken = color.key"
              />
              <div class="color-wheel__center">
                <span>{{ selectedDetails?.key ?? "—" }}</span>
              </div>
            </div>
            <div class="color-stars" aria-label="Full exported palette">
              <button
                v-for="color in exportedPaletteColors"
                :key="`star-${color.key}-${color.hex}`"
                type="button"
                class="color-stars__item"
                :class="{ 'color-stars__item--active': color.key === selectedToken }"
                :style="{ color: color.hex }"
                :aria-label="`Select ${color.key} (${color.hex})`"
                @click="selectedToken = color.key"
              >
                ★
              </button>
            </div>
          </article>

          <article class="export-card">
            <h2>Selected color</h2>
            <template v-if="selectedDetails">
              <div class="selected-color">
                <div class="selected-color__swatch" :style="{ background: selectedDetails.hex }" />
                <div>
                  <div class="selected-color__token">{{ selectedDetails.key }}</div>
                  <div class="selected-color__hex">{{ selectedDetails.hex }}</div>
                </div>
              </div>
              <dl class="details-grid">
                <dt>OKLCH</dt>
                <dd v-if="typeof selectedDetails.l === 'number'">
                  L {{ selectedDetails.l.toFixed(3) }} · C {{ (selectedDetails.c ?? 0).toFixed(3) }} ·
                  H {{ (selectedDetails.h ?? 0).toFixed(1) }}
                </dd>
                <dd v-else>Not available for this export-only token.</dd>
                <dt>Export mapping</dt>
                <dd>
                  <code v-if="selectedExportLines.length">{{ selectedExportLines[0] }}</code>
                  <span v-else class="text-subtle">No direct token match in this formatter.</span>
                </dd>
              </dl>
            </template>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <article class="export-card export-card--payload">
          <div class="export-actions">
            <h2>Standards-based output</h2>
            <div class="export-actions__controls">
              <FormatSelector
                v-model="selectedFormat"
                :options="availableFormats"
                :labels="formatLabels"
              />
              <CopyDownload :disabled="!currentResult" @copy="copy" @download="downloadCurrent" />
            </div>
          </div>
          <p v-if="copyStatus === 'success'" class="copy-status copy-status--success">Copied to clipboard</p>
          <p v-else-if="copyStatus === 'error'" class="copy-status copy-status--error">
            Clipboard copy failed
          </p>
          <ExportPreview
            :content="currentResult?.content || ''"
            :highlight-token="selectedColor?.key ?? ''"
            :is-json="selectedFormat.includes('json')"
          />
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.export-view {
  min-height: 100vh;
}

.section {
  padding: var(--space-3xl) 0;
}

.section-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-lg);
}

.section-subtitle {
  font-size: var(--text-base);
  text-align: center;
  max-width: 720px;
  margin: 0 auto var(--space-xl);
}

.export-top-grid {
  display: grid;
  gap: var(--space-lg);
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.export-card {
  display: grid;
  gap: var(--space-md);
  padding: var(--space-xl);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: rgb(var(--bg2-rgb, 255 255 255) / 0.3);
}

.export-card h2 {
  margin: 0;
  font-size: var(--text-xl);
}

.color-wheel {
  position: relative;
  width: min(100%, 420px);
  aspect-ratio: 1;
  margin: 0 auto;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  background:
    radial-gradient(circle at center, rgb(var(--bg0-rgb) / 0.7) 0%, rgb(var(--bg0-rgb) / 0.88) 58%, rgb(var(--bg1-rgb) / 0.8) 100%),
    var(--wheel-spectrum);
}

.color-wheel__dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--bg0);
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.color-wheel__dot:hover,
.color-wheel__dot--active {
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 0 2px var(--fg0);
}

.color-wheel__center {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--fg0);
  font-size: var(--text-sm);
  font-weight: 600;
}

.color-stars {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  align-items: center;
}

.color-stars__item {
  border: 0;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
}

.color-stars__item--active {
  transform: scale(1.2);
  opacity: 1;
  text-shadow: 0 0 8px currentcolor;
}

.selected-color {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.selected-color__swatch {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.selected-color__token {
  font-weight: 700;
}

.selected-color__hex {
  font-family: var(--font-mono);
}

.details-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-xs) var(--space-md);
  margin: 0;
}

.details-grid dt {
  color: var(--fg-muted);
  font-size: var(--text-sm);
}

.details-grid dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

.export-card--payload {
  gap: var(--space-sm);
}

.export-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-md);
  align-items: end;
}

.export-actions__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: end;
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
