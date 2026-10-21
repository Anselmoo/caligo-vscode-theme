# Wallpaper scenes — plan for the 8 remaining themes

Planning only. Palettes were pulled with `extractWallpaperColors(derivePalette(variant, "Balanced"))`
for all 10 seeds × 5 harmony modes (scratch script, not in repo). Budgets are anchored to the
spike measurements in `budgets.md`: desert-night 55.6 KB / 689 el, aurora-refined 71.8 KB / 1105 el.

## 0. What the palettes say (read this first)

**0.1 Fixed slot names do not survive the modes.** `bg` stays the same in all 5 modes. Every other
slot moves, by 60–180° of hue: the accent, `hue*` and the syntax roles.
The spike scene shows the failure:

| desert-night formula, DeepSable | none | analogous | split-comp | mono | triadic |
|---|---|---|---|---|---|
| `sand = mix(functions, attributes, .35)` | `#c2e89e` **green** h130 | `#fe9473` salmon | `#63e8f7` **cyan** | `#a7cbff` blue | `#b3cdc3` grey-mint |
| `moonLight = mix(functions, strings, .35)` | `#f1e5aa` cream | `#de849f` **pink** | `#4eeacd` **aqua** | `#a7cbff` | `#9befb5` **mint** |

The lit sand in Balanced comes out `#445246`, a green-grey. This is the "emerald on sand" case, and it
already ships in the spike.

**0.2 A value-based role resolver fixes it.** Choose each scene role by value over all non-bg slots.
Choosing by slot name is what breaks. The rule, applied to every hex cell in this document:
1. **Lightness decides.** Keep the slots with |ΔL| ≤ `lTol` (default .08). If none qualify, keep the nearest-L slots.
2. **Hue is a preference with a limit.** If the role has a target hue, keep only slots with Δhue ≤ `maxDh`
   (default 40°) and rank them by Δhue. If none are left, take the role's **explicit fallback**. The resolver never
   returns a bad match.
3. **Chroma only breaks ties** (lower wins). The chroma cap is applied *afterwards* with `tone()` (0.4).

"palest" below means L.92 ± .06 with no hue target.
Examples under this rule:
- DeepSable sand (h60, L.68): `#ce8545` (`hueCyan` slot!) none, `#f57400` analogous, `#bf8d53` split, `#c6893a` triadic.
  Mono has no warm slot, so it falls back.
- Cinder smoke-sun (h30, L.55, lTol .15): `#9a5148` none, `#ff5e25` analog, `#ff5d50` split, `#bf4828` mono, `#ff5483` triadic.
  Using `accent` there would have made the sun **green** (`#00782d`) in triadic.

**0.3 Monochromatic is the floor.** Mono collapses each theme to `bg` + accent + **two tones at one
hue**, at L≈0.66–0.70 and L≈0.92. Each value plan below has a mono fallback, and a scene that cannot
be read from those values is the wrong concept for its theme. Mono 0.92 tones are often saturated
(GraphiteFlux `#7bffec` C.12, ObsidianGlow `#00e1f0` C.14), so the resolver alone is not enough.

**0.4 We need chroma control, not just `shade`.** `shade` only scales L. Light sources need
`tone(c, {cScale, l?})`, which scales OKLCH chroma and stays palette-derived like `shade`. Example: GraphiteFlux
mono mist `#7bffec` → `tone(.15)` = `#d8e9e6` (C.018). Without that the scene is a mint ink-wash.

**0.5 Two mode composers break a binding rule on top of every scene** (see Q1):
- `modes/monochromatic.ts` → `noiseBrick`: **2 full-canvas feTurbulence**, numOctaves 6, in 60 files.
  This breaks the filter budget.
- `modes/split-complementary.ts`: a **constant-width `<line>`** across the canvas, in 60 files. This breaks the no-hard-edge rule.
- Analogous and triadic only add gradient rects and a vignette, so they stay within budget. The triadic/split corner glows use
  `hueBlue`/`huePurple`, which outside `none` are arbitrary harmony slots. That is a colour issue, not a budget one.
- `budgets.md` measured only the `none` composer.

