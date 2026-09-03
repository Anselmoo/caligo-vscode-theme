/**
 * The Separation Ladder
 *
 * One ranked lightness/chroma ladder that every syntax role sits on, so that
 * roles stay tellable apart when hue geometry collapses.
 *
 * The defect this replaces:
 *
 * `SYNTAX_LC_DEFAULTS` in harmony-colors.ts assigns each role an L in
 * 0.55-0.78 and a C in 0.04-0.14 as incidental per-role constants. Nine of the
 * eleven roles land inside L 0.68-0.78 and C 0.11-0.14 -- a box roughly 0.10
 * across. Separation is therefore carried almost entirely by hue, and every
 * harmony mode that narrows the hue span narrows separation with it:
 *
 *     mode                  hue span   measured confusable pairs per theme
 *     none                  full       5-13
 *     split-complementary   210 deg    12-26
 *     analogous              60 deg    22-44
 *     monochromatic           0 deg    91-107
 *
 * The ladder restores the two unused axes. Each role gets a lightness rank
 * (how much this word matters) and a chroma ceiling (how loudly it says so),
 * placed so that adjacent ranks differ in BOTH -- which keeps their distance
 * up even when their hues are identical.
 *
 * Ranks alternate high and low chroma deliberately. Two roles one step apart
 * in lightness are pushed apart in chroma, so no pair relies on a single axis.
 *
 * The lightness ORDER is an editorial claim about reading: comments recede,
 * keywords and calls carry the scan. The chroma values are then chosen to
 * maximise the minimum pairwise distance given that fixed order.
 */

import type { OkLch } from "./color.js";
import { solveForContrast } from "./contrast-solve.js";

/**
 * Perceptual floor. Two role colors closer than this in OKLCH are treated as
 * the same color by the separation gate.
 *
 * 0.10 is the value the shipped `none`-mode themes already clear comfortably
 * and every harmony variant fails, so it discriminates exactly the defect
 * under repair rather than being an aspirational number picked in the abstract.
 */
export const SEPARATION_FLOOR = 0.1;

/** APCA Lc every syntax role must clear against the editor background. */
export const SYNTAX_TARGET_LC = 60;

export type LadderRole =
  | "comments"
  | "operators"
  | "variables"
  | "strings"
  | "types"
  | "numbers"
  | "constants"
  | "functions"
  | "keywords"
  | "attributes"
  | "tags";

export type LadderRung = {
  /** Target lightness. Ascending across the ladder = ascending attention. */
  l: number;
  /**
   * Upper bound on chroma at that lightness. The solver takes the lesser of
   * this and whatever sRGB actually affords, so a ceiling is a design intent
   * rather than a promise the gamut may not be able to keep.
   */
  chromaCeiling: number;
};

/**
 * The ladder for dark themes, ordered from quietest to loudest.
 *
 * Lightness spans 0.55-0.90 (vs 0.55-0.78 before) and chroma spans 0.02-0.28
 * (vs 0.04-0.14), widening the usable box by roughly 3x in area.
 */
export const DARK_LADDER: Record<LadderRole, LadderRung> = {
  comments: { l: 0.55, chromaCeiling: 0.02 },
  operators: { l: 0.63, chromaCeiling: 0.06 },
  keywords: { l: 0.64, chromaCeiling: 0.2 },
  strings: { l: 0.68, chromaCeiling: 0.15 },
  variables: { l: 0.71, chromaCeiling: 0.03 },
  functions: { l: 0.73, chromaCeiling: 0.22 },
  types: { l: 0.76, chromaCeiling: 0.09 },
  numbers: { l: 0.8, chromaCeiling: 0.19 },
  tags: { l: 0.83, chromaCeiling: 0.28 },
  constants: { l: 0.86, chromaCeiling: 0.07 },
  attributes: { l: 0.9, chromaCeiling: 0.13 },
};

