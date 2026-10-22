<script setup lang="ts">
/**
 * "Why it reads": four measured statements as a bento. Every number is the selected
 * theme's own (contrast, OKLCH) or the manifest's (palette and mood counts), and every
 * colour is a token or a theme colour, so the grid re-tints with the theme.
 */
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTheme } from "../../composables/useTheme.js";
import { renderedContrast } from "../analysis/colour-report.js";

const { themes, seeds, harmonies, currentTheme } = useTheme();

/** The scale's ceiling; WCAG ratios run from 1 to 21. */
const SCALE_MAX = 21;
const AA = 4.5;
const AAA = 7;

const contrast = computed(() => {
  const c = currentTheme.value?.colors;
  return c ? renderedContrast(c.fg0, c.bg0) : null;
});

/** Contrast of each ink role against the page background. */
const inks = computed(() => {
  const c = currentTheme.value?.colors;
  if (!c) return [];
  return [
    { label: "Primary text", color: c.fg0 },
    { label: "Secondary text", color: c.fg1 },
    { label: "Muted text", color: c.fgMuted },
    { label: "Accent", color: c.accent },
  ].map(ink => {
    const ratio = renderedContrast(ink.color, c.bg0);
    return { ...ink, ratio: ratio.toFixed(1), pct: `${Math.min(100, (ratio / SCALE_MAX) * 100)}%` };
  });
});

const contrastText = computed(() => (contrast.value ? contrast.value.toFixed(1) : "–"));
const meterStyle = computed(() => ({
  "--fill": `${Math.min(100, ((contrast.value ?? 0) / SCALE_MAX) * 100)}%`,
  "--aa": `${(AA / SCALE_MAX) * 100}%`,
  "--aaa": `${(AAA / SCALE_MAX) * 100}%`,
}));

const oklch = computed(() => {
  const bg = currentTheme.value?.oklch.bg;
  if (!bg) return null;
  return {
    l: bg.l,
    c: bg.c,
    h: bg.h,
    lPct: `${bg.l * 100}%`,
    cPct: `${Math.min(100, (bg.c / 0.4) * 100)}%`,
    hDeg: `${bg.h}deg`,
  };
});

