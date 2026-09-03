/**
 * Contrast Policy (owned) over Gamut Mapping (delegated)
 *
 * This module answers one question: given a hue and a background, what is the
 * MOST SATURATED color of that hue which still clears a contrast target?
 *
 * The distinction that matters:
 *   - Gamut mapping ("can sRGB show this?") is delegated to culori's
 *     clampChroma, which reduces C while holding L and H fixed.
 *   - Contrast policy ("which L do we pick, and what yields when contrast and
 *     saturation conflict?") is owned here, because it is the design decision.
 *
 * Why the lowest passing lightness, not the first one that works:
 *
 * The sRGB chroma envelope is not monotonic in L. For OKLCH hue 29 on a
 * #0b0c10 background the maximum in-gamut chroma peaks near L 0.60 and then
 * falls away steeply:
 *
 *     L 0.60 -> C 0.246 (Lc 34)     L 0.85 -> C 0.082 (Lc 75)
 *     L 0.78 -> C 0.129 (Lc 61)     L 0.98 -> C 0.013 (Lc 101)
 *
 * Every step of lightness taken past the contrast target is chroma spent for
 * nothing. Climbing until contrast is merely satisfied lands at L 0.98, where
 * red retains 5% of its chroma and reads as white. Stopping at the FIRST
 * lightness that clears the target lands at L 0.78 with 10x the chroma and a
 * contrast value still above the target.
 *
 * Overshooting contrast is not free. On a near-black background Lc 101 is
 * glare, and glare is a cost paid across exactly the long sessions this theme
 * exists for.
 */

import { clampChroma, converter, formatHex } from "culori";
import { APCAcontrast, sRGBtoY } from "./apca-wrapper.js";
import { type OkLch, oklch } from "./color.js";

const toRgb = converter("rgb");

/** Chroma high enough that clampChroma always has to reduce it. */
const UNREACHABLE_CHROMA = 0.4;

/** Step size for the lightness search. 0.01 is finer than any perceptible step. */
const L_STEP = 0.01;

export type ContrastSolution = {
  /** The solved color, guaranteed in sRGB gamut. */
  color: OkLch;
  /** Hex of `color`. */
  hex: string;
  /** Measured APCA Lc of `hex` against the background. */
  lc: number;
  /** True when the target was met; false when the whole range was exhausted. */
  met: boolean;
};

function hexToRgbTuple(hex: string): [number, number, number] {
  const c = hex.replace("#", "").slice(0, 6);
  return [
    Number.parseInt(c.slice(0, 2), 16),
    Number.parseInt(c.slice(2, 4), 16),
    Number.parseInt(c.slice(4, 6), 16),
  ];
}

/**
 * Gamut-map an OKLCH color into sRGB by reducing chroma only.
 *
 * Replaces the previous `clampRgb` approach, which clamps R/G/B independently
 * and therefore silently changes both lightness and hue: clampRgb on
 * OKLCH(0.98, 0.6, 29) returns #ff0000, a color at L ~0.63 rather than 0.98.
 */
export function gamutMap(color: OkLch): OkLch {
  const mapped = clampChroma({ mode: "oklch", l: color.l, c: color.c, h: color.h }, "oklch");
  return oklch(mapped.l, mapped.c, mapped.h ?? color.h, color.alpha);
}

/** Maximum chroma sRGB affords at this lightness and hue. */
export function maxChromaAt(l: number, h: number): number {
  return clampChroma({ mode: "oklch", l, c: UNREACHABLE_CHROMA, h }, "oklch").c;
}

/** APCA Lc of a foreground hex against a background hex, sign discarded. */
export function apcaLc(foregroundHex: string, backgroundHex: string): number {
  return Math.abs(
    APCAcontrast(sRGBtoY(hexToRgbTuple(foregroundHex)), sRGBtoY(hexToRgbTuple(backgroundHex)))
  );
}

export type SolveOptions = {
  /** OKLCH hue, 0-360. Preserved exactly; never traded for contrast. */
  hue: number;
  /** Background the color must read against. */
  backgroundHex: string;
  /** APCA Lc the result must clear. */
  targetLc: number;
  /**
   * Upper bound on chroma, applied after the gamut map. Use this to place a
   * color on a ladder rank rather than always taking the vivid maximum.
   */
  chromaCeiling?: number;
  /** Search bounds for lightness. */
  minL?: number;
  maxL?: number;
};

/**
 * Find the least-extreme lightness at which `hue` clears `targetLc`, and take
 * the most chroma sRGB affords there.
 *
 * On a dark background the search walks lightness upward from `minL`; on a
 * light background it walks downward from `maxL`. Either way it stops at the
 * first passing value, because every further step trades chroma for contrast
 * that was already sufficient.
 *
 * When no lightness in range clears the target, the best-contrast candidate
 * found is returned with `met: false` rather than a hardcoded near-white
 * constant, so callers can decide what to do instead of silently receiving a
 * color that has lost its identity.
 */
export function solveForContrast(opts: SolveOptions): ContrastSolution {
  const { hue, backgroundHex, targetLc, chromaCeiling, minL = 0.35, maxL = 0.97 } = opts;

  const bgIsDark = apcaLc("#ffffff", backgroundHex) > apcaLc("#000000", backgroundHex);

  const candidateAt = (l: number): ContrastSolution => {
    const c =
      chromaCeiling === undefined
        ? maxChromaAt(l, hue)
        : Math.min(maxChromaAt(l, hue), chromaCeiling);
    const color = oklch(l, c, hue);
    const hex = formatHex(toRgb({ mode: "oklch", l, c, h: hue }));
    return { color, hex, lc: apcaLc(hex, backgroundHex), met: false };
  };

  // Walk away from the background: lighter on dark, darker on light.
  const steps: number[] = [];
  for (let l = minL; l <= maxL + 1e-9; l += L_STEP) steps.push(Number(l.toFixed(4)));
  if (!bgIsDark) steps.reverse();

  let best = candidateAt(steps[0]);
  for (const l of steps) {
    const candidate = candidateAt(l);
    if (candidate.lc > best.lc) best = candidate;
    if (candidate.lc >= targetLc) {
      return { ...candidate, met: true };
    }
  }

  return best;
}