**0.6 Platform.** Neither spike motif reads `p.platform`. For example, desert-night draws 420 stars on any
canvas. The decision for all scenes: read `PLATFORM_SCENE_TUNING`. Star counts scale with
canvas area × `starDensity`. Horizons and terrain take `terrainLift`, mist takes `fogLift`, and each scene
has a per-platform horizon/focal table. Mobile pulls focal x to 0.5W and keeps the focal subject
out of the top ~22 % (lock-screen clock). Every platform keeps the bottom-left quiet, because the
text variant's `textBrick` sits there.

## 1. DeepSable: keep the desert, retrofit its colours

"Sable" means sand in French and black in heraldry. The palette is cool indigo: bg `#100f20`
h285, accent `#3b9cf6`. A moonlit desert at night *is* cool, so the scene fits. The **colour formulas
are wrong**:
- **sand** = resolver(h60, L.68) → `tone(#ce8545, .6)` = `#ba8e6b`. In analogous it is `tone(#f57400, .4)` = `#c49175`.
- **lit sand** = `mix(shade(bg,.5), sand, .42)` = `#423333`, a warm taupe in place of green-grey.
- **moonLight** = resolver(palest) → `strings #ffd6db` none.
- Fallback when there is no warm slot (mono): sand = moonLight, so the sand is blue (`#d5e6ff`). That reads as a correct blue-hour desert.

This retrofit is step 0 of the build order. It is also the resolver's first test.

---

## 2. Eclipse — totality over a twilight horizon

**Concept.** During totality the sky darkens to deep blue and a 360° sunset-orange band rings the
horizon. A black lunar disc hangs high, surrounded by a pearly corona that is elongated along the
solar equator, as at solar minimum. Only a few planets or bright stars show.
**Light:** the corona, at (0.62W, 0.30H), plus the horizon band behind the land. The land is backlit and
near-black. **Focal:** the disc. **Horizon:** 0.82H, low and flat, with one distant ridge.

| role | resolver rule | Balanced | mono fallback |
|---|---|---|---|
| bg-derived darks: sky, disc, land | `bg`→`shade(bg,.6)` zenith, `shade(bg,.45)` disc/land | `#061016` / `#000204` | same |
| corona | palest, then `tone(≤.05 C)` | `huePurple #ffdcd0` | `#f2ed00` (C.20) → `tone(.25)` |
| twilight band | h40, L.69, `tone(.6)`. Fallback: maxDh 75, then the L.67 slot | `keywords #ff611b` → `#db7f5f` | `#9d9a37` toned (sodium) |

**Avoid** *(value decision, not a concept change)*: `accent #c2ac00` gold on the corona. A gold ring reads as an *annular* "ring of fire" or a
cartoon sun. Avoid the `functions`/`tags #dca0ea` orchid as well.
**Layers:** sky gradient [reuse sky pattern] → twilight band (elliptical `glowBand` hugging the horizon)
[NEW shared] → sparse stars, count ≈25 [reuse starField + area scaling] → corona [NEW, Eclipse-only] →
disc → far ridge + near land [shared `ridgeLayers`] → grain [reuse].
**Corona construction:**
- Inner corona: one radial gradient with a steep falloff (the PSF trick from starField).
- Outer corona: 30–40 wide, very low-opacity (≤.10) streamer petals. Each is a smooth Bézier lens
  with its gradient along its own axis, and fbm sets its length.
- Petals cluster at ±15° of the equator axis.
**Portrait.** Disc at (0.5W, 0.34H). This is below the clock zone, so it stays clear. The horizon is at 0.86H
and the band gets taller (`atmosphereScale`).
**Budget:** ≈150 el, ≈25 KB. **Risk:** the streamers read as sun rays or a flower. Mitigation: no two
streamers of similar length, overlap so no single petal edge is readable, and the radial falloff does
90 % of the work. **Effort: M.**

## 3. NebulaNight — Milky Way over a quiet plain

**Concept.** The galactic core rises diagonally out of a dark, nearly flat plain. A warm, dust-split core
fades into a cool band. This is the darkest sky in the set (bg L.14).
**Light:** the band itself plus faint airglow at the horizon. The plain is lit only as a silhouette edge.
**Focal:** the core, lower-left third at (0.32W, 0.62H), where it is split by the dark "rift".
**Horizon:** 0.84H. One very low far ridge keeps the edge from looking ruler-straight.

