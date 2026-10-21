# End-to-end tests

Playwright specs for the Caligo website (`src/vue-app`), run in Chromium.

## Running

The hermetic gate starts its own Vite dev server on `127.0.0.1:4183`, runs Playwright
against it and stops the server on exit:

```bash
bash .werkplan/e2e-gate.sh                        # whole suite
bash .werkplan/e2e-gate.sh tests/e2e/p2-themes.spec.ts
```

It needs `public/themes-manifest.json` (`npx tsx scripts/generate-themes-manifest.ts`).
Without the gate, `npm run test:e2e` uses the preview server from `playwright.config.ts`.

## Specs

| File | What it pins down |
| --- | --- |
| `navigation.spec.ts` | Nav links open Home, Themes, Wallpapers and Science and mark the current page. |
| `p2-themes.spec.ts` | The Theme Spectrum (50 `button[data-chip]` in a 10 x 5 table, roving tabindex, arrow/Home/End, Enter/Space, live announcement, `?theme=` link and last-pick restore, same chooser on Home) and the Themes page's active variant (live editor, core palette, Wear it, export section). |
| `p2-wallpapers.spec.ts` | `/#/wallpapers`: plain empty state naming `npm run wallpapers:all` when the manifest is missing or not JSON; with a mocked manifest, the active palette by default and "All" on request, the palette following the theme, thumbnails only (never a full SVG), the platform toggle, placeholders for missing thumbnails. |
| `p2-science.spec.ts` | `/#/science`: lightness and OKLCH views for the current theme, OKLCH derived from hex (checked against culori), contrast of translucent colours after compositing (against a manifest served with a translucent `strings`). |
| `p2-shell.spec.ts` | Nav contents (three links, two icon links, theme chip), `/gallery`, `/analysis` and `/export` redirects, the ⌘K palette, Export download and copy, footer (links, inline SVG icons, slogan), 404, Home requests no wallpaper SVG, axe-core on every page, no horizontal scroll at 375px. |

Every test carries an owner tag: `@themes`, `@wallpapers`, `@science` (Science, Export,
footer, 404) or `@shell` (nav, palette, Home). `@phase1` marks the whole-document axe
checks, which also cover the nav and Home. Run one area with
`bash .werkplan/e2e-gate.sh --grep @science`.

Shared helpers live in `support/app.ts` (theme manifest, Spectrum locators, palette helper) and `support/wallpapers.ts` (mocked wallpapers manifest and assets). Neither is a spec; Playwright only collects `*.spec.ts`.

## Rules

- No test skips itself. A missing selector is a failure, not a reason to skip.
- Prefer roles and accessible names; use `data-*` hooks where a role cannot identify
  an element (`data-chip`, `data-key`, `data-wallpaper-card`,
  `data-platform-toggle`, `data-scope-toggle`, `data-wallpapers-empty`, `data-science-view`,
  `data-science-theme`, `data-oklch-row`, `data-color-key`, `data-contrast-key`,
  `data-export-theme`, `data-export-action`, `data-selected-variant`).
  The Spectrum is `#main section[aria-labelledby="spectrum-title"]` (see `spectrum()` and `chipFor()`).
- Theme changes run inside a View Transition, so wait with `expect.poll` (see
  `expectThemeApplied`), never with fixed timeouts.
- Network assets that do not exist locally (wallpapers) are mocked with `page.route`.
