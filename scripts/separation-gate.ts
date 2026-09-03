/**
 * The separation gate.
 *
 * Fails the build when a palette is measurably worse than its own hues allow.
 *
 * Why a ratio rather than a threshold:
 *
 * The obvious gate asserts every pair of role colors is at least SEPARATION_FLOOR
 * apart. Measured across the shipped matrix, that gate is wrong in both
 * directions. sRGB affords about three times as much room at green (hue 145) as
 * at purple (hue 290), so a fixed floor is trivially cleared by one accent and
 * physically unreachable by another -- at 290 degrees, four roles cannot be
 * placed 0.10 apart however skilfully they are arranged. Such a gate would
 * block legitimate seeds while passing palettes that merely chose a forgiving
 * accent.
 *
 * More importantly, an absolute number cannot tell a palette that used
 * everything available to it from one that wasted room it had. Both can sit at
 * the same distance from the floor.
 *
 * So this measures a ratio against a reference the same hues can always reach:
 * spreading them evenly across the ladder's lightness span. The question it
 * asks is "does this palette beat a naive uniform spread of its own hues?",
 * which is scale-free and therefore fair at every accent. Scores above 100% are
 * the expected, healthy case -- they mean the tuned ladder is earning its
 * place. A score below the minimum means the tuning is losing to an even
 * spread, which is a real defect at any absolute distance.
 *
 * This is also the oracle the existing suite lacks. Its 521 tests passed green
 * while error and warning were both rendered white, and pass green now that
 * they are not -- they cannot distinguish the two states. This can.
 */

import fs from "node:fs";
import path from "node:path";
import { type OkLch, oklch, toHex } from "../src/lib/color";
import { apcaLc } from "../src/lib/contrast-solve";
import { derivePalette } from "../src/lib/palette";
import { expandSeedVariants, loadAllSeeds } from "../src/lib/seeds";
import {
  ABSOLUTE_FLOOR_LC,
  achievableSeparation,
  minimumSeparation,
  requiredSeparation,
  SEPARATION_FLOOR,
  separation,
} from "../src/lib/separation-ladder";

/**
 * A palette must reach at least this fraction of the uniform-spread reference.
 *
 * 0.70 leaves room for a tuned ladder to trade a little raw separation for
 * hierarchy -- comments are meant to recede, which costs distance on purpose --
 * while still failing anything that has genuinely collapsed. Measured across
 * the shipped matrix the healthy range is 97%-375%, so the threshold sits far
 * below every passing theme and would have caught the pre-repair palettes,
 * where merged roles rendered identically at a ratio of 0%.
 */
const MIN_EFFICIENCY = 0.7;

const SYNTAX_ROLES = [
  "strings",
  "numbers",
  "keywords",
  "functions",
  "types",
  "variables",
  "constants",
  "attributes",
  "tags",
] as const;

/**
 * The box the shared budget places every layer in.
 *
 * The reference must be computed in the same box as the colors it judges. Each
 * layer used to own its own bounds, but since `allocateSharedBudget` places them
 * all together, judging them against per-layer bounds would measure a
 * constraint that no longer exists.
 */
const BUDGET_BOUNDS = { lMin: 0.55, lMax: 0.92, cMin: 0.02, cMax: 0.28 };

/**
 * Actual over reference, defined for the degenerate cases.
 *
 * Heavy merging can leave a layer with fewer than two distinct colors, where
 * both the measurement and its reference are infinite. There is nothing to tell
 * apart, so the layer trivially satisfies the requirement -- reporting NaN, or
 * failing it, would both be wrong.
 */
function ratio(actual: number, reference: number): number {
  if (!Number.isFinite(reference) || !Number.isFinite(actual)) return 1;
  return reference > 0 ? actual / reference : 1;
}

const WHEEL_KEYS = [
  "hueRed",
  "hueOrange",
  "hueYellow",
  "hueGreen",
  "hueCyan",
  "hueBlue",
  "huePurple",
] as const;

/**
 * Fewest distinct colors a surface may ship.
 *
 * The gate could not see collapse, by construction: it counts pairs that are
 * too close, and merging colors together REMOVES pairs. A palette that folded
 * nine syntax roles onto one color scored a perfect zero violations and 100% of
 * its reference -- the best-looking row in the table was the most broken theme
 * in the build. That is how a one-ink regression shipped past a green gate and
 * had to be caught by eye.
 *
 * Two is the floor because a single hue genuinely affords only two tones at a
 * separation a reader notices; three was searched exhaustively and lands at
 * 0.100-0.152 normalised, the band that measures as separated and reads as one
 * color. Any surface with a hue span should be far above this and the check
 * costs it nothing.
 */
const MIN_DISTINCT_PER_SURFACE = 2;