| role | resolver rule | Balanced | mono fallback |
|---|---|---|---|
| bg-derived darks: sky, dust lanes, plain | `bg`, `shade(bg,.7)` zenith, `shade(bg,.5)` lanes | `#050a0f` | same |
| band light | palest; body = `mix(bg, ·, .3)` | `huePurple #bbeeff` → `#32444c` | `#e3e1ff` mix |
| core | h80, L.88, `tone(.45)`. Fallback: band light | `types #f9d779` → `#e8d9b2` | fallback `#e3e1ff`, so the B&W astrophoto look |
| diffuse glow | `accent` at ≤.06 opacity | `#9297dc` | `#a49bef` |

**Avoid:** `strings #ff611b` and `constants #eb95ff`. They are too saturated for starlight.
**Layers:**
- sky → airglow `glowBand` [shared] → band body (4–6 nested smooth envelopes, width modulated by fbm,
  brightness peaking at the core) [NEW `galacticBand`]
- → band star-dust: two 256 px dot-pattern tiles at different scale and rotation, clipped to the band
  [NEW `dustTile`, which is only circles, no turbulence]
- → resolved stars, with density biased toward the band [extend starField with a `density(x,y)` option]
- → dust lanes (6–10 overlapping dark lenses, gradient along their own axis) → plain [`ridgeLayers`] → grain.

**Portrait.** This is the best format for the scene. The band turns to ≈70°, with the core at (0.45W, 0.66H).
**Budget:** ≈700 el, ≈70 KB. This is the tightest scene. The dust tiles keep the milky texture to ~2 elements; otherwise
it would cost thousands of dots or a turbulence filter. **Risk:** dust lanes look brushed-on, and the band looks like a stripe.
Mitigation: lanes are offset from the centreline and branch from one dominant rift. The band
edge has no visible boundary, only nested envelopes. **Effort: L.**
*(Approved idea said "lake or plain". The plan proposes **plain**, so the lake goes to MidnightAtelier; see Q3.)*

## 4. VoidEmber — the last glow in a caldera (concept refined)

**Concept.** *Refinement:* the approved idea specified only a "dark caldera". This plan pins it to a shield
caldera with a lit plume and explicitly rules out a cone, because a cone reads as a cartoon volcano. A distant, broad, low shield caldera at night, with a wide shallow bowl between two rim
shoulders. Light from a lava pool you cannot see lifts out of the dip. It lights the underside of a slow
steam plume and the inner lips of the rim. There is no lava, no sparks and no cone.
**Light:** below and behind the rim dip, at (0.55W, 0.64H), pointing **upward**. **Focal:** the lit underside of the plume.
**Horizon:** rim at 0.62–0.66H.

| role | resolver rule | Balanced | mono fallback |
|---|---|---|---|
| bg-derived darks: sky, rock | `bg`→`shade(bg,.6)`, `shade(bg,.45)` | `#210313` | same |
| glow | h30, L.69, maxDh 45, mixed into bg | `hueYellow #ff5c58` → `mix(bg,·,.55)` `#923039` | `#ff52aa` (pink glow is still on-theme) |
| hot core (tiny) | h80, L.9, `tone(.35)`. Fallback: palest | `strings #f9ea00` → `#ebe8b3` | fallback `#ffd8e7` |
| plume tint | `mix(glow, accent, .3)` | `accent #ec55b5` | accent |

**Avoid:** `functions #66effe`, `types #7dd89f` and `tags #00a99b`. Cyan or green near fire reads as toxic.
Split-comp has no red. The resolver then returns pink `#ff48c0`, which is acceptable for a "void" theme.
**Layers:** sky → sparse stars [reuse] → distant cloud deck lit from below (`mistBand`, inverted
gradient) [shared] → plume (3–4 `mistBand`s with upward lean, each brightest at its base) →
`glowDisc` behind the rim [shared] → caldera rim [`ridgeLayers`] with inner-lip `taperedSliver`s
[shared, extracted from the desert rim light] → nearer dark ridge → grain.
**Portrait.** The plume's height suits portrait well. Rim at 0.70H, plume up to 0.30H, glow centred.
**Budget:** ≈300 el, ≈40 KB. **Risk:** it reads as a cartoon volcano or explosion. Mitigation: the bowl is wider
than it is tall, the glow is below 0.5 opacity, and the plume edges dissolve and are never outlined. **Effort: M.**

