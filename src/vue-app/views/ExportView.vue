<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ExportFormat } from "../../export/types.js";
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

const JSON_EXPORT_FORMATS = new Set<ExportFormat>([
  "design-tokens-w3c",
  "json-flat",
  "json-grouped",
]);

type TokenGroup = "background" | "foreground" | "syntax" | "semantic" | "accent" | "other";

const SEMANTIC_GROUP_ORDER: TokenGroup[] = [
  "background",
  "foreground",
  "syntax",
  "semantic",
  "accent",
  "other",
];

const SEMANTIC_GROUP_LABELS: Record<TokenGroup, string> = {
  background: "Background",
  foreground: "Foreground",
  syntax: "Syntax",
  semantic: "Status",
  accent: "Accent",
  other: "Other",
};

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

type MatrixDisplayColor = ExportPaletteColor & {
  hue: number | null;
  group: TokenGroup;
};

const matrixColors = computed<MatrixDisplayColor[]>(() => {
  const enriched = exportedPaletteColors.value.map(color => {
    const matchingAnalysisColor = oklchColors.value.find(
      analysisColor =>
        analysisColor.key === color.key ||
        analysisColor.hex.toLowerCase() === color.hex.toLowerCase()
    );
    const hue = typeof matchingAnalysisColor?.h === "number" ? matchingAnalysisColor.h : null;
    const group = classifyTokenGroup(color.key);

    return {
      ...color,
      hue,
      group,
    };
  });

  return enriched.sort((a, b) => {
    if (a.group !== b.group) {
      return SEMANTIC_GROUP_ORDER.indexOf(a.group) - SEMANTIC_GROUP_ORDER.indexOf(b.group);
    }
    if (typeof a.hue === "number" && typeof b.hue === "number" && a.hue !== b.hue) {
      return a.hue - b.hue;
    }
    return a.key.localeCompare(b.key);
  });
});

const semanticMatrixSections = computed(() =>
  SEMANTIC_GROUP_ORDER.map(group => ({
    group,
    label: SEMANTIC_GROUP_LABELS[group],
    tokens: matrixColors.value.filter(color => color.group === group),
  })).filter(section => section.tokens.length > 0)
);

const isJsonLikeExport = computed(() => {
  const result = currentResult.value;
  if (!result) return false;

  const mimeType = result.mimeType.toLowerCase();
  const filename = result.filename.toLowerCase();

  return (
    JSON_EXPORT_FORMATS.has(result.format) ||
    mimeType.includes("json") ||
    filename.endsWith(".json")
  );
});

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

function classifyTokenGroup(rawKey: string): TokenGroup {
  const normalized = rawKey.replace(/^--?caligo-/, "").toLowerCase();
  if (normalized.startsWith("bg-")) return "background";
  if (normalized.startsWith("fg-")) return "foreground";
  if (normalized.startsWith("syntax-")) return "syntax";
  if (["error", "warning", "success", "info"].some(prefix => normalized.startsWith(prefix))) {
    return "semantic";
  }
  if (normalized.includes("accent")) return "accent";
  return "other";
}

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
void SEMANTIC_GROUP_ORDER;
void SEMANTIC_GROUP_LABELS;
void selectedToken;
void selectedColor;
void selectedDetails;
void exportedPaletteColors;
void matrixColors;
void semanticMatrixSections;
void selectedExportLines;
void isJsonLikeExport;
void classifyTokenGroup;
</script>

