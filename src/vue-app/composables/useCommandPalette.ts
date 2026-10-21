/**
 * Command palette state, shared app-wide.
 *
 * VS Code users reach for ⌘K / Ctrl+K (and ⌘⇧P) before they reach for a menu, so the
 * site's theme switcher lives there too. The palette component reads `isOpen`; any
 * button can call `open()`.
 */

import { onBeforeUnmount, onMounted, ref } from "vue";

const isOpen = ref(false);
/** Element that had focus before the palette opened, restored on close. */
let returnFocusTo: HTMLElement | null = null;

function open() {
  if (isOpen.value) return;
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  isOpen.value = true;
}

function close() {
  if (!isOpen.value) return;
  isOpen.value = false;
  returnFocusTo?.focus();
  returnFocusTo = null;
}

function toggle() {
  if (isOpen.value) close();
  else open();
}

function isPaletteShortcut(event: KeyboardEvent): boolean {
  const mod = event.metaKey || event.ctrlKey;
  if (!mod || event.altKey) return false;
  const key = event.key.toLowerCase();
  return (key === "k" && !event.shiftKey) || (key === "p" && event.shiftKey);
}

export function useCommandPalette() {
  return { isOpen, open, close, toggle };
}

/** Registers the global shortcut; call once from the app shell. */
export function useCommandPaletteShortcut() {
  const onKeydown = (event: KeyboardEvent) => {
    if (!isPaletteShortcut(event)) return;
    event.preventDefault();
    toggle();
  };
  onMounted(() => window.addEventListener("keydown", onKeydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
}
