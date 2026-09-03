import { describe, expect, it } from "vitest";
import { oklch } from "../color.js";
import { apcaLc } from "../contrast-solve.js";
import {
  ABSOLUTE_FLOOR_LC,
  ATTENTION_ORDER,
  achievableSeparation,
  DARK_LADDER,
  DECORATIVE_LADDER,
  deriveWeightGroups,
  fitRungs,
  floorMultiplier,
  hueShare,
  ladderBounds,
  minimumSeparation,
  placeOnLadder,
  requiredSeparation,
  resolveRungs,
  SEPARATION_FLOOR,
  SINGLE_INK_PRESENTATION,
  separation,
} from "../separation-ladder.js";

const BG = "#0b0c10";

describe("hueShare", () => {
  it("is zero when two colors share a hue", () => {
    expect(hueShare(oklch(0.6, 0.15, 200), oklch(0.9, 0.1, 200))).toBe(0);
  });

  it("dominates when two vivid colors differ only in hue", () => {
    expect(hueShare(oklch(0.7, 0.2, 30), oklch(0.7, 0.2, 210))).toBeGreaterThan(0.9);
  });

  it("is zero for a pair with no chroma to carry hue", () => {
    expect(hueShare(oklch(0.5, 0, 30), oklch(0.8, 0, 210))).toBe(0);
  });
});

describe("floorMultiplier", () => {
  it("penalises a same-hue pair, which has no channel for identity", () => {
    expect(floorMultiplier(oklch(0.6, 0.15, 200), oklch(0.9, 0.1, 200))).toBeCloseTo(1.6, 5);
  });

  it("leaves a pair with real hue separation at the plain floor", () => {
    expect(floorMultiplier(oklch(0.7, 0.2, 30), oklch(0.7, 0.2, 210))).toBe(1);
  });

  it("treats hue as circular, so 350 and 10 degrees are 20 apart and unpenalised", () => {
    expect(floorMultiplier(oklch(0.7, 0.2, 350), oklch(0.7, 0.2, 10))).toBe(1);
  });

  it("tapers between the two, never dipping below the plain floor", () => {
    const near = floorMultiplier(oklch(0.7, 0.2, 100), oklch(0.7, 0.2, 107));
    expect(near).toBeGreaterThan(1);
    expect(near).toBeLessThan(1.6);
  });
});

describe("requiredSeparation", () => {
  it("asks more of a same-hue pair than of one carrying hue", () => {
    const sameHue = requiredSeparation(oklch(0.6, 0.15, 200), oklch(0.9, 0.1, 200));
    const crossHue = requiredSeparation(oklch(0.7, 0.2, 30), oklch(0.7, 0.2, 210));
    expect(sameHue).toBeGreaterThan(crossHue);
    expect(crossHue).toBeCloseTo(SEPARATION_FLOOR, 5);
  });
});

describe("separation", () => {
  it("is zero for identical colors and symmetric otherwise", () => {
    const a = oklch(0.7, 0.15, 40);
    const b = oklch(0.8, 0.1, 200);
    expect(separation(a, a)).toBe(0);
    expect(separation(a, b)).toBeCloseTo(separation(b, a), 10);
  });
});

describe("minimumSeparation", () => {
  it("reports no constraint when there is nothing to tell apart", () => {
    expect(minimumSeparation([])).toBe(Number.POSITIVE_INFINITY);
    expect(minimumSeparation([oklch(0.7, 0.1, 0)])).toBe(Number.POSITIVE_INFINITY);
  });

  it("finds the closest pair rather than the first", () => {
    const colors = [oklch(0.5, 0.1, 0), oklch(0.9, 0.1, 0), oklch(0.52, 0.1, 0)];
    expect(minimumSeparation(colors)).toBeCloseTo(0.02, 3);
  });
});

describe("ladderBounds", () => {
  it("reports the extents a ladder actually occupies", () => {
    const b = ladderBounds(DECORATIVE_LADDER);
    const ls = Object.values(DECORATIVE_LADDER).map(r => r.l);
    expect(b.lMin).toBe(Math.min(...ls));
    expect(b.lMax).toBe(Math.max(...ls));
    expect(b.cMin).toBeLessThanOrEqual(b.cMax);
  });
});

