<script setup lang="ts">
/**
 * Theme Spectrum: every seed palette (rows) in every harmony mode (columns), each
 * cell a chip of that variant's own background and six inks. One click applies it
 * to the whole site. This is the site's single chooser (Home and Themes share it).
 *
 * A real <table>, so assistive tech reads each chip with its row and column
 * headers. Keyboard: the table is one tab stop; arrows move between chips, Home and
 * End jump along a row, Enter and Space apply (native button behaviour).
 */
import { computed, ref } from "vue";
import { useTheme } from "../../composables/useTheme.js";
import type { ThemeIndexEntry } from "../../types/theme.js";
import { HARMONY_MEANINGS } from "../../utils/harmony-utils.js";
import HarmonyGlyph from "./HarmonyGlyph.vue";
import SeedGlyph from "./SeedGlyph.vue";

const { themes, seeds, harmonies, currentThemeKey, currentTheme, setTheme } = useTheme();

const table = ref<HTMLTableElement | null>(null);
const focusKey = ref("");
const hover = ref<{ row: number; col: number } | null>(null);
const announced = ref("");

const rows = computed(() => {
  const byCell = new Map(themes.value.map(t => [`${t.seedId}|${t.harmonyId}`, t]));
  return seeds.value.map(seed => ({
    seed,
    cells: harmonies.value.map(h => byCell.get(`${seed.id}|${h.id}`) ?? null),
  }));
});

/** The one chip in the tab order: last focused, else the active theme, else the first. */
const tabKey = computed(() => {
  const keys = new Set(themes.value.map(t => t.key));
  if (keys.has(focusKey.value)) return focusKey.value;
  if (keys.has(currentThemeKey.value)) return currentThemeKey.value;
  return rows.value[0]?.cells.find(c => c !== null)?.key ?? "";
});

function inks(t: ThemeIndexEntry): Record<string, string> {
  const c = t.colors;
  return {
    "--chip-bg": c.bg0,
    "--chip-edge": c.bg2,
    "--chip-glow": c.accent,
    "--chip-fg": c.fg1,
    "--ink-1": c.accent,
    "--ink-2": c.keywords,
    "--ink-3": c.types,
    "--ink-4": c.functions,
    "--ink-5": c.strings,
    "--ink-6": c.decorator,
  };
}

function apply(t: ThemeIndexEntry) {
  setTheme(t.key);
  announced.value = `Now wearing ${t.seedLabel}, ${t.harmonyLabel}.`;
}

function onKeydown(event: KeyboardEvent) {
  const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-chip]");
  if (!cell || !table.value) return;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  const grid = rows.value.map(r => r.cells);
  const last = harmonies.value.length - 1;

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
  if (next) table.value.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus();
}

