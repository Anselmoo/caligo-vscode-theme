# Changelog

## [Unreleased]

### Added
- **colors**: emit the 63 VS Code workbench colors the themes were missing (Agents window, chat incl. voice glow, modern UI shell, `tab.divider`, `statusBar.inactiveBackground`, ...) and gate coverage against a fixture pinned to VS Code 1.142.0 (#174)
- **wallpapers**: ten rebuilt 3D scenes, one per base theme, with a determinism and size gate (#168)
- **site**: 2026 redesign with scene hero, ⌘K theme switcher, and colour science computed from the shipped colours (#169)
- **research**: VS Code token coverage and contrast-state audit (#168)

### Fixed
- **contrast**: translucent colours are composited over their real background before WCAG and APCA scoring; generator, gate and site share one implementation, and 681 foreground/background pairs are gated with a ratchet of known violations (#168)
- **contrast**: selection and match-highlight overlays are fitted to the text drawn on them, so the known violations drop from 119 to 93 pairs; inactive selections no longer read stronger than active ones (#173)
- **manifest**: OKLCH values are derived from the shipped hex, not the pre-gamut-mapping intent (#171)
- **ci**: unit tests run against generated themes, pull requests no longer cancel each other's runs, and release summaries report failed publishes (#168)

### Changed
- **deps**: Vue, vue-router, vue-tsc, @vscode/vsce and others updated, `standard-version` replaced by `commit-and-tag-version`, npm audit fixes (#170); Biome 2.6 with Vue template analysis and a lockfile refresh (#175)

## [0.7.0] - 2026-09-03

### Fixed
- **colors**: restore hue identity and enforce perceptual separation across all 50 themes (#154)

### Changed
- **wallpapers**: preview gallery with CI-built WebP thumbnails (#153)

## [0.6.0] - 2026-08-19

### Fixed
- untrack accidentally committed worktree gitlink
- repair wallpaper gallery, extend VS Code color coverage to 99.7%, and restore the TypeScript gates (#149)


All notable changes to Caligo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-01-04

### Added
- 50 themes from 10 seed palettes × 5 harmony modes (Triadic, Analogous, Monochromatic, Split-Complementary, Complementary)
- OKLCH-based color derivation with perceptual uniformity
- Intent-based semantic highlighting (declaration, usage, mutation, control flow, data)
- Harmony-aware syntax colors derived from accent hue
- Static preview HTML with intent toggle (`build/preview/index.html`)
- WCAG contrast compliance with documented debug values in palette artifacts
- Comprehensive semantic token mappings for TypeScript/JavaScript/Java + LSP support for Python/Rust/Go/C++
- Real VS Code screenshot export script (`scripts/capture-vscode-screenshots.ts`)
- Schema coverage tests ensuring all VS Code theme color properties are defined
- Developer-friendly seed JSON format in `src/seeds/`

### Documentation
- Publish-ready README with highlights, install, preview, and development instructions
- CONTRIBUTING.md with guidelines for seeds, code changes, and PR workflow
- Roadmap memory documenting publication strategy and phases

### Technical
- TypeScript-based generator with full build pipeline
- Automated theme generation from OKLCH seeds
- Intent palette derivation with emphasis modes (balanced, declaration, controlFlow, mutation)
- Semantic color system with fixed hues (error=red, warning=yellow, success=green, info=blue)
- Contrast report generation with WCAG metrics
