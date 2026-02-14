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
  <label class="format-selector">
    <span>Format</span>
    <select :value="modelValue" @change="onChange">
      <option v-for="option in options" :key="option" :value="option">
        {{ labels?.[option] ?? option }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.format-selector {
  display: grid;
  gap: var(--space-xs);
}

select {
  background: var(--bg1);
  color: var(--fg0);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-sm);
}
</style>
