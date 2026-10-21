# Caligo wallpaper scenes: brief for building one theme's scene

This brief is binding. Every rule below comes from the user's judgement of the first three scenes.

## What a scene is
- **Theme and backdrop:** each Caligo theme gets one procedural SVG scene, a calm backdrop behind a *dark* VS Code theme. It is a night scene and stays dark overall.
- **Quality bar:** the user's words are "familiar, but always a tiny personal touch". Aim for the restraint and professionalism of a macOS default wallpaper, never cartoonish.
- **Design brief:** design greenfield, from the theme's **name and purpose**. Do not copy the old images ("random math or chaos").
- **Reference scenes:** three approved scenes live in `src/wallpaper/motifs/`. Read all three before starting:
  - `aurora-refined.ts` (AuroraNoir)
  - `desert-night.ts` (DeepSable)
  - `graphite-flux.ts` (GraphiteFlux)
- **Shared toolkit:** `shared.ts`. Use it, do not edit it.
  - Randomness: `rngFrom` (seeded), `fbm1D` (1-D noise).
  - Colour: `mix` (OKLab), `shade` (lighten/darken), `tone` (scale chroma), `keepLightness` (clamp lightness), `lightness`, `palest`.
  - Shapes: `smoothPath` (Catmull-Rom curve).
  - Layers: `starField` (stars with a PSF halo), `grainBrick` (stitched 256 px grain tile), `moonBrick` (level-3 moon, crescent or gibbous).
- **Planning background only:** `spike/themes-plan.md`. It is not a constraint.

## Colour
- **Palette only:** use the theme palette `p.colors.*` together with the helpers above. Write no hex literals anywhere; this must return nothing: `grep -nE '#[0-9a-fA-F]{3,8}\b' <your file>`.
- **Hue moves freely between harmony modes, and that is intended.** A pink or purple variant is fine. The `hue*` slot names do not describe the actual colour (hueCyan can be magenta), so choose a colour by its value and its role.
- **Lightness is guarded:** use `keepLightness` so the value structure holds in every mode. Light sources must stay brightest and silhouettes must stay readable.
- **Darker toward the back when backlit:** the user prefers this. Far forms are dark silhouettes against a glow; nearer forms catch more light.

## Hard technical rules
- **Budgets per rendered SVG:** ≤ 10 MB and ≤ 80,000 elements (user, 2026-10-21: "hier zählt Qualität … erhöhe auf 10 MB wenn es sein muss"); keep the Chromium render time the harness prints under ~2.5 s. Spend bytes where they buy realism, never on hidden detail.
- **Three platforms:** every scene ships as monitor 3840×2160, tablet 2732×2048 and mobile 1290×2796 (portrait). Compose from `p.viewBox`; never assume landscape. Check `--platform=mobile` before you finish.
- **No full-canvas `feTurbulence`:** it is slow and it softens the image. Sharpness and full resolution matter most. Noise is allowed only on small tiles (`grainBrick`) or on small regions, such as a filter restricted to the moon disc.
- **Deterministic:** the same seed must give a byte-identical SVG. Key every random stream as `rngFrom(\`${p.seedId}-${p.harmonyMode}-<scene>\`)`, and give sub-elements their own streams so they do not shift each other.
- **Apply the mode composer:** `(MODE_COMPOSERS[p.harmonyMode] ?? MODE_COMPOSERS.none)(motif, p)`. The stub file already does this.
- **Ids:** use a unique 2–3 letter prefix on every id in your file.