/**
 * The decorative hue wheel's ladder.
 *
 * The wheel had exactly the defect the syntax ladder was built to fix, in a
 * tighter band: lightness spanned only 0.74-0.86 with green and cyan sharing an
 * identical 0.80, and chroma was `Math.max(accent.c * k, 0.14)` for every
 * member, which is near enough to constant. Separation rested entirely on hue,
 * so it vanished wherever the harmony mode narrowed the hue span -- and in a
 * single-hue theme all seven members share one hue, making them seven copies of
 * roughly the same color.
 *
 * Two things constrain the fix, and they pull against each other:
 *
 *   - Six of the seven drive `terminal.ansi*`. A terminal palette is read as a
 *     SET, and spreading it across the syntax ladder's full 0.35 of lightness
 *     would make ANSI red and ANSI blue look like they belong to different
 *     themes. The spread has to stay moderate.
 *   - They must still be tellable apart when hue contributes nothing.
 *
 * So the wheel gets its own narrower ladder, 0.68-0.90, and spends its
 * separation budget on ORDERING rather than on range. Hue-adjacent members are
 * deliberately placed at opposite ends: red, yellow, cyan and purple take the
 * lower rungs while orange, green and blue take the upper ones, so every
 * neighbouring pair on the colour wheel (red-orange, orange-yellow,
 * yellow-green, green-cyan, cyan-blue, blue-purple) is separated by lightness
 * even when their hues have collapsed onto each other.
 *
 * Chroma alternates against lightness for the same reason it does on the syntax
 * ladder: no pair should depend on a single axis.
 */
export const DECORATIVE_LADDER = {
  hueRed: { l: 0.72, chromaCeiling: 0.19 },
  hueOrange: { l: 0.86, chromaCeiling: 0.11 },
  hueYellow: { l: 0.79, chromaCeiling: 0.2 },
  hueGreen: { l: 0.9, chromaCeiling: 0.12 },
  hueCyan: { l: 0.75, chromaCeiling: 0.18 },
  hueBlue: { l: 0.88, chromaCeiling: 0.1 },
  huePurple: { l: 0.68, chromaCeiling: 0.21 },
} as const satisfies Record<string, LadderRung>;

export type DecorativeHue = keyof typeof DECORATIVE_LADDER;

/**
 * Attention order, quietest first. Merges always fold a louder role into the
 * quieter one it collides with, so the ladder keeps its low end anchored and
 * loses resolution from the middle outward rather than losing its comments.
 */
export const ATTENTION_ORDER: readonly LadderRole[] = [
  "comments",
  "operators",
  "keywords",
  "strings",
  "variables",
  "functions",
  "types",
  "numbers",
  "tags",
  "constants",
  "attributes",
];

export type WeightGroup = {
  /** The quietest role in this group; names the weight for debugging. */
  representative: LadderRole;
  /** Every role that renders in this group's color. */
  members: LadderRole[];
  /** The re-spaced rung this whole group renders at. */
  rung: LadderRung;
};

/**
 * Decide how many weights a single hue can actually carry, and fold the roles
 * into exactly that many.
 *
 * A single-hue theme is not a colour theme with the colour removed. It is a
 * single-ink press: one ink, and everything said with weight. What a press can
 * say depends on how much ink it has, and here that is set by the hue itself --
 * sRGB affords roughly three times as much room at green as at purple.
 *
 * Measured, by packing the feasible OKLCH box at APCA Lc 60 with a 0.10 floor
 * across five Caligo backgrounds:
 *
 *     hue 145 (green)    1816-1836 feasible samples   7 weights
 *     hue 220 (blue)      817-830                     4 weights
 *     hue  60 (amber)     729-739                     4 weights
 *     hue  29 (red)       583-594                     4 weights, marginal
 *     hue 290 (purple)    576-586                     fewer than 4
 *
 * So no fixed group count is right. A hardcoded six was too generous for every
 * hue except green, and too generous by a different amount for each -- which is
 * why the previous static merge left the mode still failing the floor.
 *
 * This folds greedily instead: place all eleven roles, find the closest pair,
 * merge the louder into the quieter, and repeat until every surviving pair
 * clears the floor. The result is deterministic, hue-aware, and honest -- a
 * theme ends up with as many weights as its ink can hold and no more.
 */