## 5. Cinder — wildfire sun over an ash plain (concept refined)

**Concept.** It is pre-dawn after a fire. Long smoke layers drift over a flat grey ash plain, and a **deep-red
sun disc** shows through the smoke, half-veiled. This is the physical signature of wildfire smoke.
*Refinement and why:* "ash plain + smoke" alone has no light source and no focal point. The red smoke-sun gives both.
It also separates Cinder from VoidEmber: horizontal and veiled versus vertical and glowing from below.
**Light:** the sun at (0.30W, 0.50H), low on the left. **Focal:** the sun, crossed by two smoke bands.
**Horizon:** 0.70H.

| role | resolver rule | Balanced | mono fallback |
|---|---|---|---|
| sky | `bg`, with `mix(bg, ash, .1)` near the horizon | `#140001` | same |
| sun | h30, L.55, lTol .15 (NOT accent: accent is green in triadic) | `accentMuted #9a5148` | `#bf4828` |
| ash / smoke / plain | palest, mixed into bg (.18 smoke / .25 plain / .35 ash) | `functions #d0e8ff` → `#341e20` / `#534348` | `#ffdcd2` mix |

**Avoid:** `strings #9affaa`, `types #65f1f5` and `keywords #f33ff3`. All are neon.
**Layers:** sky → `glowDisc` (sun bloom, very wide and faint) → sun disc (radial gradient with a soft limb, no
edge) → 5–7 smoke `mistBand`s, two crossing the disc at .5–.7 opacity → far flat ridge →
ash plain with 6–8 faint horizontal tonal bands → optional 3–5 burnt snags on the horizon, as tapered
verticals only → grain.
**Portrait.** Sun at (0.5W, 0.46H). The smoke bands cross the full width, and there are more of them, stacked (`fogLift`).
**Budget:** ≈60 el, ≈20 KB. This is the cheapest scene after GraphiteFlux. **Risk:** the sun reads as a flat red circle, the "Japanese
flag" effect. Mitigation: a limb-darkened gradient, the smoke bands occluding it, and a bloom tinting the bands. **Effort: S.**

## 6. ObsidianGlow — black glass catching a sliver of light

**Concept.** One outcrop of obsidian, with smaller pieces beside it. Its faces are conchoidal: curved and
shell-like, very dark and glassy. It is backlit by a thin band of last light on the far horizon. Only a few
curved facet edges catch a sliver of that light. The upward faces mirror the cool sky.
**Light:** the horizon light band, left of the outcrop, at (0.30W, 0.78H). **Focal:** the specular sliver on the
hero facet, at about 0.6W. **Horizon:** 0.78H. The outcrop rises to 0.40H.

| role | resolver rule | Balanced | mono fallback |
|---|---|---|---|
| sky | `bg` plum, toward `mix(bg, light, .2)` at the horizon | `#190b1c` | same |
| light / sliver | palest | `functions #ffddc7` (warm) | `#00e1f0` → `tone(.3)` |
| sky reflection | h200, maxDh 50, `mix(bg, ·, .25)`. Fallback (split): `mix(bg, light, .2)` | `accent #00c3c3` → `#293441` | `#00ccd9` mix |
| glass body | `shade(bg,.4)`–`shade(bg,.7)` | — | same |

**Avoid:** `keywords`/`attributes #87ff00` (neon lime, C.26). They must never appear.
**Layers:** sky → horizon `glowBand` [shared] → far flat plain [`ridgeLayers`] → outcrop [NEW
`conchoidalRock`: 8–12 large facets per formation, curved Bézier boundaries]. Each facet takes a gradient
along its own normal, from body to sky reflection. Facet boundaries come from value change only, never
outlines. Then 2–4 `taperedSliver` speculars [shared] → foreground fragments, a few tiny glints → grain.
**Portrait.** The outcrop is taller and centred at 0.5W, rising to 0.32H, with the light band to its left.
**Budget:** ≈200 el, ≈35 KB. **Risk:** HIGHEST in the set. Facets read as low-poly or a crystal gem clip-art.
Mitigation: few, large, curved facets, a low L range (.08–.20), and specular slivers only where a facet
faces the light band. Fallback concept if round 1 fails: wet black basalt sea stacks, a sheen with no
facets (Q5). **Effort: L.**