## The 3D method (binding — the user called the result "amazing", "großes Kino")
Reference implementation: `src/wallpaper/motifs/mandarian.ts` on top of `src/wallpaper/motifs/scene3d.ts`. Read both before you design. The principle is **generate the world, not the picture**:
1. **World coordinates, one camera.** Place every form in 3D (x right, y up, z away) and project it through one `Camera` (`project`). Sizes, overlaps, the vanishing point and how far things sit toward the horizon then agree automatically. No hand-placed layers at guessed screen positions.
2. **Light from the form.** Shade every surface from its true normal against one light direction (Lambert, `max(0, n·L)`), mixed between a palette shadow colour and a palette lit colour. Lit faces, shadow faces and the crisp ridge between them follow from geometry; never paint marks on top (lesson 3).
3. **Depth from distance.** Aerial perspective with `hazeAt(atm, z) = 1 − e^(−z/visibility)`, mixing toward the opaque air colour of the scene (lesson 2). Far is lighter/bluer when frontlit, darker silhouettes when backlit.
4. **Height fields → `terrainSlices`.** Painter's algorithm in depth slices with adaptive selection: `maxBand` (px) is a screen-space error bound — a slice's colour is constant downward, so a visible band taller than a few px reads as vertical comb/"glyph" stacks (the user's word). Keep `maxBand` small (≈5 far, ≈14 near at 3840 px wide) and `candidates` high (≈3000). Hidden parts are culled automatically.
5. **Detail only where seen.** Trees (`coniferRow`), sparks, rocks etc. only where they stand against something different (silhouettes, banks, ridges); inside a uniform mass they are invisible bytes. Mandarian's per-column stack is the pattern.
6. **Soft natural boundaries.** Material changes (forest/rock, lava/rock, snow/rock) blend over a band driven by their own noise, never along one contour — a sharp contour reads as a mesa (lesson 5).
7. **Measure, then fix the cause.** Zoom-crop near and far edges at 2×, look at the byte breakdown per layer, and fix the generating cause (sampling density, chords, aliasing of high noise octaves), never mask it.
Not every scene is a landscape: the same principle applies to space scenes (a lit sphere shaded by its normal, a nebula as a volume with depth-dependent haze), to dunes (height field), to water (reflection = mirrored world, path widening toward the viewer, lesson 12). Use `scene3d.ts` read-only; private helpers or adapted copies go in your own motif file and you report any helper worth promoting.

## Lessons from the user's critiques (each was a rejected render)
1. **No hard edges.**
   - Organic outlines are smooth Béziers through few points (`smoothPath`), never polylines. A polyline ridge read as "hard kinks".
   - Highlights are tapered, lens-shaped gradient slivers *just below* an edge. Never draw a constant-width stroke: one read as "a surfing bird on top of the sand".
   - Hard edges are fine only for small, deliberate shapes.
2. **Solid forms are opaque.** A mountain that fades to *transparent* looks like "shiny plexiglass" and lets the light behind it shine through. A form fades into the opaque fog colour of its depth, not into alpha.
3. **Do not fake volume with marks on top of a form.** The user rejected all three attempts: shadow "sails", vertical columns, and Λ spur lines ("looks like something organic growing").
   - Derive shading from the form itself, as `graphite-flux.ts` does: per-crest normal against the light, painted as a gradient on a second `<use>` of the silhouette and faded by an alpha mask.
   - Otherwise stay calm. The plain, smooth nearest range was "close to excellent".
4. **No large glow behind an occluder.** A broad radial glow cut by a ridge reads as "an umbrella above the mountain". Use tight halos (about 5× the radius) plus at most a very faint wash.
5. **A sharp edge with a uniform darker area below it reads as an occluding hill.** This happened to the aurora's lower edge. Give light edges a soft falloff on both sides.
6. **No stripes.** Evenly stacked, full-width horizontal bands (mist and layers) read as stripes. Use irregular spacing, and use radial or edge-free mist pools.
7. **Stars must have a PSF falloff.** A dot plus a flat disc reads as "two dots". Use `starField`.
8. **Moon:** use `moonBrick` only if the concept needs a moon. When used, make it large and full enough to show its detail. Not every scene should have a moon: variety across the 10 themes matters.

9. **Any outlined cloud becomes a readable shape.** Semicircle lobes read as a theatre valance or drips. Similar-sized Gaussian lobes read as a neon sine wave. For smoke and cloud, use formless soft radial volumes, with depth from soft dark masses, never from a contour (see `void-ember.ts`).
10. **No regular stripes inside a form.** Even, high-contrast column shading read as a barcode. Keep internal structure subtle and irregular, strongest where the light hits, and fading out.
11. **Not too angular.** Concave "witch-hat" flanks and hard vertical cuts read as clip-art crystals. Natural rock is weathered: steep but convex or straight flanks, softened edges.
12. **Light on water is a broad path.** A low light source reflects on calm water as a broad, soft path that **widens toward the viewer** (perspective), never as a thin vertical laser line. A horizon glow is a calm, broad afterglow, not a hot point.

## Process
1. **Read** the three reference scenes and `shared.ts`. Look at the palette for your theme across the 5 modes; the plan document lists the values.
2. **Write the concept** in 2–3 sentences: light source, focal point, horizon, and the "personal touch".
3. **Build only your own motif file.** Private helpers go inside that file.
4. **Render:**
   ```bash
   npx tsx scripts/wallpaper-spike.ts --candidates=<id> --seed=<Theme> --modes=none
   ```
   Add `--platform=mobile` (or `tablet`) to check the portrait and 4:3 framings; output gets a `-mobile` suffix.
   This writes `spike/wallpapers/<id>-<Theme>-none.{svg,png,thumb.png}`. Read the PNG.
5. **Zoom-check near-field edges at 2–3×:**
   ```bash
   node scripts/wallpaper-crop.mjs <svg-file-in-spike/wallpapers> <out.png> <x> <y> <w> <h> [scale]
   ```
   Coordinates are in the 1920×1080 frame; the output goes to `spike/wallpapers/`.
6. **Critique against every lesson above**, then fix the worst issue first. Do **at most 5 render/critique rounds**; stop earlier once nothing a zoom crop shows is worth fixing.
7. **Finish with the 5-mode contact sheet:**
   ```bash
   --modes=none,analogous,split-complementary,monochromatic,triadic
   ```
   This writes `<id>-<Theme>-modes.png`. Check that the structure holds in every mode.
8. **Check:**
   ```bash
   npx tsc -p tsconfig.json --noEmit
   ```
   ```bash
   npx biome check --write src/wallpaper/motifs/<your file>
   ```
   Then run the hex grep above.

## Variants and the gate (hardening run)
- A variant of scene `<id>` lives at `src/wallpaper/motifs/<id>.v-<x>.ts` and exports the **same** compose function name as `<id>.ts`.
- Render a variant:
  ```bash
  npx tsx scripts/wallpaper-spike.ts --variant=<id>.v-<x> [--modes=...]
  ```
- Measurable gate (budgets, determinism, no full-canvas noise, no hex):
  ```bash
  npx tsx scripts/wallpaper-gate.ts --only=<id>.v-<x>
  ```
- Baseline renders of the current scenes: `spike/baseline/`.

## Ownership (several builders share one folder)
- **Edit ONLY your own file:** `src/wallpaper/motifs/<id>.ts`.
- **Do not edit:** `shared.ts`, `scene3d.ts`, `scripts/*`, the modes, or other motifs.
- **Do not run** `npm run generate`, `npm test` or any git command. The coordinating session runs the gate and commits.
- **Write files only** under `spike/wallpapers/` with your `<id>` prefix.

## Report back (concise)
- Concept: 2–3 sentences, including the personal touch.
- The 5 budget rows from the contact-sheet run.
- Residual weaknesses, stated honestly.
- Paths of the full PNG and the contact sheet.
