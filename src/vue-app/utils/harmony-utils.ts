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

export const HARMONY_ICONS: Record<ThemeHarmonyId, string> = {
  balanced: "pi pi-circle-fill",
  analogous: "pi pi-sun",
  monochromatic: "pi pi-align-justify",
  "split-complementary": "pi pi-stop-circle",
  triadic: "pi pi-play",
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
