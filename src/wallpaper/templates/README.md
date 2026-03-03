# SVG Template Engine

This directory contains the runtime template engine and all hand-designed SVG
scene templates for the Caligo wallpaper pipeline.

## Architecture

```
src/wallpaper/templates/
├── engine.ts            — loadTemplate / applyVars / parseBrickOutput / renderTemplate
├── night-aurora.svg     — full 1600×900 scene template (57 palette tokens)
├── bloom-ellipse.svg    — reusable atmospheric glow primitive
├── vignette.svg         — radial vignette overlay primitive
├── background-glow.svg  — background atmospheric haze primitive
└── previews/            — generated dev previews (git-ignored)
```

## Philosophy

**SVG = geometry & structure. TypeScript = colour composition.**

Reference `.svg` files contain artistically designed coordinates, paths, and
gradient structures. They use `{{token}}` double-brace placeholders wherever a
palette-derived or harmony-mode-driven colour is needed. TypeScript (in
`aurora-vars.ts` etc.) computes the token map and calls `applyVars()` to
produce a final SVG string.

This separation means:
- Designers can iterate on geometry in Figma/Inkscape and re-export as `.svg`
- Engineers can iterate on colour algorithms without touching geometry
- Test coverage for the colour layer is fast and cheap (pure TS, no DOM)

## `{{token}}` placeholders

Every `{{token}}` in a template **must** be present in the vars map passed to
`applyVars()`. Missing keys throw at runtime, which makes typos obvious during
development rather than producing silently broken gradients.

### night-aurora.svg tokens (57 total)

| Group | Tokens | Source |
|-------|--------|--------|
| Sky | `skyDeep` `skyLow` `skyMid` `skyHigh` `skyUp` `skyHorizon` | Derived from `bg` / `bgSoft` |
| Aurora green | `auroraGreen` … `auroraGreenFade` (×9) | Per-mode primary colour |
| Aurora secondary | `auroraCyan` `auroraPurple` `auroraPurpleMid` `auroraPurpleSoft` | Per-mode secondary / tertiary |
| Mountains | `mountainFarTop/Base` … `mountainFrontTop/Base` (×8) | Atmospheric depth from `bgSoft` → near-black |
| Lake | `lakeDeep` `lakeMid` `lakeDark` | Derived from `bg` / `bgSoft` |
| Moon | `moonGlowColor` … `moonCrater` (×7) | Fixed warm neutral reference values |
| Snow | `snowTop` `snowBase` `snowFaint` | Fixed cool blue-white reference values |
| Stars / Milky Way | `starWhite` `starBlue` `starFaint` `starFeature` `milkyWayColor` | Fixed natural values |
| Shooting star | `shootingStarMid` `shootingStarTail` | Fixed blue reference values |
| Ridge / fog / mist | `ridgeLight` `rippleColor` `fogColor` `shoreColor` `mistLight` `mistMid` | Derived from `bgSoft` + `#aaddff` tint |
| Trees / ground | `treeColor` `treeColorDark` `treeColorBack` | Darkened from `bg` |
| Vignette | `vignetteColor` | Always `#000000` |

## Template engine API

```ts
import { applyVars, loadTemplate, parseBrickOutput, renderTemplate }
  from "../templates/engine.js";

// Low-level
const template = loadTemplate("night-aurora.svg");       // reads file once
const filled = applyVars(template, { skyDeep: "#020b18", … });

// Combined
const { defs, elements } = parseBrickOutput(filled);

// Shorthand (for simple brick templates like bloom-ellipse.svg)
const brick = renderTemplate("bloom-ellipse.svg", vars); // BrickOutput
```

## Dev preview

Generate standalone viewable SVGs for all 5 aurora modes:

```sh
npm run wallpapers:templates:preview
# → src/wallpaper/templates/previews/aurora-{stillness,drift,break,void,pulse}.svg
```

Open any of these in a browser or Figma to inspect the colour rendering for a
given harmony mode. The `previews/` directory is git-ignored.

## Adding a new template

1. Create the `.svg` file in this directory with `{{token}}` placeholders.
2. Write a `build<Name>Vars(colors, mode)` function in `src/wallpaper/motifs/`.
3. Call `applyVars(loadTemplate("your-file.svg"), vars)` in the motif.
4. Add tests for the vars builder (all tokens present, no undefined values).
