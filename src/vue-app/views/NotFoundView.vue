<script setup lang="ts">
import { RouterLink } from "vue-router";

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
void RouterLink;
</script>

<template>
  <div class="not-found-view">
    <div class="container">
      <div class="error-content">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Page Not Found</h2>
        <p class="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div class="error-actions">
          <RouterLink to="/" class="btn btn-primary">
            Go Home
          </RouterLink>
          <RouterLink to="/gallery" class="btn btn-secondary">
            Browse Gallery
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-view {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl) 0;
}

.error-content {
  text-align: center;
  max-width: 600px;
}

.error-code {
  font-size: 120px;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, var(--error), var(--syntax-decorator));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-md);
}

.error-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--space-md);
}

.error-message {
  font-size: var(--text-lg);
  color: var(--text-subtle);
  margin-bottom: var(--space-2xl);
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--accent);
  color: var(--bg0);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(var(--bg0-rgb), 0.55);
}

.btn-secondary {
  background: var(--bg2);
  color: var(--syntax-types);
  border: 1px solid var(--border-base);
}

.btn-secondary:hover {
  background: var(--surface-elevated);
  border-color: var(--accent);
}
</style>
