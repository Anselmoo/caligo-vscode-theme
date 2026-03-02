# Caligo VS Code Theme

## Purpose
Caligo is a VS Code color theme extension generating 50 perceptually uniform dark themes from 10 OKLCH seed palettes × 5 harmony modes. It also produces a Vue-powered website and a wallpaper system (300 files: 50 themes × 3 platforms × text/no-text).

## Tech Stack
- TypeScript (ES2020, NodeNext modules, strict mode)
- Vue 3 + Vue Router (hash mode for GitHub Pages)
- Vite for bundling/dev server
- Vitest for unit tests, Playwright for E2E
- Biome for linting/formatting (indentStyle: space, width: 2, lineWidth: 100, LF)
- Playwright for SVG→PNG rasterization (wallpapers)
- OKLCH color science via culori

## Project Structure
- `src/lib/` — core theme generation (palette, vscode-theme, validators, constraints)
- `src/seeds/` — JSON seed files (10 seeds)
- `src/wallpaper/` — wallpaper system (bricks, modes, motifs, composer, renderer, types)
- `src/vue-app/` — Vue SPA (views, components, composables, router)
- `scripts/` — CLI tooling (generate wallpapers, screenshots, manifests)
- `.github/workflows/cicd.yml` — CI/CD pipeline
- `public/` — static assets served by Vite
- `themes/` — generated theme JSON (gitignored)
- `build/` — compiled TypeScript output

## Key Design Decisions
- Source of truth is TypeScript + JSON seeds; generated artifacts not committed
- Wallpaper motifs switch on `harmonyMode` to produce 50 unique compositions
- Bricks are modular SVG primitives using fraction-based coordinates (0..1)
- Scale normalization: `Math.max(width, height) / 2160`
