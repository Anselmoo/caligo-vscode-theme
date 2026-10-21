<script setup lang="ts">
import { onBeforeMount } from "vue";
import AppFooter from "./components/layout/AppFooter.vue";
import AppNav from "./components/layout/AppNav.vue";
import CommandPalette from "./components/layout/CommandPalette.vue";
import { useCommandPaletteShortcut } from "./composables/useCommandPalette.js";
import { useTheme } from "./composables/useTheme.js";

const { loadThemeIndex } = useTheme();

// Load theme BEFORE any child components render
onBeforeMount(async () => {
  await loadThemeIndex();
});

useCommandPaletteShortcut();

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
</script>

<template>
  <div id="caligo-app">
    <a class="skip-link" href="#main">Skip to content</a>
    <AppNav />
    <!-- Page changes animate through View Transitions (router/index.ts), so the
         router view swaps instantly here instead of running an out-in fade. -->
    <main id="main" class="app-main" tabindex="-1">
      <RouterView v-slot="{ Component, route }">
        <component :is="Component" :key="route.path" />
      </RouterView>
    </main>
    <AppFooter />
    <CommandPalette />
  </div>
</template>

<style scoped>
#caligo-app {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  position: relative;
  z-index: 1;
}

.app-main:focus {
  outline: none;
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 16px;
  z-index: var(--z-modal);
  padding: 8px 14px;
  border-radius: 6px;
  background: var(--accent);
  color: var(--bg0);
  font-weight: 600;
}

.skip-link:focus {
  top: 12px;
}
</style>
