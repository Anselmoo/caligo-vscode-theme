<script setup lang="ts">
/**
 * The selected variant: a live editor mock-up drawn from its colours (instant, and it
 * relights with every pick), a line on what it is, and the core palette with exact
 * values. A real VS Code screenshot is offered as a link only when CI generated one.
 */
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { ThemeIndexEntry } from "../../types/theme.js";
import { renderedContrast } from "../analysis/colour-report.js";
import VSCodeMock from "../theme/VSCodeMock.vue";

const props = defineProps<{
  theme: ThemeIndexEntry;
  /** Resolved URL of this variant's VS Code screenshot, or null when none exists. */
  screenshot: string | null;
}>();


const textContrast = computed(() => {
  const { fg0, bg0 } = props.theme.colors;
  return renderedContrast(fg0, bg0).toFixed(1);
});


</script>

<template>
  <section class="detail" data-selected-variant aria-labelledby="variant-title">
    <VSCodeMock class="detail__mock" />

    <h2 id="variant-title" class="detail__title">{{ theme.displayName }}</h2>
    <p class="detail__lede">
      {{ theme.seedLabel }} palette in {{ theme.harmonyLabel }} mode. Body text reaches
      {{ textContrast }}:1 contrast on the background.
    </p>

    <ul class="palette" aria-label="Core colours">
      <li v-for="color in theme.core" :key="color.key" class="palette__item">
        <span class="palette__chip" :style="{ backgroundColor: color.hex }" aria-hidden="true" />
        <span class="palette__name">{{ color.label }}</span>
        <code class="palette__hex">{{ color.hex }}</code>
      </li>
    </ul>

    <p class="detail__links">
      <a v-if="screenshot" :href="screenshot" target="_blank" rel="noopener">
        Open a real VS Code screenshot
      </a>
      <RouterLink to="/science">See how the colours are measured</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.detail {
  min-width: 0;
}

.detail__mock {
  margin: 0 0 22px;
}

.detail__title {
  margin: 0 0 6px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: var(--step-1);
  font-weight: 400;
  font-stretch: 106%;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.detail__lede {
  max-width: 44ch;
  margin: 0 0 20px;
  color: var(--fg1);
  line-height: 1.55;
}

.palette {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 20px;
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
}

.palette__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    "chip name"
    "chip hex";
  column-gap: 10px;
  align-items: center;
  min-width: 0;
}

.palette__chip {
  grid-area: chip;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--fg0) 20%, transparent);
}

.palette__name {
  grid-area: name;
  overflow: hidden;
  color: var(--fg1);
  font-size: var(--step--1);
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette__hex {
  grid-area: hex;
  padding: 0;
  background: none;
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
}

.detail__links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin: 0;
  font-size: var(--step--1);
}

.detail__links a {
  color: var(--fg0);
  text-underline-offset: 3px;
}

.detail__links a:focus-visible {
  outline: 2px solid var(--fg0);
  outline-offset: 3px;
  border-radius: 2px;
}

@media (max-width: 420px) {
  .palette {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
