<script setup lang="ts">
/**
 * The theme matrix: one row per palette, one column per harmony mode, each cell a
 * small editor swatch. Only rows and columns that still have a match are drawn, so
 * filtering shrinks the matrix instead of leaving holes.
 *
 * Keyboard: the matrix is one tab stop. Arrow keys move between swatches, Home and
 * End jump along a row; Enter and Space (native button behaviour) apply a variant.
 */
import { computed, ref } from "vue";
import type { ThemeIndexEntry } from "../../types/theme.js";
import VariantSwatch from "./VariantSwatch.vue";

type Seed = { id: string; label: string };

const props = defineProps<{
  variants: ThemeIndexEntry[];
  seeds: Seed[];
  harmonyIds: string[];
  currentKey: string;
}>();

const emit = defineEmits<{ select: [key: string] }>();

const root = ref<HTMLElement | null>(null);
const focusKey = ref("");

const columns = computed(() => {
  const present = new Set(props.variants.map(v => v.harmonyId));
  return props.harmonyIds
    .filter(id => present.has(id as ThemeIndexEntry["harmonyId"]))
    .map(id => ({
      id,
      label: props.variants.find(v => v.harmonyId === id)?.harmonyLabel ?? id,
    }));
});

const rows = computed(() => {
  const byCell = new Map(props.variants.map(v => [`${v.seedId}|${v.harmonyId}`, v]));
  return props.seeds
    .map(seed => ({
      seed,
      cells: columns.value.map(col => byCell.get(`${seed.id}|${col.id}`) ?? null),
    }))
    .filter(row => row.cells.some(cell => cell !== null));
});

/** The one swatch that is in the tab order: last focused, else current, else first. */
const tabKey = computed(() => {
  const keys = new Set(props.variants.map(v => v.key));
  if (keys.has(focusKey.value)) return focusKey.value;
  if (keys.has(props.currentKey)) return props.currentKey;
  return rows.value[0]?.cells.find(cell => cell !== null)?.key ?? "";
});

function cellName(variant: ThemeIndexEntry): string {
  return `${variant.seedLabel} ${variant.harmonyLabel}`;
}

function onKeydown(event: KeyboardEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-theme-card]");
  if (!target || !root.value) return;
  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);
  const grid = rows.value.map(r => r.cells);
  const last = columns.value.length - 1;

  const along = (r: number, from: number, step: number) => {
    for (let c = from; c >= 0 && c <= last; c += step) if (grid[r]?.[c]) return grid[r][c];
    return null;
  };
  const down = (step: number) => {
    for (let r = row + step; r >= 0 && r < grid.length; r += step)
      if (grid[r][col]) return grid[r][col];
    return null;
  };

  const moves: Record<string, () => ThemeIndexEntry | null> = {
    ArrowRight: () => along(row, col + 1, 1),
    ArrowLeft: () => along(row, col - 1, -1),
    ArrowDown: () => down(1),
    ArrowUp: () => down(-1),
    Home: () => along(row, 0, 1),
    End: () => along(row, last, -1),
  };
  const next = moves[event.key]?.();

  if (next === undefined) return;
  event.preventDefault();
  if (next) {
    root.value.querySelector<HTMLElement>(`[data-theme-id="${next.key}"]`)?.focus();
  }
}

</script>

<template>
  <div
    ref="root"
    class="matrix"
    role="group"
    aria-label="Variants by palette and harmony mode"
    :style="{ '--cols': columns.length }"
    @keydown="onKeydown"
  >
    <div class="matrix__head" aria-hidden="true">
      <span />
      <span class="matrix__cols">
        <span v-for="col in columns" :key="col.id" class="matrix__col">{{ col.label }}</span>
      </span>
    </div>

    <ul class="matrix__rows">
      <li v-for="(row, r) in rows" :key="row.seed.id" class="row">
        <span class="row__name">{{ row.seed.label }}</span>
        <ul class="row__cells">
          <li v-for="(cell, c) in row.cells" :key="columns[c].id" class="slot">
            <button
              v-if="cell"
              type="button"
              class="cell"
              data-theme-card
              :data-theme-id="cell.key"
              :data-row="r"
              :data-col="c"
              :aria-pressed="cell.key === currentKey"
              :aria-label="cellName(cell)"
              :tabindex="cell.key === tabKey ? 0 : -1"
              @focus="focusKey = cell.key"
              @click="emit('select', cell.key)"
            >
              <VariantSwatch :theme="cell" />
              <span class="cell__caption" aria-hidden="true">{{ cell.harmonyLabel }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.matrix {
  --label-w: 8.5rem;
  min-width: 0;
}

.matrix__head,
.row {
  display: grid;
  grid-template-columns: var(--label-w) minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
}

.matrix__cols,
.row__cells {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.matrix__head {
  margin-bottom: 10px;
}

.matrix__col {
  color: var(--fg-muted);
  font-size: var(--step--1);
  line-height: 1.25;
}

.matrix__rows {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row__name {
  color: var(--fg0);
  font-weight: 600;
  line-height: 1.25;
}

.slot {
  min-width: 0;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--fg-muted);
  font: inherit;
  font-size: var(--step--1);
  text-align: left;
  cursor: pointer;
}

.cell__caption {
  display: none;
}

.cell:hover :deep(.swatch) {
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg0) 45%, transparent);
}

.cell[aria-pressed="true"] :deep(.swatch) {
  box-shadow: inset 0 0 0 2px var(--fg0);
}

.cell:focus-visible {
  outline: 2px solid var(--fg0);
  outline-offset: 3px;
}

/* Phones: the column header row is replaced by a caption under each swatch. */
@media (max-width: 720px) {
  .matrix__head {
    display: none;
  }

  .matrix__rows {
    gap: 22px;
  }

  .row {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 8px;
  }

  .row__cells {
    grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
    gap: 12px 8px;
  }

  .slot:empty {
    display: none;
  }

  .cell__caption {
    display: block;
    line-height: 1.25;
  }

  .cell[aria-pressed="true"] {
    color: var(--fg0);
  }
}
</style>
