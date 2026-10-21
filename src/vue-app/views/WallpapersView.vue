<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import WallpaperCard from "../components/wallpapers/WallpaperCard.vue";
import WallpaperFilters, {
  type WallpaperScope,
} from "../components/wallpapers/WallpaperFilters.vue";
import { useTheme } from "../composables/useTheme.js";
import { useWallpapers } from "../composables/useWallpapers";

const {
  entries,
  error,
  missing,
  filter,
  filteredEntries,
  loadManifest,
  setFilter,
} = useWallpapers();
const { currentTheme } = useTheme();

/** The active palette's five scenes first; the whole family is one switch away. */
const scope = ref<WallpaperScope>("palette");
const paletteLabel = computed(() => currentTheme.value?.seedLabel ?? "This palette");
const familySize = computed(
  () => new Set(entries.value.map(e => `${e.seedId}|${e.harmonyMode}`)).size || 50
);

watch(
  [scope, () => currentTheme.value?.seedId],
  ([s, seedId]) => {
    setFilter({ seedId: s === "palette" ? (seedId ?? null) : null, harmonyMode: null });
  },
  { immediate: true }
);

onMounted(loadManifest);

const platform = computed(() => filter.value.platform ?? "monitor");
const platformLabel = computed(() => {
  const p = platform.value;
  return p.charAt(0).toUpperCase() + p.slice(1);
});
const summary = computed(() => {
  const n = filteredEntries.value.length;
  return `${n} ${n === 1 ? "scene" : "scenes"} for ${platformLabel.value}`;
});

function cardKey(e: {
  seedId: string;
  harmonyMode: string;
  platform: string;
  textVariant: string;
}) {
  return `${e.seedId}|${e.harmonyMode}|${e.platform}|${e.textVariant}`;
}


</script>

<template>
  <div class="wallpapers">
    <header class="intro">
      <h1 class="intro__title">Wallpapers</h1>
      <p class="intro__lede">
        Every theme has its own night scene, drawn in its colours. Here are the ones for the
        palette you are wearing; pick a device, then download the SVG or a full-resolution PNG.
      </p>
    </header>

    <section v-if="entries.length === 0 && !error && !missing" class="note" aria-live="polite">
      <p>Loading wallpapers…</p>
    </section>

    <section v-else-if="missing" class="note" data-wallpapers-empty>
      <h2 class="note__title">No wallpapers have been created yet</h2>
      <p>
        The scenes are generated from the theme data and are not stored in the repository, so this
        copy of the site has none to show. Create them from the project folder:
      </p>
      <pre class="note__code"><code>npm run wallpapers:all</code></pre>
      <p>Then reload this page.</p>
    </section>

    <section v-else-if="error" class="note" data-wallpapers-empty role="alert">
      <h2 class="note__title">The wallpaper list could not be loaded</h2>
      <p>Check your connection, then try again.</p>
      <button type="button" class="note__action" @click="loadManifest">Try again</button>
    </section>

    <template v-else>
      <WallpaperFilters
        :filter="filter"
        :show="scope"
        :palette-label="paletteLabel"
        :total="familySize"
        @update="setFilter"
        @scope="scope = $event"
      />

      <p class="summary" aria-live="polite">{{ summary }}</p>

      <section v-if="filteredEntries.length === 0" class="note note--inline">
        <p>No scenes for this palette yet.</p>
        <button type="button" class="note__action" @click="scope = 'all'">Show all scenes</button>
      </section>

      <section v-else aria-labelledby="scenes-heading">
        <h2 id="scenes-heading" class="visually-hidden">Scenes</h2>
        <ul class="grid" :data-platform="platform">
          <li v-for="entry in filteredEntries" :key="cardKey(entry)">
            <WallpaperCard :entry="entry" />
          </li>
        </ul>
        <p class="zip">
          <a href="./caligo-wallpapers.zip" download="caligo-wallpapers.zip">Download everything as a ZIP</a>
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.wallpapers {
  max-width: var(--page-max);
  min-height: 70vh;
  margin: 0 auto;
  padding: clamp(40px, 8vh, 96px) var(--gutter) clamp(56px, 10vh, 120px);
}

.intro {
  margin-bottom: clamp(28px, 5vh, 52px);
}

.intro__title {
  margin: 0 0 20px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.25rem + 2.3vw, 3.3rem);
  font-weight: 340;
  font-stretch: 106%;
  line-height: 1.1;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.intro__lede {
  max-width: var(--measure);
  margin: 0;
  color: var(--fg1);
  font-size: var(--step-1);
  line-height: 1.55;
  text-wrap: pretty;
}

.summary {
  margin: clamp(24px, 4vh, 40px) 0 20px;
  color: var(--fg1);
  font-size: var(--step--1);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--col, 300px)), 1fr));
  gap: clamp(28px, 4vw, 48px) clamp(16px, 2.4vw, 32px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.grid[data-platform="tablet"] {
  --col: 260px;
}

.grid[data-platform="mobile"] {
  --col: 170px;
}

.zip {
  margin: clamp(40px, 7vh, 72px) 0 0;
  font-size: var(--step-0);
}

.zip a {
  color: var(--fg0);
  text-underline-offset: 3px;
}

.note {
  max-width: var(--measure);
  margin-top: clamp(8px, 2vh, 24px);
  color: var(--fg1);
  line-height: 1.6;
}

.note--inline {
  margin-top: 0;
}

.note__title {
  margin: 0 0 12px;
  color: var(--fg0);
  font-family: var(--font-sans);
  font-size: var(--step-2);
  font-weight: 600;
  letter-spacing: -0.015em;
}

.note p {
  margin: 0 0 14px;
}

.note__code {
  margin: 0 0 18px;
  padding: 14px 18px;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--bg1);
  color: var(--fg0);
  font-family: var(--font-mono);
  font-size: var(--step-0);
}

/* Global code styling uses the translucent strings ink, which fails contrast. */
.note__code code {
  background: none;
  color: inherit;
  padding: 0;
  font-size: inherit;
}

.note__action {
  height: 40px;
  padding: 0 18px;
  border: 1px solid color-mix(in oklab, var(--fg0) 30%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--fg0);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.note__action:hover {
  border-color: var(--fg0);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
