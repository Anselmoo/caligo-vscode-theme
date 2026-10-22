<script setup lang="ts">
import { computed } from "vue";
import ColourTable from "../components/analysis/ColourTable.vue";
import ContrastLadder from "../components/analysis/ContrastLadder.vue";
import {
  AA_LARGE,
  AA_TEXT,
  colourRows,
  contrastLadder,
  minLightnessFor,
  opacityPercent,
} from "../components/analysis/colour-report.js";
import HueWheel from "../components/analysis/HueWheel.vue";
import LightnessChart from "../components/analysis/LightnessChart.vue";
import { useTheme } from "../composables/useTheme.js";

const { currentTheme } = useTheme();

const themeName = computed(() => currentTheme.value?.displayName ?? "");
const rows = computed(() => colourRows(currentTheme.value));
const inks = computed(() => rows.value.filter(r => r.kind === "ink"));

/** Lightness at which a neutral grey reaches 4.5:1 over this theme's background. */
const threshold = computed(() => {
  const bg0 = currentTheme.value?.colors.bg0;
  return bg0 ? minLightnessFor(bg0) : null;
});

/** Inks that cannot carry small text, with the ratio they actually render at. */
const weakInks = computed(() =>
  inks.value
    .filter(r => r.contrast !== null && r.contrast < AA_TEXT)
    .map(r => ({ key: r.key, label: r.label, ratio: (r.contrast ?? 0).toFixed(1) }))
);

const ladder = computed(() => contrastLadder(rows.value));
const ladderSummary = computed(() => {
  const all = ladder.value;
  if (all.length === 0) return null;
  const weakest = all[all.length - 1];
  return {
    total: all.length,
    aa: all.filter(r => r.passesAA).length,
    large: all.filter(r => r.passesLarge).length,
    weakest: { label: weakest.label.toLowerCase(), ratio: weakest.ratio.toFixed(1) },
  };
});

const translucentInks = computed(() =>
  inks.value
    .map(r => ({ label: r.label, percent: opacityPercent(r.alpha) }))
    .filter(r => r.percent !== null)
);

const references = [
  {
    title: "Oklab, a perceptual colour space",
    note: "Björn Ottosson's original write-up of Oklab.",
    url: "https://bottosson.github.io/posts/oklab/",
  },
  {
    title: "CSS Color Module Level 4",
    note: "The W3C specification that defines oklch() and colour interpolation.",
    url: "https://www.w3.org/TR/css-color-4/",
  },
  {
    title: "WCAG 2.1 non-text contrast",
    note: "The accessibility guideline behind the 4.5:1 and 3:1 thresholds.",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html",
  },
  {
    title: "OKLCH colour picker",
    note: "Evil Martians' tool for exploring the space.",
    url: "https://github.com/evilmartians/oklch-picker",
  },
  {
    title: "Pro Color Harmonies",
    note: "OKLCH-based colour harmony generation.",
    url: "https://github.com/meodai/pro-color-harmonies",
  },
];

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
</script>

