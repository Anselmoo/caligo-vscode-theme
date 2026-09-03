/**
 * One shared colour budget across every layer.
 *
 * Caligo grew four independent colour generators -- the syntax ladder, the
 * decorative wheel, the semantic palette and the accent variants -- and each was
 * made internally well-spread without any of them knowing the others existed.
 * Measured across 50 themes, that left every layer clean on its own (syntax 31
 * collisions, wheel 0, semantic 30) while 88% of all remaining collisions were
 * between layers: syntax against wheel 438, accent against wheel 248, accent
 * against syntax 168, semantic against syntax 151.
 *
 * The cause is arithmetic, not tuning. Nineteen colours each needing a
 * perceptual radius of 0.05 do not fit the feasible OKLCH box for a dark theme
 * unless their hues are genuinely spread, and harmony modes exist precisely to
 * narrow hue spread. Four allocators dividing one budget with no shared ledger
 * will overspend it.
 *
 * Two extremes were measured and both rejected. Collapsing hue whenever members
 * merge drives collisions to 37 but leaves 5.0 distinct colours per theme --
 * near-monochrome. Preserving every hue and reallocating only lightness leaves
 * 15.1 colours but 1091 collisions, barely better than doing nothing.
 *
 * What ships is the middle: allocate lightness and chroma globally, keep every
 * member's own hue, then merge ONLY the pairs that still collide, cheapest
 * first. That lands at 30 collisions and 7.2 distinct colours -- which, with the
 * four reserved semantic colours, is about 11 per theme, in the same range as
 * Dracula (~9) and One Dark (~8). The palette that shipped before had more
 * colours than either, and they were not distinguishable.
 */

import { type OkLch, toHex } from "./color.js";
import {
  placeOnLadder,
  requiredSeparation,
  SEPARATION_FLOOR,
  separation,
} from "./separation-ladder.js";

/** The whole feasible lightness/chroma box, shared by every layer. */
const BUDGET_BOUNDS = { lMin: 0.55, lMax: 0.92, cMin: 0.02, cMax: 0.28 };

/**
 * Least chroma any budgeted colour may be given.
 *
 * Deliberately well above the box's cMin. Chroma near 0.02 is grey, and grey is
 * correct for a comment but not for a keyword. The first version of this
 * allocator alternated rung chroma between the box extremes and let the
 * separation search assign them freely -- it hit zero collisions while putting
 * `keyword.control`, `storage.type`, `support.type` and `entity.name.type` all
 * on #bfcabf, a desaturated grey-green. Every measurement passed and the theme
 * looked broken, which is what a screenshot catches and a metric does not.
 *
 * Comments and operators are not budgeted here; they take their muted colour
 * from `fgMuted` directly, so nothing in this set needs to be grey.
 */
const CHROMA_FLOOR = 0.12;

export type BudgetMember = {
  /** Stable identifier, for debugging and for tests to assert against. */
  id: string;
  /** The member's own hue. Never reassigned. */
  hue: number;
};

export type BudgetResult = {
  colors: Record<string, OkLch>;
  /** How many distinct colours the budget could afford. */
  distinctCount: number;
  /** Members that ended up sharing another member's colour. */
  merged: string[];
};

/**
 * Which bucket each member falls in, when only `k` colours are affordable.
 *
 * The first k-1 members each get a bucket to themselves and everything from
 * there on shares the last one. Spreading members evenly across buckets --
 * `floor(i * k / n)` -- looks fairer and is exactly wrong: it groups members of
 * ADJACENT priority, so the highest-priority roles are the first to be merged
 * with each other. Measured, that put `keyword.control`, `storage.type`,
 * `entity.name.function`, `variable` and `string` all on one colour in
 * analogous themes, and all eight sampled roles on one colour in single-hue
 * themes, while the distinct colours it did produce went to rarely-seen scopes.
 *
 * Members arrive in priority order, so folding the tail keeps the roles a
 * reader actually scans for and merges the decorative ones nobody distinguishes
 * by name.
 */
function bucketAssignment(k: number, _n: number): (i: number) => number {
  return (i: number) => Math.min(i, k - 1);
}

/**
 * The lowest lightness this background actually allows.
 *
 * `placeOnLadder` raises any rung that falls under the readability floor, so on
 * a dark ground the bottom of the nominal range is not reachable: against
 * #001519 everything below L 0.66 is clamped to 0.66. Spreading steps over
 * 0.55-0.92 regardless piles the low buckets on top of each other -- at four
 * buckets the bottom two both resolved to L 0.66, a separation of 0.019, and
 * the search then fell back to two colours for a mode that advertises four.
 *
 * Probing the real floor and spreading over what remains costs nothing and
 * recovers the whole bottom third of the ladder.
 */