/** The current palette lit in each of the five moods. */
const moods = computed(() => {
  const seedId = currentTheme.value?.seedId;
  if (!seedId) return [];
  return harmonies.value
    .map(h => themes.value.find(t => t.seedId === seedId && t.harmonyId === h.id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
});

/** All 10 × 5 variants as a dot matrix; the selected one is ringed. */
const matrix = computed(() =>
  harmonies.value.flatMap(h =>
    seeds.value.map(s => {
      const t = themes.value.find(x => x.seedId === s.id && x.harmonyId === h.id);
      return { key: `${s.id}-${h.id}`, accent: t?.colors.accent, current: t?.key === currentTheme.value?.key };
    })
  )
);
</script>

<template>
  <section class="bento" aria-labelledby="bento-title">
    <header class="bento__head">
      <p class="bento__eyebrow">Measured, not guessed</p>
      <h2 id="bento-title" class="bento__title">Why it reads</h2>
    </header>

    <div class="bento__grid">
      <article class="tile tile--contrast">
        <h3 class="tile__title">Readable for hours</h3>
        <p class="tile__figure">{{ contrastText }}<span class="tile__unit">:1</span></p>
        <div class="meter" :style="meterStyle" role="img" :aria-label="`Body text contrast ${contrastText} to 1; WCAG asks for 4.5 to 1`">
          <span class="meter__fill" />
          <span class="meter__mark meter__mark--aa"><span>AA 4.5</span></span>
          <span class="meter__mark meter__mark--aaa"><span>AAA 7</span></span>
        </div>
        <ul class="inks">
          <li v-for="ink in inks" :key="ink.label" class="ink" :style="{ '--w': ink.pct, '--ink': ink.color }">
            <span class="ink__label">{{ ink.label }}</span>
            <span class="ink__bar" aria-hidden="true" />
            <span class="ink__value">{{ ink.ratio }}</span>
          </li>
        </ul>
        <p class="tile__body">
          Body text contrast in {{ currentTheme?.displayName ?? "this theme" }}. WCAG asks for
          4.5:1 for small text; Caligo measures every theme against it.
        </p>
      </article>

      <article class="tile tile--moods">
        <h3 class="tile__title">One palette, five moods</h3>
        <ul class="moods">
          <li v-for="t in moods" :key="t.key" class="mood" :class="{ 'is-current': t.key === currentTheme?.key }">
            <span class="mood__name">{{ t.harmonyLabel }}</span>
            <span class="mood__chips" aria-hidden="true">
              <i :style="{ background: t.colors.bg1 }" />
              <i :style="{ background: t.colors.accent }" />
              <i :style="{ background: t.colors.keywords }" />
              <i :style="{ background: t.colors.types }" />
              <i :style="{ background: t.colors.functions }" />
              <i :style="{ background: t.colors.decorator }" />
            </span>
          </li>
        </ul>
        <p class="tile__body">
          Each theme comes in balanced, analogous, monochromatic, split-complementary and triadic
          harmony. Pick the one that suits the hour.
        </p>
      </article>

      <article class="tile tile--oklch">
        <h3 class="tile__title">Placed in OKLCH</h3>
        <ul v-if="oklch" class="axes">
          <li class="axis" :style="{ '--v': oklch.lPct }">
            <span class="axis__name">L</span>
            <span class="axis__val">{{ oklch.l.toFixed(2) }}</span>
            <span class="axis__track"><span class="axis__dot" /></span>
          </li>
          <li class="axis" :style="{ '--v': oklch.cPct }">
            <span class="axis__name">C</span>
            <span class="axis__val">{{ oklch.c.toFixed(3) }}</span>
            <span class="axis__track"><span class="axis__dot" /></span>
          </li>
          <li class="axis axis--hue" :style="{ '--v': `${(oklch.h / 360) * 100}%` }">
            <span class="axis__name">h</span>
            <span class="axis__val">{{ Math.round(oklch.h) }}°</span>
            <span class="axis__track"><span class="axis__dot" /></span>
          </li>
        </ul>
        <p class="tile__body">
          Colours are chosen in a space where equal steps look equal, then checked by measurement
          rather than by eye.
          <RouterLink to="/science">See the measurements</RouterLink>
        </p>
      </article>

      <article class="tile tile--family">
        <h3 class="tile__title">
          {{ seeds.length }}<span class="tile__unit">×</span>{{ harmonies.length }}: one family, {{ themes.length }} nights
        </h3>
        <div class="matrix" :style="{ '--cols': seeds.length }" aria-hidden="true">
          <i v-for="d in matrix" :key="d.key" :class="{ 'is-current': d.current }" :style="{ background: d.accent }" />
        </div>
        <p class="tile__body">
          Same ink roles everywhere, so switching never means relearning where to look.
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.bento {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(64px, 11vh, 128px) var(--gutter) 0;
}

.bento__head {
  margin-bottom: clamp(24px, 4vw, 44px);
}

.bento__eyebrow {
  margin: 0 0 10px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.bento__title {
  margin: 0;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: var(--step-4);
  font-weight: 320;
  font-stretch: 108%;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.bento__grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: clamp(12px, 1.6vw, 20px);
}

.tile {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(20px, 2.4vw, 32px);
  border: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
  border-radius: 20px;
  background:
    radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 60%),
    var(--bg1);
  transition:
    border-color 260ms var(--ease-out),
    translate 260ms var(--ease-out);
}

.tile:hover {
  border-color: color-mix(in oklab, var(--accent) 38%, transparent);
  translate: 0 -3px;
}

.tile--contrast {
  grid-column: span 3;
}

.tile--moods {
  grid-column: span 3;
}

.tile--oklch,
.tile--family {
  grid-column: span 3;
}

.tile__title {
  margin: 0;
  color: var(--fg0);
  font-family: var(--font-sans);
  font-size: var(--step-1);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.tile__figure {
  margin: 0;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: clamp(3rem, 2rem + 5cqi, 5.5rem);
  font-weight: 280;
  font-stretch: 112.5%;
  line-height: 1;
  letter-spacing: -0.05em;
}

.tile__unit {
  color: var(--fg-muted);
}

.tile__body {
  max-width: 42ch;
  margin: auto 0 0;
  color: var(--fg-muted);
  line-height: 1.6;
}

.tile__body a {
  color: var(--fg0);
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--fg0) 45%, transparent);
  text-underline-offset: 3px;
}

/* Contrast meter: a 1 to 21 rule with AA and AAA ticks; the fill grows into view. */
.meter {
  position: relative;
  height: 10px;
  margin: 10px 0 30px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--fg0) 10%, transparent);
}

