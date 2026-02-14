<script setup lang="ts">
defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  copy: [];
  download: [];
}>();
void emit;
</script>

<template>
  <div class="copy-download">
    <button type="button" :disabled="disabled" @click="emit('copy')">Copy</button>
    <button type="button" :disabled="disabled" @click="emit('download')">Download</button>
  </div>
</template>

<style scoped>
.copy-download {
  display: flex;
  gap: var(--space-sm);
}

button {
  background: var(--bg1);
  color: var(--fg0);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