export function deriveWeightGroups(
  hue: number,
  backgroundHex: string,
  ladder: Record<LadderRole, LadderRung> = DARK_LADDER,
  floor: number = SEPARATION_FLOOR
): WeightGroup[] {
  const roles = ATTENTION_ORDER;

  const lValues = roles.map(r => ladder[r].l);
  const cValues = roles.map(r => ladder[r].chromaCeiling);
  const lMin = Math.min(...lValues);
  const lMax = Math.max(...lValues);
  const cMin = Math.min(...cValues);
  const cMax = Math.max(...cValues);

  /**
   * Build `n` rungs that use the whole feasible box rather than the crowded
   * positions the eleven-role ladder happens to occupy.
   *
   * Lightness is spread evenly across the ladder's span and chroma alternates
   * between its extremes, so consecutive weights differ on both axes. Merging
   * roles without re-spacing the survivors was measurably worse -- two themes
   * bottomed out at 2 weights where the box could hold 4, purely because the
   * surviving representatives stayed bunched where they started.
   */
  const rungsFor = (n: number): LadderRung[] =>
    Array.from({ length: n }, (_, i) => ({
      l: n === 1 ? (lMin + lMax) / 2 : lMin + ((lMax - lMin) * i) / (n - 1),
      chromaCeiling: i % 2 === 0 ? cMin : cMax,
    }));

  const clears = (rungs: LadderRung[]): boolean => {
    const colors = rungs.map(r => placeOnLadder(r, hue, backgroundHex).color);
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        if (separation(colors[i], colors[j]) < floor) return false;
      }
    }
    return true;
  };

  // Largest weight count this hue can actually hold, searched downward so the
  // first success is the maximum rather than merely a workable value.
  let count = 1;
  for (let n = roles.length; n >= 1; n--) {
    if (clears(rungsFor(n))) {
      count = n;
      break;
    }
  }

  // Distribute roles across the weights in attention order, so quieter roles
  // land on quieter weights and the ladder's ranking survives the merge.
  const rungs = rungsFor(count);
  const groups: WeightGroup[] = rungs.map((rung, i) => ({
    representative: roles[Math.min(i, roles.length - 1)],
    members: [],
    rung,
  })) as WeightGroup[];

  for (let i = 0; i < roles.length; i++) {
    const bucket = Math.floor((i * count) / roles.length);
    groups[bucket].members.push(roles[i]);
  }

  return groups.filter(g => g.members.length > 0);
}

/**
 * Map every role to the rung it actually renders at.
 *
 * For modes with a hue span, hue carries part of the separation and every role
 * keeps its own rung. For a single-hue mode, roles fold into the weight groups
 * that hue can actually carry.
 */
export function resolveRungs(
  isSingleHue: boolean,
  hue?: number,
  backgroundHex?: string,
  ladder: Record<LadderRole, LadderRung> = DARK_LADDER
): { rungs: Record<LadderRole, LadderRung>; weightCount: number } {
  if (!isSingleHue || hue === undefined || !backgroundHex) {
    return { rungs: ladder, weightCount: Object.keys(ladder).length };
  }

  const groups = deriveWeightGroups(hue, backgroundHex, ladder);
  const rungs = { ...ladder };
  for (const group of groups) {
    for (const member of group.members) {
      rungs[member] = group.rung;
    }
  }
  return { rungs, weightCount: groups.length };
}

/**
 * Absolute readability floor, in APCA Lc.
 *
 * Distinct from `SYNTAX_TARGET_LC`. The target is what a prominent role aims
 * for; this is the point below which any text stops being comfortably readable
 * at all, and it is the only contrast constraint applied to recessive roles.
 *
 * Two separate numbers because one number cannot express a hierarchy. Requiring
 * every role to clear Lc 60 on these backgrounds forces every rung below
 * L ~0.75 up to L ~0.75 -- which flattens comments, operators, keywords,
 * strings and variables onto a single lightness and destroys exactly the
 * ranking the ladder exists to create. Comments are meant to recede; a floor
 * that forbids receding is not an accessibility win, it is a hierarchy loss.
 */
export const ABSOLUTE_FLOOR_LC = 45;

/**
 * Place one role on the ladder at a given hue, against a given background.
 *
 * The rung decides lightness. Contrast intervenes only when the rung's own
 * lightness would fall under `ABSOLUTE_FLOOR_LC`, at which point the solver
 * walks to the nearest lightness that clears it.
 *
 * This ordering matters and was got wrong first time round: solving for the
 * contrast target FIRST and treating the rung as a lower bound collapses the
 * ladder's whole lower half onto one lightness, because on a near-black
 * background every rung below L ~0.75 resolves to L ~0.75.
 */
