<script setup lang="ts">
/**
 * One bar per ink, as long as its WCAG contrast over the background, with the 3:1 and
 * 4.5:1 bars drawn as dashed lines. Inks are ordered from clearest to faintest; the ones
 * that miss 4.5:1 say so in words, so the picture never relies on colour alone.
 */
import { computed, useId } from "vue";
import { AA_LARGE, AA_TEXT, type ColourRow, contrastLadder } from "./colour-report.js";

const props = defineProps<{ rows: ColourRow[]; themeName: string }>();

const W = 460;
const BAR_H = 20;
const ROW_H = 30;
const M = { top: 26, right: 74, bottom: 48, left: 92 };
const PLOT_W = W - M.left - M.right;

const rungs = computed(() => contrastLadder(props.rows));
const H = computed(() => M.top + rungs.value.length * ROW_H + M.bottom);

/** At least 7 so a dim theme does not stretch its few points of contrast across the plot. */
const ratioMax = computed(() => Math.max(7, Math.ceil(rungs.value[0]?.ratio ?? 0)));
const x = (ratio: number) => M.left + (Math.min(ratio, ratioMax.value) / ratioMax.value) * PLOT_W;
const rowY = (i: number) => M.top + i * ROW_H;

const ticks = computed(() => {
  const step = ratioMax.value > 14 ? 5 : ratioMax.value > 8 ? 2 : 1;
  const out: number[] = [];
  for (let r = 0; r <= ratioMax.value; r += step) out.push(r);
  return out;
});

const titleId = useId();

const description = computed(() => {
  const clear = rungs.value.filter(r => r.passesAA).length;
  return (
    `WCAG contrast of each ink in ${props.themeName} over its background. ` +
    `${clear} of ${rungs.value.length} reach ${AA_TEXT}:1.`
  );
});
</script>

<template>
  <svg
    class="chart"
    :viewBox="`0 0 ${W} ${H}`"
    role="img"
    :aria-labelledby="titleId"
    data-contrast-ladder
  >
    <title :id="titleId">{{ description }}</title>

    <g class="chart__grid">
      <template v-for="tick in ticks" :key="`t${tick}`">
        <line :x1="x(tick)" :x2="x(tick)" :y1="M.top - 6" :y2="H - M.bottom + 4" />
        <text class="chart__tick" :x="x(tick)" :y="H - M.bottom + 20" text-anchor="middle">
          {{ tick }}
        </text>
      </template>
    </g>

    <g class="chart__marker">
      <line :x1="x(AA_LARGE)" :x2="x(AA_LARGE)" :y1="M.top - 6" :y2="H - M.bottom + 4" />
      <text :x="x(AA_LARGE) - 4" :y="M.top - 12" text-anchor="end">{{ AA_LARGE }}:1</text>
      <line :x1="x(AA_TEXT)" :x2="x(AA_TEXT)" :y1="M.top - 6" :y2="H - M.bottom + 4" />
      <text :x="x(AA_TEXT) + 4" :y="M.top - 12" text-anchor="start">{{ AA_TEXT }}:1</text>
    </g>

    <g v-for="(rung, i) in rungs" :key="rung.key" :data-ladder-row="rung.key">
      <text
        class="chart__label"
        :class="{ 'is-weak': !rung.passesAA }"
        :x="M.left - 10"
        :y="rowY(i) + BAR_H / 2 + 5"
        text-anchor="end"
      >
        {{ rung.key }}
      </text>
      <rect
        class="chart__bar"
        :x="M.left"
        :y="rowY(i)"
        :width="Math.max(0, x(rung.ratio) - M.left)"
        :height="BAR_H"
        rx="4"
        :fill="rung.hex"
      />
      <text
        class="chart__value"
        :class="{ 'is-weak': !rung.passesAA }"
        :x="x(rung.ratio) + 8"
        :y="rowY(i) + BAR_H / 2 + 5"
        :data-ratio="rung.ratio.toFixed(2)"
      >
        {{ rung.ratio.toFixed(1) }}:1{{ rung.passesAA ? "" : " below" }}
      </text>
    </g>


    <text class="chart__axis" :x="M.left + PLOT_W / 2" :y="H - 2" text-anchor="middle">
      Contrast ratio over the background
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
  stroke: color-mix(in oklab, var(--fg0) 10%, transparent);
  stroke-width: 1;
}

.chart__tick,
.chart__axis {
  fill: var(--fg-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.chart__bar {
  stroke: color-mix(in oklab, var(--fg0) 35%, transparent);
  stroke-width: 1;
}

.chart__label,
.chart__value {
  fill: var(--fg0);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  paint-order: stroke;
  stroke: var(--bg0);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.chart__label.is-weak,
.chart__value.is-weak {
  fill: var(--fg-muted);
}

.chart__marker line {
  stroke: var(--fg1);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.chart__marker text {
  fill: var(--fg1);
  font-size: 13px;
}
</style>
