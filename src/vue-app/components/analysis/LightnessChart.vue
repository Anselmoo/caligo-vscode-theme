<script setup lang="ts">
/**
 * Lightness against chroma for every core colour of the theme, with the lightness a
 * neutral text colour needs to reach 4.5:1 over the background. Marks are labelled
 * directly; the full numbers live in the table beside it.
 */
import { computed } from "vue";
import { AA_TEXT, type ColourRow } from "./colour-report.js";

const props = defineProps<{
  rows: ColourRow[];
  /** Lightness at which neutral text reaches 4.5:1 over bg0, or null. */
  threshold: number | null;
  themeName: string;
}>();

const W = 460;
const H = 330;
const M = { top: 14, right: 104, bottom: 42, left: 40 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const LABEL_GAP = 17;
const LABEL_WIDTH = 78;

const chromaMax = computed(() => {
  const top = props.rows.reduce((m, r) => Math.max(m, r.c), 0);
  return Math.max(0.2, Math.ceil((top + 0.02) * 20) / 20);
});

const x = (c: number) => M.left + (c / chromaMax.value) * PLOT_W;
const y = (l: number) => M.top + (1 - l) * PLOT_H;

const yTicks = [0, 0.25, 0.5, 0.75, 1];
const xTicks = computed(() => {
  const step = chromaMax.value > 0.3 ? 0.1 : 0.05;
  const ticks: number[] = [];
  for (let c = 0; c <= chromaMax.value + 1e-9; c += step) ticks.push(Math.round(c * 100) / 100);
  return ticks;
});

/** Surfaces sit together near the bottom, so they share one label. */
const labels = computed(() => {
  const inks = props.rows.filter(r => r.kind === "ink");
  const surfaces = props.rows.filter(r => r.kind === "surface");
  const entries = inks.map(r => ({ text: r.key, x: x(r.c) + 10, y: y(r.l) + 4 }));
  if (surfaces.length > 0) {
    const mean = surfaces.reduce((s, r) => s + r.l, 0) / surfaces.length;
    const meanC = surfaces.reduce((s, r) => s + r.c, 0) / surfaces.length;
    entries.push({ text: "surfaces", x: x(meanC) + 10, y: y(mean) + 4 });
  }
  // Nudge labels apart so neighbouring colours stay readable.
  // Only labels that share a column can collide, so only those are pushed apart.
  entries.sort((a, b) => a.y - b.y);
  const placed: typeof entries = [];
  for (const entry of entries) {
    for (const other of placed) {
      if (Math.abs(other.x - entry.x) < LABEL_WIDTH && entry.y - other.y < LABEL_GAP) {
        entry.y = other.y + LABEL_GAP;
      }
    }
    placed.push(entry);
  }
  return entries;
});

const description = computed(
  () =>
    `Lightness against chroma for the colours of ${props.themeName}. ` +
    (props.threshold === null
      ? ""
      : `Neutral text needs a lightness of at least ${props.threshold.toFixed(2)} to reach ${AA_TEXT}:1 over the background.`)
);

</script>

<template>
  <svg class="chart" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="description">
    <g class="chart__grid">
      <template v-for="tick in yTicks" :key="`y${tick}`">
        <line :x1="M.left" :x2="W - M.right" :y1="y(tick)" :y2="y(tick)" />
        <text class="chart__tick" :x="M.left - 8" :y="y(tick) + 4" text-anchor="end">
          {{ tick.toFixed(2).replace(/0$/, "") }}
        </text>
      </template>
      <template v-for="tick in xTicks" :key="`x${tick}`">
        <text class="chart__tick" :x="x(tick)" :y="H - M.bottom + 18" text-anchor="middle">
          {{ tick.toFixed(2).replace(/0$/, "") }}
        </text>
      </template>
    </g>

    <text class="chart__axis" :x="M.left + PLOT_W / 2" :y="H - 6" text-anchor="middle">
      Chroma (C)
    </text>
    <text
      class="chart__axis"
      :transform="`translate(12 ${M.top + PLOT_H / 2}) rotate(-90)`"
      text-anchor="middle"
    >
      Lightness (L)
    </text>

    <g v-if="threshold !== null" class="chart__threshold">
      <line :x1="M.left" :x2="W - M.right" :y1="y(threshold)" :y2="y(threshold)" />
      <text :x="W - M.right + 8" :y="y(threshold) + 4">{{ AA_TEXT }}:1 line</text>
    </g>

    <circle
      v-for="row in rows"
      :key="row.key"
      class="chart__dot"
      :cx="x(row.c)"
      :cy="y(row.l)"
      r="6"
      :fill="row.hex"
    />
    <text v-for="label in labels" :key="label.text" class="chart__label" :x="label.x" :y="label.y">
      {{ label.text }}
    </text>
  </svg>
</template>

<style scoped>
.chart {
  display: block;
  width: 100%;
  height: auto;
  max-width: 600px;
  overflow: visible;
  font-family: var(--font-sans);
}

.chart__grid line {
  stroke: color-mix(in oklab, var(--fg0) 12%, transparent);
  stroke-width: 1;
}

.chart__tick {
  fill: var(--fg-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.chart__axis {
  fill: var(--fg-muted);
  font-size: 13px;
}

.chart__threshold line {
  stroke: var(--fg1);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.chart__threshold text {
  fill: var(--fg1);
  font-size: 13px;
}

.chart__dot {
  stroke: color-mix(in oklab, var(--fg0) 55%, transparent);
  stroke-width: 1;
}

.chart__label {
  fill: var(--fg0);
  font-size: 14px;
  paint-order: stroke;
  stroke: var(--bg0);
  stroke-width: 4px;
  stroke-linejoin: round;
}
</style>