<template>
  <div class="science">
    <header class="science__head">
      <h1 class="science__title">Colour science</h1>
      <p class="science__lede">
        Measurements for <strong data-science-theme>{{ themeName || "the current theme" }}</strong
        >. Pick another theme from the nav and every figure on this page follows.
      </p>
    </header>

    <template v-if="currentTheme">
      <section class="view" data-science-view="lightness" aria-labelledby="lightness-title">
        <div class="view__head">
          <h2 id="lightness-title" class="view__title">Lightness decides legibility</h2>
          <p v-if="threshold !== null" class="figure">
            <span class="figure__value">{{ threshold.toFixed(2) }}</span>
            <span class="figure__caption">
              the lightness a neutral grey needs to reach {{ AA_TEXT }}:1 over this background
            </span>
          </p>
        </div>
        <div class="view__chart">
          <LightnessChart :rows="rows" :threshold="threshold" :theme-name="themeName" />
        </div>
        <div class="view__body">
          <p class="prose">
            Contrast is measured against the primary background. Inks above the dashed line can
            carry small text; inks below it are better kept for larger marks.
          </p>
          <p v-if="weakInks.length > 0" class="prose">
            Below {{ AA_TEXT }}:1 here:
            <template v-for="(ink, i) in weakInks" :key="ink.key"
              >{{ i > 0 ? ", " : "" }}{{ ink.label.toLowerCase() }} at {{ ink.ratio }}:1</template
            >.
          </p>
          <p v-else class="prose">Every ink in this theme reaches {{ AA_TEXT }}:1 for small text.</p>
          <p v-for="ink in translucentInks" :key="ink.label" class="prose">
            {{ ink.label }} is {{ ink.percent }}% opaque, so its ratio is measured after blending
            it over the background, not from the solid hex.
          </p>
        </div>
      </section>

      <section class="view" data-science-view="oklch" aria-labelledby="oklch-title">
        <div class="view__head">
          <h2 id="oklch-title" class="view__title">Hue and chroma</h2>
          <p class="prose">
            OKLCH describes a colour by lightness (L, 0 to 1), chroma (C, how vivid) and hue (h, in
            degrees). Equal steps in L look equally different, which is why Caligo sets its themes
            in it. These values are computed from each colour's hex.
          </p>
        </div>
        <div class="view__chart">
          <HueWheel :rows="rows" :theme-name="themeName" />
        </div>
        <div class="view__body">
          <ColourTable :rows="rows" :theme-name="themeName" />
        </div>
      </section>

      <section
        v-if="ladderSummary"
        class="view view--flip"
        data-science-view="contrast"
        aria-labelledby="contrast-title"
      >
        <div class="view__head">
          <h2 id="contrast-title" class="view__title">How far each ink clears the bar</h2>
          <p class="prose">
            WCAG asks for {{ AA_TEXT }}:1 for small text and {{ AA_LARGE }}:1 for large text and
            interface marks. Each bar is one ink's ratio over the primary background.
          </p>
        </div>
        <div class="view__chart">
          <ContrastLadder :rows="rows" :theme-name="themeName" />
        </div>
        <div class="view__body">
          <p class="prose" data-contrast-summary>
            {{ ladderSummary.aa }} of {{ ladderSummary.total }} inks reach {{ AA_TEXT }}:1 and
            {{ ladderSummary.large }} reach {{ AA_LARGE }}:1. The faintest is
            {{ ladderSummary.weakest.label }} at {{ ladderSummary.weakest.ratio }}:1.
          </p>
        </div>
      </section>
    </template>
    <p v-else class="science__loading">Loading measurements.</p>

    <section class="reading" aria-labelledby="reading-title">
      <h2 id="reading-title" class="view__title">Further reading</h2>
      <ul class="reading__list">
        <li v-for="item in references" :key="item.url">
          <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.title }}</a>
          <span class="reading__note">{{ item.note }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.science {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(40px, 8vh, 96px) var(--gutter) clamp(56px, 10vh, 120px);
}

.science__head {
  margin-bottom: clamp(40px, 7vh, 80px);
}

.science__title {
  margin: 0 0 18px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.25rem + 2.3vw, 3.3rem);
  font-weight: 340;
  font-stretch: 106%;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.science__lede {
  max-width: var(--measure);
  margin: 0;
  color: var(--fg1);
  font-size: var(--step-1);
  line-height: 1.55;
  text-wrap: pretty;
}

.science__lede strong {
  color: var(--fg0);
  font-weight: 600;
}

.science__loading {
  color: var(--fg-muted);
}

.view {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  grid-template-areas:
    "chart head"
    "chart body";
  grid-template-rows: auto 1fr;
  column-gap: clamp(28px, 5vw, 80px);
  align-items: start;
  padding: clamp(32px, 6vh, 64px) 0;
  border-top: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
}

.view__title {
  margin: 0 0 16px;
  color: var(--fg0);
  font-family: var(--font-sans);
  font-size: var(--step-2);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
}

.view__head {
  grid-area: head;
  min-width: 0;
}

.view__chart {
  grid-area: chart;
  min-width: 0;
}

.view__body {
  grid-area: body;
  min-width: 0;
}

.prose {
  max-width: var(--measure);
  margin: 0 0 14px;
  color: var(--fg1);
  font-size: var(--step-0);
  line-height: 1.6;
  text-wrap: pretty;
}

.figure {
  display: flex;
  align-items: baseline;
  gap: 18px;
  margin: 0 0 22px;
}

.figure__value {
  flex: none;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: var(--step-4);
  font-weight: 300;
  font-stretch: 112.5%;
  line-height: 1;
  letter-spacing: -0.03em;
}

.figure__caption {
  max-width: 28ch;
  color: var(--fg-muted);
  font-size: var(--step--1);
  line-height: 1.45;
}

.reading {
  padding-top: clamp(32px, 6vh, 64px);
  border-top: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
}

.reading__list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.reading__list a {
  color: var(--fg0);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.reading__note {
  display: block;
  color: var(--fg-muted);
  font-size: var(--step--1);
}

.view--flip {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  grid-template-areas:
    "head chart"
    "body chart";
}

@media (max-width: 960px) {
  .view,
  .view--flip {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "head"
      "chart"
      "body";
    grid-template-rows: none;
    row-gap: 20px;
  }
}
</style>
