# Wallpaper Quality Issues (Phase 3 Audit)

## Problem
49/50 wallpaper SVGs fail quality checks. Main issues:
- DOT-DOMINATED (37/50): >85% of visual elements are tiny circles (particles)
- NO-TERRAIN (34/50): No polygon-based landscape shapes (mountains, hills, coastlines)
- NO-ATMOSPHERE (19/50): Only 1 filter (noise grain); no depth haze/glow/displacement
- TOO-SIMPLE (10/50): <5KB SVGs, insufficient visual content

## TypeScript Errors Blocking pages:dev
- text.ts:59 references `colors.fg` which doesn't exist on WallpaperColors
- aurora-noir.ts uses `y` instead of `cy` for curtainBrick (CurtainBrickOptions)
- cinder.ts, mandarian.ts, obsidian-glow.ts pass string "up"/"down" to sparksBrick direction (expects 1|-1)

## Solution: landscape.ts brick library
New high-level bricks: terrainBrick (seeded noise polygon), terrainStackBrick, waterReflectionBrick, celestialBrick, skyGradientBrick, cloudBandBrick, auroraAdvancedBrick, starFieldBrick.

## Quality Gate
Each wallpaper SVG must: >8KB, ≥1 polygon/complex path, ≥2 filter elements, circles <70% of visible elements.