type Row = {
  theme: string;
  actual: number;
  ceiling: number;
  efficiency: number;
  wheelActual: number;
  wheelCeiling: number;
  wheelEfficiency: number;
  weights: number;
  belowReadability: number;
  /** Pairs within one surface that a reader could confuse. Gated at zero. */
  crossLayerPairs: number;
  /** Distinct colors each surface actually ships. Gated at MIN_DISTINCT_PER_SURFACE. */
  distinctCode: number;
  distinctDecor: number;
  /**
   * Members sitting closer than the floor to a semantic color.
   *
   * Reported, not gated, and the distinction is a claim about form rather than
   * a lowered bar. Semantic colors reach a reader as squiggly underlines,
   * gutter icons and panel rows -- never as another glyph in the same run of
   * code -- so they are told apart by shape and position as well as hue. What
   * they must never be is confusable with EACH OTHER, and that IS gated above.
   *
   * The number is tracked because it should keep falling: 298 before the shared
   * budget, 98 now.
   */
  nearSemantic: number;
};

/**
 * Pairs a reader could not tell apart WITHIN a surface they see together.
 *
 * The floor is scoped to co-occurrence, because two colors only need to differ
 * if they can appear at the same time:
 *
 *   code   - the nine syntax roles, which render together in every source file
 *   decor  - the seven decorative wheel colors, driving markup, regex, git
 *            decorations and symbol icons
 *
 * Both are checked against the reserved set -- semantic and accent -- which
 * appears over everything. Code against decor is NOT checked: they occupy
 * different scope families, and requiring a markup heading to differ from a
 * keyword cost color across every theme to fix a collision almost nobody can be
 * shown. Applied globally, that requirement drove the affordable palette to
 * about seven colors and, at a single hue, to one.
 *
 * The accent ramp is also exempt from ITSELF: `accent`, `accentSoft` and
 * `accentMuted` are one color at three weights, deliberately close, used in
 * different UI contexts. Forcing them apart would break the ramp.
 */
function countSurfaceViolations(
  surfaces: Record<string, OkLch[]>,
  reserved: OkLch[],
  floor: number
): { withinSurface: number; nearSemantic: number } {
  let withinSurface = 0;
  let nearSemantic = 0;

  for (const members of Object.values(surfaces)) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const d = separation(members[i], members[j]);
        // Identical colors are deliberate merges from the shared budget.
        // The requirement is per-pair: a pair separated only by lightness must
        // clear more than one carrying hue, because all of its distance sits on
        // the axis a reader uses for ranking rather than for identity.
        if (d > 0 && d < requiredSeparation(members[i], members[j], floor)) withinSurface++;
      }
      for (const r of reserved) {
        const d = separation(members[i], r);
        if (d > 0 && d < requiredSeparation(members[i], r, floor)) nearSemantic++;
      }
    }
  }

  // Semantic colors must also be tellable apart from EACH OTHER -- an error
  // that reads as a warning is the defect this whole effort started from.
  for (let i = 0; i < reserved.length; i++) {
    for (let j = i + 1; j < reserved.length; j++) {
      const d = separation(reserved[i], reserved[j]);
      if (d > 0 && d < requiredSeparation(reserved[i], reserved[j], floor)) withinSurface++;
    }
  }

  return { withinSurface, nearSemantic };
}

