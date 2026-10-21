/**
 * Seed → scene registry.
 *
 * Every Caligo theme (seed) ships one wallpaper scene. A scene is a procedural
 * SVG backdrop for a dark VS Code theme, built from the theme palette alone
 * (`p.colors.*`, no hex literals) and laid out from `p.viewBox`, so the same
 * function serves monitor 3840×2160, tablet 2732×2048 and portrait mobile
 * 1290×2796. It is deterministic: the same seed, mode and platform give a
 * byte-identical SVG.
 *
 * The scenes are built with the 3D method described in `spike/scene-brief.md`
 * ("The 3D method"): forms placed in world coordinates and projected through
 * one camera, surfaces shaded from their normals against one light, distance
 * haze toward the scene's air colour, and height fields drawn as adaptive
 * depth slices (`src/wallpaper/motifs/scene3d.ts`). The reference scene is
 * `motifs/mandarian.ts`; the shared colour/noise/sky toolkit is
 * `motifs/shared.ts`.
 *
 * Each scene file in `src/wallpaper/motifs/` exports two functions:
 *   - `<x>Motif(p)`   — the bare scene, no harmony-mode overlay;
 *   - `compose<X>(p)` — `<x>Motif` with `MODE_COMPOSERS[p.harmonyMode]` applied
 *                        (used by the spike harness, `scripts/wallpaper-spike.ts`).
 *
 * This registry maps to the bare `<x>Motif` functions on purpose: the real
 * pipeline (`renderer.ts → renderWallpaperSvg`) applies `MODE_COMPOSERS` itself
 * after `composeSeedWallpaper`, so registering `compose<X>` would apply the mode
 * twice. The seed → scene-file mapping mirrors `scripts/wallpaper-scenes.ts`;
 * the test `__tests__/compose.test.ts` keeps the two in step.
 */

import { auroraRefinedMotif } from "./motifs/aurora-refined.js";
import { cinderMotif } from "./motifs/cinder.js";
import { desertNightMotif } from "./motifs/desert-night.js";
import { eclipseMotif } from "./motifs/eclipse.js";
import { graphiteFluxMotif } from "./motifs/graphite-flux.js";
import { mandarianMotif } from "./motifs/mandarian.js";
import { midnightAtelierMotif } from "./motifs/midnight-atelier.js";
import { nebulaNightMotif } from "./motifs/nebula-night.js";
import { obsidianGlowMotif } from "./motifs/obsidian-glow.js";
import { voidEmberMotif } from "./motifs/void-ember.js";
import type { BrickParams, ComposedWallpaper } from "./types.js";

/** A scene without the harmony-mode overlay (the renderer adds the mode). */
export type SceneFn = (p: BrickParams) => ComposedWallpaper;

/**
 * Seed id → bare scene motif. One entry per shipped theme; the comment names
 * the scene file in `src/wallpaper/motifs/`.
 */
export const SEED_SCENES: Readonly<Record<string, SceneFn>> = {
  AuroraNoir: auroraRefinedMotif, // aurora-refined.ts   — aurora curtain over arctic tundra
  Cinder: cinderMotif, // cinder.ts           — burnt forest lit by smouldering embers
  // Swapped 2026-10-21 (user): the Mandarian palette is warm amber and suits
  // the dunes; Deep Sable is a cool blue-violet night and suits the alpine valley.
  DeepSable: mandarianMotif, // mandarian.ts        — alpine valley at dusk (3D reference)
  Eclipse: eclipseMotif, // eclipse.ts          — totality over a quiet plain
  GraphiteFlux: graphiteFluxMotif, // graphite-flux.ts    — ink-wash ranges in moonlit fog
  Mandarian: desertNightMotif, // desert-night.ts     — moonlit dunes
  MidnightAtelier: midnightAtelierMotif, // midnight-atelier.ts — full moon over a lake, one lit window
  NebulaNight: nebulaNightMotif, // nebula-night.ts     — Milky Way over a dark plain
  ObsidianGlow: obsidianGlowMotif, // obsidian-glow.ts    — basalt sea stacks in still water
  VoidEmber: voidEmberMotif, // void-ember.ts       — lava planet, volcanic towers and lava fall
};

/** Scene used for a seed id that has no entry (keeps old callers rendering). */
const FALLBACK_SCENE: SceneFn = auroraRefinedMotif;

/**
 * The bare scene for `p.seedId`, without the harmony-mode overlay. Callers
 * apply `MODE_COMPOSERS[p.harmonyMode]` themselves (see `renderer.ts`).
 */
export function composeSeedWallpaper(p: BrickParams): ComposedWallpaper {
  return (SEED_SCENES[p.seedId] ?? FALLBACK_SCENE)(p);
}
