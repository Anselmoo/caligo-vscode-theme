# Caligo website (Vue 3)

The preview site for the Caligo themes: a Vue 3 single-page app with hash routing, built by Vite.
Every page reads its colours from the current theme, so the whole site changes when you pick
another one.

## Run it

```bash
npm install
npm run generate     # writes public/themes-manifest.json
npm run vue:dev      # dev server
npm run vue:build    # production build
npm run vue:preview  # serve the production build
```

## Pages

| Route        | View                       | What it is                                                         |
| ------------ | -------------------------- | ------------------------------------------------------------------ |
| `/`          | `views/HomeView.vue`       | Scene hero, the Theme Spectrum, how to wear the pick in VS Code    |
| `/themes`    | `views/GalleryView.vue`    | The Spectrum, the active theme in a live editor, its palette, export |
| `/wallpapers`| `views/WallpapersView.vue` | Generated wallpapers per theme, platform and mode                  |
| `/science`   | `views/AnalysisView.vue`   | Lightness, hue and chroma of the current theme, and its contrast   |
| anything else| `views/NotFoundView.vue`   | 404 with a way home                                                 |

`/gallery` and `/analysis` redirect to `/themes` and `/science`; `/export` goes to `/themes#export`.

## Layout of the source

```
src/vue-app/
├── main.ts, App.vue         entry point and shell (nav, #main, footer, command palette)
├── router/                  hash-mode routes, lazy-loaded views
├── views/                   one file per route
├── components/
│   ├── layout/              AppNav, AppFooter, CommandPalette
│   ├── home/                Home page pieces
│   ├── gallery/             Themes page
│   ├── wallpapers/          Wallpapers page
│   ├── analysis/            Science page: colour-report.ts, LightnessChart, HueWheel, ColourTable
│   └── export/              Export page: FormatSelector, CopyDownload, ExportPreview
├── composables/             useTheme (state and CSS variables), useExport, useThemeAnalysis, ...
├── types/                   theme and gallery types
└── styles/                  reset, variables (tokens), globals, typography
```

## Design rules

- Colours come from theme tokens (`--bg0`, `--fg0`, `--fg-muted`, `--accent`, `--syntax-*`). No
  hardcoded colours.
- Martian Mono (`--font-display`, `--font-mono`) is for headlines, display figures and code.
  Hanken Grotesk (`--font-sans`) is for everything else.
- Pages are left-aligned inside `var(--page-max)` with `var(--gutter)` on each side, and use the
  fluid `--step-*` type scale.
- Small text must clear 4.5:1 over `--bg0` in every theme. `--syntax-strings` is translucent and
  `--accent` dips below 4.5:1 in a few themes, so neither is used for small text. Use them for
  swatches and large marks.
- Anything that shows a colour's lightness, chroma or hue computes it from the hex with culori.
  The manifest's `oklch` metadata is not trusted. Contrast for translucent colours is measured
  after blending them over the background (see `components/analysis/colour-report.ts`).
- Theme and route changes animate through View Transitions, not per-element transitions.

## Tests

```bash
npx vitest run src/vue-app --coverage=false   # unit tests
bash .werkplan/e2e-gate.sh                    # Playwright against a throwaway dev server
```
