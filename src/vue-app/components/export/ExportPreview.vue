<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  content: string;
  highlightToken?: string;
}>();

const lines = computed(() => props.content.split("\n"));

function isHighlighted(line: string): boolean {
  if (!props.highlightToken) return false;
  const lower = props.highlightToken.toLowerCase();
  const kebab = props.highlightToken.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const snake = kebab.replace(/-/g, "_");
  const normalizedLine = line.toLowerCase();
  return (
    normalizedLine.includes(lower) ||
    normalizedLine.includes(kebab) ||
    normalizedLine.includes(snake)
  );
}

void lines;
void isHighlighted;
</script>

<template>
  <pre class="export-preview"><code><span
    v-for="(line, index) in lines"
    :key="`${index}-${line}`"
    class="export-preview__line"
    :class="{ 'export-preview__line--highlight': isHighlighted(line) }"
  >{{ line }}
</span></code></pre>
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

.export-preview__line {
  display: block;
}

.export-preview__line--highlight {
  background: color-mix(in oklab, var(--accent) 22%, transparent);
}
</style>
