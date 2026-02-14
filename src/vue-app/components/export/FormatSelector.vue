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
    <select class="preview-control" :value="modelValue" @change="onChange">
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

</style>
