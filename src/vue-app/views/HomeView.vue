<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { renderedContrast } from "../components/analysis/colour-report.js";
import EditorPreview from "../components/home/EditorPreview.vue";
import SceneBackdrop from "../components/home/SceneBackdrop.vue";
import ThemeHorizon from "../components/home/ThemeHorizon.vue";
import { useTheme } from "../composables/useTheme.js";

const { themes, harmonies, currentTheme, setTheme } = useTheme();

const MARKETPLACE_URL =
  "https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme";

const textContrast = computed(() => {
  const c = currentTheme.value?.colors;
  return c ? renderedContrast(c.fg0, c.bg0).toFixed(1) : "–";
});

/** The current seed in all five harmony modes, as clickable mini palettes. */
const modes = computed(() => {
  const seed = currentTheme.value?.seedId;
  return harmonies.value
    .map(h => themes.value.find(t => t.seedId === seed && t.harmonyId === h.id))
    .filter(t => t !== undefined)
    .map(t => ({
      key: t.key,
      label: t.harmonyLabel,
      current: t.key === currentTheme.value?.key,
      inks: [
        t.colors.keywords,
        t.colors.types,
        t.colors.functions,
        t.colors.strings,
        t.colors.decorator,
      ],
      bg: t.colors.bg0,
    }));
});

const bgOklch = computed(() => {
  const bg = currentTheme.value?.oklch.bg;
  if (!bg) return null;
  return { l: bg.l.toFixed(2), c: bg.c.toFixed(3), h: Math.round(bg.h) };
});

void MARKETPLACE_URL;
void textContrast;
void modes;
void bgOklch;
void setTheme;
void RouterLink;
void EditorPreview;
void SceneBackdrop;
void ThemeHorizon;
</script>

<template>
  <div class="home">
    <section class="hero" aria-labelledby="hero-title">
      <SceneBackdrop />
      <div class="hero__inner">
        <div class="hero__copy">
          <h1 id="hero-title" class="hero__title">Dark themes for long nights of code.</h1>
          <p class="hero__lede">
            Fifty VS Code themes built in a perceptual colour space, so text stays readable and
            every hue stays distinct after hours at the screen.
          </p>
          <div class="hero__actions">
            <a class="btn-primary" :href="MARKETPLACE_URL" rel="noopener" target="_blank">
              Install from Marketplace
            </a>
            <RouterLink class="btn-quiet" to="/themes">Browse all themes</RouterLink>
          </div>
        </div>
        <EditorPreview class="hero__editor" />
        <ThemeHorizon class="hero__horizon" />
      </div>
    </section>

    <section class="facts" aria-label="What makes Caligo different">
      <div class="facts__inner">
        <article class="fact">
          <p class="fact__figure">{{ textContrast }}<span class="fact__unit">:1</span></p>
          <h2 class="fact__title">Readable for hours</h2>
          <p class="fact__body">
            Body text contrast in {{ currentTheme?.displayName ?? "this theme" }}. WCAG asks for
            4.5:1 for small text; Caligo measures every theme against it.
          </p>
        </article>

        <article class="fact">
          <div class="fact__modes" role="group" aria-label="Harmony modes of this theme">
            <button
              v-for="mode in modes"
              :key="mode.key"
              type="button"
              class="mode-swatch"
              :class="{ 'is-current': mode.current }"
              :aria-pressed="mode.current"
              :aria-label="`${mode.label} mode`"
              :style="{ background: mode.bg }"
              @click="setTheme(mode.key)"
            >
              <span v-for="(ink, i) in mode.inks" :key="i" :style="{ background: ink }" />
            </button>
          </div>
          <h2 class="fact__title">One palette, five moods</h2>
          <p class="fact__body">
            Each theme comes in balanced, analogous, monochromatic, split-complementary and
            triadic harmony. Pick the one that suits the hour.
          </p>
        </article>

        <article class="fact">
          <p v-if="bgOklch" class="fact__figure fact__figure--small">
            L {{ bgOklch.l }}<br />C {{ bgOklch.c }}<br />h {{ bgOklch.h }}°
          </p>
          <h2 class="fact__title">Placed in OKLCH</h2>
          <p class="fact__body">
            Colours are chosen in a space where equal steps look equal, then checked by
            measurement rather than by eye.
            <RouterLink to="/science">See the measurements</RouterLink>
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: min(calc(100svh - 56px), 900px);
  display: flex;
  isolation: isolate;
}