/** Gallery light: a soft pool that follows the pointer across the wall. */
function onPointerMove(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement;
  const box = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${event.clientX - box.left}px`);
  el.style.setProperty("--my", `${event.clientY - box.top}px`);
}
</script>

<template>
  <section class="spectrum" aria-labelledby="spectrum-title">
    <header class="spectrum__head">
      <h2 id="spectrum-title" class="spectrum__title">Theme Spectrum</h2>
      <p class="spectrum__lede">
        {{ seeds.length }} seed palettes × {{ harmonies.length }} harmony modes. Click any cell
        to apply.
      </p>
    </header>

    <div class="wall" @pointermove="onPointerMove">
      <table ref="table" class="grid" @keydown="onKeydown" @pointerleave="hover = null">
        <caption class="visually-hidden">
          Theme Spectrum: seed palettes by harmony mode. The pressed cell is the active theme.
        </caption>
        <thead>
          <tr>
            <td class="grid__corner" />
            <th
              v-for="(h, c) in harmonies"
              :key="h.id"
              scope="col"
              class="grid__col"
              :class="{ 'is-lit': hover?.col === c }"
            >
              <HarmonyGlyph :mode="h.id" :label="h.label" />
              <span class="grid__col-label">{{ h.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in rows" :key="row.seed.id">
            <th scope="row" class="grid__seed" :class="{ 'is-lit': hover?.row === r }">
              <span class="grid__seed-in">
                <SeedGlyph
                  :seed="row.seed.id"
                  :size="30"
                  :style="{ '--glyph-accent': row.cells.find(Boolean)?.colors.accent }"
                />
                <span class="grid__seed-name">{{ row.seed.label }}</span>
              </span>
            </th>
            <td v-for="(cell, c) in row.cells" :key="harmonies[c].id" class="grid__slot">
              <button
                v-if="cell"
                type="button"
                class="chip"
                data-chip
                :data-key="cell.key"
                :data-row="r"
                :data-col="c"
                :style="inks(cell)"
                :aria-pressed="cell.key === currentThemeKey"
                :aria-label="`${cell.seedLabel} ${cell.harmonyLabel}`"
                :tabindex="cell.key === tabKey ? 0 : -1"
                @focus="
                  focusKey = cell.key;
                  hover = { row: r, col: c };
                "
                @pointerenter="hover = { row: r, col: c }"
                @click="apply(cell)"
              >
                <span class="chip__code" aria-hidden="true">
                  <span class="chip__line">
                    <i class="chip__ink" :style="{ '--ink': 'var(--ink-2)', '--w': '34%' }" />
                    <i class="chip__bar" :style="{ '--w': '46%' }" />
                  </span>
                  <span class="chip__line chip__line--in">
                    <i class="chip__ink" :style="{ '--ink': 'var(--ink-4)', '--w': '38%' }" />
                    <i class="chip__ink" :style="{ '--ink': 'var(--ink-5)', '--w': '46%' }" />
                  </span>
                  <span class="chip__line chip__line--in">
                    <i class="chip__ink" :style="{ '--ink': 'var(--ink-3)', '--w': '30%' }" />
                    <i class="chip__ink" :style="{ '--ink': 'var(--ink-6)', '--w': '22%' }" />
                    <i class="chip__ink" :style="{ '--ink': 'var(--ink-1)', '--w': '16%' }" />
                  </span>
                  <span class="chip__line chip__line--tail">
                    <i class="chip__bar" :style="{ '--w': '12%' }" />
                  </span>
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="legend">
      <h3 class="legend__title">Harmony modes</h3>
      <ul class="legend__list">
        <li v-for="h in harmonies" :key="h.id" class="legend__item">
          <HarmonyGlyph :mode="h.id" :label="h.label" :size="26" />
          <span>
            <span class="legend__name">{{ h.label }}</span>
            <span class="legend__meaning">{{ HARMONY_MEANINGS[h.id] }}</span>
          </span>
        </li>
      </ul>
    </div>

    <p class="visually-hidden" aria-live="polite">{{ announced }}</p>
    <p v-if="currentTheme" class="spectrum__now" aria-hidden="true">
      <span class="spectrum__now-dot" />
      {{ currentTheme.seedLabel }}, {{ currentTheme.harmonyLabel }}
    </p>
  </section>
</template>

<style scoped>
.spectrum {
  display: grid;
  gap: clamp(20px, 3vw, 32px);
}

.spectrum__head {
  display: grid;
  gap: 10px;
}

.spectrum__title {
  margin: 0;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: var(--step-3);
  font-weight: 340;
  font-stretch: 108%;
  letter-spacing: -0.035em;
  line-height: 1.05;
}

.spectrum__lede {
  margin: 0;
  color: var(--fg-muted);
  font-size: var(--step-0);
}

/* The wall: a dark panel lit by a pool of light that follows the pointer. */
.wall {
  --mx: 50%;
  --my: -200px;
  position: relative;
  padding: clamp(10px, 2vw, 24px);
  border-radius: 20px;
  background:
    radial-gradient(
      320px circle at var(--mx) var(--my),
      color-mix(in oklab, var(--accent) 11%, transparent),
      transparent 70%
    ),
    color-mix(in oklab, var(--bg1) 72%, var(--bg0));
  border: 1px solid color-mix(in oklab, var(--fg0) 7%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in oklab, var(--fg0) 5%, transparent);
}

.grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: clamp(4px, 1vw, 10px);
  table-layout: fixed;
}

.grid__corner {
  width: clamp(96px, 21%, 214px);
}

.grid__col {
  padding: 0 0 6px;
  color: var(--fg-muted);
  font-size: var(--step--1);
  font-weight: 500;
  text-align: left;
  transition: color 160ms var(--ease-out);
}

.grid__col {
  white-space: nowrap;
}

.grid__col :deep(.glyph) {
  display: inline-block;
  margin-right: 8px;
  vertical-align: -5px;
  opacity: 0.8;
}

.grid__seed {
  padding-right: 8px;
  color: var(--fg1);
  font-size: var(--step-0);
  font-weight: 500;
  text-align: left;
  line-height: 1.2;
  transition: color 160ms var(--ease-out);
}

.grid__seed-in {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grid__seed-name {
  min-width: 0;
}

.grid__seed :deep(.seed-glyph) {
  opacity: 0.85;
  transition: opacity 160ms var(--ease-out), scale 260ms var(--ease-out);
}

.grid__seed.is-lit :deep(.seed-glyph) {
  opacity: 1;
  scale: 1.12;
}

.grid__col.is-lit,
.grid__seed.is-lit {
  color: var(--fg0);
}

.grid__slot {
  padding: 0;
}

/* A chip is a small night of its own, and a few lines of code written in it: the
   variant's background, the six inks as the tokens of a TypeScript snippet. */
.chip {
  position: relative;
  display: block;
  width: 100%;
  height: clamp(84px, 9vw, 112px);
  padding: clamp(12px, 1.4vw, 18px) clamp(14px, 1.6vw, 20px);
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--chip-edge) 80%, var(--chip-glow) 12%);
  border-radius: 16px;
  /* The variant's own background stays the paint colour; the gradients only light it. */
  background-color: var(--chip-bg);
  background-image:
    radial-gradient(120% 140% at 50% 140%, color-mix(in oklab, var(--chip-glow) 14%, transparent), transparent 62%),
    linear-gradient(to bottom, color-mix(in oklab, var(--chip-bg) 90%, var(--chip-edge)), var(--chip-bg));
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--fg0) 9%, transparent),
    0 8px 18px -14px oklch(from var(--bg0) calc(l * 0.2) c h);
  text-align: left;
  cursor: pointer;
  isolation: isolate;
  transition:
    transform 220ms var(--ease-out),
    box-shadow 260ms var(--ease-out),
    border-color 200ms var(--ease-out);
}

/* A sheen that sweeps the chip on hover. */
.chip::after {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, color-mix(in oklab, var(--fg0) 12%, transparent) 50%, transparent 65%);
  translate: -120% 0;
  transition: translate 700ms var(--ease-out);
}

.chip__code {
  display: grid;
  gap: clamp(6px, 0.8vw, 9px);
  height: 100%;
  align-content: center;
}

.chip__line {
  display: flex;
  align-items: center;
  gap: clamp(5px, 0.6vw, 8px);
}

.chip__line--in {
  padding-left: clamp(10px, 1.4vw, 18px);
}

.chip__line--tail {
  opacity: 0.8;
}

/* A token: its width is its length in the line, its colour is the variant's ink. */
.chip__ink,
.chip__bar {
  display: block;
  flex: none;
  width: var(--w);
  height: clamp(5px, 0.6vw, 7px);
  border-radius: 4px;
  transform-origin: left;
  transition: transform 360ms var(--ease-out);
}

.chip__ink {
  background-color: var(--ink);
  box-shadow: 0 0 10px -3px var(--ink);
}

/* Plain text and punctuation: the variant's body-text colour, a step quieter. */
.chip__bar {
  background-color: var(--chip-fg);
  opacity: 0.5;
}

.chip:hover,
.chip:focus-visible {
  transform: translateY(-3px);
  border-color: color-mix(in oklab, var(--chip-glow) 60%, var(--chip-edge));
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--fg0) 14%, transparent),
    0 18px 32px -16px var(--chip-glow);
}

.chip:hover::after,
.chip:focus-visible::after {
  translate: 120% 0;
}

/* The tokens stretch out a little, line by line. */
.chip:hover .chip__ink,
.chip:focus-visible .chip__ink {
  transform: scaleX(1.12);
}

.chip:focus-visible {
  outline: 2px solid var(--fg0);
  outline-offset: 3px;
}

/* The lit chip: ringed in its own accent and glowing. */
.chip[aria-pressed="true"] {
  border-color: var(--chip-glow);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--fg0) 16%, transparent),
    0 0 0 2px color-mix(in oklab, var(--chip-glow) 75%, transparent),
    0 0 34px -4px var(--chip-glow);
  animation: lit 460ms var(--ease-out);
}

@keyframes lit {
  0% {
    transform: scale(0.94);
  }
  60% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
}

.legend__title {
  margin: 0 0 14px;
  color: var(--fg0);
  font-size: var(--step-0);
  font-weight: 600;
}

.legend__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legend__item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--fg1);
}

.legend__name {
  display: block;
  color: var(--fg0);
  font-weight: 600;
}

.legend__meaning {
  display: block;
  color: var(--fg-muted);
  font-size: var(--step--1);
  line-height: 1.5;
}

.spectrum__now {
  display: none;
}

/* Phones: column names give way to their glyphs (the legend names them), and
   each chip folds its six inks into two rows of three. */
@media (max-width: 640px) {
  .grid__col-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .grid__col {
    text-align: center;
  }

  .grid__seed {
    padding-right: 4px;
    font-size: 0.72rem;
    overflow-wrap: anywhere;
    hyphens: auto;
  }

  .chip {
    height: 70px;
    padding: 10px;
    border-radius: 12px;
  }

  .chip__code {
    gap: 5px;
  }

  .chip__line--tail,
  .chip::after {
    display: none;
  }

  .chip__line--in {
    padding-left: 8px;
  }

  .grid__seed-in {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .chip::after,
  .chip__ink,
  .chip__bar,
  .grid__seed :deep(.seed-glyph),
  .grid__col,
  .grid__seed {
    transition: none;
  }

  .chip:hover .chip__ink,
  .chip:focus-visible .chip__ink {
    transform: none;
  }

  .chip[aria-pressed="true"] {
    animation: none;
  }

  .chip:hover {
    transform: none;
  }
}
</style>