<template>
  <div class="export-view">
    <section class="section">
      <div class="container">
        <h1 class="section-title">Export</h1>
        <p class="section-subtitle text-subtle">
          Select a token from the matrix to inspect details and highlight matching entries in the
          exported payload.
        </p>
        <div class="export-top-grid">
          <article class="export-card">
            <h2>Semantic token matrix</h2>
            <p class="text-subtle semantic-matrix__hint">
              Tokens are grouped by role. Pick a swatch to inspect details and export mappings.
            </p>
            <div class="semantic-matrix" aria-label="Theme tokens grouped by semantics">
              <div v-for="section in semanticMatrixSections" :key="section.group" class="semantic-matrix__row">
                <div class="semantic-matrix__header">
                  <strong>{{ section.label }}</strong>
                  <span class="semantic-matrix__count">{{ section.tokens.length }}</span>
                </div>
                <div class="semantic-matrix__swatches">
                  <button
                    v-for="token in section.tokens"
                    :key="token.key"
                    type="button"
                    class="semantic-matrix__swatch"
                    :class="{ 'semantic-matrix__swatch--active': token.key === selectedToken }"
                    :style="{ backgroundColor: token.hex }"
                    :title="`${token.key} · ${token.hex}`"
                    :aria-label="`Select ${token.key} (${token.hex})`"
                    @click="selectedToken = token.key"
                  />
                </div>
              </div>
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
                  <template v-if="selectedExportLines.length">
                    <code
                      v-for="line in selectedExportLines"
                      :key="line"
                      class="details-grid__code"
                    >
                      {{ line }}
                    </code>
                  </template>
                  <span v-else class="text-subtle">No direct token match in this formatter.</span>
                </dd>
              </dl>
            </template>
          </article>
        </div>
      </div>
    </section>

    <section class="section section--tight">
      <div class="container">
        <article class="export-card export-card--wallpapers">
          <div class="wallpapers-header">
            <div>
              <h2>Wallpapers</h2>
              <p class="text-subtle wallpapers-desc">
                300 SVG wallpapers — 10 seeds × 5 harmony modes × 3 platforms × 2 text variants.
                Each wallpaper is tuned to the active theme palette.
              </p>
            </div>
            <a href="./caligo-wallpapers.zip" download="caligo-wallpapers.zip" class="wallpapers-download-btn">
              ⬇ Download ZIP
            </a>
          </div>
          <div class="wallpapers-meta">
            <span class="wallpapers-chip">300 wallpapers</span>
            <span class="wallpapers-chip">Monitor · Tablet · Mobile</span>
            <span class="wallpapers-chip">SVG · lossless</span>
            <span class="wallpapers-chip">~58 MB</span>
          </div>
        </article>
      </div>
    </section>

    <section class="section section--tight">
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
            :is-json="isJsonLikeExport"
            :export-format="currentResult?.format"
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

.section--tight {
  padding-top: var(--space-lg);
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
  background: rgba(var(--bg2-rgb, 255, 255, 255), 0.3);
}

.export-card h2 {
  margin: 0;
  font-size: var(--text-xl);
}

.semantic-matrix {
  display: grid;
  gap: var(--space-md);
}

.semantic-matrix__hint {
  margin: 0;
}

.semantic-matrix__row {
  display: grid;
  gap: var(--space-xs);
}

.semantic-matrix__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
}

.semantic-matrix__count {
  color: var(--fg-muted);
  font-family: var(--font-mono);
}

.semantic-matrix__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.semantic-matrix__swatch {
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--bg0-rgb), 0.45);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.semantic-matrix__swatch:hover,
.semantic-matrix__swatch--active {
  border-color: color-mix(in oklab, var(--accent) 78%, var(--bg0));
  box-shadow:
    0 0 0 2px color-mix(in oklab, var(--accent) 70%, transparent),
    inset 0 0 0 1px rgba(var(--bg0-rgb), 0.6);
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

.details-grid__code {
  display: block;
  margin-bottom: 4px;
}

.details-grid__code:last-child {
  margin-bottom: 0;
}

.export-card--wallpapers {
  gap: var(--space-md);
}

.wallpapers-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.wallpapers-header h2 {
  margin: 0 0 var(--space-xs);
}

.wallpapers-desc {
  margin: 0;
  font-size: var(--text-sm);
  max-width: 480px;
}

.wallpapers-download-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: var(--text-md);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.wallpapers-download-btn:hover {
  background: var(--accent);
  color: var(--bg0);
}

.wallpapers-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.wallpapers-chip {
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  color: var(--fg2);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
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
