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
    <button class="preview-action-button" type="button" :disabled="disabled" @click="emit('copy')">Copy</button>
    <button class="preview-action-button" type="button" :disabled="disabled" @click="emit('download')">Download</button>
  </div>
</template>

<style scoped>
.copy-download {
  display: flex;
  gap: var(--space-sm);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