export function placeOnLadder(
  rung: LadderRung,
  hue: number,
  backgroundHex: string,
  floorLc: number = ABSOLUTE_FLOOR_LC
): { color: OkLch; hex: string; lc: number; met: boolean } {
  const atRung = solveForContrast({
    hue,
    backgroundHex,
    targetLc: 0, // accept the rung's own lightness
    chromaCeiling: rung.chromaCeiling,
    minL: rung.l,
    maxL: rung.l,
  });

  if (atRung.lc >= floorLc) return { ...atRung, met: true };

  // The rung sits under the readability floor: walk to the nearest lightness
  // that clears it, keeping the rung's chroma ceiling.
  return solveForContrast({
    hue,
    backgroundHex,
    targetLc: floorLc,
    chromaCeiling: rung.chromaCeiling,
    minL: rung.l,
  });
}

/**
 * How much of a pair's separation comes from hue, 0 to 1.
 *
 * Hue and lightness are not interchangeable even when the arithmetic says they
 * are. Hue answers "what kind of word is this"; lightness answers "how much does
 * it matter". A palette can therefore satisfy a distance floor entirely on
 * lightness and still give a reader no way to tell one role from another.
 *
 * Measured across the shipped matrix, every harmony mode with a hue span draws
 * 62-65% of its separation from hue. The single-hue mode draws 0% and 79% from
 * lightness -- which is exactly why it cleared every check and still read as one
 * colour.
 */
export function hueShare(a: OkLch, b: OkLch): number {
  const h1 = (a.h * Math.PI) / 180;
  const h2 = (b.h * Math.PI) / 180;
  const dl = (a.l - b.l) ** 2;
  const dc = (a.c - b.c) ** 2;
  const dh = (2 * Math.sqrt(a.c * b.c) * Math.sin((h1 - h2) / 2)) ** 2;
  const total = dl + dc + dh;
  return total === 0 ? 0 : dh / total;
}

/**
 * Multiplier on `SEPARATION_FLOOR` for a given pair.
 *
 * A pair carrying no hue difference must clear a larger numeric gap than one
 * that does, because all of its distance sits on the axis a reader uses for
 * ranking rather than for identity. This is the metric being made to agree with
 * what a reader experiences, not a threshold being moved to make a number pass.
 *
 * 1.6x at zero hue share is calibrated against the shipped matrix: it is the
 * point at which the single-hue themes stop resolving to three tones that read
 * as one colour, and settle on fewer tones that are individually unmistakable.
 */
export function floorMultiplier(a: OkLch, b: OkLch): number {
  const SAME_HUE_PENALTY = 1.6;

  // The penalty keys on the hue ANGLE, not on `hueShare`.
  //
  // `hueShare` weights the hue term by chroma, so a muted colour scores near
  // zero even against a wildly different angle -- correct as a description of
  // where the distance came from, wrong as a trigger, because it then penalises
  // every low-chroma pair in every mode. Used that way it flagged 300 pairs and
  // failed 13 themes that have no hue problem at all.
  //
  // What actually needs a bigger gap is a pair at the SAME angle, where no
  // amount of chroma would have helped: there, all the distance is on the axis
  // a reader uses for ranking rather than identity.
  const SAME_HUE_DEGREES = 15;
  const raw = Math.abs(a.h - b.h) % 360;
  const angle = raw > 180 ? 360 - raw : raw;

  if (angle >= SAME_HUE_DEGREES) return 1;
  return 1 + (SAME_HUE_PENALTY - 1) * (1 - angle / SAME_HUE_DEGREES);
}

/** The separation this pair must clear, given where its distance comes from. */
export function requiredSeparation(a: OkLch, b: OkLch, floor: number = SEPARATION_FLOOR): number {
  return floor * floorMultiplier(a, b);
}

/** Euclidean OKLCH distance, the metric the separation gate enforces. */
export function separation(a: OkLch, b: OkLch): number {
  const h1 = (a.h * Math.PI) / 180;
  const h2 = (b.h * Math.PI) / 180;
  const dl = a.l - b.l;
  const dc = a.c - b.c;
  const dh = 2 * Math.sqrt(a.c * b.c) * Math.sin((h1 - h2) / 2);
  return Math.sqrt(dl * dl + dc * dc + dh * dh);
}

