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
    <button
      type="button"
      class="copy-download__button copy-download__button--copy"
      :class="{ 'copy-download__button--disabled': disabled }"
      :disabled="disabled"
      @click="emit('copy')"
    >
      Copy
    </button>
    <button
      type="button"
      class="copy-download__button copy-download__button--download"
      :class="{ 'copy-download__button--disabled': disabled }"
      :disabled="disabled"
      @click="emit('download')"
    >
      Download
    </button>
  </div>
</template>

<style scoped>
.copy-download {
  display: flex;
  gap: var(--space-sm);
}

.copy-download__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  background: color-mix(in oklab, var(--bg1) 86%, var(--bg0));
  color: var(--fg0);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}

.copy-download__button:hover:not(:disabled) {
  border-color: color-mix(in oklab, var(--accent) 78%, var(--border-color));
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 38%, transparent);
}

.copy-download__button:focus-visible {
  outline: none;
  border-color: color-mix(in oklab, var(--accent) 85%, var(--border-color));
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 45%, transparent);
}

.copy-download__button--copy {
  color: var(--syntax-keywords, var(--caligo-syntax-keywords, var(--accent)));
  border-color: color-mix(
    in oklab,
    var(--syntax-keywords, var(--caligo-syntax-keywords, var(--accent))) 35%,
    var(--border-color)
  );
}

.copy-download__button--download {
  color: var(--accent, var(--caligo-accent, var(--fg0)));
  border-color: color-mix(in oklab, var(--accent, var(--caligo-accent, var(--fg0))) 35%, var(--border-color));
}

.copy-download__button--disabled,
.copy-download__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