function effectiveLMin(hues: number[], backgroundHex: string): number {
  let floor = BUDGET_BOUNDS.lMin;
  for (const hue of hues) {
    const probe = placeOnLadder(
      { l: BUDGET_BOUNDS.lMin, chromaCeiling: BUDGET_BOUNDS.cMax },
      hue,
      backgroundHex
    ).color;
    floor = Math.max(floor, probe.l);
  }
  return Math.min(floor, BUDGET_BOUNDS.lMax - 0.05);
}

/** Evenly spaced lightness steps across the usable part of the box. */
function lightnessSteps(k: number, lMin: number): number[] {
  const { lMax } = BUDGET_BOUNDS;
  return Array.from({ length: k }, (_, i) =>
    k === 1 ? (lMin + lMax) / 2 : lMin + ((lMax - lMin) * i) / (k - 1)
  );
}

/**
 * Chroma for a bucket, by PRIORITY rather than by rung.
 *
 * Members arrive in priority order, so bucket 0 holds the roles a reader most
 * needs to pick out and gets the most saturation, falling to `CHROMA_FLOOR` at
 * the last bucket. Lightness is what the separation search is free to allocate;
 * chroma is not, because "which roles get to be vivid" is a design decision and
 * an optimiser told only to maximise distance will answer it arbitrarily.
 */
function chromaForBucket(bucket: number, _k: number): number {
  // Alternate between a vivid and a medium chroma.
  //
  // Alternation is what separates: two members one lightness step apart are
  // pulled further apart by differing in chroma too, and without it far fewer
  // colours fit -- a monotonic ramp by priority dropped single-hue themes to
  // 1.5 distinct colours.
  //
  // The low value is 0.12, not the box's 0.02. The first version alternated
  // between the box extremes, which separated well but made every second member
  // grey: `keyword.control`, `storage.type`, `support.type` and
  // `entity.name.type` all landed on the same desaturated #bfcabf. Every metric
  // passed and the theme looked broken. 0.12 still reads as a colour, and the
  // 0.16 gap to 0.28 is ample for separation.
  return bucket % 2 === 0 ? BUDGET_BOUNDS.cMax : CHROMA_FLOOR;
}

function orderings(k: number): number[][] {
  const asc = Array.from({ length: k }, (_, i) => i);
  const interleaved: number[] = [];
  for (let lo = 0, hi = k - 1; lo <= hi; lo++, hi--) {
    interleaved.push(lo);
    if (lo !== hi) interleaved.push(hi);
  }
  const out = [asc, [...asc].reverse(), interleaved];
  for (let r = 1; r < k; r++) out.push(asc.map((_, i) => (i + r) % k));
  return out;
}

/**
 * Allocate colours for `members` against a background, keeping clear of
 * `reserved`.
 *
 * Members are listed in priority order: when two collide, the LATER one folds
 * onto the earlier one's colour. Callers should therefore list the roles whose
 * distinctness matters most to a reader first.
 *
 * `reserved` colours are never moved or merged. They are the semantic palette:
 * a reader cannot opt out of an error being red, so the semantic layer spends
 * from the budget first and everything else fits around it.
 */