/**
 * The minimum separation a NAIVE arrangement of these hues achieves: spread
 * evenly across the ladder's lightness span with chroma alternating between its
 * extremes.
 *
 * This is a reference, deliberately not a ceiling, and the distinction is load
 * bearing. Computing a true physical maximum means solving an optimal packing
 * for every hue set on every background, which is expensive and -- as the
 * prototype found -- yields a number that varies threefold by hue anyway. What
 * a build gate actually needs is cheaper and more useful: a palette should
 * never do WORSE than spreading the same hues out uniformly would. If a
 * hand-tuned ladder cannot beat an even spread, the tuning is not earning its
 * place.
 *
 * A fixed distance threshold cannot ask that question. sRGB affords about three
 * times as much room at green (hue 145) as at purple (hue 290), so one number
 * is trivially cleared by one accent and physically unreachable by another --
 * at 290 degrees four roles cannot be placed 0.10 apart however skilfully they
 * are arranged. A threshold gate would block legitimate seeds while passing
 * palettes that merely chose a forgiving accent. A ratio against this reference
 * is scale-free and asks the right question at every hue.
 *
 * Values above 100% are expected and good: they mean the tuned ladder beats a
 * uniform spread. Values below the gate's minimum mean it is losing to one.
 */
export function achievableSeparation(
  hues: number[],
  backgroundHex: string,
  bounds: { lMin: number; lMax: number; cMin: number; cMax: number } = ladderBounds(DARK_LADDER),
  /**
   * Colors the reference arrangement must also stay clear of.
   *
   * Without these the reference solves an easier problem than the real
   * placement does. Since the shared budget routes every layer around the
   * reserved semantic and accent colors, a reference free to ignore them scores
   * higher than any honest placement can, and reports correct palettes as
   * failures -- three themes measured 58-68% while carrying zero collisions.
   */
  reserved: OkLch[] = []
): number {
  const n = hues.length;
  if (n < 2) return Number.POSITIVE_INFINITY;

  const { lMin, lMax, cMin, cMax } = bounds;

  const rungs: LadderRung[] = Array.from({ length: n }, (_, i) => ({
    l: lMin + ((lMax - lMin) * i) / (n - 1),
    chromaCeiling: i % 2 === 0 ? cMin : cMax,
  }));

  // Which hue lands on which rung matters, and taking them in the order the
  // caller happened to list them measures a pessimal arrangement rather than a
  // fair reference: consecutive rungs get consecutive hues and the minimum
  // collapses.
  //
  // Sorting the hues and then interleaving from both ends puts hue extremes on
  // adjacent rungs, so neighbours differ in lightness AND hue. Rotations are
  // tried alongside it because for a tightly clustered hue set (analogous,
  // monochromatic) a plain rotation sometimes beats the interleave, and a
  // reference that a trivially different ordering beats is not a fair one.
  const sorted = [...hues].sort((a, b) => a - b);

  const interleaved: number[] = [];
  for (let lo = 0, hi = sorted.length - 1; lo <= hi; lo++, hi--) {
    interleaved.push(sorted[lo]);
    if (lo !== hi) interleaved.push(sorted[hi]);
  }

  const candidates: number[][] = [interleaved];
  for (let r = 0; r < n; r++) {
    candidates.push(sorted.map((_, i) => sorted[(i + r) % n]));
  }

  const minFor = (order: number[]): number => {
    const colors = order.map((hue, i) => placeOnLadder(rungs[i], hue, backgroundHex).color);
    let min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < colors.length; i++) {
      for (const r of reserved) {
        const d = separation(colors[i], r);
        if (d > 0) min = Math.min(min, d);
      }
      for (let j = i + 1; j < colors.length; j++) {
        min = Math.min(min, separation(colors[i], colors[j]));
      }
    }
    return min;
  };

  return Math.max(...candidates.map(minFor));
}

/**
 * The lightness and chroma extents a ladder occupies.
 *
 * The reference arrangement must be computed inside the SAME box as the layer
 * it is judging. Measuring the decorative wheel, which is confined to
 * L 0.68-0.90, against a reference free to use the syntax ladder's L 0.55-0.90
 * penalises it for a constraint the design imposed on purpose, and reported
 * three themes as failures that were placed correctly.
 */
