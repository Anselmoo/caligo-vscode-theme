import { describe, expect, it } from "vitest";
import { oklch, toHex } from "../color.js";
import { requiredSeparation, SEPARATION_FLOOR, separation } from "../separation-ladder.js";
import { allocateSharedBudget, type BudgetMember } from "../shared-budget.js";

const BG = "#0b0c10";

const SYNTAX: BudgetMember[] = [
  { id: "keywords", hue: 30 },
  { id: "functions", hue: 80 },
  { id: "strings", hue: 130 },
  { id: "types", hue: 180 },
  { id: "numbers", hue: 230 },
  { id: "variables", hue: 280 },
  { id: "constants", hue: 330 },
];

/** Every member at one hue -- the single-ink case. */
const SINGLE_HUE: BudgetMember[] = SYNTAX.map((_, i) => ({ id: `role${i}`, hue: 200 }));

describe("allocateSharedBudget", () => {
  it("returns a color for every member", () => {
    const r = allocateSharedBudget(SYNTAX, [], BG);
    for (const m of SYNTAX) expect(r.colors[m.id]).toBeDefined();
  });

  it("handles an empty member list", () => {
    const r = allocateSharedBudget([], [], BG);
    expect(r.distinctCount).toBe(0);
    expect(r.merged).toEqual([]);
  });

  it("keeps each member's own hue -- allocation moves lightness, never identity", () => {
    const r = allocateSharedBudget(SYNTAX, [], BG);
    for (const m of SYNTAX) {
      // A merged member adopts its partner's colour, so only unmerged members
      // are required to keep their hue.
      if (!r.merged.includes(m.id)) expect(r.colors[m.id].h).toBeCloseTo(m.hue, 1);
    }
  });

  it("leaves no two colors closer than the distance their pairing requires", () => {
    const r = allocateSharedBudget(SYNTAX, [], BG);
    const colors = SYNTAX.map(m => r.colors[m.id]);
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const d = separation(colors[i], colors[j]);
        if (d === 0) continue; // a deliberate merge
        expect(d).toBeGreaterThanOrEqual(
          requiredSeparation(colors[i], colors[j], SEPARATION_FLOOR) - 1e-9
        );
      }
    }
  });

  it("never collapses a spread of hues to a single color", () => {
    // The regression this guards: a nudge that landed exactly on another
    // member was accepted as "resolved", folding nine roles onto one colour.
    const r = allocateSharedBudget(SYNTAX, [], BG);
    expect(r.distinctCount).toBeGreaterThan(1);
  });

  it("still affords at least two colors when every member shares one hue", () => {
    const r = allocateSharedBudget(SINGLE_HUE, [], BG);
    expect(r.distinctCount).toBeGreaterThanOrEqual(2);
  });

  it("affords fewer colors at one hue than across the wheel", () => {
    const spread = allocateSharedBudget(SYNTAX, [], BG).distinctCount;
    const single = allocateSharedBudget(SINGLE_HUE, [], BG).distinctCount;
    expect(single).toBeLessThan(spread);
  });

  it("does not delete a color in order to clear a reserved one", () => {
    // A reserved colour should displace a member, never remove it. Sitting the
    // reserved colour right on top of the palette must not shrink it to one.
    const reserved = [oklch(0.75, 0.15, 30), oklch(0.8, 0.12, 180)];
    const withReserved = allocateSharedBudget(SYNTAX, reserved, BG);
    expect(withReserved.distinctCount).toBeGreaterThan(1);
  });

  it("is deterministic for the same inputs", () => {
    const a = allocateSharedBudget(SYNTAX, [], BG);
    const b = allocateSharedBudget(SYNTAX, [], BG);
    for (const m of SYNTAX) expect(toHex(a.colors[m.id])).toBe(toHex(b.colors[m.id]));
  });

  it("reports distinctCount matching the colors it actually returned", () => {
    const r = allocateSharedBudget(SYNTAX, [], BG);
    const actual = new Set(SYNTAX.map(m => toHex(r.colors[m.id]))).size;
    expect(r.distinctCount).toBe(actual);
  });
});
