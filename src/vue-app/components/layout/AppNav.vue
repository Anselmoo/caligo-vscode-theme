<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import HarmonyModeSelector from "../theme/HarmonyModeSelector.vue";
import ThemeSelector from "../theme/ThemeSelector.vue";

const route = useRoute();

const navItems = [
  { path: "/", label: "Home", name: "home" },
  { path: "/gallery", label: "Gallery", name: "gallery" },
  { path: "/analysis", label: "Analysis", name: "analysis" },
  { path: "/export", label: "Export", name: "export" },
  { path: "/wallpapers", label: "Wallpapers", name: "wallpapers" },
  { path: "/wallpapers/composer", label: "Composer", name: "wallpapers-composer" },
];

const isActive = (name: string) => {
  return computed(() => route.name === name);
};

// Silence TS "unused" diagnostics for template-used bindings and imported components
void RouterLink;
void ThemeSelector;
void HarmonyModeSelector;
void navItems;
void isActive;
</script>

<template>
  <nav class="app-nav">
    <div class="nav-container container">
      <div class="nav-brand">
        <RouterLink to="/" class="brand-link">
          <span class="brand-name">Caligo</span>
        </RouterLink>
      </div>
      
      <div class="nav-links">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="nav-link"
          :class="{ 'active': isActive(item.name).value }"
        >
          {{ item.label }}
        </RouterLink>
      </div>
      
      <div class="nav-actions">
        <ThemeSelector />
        <HarmonyModeSelector />
      </div>
    </div>
  </nav>
</template>

<style scoped>
.app-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: var(--bg0);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
}

.nav-container {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
}

.nav-brand {
  flex: 0 0 auto;
}

.brand-link {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: var(--text-xl);
  color: var(--app-text-strong, var(--accent));
}

.brand-name {
  background: linear-gradient(135deg, var(--accent), var(--syntax-types));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  gap: var(--space-sm);
  flex: 1;
}

.nav-link {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  color: var(--app-text-muted, var(--syntax-functions));
  font-weight: 500;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--app-text-primary, var(--syntax-types));
  background: var(--bg1);
}

.nav-link.active {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.12);
}

.nav-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .nav-container {
    flex-wrap: wrap;
  }
  
  .nav-links {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
