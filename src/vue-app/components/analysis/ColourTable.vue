<script setup lang="ts">
/**
 * One row per core colour: its OKLCH coordinates (measured from the hex) and, for
 * inks, the WCAG ratio over the background after compositing any transparency.
 */
import { type ColourRow, opacityPercent } from "./colour-report.js";

defineProps<{ rows: ColourRow[]; themeName: string }>();

</script>

<template>
  <table class="colours">
    <caption class="visually-hidden">
      OKLCH coordinates and contrast over the background for {{ themeName }}
    </caption>
    <thead>
      <tr>
        <th scope="col" class="colours__name">Colour</th>
        <th scope="col" class="colours__num">L</th>
        <th scope="col" class="colours__num">C</th>
        <th scope="col" class="colours__num">h</th>
        <th scope="col" class="colours__num">Contrast</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.key"
        data-oklch-row
        :data-color-key="row.key"
        :data-l="row.l"
        :data-c="row.c"
        :data-h="row.h"
      >
        <th scope="row" class="colours__name">
          <div class="colours__cell">
            <span
              class="colours__swatch"
              :style="{ background: `linear-gradient(${row.hex}, ${row.hex}), var(--bg0)` }"
              aria-hidden="true"
            />
            <span class="colours__text">
              <span class="colours__label">{{ row.label }}</span>
              <span class="colours__hex">
                {{ row.hex }}
                <template v-if="opacityPercent(row.alpha) !== null">
                  at {{ opacityPercent(row.alpha) }}% opacity
                </template>
              </span>
            </span>
          </div>
        </th>
        <td class="colours__num">{{ row.l.toFixed(2) }}</td>
        <td class="colours__num">{{ row.c.toFixed(2) }}</td>
        <td class="colours__num">{{ row.c < 0.02 ? "n/a" : `${Math.round(row.h)}°` }}</td>
        <td
          v-if="row.contrast !== null"
          class="colours__num"
          :data-contrast-key="row.key"
          :data-ratio="row.contrast"
        >
          {{ row.contrast.toFixed(1) }}:1
        </td>
        <td v-else class="colours__num colours__none">n/a</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.colours {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--step--1);
}

.colours th,
.colours td {
  padding: 10px 6px;
  border-bottom: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
  text-align: left;
  vertical-align: middle;
}

.colours thead th {
  color: var(--fg-muted);
  font-weight: 500;
}

.colours tbody th {
  font-weight: 400;
}

.colours .colours__num {
  width: 3.4rem;
  text-align: right;
  color: var(--fg0);
  font-variant-numeric: tabular-nums;
}

.colours thead .colours__num {
  color: var(--fg-muted);
}

.colours__none {
  color: var(--fg-muted);
}

.colours__name {
  min-width: 0;
}

.colours__cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.colours__swatch {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  /* Translucent inks are painted over the page, as they render in the editor. */
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg0) 28%, transparent);
}

.colours__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.colours__label {
  color: var(--fg0);
  overflow-wrap: anywhere;
}

.colours__hex {
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  overflow-wrap: anywhere;
}

@media (max-width: 480px) {
  .colours th,
  .colours td {
    padding: 8px 4px;
  }

  .colours__num {
    width: 2.6rem;
  }

  .colours__swatch {
    width: 16px;
    height: 16px;
  }

  .colours__cell {
    gap: 8px;
  }
}
</style>