## 7. GraphiteFlux — ink-wash mountains in mist

**Concept.** A *shan shui* stack of 6–8 ranges in near-neutral greys. Far ranges are tall and steep, and near ranges are rounded.
Each range is **darkest at its crest and dissolves downward into mist**. That is the inverse of
the desert's lit-crest gradient, and it is what makes ink wash read as ink wash. A barely visible pale sun disc sits behind the
mist. **Light:** a diffuse sun at (0.70W, 0.24H). **Focal:** the brightest mist gap between the 2nd and 3rd ranges.
**Horizon:** none. The ranges stack from 0.30H to 0.95H.

| role | resolver rule | Balanced | mono fallback |
|---|---|---|---|
| mist (also the sun, at higher opacity) | palest, then `tone(.3)` | `tags #ffdadc` → `#ede1e2` C.013 | `#7bffec` → `tone(.15)` `#d8e9e6` |
| ink (crest) | `shade(bg, .6–1)` by depth | `#0b0e14` | same |
| paper / mid range | `mix(bg, mist, .12)` sky, `.35` mid range | `#4f4e54` | same |

**Avoid:** every saturated slot: `functions #ff5d34`, `types #ff48c0`, `variables #00f1a0`. No accent.
Teal `#00b597` would break the grey restraint (Q2).
**Layers:** paper gradient → sun `glowDisc` → for each range far→near: `ridgeLayers` silhouette
(multi-scale fbm, with occasional steep peaks) with a crest-dark→transparent gradient, then a `mistBand` in front of it → grain.
**Portrait.** This is the natural hanging-scroll format. Use 8 ranges, stacked taller (`terrainLift`, `fogLift`).
**Budget:** ≈35 el, ≈20 KB. **Risk:** it looks like a generic flat "layered mountains" vector wallpaper.
Mitigation: no flat fills, crest-dark gradients, mist overlapping the range bases, and an irregular spacing of range heights. **Effort: S.**

## 8. MidnightAtelier — moonlit still water

**Concept.** A full or gibbous moon sits low over a mirror-still lake. A far shore of low dark hills or treeline is reflected
softly, and a long, soft moon column lies on the water. A thin mist lies on the waterline.
**Light:** the moon at (0.40W, 0.28H). **Focal:** the moon and its column. **Horizon / waterline:** 0.58H.

| role | resolver rule | Balanced | mono fallback |
|---|---|---|---|
| bg-derived darks: sky, water, shore | `bg`→`shade(bg,.65)`. Water = mirrored sky darkened ~12 % (Fresnel). Shore `shade(bg,.45)` | `#130a20` / `#150822` | same |
| moon / column | palest | `huePurple #d6e6ff` | `#ffd5fd` → `tone(.5)` |
| halo tint | `accent` ≤.08 | `#ce74e3` orchid | `#ec6ceb` |

**Avoid:** `functions #7effe8` and `types`/`tags #c0eb95`. Aqua or lime on a violet night reads as cartoon. Also
avoid `strings #bf8f34`.
**Layers:** sky → moon halo `glowDisc` → sparse stars [reuse] → moon [NEW shared `moonDisc(phase)`,
extracted from the desert crescent] → far shore [`ridgeLayers`] → **water** [NEW shared
`stillWater`]. Inside the water layer:
- a mirrored-sky gradient rect;
- the shore reflected with one `<use transform="scale(1,-1)">` plus a fade rect, which gives one extra element instead of
  doubling geometry;
- the moon column as 20–35 horizontal `taperedSliver`s whose length shrinks toward the waterline;
- 6–10 faint ripple slivers that break the mirror.

