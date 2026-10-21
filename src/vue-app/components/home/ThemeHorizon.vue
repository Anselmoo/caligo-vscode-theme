<script setup lang="ts">
/**
 * Theme picker that sits on the hero's horizon: ten themes, five harmony modes.
 * Both rows are native radio groups, so arrow keys, Tab and screen readers behave
 * as they do in any form; the visuals are just styled labels.
 */
import { computed } from "vue";
import { useTheme } from "../../composables/useTheme.js";

const { themes, seeds, harmonies, currentTheme, setTheme } = useTheme();

const seedId = computed(() => currentTheme.value?.seedId ?? "");
const harmonyId = computed(() => currentTheme.value?.harmonyId ?? "balanced");

function themeFor(seed: string, harmony: string) {
  return themes.value.find(t => t.seedId === seed && t.harmonyId === harmony);
}

/** Each seed's dot shows that seed in the currently chosen mode. */
const seedDots = computed(() =>
  seeds.value.map(seed => {
    const theme = themeFor(seed.id, harmonyId.value) ?? themeFor(seed.id, "balanced");
    return {
      id: seed.id,
      label: seed.label,
      bg: theme?.colors.bg0,
      glow: theme?.colors.accent,
      ink: theme?.colors.keywords,
    };
  })
);

const shortMode: Record<string, string> = {
  "split-complementary": "Split",
  monochromatic: "Mono",
};

function pickSeed(id: string) {
  const theme = themeFor(id, harmonyId.value) ?? themeFor(id, "balanced");
  if (theme) setTheme(theme.key);
}

function pickHarmony(id: string) {
  const theme = themeFor(seedId.value, id);
  if (theme) setTheme(theme.key);
}

void harmonies;
void seedDots;
void shortMode;
void pickSeed;
void pickHarmony;
</script>

<template>
  <div class="horizon">
    <fieldset class="horizon__seeds">
      <legend class="visually-hidden">Theme</legend>
      <label
        v-for="dot in seedDots"
        :key="dot.id"
        class="seed"
        :class="{ 'is-current': dot.id === seedId }"
        :title="dot.label"
      >
        <input
          class="visually-hidden"
          type="radio"
          name="caligo-seed"
          :value="dot.id"
          :checked="dot.id === seedId"
          @change="pickSeed(dot.id)"
        />
        <span
          class="seed__dot"
          aria-hidden="true"
          :style="{ '--dot-bg': dot.bg, '--dot-glow': dot.glow, '--dot-ink': dot.ink }"
        />
        <span class="seed__label">{{ dot.label }}</span>
      </label>
    </fieldset>

    <fieldset class="horizon__modes">
      <legend class="visually-hidden">Harmony mode</legend>
      <label
        v-for="harmony in harmonies"
        :key="harmony.id"
        class="mode"
        :class="{ 'is-current': harmony.id === harmonyId }"
      >
        <input
          class="visually-hidden"
          type="radio"
          name="caligo-harmony"
          :value="harmony.id"
          :checked="harmony.id === harmonyId"
          @change="pickHarmony(harmony.id)"
        />
        <span class="mode__long">{{ harmony.label }}</span>
        <span class="mode__short" aria-hidden="true">{{ shortMode[harmony.id] ?? harmony.label }}</span>
      </label>
    </fieldset>
  </div>
</template>

<style scoped>
.horizon {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 18px 32px;
}

fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.horizon__seeds {
  display: flex;
  gap: 6px;
}

.seed {
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
}

/* Each dot is a tiny moon of that theme: its background lit by its accent. */
.seed__dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 30%, var(--dot-glow) 0, transparent 62%),
    radial-gradient(circle at 70% 78%, var(--dot-ink) 0, transparent 55%),
    var(--dot-bg);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--fg0) 18%, transparent);
  transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.seed:hover .seed__dot {
  transform: scale(1.12);
}

.seed.is-current .seed__dot {
  box-shadow:
    0 0 0 2px var(--bg0),
    0 0 0 3.5px var(--fg0);
}

.seed:has(:focus-visible) .seed__dot {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

/* Name appears under the hovered or focused dot only. */
.seed__label {
  position: absolute;
  top: 100%;
  left: 50%;
  translate: -50% 0;
  padding-top: 4px;
  color: var(--fg0);
  font-size: 0.72rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms;
}

.seed:hover .seed__label,
.seed:has(:focus-visible) .seed__label {
  opacity: 1;
}

.horizon__modes {
  display: flex;
  padding: 3px;
  border: 1px solid color-mix(in oklab, var(--fg0) 12%, transparent);
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg0) 55%, transparent);
  backdrop-filter: blur(10px);
}

.mode {
  padding: 6px 13px;
  border-radius: 999px;
  color: var(--fg-muted);
  font-size: var(--step--1);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.mode:hover {
  color: var(--fg0);
}

.mode.is-current {
  background: color-mix(in oklab, var(--fg0) 12%, transparent);
  color: var(--fg0);
}

.mode:has(:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.mode__short {
  display: none;
}

@media (max-width: 720px) {
  .horizon__seeds {
    flex-wrap: wrap;
    gap: 2px;
  }

  .mode {
    padding: 6px 9px;
  }

  /* Keep the full name as the radio's accessible name; show the short one. */
  .mode__long {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .mode__short {
    display: inline;
  }
}
</style>
