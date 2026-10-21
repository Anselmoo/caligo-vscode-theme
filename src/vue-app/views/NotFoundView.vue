<script setup lang="ts">
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();

</script>

<template>
  <div class="not-found">
    <h1 class="not-found__title">Page not found</h1>
    <p class="not-found__text">
      Nothing lives at <code class="not-found__path">{{ route.fullPath }}</code
      >. The link may be mistyped, or the page may have moved.
    </p>
    <p class="not-found__actions">
      <RouterLink class="not-found__home" to="/">Back to home</RouterLink>
      <RouterLink class="not-found__link" to="/themes">Browse themes</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.not-found {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(56px, 14vh, 160px) var(--gutter);
}

.not-found__title {
  margin: 0 0 18px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.25rem + 2.3vw, 3.3rem);
  font-weight: 340;
  font-stretch: 106%;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.not-found__text {
  max-width: var(--measure);
  margin: 0 0 28px;
  color: var(--fg1);
  font-size: var(--step-1);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.not-found__path {
  padding: 0;
  background: none;
  color: var(--fg0);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.not-found__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  margin: 0;
}

.not-found__home {
  display: inline-flex;
  align-items: center;
  height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  background: var(--accent);
  color: oklch(from var(--accent) 0.18 calc(c * 0.4) h);
  font-size: var(--step-0);
  font-weight: 600;
  text-decoration: none;
}

.not-found__home:hover {
  background: oklch(from var(--accent) calc(l + 0.06) c h);
}

.not-found__link {
  color: var(--fg0);
  font-size: var(--step-0);
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
