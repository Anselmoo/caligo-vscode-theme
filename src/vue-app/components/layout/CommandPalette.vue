<script setup lang="ts">
/**
 * ⌘K command palette: switch theme or jump to a page.
 *
 * Built on a native <dialog> opened with showModal(), which gives focus
 * containment, Escape-to-close and an inert page behind it. The input is an ARIA
 * combobox driving a listbox; arrow keys move, Enter runs the active command.
 */
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useCommandPalette } from "../../composables/useCommandPalette.js";
import { useTheme } from "../../composables/useTheme.js";

type Command = {
  id: string;
  group: "Themes" | "Pages";
  title: string;
  detail: string;
  haystack: string;
  swatches?: string[];
  current?: boolean;
  run: () => void;
};

const { isOpen, close } = useCommandPalette();
const { themes, currentTheme, setTheme } = useTheme();
const router = useRouter();

const dialogEl = ref<HTMLDialogElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const query = ref("");
const activeIndex = ref(0);

const pages = [
  { path: "/", title: "Home", detail: "The selected theme on its own scene" },
  { path: "/themes", title: "Themes", detail: "All 50 variants side by side" },
  { path: "/wallpapers", title: "Wallpapers", detail: "Scenes for desktop, tablet and phone" },
  { path: "/science", title: "Science", detail: "Lightness, hue and contrast, measured" },
  { path: "/export", title: "Export", detail: "Download the selected theme" },
];

const commands = computed<Command[]>(() => {
  const themeCommands: Command[] = themes.value.map(theme => ({
    id: `theme-${theme.key}`,
    group: "Themes",
    title: theme.seedLabel,
    detail: theme.harmonyLabel,
    haystack: `${theme.seedLabel} ${theme.harmonyLabel} ${theme.key}`.toLowerCase(),
    swatches: [
      theme.colors.bg0,
      theme.colors.keywords,
      theme.colors.functions,
      theme.colors.strings,
    ],
    current: theme.key === currentTheme.value?.key,
    run: () => setTheme(theme.key),
  }));
  const pageCommands: Command[] = pages.map(page => ({
    id: `page-${page.path}`,
    group: "Pages",
    title: page.title,
    detail: page.detail,
    haystack: `${page.title} ${page.detail} go to page`.toLowerCase(),
    run: () => {
      void router.push(page.path);
    },
  }));
  return [...themeCommands, ...pageCommands];
});

/** Every word of the query must appear somewhere in the command's text. */
const results = computed(() => {
  const words = query.value.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return commands.value;
  return commands.value.filter(command => words.every(word => command.haystack.includes(word)));
});

const activeId = computed(() => results.value[activeIndex.value]?.id);

watch(query, () => {
  activeIndex.value = 0;
});

watch(isOpen, async open => {
  const dialog = dialogEl.value;
  if (!dialog) return;
  if (open) {
    query.value = "";
    // Start on the current theme so ↑/↓ steps to its neighbours.
    const current = results.value.findIndex(command => command.current);
    activeIndex.value = Math.max(0, current);
    dialog.showModal();
    await nextTick();
    inputEl.value?.focus();
    scrollActiveIntoView();
  } else if (dialog.open) {
    dialog.close();
  }
});

function scrollActiveIntoView() {
  const id = activeId.value;
  if (!id) return;
  document.getElementById(id)?.scrollIntoView({ block: "nearest" });
}

function move(delta: number) {
  const count = results.value.length;
  if (count === 0) return;
  activeIndex.value = (activeIndex.value + delta + count) % count;
  void nextTick(scrollActiveIntoView);
}

function runActive() {
  const command = results.value[activeIndex.value];
  if (!command) return;
  command.run();
  close();
}