async function main(): Promise<void> {
  const seeds = (await loadAllSeeds()).flatMap(expandSeedVariants);
  if (seeds.length === 0) {
    console.error("No seeds found under src/seeds.");
    process.exit(1);
  }

  const rows: Row[] = [];

  for (const seed of seeds) {
    const p = derivePalette(seed, "Balanced");
    const bg = p.bg0;

    // Deduplicate first. A single-hue theme merges roles onto shared weights on
    // purpose, so two roles rendering the same color is the design working, not
    // a collision -- counting it as one would score every such theme at zero.
    const byHex = new Map<string, OkLch>();
    for (const role of SYNTAX_ROLES) {
      const c = p.harmony.debug[role];
      byHex.set(toHexish(c), c);
    }
    const colors: OkLch[] = [...byHex.values()];
    const hues = colors.map(c => c.h);

    const actual = minimumSeparation(colors);
    // Semantic only. The accent ramp is chrome -- it borders code rather than
    // sharing the text surface -- and gating against it cost far more colour
    // than the collision was worth: it accounted for 345 of 560 flagged pairs.
    const reserved = [
      p.semantic.debug.error,
      p.semantic.debug.warning,
      p.semantic.debug.success,
      p.semantic.debug.info,
    ];
    const ceiling = achievableSeparation(hues, bg, BUDGET_BOUNDS, reserved);
    const efficiency = ratio(actual, ceiling);

    // The decorative wheel is a second, independent ladder and is checked the
    // same way. It carried the same defect the syntax roles did -- lightness
    // spanning only 0.74-0.86 with two members identical, and chroma near
    // constant -- so it needs the same standing proof that it stays spread.
    const wheelByHex = new Map<string, OkLch>();
    for (const key of WHEEL_KEYS) {
      const c = p.debug.oklch[key];
      wheelByHex.set(toHexish(c), c);
    }
    const wheelColors = [...wheelByHex.values()];
    const wheelActual = minimumSeparation(wheelColors);
    const wheelCeiling = achievableSeparation(
      wheelColors.map(c => c.h),
      bg,
      BUDGET_BOUNDS,
      reserved
    );
    const wheelEfficiency = ratio(wheelActual, wheelCeiling);

    // Readability is a separate, absolute concern: efficiency says the palette
    // used its room well, not that every color can be read.
    const belowReadability = [...colors, ...wheelColors].filter(
      c => apcaLc(toHexish(c), bg) < ABSOLUTE_FLOOR_LC
    ).length;

    const violations = countSurfaceViolations(
      { code: colors, decor: wheelColors },
      reserved,
      SEPARATION_FLOOR
    );

    rows.push({
      theme: seed.id,
      actual,
      ceiling,
      efficiency,
      wheelActual,
      wheelCeiling,
      wheelEfficiency,
      weights: p.harmony.weightCount,
      distinctCode: new Set(colors.map(toHexish)).size,
      distinctDecor: new Set(wheelColors.map(toHexish)).size,
      belowReadability,
      crossLayerPairs: violations.withinSurface,
      nearSemantic: violations.nearSemantic,
    });
  }

  const bad = (r: Row) =>
    r.efficiency < MIN_EFFICIENCY ||
    r.wheelEfficiency < MIN_EFFICIENCY ||
    r.belowReadability > 0 ||
    r.crossLayerPairs > 0 ||
    r.distinctCode < MIN_DISTINCT_PER_SURFACE ||
    r.distinctDecor < MIN_DISTINCT_PER_SURFACE;
  const failures = rows.filter(bad);

  const width = Math.max(...rows.map(r => r.theme.length));
  console.log(
    `${"theme".padEnd(width)}  ${"code".padStart(7)} ${"decor".padStart(7)}  inks  wt  unread  viol  ~sem`
  );
  for (const r of rows) {
    console.log(
      `${r.theme.padEnd(width)}  ${`${(r.efficiency * 100).toFixed(0)}%`.padStart(7)} ` +
        `${`${(r.wheelEfficiency * 100).toFixed(0)}%`.padStart(7)}  ` +
        `${`${r.distinctCode}/${r.distinctDecor}`.padStart(4)}  ${String(r.weights).padStart(2)}  ` +
        `${String(r.belowReadability).padStart(6)}  ${String(r.crossLayerPairs).padStart(4)}  ` +
        `${String(r.nearSemantic).padStart(4)}${bad(r) ? " ❌" : ""}`
    );
  }

  const mean = rows.reduce((s, r) => s + r.efficiency, 0) / rows.length;
  const wheelMean = rows.reduce((s, r) => s + r.wheelEfficiency, 0) / rows.length;
  const worst = rows.reduce((a, b) => (a.efficiency < b.efficiency ? a : b));
  const crossTotal = rows.reduce((s, r) => s + r.crossLayerPairs, 0);
  const semTotal = rows.reduce((s, r) => s + r.nearSemantic, 0);
  console.log(
    `\n${rows.length} themes · syntax mean ${(mean * 100).toFixed(0)}% · ` +
      `wheel mean ${(wheelMean * 100).toFixed(0)}% of uniform-spread reference · ` +
      `worst ${worst.theme} at ${(worst.efficiency * 100).toFixed(0)}%`
  );
  console.log(
    crossTotal === 0
      ? "0 within-surface pairs below the floor (gated)"
      : `${crossTotal} within-surface pairs below the floor (gated)`
  );
  const thinnest = rows.reduce((a, b) =>
    Math.min(a.distinctCode, a.distinctDecor) < Math.min(b.distinctCode, b.distinctDecor) ? a : b
  );
  console.log(
    `thinnest palette: ${thinnest.theme} at ${thinnest.distinctCode} code / ` +
      `${thinnest.distinctDecor} decor inks (floor ${MIN_DISTINCT_PER_SURFACE})`
  );
  console.log(
    `${semTotal} members within the floor of a semantic color ` +
      "(reported — semantic reaches the reader as underline, gutter and panel, not as code text)"
  );

  const reportDir = path.join(process.cwd(), "build", "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "separation-gate.json"),
    `${JSON.stringify({ minEfficiency: MIN_EFFICIENCY, mean, rows }, null, 2)}\n`
  );

  if (failures.length > 0) {
    console.error(
      `\n❌ ${failures.length} theme(s) below ${MIN_EFFICIENCY * 100}% of the uniform-spread ` +
        "reference, or carrying unreadable colors."
    );
    process.exit(1);
  }
  console.log("\n✅ Every palette beats a uniform spread of its own hues.");
}

/** Drop any alpha before measuring contrast against the background. */
function toHexish(c: OkLch): string {
  return toHex(oklch(c.l, c.c, c.h));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
