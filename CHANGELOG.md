# Changelog

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