describe("achievableSeparation", () => {
  it("reports no constraint for fewer than two hues", () => {
    expect(achievableSeparation([], BG)).toBe(Number.POSITIVE_INFINITY);
    expect(achievableSeparation([200], BG)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns a real reference for a spread of hues", () => {
    const ref = achievableSeparation([30, 120, 210, 300], BG);
    expect(ref).toBeGreaterThan(0);
    expect(Number.isFinite(ref)).toBe(true);
  });

  it("is lower at a single hue than across the wheel, since hue cannot help", () => {
    const oneHue = achievableSeparation([200, 200, 200, 200], BG);
    const spread = achievableSeparation([30, 120, 210, 300], BG);
    expect(oneHue).toBeLessThan(spread);
  });

  it("drops when reserved colors must also be avoided", () => {
    const hues = [30, 120, 210, 300];
    const free = achievableSeparation(hues, BG);
    const constrained = achievableSeparation(hues, BG, ladderBounds(DARK_LADDER), [
      oklch(0.78, 0.13, 30),
    ]);
    expect(constrained).toBeLessThanOrEqual(free);
  });
});

describe("placeOnLadder", () => {
  it("keeps the requested hue", () => {
    const placed = placeOnLadder({ l: 0.75, chromaCeiling: 0.15 }, 145, BG);
    expect(placed.color.h).toBeCloseTo(145, 5);
  });

  it("never returns a color under the absolute readability floor", () => {
    for (const hue of [29, 90, 145, 220, 290]) {
      const placed = placeOnLadder({ l: 0.2, chromaCeiling: 0.2 }, hue, BG);
      expect(apcaLc(placed.hex, BG)).toBeGreaterThanOrEqual(ABSOLUTE_FLOOR_LC - 1);
    }
  });

  it("respects the rung's chroma ceiling", () => {
    const placed = placeOnLadder({ l: 0.75, chromaCeiling: 0.05 }, 145, BG);
    expect(placed.color.c).toBeLessThanOrEqual(0.05 + 1e-9);
  });
});

describe("fitRungs", () => {
  const bounds = ladderBounds(DECORATIVE_LADDER);

  it("returns exactly one placement per member", () => {
    const hues = [0, 60, 120, 180, 240, 300];
    expect(fitRungs(hues, BG, bounds)).toHaveLength(hues.length);
  });

  it("handles an empty member list", () => {
    expect(fitRungs([], BG, bounds)).toEqual([]);
  });

  it("collapses hue when it merges, so a merge is one honest color not two near ones", () => {
    // Seven members at a single hue cannot all separate; some must merge.
    const fitted = fitRungs([200, 200, 200, 200, 200, 200, 200], BG, bounds);
    const groups = new Map<string, number>();
    for (const m of fitted) {
      const key = `${m.rung.l}|${m.rung.chromaCeiling}|${m.hue}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    // Members sharing a rung must also share a hue -- otherwise they would be
    // two nearly-identical colours rather than one deliberate merge.
    for (const m of fitted) {
      const sameRung = fitted.filter(o => o.rung === m.rung);
      expect(new Set(sameRung.map(o => o.hue)).size).toBe(1);
    }
    expect(groups.size).toBeLessThanOrEqual(fitted.length);
  });
});

describe("deriveWeightGroups", () => {
  it("assigns every syntax role exactly once", () => {
    const groups = deriveWeightGroups(200, BG);
    const members = groups.flatMap(g => g.members);
    expect(new Set(members).size).toBe(members.length);
    for (const role of ATTENTION_ORDER) expect(members).toContain(role);
  });

  it("never produces an empty group", () => {
    for (const hue of [29, 145, 290]) {
      for (const g of deriveWeightGroups(hue, BG)) {
        expect(g.members.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("resolveRungs", () => {
  it("gives every role its own rung when hue can carry identity", () => {
    const { rungs, weightCount } = resolveRungs(false);
    expect(weightCount).toBe(Object.keys(DARK_LADDER).length);
    expect(rungs.comments).toBe(DARK_LADDER.comments);
  });

  it("folds roles onto shared rungs at a single hue", () => {
    const { weightCount } = resolveRungs(true, 200, BG);
    expect(weightCount).toBeGreaterThan(0);
    expect(weightCount).toBeLessThan(Object.keys(DARK_LADDER).length);
  });
});

describe("SINGLE_INK_PRESENTATION", () => {
  it("covers every ladder role", () => {
    for (const role of ATTENTION_ORDER) {
      expect(SINGLE_INK_PRESENTATION[role]).toBeDefined();
    }
  });

  it("gives the nine allocated syntax roles distinct tone-and-style pairings", () => {
    const roles = [
      "keywords",
      "functions",
      "strings",
      "types",
      "numbers",
      "variables",
      "constants",
      "tags",
      "attributes",
    ] as const;
    const seen = roles.map(r => {
      const p = SINGLE_INK_PRESENTATION[r];
      return `${p.tone}|${p.fontStyle ?? "regular"}`;
    });
    // Two tones times four styles is eight slots for nine roles, so exactly one
    // pairing is shared -- tags with types, since a JSX tag is a component type.
    expect(new Set(seen).size).toBe(8);
  });
});
