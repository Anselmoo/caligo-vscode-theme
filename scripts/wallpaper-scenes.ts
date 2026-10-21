/**
 * The ten Caligo scene motifs — one per theme — shared by the spike harness
 * and the gate. A variant of a scene lives next to it as
 * `src/wallpaper/motifs/<id>.v-<x>.ts` and exports the same function name.
 */
export interface SceneEntry {
  /** Motif file stem in src/wallpaper/motifs/. */
  id: string;
  /** Theme / seed id. */
  seed: string;
  /** Exported compose function name. */
  exportName: string;
}

export const SCENES: SceneEntry[] = [
  { id: "aurora-refined", seed: "AuroraNoir", exportName: "composeAuroraRefined" },
  // Seed swap 2026-10-21 (user): the dunes take Mandarian's warm amber
  // palette, the alpine valley takes Deep Sable's cool blue night.
  { id: "desert-night", seed: "Mandarian", exportName: "composeDesertNight" },
  { id: "graphite-flux", seed: "GraphiteFlux", exportName: "composeGraphiteFlux" },
  { id: "eclipse", seed: "Eclipse", exportName: "composeEclipse" },
  { id: "midnight-atelier", seed: "MidnightAtelier", exportName: "composeMidnightAtelier" },
  { id: "nebula-night", seed: "NebulaNight", exportName: "composeNebulaNight" },
  { id: "void-ember", seed: "VoidEmber", exportName: "composeVoidEmber" },
  { id: "cinder", seed: "Cinder", exportName: "composeCinder" },
  { id: "obsidian-glow", seed: "ObsidianGlow", exportName: "composeObsidianGlow" },
  { id: "mandarian", seed: "DeepSable", exportName: "composeMandarian" },
];

export const ALL_MODES = ["none", "analogous", "split-complementary", "monochromatic", "triadic"];

export const HARMONY_TO_THEME: Record<string, string> = {
  none: "Balanced",
  analogous: "Analogous",
  monochromatic: "Monochromatic",
  triadic: "Triadic",
  "split-complementary": "SplitComplementary",
};