function runCommand(index: number) {
  activeIndex.value = index;
  runActive();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    move(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    move(-1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    runActive();
  }
}

/** Clicking the backdrop (the dialog element itself, outside the panel) closes it. */
function onDialogClick(event: MouseEvent) {
  if (event.target === dialogEl.value) close();
}

function isFirstOfGroup(index: number): boolean {
  return index === 0 || results.value[index - 1]?.group !== results.value[index]?.group;
}

void inputEl;
void onKeydown;
void onDialogClick;
void runCommand;
void isFirstOfGroup;
</script>

<template>
  <dialog
    ref="dialogEl"
    class="palette"
    aria-label="Switch theme or go to a page"
    @close="close"
    @click="onDialogClick"
  >
    <div class="palette__panel">
      <input
        ref="inputEl"
        v-model="query"
        class="palette__input"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-list"
        :aria-activedescendant="activeId"
        aria-autocomplete="list"
        placeholder="Search themes and pages"
        spellcheck="false"
        autocomplete="off"
        @keydown="onKeydown"
      />
      <ul id="palette-list" class="palette__list" role="listbox" aria-label="Results">
        <template v-for="(command, index) in results" :key="command.id">
          <li v-if="isFirstOfGroup(index)" class="palette__group" role="presentation">
            {{ command.group }}
          </li>
          <li
            :id="command.id"
            class="palette__item"
            role="option"
            :aria-selected="index === activeIndex"
            @click="runCommand(index)"
            @mousemove="activeIndex = index"
          >
            <span v-if="command.swatches" class="palette__swatches" aria-hidden="true">
              <span
                v-for="(swatch, i) in command.swatches"
                :key="i"
                class="palette__swatch"
                :style="{ background: swatch }"
              />
            </span>
            <span class="palette__title">{{ command.title }}</span>
            <span class="palette__detail">{{ command.detail }}</span>
            <span v-if="command.current" class="palette__current">Current</span>
          </li>
        </template>
        <li v-if="results.length === 0" class="palette__empty" role="presentation">
          No theme or page matches “{{ query }}”. Try a theme name like “eclipse” or a mode like
          “triadic”.
        </li>
      </ul>
      <p class="palette__hint" aria-hidden="true">
        <kbd>↑</kbd><kbd>↓</kbd> to move, <kbd>Enter</kbd> to apply, <kbd>Esc</kbd> to close
      </p>
    </div>
  </dialog>
</template>

<style scoped>
.palette {
  width: min(640px, calc(100vw - 32px));
  max-height: min(560px, calc(100dvh - 96px));
  margin: 12vh auto auto;
  padding: 0;
  border: 1px solid color-mix(in oklab, var(--fg0) 14%, transparent);
  border-radius: 14px;
  background: color-mix(in oklab, var(--bg1) 88%, transparent);
  color: var(--fg0);
  box-shadow: 0 30px 80px -20px color-mix(in oklab, var(--bg0) 85%, transparent);
  backdrop-filter: blur(18px) saturate(1.2);
  overflow: hidden;
}

.palette::backdrop {
  background: color-mix(in oklab, var(--bg0) 55%, transparent);
  backdrop-filter: blur(2px);
}

.palette[open] {
  animation: palette-in 180ms var(--ease-out);
}

@keyframes palette-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.985);
  }
}

.palette__panel {
  display: flex;
  flex-direction: column;
  max-height: inherit;
}

.palette__input {
  width: 100%;
  padding: 18px 20px;
  border: 0;
  border-bottom: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
  background: transparent;
  color: var(--fg0);
  font: inherit;
  font-size: var(--step-1);
}

.palette__input::placeholder {
  color: var(--fg-muted);
}

.palette__input:focus-visible {
  outline: none;
}

.palette__list {
  margin: 0;
  padding: 6px;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.palette__group {
  padding: 12px 12px 6px;
  color: var(--fg-muted);
  font-size: var(--step--1);
}

.palette__item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.palette__item[aria-selected="true"] {
  background: color-mix(in oklab, var(--accent) 16%, transparent);
}

.palette__swatches {
  display: inline-flex;
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--fg0) 14%, transparent);
}

.palette__swatch {
  width: 12px;
  height: 18px;
}

.palette__item:not(:has(.palette__swatches)) .palette__title {
  grid-column: 1 / 3;
}

.palette__title {
  font-weight: 560;
}

.palette__detail {
  color: var(--fg-muted);
  font-size: var(--step--1);
  text-align: right;
}

.palette__current {
  color: var(--accent);
  font-size: var(--step--1);
}

.palette__empty {
  padding: 20px 12px;
  color: var(--fg-muted);
}

.palette__hint {
  margin: 0;
  padding: 10px 16px;
  border-top: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
  color: var(--fg-muted);
  font-size: var(--step--1);
}

kbd {
  display: inline-block;
  min-width: 1.6em;
  margin-right: 2px;
  padding: 0 5px;
  border: 1px solid color-mix(in oklab, var(--fg0) 18%, transparent);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.85em;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .palette[open] {
    animation: none;
  }
}
</style>