Then a waterline `mistBand` → grain.
**Portrait.** The column becomes the vertical spine of the composition. Moon at (0.5W, 0.30H), waterline at 0.52H.
**Budget:** ≈150 el, ≈30 KB. **Risk:** the reflection reads as copy-paste, or the column as dashes. Mitigation: the
reflection is darker, lower in contrast and slightly stretched. Sliver lengths come from fbm and fade toward the viewer. **Effort: M.**

## 9. Mandarian — dusk afterglow on flooded terraces (concept refined)

**Concept.** *Refinement:* the terraces are shown by their flooded-pool reflections, not by drawn terrace geometry.
Drawn steps are the quickest route to a striped cartoon hill. The sun has just set behind layered hills on the right. The nearest hills are carved into rice terraces
whose **flooded pools mirror the bright sky**. That gives thin, irregular bright slivers on dark slopes, which is how
real terraces read at dusk (Yuanyang). The terrace geometry is never drawn, only its reflections.
**Light:** the afterglow below the horizon at (0.75W, 0.56H). **Focal:** the brightest terrace slivers, lower-right third.
**Horizon:** 0.55H.

| role | resolver rule | Balanced | mono fallback |
|---|---|---|---|
| zenith | `mix(bg, cool h280, .15)`. Fallback: `bg` only | `functions #c9b2ff` → `#32241e` | fallback `bg` |
| horizon glow | h65, L.75, maxDh 30 → `mix(·, haze, .4)`. Fallback: haze | `hueOrange #da7f00` → `#eaa56d` | `accentMuted #c0983a` |
| haze | h50, palest, maxDh 50 | `hueRed #ffdcd1` | `#ffe1a0` |
| hills (bg-derived) | `shade(bg,.5)` + haze by depth | `#1c0e00` | same |

**Avoid:** `strings #00e9ee` cyan and `constants #a1b700` lime. Lime terraces read as a cartoon rice field.
Split-comp's accent is blue `#62a2ff`. The glow falls back to haze there, which is peach `#ffccb2`.
**Layers:** sky gradient → afterglow `glowBand` → 3–4 hill ranges [`ridgeLayers`, with aerial perspective] →
**terrace pools** [NEW `terraceSlivers`]. These are contour curves (offsets of the hill profile,
compressed with height for perspective) clipped to the near hills. They are broken into 3–8-segment runs, each
a `taperedSliver` whose brightness samples the sky gradient at its mirrored angle → valley `mistBand` → grain.
**Portrait.** Terraces fill the lower 45 %. Afterglow at 0.5W, horizon at 0.50H.
**Budget:** ≈450 el, ≈55 KB. **Risk:** the slivers read as topo-map contours or stripes. Mitigation: runs are broken,
spacing is irregular, slivers fade on far hills, and brightness follows the sky. Without that, the stripes read as a pattern. **Effort: L.**

---

## 10. Shared primitives — build these first, in this order

| # | primitive | what it is | used by |
|---|---|---|---|
| 0 | `resolveRoles(c, spec)` | Rule in §0.2: L band decides, hue within `maxDh` is preferred, otherwise an explicit fallback. Chroma breaks ties, and `tone()` caps it afterwards. No hex literals. | all 10 (retrofits desert + aurora) |
| 1 | `tone(c, {cScale, l?})` | OKLCH chroma (and L) scaling of a palette colour | all |
| 2 | `glowDisc` / `glowBand` | elliptical userSpaceOnUse radial bloom; horizon-hugging band. Generalises `dn-moonhalo` / `ar-lift`. | Eclipse, Nebula, VoidEmber, Cinder, Obsidian, Graphite, Atelier, Mandarian |
| 3 | `ridgeLayers` | N silhouettes: multi-scale fbm → `smoothPath`. Aerial-perspective mix by depth, per-range gradient mode (`lit-crest` / `ink-crest`), `terrainLift`. | all 8 |
| 4 | `mistBand` | Soft horizontal sheet: smooth closed path, gradient fading at both edges, optional lean, lit-from-below mode. No filter. | Graphite, Cinder (smoke), VoidEmber (plume), Atelier, Mandarian |
| 5 | `taperedSliver` | Lens-shaped highlight hugging a curve, zero width at both ends, gradient along its own axis. Extracted from the desert rim light. | Obsidian, VoidEmber, Atelier (column), Mandarian (terraces), desert |
| 6 | `starField` v2 | area × `starDensity` scaling, optional `density(x,y)` bias. Already in shared.ts. | Eclipse, Nebula, VoidEmber, Atelier, desert, aurora |
| 7 | `moonDisc(phase)` | Generalised gradient-formed crescent or full moon. Extracted from the desert. | Atelier, desert |
| 8 | `stillWater` | Mirrored sky, `<use>` reflection + fade, sliver column, ripples | Atelier (and Nebula if it gets a lake) |