.hero__inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  grid-template-rows: 1fr auto;
  gap: clamp(28px, 4vw, 64px);
  width: 100%;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(48px, 9vh, 112px) var(--gutter) clamp(28px, 6vh, 56px);
}

.hero__copy {
  align-self: center;
  max-width: 38rem;
}

.hero__title {
  margin: 0 0 22px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.25rem + 2.3vw, 3.3rem);
  font-weight: 340;
  font-stretch: 106%;
  line-height: 1.1;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.hero__lede {
  max-width: var(--measure);
  margin: 0 0 32px;
  color: var(--fg1);
  font-size: var(--step-1);
  line-height: 1.55;
  text-wrap: pretty;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.btn-primary,
.btn-quiet {
  display: inline-flex;
  align-items: center;
  height: 44px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: var(--step-0);
  text-decoration: none;
}

.btn-primary {
  background: var(--accent);
  color: oklch(from var(--accent) 0.18 calc(c * 0.4) h);
}

.btn-primary:hover {
  background: oklch(from var(--accent) calc(l + 0.06) c h);
}

.btn-quiet {
  color: var(--fg0);
  border: 1px solid color-mix(in oklab, var(--fg0) 20%, transparent);
  background: color-mix(in oklab, var(--bg0) 40%, transparent);
  backdrop-filter: blur(8px);
}

.btn-quiet:hover {
  border-color: color-mix(in oklab, var(--fg0) 40%, transparent);
}

.hero__editor {
  align-self: center;
}

.hero__horizon {
  grid-column: 1 / -1;
}

/* Facts: three measured statements, set as a quiet row rather than cards. */
.facts__inner {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(28px, 5vw, 72px);
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(56px, 10vh, 120px) var(--gutter);
}

.fact {
  display: flex;
  flex-direction: column;
}

.fact__figure {
  min-height: 3.6rem;
  margin: 0 0 18px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: var(--step-3);
  font-weight: 300;
  font-stretch: 112.5%;
  line-height: 1;
  letter-spacing: -0.03em;
}

.fact__figure--small {
  font-size: var(--step-0);
  font-stretch: 100%;
  line-height: 1.35;
  letter-spacing: 0;
  color: var(--fg1);
}

.fact__unit {
  color: var(--fg-muted);
}

.fact__title {
  margin: 0 0 8px;
  color: var(--fg0);
  font-family: var(--font-sans);
  font-size: var(--step-1);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.fact__body {
  max-width: 36ch;
  margin: 0;
  color: var(--fg-muted);
  line-height: 1.6;
}

.fact__body a {
  color: var(--fg0);
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--fg0) 45%, transparent);
  text-underline-offset: 3px;
}

.fact__body a:hover {
  text-decoration-color: var(--fg0);
}

.fact__modes {
  display: flex;
  gap: 8px;
  min-height: 3.6rem;
  margin-bottom: 18px;
  align-items: flex-start;
}

.mode-swatch {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 30px;
  padding: 6px;
  border: 1px solid color-mix(in oklab, var(--fg0) 14%, transparent);
  border-radius: 8px;
  cursor: pointer;
}

.mode-swatch span {
  height: 5px;
  border-radius: 2px;
}

.mode-swatch.is-current {
  border-color: var(--fg0);
}

@media (max-width: 960px) {
  .hero__inner {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
  }

  .hero__copy {
    max-width: none;
  }

  .facts__inner {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
