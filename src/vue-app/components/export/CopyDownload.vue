<script setup lang="ts">
defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  copy: [];
  download: [];
}>();
</script>

<template>
  <div class="actions">
    <button
      type="button"
      class="actions__button actions__button--primary"
      data-export-action="download"
      :disabled="disabled"
      @click="emit('download')"
    >
      Download
    </button>
    <button
      type="button"
      class="actions__button actions__button--quiet"
      data-export-action="copy"
      :disabled="disabled"
      @click="emit('copy')"
    >
      Copy
    </button>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.actions__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  min-width: 112px;
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: 10px;
  font: inherit;
  font-size: var(--step-0);
  font-weight: 600;
  cursor: pointer;
}

.actions__button--primary {
  background: var(--accent);
  color: oklch(from var(--accent) 0.18 calc(c * 0.4) h);
}

.actions__button--primary:hover:not(:disabled) {
  background: oklch(from var(--accent) calc(l + 0.06) c h);
}

.actions__button--quiet {
  border-color: color-mix(in oklab, var(--fg0) 22%, transparent);
  background: transparent;
  color: var(--fg0);
}

.actions__button--quiet:hover:not(:disabled) {
  border-color: color-mix(in oklab, var(--fg0) 45%, transparent);
}

.actions__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