Single-theme primitives: `corona` (Eclipse), `galacticBand` + `dustTile` (Nebula), `conchoidalRock` (Obsidian),
`terraceSlivers` (Mandarian). Every primitive goes through a gate before it counts as built. The gate renders the primitive in
**Balanced and mono** for 2 themes and checks the element/KB counter, because mono is the floor.

## 11. Build order

Primitives come first. Then the **riskiest concept second**. After that, scenes go by how much they reuse.

0. **Primitives 0–1 + DeepSable retrofit.** This proves the resolver on a scene that already exists.
1. **GraphiteFlux (S).** It is the proving ground for `ridgeLayers`, `mistBand`, `glowDisc` and `tone`. Mono is
   its hardest mode (mint), so it tests primitive 1 immediately.
2. **ObsidianGlow (L, riskiest).** If conchoidal facets cannot be made to look non-synthetic, the user must approve a new
   concept. Learning that at scene 2 costs one round. Learning it at scene 8 costs a re-plan.
3. **Cinder (S).** Almost pure reuse (ranges, mist, glow). This is the first scene with an occluded light source.
4. **VoidEmber (M).** Reuses mist (plume mode) and adds `taperedSliver` extraction.
5. **MidnightAtelier (M).** Builds `moonDisc` + `stillWater`.
6. **Eclipse (M).** Reuses everything, adds `corona`.
7. **Mandarian (L).** Needs a mature `taperedSliver` and `ridgeLayers`.
8. **NebulaNight (L).** It has the tightest budget, and it benefits from tuned starField v2 and every haze lesson.

The pure cheapest-first alternative is 1, 3, 4, 5, 6, 2, 7, 8. It saves nothing, because ObsidianGlow shares little. It
only pushes the concept risk late.

## 12. Open questions for the user

1. **Mode overlays (blocking).**
   - Monochromatic adds 2 full-canvas feTurbulence (60 files).
   - Split-comp draws a hard constant-width diagonal line.
   - The triadic/split glows use arbitrary slots.

   The options are to rewrite the mode composers to the scene rules (proposal: vignette only, plus an
   accent-tinted `glowDisc` whose position is fixed per mode), or to let each scene own its mode variation. Until
   this is decided, **120 of the 300 files** break a binding rule regardless of scene quality:
   - mono (60 files) breaks the no-full-canvas-feTurbulence rule;
   - split-comp (60 files) breaks the no-hard-edges rule.
2. **Mode identity.** Should physical roles stay stable across modes, with the resolver keeping the sun warm and the moon pale,
   and the mode visible only through accent-tinted elements (halo, plume tint, glow)? That is the recommendation. The
   alternative is a full repaint by slot, which yields green suns.
3. **Gallery sameness.** AuroraNoir, DeepSable, Eclipse and NebulaNight are all a night sky over a low horizon.
   This plan separates them by focal type: curtain, crescent, black disc, galactic band. It also separates them by horizon height
   (0.88 / 0.60 / 0.82 / 0.84) and by light colour. It gives the lake to MidnightAtelier only and a plain to NebulaNight. OK?
4. **Cinder refinement.** Is a visible red smoke-veiled sun acceptable, as opposed to a sunless ash plain?
5. **ObsidianGlow fallback.** If facets fail in round 1, is "wet basalt sea stacks with sheen" acceptable?
6. **`tone()` as palette-derived.** Chroma scaling counts the same way as `shade`. Confirm that this satisfies "colours only from palette".
7. **GraphiteFlux accent.** Fully grey with no teal, or a single tiny accent (for example, the faint sun tinted by accent)?
8. **Lock-screen safe zone.** Is keeping mobile focal subjects out of the top ~22 % (clock) the right rule?
