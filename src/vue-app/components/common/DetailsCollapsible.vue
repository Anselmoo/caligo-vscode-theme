<script setup lang="ts">
import { ref } from "vue";

interface Props {
  title: string;
  open?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
});

const isOpen = ref(props.open);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toggle() {
  isOpen.value = !isOpen.value;
}

// Reference to satisfy static analysis (used in template)
void toggle;
</script>

<template>
  <details :open="isOpen" class="details">
    <summary class="details__summary" @click.prevent="toggle">
      {{ title }}
    </summary>
    <div v-if="isOpen" class="details__body">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.details {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.details__summary {
  cursor: pointer;
  padding: var(--space-lg);
  font-weight: 600;
  font-size: var(--text-base);
  color: var(--text-primary);
  list-style: none;
  user-select: none;
  position: relative;
  transition: background 0.2s ease;
}

.details__summary:hover {
  background: rgba(var(--fg0-rgb), 0.03);
}

.details__summary::-webkit-details-marker {
  display: none;
}

.details__summary::after {
  content: '▾';
  position: absolute;
  right: var(--space-lg);
  transition: transform 0.2s ease;
}

details[open] > .details__summary::after {
  content: '▴';
}

.details__body {
  padding: 0 var(--space-lg) var(--space-lg);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
