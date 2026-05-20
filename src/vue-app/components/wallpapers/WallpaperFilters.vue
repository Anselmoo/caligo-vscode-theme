<script setup lang="ts">
import type { WallpaperFilter } from "../../composables/useWallpapers";

const _props = defineProps<{
  filter: WallpaperFilter;
  seeds: Array<{ id: string; label: string }>;
  modes: Array<{ id: string; label: string; topic: string }>;
}>();

const emit = defineEmits<{
  update: [patch: Partial<WallpaperFilter>];
  reset: [];
}>();

const platforms = [
  { id: "monitor", label: "Monitor" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
] as const;

const textVariants = [
  { id: "no-text", label: "No text" },
  { id: "text", label: "With text" },
] as const;

// Silence biome: all vars below are used in the Vue template
void emit;
void platforms;
void textVariants;
</script>

<template>
  <div class="wallpaper-filters">
    <!-- Platform (always visible) -->
    <div class="filter-group">
      <label class="filter-label">Platform</label>
      <div class="chip-row">
        <button
          v-for="p in platforms"
          :key="p.id"
          class="chip"
          :class="{ active: filter.platform === p.id }"
          @click="emit('update', { platform: p.id })"
        >{{ p.label }}</button>
      </div>
    </div>

    <!-- Text variant -->
    <div class="filter-group">
      <label class="filter-label">Text</label>
      <div class="chip-row">
        <button
          v-for="v in textVariants"
          :key="v.id"
          class="chip"
          :class="{ active: filter.textVariant === v.id }"
          @click="emit('update', { textVariant: v.id })"
        >{{ v.label }}</button>
      </div>
    </div>

    <!-- Seed filter -->
    <div class="filter-group">
      <label class="filter-label">Theme</label>
      <select
        class="filter-select"
        :value="filter.seedId ?? ''"
        @change="emit('update', { seedId: ($event.target as HTMLSelectElement).value || null })"
      >
        <option value="">All themes</option>
        <option v-for="s in seeds" :key="s.id" :value="s.id">{{ s.label }}</option>
      </select>
    </div>

    <!-- Mode filter -->
    <div class="filter-group">
      <label class="filter-label">Mode / Topic</label>
      <select
        class="filter-select"
        :value="filter.harmonyMode ?? ''"
        @change="emit('update', { harmonyMode: ($event.target as HTMLSelectElement).value || null })"
      >
        <option value="">All modes</option>
        <option v-for="m in modes" :key="m.id" :value="m.id">{{ m.label }} · {{ m.topic }}</option>
      </select>
    </div>

    <!-- Reset -->
    <button class="reset-btn" @click="emit('reset')">Reset filters</button>
  </div>
</template>

<style scoped>
.wallpaper-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  align-items: flex-end;
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--border-color);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.filter-label {
  font-size: var(--text-xs);
  color: var(--fg2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.chip-row {
  display: flex;
  gap: var(--space-xs);
}

.chip {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--fg2);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
}

.chip.active,
.chip:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg0);
}

.filter-select {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg1);
  color: var(--fg1);
  font-size: var(--text-sm);
  cursor: pointer;
  min-width: 160px;
}

.filter-select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.reset-btn {
  padding: 4px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--fg2);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: color 0.1s, border-color 0.1s;
  align-self: flex-end;
}

.reset-btn:hover {
  color: var(--fg0);
  border-color: var(--fg2);
}
</style>