.meter__fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--fill);
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in oklab, var(--accent) 60%, var(--bg1)), var(--accent));
  transform-origin: left;
}

.meter__mark {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 2px;
  background: color-mix(in oklab, var(--fg0) 40%, transparent);
}

.meter__mark span {
  position: absolute;
  top: calc(100% + 6px);
  translate: -50% 0;
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  white-space: nowrap;
}

.meter__mark--aa {
  left: var(--aa);
}

.meter__mark--aaa {
  left: var(--aaa);
}

/* Ink roles: each role's contrast against the page, as a bar in its own colour. */
.inks {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ink {
  display: grid;
  grid-template-columns: minmax(6.5rem, 9rem) 1fr 2.6rem;
  align-items: center;
  gap: 12px;
  color: var(--fg1);
  font-size: var(--step--1);
}

.ink__bar {
  height: 6px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--ink) var(--w), color-mix(in oklab, var(--fg0) 10%, transparent) var(--w));
}

.ink__value {
  color: var(--fg0);
  font-family: var(--font-mono);
  text-align: right;
}

/* Moods: five rows, one per harmony, each a strip of that mood's own ink. */
.moods {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mood {
  display: grid;
  grid-template-columns: minmax(7.5rem, 11rem) 1fr;
  align-items: center;
  gap: 14px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: var(--fg1);
  font-size: var(--step--1);
}

.mood.is-current {
  border-color: color-mix(in oklab, var(--accent) 50%, transparent);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  color: var(--fg0);
}

.mood__chips {
  display: flex;
  gap: 4px;
}

.mood__chips i {
  flex: 1;
  height: 18px;
  border-radius: 6px;
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--fg0) 14%, transparent);
}

/* OKLCH: three axes, each a rule with a dot at the theme's own value. */
.axes {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.axis {
  display: grid;
  grid-template-columns: 1.4rem 4.5rem 1fr;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
}

.axis__name {
  color: var(--fg-muted);
}

.axis__val {
  margin: 0;
  color: var(--fg0);
}

.axis__track {
  position: relative;
  height: 4px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--fg0) 14%, transparent);
}

/* A theme-independent hue scale (0 to 360 degrees at fixed lightness and chroma); the dot
   shows where this theme sits on it. Not a theme colour, so it is not a token. */
.axis--hue .axis__track {
  background: linear-gradient(
    90deg,
    oklch(0.72 0.12 0),
    oklch(0.72 0.12 90),
    oklch(0.72 0.12 180),
    oklch(0.72 0.12 270),
    oklch(0.72 0.12 360)
  );
}

.axis__dot {
  position: absolute;
  top: 50%;
  left: var(--v);
  width: 14px;
  height: 14px;
  border: 2px solid var(--bg1);
  border-radius: var(--radius-full);
  background: var(--accent);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--fg0) 40%, transparent);
  translate: -50% -50%;
}

/* Family: the 10 × 5 grid as dots in each variant's accent. */
.matrix {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: clamp(4px, 1.4cqi, 10px);
}

.matrix i {
  aspect-ratio: 1;
  border-radius: var(--radius-full);
  opacity: 0.8;
}

.matrix i.is-current {
  opacity: 1;
  outline: 2px solid var(--fg0);
  outline-offset: 2px;
}

/* Meter fill and dots grow in as the tile scrolls into view (where supported). */
@supports (animation-timeline: view()) {
  .meter__fill {
    animation: grow linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 40%;
  }

  .matrix i {
    animation: pop linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 35%;
  }
}

@keyframes grow {
  from {
    transform: scaleX(0);
  }
}

@keyframes pop {
  from {
    scale: 0.2;
    opacity: 0;
  }
}

@media (max-width: 960px) {
  .tile--contrast,
  .tile--moods,
  .tile--oklch,
  .tile--family {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .mood {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile {
    transition: none;
  }

  .tile:hover {
    translate: none;
  }

  .meter__fill,
  .matrix i {
    animation: none;
  }
}
</style>
