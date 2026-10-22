<script setup lang="ts">
/**
 * Controls for the wallpaper grid. Platform leads because it changes every
 * thumbnail's shape and the file you download. Scope shows the active palette's
 * five scenes, or the whole family one switch away.
 */
import { PLATFORM_SIZES } from "../../../wallpaper/types.js";
import type { WallpaperFilter } from "../../composables/useWallpapers";

export type WallpaperScope = "palette" | "all";

const props = defineProps<{
  filter: WallpaperFilter;
  show: WallpaperScope;
  /** Name of the active palette, e.g. "Deep Sable". */
  paletteLabel: string;
  total: number;
}>();

const emit = defineEmits<{
  update: [patch: Partial<WallpaperFilter>];
  scope: [scope: WallpaperScope];
}>();

const platforms = [
  { id: "monitor", label: "Monitor" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
] as const;

function resolution(): string {
  const { width, height } = PLATFORM_SIZES[props.filter.platform ?? "monitor"];
  return `${width} × ${height} px`;
}
</script>

<template>
  <div class="controls">
    <div class="controls__platform">
      <fieldset class="segmented" data-platform-toggle>
        <legend class="visually-hidden">Device</legend>
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
      </fieldset>
      <p class="controls__size">{{ resolution() }}</p>
    </div>

    <div class="controls__filters">
      <fieldset class="segmented" data-scope-toggle>
        <legend class="visually-hidden">Show</legend>
        <button
          type="button"
          class="segmented__btn"
          :aria-pressed="show === 'palette'"
          @click="emit('scope', 'palette')"
        >
          {{ paletteLabel }}
        </button>
        <button
          type="button"
          class="segmented__btn"
          :aria-pressed="show === 'all'"
          @click="emit('scope', 'all')"
        >
          All {{ total }}
        </button>
      </fieldset>

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
  min-width: 0;
  margin: 0;
  border: 0;
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


}
</style>
