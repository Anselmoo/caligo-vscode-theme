# Suggested Commands

## Build & Generate
- `npm run build` — TypeScript compilation (tsc -p .)
- `npm run generate` — Build + generate theme JSON files
- `npm run pages:dev` — Full dev server (generate + vite dev on :4173)
- `npm run pages:build` — Production build for GitHub Pages

## Testing
- `npm test` — Unit tests + contrast checks
- `npm run test:unit` — Vitest unit tests only
- `npm run test:unit:coverage` — Unit tests with coverage
- `npm run test:e2e` — Playwright E2E tests (needs Chromium)
- `npx playwright install --with-deps chromium` — Install Playwright browser

## Linting
- `npm run lint` — Biome check
- `npm run lint:fix` — Biome auto-fix
- `npm run lint:colors` — Check for hardcoded colors

## Wallpapers
- `npm run wallpapers:generate` — Generate 300 SVGs + PNGs (uses tsx, no tsc)
- `npm run wallpapers:generate:svg-only` — SVGs only (fast)
- `npm run wallpapers:manifest` — Generate manifest JSON
- `npm run wallpapers:bundle` — Create ZIP bundle
- `npm run wallpapers:all` — Full pipeline (generate + manifest + bundle)

## System Utils
- `git`, `ls`, `cd`, `grep`, `find` — standard Linux
- `npx tsx` — run TypeScript directly (no type checking)