export function allocateSharedBudget(
  members: BudgetMember[],
  reserved: OkLch[],
  backgroundHex: string,
  floor: number = SEPARATION_FLOOR
): BudgetResult {
  const n = members.length;
  if (n === 0) return { colors: {}, distinctCount: 0, merged: [] };

  const hues = members.map(m => m.hue);

  /**
   * Smallest separation among the DISTINCT colours an arrangement produces.
   *
   * Returns 0, not Infinity, when an arrangement collapses to a single colour.
   * Skipping identical pairs is right -- they are deliberate merges -- but if
   * that skip is allowed to skip *everything*, total collapse scores Infinity
   * and beats every real arrangement. That is exactly what happened: single-hue
   * themes lost their entire weight ladder because k=1 makes every colour
   * identical and therefore "perfect".
   *
   * Reserved colours are deliberately NOT part of this score; the resolution
   * pass below handles them by displacement.
   *
   * Folding them in was measured and is worse. Because the score is a minimum
   * over every pair, adding reserved pairs drags it down for arrangements that
   * are internally excellent, so fewer values of k clear the floor and the
   * fallback picks by a number that no longer reflects internal spread. Doing
   * that tripled the internal violations it was meant to prevent, from 67 to
   * 164 across the matrix, and raised proximity-to-semantic too.
   *
   * A reserved colour should displace a member, never decide the arrangement.
   */
  const scoreOf = (placed: OkLch[]): number => {
    let min = Number.POSITIVE_INFINITY;
    let sawDistinctPair = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const d = separation(placed[i], placed[j]);
        if (d > 0) {
          sawDistinctPair = true;
          // Score each pair against the distance IT needs, not a flat number.
          // A same-hue pair must clear more, so scaling here makes the search
          // prefer arrangements that read as separate rather than merely
          // measure as separate.
          min = Math.min(min, (d * floor) / requiredSeparation(placed[i], placed[j], floor));
        }
      }
    }
    return sawDistinctPair ? min : 0;
  };

  // Step 1: allocate lightness and chroma across the whole budget at once,
  // searching downward for the largest number of rungs that works and keeping
  // the best-scoring arrangement if none clears the floor outright.
  // Take the LARGEST k that clears the floor, comparing arrangements only
  // within a k. Comparing across k lets a smaller, more-collapsed arrangement
  // win on score alone, which is the wrong trade -- more distinct colours at
  // the floor always beats fewer colours further apart.
  let best: { placed: OkLch[]; score: number } = { placed: [], score: -1 };
  let fallback: { placed: OkLch[]; score: number } = { placed: [], score: -1 };

  const lMin = effectiveLMin(hues, backgroundHex);

  for (let k = n; k >= 1; k--) {
    const steps = lightnessSteps(k, lMin);
    const bucketOf = bucketAssignment(k, n);

    let bestForK: { placed: OkLch[]; score: number } = { placed: [], score: -1 };
    for (const order of orderings(k)) {
      const placed = hues.map((hue, i) => {
        const bucket = bucketOf(i);
        // Lightness is permuted by the search; chroma is fixed by priority.
        const rung = { l: steps[order[bucket]], chromaCeiling: chromaForBucket(bucket, k) };
        return placeOnLadder(rung, hue, backgroundHex).color;
      });
      const score = scoreOf(placed);
      if (score > bestForK.score) bestForK = { placed, score };
    }

    if (bestForK.score >= floor) {
      best = bestForK;
      break;
    }
    if (bestForK.score > fallback.score) fallback = bestForK;
  }

  if (best.score < 0) best = fallback;

  const placed = [...best.placed];

  /**
   * The floor the resolution pass enforces.
   *
   * `floor` for member-vs-member pairs: merging two colours that are too close
   * removes the pair outright, so it always helps, and capping this at the best
   * score the search reached only left known-bad pairs in place.
   *
   * Reserved proximity is different and is handled separately below -- there,
   * merging deletes a colour without fixing the proximity, so it is never done.
   */
  const workingFloor = floor;

  const merged: string[] = [];
  // Members whose proximity to a reserved colour could not be resolved by
  // nudging. Recorded so the loop stops retrying them, and left as-is.
  const resolvedAgainstReserved = new Set<number>();
  // Generous: each pass resolves one pair, and a merge can expose the next one
  // behind it. n*6 left eleven near-misses unresolved across the matrix, all
  // within 0.012 of the floor -- the loop was simply stopping early.
  const MAX_RESOLUTIONS = n * n + 40;

  // Pass 1: member against member. These are the pairs the gate holds to zero,
  // so they are resolved first and to completion. Merging removes the pair
  // outright, so this always terminates.
  for (let guard = 0; guard < MAX_RESOLUTIONS; guard++) {
    let worst = { i: -1, j: -1, deficit: 1 };
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const d = separation(placed[i], placed[j]);
        const deficit = d / requiredSeparation(placed[i], placed[j], workingFloor);
        if (d > 0 && deficit < worst.deficit) worst = { i, j, deficit };
      }
    }
    if (worst.i === -1) break;
    // members are in priority order, and j > i, so the lower-priority member
    // folds onto the higher-priority one.
    placed[worst.j] = placed[worst.i];
    merged.push(members[worst.j].id);
  }

  // Pass 2: member against reserved, by displacement only.
  //
  // Separate from pass 1 and strictly after it. Interleaving the two let a
  // reserved conflict be re-selected every iteration -- a successful nudge does
  // not retire a member, so the loop cycled on reserved proximity and consumed
  // every iteration before reaching a member pair it was supposed to merge,
  // leaving known violations in shipped themes with an empty merge list.
  for (let guard = 0; guard < MAX_RESOLUTIONS; guard++) {
    let worst = { i: -1, deficit: 1 };
    for (let i = 0; i < placed.length; i++) {
      if (resolvedAgainstReserved.has(i)) continue;
      for (const r of reserved) {
        const d = separation(placed[i], r);
        const deficit = d / requiredSeparation(placed[i], r, workingFloor);
        // No `d > 0` guard here. An exact identity with a reserved colour has
        // deficit 0 -- the worst possible case -- and guarding it out meant the
        // one case most needing repair was the one case never selected for it.
        if (deficit < worst.deficit) worst = { i, deficit };
      }
    }
    if (worst.i === -1) break;

    // Move the member's whole COLOUR GROUP, and only to a strictly better spot.
    //
    // Three rules, each earning its place:
    //
    // 1. Group move. Pass 1 merges members deliberately; displacing one member
    //    out of a merge would silently re-create the violation pass 1 resolved.
    //    Everything currently sharing this colour moves together.
    //
    // 2. No zero-distance exception. The previous check read
    //    `separation(candidate, c) === 0 || ...`, intended to tolerate a merge
    //    pass 1 made on purpose. It cannot tell "this is my own merge partner"
    //    from "my nudge just landed on someone else", and the latter is what
    //    happened: a member walked down the lightness grid until the gamut
    //    aliased its colour onto another bucket's exact value, and the clause
    //    accepted it as resolved. Three single-hue themes shipped one ink
    //    because of it. Comparing against DISTINCT colours other than the
    //    group's own serves the original intent correctly.
    //
    // 3. Strict improvement. Taking the first acceptable candidate let a barely
    //    legal position win over simply staying put.
    const groupHex = toHex(placed[worst.i]);
    const group = placed.map((c, ix) => (toHex(c) === groupHex ? ix : -1)).filter(ix => ix >= 0);

    const scoreAt = (candidate: OkLch): number => {
      let min = Number.POSITIVE_INFINITY;
      for (const r of reserved) {
        min = Math.min(
          min,
          separation(candidate, r) / requiredSeparation(candidate, r, workingFloor)
        );
      }
      for (let ix = 0; ix < placed.length; ix++) {
        if (group.includes(ix)) continue;
        const d = separation(candidate, placed[ix]);
        // Landing on another colour deletes an ink. Never acceptable.
        if (d === 0) return Number.NEGATIVE_INFINITY;
        // Nor may a nudge introduce a member-vs-member violation. Pass 1
        // resolved those to zero, and a position that trades a reserved
        // proximity for a member collision is not an improvement -- member
        // pairs are what the gate holds to zero, reserved proximity is not.
        if (d < requiredSeparation(candidate, placed[ix], workingFloor)) {
          return Number.NEGATIVE_INFINITY;
        }
        min = Math.min(min, d / requiredSeparation(candidate, placed[ix], workingFloor));
      }
      return min;
    };

    const current = scoreAt(placed[worst.i]);
    let bestCandidate: OkLch | null = null;
    let bestScore = current;

    const deltas: number[] = [];
    for (let step = 0.03; step <= 0.3 + 1e-9; step += 0.03) deltas.push(step, -step);

    for (const dl of deltas) {
      for (const chromaCeiling of [BUDGET_BOUNDS.cMax, CHROMA_FLOOR]) {
        const l = Math.max(
          BUDGET_BOUNDS.lMin,
          Math.min(BUDGET_BOUNDS.lMax, placed[worst.i].l + dl)
        );
        const candidate = placeOnLadder({ l, chromaCeiling }, hues[worst.i], backgroundHex).color;
        const score = scoreAt(candidate);
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      for (const ix of group) placed[ix] = bestCandidate;
    }

    // Retire the member either way: moved, or unresolvable and left in place.
    // A member is never folded onto another to fix reserved proximity -- that
    // deletes a colour without fixing anything, and on single-hue themes it
    // collapsed nine roles to one.
    for (const ix of group) resolvedAgainstReserved.add(ix);
  }

  const colors: Record<string, OkLch> = {};
  members.forEach((m, i) => {
    colors[m.id] = placed[i];
  });

  return {
    colors,
    distinctCount: new Set(placed.map(c => toHex(c))).size,
    merged,
  };
}
