<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useCommandPalette } from "../../composables/useCommandPalette.js";
import { useTheme } from "../../composables/useTheme.js";

const { open } = useCommandPalette();
const { currentTheme } = useTheme();

const navItems = [
  { path: "/themes", label: "Themes" },
  { path: "/wallpapers", label: "Wallpapers" },
  { path: "/science", label: "Science" },
];

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const shortcutLabel = isMac ? "⌘K" : "Ctrl K";

const themeName = computed(() => currentTheme.value?.seedLabel ?? "Theme");
const modeName = computed(() => currentTheme.value?.harmonyLabel ?? "");

void RouterLink;
void open;
void navItems;
void shortcutLabel;
void isMac;
void themeName;
void modeName;
</script>

<template>
  <nav class="app-nav" aria-label="Main">
    <div class="nav-inner">
      <RouterLink to="/" class="brand" aria-label="Caligo home">Caligo</RouterLink>

      <ul class="nav-links">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink :to="item.path" class="nav-link" active-class="is-active">
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>

      <div class="nav-actions">
        <button
          type="button"
          class="theme-chip"
          :aria-keyshortcuts="isMac ? 'Meta+K' : 'Control+K'"
          @click="open"
        >
          <span class="visually-hidden">Change theme, current:</span>
          <span class="theme-chip__dot" aria-hidden="true" />
          <span class="theme-chip__name">{{ themeName }}</span>
          <span class="theme-chip__mode">{{ modeName }}</span>
          <kbd class="theme-chip__kbd" aria-hidden="true">{{ shortcutLabel }}</kbd>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.app-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: color-mix(in oklab, var(--bg0) 62%, transparent);
  backdrop-filter: blur(16px) saturate(1.3);
  border-bottom: 1px solid color-mix(in oklab, var(--fg0) 7%, transparent);
  view-transition-name: app-nav;
}

.nav-inner {
  display: flex;
  align-items: center;
  gap: clamp(12px, 3vw, 40px);
  max-width: var(--page-max);
  height: 56px;
  margin: 0 auto;
  padding: 0 var(--gutter);
}

.brand {
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  font-stretch: 112%;
  letter-spacing: -0.01em;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav-link {
  display: block;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--fg-muted);
  font-size: var(--step--1);
  font-weight: 500;
  text-decoration: none;
}

.nav-link:hover {
  color: var(--fg0);
}

.nav-link.is-active {
  color: var(--fg0);
  background: color-mix(in oklab, var(--fg0) 8%, transparent);
}

.nav-actions {
  margin-left: auto;
}

.theme-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 8px 0 10px;
  border: 1px solid color-mix(in oklab, var(--fg0) 14%, transparent);
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg1) 70%, transparent);
  color: var(--fg0);
  font: inherit;
  font-size: var(--step--1);
  cursor: pointer;
}

.theme-chip:hover {
  border-color: color-mix(in oklab, var(--accent) 50%, transparent);
}

.theme-chip__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent);
}

.theme-chip__mode {
  color: var(--fg-muted);
}

.theme-chip__kbd {
  padding: 1px 6px;
  border: 1px solid color-mix(in oklab, var(--fg0) 16%, transparent);
  border-radius: 5px;
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

/* Phones: the chip shrinks to its dot + name; links stay one tap away. */
@media (max-width: 640px) {
  .nav-inner {
    gap: 10px;
  }

  .theme-chip__mode,
  .theme-chip__kbd {
    display: none;
  }

  .nav-link {
    padding: 6px 7px;
  }
}

@media (max-width: 400px) {
  .theme-chip__name {
    display: none;
  }

  .theme-chip {
    padding: 0 10px;
  }
}
</style>
