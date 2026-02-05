<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <div class="analysis-async-state analysis-async-error">
    <p class="title">{{ title ?? 'Visualization failed to load' }}</p>
    <p class="subtitle">
      This tab crashed while loading or rendering. Check the browser console for the underlying error.
    </p>
  </div>
</template>

<style scoped>
.analysis-async-state {
  padding: var(--space-lg);
  border: 1px solid rgba(var(--fg0-rgb), 0.12);
  border-radius: var(--radius-md);
  background: rgba(var(--bg2-rgb), 0.25);
}

.analysis-async-error {
  border-color: rgba(var(--danger-rgb, 255, 80, 80), 0.35);
}

.title {
  margin: 0 0 var(--space-sm);
  color: var(--fg0);
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: var(--fg-muted);
  line-height: 1.5;
}
</style>
