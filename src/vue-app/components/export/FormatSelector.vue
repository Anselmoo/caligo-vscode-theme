<script setup lang="ts">
import type { ExportFormat } from "../../../export/types.js";

defineProps<{
  modelValue: ExportFormat;
  options: ExportFormat[];
  labels?: Record<ExportFormat, string>;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ExportFormat];
}>();

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value as ExportFormat);
}
void onChange;
</script>

<template>
  <label class="format">
    <span class="format__label">Format</span>
    <select class="format__select" :value="modelValue" @change="onChange">
      <option v-for="option in options" :key="option" :value="option">
        {{ labels?.[option] ?? option }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.format {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.format__label {
  color: var(--fg1);
  font-size: var(--step--1);
  font-weight: 500;
}

.format__select {
  height: 44px;
  min-width: min(100%, 16rem);
  padding: 0 12px;
  border: 1px solid color-mix(in oklab, var(--fg0) 22%, transparent);
  border-radius: 10px;
  background: var(--bg1);
  color: var(--fg0);
  font: inherit;
  font-size: var(--step-0);
}

.format__select:hover {
  border-color: color-mix(in oklab, var(--fg0) 40%, transparent);
}
</style>
