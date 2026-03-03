# Wallpaper SVG Gap Analysis — March 2026

## Audit Summary (50 monitor.svg files)

### Size Distribution
- Minimum: 4,573 bytes (ObsidianGlow/monochromatic)
- Maximum: 37,397 bytes (NebulaNight/triadic)
- Median: ~12KB
- Spread: 8.2x — unacceptable variation

### Quality Tiers
**Tier 1 — CRITICAL FAILURES (< 8KB, 11 files)**
| Theme | Mode | Bytes |
| ObsidianGlow | monochromatic | 4,573 |
| MidnightAtelier | triadic | 5,543 |
| MidnightAtelier | monochromatic | 5,759 |
| Cinder | monochromatic | 6,204 |
| Mandarian | balanced | 6,718 |
| Mandarian | analogous | 7,106 |
| Mandarian | split-comp | 7,277 |
| Mandarian | triadic | 7,383 |
| Mandarian | monochromatic | 7,655 |
| MidnightAtelier | split-comp | 7,759 |

**Tier 2 — DOT-DOMINATED (circles > 70% visual elements, ~25 files)**
Eclipse (all 5): 115 circles, only 4 paths each
DeepSable (all 5): 53 circles, 5 paths each
Mandarian (all 5): 54 circles, 4 paths each

**Tier 3 — ACCEPTABLE (10 files)**
AuroraNoir (all 5): Rich composition (mountains, aurora, lake, trees, stars)
Cinder balanced/triadic, ObsidianGlow balanced/triadic

### Element Composition Gap
| Element | Rich scenes (AuroraNoir) | Sparse scenes (Mandarian) |
|---------|-------------------------|--------------------------|
| Circles | 115 | 54 (only stars) |
| Paths | 68 (terrain, aurora) | 4 (only terrain outline) |
| Filters | 8 | 2 |
| Rects | 30 | 5 |
| Ellipses | 12 (fog, lake) | 0 |
| Lines | 18 (ridge detail) | 2 |

### Root Causes
1. **Mode inequality**: balanced mode adds ONLY vignette, monochromatic adds gradient+grain+vignette. Modes do not augment scene content.
2. **Motif inconsistency**: AuroraNoir uses template engine → complex scene. Mandarian delegates to template for non-mobile but template is basic.
3. **Underused bricks**: landscape.ts has 21 functions (terrainBrick, waterReflectionBrick, celestialBrick, cloudBandBrick, etc.) but many sparse motifs use only starFieldBrick + skyGradientBrick.
4. **Missing organic noise**: Stars scatter uniformly (grid positions) instead of using seeded pseudo-random distributions.
5. **Single-layer terrain**: Sparse motifs have ≤1 terrain layer; rich ones (AuroraNoir) layer 4+ mountains with parallax depth.

### State-of-Art Reference (fffuel.co, svgbackgrounds.com)
- Multi-stop gradient blending (6+ stops per gradient)
- feTurbulence + feDisplacementMap for organic waviness
- feSpecularLighting for material depth 
- Catmull-Rom spline paths for smooth terrain
- feColorMatrix for color channel manipulation
- Layered compositing via feComposite/feBlend operators

### Code Quality Hotspots
- atmosphere.ts: 28/100 (6 violations)
- landscape.ts: 40/100 (5 violations)
- templates/engine.ts: 24/100 (5 violations)
- types.ts: 56/100 (missing readonly, type guards)

### Action Plan (4 weeks)
**Week 1 — Critical failures**
- Fix 11 under-8KB SVGs by enriching motif variant functions
- Add terrainStackBrick + celestialBrick + fogWispBrick to every sparse motif
- Minimum scene layering: sky → stars → celestial body → terrain(3+layers) → atmosphere → vignette

**Week 2 — Dot-dominated scenes**
- Add polygon-based foreground features to Eclipse, DeepSable, Mandarian
- Integrate auroraAdvancedBrick or cloudBandBrick for atmospheric depth
- Implement seeded Halton-sequence star scatter for organic distribution

**Week 3 — Mode differentiation**
- Redesign mode composers to add scene elements, not just post-processing
- balanced: add treeline silhouette + fog
- monochromatic: add displacement-mapped terrain + specular lighting
- analogous: add cloud bands + horizon glow
- triadic: add multiple nebula glows + star clusters
- split-complementary: add water reflection + aurora curtains

**Week 4 — Polish & quality gate**
- Fix atmosphere.ts, landscape.ts, engine.ts code quality to 70+
- Implement automated SVG quality gate in CI
- Validate all 50 × 3 = 150 SVGs pass quality checks
