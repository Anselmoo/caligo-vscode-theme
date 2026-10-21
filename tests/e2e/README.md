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
| `p2-themes.spec.ts` | `/#/themes`: all 50 variants as `[data-theme-card]` buttons, theme/mode/search filters, choosing a card applies the theme site-wide, keyboard operation. |
| `p2-wallpapers.spec.ts` | `/#/wallpapers`: plain empty state naming `npm run wallpapers:all` when the manifest is missing or not JSON; with a mocked manifest, thumbnails only (never a full SVG), platform toggle, filters. |
| `p2-science.spec.ts` | `/#/science`: lightness and OKLCH views for the current theme, OKLCH derived from hex (checked against culori), contrast of translucent colours after compositing. |
| `p2-shell.spec.ts` | Nav contents, `/gallery` and `/analysis` redirects, the ⌘K palette, Export download and copy, footer, 404, axe-core on every page, no horizontal scroll at 375px. |

Every test carries an owner tag: `@themes`, `@wallpapers`, `@science` (Science, Export,
footer, 404) or `@shell` (nav, palette, Home). `@phase1` marks the whole-document axe
checks, which also cover the nav and Home. Run one area with
`bash .werkplan/e2e-gate.sh --grep @science`.

Shared helpers live in `support/app.ts` (not a spec; Playwright only collects `*.spec.ts`).

## Rules

- No test skips itself. A missing selector is a failure, not a reason to skip.
- Prefer roles and accessible names; use `data-*` hooks where a role cannot identify
  an element (`data-theme-card`, `data-theme-id`, `data-wallpaper-card`,
  `data-platform-toggle`, `data-wallpapers-empty`, `data-science-view`,
  `data-science-theme`, `data-oklch-row`, `data-color-key`, `data-contrast-key`,
  `data-export-theme`, `data-export-action`, `data-selected-variant`).
- Theme changes run inside a View Transition, so wait with `expect.poll` (see
  `expectThemeApplied`), never with fixed timeouts.
- Network assets that do not exist locally (wallpapers) are mocked with `page.route`.
