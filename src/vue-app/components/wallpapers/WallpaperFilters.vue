<script setup lang="ts">
/**
 * Controls for the wallpaper grid. Platform leads because it changes every
 * thumbnail's shape and the file you download; theme and mode only narrow the list.
 */
import { PLATFORM_SIZES } from "../../../wallpaper/types.js";
import type { WallpaperFilter } from "../../composables/useWallpapers";

const props = defineProps<{
  filter: WallpaperFilter;
  seeds: Array<{ id: string; label: string }>;
  modes: Array<{ id: string; label: string }>;
}>();

const emit = defineEmits<{ update: [patch: Partial<WallpaperFilter>] }>();

const platforms = [
  { id: "monitor", label: "Monitor" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
] as const;

function resolution(): string {
  const { width, height } = PLATFORM_SIZES[props.filter.platform ?? "monitor"];
  return `${width} × ${height} px`;
}

function onSelect(key: "seedId" | "harmonyMode", event: Event) {
  emit("update", { [key]: (event.target as HTMLSelectElement).value || null });
}

void emit;
void platforms;
void resolution;
void onSelect;
</script>

<template>
  <div class="controls">
    <div class="controls__platform">
      <div class="segmented" role="group" aria-label="Platform" data-platform-toggle>
        <button
          v-for="p in platforms"
          :key="p.id"
          type="button"
          class="segmented__btn"
          :aria-pressed="filter.platform === p.id"
          @click="emit('update', { platform: p.id })"
        >
          {{ p.label }}
        </button>
      </div>
      <p class="controls__size">{{ resolution() }}</p>
    </div>

    <div class="controls__filters">
      <div class="field">
        <label class="field__label" for="wallpaper-theme">Theme</label>
        <select
          id="wallpaper-theme" class="field__select" :value="filter.seedId ?? ''" @change="onSelect('seedId', $event)">
          <option value="">All themes</option>
          <option v-for="s in seeds" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field__label" for="wallpaper-mode">Mode</label>
        <select
          id="wallpaper-mode" class="field__select" :value="filter.harmonyMode ?? ''" @change="onSelect('harmonyMode', $event)">
          <option value="">All modes</option>
          <option v-for="m in modes" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </div>

      <label class="check">
        <input
          type="checkbox"
          :checked="filter.textVariant === 'text'"
          @change="emit('update', { textVariant: ($event.target as HTMLInputElement).checked ? 'text' : 'no-text' })"
        />
        <span>With caption text</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px 40px;
}

.controls__platform {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.segmented {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: color-mix(in oklab, var(--fg0) 8%, var(--bg0));
}

.segmented__btn {
  min-width: 88px;
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--fg1);
  font: inherit;
  font-size: var(--step-0);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.segmented__btn:hover {
  color: var(--fg0);
}

.segmented__btn[aria-pressed="true"] {
  background: var(--fg0);
  color: var(--bg0);
}

.controls__size {
  margin: 0;
  color: var(--fg1);
  font-family: var(--font-mono);
  font-size: var(--step--1);
}

.controls__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field__label {
  color: var(--fg1);
  font-size: var(--step--1);
}

.field__select {
  height: 40px;
  min-width: 11rem;
  padding: 0 12px;
  border: 1px solid color-mix(in oklab, var(--fg0) 22%, transparent);
  border-radius: 8px;
  background: var(--bg1);
  color: var(--fg0);
  font: inherit;
  font-size: var(--step-0);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  color: var(--fg0);
  font-size: var(--step-0);
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--fg0);
}

@media (max-width: 640px) {
  .segmented {
    display: flex;
    width: 100%;
  }

  .segmented__btn {
    flex: 1;
    min-width: 0;
  }

  .field {
    flex: 1 1 8rem;
  }

  .field__select {
    width: 100%;
    min-width: 0;
  }
}
</style>
