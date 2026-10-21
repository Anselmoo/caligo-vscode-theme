<script setup lang="ts">
/**
 * Where the theme's inks sit on the OKLCH hue circle. Angle is hue, distance from the
 * centre is chroma. The ring shows what each hue looks like at a fixed lightness.
 */
import { computed } from "vue";
import type { ColourRow } from "./colour-report.js";

const props = defineProps<{ rows: ColourRow[]; themeName: string }>();

const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_MAX = 150;
const RING_INNER = R_MAX + 14;
const RING_OUTER = R_MAX + 24;
const SEGMENTS = 72;

/** Chroma at the rim. Themes stay well under 0.3, so 0.25 keeps dots off the edge. */
const chromaMax = computed(() => {
  const top = props.rows.reduce((m, r) => Math.max(m, r.c), 0);
  return Math.max(0.2, Math.ceil((top + 0.02) * 20) / 20);
});

const polar = (h: number, c: number) => {
  const a = (h * Math.PI) / 180;
  const r = (c / chromaMax.value) * R_MAX;
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
};

/** Hue ring as small wedges; the fill is a CSS oklch() so no colour maths is needed here. */
const ring = computed(() =>
  Array.from({ length: SEGMENTS }, (_, i) => {
    const step = 360 / SEGMENTS;
    const h0 = i * step;
    const h1 = h0 + step + 0.6;
    const p = (h: number, r: number) => {
      const a = (h * Math.PI) / 180;
      return `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY - r * Math.sin(a)).toFixed(2)}`;
    };
    const d = `M${p(h0, RING_INNER)} L${p(h0, RING_OUTER)} L${p(h1, RING_OUTER)} L${p(h1, RING_INNER)}Z`;
    return { d, fill: `oklch(0.74 0.1 ${(h0 + step / 2).toFixed(1)})` };
  })
);

const circles = computed(() => {
  const step = chromaMax.value > 0.3 ? 0.1 : 0.05;
  const out: Array<{ r: number; label: string }> = [];
  for (let c = step; c <= chromaMax.value + 1e-9; c += step) {
    out.push({ r: (c / chromaMax.value) * R_MAX, label: (Math.round(c * 100) / 100).toFixed(2) });
  }
  return out;
});

/** Below this chroma a colour is effectively grey and its hue means little. */
const MIN_CHROMA = 0.05;

const dots = computed(() =>
  props.rows
    .filter(r => r.kind === "ink" && r.c >= MIN_CHROMA)
    .map(r => {
      const { x, y } = polar(r.h, r.c);
      const a = (r.h * Math.PI) / 180;
      const anchor: "start" | "end" = Math.cos(a) >= 0 ? "start" : "end";
      return {
        key: r.key,
        hex: r.hex,
        x,
        y,
        lx: x + (anchor === "start" ? 11 : -11),
        ly: y + 4,
        anchor,
      };
    })
);

/** Colours left off the wheel, named so nothing disappears silently. */
const omitted = computed(() =>
  props.rows.filter(r => !(r.kind === "ink" && r.c >= MIN_CHROMA)).map(r => r.key)
);

const description = computed(
  () =>
    `Hue and chroma of the inks in ${props.themeName}: ` +
    dots.value.map(d => d.key).join(", ") +
    "."
);

</script>

<template>
  <svg class="wheel" :viewBox="`0 0 ${SIZE} ${SIZE}`" role="img" :aria-label="description">
    <path v-for="(seg, i) in ring" :key="i" :d="seg.d" :fill="seg.fill" />

    <g class="wheel__grid">
      <circle v-for="ring in circles" :key="ring.r" :cx="CX" :cy="CY" :r="ring.r" />
      <line :x1="CX - R_MAX" :x2="CX + R_MAX" :y1="CY" :y2="CY" />
      <line :x1="CX" :x2="CX" :y1="CY - R_MAX" :y2="CY + R_MAX" />
    </g>
    <text
      v-for="ring in circles"
      :key="`t${ring.r}`"
      class="wheel__tick"
      :x="CX + 4"
      :y="CY - ring.r - 3"
    >
      {{ ring.label }}
    </text>

    <g class="wheel__hues">
      <text :x="CX + R_MAX + 40" :y="CY + 4" text-anchor="start">0°</text>
      <text :x="CX" :y="CY - R_MAX - 32" text-anchor="middle">90°</text>
      <text :x="CX - R_MAX - 40" :y="CY + 4" text-anchor="end">180°</text>
      <text :x="CX" :y="CY + R_MAX + 42" text-anchor="middle">270°</text>
    </g>

    <circle
      v-for="dot in dots"
      :key="dot.key"
      class="wheel__dot"
      :cx="dot.x"
      :cy="dot.y"
      r="7"
      :fill="dot.hex"
    />
    <text
      v-for="dot in dots"
      :key="`l${dot.key}`"
      class="wheel__label"
      :x="dot.lx"
      :y="dot.ly"
      :text-anchor="dot.anchor"
    >
      {{ dot.key }}
    </text>
  </svg>
  <p v-if="omitted.length > 0" class="wheel__note">
    Left off the wheel because they are close to grey: {{ omitted.join(", ") }}.
  </p>
</template>

<style scoped>
.wheel {
  display: block;
  width: 100%;
  max-width: 440px;
  height: auto;
  overflow: visible;
  font-family: var(--font-sans);
}

.wheel__grid circle,
.wheel__grid line {
  fill: none;
  stroke: color-mix(in oklab, var(--fg0) 14%, transparent);
  stroke-width: 1;
}

.wheel__tick {
  fill: var(--fg-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.wheel__hues text {
  fill: var(--fg-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.wheel__dot {
  stroke: var(--bg0);
  stroke-width: 2;
}

.wheel__label {
  fill: var(--fg0);
  font-size: 14px;
  paint-order: stroke;
  stroke: var(--bg0);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.wheel__note {
  max-width: 34ch;
  margin: 14px 0 0;
  color: var(--fg-muted);
  font-size: var(--step--1);
  line-height: 1.5;
}
</style>
