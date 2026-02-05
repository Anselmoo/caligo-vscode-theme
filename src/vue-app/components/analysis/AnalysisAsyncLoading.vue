<template>
  <div class="analysis-async-state analysis-async-loading">
    <p class="title">Loading visualization…</p>
    <p class="subtitle">If this takes more than a couple seconds, check the browser console.</p>
  </div>
</template>

<style scoped>
.analysis-async-state {
  padding: var(--space-lg);
  border: 1px solid rgba(var(--fg0-rgb), 0.12);
  border-radius: var(--radius-md);
  background: rgba(var(--bg2-rgb), 0.25);
}

.title {
  margin: 0 0 var(--space-sm);
  color: var(--fg0);
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: var(--fg-muted);
  line-height: 1.5;
}
</style>
