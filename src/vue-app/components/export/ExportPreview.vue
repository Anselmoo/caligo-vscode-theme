<script setup lang="ts">
defineProps<{
  content: string;
}>();
</script>

<template>
  <pre class="export-preview"><code>{{ content }}</code></pre>
</template>

<style scoped>
.export-preview {
  max-height: 260px;
  overflow: auto;
  margin: 0;
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg0);
  color: var(--fg0);
}
</style>
