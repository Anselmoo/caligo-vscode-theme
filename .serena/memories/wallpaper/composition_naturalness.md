# SVG Composition Naturalness — Implemented Fixes (Phase 2)

## Status: IMPLEMENTED

All changes are in the worktree branch `claude/amazing-yonath-073e67`.
300 SVGs generated at `public/wallpapers/`. File sizes 21–48K (healthy range).

---

## Round 1 Fixes (commit: see git log)

| File | Change | Why |
|------|--------|-----|
| `bricks/background.ts` | Seeded gradient center cx/cy via seedRng | All 300 shared identical atmospheric base glow |
| `bricks/landscape.ts` | `terrainNoise`: 6→4 octaves + 3-tap Gaussian smooth | Octaves 5-6 alias above Nyquist, roughjs amplifies into zig-zag |
| `bricks/landscape.ts` | `roughifyTerrainPath`: `roughness*130` → `roughness*38` | 13px roughjs jitter at 4K was visible as sharp zig-zag |
| `bricks/landscape.ts` | `terrainBrick` default points 24→40 | More control points lower max slope per step |
| `bricks/landscape.ts` | `nebulaGlowBrick` filter `-50%/200%`→`-150%/400%` | Blur radius > filter padding clips to rectangle = square sun |
| `bricks/landscape.ts` | Aurora noise: `t*3.5 (0.65)` → 4-octave starting at `t*6.5` | Low base freq produces visible sine wave across viewport |
| `bricks/landscape.ts` | Aurora ctrl points 12-20 → 22-32, x-jitter added | Even spacing + low point count reinforced periodic look |
| `bricks/shapes.ts` | `curtainBrick` noise same sine fix | Same low-freq noise issue |

## Round 2 Fixes (further enhancements)

| File | Change | Why |
|------|--------|-----|
| `bricks/landscape.ts` | `TerrainBrickOptions.gradient` → added `topOpacity`/`bottomOpacity` | Enables aurora rim light at controlled opacity |
| `bricks/landscape.ts` | **NEW** `ridgeHighlightBrick` function | Regenerates identical ridgeline as terrain, emits as glowing stroked path with anisotropic blur. Pair with terrainBrick using same seedSuffix |
| `bricks/landscape.ts` | Aurora `feGaussianBlur` → anisotropic `stdDeviation="xBlur yBlur"` (0.5x, 1.0x) | Real aurora blurs more vertically (curtain columns) than horizontally |
| `bricks/landscape.ts` | Aurora curtain skirt — per-band wide stroke with vertical `userSpaceOnUse` gradient | Creates characteristic hanging light column below each aurora band |
| `bricks/landscape.ts` | Star atmospheric extinction in `starFieldBrick` | Stars near horizon are dimmer in reality (scatter through more atmosphere) |
| `bricks/index.ts` | Export `ridgeHighlightBrick` | Availability for all motifs |
| `motifs/aurora-noir.ts` | leftWall/rightWall/foreground: explicit seedSuffix + aurora rim gradient + ridge highlights | Cross-layer interaction: aurora illuminates terrain tops |

## Usage Pattern for ridgeHighlightBrick

```typescript
// terrain and highlight MUST share seedSuffix, baseY, roughness, points
const wall = terrainBrick(p, {
  ..., seedSuffix: "my-wall",
  gradient: { topColor: colors.hueGreen, bottomColor: colors.bg, topOpacity: 0.12 }
});
const wallGlow = ridgeHighlightBrick(p, {
  ..., seedSuffix: "my-wall",  // same suffix → same ridgeline
  color: colors.hueGreen, opacity: 0.18
});
```

## Remaining High-Value Work
- Apply ridgeHighlightBrick to other motifs (deepSable, eclipse, nebulaNight, etc.)
- Extend aurora curtain + rim light to auroraDrift / auroraPulse scenes
- Water reflection: clip to terrain gap (not full-width rect)
- Add ridgeHighlightBrick to terrainContourBrick scenes (needs different approach — contour paths differ from terrainBrick)