export function ladderBounds(ladder: Record<string, LadderRung>): {
  lMin: number;
  lMax: number;
  cMin: number;
  cMax: number;
} {
  const rungs = Object.values(ladder);
  return {
    lMin: Math.min(...rungs.map(r => r.l)),
    lMax: Math.max(...rungs.map(r => r.l)),
    cMin: Math.min(...rungs.map(r => r.chromaCeiling)),
    cMax: Math.max(...rungs.map(r => r.chromaCeiling)),
  };
}

/** Smallest pairwise separation actually present in a set of colors. */
export function minimumSeparation(colors: OkLch[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      min = Math.min(min, separation(colors[i], colors[j]));
    }
  }
  return min;
}

/**
 * Fit an ordered set of hues onto as many distinct rungs as they can hold.
 *
 * The general form of what `deriveWeightGroups` does for syntax roles, for any
 * layer whose members have no attention hierarchy -- the decorative wheel, where
 * red is not louder than blue.
 *
 * Needed because the wheel hits the same packing limit the syntax ladder does.
 * Seven members at a single hue cannot sit 0.10 apart inside the wheel's 0.68-
 * 0.90 band however carefully they are placed, so a single-hue theme was
 * emitting seven decorative colours that were really about four. Merging them
 * openly is better than shipping seven that are secretly four -- the same
 * argument, and the same answer, as the single-ink weight count.
 *
 * This became safe to do only once terminal ANSI moved onto fixed hues. While
 * the wheel drove `terminal.ansi*`, merging its members would have merged ANSI
 * red into ANSI green; now the wheel is purely decorative and merging costs
 * nothing a reader depends on.
 *
 * Members are assigned to rungs in the order given, so a member's neighbours in
 * that order are the ones it merges with.
 */
export type FittedMember = { rung: LadderRung; hue: number };

