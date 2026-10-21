import type { ThemeHarmony, ThemeHarmonyId } from "../types/theme.js";

export const HARMONY_ORDER: ThemeHarmonyId[] = [
  "balanced",
  "analogous",
  "monochromatic",
  "split-complementary",
  "triadic",
];

export const HARMONY_LABELS: Record<ThemeHarmonyId, string> = {
  balanced: "Balanced",
  analogous: "Analogous",
  monochromatic: "Monochromatic",
  "split-complementary": "Split-Complementary",
  triadic: "Triadic",
};

/**
 * Hue angles (degrees from the base hue) each harmony mode places, as drawn by
 * HarmonyGlyph. Mirrors HARMONY_OFFSETS in src/lib/harmony-colors.ts, which the
 * site cannot import without pulling the palette engine into the bundle; a test
 * keeps the two equal. Balanced ("none" in the engine) spreads hues around the
 * wheel, drawn as five evenly spaced points.
 */
export const HARMONY_GLYPH_ANGLES: Record<string, readonly number[]> = {
  balanced: [0, 72, 144, 216, 288],
  analogous: [0, -30, 30],
  monochromatic: [0],
  "split-complementary": [0, 150, 210],
  triadic: [0, 120, 240],
};

/** One plain sentence per mode, for the Spectrum legend. */
export const HARMONY_MEANINGS: Record<ThemeHarmonyId, string> = {
  balanced: "Hues spread around the wheel; the most even mix.",
  analogous: "Neighbouring hues, 30° either side; calm and close.",
  monochromatic: "One hue in several lightness steps; the quietest.",
  "split-complementary": "A hue and the two beside its opposite; lively without clashing.",
  triadic: "Three hues a third of the wheel apart; the most varied.",
};

export function harmonySortIndex(id: string): number {
  const index = HARMONY_ORDER.indexOf(id as ThemeHarmonyId);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

export function normalizeHarmonyLabel(harmony: ThemeHarmony): ThemeHarmony {
  const canonicalLabel = HARMONY_LABELS[harmony.id];
  return canonicalLabel ? { ...harmony, label: canonicalLabel } : harmony;
}

export function getHarmonyLabel(id: string): string {
  return HARMONY_LABELS[id as ThemeHarmonyId] ?? id;
}

export function sortHarmonies(harmonies: ThemeHarmony[]): ThemeHarmony[] {
  return [...harmonies]
    .map(normalizeHarmonyLabel)
    .sort((a, b) => harmonySortIndex(a.id) - harmonySortIndex(b.id));
}
