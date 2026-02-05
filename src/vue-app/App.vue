<script setup lang="ts">
import { onBeforeMount } from "vue";
import AppFooter from "./components/layout/AppFooter.vue";
import AppNav from "./components/layout/AppNav.vue";
import AuroraBackground from "./components/layout/AuroraBackground.vue";
import NightSky from "./components/layout/NightSky.vue";
import { useTheme } from "./composables/useTheme.js";

const { loadThemeIndex } = useTheme();

// Load theme BEFORE any child components render
onBeforeMount(async () => {
  await loadThemeIndex();
});

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
void AppFooter;
void AppNav;
void AuroraBackground;
void NightSky;
</script>

<template>
  <div id="caligo-app">
    <NightSky />
    <AuroraBackground />
    <AppNav />
    <main class="app-main">
      <RouterView v-slot="{ Component, route }">
        <Transition :name="typeof route.meta.transition === 'string' ? route.meta.transition : 'fade'" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
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

/* Route transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