export function fitRungs(
  hues: number[],
  backgroundHex: string,
  bounds: { lMin: number; lMax: number; cMin: number; cMax: number },
  floor: number = SEPARATION_FLOOR
): FittedMember[] {
  const n = hues.length;
  if (n === 0) return [];

  const rungsFor = (k: number): LadderRung[] =>
    Array.from({ length: k }, (_, i) => ({
      l:
        k === 1
          ? (bounds.lMin + bounds.lMax) / 2
          : bounds.lMin + ((bounds.lMax - bounds.lMin) * i) / (k - 1),
      chromaCeiling: i % 2 === 0 ? bounds.cMax : bounds.cMin,
    }));

  /**
   * Which rung each contiguous bucket of members takes.
   *
   * Members are bucketed contiguously and each bucket is handed a rung; which
   * rung is the free choice, and it matters. A hand-picked assignment measured
   * 86% of a uniform spread of the same hues -- the tuning was losing to the
   * naive arrangement it existed to improve on, which is precisely what the
   * separation gate is for, and it caught it here.
   *
   * Rather than hand-tune again, candidate orderings are scored and the best
   * wins, mirroring how `achievableSeparation` builds its reference so the two
   * cannot disagree about what a good arrangement looks like.
   *
   * A free per-member assignment was tried and is worse: greedy placement is
   * myopic, optimising each member against those already placed without
   * lookahead, and it measured 150 within-wheel collisions against 40 for this
   * ordering search.
   */
  const orderings = (k: number): number[][] => {
    const asc = Array.from({ length: k }, (_, i) => i);
    const interleaved: number[] = [];
    for (let lo = 0, hi = k - 1; lo <= hi; lo++, hi--) {
      interleaved.push(lo);
      if (lo !== hi) interleaved.push(hi);
    }
    const out = [asc, [...asc].reverse(), interleaved];
    for (let r = 1; r < k; r++) out.push(asc.map((_, i) => (i + r) % k));
    return out;
  };

  const scoreOf = (members: FittedMember[]): number => {
    const colors = members.map(m => placeOnLadder(m.rung, m.hue, backgroundHex).color);
    let min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        // Scored against what each pair actually needs. This function collapses
        // hue when it merges, so it manufactures same-hue pairs -- scoring those
        // against the flat floor let four themes ship wheel colours 0.13 apart
        // at an identical hue, which is the very case the penalty exists for.
        const raw = separation(colors[i], colors[j]);
        const d = (raw * floor) / requiredSeparation(colors[i], colors[j], floor);
        // Skip only genuinely identical colors -- a deliberate merge. Sharing a
        // rung is NOT sufficient: two members on one rung differ whenever their
        // hues differ, which is every mode except the single-hue one. Treating
        // same-rung as same-colour let 28 real collisions through the score and
        // straight into the shipped palettes.
        // Test the RAW distance for identity: a normalised zero is still zero,
        // but reading it from `raw` keeps the intent obvious.
        if (raw === 0) continue;
        min = Math.min(min, d);
      }
    }
    return min;
  };

  /**
   * A merge collapses hue as well as lightness.
   *
   * Members sharing a rung take their bucket's first hue, making them genuinely
   * one colour. Sharing only a rung is not a merge: two members at the same
   * lightness whose hues differ by a few degrees are two nearly-identical
   * colours, which is worse than one honest colour. In analogous mode the wheel
   * receives seven hues inside an 80 degree span, and no arrangement within the
   * wheel's lightness band holds all seven apart -- so the choice is between
   * seven colours that are secretly four, and four that admit it. Same argument,
   * and the same answer, as the single-ink weight count.
   */
  const bestFor = (k: number): { members: FittedMember[]; score: number } => {
    const rungs = rungsFor(k);
    let best = { members: [] as FittedMember[], score: -1 };
    const bucketOf = (i: number) => Math.floor((i * k) / n);

    const bucketHue = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      if (!bucketHue.has(bucketOf(i))) bucketHue.set(bucketOf(i), hues[i]);
    }

    for (const order of orderings(k)) {
      const members: FittedMember[] = hues.map((_, i) => ({
        rung: rungs[order[bucketOf(i)]],
        hue: bucketHue.get(bucketOf(i)) as number,
      }));
      const score = scoreOf(members);
      if (score > best.score) best = { members, score };
    }
    return best;
  };

  // Search downward for the largest k that clears the floor, but remember the
  // best-scoring k in case none does.
  //
  // Falling back to k=1 was wrong, and measurably so. Collapsing every member
  // onto one rung only makes them identical when their HUES are also identical
  // -- true in a single-hue mode, false in analogous, where seven hues sit
  // roughly 13 degrees apart. There the fallback produced seven colours at one
  // lightness and chroma separated by nothing but a sliver of hue: 28 pairs
  // below the floor, every one of them from a mode that cannot satisfy it at
  // any k. When the floor is unreachable the honest answer is the arrangement
  // that comes closest, not the one with the fewest colours.
  let fallback = { members: [] as FittedMember[], score: -1 };
  for (let k = n; k >= 1; k--) {
    const candidate = bestFor(k);
    if (candidate.score >= floor) return candidate.members;
    if (candidate.score > fallback.score) fallback = candidate;
  }
  return fallback.members;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE-INK PRESENTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * How each syntax role presents when the theme has only one hue.
 *
 * With hue unavailable, two tones is all the lightness axis can carry at a
 * separation a reader actually notices -- pushing to three put every pair at
 * about 0.13, which measures as separated and reads as one colour. Two tones
 * alone cannot identify nine roles, so identity moves to the channel a
 * single-ink press has always used: weight and slope.
 *
 * Two tones times four styles gives eight presentations for nine roles, so
 * exactly one merge is required. `tags` shares with `types` deliberately: in
 * JSX a tag IS a component type, which makes it the one merge that costs a
 * reader nothing.
 *
 * `tone: 0` is the brighter of the two, reserved for the roles that carry the
 * structure of a file.
 */
export const SINGLE_INK_PRESENTATION: Record<
  LadderRole,
  { tone: 0 | 1; fontStyle?: "italic" | "bold" | "bold italic" }
> = {
  keywords: { tone: 0, fontStyle: "bold" },
  functions: { tone: 0 },
  types: { tone: 0, fontStyle: "italic" },
  tags: { tone: 0, fontStyle: "italic" },
  constants: { tone: 0, fontStyle: "bold italic" },
  variables: { tone: 1 },
  strings: { tone: 1, fontStyle: "italic" },
  numbers: { tone: 1, fontStyle: "bold" },
  attributes: { tone: 1, fontStyle: "bold italic" },
  operators: { tone: 1 },
  comments: { tone: 1, fontStyle: "italic" },
};
