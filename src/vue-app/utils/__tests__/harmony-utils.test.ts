import { describe, expect, it } from "vitest";
import type { ThemeHarmony } from "@/types/theme";
import {
  getHarmonyLabel,
  HARMONY_ICONS,
  HARMONY_LABELS,
  HARMONY_ORDER,
  harmonySortIndex,
  normalizeHarmonyLabel,
  sortHarmonies,
} from "../harmony-utils.js";

describe("HARMONY_ORDER", () => {
  it("contains all 5 harmony modes", () => {
    expect(HARMONY_ORDER).toHaveLength(5);
    expect(HARMONY_ORDER).toContain("balanced");
    expect(HARMONY_ORDER).toContain("triadic");
  });
});

describe("HARMONY_LABELS", () => {
  it("provides a label for each harmony mode", () => {
    expect(HARMONY_LABELS.balanced).toBe("Balanced");
    expect(HARMONY_LABELS.analogous).toBe("Analogous");
    expect(HARMONY_LABELS.monochromatic).toBe("Monochromatic");
    expect(HARMONY_LABELS["split-complementary"]).toBe("Split-Complementary");
    expect(HARMONY_LABELS.triadic).toBe("Triadic");
  });
});

describe("HARMONY_ICONS", () => {
  it("provides an icon for each harmony mode", () => {
    for (const id of HARMONY_ORDER) {
      expect(HARMONY_ICONS[id]).toBeDefined();
    }
  });
});

describe("harmonySortIndex", () => {
  it("returns correct index for known modes", () => {
    expect(harmonySortIndex("balanced")).toBe(0);
    expect(harmonySortIndex("analogous")).toBe(1);
    expect(harmonySortIndex("triadic")).toBe(4);
  });

  it("returns Infinity for unknown mode", () => {
    expect(harmonySortIndex("unknown")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("getHarmonyLabel", () => {
  it("returns label for known mode", () => {
    expect(getHarmonyLabel("balanced")).toBe("Balanced");
    expect(getHarmonyLabel("triadic")).toBe("Triadic");
  });

  it("falls back to the id itself for unknown mode", () => {
    expect(getHarmonyLabel("custom-mode")).toBe("custom-mode");
  });
});

describe("normalizeHarmonyLabel", () => {
  it("replaces label with canonical label for known mode", () => {
    const result = normalizeHarmonyLabel({ id: "balanced", label: "Bal" });
    expect(result.label).toBe("Balanced");
  });

  it("returns harmony unchanged for unknown id", () => {
    const harmony = { id: "custom", label: "My Custom" };
    const result = normalizeHarmonyLabel(harmony as Parameters<typeof normalizeHarmonyLabel>[0]);
    expect(result.label).toBe("My Custom");
  });
});

describe("sortHarmonies", () => {
  it("sorts harmonies by canonical order", () => {
    const unsorted: ThemeHarmony[] = [
      { id: "triadic", label: "Triadic" },
      { id: "balanced", label: "Balanced" },
      { id: "analogous", label: "Analogous" },
    ];
    const sorted = sortHarmonies(unsorted);
    expect(sorted[0].id).toBe("balanced");
    expect(sorted[1].id).toBe("analogous");
    expect(sorted[2].id).toBe("triadic");
  });

  it("places unknown modes after known ones", () => {
    // "unknown" is intentionally outside ThemeHarmonyId: this test asserts how
    // sortHarmonies copes with an id it does not recognise.
    const harmonies = [
      { id: "unknown", label: "Unknown" },
      { id: "balanced", label: "Balanced" },
    ] as unknown as ThemeHarmony[];
    const sorted = sortHarmonies(harmonies);
    expect(sorted[0].id).toBe("balanced");
    expect(sorted[1].id).toBe("unknown");
  });

  it("does not mutate the original array", () => {
    const original: ThemeHarmony[] = [
      { id: "triadic", label: "Triadic" },
      { id: "balanced", label: "Balanced" },
    ];
    const copy = [...original];
    sortHarmonies(original);
    expect(original).toEqual(copy);
  });
});
